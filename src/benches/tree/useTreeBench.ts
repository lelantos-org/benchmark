import { useCallback, useState } from "react";

import { CIRCUITS } from "../../../shared/circuits";
import { useBenchRun, type BenchRun } from "../../hooks/useBenchRun";
import { formatCount, formatMs } from "../../lib/format";
import { requireInts } from "../../lib/math";
import { nextPaint } from "../../lib/timing";
import { loadPoseidon } from "../../sdk/poseidon";
import { runTreeBench, type TreePhase, type TreeRunSummary } from "./run";

/** Depth the benched circuit proves against. */
export const DEFAULT_DEPTH = CIRCUITS[0].depth;

/** Input bounds; the panel's fields and the run's validation both read these. */
export const LIMITS = {
    /** Up to a full depth-10 tree; every leaf is held in memory several times over. */
    leaves: { min: 1, max: 4 ** 10 },
    depth: { min: 1, max: 12 },
} as const;

export interface TreeBenchParams {
    leaves: number;
    depth: number;
}

export interface TreeBench extends Pick<BenchRun, "state" | "status" | "busy" | "logHandle" | "stop"> {
    summary: TreeRunSummary | null;
    run: (params: TreeBenchParams) => Promise<void>;
}

const PHASE_STATUS: Record<TreePhase, string> = {
    feed: "building feed…",
    cold: "cold sync…",
    leaves: "restoring from leaves (page blocked)…",
    nodes: "restoring from nodes…",
};

const describe = (s: TreeRunSummary): string =>
    `leaves=${s.leaves} depth=${s.depth} poseidon=${s.backend} chunks=${s.chunks} nodes=${s.nodes}` +
    `  cold=${formatMs(s.coldMs)} (sync ${formatMs(s.syncMs)} + root ${formatMs(s.rootMs)})` +
    `  leaves-only=${formatMs(s.leavesMs)}  with-nodes=${formatMs(s.nodesMs)}` +
    `  per-hash=${s.usPerHash.toFixed(1)}µs  root=0x${s.root.toString(16).slice(0, 12)}…`;

export function useTreeBench(): TreeBench {
    const { state, status, busy, setStatus, logHandle, start, stop } = useBenchRun();
    const { log } = logHandle;
    const [summary, setSummary] = useState<TreeRunSummary | null>(null);

    const run = useCallback((params: TreeBenchParams) => start(async signal => {
        setSummary(null);
        const { leaves, depth } = requireInts(params, LIMITS);

        setStatus("loading poseidon…");
        const P = await loadPoseidon();
        if (P.backend === "js") log("WARN: poseidon wasm did not load — timing the JS fallback");

        const result = await runTreeBench({
            P, leaves, depth, signal,
            onPhase: phase => {
                setStatus(PHASE_STATUS[phase]);
                return nextPaint();
            },
            onProgress: synced => setStatus(`cold sync · ${formatCount(synced)} leaves`),
        });
        if (!result) {
            log("stopped — no result");
            return;
        }
        log(describe(result));
        setSummary(result);
    }), [start, log, setStatus]);

    return { state, status, busy, summary, logHandle, run, stop };
}
