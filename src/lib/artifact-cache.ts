// The bench's view of the SDK's persistent artifact cache.
//
// The cache is enabled by default and origin-scoped, so `prepare` measures a
// cold download only until this origin has fetched a shape once. Runs are only
// comparable when that state is known, hence the probe below;
// `clearArtifactCache` returns a device to the cold state.

import { ARTIFACT_CACHE_NAME, clearArtifactCache } from "@lelantos-org/sdk/prover";

import { artifactsFor, type Shape } from "./sdk-wasm";

export { clearArtifactCache };

/**
 * Whether both artifacts for `shape` are already persisted.
 *
 * Matches on the `Response` without reading its body: the zkeys range from
 * ~21 MB (2x2) to ~40 MB (4x4). Returns `false` where the Cache API is absent
 * (non-secure context), which is also the state in which nothing is cached, and
 * swallows failures — the result only annotates a log line and must never fail
 * a run.
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
