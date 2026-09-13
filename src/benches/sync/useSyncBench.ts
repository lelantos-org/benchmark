import { useCallback, useRef, useState } from "react";

import { useBenchRun, type BenchRun } from "../../hooks/useBenchRun";
import { useScannerPool } from "../../hooks/useScannerPool";
import { formatMB, formatMs } from "../../lib/format";
import { requireInt } from "../../lib/math";
import { mintPool, type NotePool } from "../../notegen/client";
import { MAX_DETECTION_GAMMA, MIN_GAMMA, type NetworkProfile, STRATEGIES } from "./model";
import { runSync, type SyncRunSummary, warmUp } from "./run";

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

export const LIMITS = {
    total: { min: 100, max: 5_000_000 },
    own: { min: 1, max: 1000 },
    gamma: { min: MIN_GAMMA, max: MAX_DETECTION_GAMMA },
    /** The server's page cap. */
    pageSize: { min: 1, max: 1000 },
} as const;

export interface SyncBenchParams {
    /** Notes on the modelled chain. */
    total: number;
    own: number;
    gamma: number;
    pageSize: number;
    network: NetworkProfile;
}

export interface SyncBench extends Pick<BenchRun, "state" | "status" | "busy" | "logHandle" | "stop"> {
    poolSize: number;
    /** One row per strategy, `full` first. Cleared when a run starts. */
    rows: SyncRunSummary[];
    run: (params: SyncBenchParams) => Promise<void>;
}

const describe = (r: SyncRunSummary): string =>
    `${r.kind}: rows=${r.rows} pages=${r.pages}` +
    ` wire=${formatMB(r.wireBytes)}MB (raw ${formatMB(r.rawBytes)}MB)` +
    ` fetch=${formatMs(r.fetchMs)} (transfer ${formatMs(r.transferMs)})` +
    ` scan=${formatMs(r.scanMs)} persist=${formatMs(r.persistMs)}` +
    ` total=${formatMs(r.totalMs)} hits=${r.hits} γ=${r.gamma}` +
    ` stoppedBy=${r.stoppedBy}`;

function validate(params: SyncBenchParams): SyncBenchParams {
    const checked = { ...params };
    for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
        checked[key] = requireInt(key, params[key], LIMITS[key].min, LIMITS[key].max);
    }
    if (checked.own > checked.total) {
        throw new Error(`own notes (${checked.own}) exceeds chain size (${checked.total})`);
    }
    return checked;
}

export function useSyncBench(): SyncBench {
    const { state, status, busy, setStatus, logHandle, start, stop } = useBenchRun();
    const { log } = logHandle;
    const scanners = useScannerPool();
    const [rows, setRows] = useState<SyncRunSummary[]>([]);
    // Minting is not part of any measured phase, so the pool is kept across
    // runs and re-minted only when it is too small for the parameters.
    const notePool = useRef<NotePool | null>(null);
    // Whether the scanner has been warmed against the current note pool.
    const warmed = useRef(false);

    const run = useCallback((params: SyncBenchParams) => start(async signal => {
        setRows([]);
        const { total, own, gamma, pageSize, network } = validate(params);

        // Each own row must map to a distinct minted note, or `addHits` dedupes
        // it away and the run reads as a missed note.
        let pool = notePool.current;
        if (!pool || pool.mine.length < own) {
            setStatus("minting notes…");
            log(`minting ${own} own + ${FOREIGN_POOL} foreign notes…`);
            const minted = await mintPool(own, FOREIGN_POOL);
            log(`minted in ${formatMs(minted.ms)}`);
            pool = notePool.current = minted;
            warmed.current = false;
        }

        // Shared by both strategies: spawning a pool per strategy would charge
        // worker startup to whichever ran first.
        const scanner = scanners.acquire();
        if (!warmed.current) {
            setStatus("warming scanner…");
            await warmUp(scanner, pool);
            warmed.current = true;
        }

        const out: SyncRunSummary[] = [];
        for (const kind of STRATEGIES) {
            if (signal.aborted) break;
            setStatus(`syncing (${kind})…`);
            const r = await runSync({
                kind, pool, total, own, gamma, pageSize, network, signal,
                onPage: fetched => setStatus(`syncing (${kind}) · ${fetched} rows`),
            }, scanner);
            log(describe(r));
            out.push(r);
            setRows([...out]);
        }

        if (signal.aborted) {
            log("stopped — partial rows shown, not comparable");
            return;
        }
        const [full, matches] = out;
        if (full && matches && matches.totalMs > 0 && matches.wireBytes > 0) {
            log(
                `matches is ${(full.totalMs / matches.totalMs).toFixed(1)}x faster` +
                ` on ${(full.wireBytes / matches.wireBytes).toFixed(1)}x less wire`,
            );
        }
    }), [start, log, setStatus, scanners]);

    return { state, status, busy, poolSize: scanners.size, rows, logHandle, run, stop };
}
