import { useState } from "react";

import { useProofBench, type ShapeSummary } from "../hooks/useProofBench";
import { clearArtifactCache } from "../lib/artifact-cache";
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
    const [clearing, setClearing] = useState(false);
    const busy = state === "running";

    // The SDK persists artifacts by default, so every run after the first on a
    // device measures a warm prepare. This is the way back to a cold one.
    const clearCache = async () => {
        setClearing(true);
        try {
            const dropped = await clearArtifactCache();
            logHandle.log(dropped
                ? "artifact cache cleared — next run measures a cold prepare"
                : "artifact cache: nothing to clear");
        } finally {
            setClearing(false);
        }
    };

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
                <button className="ghost" onClick={() => void clearCache()} disabled={busy || clearing}>
                    {clearing ? "Clearing…" : "Clear artifact cache"}
                </button>
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
        { label: run.cachedArtifacts ? "prepare (warm)" : "prepare (cold)", value: formatMsInt(run.prepareMs), unit: "ms" },
    ];
}
