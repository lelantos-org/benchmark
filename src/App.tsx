import { useState } from "react";

import { ProofBenchPanel } from "./benches/proof/ProofBenchPanel";
import { ScanBenchPanel } from "./benches/scan/ScanBenchPanel";
import { SyncBenchPanel } from "./benches/sync/SyncBenchPanel";
import { Badge } from "./components/Badge";
import { deviceInfo } from "./lib/device";

export function App() {
    // Read once: the values describe the machine, not the render, and the proof
    // panel needs a stable UA string to mark this device's own rows.
    const [device] = useState(deviceInfo);
    const isolated = window.crossOriginIsolated;

    return (
        <div className="page">
            <header className="masthead">
                <h1>Lelantos LAN bench</h1>
                <div className="badges">
                    <Badge>{device.cores || "?"} cores</Badge>
                    {device.memGB !== null && <Badge>{device.memGB} GB</Badge>}
                    <Badge tone={isolated ? "good" : "bad"}>
                        {isolated ? "cross-origin isolated" : "not isolated — single-thread"}
                    </Badge>
                </div>
                {!isolated && (
                    <p className="warn">
                        <code>SharedArrayBuffer</code> is unavailable, so the prover runs on one thread.
                        Open this page over HTTPS (or on <code>localhost</code>) for representative numbers.
                    </p>
                )}
            </header>

            <main>
                <ProofBenchPanel device={device} />
                <ScanBenchPanel />
                <SyncBenchPanel />
            </main>
        </div>
    );
}
