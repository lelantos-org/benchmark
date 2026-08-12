import { useCallback, useEffect, useState } from "react";

import { type BenchResult, fetchResults, postResult } from "../lib/api";
import { deviceInfo } from "../lib/device";
import { errMsg } from "../lib/errors";
import { measureShape, progressFraction, progressLabel, toResultRow } from "../lib/proof-bench";
import type { RunState } from "../lib/run-state";
import type { Shape } from "../lib/sdk-wasm";
import { stats, type Stats } from "../lib/stats";
import { useBenchRun } from "./useBenchRun";
import type { LogHandle } from "./useLog";

/** What a finished shape contributes to the summary tiles. */
export interface ShapeSummary extends Stats {
    shape: Shape;
    prepareMs: number;
}

export interface ProofBench {
    state: RunState;
    status: string;
    /** 0–1 across every shape of the current run; 0 when idle. */
    progress: number;
    /** Shapes completed by the most recent run, in run order. */
    summary: ShapeSummary[];
    results: BenchResult[];
    logHandle: LogHandle;
    /** Proves each shape in turn, posting one result row per shape. */
    run: (shapes: Shape[]) => Promise<void>;
}

export function useProofBench(): ProofBench {
    const { state, status, setStatus, logHandle, start } = useBenchRun();
    const { log } = logHandle;
    const [results, setResults] = useState<BenchResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [summary, setSummary] = useState<ShapeSummary[]>([]);

    /** Reload after a run appends rows. */
    const refresh = useCallback(async () => {
        const rows = await loadResults(log);
        if (rows) setResults(rows);
    }, [log]);

    // Initial load. State lands after the fetch resolves, and is dropped if the
    // panel unmounted first.
    useEffect(() => {
        let live = true;
        void (async () => {
            const rows = await loadResults(log);
            if (live && rows) setResults(rows);
        })();
        return () => { live = false; };
    }, [log]);

    const run = useCallback((shapes: Shape[]) => start(async () => {
        setSummary([]);
        setProgress(0);
        const dev = deviceInfo();
        log(`device: ${dev.ua}`);
        log(`cores: ${dev.cores}, memGB: ${dev.memGB ?? "?"}, isolated: ${window.crossOriginIsolated}`);

        for (const [i, shape] of shapes.entries()) {
            log(`── ${shape} ──`);
            const measured = await measureShape(shape, {
                log,
                progress: p => {
                    setStatus(progressLabel(p));
                    // Each shape owns an equal slice of the bar; within it the
                    // phase weights carry the detail.
                    setProgress((i + progressFraction(p)) / shapes.length);
                },
            });
            const s = stats(measured.timesMs);
            log(`${shape}: mean=${s.mean.toFixed(0)} median=${s.median.toFixed(0)} min=${s.min.toFixed(0)} max=${s.max.toFixed(0)}`);
            setSummary(prev => [...prev, { shape, prepareMs: measured.prepareMs, ...s }]);
            setProgress((i + 1) / shapes.length);

            await postResult(toResultRow(dev, shape, measured));
        }

        await refresh();
    }), [start, log, setStatus, refresh]);

    return { state, status, progress, summary, results, logHandle, run };
}

/** Fetches the results table, reporting failure to the log instead of throwing. */
async function loadResults(log: (line: string) => void): Promise<BenchResult[] | null> {
    try {
        return await fetchResults();
    } catch (e) {
        log("ERROR loading results: " + errMsg(e));
        return null;
    }
}
