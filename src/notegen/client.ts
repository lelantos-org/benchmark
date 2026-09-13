// Main-thread client for the note generator worker.

import { decodeInput, type ScanInput } from "@lelantos-org/sdk/sync";

import type { NotegenRequest, NotegenResponse } from "./protocol";

type Answer<K extends NotegenRequest["type"]> = Extract<NotegenResponse, { type: K }>;

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

/**
 * Runs one request against a one-shot generator worker, terminated once its
 * answer arrives. The worker plumbing — terminate on every exit, reject rather
 * than hang on a worker error — lives here once for both feeds.
 */
function request<R extends NotegenRequest>(req: R): Promise<Answer<R["type"]>> {
    const worker = new Worker(new URL("./notegen.worker.ts", import.meta.url), { type: "module" });
    return new Promise<Answer<R["type"]>>((resolve, reject) => {
        worker.addEventListener("message", ({ data }: MessageEvent<NotegenResponse>) => {
            worker.terminate();
            if (data.type === "error") reject(new Error(data.message));
            else if (data.type !== req.type) reject(new Error(`unexpected notegen response: ${data.type}`));
            else resolve(data as Answer<R["type"]>);
        });
        worker.addEventListener("error", e => {
            worker.terminate();
            reject(new Error(e.message || "note generator failed"));
        });
        worker.postMessage(req);
    });
}

/** Flat feed for the scan bench: `n` notes, `mineFrac` of them decryptable. */
export async function mintFeed(n: number, mineFrac: number): Promise<Minted<NoteFeed>> {
    const r = await request({ type: "feed", n, mineFrac });
    return { ivk: BigInt(r.ivk), inputs: r.inputs.map(decodeInput), ms: r.ms };
}

/**
 * Note pool for the sync bench.
 *
 * `foreign` is small on purpose: the sync bench pages over chains of hundreds
 * of thousands of notes, which it could not mint, and trial-decrypt costs the
 * same on a repeated ciphertext as on a fresh one. `SyntheticNoteSource` cycles
 * these across rows.
 */
export async function mintPool(own: number, foreign: number): Promise<Minted<NotePool>> {
    const r = await request({ type: "pool", own, foreign });
    return {
        ivk: BigInt(r.ivk),
        mine: r.mine.map(decodeInput),
        foreign: r.foreign.map(decodeInput),
        ms: r.ms,
    };
}
