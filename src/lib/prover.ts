// Proof path under test: the SDK's `WorkerProver` driving its shipped
// prover worker (ark-groth16 in wasm + wasm-bindgen-rayon thread pool).

import { WorkerProver } from "@lelantos-org/sdk/prover";

import { artifactsFor, type Shape } from "./sdk-wasm";
import { toSdkWorker } from "./sdk-worker";
import { createProverWorker } from "./sdk-workers";

/**
 * One prover per shape: each worker caches the artifacts it was built with, so
 * 2x2 and 3x3 get their own worker rather than paying a rebuild per switch.
 *
 * `cacheArtifacts` is left at its default (SDK 0.9.0+), so the worker persists
 * the downloaded wasm + zkey to the origin's Cache API and a later run — in a
 * fresh worker or after a reload — skips the download. That is the behaviour a
 * wallet ships with, and it means `prepareMs` is cold only until this origin
 * has seen the shape once; `clearArtifactCache()` resets it.
 */
export function createProver(shape: Shape, threads?: number): WorkerProver {
    const { wasmPath, zkeyPath } = artifactsFor(shape);
    return new WorkerProver({
        worker: toSdkWorker(createProverWorker()),
        paths: { wasmPath, zkeyPath },
        threads,
    });
}
