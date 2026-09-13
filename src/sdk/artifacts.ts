// URLs of the artifacts the bench serves, all under paths handled by
// server/bench-api.ts.
//
// Deliberately free of SDK imports: the note generator worker reads this too,
// and anything imported here is bundled into it.

import { artifactNames, type Shape } from "../../shared/circuits";

/**
 * The jubjub package, referenced as served files rather than bundler assets:
 * the SDK's scanner worker resolves `jubjubModuleUrl` with a runtime `import()`,
 * and the wasm-pack glue then fetches its `_bg.wasm` neighbour relative to that
 * URL. Shaped as the `WireWasmConfig` `@lelantos-org/sdk/scanner-worker` takes.
 */
export const JUBJUB_WASM = {
    jubjubModuleUrl: "/wasm/jubjub/pkg/jubjub_wasm.js",
    jubjubWasmUrl: "/wasm/jubjub/pkg/jubjub_wasm_bg.wasm",
} as const;

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
export function artifactsFor(shape: Shape): CircuitArtifacts {
    const { wasm, zkey, witness } = artifactNames(shape);
    const versioned = (name: string): string =>
        new URL(`/${name}?v=${__CIRCUITS_VERSION__}`, location.href).href;
    return { wasmPath: versioned(wasm), zkeyPath: versioned(zkey), witnessUrl: `/${witness}` };
}
