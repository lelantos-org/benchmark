import { useState } from "react";

import { SHAPES, type Shape } from "../../../shared/circuits";
import { Panel } from "../../components/Panel";
import { ProgressBar } from "../../components/ProgressBar";
import { StatTiles, type Stat } from "../../components/StatTiles";
import { StatusPill } from "../../components/StatusPill";
import type { DeviceInfo } from "../../lib/device";
import { formatMsInt } from "../../lib/format";
import { clearArtifactCache } from "../../sdk/artifact-cache";
import { DeviceChart } from "./DeviceChart";
import { ResultsTable } from "./ResultsTable";
import { useProofBench, type ShapeSummary } from "./useProofBench";

export function ProofBenchPanel({ device }: { device: DeviceInfo }) {
    const { state, status, busy, progress, summary, results, logHandle, run } = useProofBench(device);
    const [selected, setSelected] = useState<readonly Shape[]>(SHAPES);
    const [clearing, setClearing] = useState(false);

    // The SDK persists artifacts by default, so every run after the first
    // measures a warm prepare. Clearing the cache restores a cold one.
    const clearCache = async (): Promise<void> => {
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
    // checkbox order regardless of click order.
    const toggle = (shape: Shape): void => setSelected(prev =>
        SHAPES.filter(s => (s === shape) !== prev.includes(s)),
    );

    return (
        <Panel title="Groth16 proof" log={logHandle}
            subtitle={<>SDK <code>WorkerProver</code> · ark-groth16 in wasm, rayon thread pool</>}>
            <div className="controls">
                <button className="primary" onClick={() => void run(selected)} disabled={busy || selected.length === 0}>
                    {busy ? "Running…" : `Run ${selected.join(" + ") || "—"}`}
                </button>
                {/* A one-shape circuit set has nothing to choose between, and a
                    lone checkbox would only offer to disable the run button. */}
                {SHAPES.length > 1 && (
                    <div className="choices" role="group" aria-label="Circuit shapes">
                        {SHAPES.map(shape => (
                            <label key={shape} className="choice">
                                <input type="checkbox" checked={selected.includes(shape)} disabled={busy}
                                    onChange={() => toggle(shape)} />
                                {shape}
                            </label>
                        ))}
                    </div>
                )}
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

            <DeviceChart rows={results} selfUa={device.ua} />
            <ResultsTable rows={results} selfUa={device.ua} />
        </Panel>
    );
}

function shapeTiles(run: ShapeSummary): Stat[] {
    const ms = (label: string, value: number): Stat => ({ label, value: formatMsInt(value), unit: "ms" });
    return [
        ms("mean", run.mean),
        ms("median", run.median),
        ms("min", run.min),
        ms("max", run.max),
        ms(run.cachedArtifacts ? "prepare (warm)" : "prepare (cold)", run.prepareMs),
    ];
}
