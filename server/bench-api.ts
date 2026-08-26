// Dev and preview server routes the bench needs beyond a static React build.
//
//   /<shape>.wasm,               circuit artifacts, streamed from
//   /<shape>_final.zkey          node_modules/@lelantos-org/circuits rather than
//                                copied into public/ (tens of MB each)
//   /wasm/*                      the SDK's wasm-pack packages, served as real files
//                                so wasm-bindgen-rayon's `import.meta.url` resolves
//                                to the served package directory and its sub-workers
//                                spawn at the correct path. Bundling breaks threading.
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

// Circuit arities served, and the witnesses `prepare.ts` builds for them.
//
// Mirrors `SHAPES` in src/lib/sdk-wasm.ts rather than importing it: that module
// reads the `__CIRCUITS_VERSION__` define at load time, which exists only inside
// the Vite bundle and throws under Node.
const SHAPES = ["2x2", "3x3", "4x4"] as const;

// SharedArrayBuffer (wasm-bindgen-rayon) needs cross-origin isolation.
const COI_HEADERS: Record<string, string> = {
    "Cross-Origin-Opener-Policy":   "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Access-Control-Allow-Origin":  "*",
};

export interface BenchApiOptions {
    /** Project root; all served paths resolve beneath it. */
    root: string;
}

export function benchApi({ root }: BenchApiOptions): Plugin {
    const circuitsBuild = resolve(root, "node_modules", "@lelantos-org", "circuits", "build");
    const sdkWasm = resolve(root, "node_modules", "@lelantos-org", "sdk", "wasm");
    const resultsFile = resolve(root, "results.json");

    const circuitFiles: Record<string, string> = Object.fromEntries(
        SHAPES.flatMap(shape => [
            [`/${shape}.wasm`, join(circuitsBuild, `${shape}.wasm`)],
            [`/${shape}_final.zkey`, join(circuitsBuild, `${shape}_final.zkey`)],
        ]),
    );

    const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;

        // Set the isolation headers on every response, including the 304s Vite
        // answers revalidation with. `server.headers` covers only responses that
        // carry a body, and WebKit refuses to start a worker whose script
        // response lacks COEP/CORP, so a header-less 304 fails the spawn. The
        // scan pool spawns several workers from one URL at once, so all but the
        // first revalidate. Chromium does not enforce this.
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
        // Installed eagerly rather than as a post hook: these routes must take
        // precedence over Vite's static and SPA-fallback middleware, which would
        // answer /2x2.wasm and /results with index.html.
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
 * Fields read back for the console line. Everything else a client sends is
 * stored verbatim; the row shape is owned by src/lib/api.ts.
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
    // wasm-bindgen rayon workers issue `import('../../..')`, which resolves to a
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

/** Resolves `rel` under `base`, rejecting traversal outside it. */
function safeJoin(base: string, rel: string): string | null {
    const file = join(base, normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    return file.startsWith(base) ? file : null;
}

function warnMissingArtifacts(root: string, circuitFiles: Record<string, string>): void {
    const witnesses = SHAPES.map(shape => resolve(root, "public", `input.${shape}.json`));
    for (const p of [...Object.values(circuitFiles), ...witnesses]) {
        if (!existsSync(p)) console.warn(`WARN: missing ${p} — run 'npm run prepare-input'`);
    }
}
