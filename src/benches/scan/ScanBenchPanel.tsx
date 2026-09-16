import { useState } from "react";

import { NumberField } from "../../components/NumberField";
import { Panel } from "../../components/Panel";
import { StatTiles, type Stat } from "../../components/StatTiles";
import { StatusPill } from "../../components/StatusPill";
import { formatCount, formatMsInt } from "../../lib/format";
import { LIMITS, type ScanSummary, useScanBench } from "./useScanBench";

export function ScanBenchPanel() {
    const { state, status, busy, poolSize, summary, logHandle, run } = useScanBench();
    const [notes, setNotes] = useState(1000);
    const [minePercent, setMinePercent] = useState(5);

    return (
        <Panel title="Wallet scan throughput" log={logHandle}
            subtitle={<>SDK <code>WorkerPoolScanner</code> · trial-decrypt across {poolSize} workers</>}>
            <div className="controls">
                <button className="primary" onClick={() => void run({ notes, minePercent })} disabled={busy}>
                    {busy ? "Scanning…" : "Run scan benchmark"}
                </button>
                <NumberField label="notes" wide {...LIMITS.notes} value={notes}
                    disabled={busy} onChange={setNotes} />
                <NumberField label="mine %" {...LIMITS.minePercent} value={minePercent}
                    disabled={busy} onChange={setMinePercent} />
                <StatusPill state={state} status={status} />
            </div>

            {summary && (
                <div className="summary">
                    <h3 className="summary-head">last scan <span className="muted">{formatCount(summary.notes)} notes</span></h3>
                    <StatTiles items={scanTiles(summary)} />
                </div>
            )}
        </Panel>
    );
}

function scanTiles(s: ScanSummary): Stat[] {
    return [
        { label: "rate", value: formatCount(s.notesPerSec), unit: "notes/s" },
        { label: "total", value: formatMsInt(s.totalMs), unit: "ms" },
        { label: "per note", value: s.perNoteMs.toFixed(3), unit: "ms" },
        { label: "hits", value: formatCount(s.hits) },
    ];
}
