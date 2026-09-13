import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type PreviewOptions } from "vite";

import { benchApi } from "./server/bench-api.js";
import { ensureSelfSignedCert } from "./server/cert.js";
import { ISOLATION_HEADERS } from "./server/http.js";
import { lanIPs } from "./server/lan.js";

const root = fileURLToPath(new URL(".", import.meta.url));

function parsePort(raw: string | undefined, fallback: number): number {
    if (raw === undefined || raw === "") return fallback;
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid PORT: ${raw}`);
    return port;
}

/**
 * Version of the installed circuit set, stamped into the artifact URLs.
 *
 * The SDK's persistent cache keys on the URL, so unversioned paths survive an
 * `npm install` and the origin's Cache API keeps serving the previous wasm and
 * zkey. Read directly from the file: the package's `exports` map has no
 * "./package.json" entry, so importing it fails.
 */
function installedVersion(pkg: string): string {
    const manifest = new URL(`./node_modules/${pkg}/package.json`, import.meta.url);
    return (JSON.parse(readFileSync(manifest, "utf8")) as { version: string }).version;
}

const port = parsePort(process.env.PORT, 8787);

// HTTPS is on by default: SharedArrayBuffer needs a secure context, which LAN
// devices do not get over plain http. HTTPS=0 opts out for localhost work.
const useHttps = process.env.HTTPS !== "0";
const cert = useHttps ? ensureSelfSignedCert(fileURLToPath(new URL("./.certs", import.meta.url))) : null;

// Shared by `vite` and `vite preview`, so both serve identically.
const serve: PreviewOptions = {
    host: true, // bind 0.0.0.0 so LAN devices can reach the server
    port,
    strictPort: true,
    https: cert ? { key: readFileSync(cert.key), cert: readFileSync(cert.cert) } : undefined,
    headers: ISOLATION_HEADERS,
};

const scheme = useHttps ? "https" : "http";
console.log(`bench: ${scheme}://localhost:${port}`);
for (const ip of lanIPs()) console.log(`lan:   ${scheme}://${ip}:${port}`);
console.log(useHttps
    ? "note: self-signed cert — phones must accept the warning once."
    : "note: HTTPS disabled — LAN devices get no SharedArrayBuffer and prove single-threaded.");

export default defineConfig({
    define: {
        __CIRCUITS_VERSION__: JSON.stringify(installedVersion("@lelantos-org/circuits")),
    },
    plugins: [react(), benchApi({ root })],
    server: serve,
    preview: serve,
    worker: {
        format: "es",
    },
    build: {
        target: "es2022",
        // Circuit artifacts and the SDK wasm packages are served by benchApi and
        // must not be inlined.
        assetsInlineLimit: 0,
    },
    optimizeDeps: {
        // The SDK must go through the dep optimizer: it imports CommonJS
        // (poseidon-lite), whose named exports a raw ESM copy cannot bind. Its
        // wasm-pack glue is safe to prebundle because both wasm loaders are
        // injected explicitly (configureJubjubWasm / configureProverWasm) rather
        // than resolved from import.meta.url.
        //
        // Every subpath a worker imports must be listed explicitly. The optimizer
        // crawls the HTML entry, so it finds what the main thread reaches; a
        // subpath imported only from inside a worker is served raw from
        // node_modules, and `sdk/crypto` importing
        // `{ poseidon1 } from "poseidon-lite/poseidon1"` against a CommonJS file
        // then fails at runtime with:
        //
        //   does not provide an export named 'poseidon1'
        //
        // mid-scan, after the pool has reported itself ready.
        include: [
            "@lelantos-org/sdk",
            "@lelantos-org/sdk/crypto",
            "@lelantos-org/sdk/notes",
            "@lelantos-org/sdk/sync",
            // Converting these CommonJS modules to ESM here fixes the binding
            // for every importer, prebundled or not. The SDK uses arities 1..8
            // (`sdk/crypto/poseidon.ts`).
            ...Array.from({ length: 8 }, (_, i) => `poseidon-lite/poseidon${i + 1}`),
        ],
        // The rayon prover package is fetched from /wasm/* at runtime and must
        // keep its own import.meta.url, or sub-worker spawning breaks.
        exclude: ["@lelantos-org/sdk/wasm-prover"],
    },
});
