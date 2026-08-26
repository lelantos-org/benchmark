import { useCallback, useEffect, useRef, useState } from "react";

import type { RunState } from "../lib/run-state";
import { createScanner, defaultPoolSize, generateNotes } from "../lib/scanner";
import { useBenchRun } from "./useBenchRun";
import type { LogHandle } from "./useLog";

/** Headline numbers from a finished scan. */
export interface ScanSummary {
    notes: number;
    hits: number;
    totalMs: number;
    perNoteMs: number;
    notesPerSec: number;
}

export interface ScanBench {
    state: RunState;
    status: string;
    poolSize: number;
    summary: ScanSummary | null;
    logHandle: LogHandle;
    run: (n: number, minePercent: number) => Promise<void>;
}

export function useScanBench(): ScanBench {
    const { state, status, setStatus, logHandle, start } = useBenchRun();
    const { log } = logHandle;
    // Pinned for the session: the heading reports this number and the pool is
    // built with exactly it.
    const [poolSize] = useState(defaultPoolSize);
    const [summary, setSummary] = useState<ScanSummary | null>(null);
    const scannerRef = useRef<ReturnType<typeof createScanner> | null>(null);

    useEffect(() => () => {
        void scannerRef.current?.dispose();
        scannerRef.current = null;
    }, []);

    const run = useCallback((n: number, minePercent: number) => start(async () => {
        setSummary(null);
        setStatus("generating notes…");
        const mineFrac = Math.max(0, Math.min(100, minePercent)) / 100;
        log(`generating ${n} synthetic notes (${(mineFrac * 100).toFixed(1)}% mine)…`);
        const feed = await generateNotes(n, mineFrac);
        log(`generated in ${feed.ms.toFixed(0)}ms`);

        // The pool is retained across runs. A wallet builds it once per session,
        // and spawning it per scan would fold worker startup into the rate.
        scannerRef.current ??= createScanner(poolSize);
        const scanner = scannerRef.current;

        setStatus("scanning…");
        const t0 = performance.now();
        const hits = await scanner.scan(feed.ivk, feed.inputs);
        const totalMs = performance.now() - t0;

        log(`hits=${hits.length}  total=${totalMs.toFixed(0)}ms  per-note=${(totalMs / n).toFixed(3)}ms  rate=${((n / totalMs) * 1000).toFixed(0)}/s`);
        setSummary({
            notes: n,
            hits: hits.length,
            totalMs,
            perNoteMs: totalMs / n,
            notesPerSec: (n / totalMs) * 1000,
        });
    }), [start, log, setStatus, poolSize]);

    return { state, status, poolSize, summary, logHandle, run };
}
