// The bench's view of the SDK's persistent artifact cache.

import { ARTIFACT_CACHE_NAME } from "@lelantos-org/sdk/prover";

import type { Shape } from "../../shared/circuits";
import { artifactsFor } from "./artifacts";

export { clearArtifactCache } from "@lelantos-org/sdk/prover";

/**
 * Whether both artifacts for `shape` are already persisted.
 *
 * The cache is enabled by default and origin-scoped, so `prepare` measures a
 * cold download only until this origin has fetched a shape once; runs are only
 * comparable when that state is known.
 *
 * Matches on the `Response` without reading its body: the 4x6 zkey alone is
 * ~46 MB. Returns `false` where the Cache API is absent (non-secure context),
 * which is also the state in which nothing is cached, and swallows failures —
 * the result only annotates a log line and must never fail a run.
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
