// Main-thread client for the note generator workers.

import type { ScanInput } from "@lelantos-org/sdk/advanced";
import { decodeInput } from "@lelantos-org/sdk/internal";

import type { NotegenRequest, NotegenResponse } from "./protocol";

type MintedShard = Extract<NotegenResponse, { type: "minted" }>;

/** Notes minted once and reused across rows by the sync bench's feed. */
export interface NotePool {
    ivk: bigint;
    /** Distinct notes encrypted to `ivk`. Must stay distinct — `addHits` dedupes by `cm`. */
    mine: ScanInput[];
    /** Notes encrypted to a stranger. Cycled across every non-own row. */
    foreign: ScanInput[];
}

export interface NoteFeed {
    ivk: bigint;
    inputs: ScanInput[];
}

/** A minted value plus the time minting took, which no measured phase includes. */
export type Minted<T> = T & { ms: number };

/** Below this a shard costs more in worker and wasm startup than it saves. */
const MIN_SHARD_NOTES = 256;

/**
 * Splits `[0, n)` into contiguous, non-empty ranges, one per worker, using
 * fewer workers than offered when the shards would fall under
 * {@link MIN_SHARD_NOTES}.
 */
export function shardRanges(n: number, workers: number): [from: number, to: number][] {
    const shards = Math.max(1, Math.min(workers, Math.ceil(n / MIN_SHARD_NOTES)));
    return Array.from({ length: shards }, (_, s) => [
        Math.floor((s * n) / shards),
        Math.floor(((s + 1) * n) / shards),
    ]);
}

/** Resolves with the worker's one answer; rejects rather than hangs on a worker error. */
function mintShard(worker: Worker, req: NotegenRequest): Promise<MintedShard> {
    return new Promise<MintedShard>((resolve, reject) => {
        worker.addEventListener("message", ({ data }: MessageEvent<NotegenResponse>) => {
            if (data.type === "error") reject(new Error(data.message));
            else resolve(data);
        });
        worker.addEventListener("error", e => reject(new Error(e.message || "note generator failed")));
        worker.postMessage(req);
    });
}

/**
 * Mints notes `[0, n)`, the first `mineBelow` of them decryptable, on one-shot
 * workers that each take a contiguous shard.
 */
async function mint(n: number, mineBelow: number): Promise<Minted<NoteFeed>> {
    const t0 = performance.now();
    const ranges = shardRanges(n, navigator.hardwareConcurrency || 4);
    const workers = ranges.map(() => new Worker(new URL("./notegen.worker.ts", import.meta.url), { type: "module" }));
    try {
        const shards = await Promise.all(
            ranges.map(([from, to], s) => mintShard(workers[s], { from, to, mineBelow })),
        );
        return {
            ivk: BigInt(shards[0].ivk),
            inputs: shards.flatMap(s => s.inputs.map(decodeInput)),
            ms: performance.now() - t0,
        };
    } finally {
        // On a failure this also stops the shards still minting.
        for (const worker of workers) worker.terminate();
    }
}

/** Flat feed for the scan bench: `n` notes, `mineFrac` of them decryptable. */
export function mintFeed(n: number, mineFrac: number): Promise<Minted<NoteFeed>> {
    return mint(n, Math.round(n * mineFrac));
}

/**
 * Note pool for the sync bench.
 *
 * `foreign` is small on purpose: the sync bench pages over chains of hundreds
 * of thousands of notes, which it could not mint, and trial-decrypt costs the
 * same on a repeated ciphertext as on a fresh one. `SyntheticNoteSource` cycles
 * these across rows. `mine` stays distinct, because `NoteCache.addHits` dedupes
 * by commitment and repeats would silently collapse the hit count.
 */
export async function mintPool(own: number, foreign: number): Promise<Minted<NotePool>> {
    const { ivk, inputs, ms } = await mint(own + foreign, own);
    return { ivk, mine: inputs.slice(0, own), foreign: inputs.slice(own), ms };
}
