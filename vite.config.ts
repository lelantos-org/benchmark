import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Version of the installed circuit set, stamped into the artifact URLs.
//
// The SDK's persistent cache keys on the URL, so unversioned paths survive an
// `npm install`: a bumped @lelantos-org/circuits keeps serving the previous
// wasm and zkey out of the origin's Cache API, and the bench silently measures
// the old circuit. Read straight off the file — the package's `exports` map has
// no "./package.json" entry, so `require`/`import` of it fails.
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

// HTTPS on by default: SharedArrayBuffer needs a secure context, and LAN
// devices do not get one over plain http. HTTPS=0 opts out for localhost work.
const useHttps = process.env.HTTPS !== "0";
const cert = useHttps ? ensureSelfSignedCert(resolve(root, ".certs")) : null;

const https = cert
    ? { key: readFileSync(cert.key), cert: readFileSync(cert.cert) }
    : undefined;

// Cross-origin isolation for the multi-threaded prover. Applied to every
// response Vite serves, including the module workers.
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
        host: true,          // bind 0.0.0.0 so LAN devices can reach it
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
        // Circuit artifacts and the SDK wasm packages are served by benchApi,
        // never inlined.
        assetsInlineLimit: 0,
    },
    optimizeDeps: {
        // The SDK must go through the dep optimizer: it imports CJS
        // (poseidon-lite), and a raw ESM copy cannot bind those named exports.
        // Its wasm-pack glue is safe to prebundle here because both wasm
        // loaders are injected explicitly (configureJubjubWasm /
        // configureProverWasm) rather than resolved from import.meta.url.
        include: ["@lelantos-org/sdk", "@lelantos-org/sdk/notes"],
        // The rayon prover pkg is fetched from /wasm/* at runtime and must keep
        // its own import.meta.url, or sub-worker spawning breaks.
        exclude: ["@lelantos-org/sdk/wasm-prover"],
    },
});
