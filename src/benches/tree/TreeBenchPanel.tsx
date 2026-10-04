import { useState } from "react";

import { Badge } from "../../components/Badge";
import { NumberField } from "../../components/NumberField";
import { Panel } from "../../components/Panel";
import { StatTiles, type Stat } from "../../components/StatTiles";
import { StatusPill } from "../../components/StatusPill";
import { formatCount, formatMsInt } from "../../lib/format";
import type { TreeRunSummary } from "./run";
import { DEFAULT_DEPTH, LIMITS, useTreeBench } from "./useTreeBench";

/**
 * Cost of rebuilding the commitment tree, on the main thread where a wallet
 * runs it. The feed is synthetic and instant — see the README — so the times
 * are the SDK's insert and Poseidon work alone.
 */
export function TreeBenchPanel() {
    const { state, status, busy, summary, logHandle, run, stop } = useTreeBench();
    const [leaves, setLeaves] = useState(100_000);
    const [depth, setDepth] = useState<number>(DEFAULT_DEPTH);

    return (
        <Panel title="Merkle tree rebuild" log={logHandle}
            subtitle={<>SDK <code>TreeStore</code> · synthetic commitment feed · main thread</>}>
            <div className="controls">
                <button className="primary" onClick={() => void run({ leaves, depth })} disabled={busy}>
                    {busy ? "Rebuilding…" : "Run tree benchmark"}
                </button>
                {busy && <button onClick={stop}>Stop</button>}
                <NumberField label="leaves" wide step={1000} {...LIMITS.leaves} value={leaves}
                    disabled={busy} onChange={setLeaves} />
                <NumberField label="depth" {...LIMITS.depth} value={depth} disabled={busy} onChange={setDepth} />
                <StatusPill state={state} status={status} />
            </div>

            {summary && (
                <div className="summary">
                    <h3 className="summary-head">
                        last rebuild{" "}
                        <span className="muted">
                            {formatCount(summary.leaves)} leaves · depth {summary.depth} ·{" "}
                        </span>
                        <Badge tone={summary.backend === "wasm" ? "good" : "bad"}>
                            {summary.backend === "wasm" ? "poseidon wasm" : "poseidon JS fallback"}
                        </Badge>
                    </h3>
                    <StatTiles items={treeTiles(summary)} />
                </div>
            )}
        </Panel>
    );
}

function treeTiles(s: TreeRunSummary): Stat[] {
    return [
        { label: "cold sync", value: formatMsInt(s.coldMs), unit: "ms" },
        { label: "restore, leaves only", value: formatMsInt(s.leavesMs), unit: "ms" },
        { label: "restore, with nodes", value: formatMsInt(s.nodesMs), unit: "ms" },
        { label: "per hash", value: s.usPerHash.toFixed(1), unit: "µs" },
        { label: "hashes", value: formatCount(s.nodes) },
    ];
}
