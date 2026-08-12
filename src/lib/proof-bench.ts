// Measurement half of the proof bench: everything that has to happen between
// "user pressed run" and "we have numbers". Deliberately free of React so the
// timed path can be exercised without a component tree.

import { type BenchResult, fetchWitness } from "./api";
import type { DeviceInfo } from "./device";
import { createProver } from "./prover";
import { artifactsFor, type Shape } from "./sdk-wasm";
import { captureSdkLogs } from "./sdk-logs";
import { stats } from "./stats";

/** Timed iterations per shape, after an uncounted warm-up. */
export const ITERS = 5;

export interface ShapeMeasurement {
    /** Worker spawn + artifact fetch + rayon pool bring-up. */
    prepareMs: number;
    /** First prove, excluded from `timesMs` — pays JIT and lazy-init costs. */
    warmupMs: number;
    /** The `ITERS` timed proves. */
    timesMs: number[];
    /** SDK records emitted while this shape ran. */
    sdkLogs: string[];
}

export type ProofPhase = "witness" | "prepare" | "warmup" | "iter";

export interface ProofProgress {
    shape: Shape;
    phase: ProofPhase;
    /** 1-based iteration, only meaningful while `phase` is `"iter"`. */
    iter: number;
}

export interface ShapeReporter {
    /** Where the run is now — drives the status line and the progress bar. */
    progress: (p: ProofProgress) => void;
    /** Verbose line for the log panel. */
    log: (line: string) => void;
}

/** Share of one shape's work done. Rough by design: it paces a bar, not a clock. */
export function progressFraction(p: ProofProgress): number {
    switch (p.phase) {
        case "witness": return 0.02;
        case "prepare": return 0.12;
        case "warmup":  return 0.30;
        case "iter":    return 0.30 + 0.70 * (p.iter / ITERS);
    }
}

export function progressLabel(p: ProofProgress): string {
    switch (p.phase) {
        case "witness": return `${p.shape}: loading witness…`;
        case "prepare": return `${p.shape}: preparing session…`;
        case "warmup":  return `${p.shape}: warm-up…`;
        case "iter":    return `${p.shape}: iter ${p.iter}/${ITERS}…`;
    }
}

/** The row a finished shape posts to `results.json`. */
export function toResultRow(device: DeviceInfo, shape: Shape, run: ShapeMeasurement): BenchResult {
    const summary = stats(run.timesMs);
    return {
        ...device,
        shape,
        iters: ITERS,
        timesMs: run.timesMs,
        meanMs: summary.mean,
        medianMs: summary.median,
        minMs: summary.min,
        maxMs: summary.max,
        prepareMs: run.prepareMs,
        warmupMs: run.warmupMs,
        sdkLogs: run.sdkLogs,
    };
}

/** Proves `shape` once to warm up, then `ITERS` timed times. Always disposes. */
export async function measureShape(shape: Shape, report: ShapeReporter): Promise<ShapeMeasurement> {
    // A second sink alongside the panel's: `onSdkLog` fans out to every
    // listener, so this captures the same records into a per-shape array that
    // gets attached to the posted result.
    const capture = captureSdkLogs();
    let prover: ReturnType<typeof createProver> | null = null;
    try {
        report.progress({ shape, phase: "witness", iter: 0 });
        const input = await fetchWitness(artifactsFor(shape).witnessUrl);
        report.log(`input.${shape}.json loaded`);

        // preload() is the SDK's own warm-up entry point: spawn worker, fetch
        // wasm + zkey, bring up the rayon pool.
        report.progress({ shape, phase: "prepare", iter: 0 });
        const tPrepare = performance.now();
        prover = createProver(shape);
        await prover.preload();
        const prepareMs = performance.now() - tPrepare;
        report.log(`prepare: ${prepareMs.toFixed(0)} ms (artifact fetch + threadpool init)`);

        report.progress({ shape, phase: "warmup", iter: 0 });
        const tWarmup = performance.now();
        await prover.prove(input);
        const warmupMs = performance.now() - tWarmup;
        report.log(`warm-up prove: ${warmupMs.toFixed(0)} ms`);

        const timesMs: number[] = [];
        for (let i = 0; i < ITERS; i++) {
            report.progress({ shape, phase: "iter", iter: i + 1 });
            const t = performance.now();
            await prover.prove(input);
            const dt = performance.now() - t;
            timesMs.push(dt);
            report.log(`iter ${i + 1}: ${dt.toFixed(0)} ms`);
        }

        return { prepareMs, warmupMs, timesMs, sdkLogs: capture.lines };
    } finally {
        prover?.dispose();
        capture.stop();
    }
}
