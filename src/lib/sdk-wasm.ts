// URLs of the artifacts the bench serves, all under paths handled by
// server/bench-api.ts.
//
// The jubjub pkg is referenced as served files rather than bundler assets on
// purpose: the SDK's scanner worker resolves `jubjubModuleUrl` with a runtime
// `import()`, and wasm-pack glue then fetches its `_bg.wasm` neighbour
// relative to that URL.

export const JUBJUB_MODULE_URL = "/wasm/jubjub/pkg/jubjub_wasm.js";
export const JUBJUB_WASM_URL = "/wasm/jubjub/pkg/jubjub_wasm_bg.wasm";

/** `WireWasmConfig` for `@lelantos-org/sdk/scanner-worker`. */
export const JUBJUB_WIRE_CONFIG = {
    jubjubModuleUrl: JUBJUB_MODULE_URL,
    jubjubWasmUrl: JUBJUB_WASM_URL,
} as const;

/** Circuit arities the bench proves. Both ship in @lelantos-org/circuits. */
export const SHAPES = ["2x2", "3x3"] as const;
export type Shape = (typeof SHAPES)[number];

export interface CircuitArtifacts {
    /** Absolute — see {@link artifactsFor}. */
    wasmPath: string;
    /** Absolute — see {@link artifactsFor}. */
    zkeyPath: string;
    witnessUrl: string;
}

/**
 * Prover artifacts are named absolutely on purpose: the SDK's persistent cache
 * (0.9.0+) keys on the URL and the Cache API stores `Request`s, which must be
 * http(s), so the SDK skips persistence for anything that fails its
 * `^https?://` test. A root-relative `/3x3_final.zkey` loads fine and silently
 * re-downloads on every reload and every worker spawn.
 *
 * The origin is part of the key, so serving the same bench over `localhost` and
 * over a LAN address caches the ~85 MB once per origin.
 *
 * `witnessUrl` stays relative: it is a small JSON fetched by the page, not an
 * artifact the SDK loads.
 */
export const artifactsFor = (shape: Shape): CircuitArtifacts => ({
    wasmPath: new URL(`/${shape}.wasm`, location.href).href,
    zkeyPath: new URL(`/${shape}_final.zkey`, location.href).href,
    witnessUrl: `/input.${shape}.json`,
});
