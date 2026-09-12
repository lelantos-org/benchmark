import { useCallback, useEffect, useRef, useState } from "react";

import type { RunState } from "../lib/run-state";
import { createScanner, defaultPoolSize, generatePool } from "../lib/scanner";
import { runSync, type SyncRunSummary, warmUp } from "../lib/sync-bench";
import type { NotePool } from "../lib/sync-feed";
import type { NetworkProfile } from "../lib/sync-model";
import { useBenchRun } from "./useBenchRun";
import type { LogHandle } from "./useLog";

/**
 * Distinct foreign notes minted per run. The feed cycles them across every
 * non-own row, so this bounds mint time rather than chain size: 4096 is a
 * couple of seconds on a phone, and large enough that no ciphertext-specific
 * effect could dominate a scan.
 *
 * It must also stay above the largest page, which the server caps at 1000: a
 * page that repeated a row would compress far better than a real response and
 * understate the firehose's bandwidth. `runSync` enforces that.
 */
const FOREIGN_POOL = 4096;

export interface SyncBenchParams {
    /** Notes on the modelled chain. */
    total: number;
    own: number;
    gamma: number;
    pageSize: number;
    network: NetworkProfile;
}

export interface SyncBench {
    state: RunState;
    status: string;
    poolSize: number;
    /** One row per strategy, `full` first. Cleared when a run starts. */
    rows: SyncRunSummary[];
    logHandle: LogHandle;
    run: (params: SyncBenchParams) => Promise<void>;
    stop: () => void;
}

const mb = (bytes: number): string => (bytes / 1e6).toFixed(2);

export function useSyncBench(): SyncBench {
    const { state, status, setStatus, logHandle, start } = useBenchRun();
    const { log } = logHandle;
    const [poolSize] = useState(defaultPoolSize);
    const [rows, setRows] = useState<SyncRunSummary[]>([]);
    const scannerRef = useRef<ReturnType<typeof createScanner> | null>(null);
    // Minting is not part of any measured phase, so the pool is kept across
    // runs and re-minted only when it is too small for the parameters.
    const poolRef = useRef<NotePool | null>(null);
    const warmRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => {
        abortRef.current?.abort();
        void scannerRef.current?.dispose();
        scannerRef.current = null;
    }, []);

    const stop = useCallback(() => abortRef.current?.abort(), []);

    const run = useCallback((params: SyncBenchParams) => start(async () => {
        setRows([]);
        const { total, own, gamma, pageSize, network } = params;
        if (own > total) throw new Error(`own notes (${own}) exceeds chain size (${total})`);

        // Each own row must map to a distinct minted note, or `addHits` dedupes
        // it away and the run reads as a missed note.
        let pool = poolRef.current;
        if (!pool || pool.mine.length < own) {
            setStatus("minting notes…");
            log(`minting ${own} own + ${FOREIGN_POOL} foreign notes…`);
            const minted = await generatePool(own, FOREIGN_POOL);
            log(`minted in ${minted.ms.toFixed(0)}ms`);
            pool = minted;
            poolRef.current = minted;
            warmRef.current = false;
        }

        // Retained across runs and shared by both strategies: a wallet builds
        // its pool once per session, and spawning one per strategy would charge
        // worker startup to whichever ran first.
        scannerRef.current ??= createScanner(poolSize);
        const scanner = scannerRef.current;
        if (!warmRef.current) {
            setStatus("warming scanner…");
            await warmUp(scanner, pool);
            warmRef.current = true;
        }

        const abort = new AbortController();
        abortRef.current = abort;
        const out: SyncRunSummary[] = [];
        try {
            for (const kind of ["full", "matches"] as const) {
                setStatus(`syncing (${kind})…`);
                const r = await runSync(
                    {
                        kind, pool, total, own, gamma, pageSize, network,
                        signal: abort.signal,
                        onPage: fetched => setStatus(`syncing (${kind}) · ${fetched} rows`),
                    },
                    scanner,
                );
                log(
                    `${r.kind}: rows=${r.rows} pages=${r.pages}` +
                    ` wire=${mb(r.wireBytes)}MB (raw ${mb(r.rawBytes)}MB)` +
                    ` fetch=${r.fetchMs.toFixed(0)}ms (transfer ${r.transferMs.toFixed(0)}ms)` +
                    ` scan=${r.scanMs.toFixed(0)}ms persist=${r.persistMs.toFixed(0)}ms` +
                    ` total=${r.totalMs.toFixed(0)}ms hits=${r.hits} γ=${r.gamma}` +
                    ` stoppedBy=${r.stoppedBy}`,
                );
                out.push(r);
                setRows(out.slice());
                if (r.stoppedBy === "aborted") {
                    log("stopped — partial rows shown, not comparable");
                    return;
                }
            }
        } finally {
            abortRef.current = null;
        }

        const [full, matches] = out;
        if (full && matches && matches.totalMs > 0 && matches.wireBytes > 0) {
            log(
                `matches is ${(full.totalMs / matches.totalMs).toFixed(1)}x faster` +
                ` on ${(full.wireBytes / matches.wireBytes).toFixed(1)}x less wire`,
            );
        }
    }), [start, log, setStatus, poolSize]);

    return { state, status, poolSize, rows, logHandle, run, stop };
}
