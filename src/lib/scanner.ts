// Scan path under test: the SDK's `WorkerPoolScanner` over its shipped scanner
// worker, the same path a wallet uses to sync.

import { decodeInput, type ScanInput, WorkerPoolScanner } from "@lelantos-org/sdk/sync";

import type { NotegenRequest, NotegenResponse } from "./notegen-protocol";
import { JUBJUB_WIRE_CONFIG } from "./sdk-wasm";
import { createScannerWorker } from "./sdk-workers";
import type { NotePool } from "./sync-feed";

/** A minted pool plus the time it took. See {@link generatePool}. */
export interface PoolFeed extends NotePool {
    /** Time spent minting. Excluded from every measured phase. */
    ms: number;
}

export interface NoteFeed {
    ivk: bigint;
    inputs: ScanInput[];
    /** Time spent minting the feed. Excluded from the measured scan. */
    ms: number;
}

/** Worker count the pool runs at, mirroring a wallet's sizing. */
export const defaultPoolSize = (): number =>
    Math.max(2, Math.min(8, navigator.hardwareConcurrency || 4));

/**
 * Pool size is pinned rather than left to the SDK default: the panel heading
 * reports it, and an implicit default could drift from the number shown,
 * misattributing the notes/s figure.
 */
export function createScanner(size: number = defaultPoolSize()): WorkerPoolScanner {
    return new WorkerPoolScanner({
        factory: () => createScannerWorker(),
        size,
        wasm: { ...JUBJUB_WIRE_CONFIG },
    });
}

/**
 * Runs one request against a one-shot generator worker, terminated once its
 * answer arrives. Shared by both feeds so the worker plumbing — terminate on
 * every exit, reject rather than hang on a worker error — lives in one place.
 */
function mint<T>(req: NotegenRequest, take: (r: NotegenResponse) => T | null): Promise<T> {
    const worker = new Worker(new URL("../workers/notegen.worker.ts", import.meta.url), { type: "module" });
    return new Promise<T>((resolve, reject) => {
        worker.addEventListener("message", ({ data }: MessageEvent<NotegenResponse>) => {
            worker.terminate();
            if (data.type === "error") return reject(new Error(data.message));
            const out = take(data);
            if (out === null) return reject(new Error(`unexpected notegen response: ${data.type}`));
            resolve(out);
        });
        worker.addEventListener("error", e => {
            worker.terminate();
            reject(new Error(e.message || "note generator failed"));
        });
        worker.postMessage(req);
    });
}

/** Flat feed for the scan bench. */
export function generateNotes(n: number, mineFrac: number): Promise<NoteFeed> {
    return mint({ type: "generate", n, mineFrac }, r =>
        r.type === "generated"
            ? { ivk: BigInt(r.ivk), inputs: r.inputs.map(decodeInput), ms: r.ms }
            : null);
}

/**
 * Note pool for the sync bench.
 *
 * `foreign` is small on purpose: the sync bench pages over chains of hundreds
 * of thousands of notes, which it could not mint, and trial-decrypt costs the
 * same on a repeated ciphertext as on a fresh one. `SyntheticNoteSource` cycles
 * these across rows.
 */
export function generatePool(own: number, foreign: number): Promise<PoolFeed> {
    return mint({ type: "generate-pool", own, foreign }, r =>
        r.type === "pool"
            ? {
                ivk: BigInt(r.ivk),
                mine: r.mine.map(decodeInput),
                foreign: r.foreign.map(decodeInput),
                ms: r.ms,
            }
            : null);
}
