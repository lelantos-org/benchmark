// Measurement half of the proof bench: everything between the run request and
// the resulting numbers. Free of React so the timed path can be exercised
// without a component tree.

import type { Shape } from "../../../shared/circuits";
import type { DeviceInfo } from "../../lib/device";
import { formatMs } from "../../lib/format";
import { stats } from "../../lib/stats";
import { timed } from "../../lib/timing";
import { artifactsCached } from "../../sdk/artifact-cache";
import { artifactsFor } from "../../sdk/artifacts";
import { captureSdkLogs } from "../../sdk/logs";
import { createProver } from "../../sdk/prover";
import { type BenchResult, fetchWitness } from "./api";

/** Timed iterations per shape, after an uncounted warm-up. */
export const ITERS = 5;

export interface ShapeMeasurement {
    /**
     * Worker spawn, artifact load and rayon pool bring-up.
     *
     * The artifact load is a Cache API read once this origin has fetched the
     * shape, so only the first run on a device measures a cold download.
     * `prepare` is comparable across devices only for runs in the same state;
     * `clearArtifactCache()` forces a cold one.
     */
    prepareMs: number;
    /** First prove, excluded from `timesMs`; absorbs JIT and lazy-init costs. */
    warmupMs: number;
    /** The `ITERS` timed proves. */
    timesMs: number[];
    /** Whether the artifacts were already cached when `prepareMs` started. */
    cachedArtifacts: boolean;
    /** SDK log records emitted while this shape ran. */
    sdkLogs: string[];
}

export type ProofProgress =
    | { shape: Shape; phase: "witness" | "prepare" | "warmup" }
    /** `iter` is 1-based. */
    | { shape: Shape; phase: "iter"; iter: number };

export interface ShapeReporter {
    /** Current run position; drives the status line and progress bar. */
    progress: (p: ProofProgress) => void;
    /** Emits a verbose line to the log panel. */
    log: (line: string) => void;
}

/** Approximate share of one shape's work completed; paces the progress bar. */
export function progressFraction(p: ProofProgress): number {
    switch (p.phase) {
        case "witness": return 0.02;
        case "prepare": return 0.12;
        case "warmup": return 0.30;
        case "iter": return 0.30 + 0.70 * (p.iter / ITERS);
    }
}

export function progressLabel(p: ProofProgress): string {
    switch (p.phase) {
        case "witness": return `${p.shape}: loading witness…`;
        case "prepare": return `${p.shape}: preparing session…`;
        case "warmup": return `${p.shape}: warm-up…`;
        case "iter": return `${p.shape}: iter ${p.iter}/${ITERS}…`;
    }
}

/** Builds the row a finished shape posts to `results.json`. */
export function toResultRow(device: DeviceInfo, shape: Shape, run: ShapeMeasurement): BenchResult {
    const { mean, median, min, max } = stats(run.timesMs);
    return {
        ...device,
        shape,
        iters: run.timesMs.length,
        timesMs: run.timesMs,
        meanMs: mean,
        medianMs: median,
        minMs: min,
        maxMs: max,
        prepareMs: run.prepareMs,
        warmupMs: run.warmupMs,
        cachedArtifacts: run.cachedArtifacts,
        sdkLogs: run.sdkLogs,
    };
}

/**
 * Proves `shape` once to warm up, then `ITERS` timed iterations. Always
 * disposes the prover. An abort takes effect between proves.
 */
export async function measureShape(shape: Shape, report: ShapeReporter, signal?: AbortSignal): Promise<ShapeMeasurement> {
    // A second sink alongside the panel's. `onSdkLog` fans out to every
    // listener, so this collects the same records into a per-shape array that
    // is attached to the posted result.
    const capture = captureSdkLogs();
    try {
        report.progress({ shape, phase: "witness" });
        const input = await fetchWitness(artifactsFor(shape).witnessUrl);
        report.log(`input.${shape}.json loaded`);

        // preload() is the SDK's warm-up entry point: spawn the worker, load
        // wasm and zkey (network or Cache API), bring up the rayon pool.
        report.progress({ shape, phase: "prepare" });
        // Probed before preload, which fills the cache.
        const cachedArtifacts = await artifactsCached(shape);
        report.log(`artifacts: ${cachedArtifacts ? "cached (warm prepare)" : "not cached (cold prepare)"}`);

        const tPrepare = performance.now();
        const prover = createProver(shape);
        try {
            await prover.preload();
            const prepareMs = performance.now() - tPrepare;
            report.log(`prepare: ${formatMs(prepareMs)} (artifact load + threadpool init)`);

            const prove = async (): Promise<number> => {
                signal?.throwIfAborted();
                const [, ms] = await timed(() => prover.prove(input));
                return ms;
            };

            report.progress({ shape, phase: "warmup" });
            const warmupMs = await prove();
            report.log(`warm-up prove: ${formatMs(warmupMs)}`);

            const timesMs: number[] = [];
            for (let iter = 1; iter <= ITERS; iter++) {
                report.progress({ shape, phase: "iter", iter });
                const ms = await prove();
                timesMs.push(ms);
                report.log(`iter ${iter}: ${formatMs(ms)}`);
            }

            return { prepareMs, warmupMs, timesMs, cachedArtifacts, sdkLogs: capture.lines };
        } finally {
            prover.dispose();
        }
    } finally {
        capture.stop();
    }
}
