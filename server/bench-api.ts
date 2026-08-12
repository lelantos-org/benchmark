// Dev/preview-server side of the bench: the pieces a static React build cannot
// provide on its own.
//
//   /2x2.wasm, /2x2_final.zkey   circuit artifacts, streamed out of
//                                node_modules/@lelantos-org/circuits (~40MB — copying
//                                them into public/ on every install is not worth it)
//   /wasm/*                      the SDK's wasm-pack packages, served as real files so
//                                wasm-bindgen-rayon's `import.meta.url` resolves to the
//                                served pkg dir and its sub-workers spawn at the right
//                                path. Bundling this breaks threading.
//   POST /result, GET /results   append-only JSONL of runs collected from LAN devices

import { appendFileSync, createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import type { Plugin, ViteDevServer, PreviewServer } from "vite";

const MIME: Record<string, string> = {
    ".js":   "application/javascript; charset=utf-8",
    ".mjs":  "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".wasm": "application/wasm",
    ".zkey": "application/octet-stream",
};

const LONG_CACHE_EXTS = new Set([".wasm", ".zkey"]);

// SharedArrayBuffer (wasm-bindgen-rayon) needs cross-origin isolation.
const COI_HEADERS: Record<string, string> = {
    "Cross-Origin-Opener-Policy":   "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Access-Control-Allow-Origin":  "*",
};

export interface BenchApiOptions {
    /** Project root; all served paths resolve under it. */
    root: string;
}

export function benchApi({ root }: BenchApiOptions): Plugin {
    const circuitsBuild = resolve(root, "node_modules", "@lelantos-org", "circuits", "build");
    const sdkWasm = resolve(root, "node_modules", "@lelantos-org", "sdk", "wasm");
    const resultsFile = resolve(root, "results.json");

    const circuitFiles: Record<string, string> = {
        "/2x2.wasm":       join(circuitsBuild, "2x2.wasm"),
        "/2x2_final.zkey": join(circuitsBuild, "2x2_final.zkey"),
        "/3x3.wasm":       join(circuitsBuild, "3x3.wasm"),
        "/3x3_final.zkey": join(circuitsBuild, "3x3_final.zkey"),
    };

    const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;

        // Stamp the isolation headers on *every* response, including the 304s
        // Vite answers revalidation with. `server.headers` only covers responses
        // that carry a body, and WebKit refuses to start a worker whose script
        // response lacks COEP/CORP — so a header-less 304 kills it. The scan
        // pool spawns several workers from one URL at once, so all but the
        // first revalidate and die; that is the iOS Safari failure this
        // prevents. Chromium is lenient here, which is why it never showed.
        for (const [k, v] of Object.entries(COI_HEADERS)) res.setHeader(k, v);

        if (req.method === "POST" && path === "/result") return postResult(req, res, resultsFile);
        if (req.method === "GET"  && path === "/results") return getResults(res, resultsFile);

        if (req.method !== "GET" && req.method !== "HEAD") return next();

        if (path in circuitFiles) return streamFile(res, circuitFiles[path]);
        if (path.startsWith("/wasm/")) return streamWasmPkg(res, sdkWasm, path.slice("/wasm/".length));

        next();
    };

    return {
        name: "lelantos-bench-api",
        // Installed eagerly, not via the returned post hook: these routes must
        // win over Vite's static/SPA-fallback middleware, which would answer
        // /2x2.wasm and /results with index.html.
        configureServer(server: ViteDevServer) {
            warnMissingArtifacts(root, circuitFiles);
            server.middlewares.use(middleware);
        },
        configurePreviewServer(server: PreviewServer) {
            warnMissingArtifacts(root, circuitFiles);
            server.middlewares.use(middleware);
        },
    };
}

// ── handlers ────────────────────────────────────────────────────────────────
/**
 * Fields the console line reads back. Everything else a client sends is stored
 * verbatim — the row shape is owned by src/lib/api.ts, not by this server.
 */
interface PostedResult {
    platform?: unknown;
    meanMs?: unknown;
    [field: string]: unknown;
}

function postResult(req: IncomingMessage, res: ServerResponse, resultsFile: string): void {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
        try {
            const data = JSON.parse(Buffer.concat(chunks).toString("utf8")) as PostedResult;
            const record = { ts: new Date().toISOString(), ip: req.socket.remoteAddress, ...data };
            appendFileSync(resultsFile, JSON.stringify(record) + "\n");
            const mean = typeof record.meanMs === "number" ? `${record.meanMs.toFixed(0)}ms` : "?";
            const who = typeof record.platform === "string" ? record.platform : "";
            console.log(`result <- ${record.ip} ${who} mean=${mean}`);
            sendJson(res, 200, { ok: true });
        } catch (e) {
            sendJson(res, 400, { error: e instanceof Error ? e.message : String(e) });
        }
    });
    req.on("error", () => sendJson(res, 400, { error: "request stream error" }));
}

function getResults(res: ServerResponse, resultsFile: string): void {
    if (!existsSync(resultsFile)) return sendJson(res, 200, []);
    const lines = readFileSync(resultsFile, "utf8").trim().split("\n").filter(Boolean);
    send(res, 200, "[" + lines.join(",") + "]", "application/json; charset=utf-8");
}

function streamWasmPkg(res: ServerResponse, base: string, rel: string): void {
    let file = safeJoin(base, rel);
    if (!file) return send(res, 403, "forbidden");
    // wasm-bindgen rayon workers do `import('../../..')`, which resolves to a
    // directory URL. Resolve it via package.json#main so the browser gets a file.
    if (existsSync(file) && statSync(file).isDirectory()) {
        const pkgPath = join(file, "package.json");
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { main?: string };
            file = join(file, pkg.main ?? "index.js");
        }
    }
    streamFile(res, file);
}

// ── plumbing ────────────────────────────────────────────────────────────────
function send(res: ServerResponse, status: number, body: string, type = "text/plain; charset=utf-8"): void {
    res.writeHead(status, { "Content-Type": type, ...COI_HEADERS });
    res.end(body);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
    send(res, status, JSON.stringify(value), "application/json; charset=utf-8");
}

function streamFile(res: ServerResponse, path: string): void {
    if (!existsSync(path)) return send(res, 404, "not found");
    const st = statSync(path);
    if (st.isDirectory()) return send(res, 404, "is a directory");
    const ext = extname(path).toLowerCase();
    res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": st.size,
        "Cache-Control": LONG_CACHE_EXTS.has(ext)
            ? "public, max-age=31536000, immutable"
            : "no-store",
        ...COI_HEADERS,
    });
    createReadStream(path).pipe(res);
}

/** Resolve `rel` under `base`, rejecting traversal outside it. */
function safeJoin(base: string, rel: string): string | null {
    const file = join(base, normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    return file.startsWith(base) ? file : null;
}

function warnMissingArtifacts(root: string, circuitFiles: Record<string, string>): void {
    const witnesses = ["input.2x2.json", "input.3x3.json"].map(f => resolve(root, "public", f));
    for (const p of [...Object.values(circuitFiles), ...witnesses]) {
        if (!existsSync(p)) console.warn(`WARN: missing ${p} — run 'npm run prepare-input'`);
    }
}
