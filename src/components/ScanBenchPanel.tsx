import { useState } from "react";

import { useScanBench, type ScanSummary } from "../hooks/useScanBench";
import { formatCount, formatMsInt } from "../lib/format";
import { LogPanel } from "./LogPanel";
import { StatTiles, type Stat } from "./StatTiles";
import { StatusPill } from "./StatusPill";

export function ScanBenchPanel() {
    const { state, status, poolSize, summary, logHandle, run } = useScanBench();
    const [notes, setNotes] = useState(1000);
    const [minePercent, setMinePercent] = useState(5);
    const busy = state === "running";

    return (
        <section className="panel">
            <header className="panel-head">
                <h2>Wallet scan throughput</h2>
                <p className="sub">
                    SDK <code>WorkerPoolScanner</code> · trial-decrypt across {poolSize} workers
                </p>
            </header>

            <div className="controls">
                <button className="primary" onClick={() => void run(notes, minePercent)} disabled={busy}>
                    {busy ? "Scanning…" : "Run scan benchmark"}
                </button>
                <label className="field">
                    <span>notes</span>
                    <input className="num num-wide" type="number" min={100} max={100000} value={notes}
                        disabled={busy} onChange={e => setNotes(Number(e.target.value))} />
                </label>
                <label className="field">
                    <span>mine %</span>
                    <input className="num" type="number" min={0} max={100} value={minePercent}
                        disabled={busy} onChange={e => setMinePercent(Number(e.target.value))} />
                </label>
                <StatusPill state={state} status={status} />
            </div>

            {summary && (
                <div className="summary">
                    <h3 className="summary-head">last scan <span className="muted">{formatCount(summary.notes)} notes</span></h3>
                    <StatTiles items={scanTiles(summary)} />
                </div>
            )}

            <LogPanel lines={logHandle.lines} onClear={logHandle.clear} />
        </section>
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
