// URLs of the artifacts the bench serves, all under paths handled by
// server/bench-api.ts.
//
// The jubjub package is referenced as served files rather than bundler assets:
// the SDK's scanner worker resolves `jubjubModuleUrl` with a runtime `import()`,
// and the wasm-pack glue then fetches its `_bg.wasm` neighbour relative to that
// URL.

import type { Shape } from "../../shapes";

export const JUBJUB_MODULE_URL = "/wasm/jubjub/pkg/jubjub_wasm.js";
export const JUBJUB_WASM_URL = "/wasm/jubjub/pkg/jubjub_wasm_bg.wasm";

/** `WireWasmConfig` for `@lelantos-org/sdk/scanner-worker`. */
export const JUBJUB_WIRE_CONFIG = {
    jubjubModuleUrl: JUBJUB_MODULE_URL,
    jubjubWasmUrl: JUBJUB_WASM_URL,
} as const;

/**
 * Version of the installed `@lelantos-org/circuits`, injected by vite.config.ts
 * and stamped into every artifact URL. See {@link artifactsFor}.
 */
declare const __CIRCUITS_VERSION__: string;
const CIRCUITS_VERSION = __CIRCUITS_VERSION__;

export interface CircuitArtifacts {
    /** Absolute — see {@link artifactsFor}. */
    wasmPath: string;
    /** Absolute — see {@link artifactsFor}. */
    zkeyPath: string;
    witnessUrl: string;
}

/**
 * Prover artifact URLs are absolute: the SDK's persistent cache keys on the URL
 * and the Cache API stores `Request`s, which must be http(s), so the SDK skips
 * persistence for any path failing its `^https?://` test. A root-relative
 * `/4x6_final.zkey` loads but re-downloads on every reload and worker spawn.
 *
 * The origin is part of the key, so serving the bench over `localhost` and over
 * a LAN address caches the ~50 MB once per origin.
 *
 * `witnessUrl` stays relative: it is a small JSON fetched by the page, not an
 * artifact the SDK loads.
 *
 * The `?v=` stamp invalidates the cache across circuit upgrades. The cache key
 * is the whole URL including the query, and `server/bench-api.ts` routes on the
 * pathname alone, so the stamp changes the key without changing what is served.
 * Without it, cached artifacts outlive `npm install` and the bench reports the
 * previous circuit's numbers under the new version.
 */
export const artifactsFor = (shape: Shape): CircuitArtifacts => ({
    wasmPath: new URL(`/${shape}.wasm?v=${CIRCUITS_VERSION}`, location.href).href,
    zkeyPath: new URL(`/${shape}_final.zkey?v=${CIRCUITS_VERSION}`, location.href).href,
    witnessUrl: `/input.${shape}.json`,
});
