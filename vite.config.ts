import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Version of the installed circuit set, stamped into the artifact URLs.
//
// The SDK's persistent cache keys on the URL, so unversioned paths survive an
// `npm install` and the origin's Cache API keeps serving the previous wasm and
// zkey. Read directly from the file: the package's `exports` map has no
// "./package.json" entry, so importing it fails.
const { version: circuitsVersion } = JSON.parse(
    readFileSync(
        fileURLToPath(new URL("./node_modules/@lelantos-org/circuits/package.json", import.meta.url)),
        "utf8",
    ),
) as { version: string };

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { benchApi } from "./server/bench-api.js";
import { ensureSelfSignedCert } from "./server/cert.js";
import { lanIPs } from "./server/lan.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const PORT = parseInt(process.env.PORT ?? "8787", 10);

// HTTPS is on by default: SharedArrayBuffer needs a secure context, which LAN
// devices do not get over plain http. HTTPS=0 opts out for localhost work.
const useHttps = process.env.HTTPS !== "0";
const cert = useHttps ? ensureSelfSignedCert(resolve(root, ".certs")) : null;

const https = cert
    ? { key: readFileSync(cert.key), cert: readFileSync(cert.cert) }
    : undefined;

// Cross-origin isolation for the multi-threaded prover, applied to every
// response Vite serves, including module workers.
const headers = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
};

console.log(`bench: ${useHttps ? "https" : "http"}://localhost:${PORT}`);
for (const ip of lanIPs()) console.log(`lan:   ${useHttps ? "https" : "http"}://${ip}:${PORT}`);
if (useHttps) console.log("note: self-signed cert — phones must accept the warning once.");
else console.log("note: HTTPS disabled — multi-thread prover will fall back off-LAN devices.");

export default defineConfig({
    define: {
        __CIRCUITS_VERSION__: JSON.stringify(circuitsVersion),
    },
    plugins: [react(), benchApi({ root })],
    server: {
        host: true,          // bind 0.0.0.0 so LAN devices can reach the server
        port: PORT,
        strictPort: true,
        https,
        headers,
    },
    preview: {
        host: true,
        port: PORT,
        strictPort: true,
        https,
        headers,
    },
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
