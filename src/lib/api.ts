// Talks to the bench-api middleware (see server/bench-api.ts).

import type { DeviceInfo } from "./device";
import type { Shape } from "./sdk-wasm";

/**
 * One row of results.json — what a device reports after a proof run.
 *
 * results.json is append-only across bench versions, so fields that older rows
 * may lack (or newer ones no longer write) are optional rather than removed.
 */
export interface BenchResult extends DeviceInfo {
    ts?: string;
    ip?: string;
    /** Legacy free-text tag; only ever written empty, no longer emitted. */
    label?: string;
    /** Legacy duplicate of `platform`; no longer emitted. */
    device?: string;
    /** Circuit arity proved. Absent on rows written before 3x3 was added. */
    shape?: Shape;
    iters: number;
    timesMs: number[];
    meanMs: number;
    medianMs: number;
    minMs: number;
    maxMs: number;
    prepareMs: number;
    /** Uncounted first prove. Absent on rows written before it was recorded. */
    warmupMs?: number;
    /**
     * Whether the SDK's artifact cache already held this shape when `prepareMs`
     * started — a warm row's prepare skips the zkey download. Absent on rows
     * written before SDK 0.9.0 made that cache the default; those are cold.
     */
    cachedArtifacts?: boolean;
    /** Records forwarded by the SDK worker during the run. */
    sdkLogs: string[];
}

async function fetchJSON<T>(url: string): Promise<T> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} fetch failed: ${r.status}`);
    return r.json() as Promise<T>;
}

export const fetchWitness = (url: string): Promise<Record<string, unknown>> =>
    fetchJSON<Record<string, unknown>>(url);

export const fetchResults = (): Promise<BenchResult[]> =>
    fetchJSON<BenchResult[]>("/results");

export async function postResult(result: BenchResult): Promise<void> {
    const r = await fetch("/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
    });
    if (!r.ok) throw new Error("POST /result failed: " + r.status);
}
