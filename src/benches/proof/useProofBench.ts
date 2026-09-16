import { useCallback, useEffect, useState } from "react";

import type { Shape } from "../../../shared/circuits";
import { useBenchRun, type BenchRun } from "../../hooks/useBenchRun";
import type { DeviceInfo } from "../../lib/device";
import { errMsg } from "../../lib/errors";
import { formatMs } from "../../lib/format";
import { type BenchResult, fetchResults, postResult } from "./api";
import { measureShape, progressFraction, progressLabel, type ShapeResult, toResultRow } from "./measure";

export interface ProofBench extends Pick<BenchRun, "state" | "status" | "busy" | "logHandle"> {
    /** 0–1 across every shape of the current run. */
    progress: number;
    /** Shapes completed by the most recent run, in run order. */
    summary: ShapeResult[];
    results: BenchResult[];
    /** Proves each shape in turn, posting one result row per shape. */
    run: (shapes: readonly Shape[]) => Promise<void>;
}

export function useProofBench(device: DeviceInfo): ProofBench {
    const { state, status, busy, setStatus, logHandle, start } = useBenchRun();
    const { log } = logHandle;
    const [results, setResults] = useState<BenchResult[]>([]);
    const [progress, setProgress] = useState(0);
    const [summary, setSummary] = useState<ShapeResult[]>([]);

    // A failed load leaves the table as it was: it must not fail a run whose
    // rows were already posted.
    const onLoadError = useCallback((e: unknown) => log("ERROR loading results: " + errMsg(e)), [log]);

    useEffect(() => {
        const controller = new AbortController();
        fetchResults(controller.signal).then(setResults, (e: unknown) => {
            if (!controller.signal.aborted) onLoadError(e);
        });
        return () => controller.abort();
    }, [onLoadError]);

    const run = useCallback((shapes: readonly Shape[]) => start(async signal => {
        setSummary([]);
        setProgress(0);
        log(`device: ${device.ua}`);
        log(`cores: ${device.cores}, memGB: ${device.memGB ?? "?"}, isolated: ${window.crossOriginIsolated}`);

        for (const [i, shape] of shapes.entries()) {
            log(`── ${shape} ──`);
            const measured = await measureShape(shape, {
                log,
                progress: p => {
                    setStatus(progressLabel(p));
                    // Each shape owns an equal slice of the bar; phase weights
                    // provide the detail within a slice.
                    setProgress((i + progressFraction(p)) / shapes.length);
                },
            }, signal);

            const row = toResultRow(device, shape, measured);
            log(
                `${shape}: mean=${formatMs(row.meanMs)} median=${formatMs(row.medianMs)}` +
                ` min=${formatMs(row.minMs)} max=${formatMs(row.maxMs)}`,
            );
            setSummary(prev => [...prev, row]);

            await postResult(row);
        }

        await fetchResults().then(setResults, onLoadError);
    }), [start, log, setStatus, onLoadError, device]);

    return { state, status, busy, progress, summary, results, logHandle, run };
}
