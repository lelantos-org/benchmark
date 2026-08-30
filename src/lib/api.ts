// Client for the bench-api middleware (see server/bench-api.ts).

import type { DeviceInfo } from "./device";

/**
 * One row of results.json: what a device reports after a proof run.
 *
 * results.json is append-only across bench versions, so fields that some rows
 * may lack are optional rather than required.
 */
export interface BenchResult extends DeviceInfo {
    ts?: string;
    ip?: string;
    /** Duplicate of `platform` present on some rows; not emitted. */
    device?: string;
    /**
     * Circuit arity proved. Typed as a plain string rather than `Shape`: rows
     * outlive the circuit set that produced them, so a recorded arity need not
     * be one the installed circuits still ship. Narrow with `isShape`.
     */
    shape?: string;
    iters: number;
    timesMs: number[];
    meanMs: number;
    medianMs: number;
    minMs: number;
    maxMs: number;
    prepareMs: number;
    /** Uncounted first prove. Absent on rows that predate its recording. */
    warmupMs?: number;
    /**
     * Whether the SDK's artifact cache already held this shape when `prepareMs`
     * started; a warm prepare skips the zkey download. Absent on rows that
     * predate the cache, which were all cold.
     */
    cachedArtifacts?: boolean;
    /** Log records forwarded by the SDK worker during the run. */
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
