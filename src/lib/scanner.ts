// Scan path under test: the SDK's `WorkerPoolScanner` over its shipped
// scanner worker — the same object a wallet uses to sync.

import { decodeInput, type ScanInput, WorkerPoolScanner } from "@lelantos-org/sdk/sync";

import type { NotegenRequest, NotegenResponse } from "./notegen-protocol";
import { JUBJUB_WIRE_CONFIG } from "./sdk-wasm";
import { toSdkWorker } from "./sdk-worker";
import { createScannerWorker } from "./sdk-workers";

export interface NoteFeed {
    ivk: bigint;
    inputs: ScanInput[];
    /** Time spent minting the feed. Not part of the measured scan. */
    ms: number;
}

/** Worker count the bench runs the pool at, mirroring a wallet's own sizing. */
export const defaultPoolSize = (): number =>
    Math.max(2, Math.min(8, navigator.hardwareConcurrency || 4));

/**
 * Pool size is always pinned rather than left to the SDK default: the panel
 * heading reports it, and an implicit default could drift away from the number
 * shown, silently misattributing the notes/s figure.
 */
export function createScanner(size: number = defaultPoolSize()): WorkerPoolScanner {
    return new WorkerPoolScanner({
        factory: () => toSdkWorker(createScannerWorker()),
        size,
        wasm: { ...JUBJUB_WIRE_CONFIG },
    });
}

/** One-shot generator worker; terminated once its feed is delivered. */
export function generateNotes(n: number, mineFrac: number): Promise<NoteFeed> {
    const worker = new Worker(new URL("../workers/notegen.worker.ts", import.meta.url), { type: "module" });
    return new Promise<NoteFeed>((resolve, reject) => {
        worker.addEventListener("message", ({ data }: MessageEvent<NotegenResponse>) => {
            worker.terminate();
            if (data.type === "error") return reject(new Error(data.message));
            resolve({ ivk: BigInt(data.ivk), inputs: data.inputs.map(decodeInput), ms: data.ms });
        });
        worker.addEventListener("error", e => {
            worker.terminate();
            reject(new Error(e.message || "note generator failed"));
        });
        worker.postMessage({ type: "generate", n, mineFrac } satisfies NotegenRequest);
    });
}
