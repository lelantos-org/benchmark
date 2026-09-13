// Scan path under test: the SDK's `WorkerPoolScanner` over its shipped scanner
// worker, the same path a wallet uses to sync.

import { WorkerPoolScanner } from "@lelantos-org/sdk/sync";

import { JUBJUB_WASM } from "./artifacts";
import { createScannerWorker } from "./workers";

/** Worker count the pool runs at, mirroring a wallet's sizing. */
export const defaultPoolSize = (): number =>
    Math.max(2, Math.min(8, navigator.hardwareConcurrency || 4));

/**
 * Pool size is explicit rather than left to the SDK default: the panel heading
 * reports it, and an implicit default could drift from the number shown,
 * misattributing the notes/s figure.
 */
export function createScanner(size: number): WorkerPoolScanner {
    return new WorkerPoolScanner({
        factory: createScannerWorker,
        size,
        wasm: { ...JUBJUB_WASM },
    });
}
