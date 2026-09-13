import { useCallback, useState } from "react";

import { useBenchRun, type BenchRun } from "../../hooks/useBenchRun";
import { useScannerPool } from "../../hooks/useScannerPool";
import { formatMs } from "../../lib/format";
import { requireInt } from "../../lib/math";
import { timed } from "../../lib/timing";
import { mintFeed } from "../../notegen/client";

export const MAX_NOTES = 100_000;

export interface ScanParams {
    notes: number;
    /** 0–100. */
    minePercent: number;
}

/** Headline numbers from a finished scan. */
export interface ScanSummary {
    notes: number;
    hits: number;
    totalMs: number;
    perNoteMs: number;
    notesPerSec: number;
}

export interface ScanBench extends Pick<BenchRun, "state" | "status" | "busy" | "logHandle"> {
    poolSize: number;
    summary: ScanSummary | null;
    run: (params: ScanParams) => Promise<void>;
}

export function useScanBench(): ScanBench {
    const { state, status, busy, setStatus, logHandle, start } = useBenchRun();
    const { log } = logHandle;
    const pool = useScannerPool();
    const [summary, setSummary] = useState<ScanSummary | null>(null);

    const run = useCallback((params: ScanParams) => start(async () => {
        setSummary(null);
        const n = requireInt("notes", params.notes, 1, MAX_NOTES);
        const minePercent = requireInt("mine %", params.minePercent, 0, 100);

        setStatus("generating notes…");
        log(`generating ${n} synthetic notes (${minePercent}% mine)…`);
        const feed = await mintFeed(n, minePercent / 100);
        log(`generated in ${formatMs(feed.ms)}`);

        const scanner = pool.acquire();
        setStatus("scanning…");
        const [hits, totalMs] = await timed(() => scanner.scan(feed.ivk, feed.inputs));

        const result: ScanSummary = {
            notes: n,
            hits: hits.length,
            totalMs,
            perNoteMs: totalMs / n,
            notesPerSec: (n / totalMs) * 1000,
        };
        log(
            `hits=${result.hits}  total=${formatMs(totalMs)}` +
            `  per-note=${result.perNoteMs.toFixed(3)}ms  rate=${result.notesPerSec.toFixed(0)}/s`,
        );
        setSummary(result);
    }), [start, log, setStatus, pool]);

    return { state, status, busy, poolSize: pool.size, summary, logHandle, run };
}
