// The bench's view of the SDK's persistent artifact cache (0.9.0+).
//
// The cache is on by default and origin-scoped, so `prepare` measures a cold
// download only until this origin has fetched a shape once. Neither the numbers
// nor the log are readable without knowing which state a run was in, hence the
// probe below; `clearArtifactCache` is what puts a device back to cold.

import { ARTIFACT_CACHE_NAME, clearArtifactCache } from "@lelantos-org/sdk/prover";

import { artifactsFor, type Shape } from "./sdk-wasm";

export { clearArtifactCache };

/**
 * Whether both artifacts for `shape` are already persisted.
 *
 * Matches on the `Response` without reading it — the 3x3 zkey is ~49 MB and a
 * probe that pulled it into memory would cost more than the answer is worth.
 * Reports `false` where the Cache API is absent (non-secure context), which is
 * also the state in which nothing is cached, and swallows failures: this only
 * annotates a log line and must never fail a run.
 */
export async function artifactsCached(shape: Shape): Promise<boolean> {
    if (typeof caches === "undefined") return false;
    const { wasmPath, zkeyPath } = artifactsFor(shape);
    try {
        const cache = await caches.open(ARTIFACT_CACHE_NAME);
        const hits = await Promise.all([wasmPath, zkeyPath].map(url => cache.match(url)));
        return hits.every(Boolean);
    } catch {
        return false;
    }
}
