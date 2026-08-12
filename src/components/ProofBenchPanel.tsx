import { useState } from "react";

import { useProofBench, type ShapeSummary } from "../hooks/useProofBench";
import { formatMsInt } from "../lib/format";
import { SHAPES, type Shape } from "../lib/sdk-wasm";
import { DeviceChart } from "./DeviceChart";
import { LogPanel } from "./LogPanel";
import { ProgressBar } from "./ProgressBar";
import { ResultsTable } from "./ResultsTable";
import { StatTiles, type Stat } from "./StatTiles";
import { StatusPill } from "./StatusPill";

export function ProofBenchPanel({ selfUa }: { selfUa: string }) {
    const { state, status, progress, summary, results, logHandle, run } = useProofBench();
    const [selected, setSelected] = useState<Shape[]>([...SHAPES]);
    const busy = state === "running";

    // Rebuilt from SHAPES rather than spliced, so selection order always matches
    // the checkbox order regardless of which box was clicked first.
    const toggle = (shape: Shape) => setSelected(prev =>
        SHAPES.filter(s => (s === shape ? !prev.includes(s) : prev.includes(s))),
    );

    return (
        <section className="panel">
            <header className="panel-head">
                <h2>Groth16 proof</h2>
                <p className="sub">SDK <code>WorkerProver</code> · ark-groth16 in wasm, rayon thread pool</p>
            </header>

            <div className="controls">
                <button className="primary" onClick={() => void run(selected)} disabled={busy || selected.length === 0}>
                    {busy ? "Running…" : `Run ${selected.join(" + ") || "—"}`}
                </button>
                <div className="choices" role="group" aria-label="Circuit shapes">
                    {SHAPES.map(shape => (
                        <label key={shape} className="choice">
                            <input type="checkbox" checked={selected.includes(shape)} disabled={busy}
                                onChange={() => toggle(shape)} />
                            {shape}
                        </label>
                    ))}
                </div>
                <StatusPill state={state} status={status} />
            </div>

            {busy && <ProgressBar value={progress} label={status || "running"} />}

            {summary.map(shape => (
                <div className="summary" key={shape.shape}>
                    <h3 className="summary-head">{shape.shape} <span className="muted">last run</span></h3>
                    <StatTiles items={shapeTiles(shape)} />
                </div>
            ))}

            <DeviceChart rows={results} selfUa={selfUa} />
            <ResultsTable rows={results} selfUa={selfUa} />
            <LogPanel lines={logHandle.lines} onClear={logHandle.clear} />
        </section>
    );
}

function shapeTiles(run: ShapeSummary): Stat[] {
    return [
        { label: "mean", value: formatMsInt(run.mean), unit: "ms" },
        { label: "median", value: formatMsInt(run.median), unit: "ms" },
        { label: "min", value: formatMsInt(run.min), unit: "ms" },
        { label: "max", value: formatMsInt(run.max), unit: "ms" },
        { label: "prepare", value: formatMsInt(run.prepareMs), unit: "ms" },
    ];
}
