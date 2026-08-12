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
    wasmPath: string;
    zkeyPath: string;
    witnessUrl: string;
}

export const artifactsFor = (shape: Shape): CircuitArtifacts => ({
    wasmPath: `/${shape}.wasm`,
    zkeyPath: `/${shape}_final.zkey`,
    witnessUrl: `/input.${shape}.json`,
});
