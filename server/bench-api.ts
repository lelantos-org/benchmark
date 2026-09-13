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

import { existsSync, readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import type { Connect, Plugin } from "vite";

import { artifactNames, SHAPES } from "../shared/circuits.js";
import {
    BENCH_HEADERS,
    CACHE_IMMUTABLE,
    CACHE_NONE,
    PayloadTooLargeError,
    readBody,
    resolveWithin,
    send,
    sendJson,
    streamFile,
} from "./http.js";
import { isRecord, ResultsStore } from "./results-store.js";

const WASM_PREFIX = "/wasm/";

/** A posted row carries 5 iterations of debug SDK logs; this is generous. */
const MAX_RESULT_BYTES = 8 * 1024 * 1024;

export interface BenchApiOptions {
    /** Project root; all served paths resolve beneath it. */
    root: string;
}

export function benchApi({ root }: BenchApiOptions): Plugin {
    const modules = resolve(root, "node_modules", "@lelantos-org");
    const circuitsBuild = join(modules, "circuits", "build");
    const sdkWasm = join(modules, "sdk", "wasm");
    const store = new ResultsStore(resolve(root, "results.json"));

    const circuitFiles = new Map<string, string>(
        SHAPES.flatMap(shape => {
            const { wasm, zkey } = artifactNames(shape);
            return [wasm, zkey].map(name => [`/${name}`, join(circuitsBuild, name)] as const);
        }),
    );
    const witnessFiles = SHAPES.map(shape => resolve(root, "public", artifactNames(shape).witness));

    const middleware: Connect.NextHandleFunction = (req, res, next) => {
        const path = new URL(req.url ?? "/", "http://localhost").pathname;

        // Set the isolation headers on every response, including the 304s Vite
        // answers revalidation with. `server.headers` covers only responses that
        // carry a body, and WebKit refuses to start a worker whose script
        // response lacks COEP/CORP, so a header-less 304 fails the spawn. The
        // scan pool spawns several workers from one URL at once, so all but the
        // first revalidate. Chromium does not enforce this.
        for (const [k, v] of Object.entries(BENCH_HEADERS)) res.setHeader(k, v);

        if (req.method === "POST" && path === "/result") {
            postResult(req, res, store).catch((e: unknown) => {
                console.error(e);
                if (!res.headersSent) sendJson(res, 500, { error: "failed to store result" });
            });
            return;
        }
        if (req.method === "GET" && path === "/results") return sendJson(res, 200, store.readAll());
        if (req.method !== "GET" && req.method !== "HEAD") return next();

        // Circuit artifacts are requested with a `?v=<circuits version>` query,
        // so a new build is a new URL and caching them for a year is free.
        const circuitFile = circuitFiles.get(path);
        if (circuitFile) return streamFile(req, res, circuitFile, CACHE_IMMUTABLE);

        // Deliberately NOT cached: the SDK's wasm packages are build output,
        // requested without a version query, and `just use-local-sdk` replaces
        // them in place. Served immutable, a rebuilt `prover_bg.wasm` stays
        // hidden behind the browser's copy — and the failure is a bare
        // `WebAssembly.instantiate()` import error, because the stale wasm and
        // the fresh glue disagree about the module's imports.
        if (path.startsWith(WASM_PREFIX)) {
            const file = resolveWasmPkgFile(sdkWasm, path.slice(WASM_PREFIX.length));
            return file ? streamFile(req, res, file, CACHE_NONE) : send(res, 403, "forbidden");
        }

        next();
    };

    const install = (server: { middlewares: Connect.Server }): void => {
        warnMissing([...circuitFiles.values(), ...witnessFiles]);
        server.middlewares.use(middleware);
    };

    return {
        name: "lelantos-bench-api",
        // Installed eagerly rather than as a post hook: these routes must take
        // precedence over Vite's static and SPA-fallback middleware, which would
        // answer /4x6.wasm and /results with index.html.
        configureServer: install,
        configurePreviewServer: install,
    };
}

async function postResult(req: IncomingMessage, res: ServerResponse, store: ResultsStore): Promise<void> {
    let data: unknown;
    try {
        data = JSON.parse(await readBody(req, MAX_RESULT_BYTES));
    } catch (e) {
        const status = e instanceof PayloadTooLargeError ? 413 : 400;
        return sendJson(res, status, { error: e instanceof Error ? e.message : String(e) });
    }
    if (!isRecord(data)) return sendJson(res, 400, { error: "expected a JSON object" });

    const record = store.append(data, req.socket.remoteAddress);
    const mean = typeof record.meanMs === "number" ? `${record.meanMs.toFixed(0)}ms` : "?";
    const who = typeof record.platform === "string" ? record.platform : "";
    console.log(`result <- ${record.ip} ${who} mean=${mean}`);
    sendJson(res, 200, { ok: true });
}

/**
 * Maps a `/wasm/*` request onto the SDK's wasm directory, or `null` if it
 * would escape it.
 *
 * wasm-bindgen rayon workers issue `import('../../..')`, which resolves to a
 * directory URL. That is answered via the directory's `package.json#main`, so
 * the browser gets a file.
 */
function resolveWasmPkgFile(base: string, rel: string): string | null {
    const file = resolveWithin(base, rel);
    if (!file || !existsSync(file) || !statSync(file).isDirectory()) return file;

    const manifest = join(file, "package.json");
    if (!existsSync(manifest)) return file;
    const { main } = JSON.parse(readFileSync(manifest, "utf8")) as { main?: string };
    return resolveWithin(file, main ?? "index.js");
}

function warnMissing(paths: string[]): void {
    for (const p of paths) {
        if (!existsSync(p)) console.warn(`WARN: missing ${p} — run 'just prepare'`);
    }
}
