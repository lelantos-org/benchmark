// Proof path under test: the SDK's `WorkerProver` driving its shipped prover
// worker (ark-groth16 in wasm with a wasm-bindgen-rayon thread pool).

import { WorkerProver } from "@lelantos-org/sdk/prover";

import { artifactsFor, type Shape } from "./sdk-wasm";
import { toSdkWorker } from "./sdk-worker";
import { createProverWorker } from "./sdk-workers";

/**
 * Creates a prover for one shape. Each worker caches the artifacts it was built
 * with, so every arity gets its own worker rather than rebuilding per switch.
 *
 * `cacheArtifacts` is left at its default, so the worker persists the
 * downloaded wasm and zkey to the origin's Cache API and later runs skip the
 * download. `prepareMs` is therefore cold only until this origin has loaded the
 * shape once; `clearArtifactCache()` resets that.
 */
export function createProver(shape: Shape, threads?: number): WorkerProver {
    const { wasmPath, zkeyPath } = artifactsFor(shape);
    return new WorkerProver({
        worker: toSdkWorker(createProverWorker()),
        paths: { wasmPath, zkeyPath },
        threads,
    });
}
