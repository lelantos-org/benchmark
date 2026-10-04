// Hash under the tree bench: the SDK's `Poseidon`, backed by its shipped wasm.

import { configurePoseidonWasm, Poseidon } from "@lelantos-org/sdk/primitives";

import { POSEIDON_WASM } from "./artifacts";

let built: Promise<Poseidon> | null = null;

/**
 * The page's one `Poseidon`, built on first use.
 *
 * The loader is injected because the SDK is prebundled: its default resolves
 * the wasm against `import.meta.url`, which then points into Vite's dependency
 * cache. `Poseidon.build()` does not fail on that — it falls back to the JS
 * tables — so the bench would report the slow backend's numbers without an
 * error. Callers should surface `backend` for the same reason.
 */
export function loadPoseidon(): Promise<Poseidon> {
    if (!built) {
        configurePoseidonWasm({
            loadModule: () => import(/* @vite-ignore */ POSEIDON_WASM.moduleUrl),
            wasm: POSEIDON_WASM.wasmUrl,
        });
        built = Poseidon.build();
    }
    return built;
}
