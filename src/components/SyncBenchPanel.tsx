import { useState } from "react";

import { useSyncBench } from "../hooks/useSyncBench";
import { formatCount, formatMsInt } from "../lib/format";
import type { SyncRunSummary } from "../lib/sync-bench";
import { defaultProfile, effectiveGamma, MAX_DETECTION_GAMMA, NETWORK_PROFILES } from "../lib/sync-model";
import { LogPanel } from "./LogPanel";
import { StatusPill } from "./StatusPill";

const DETAIL = "col-detail";

const COLUMNS = [
    { label: "strategy" },
    { label: "rows" },
    { label: "wire (MB)" },
    { label: "pages", detail: true },
    { label: "fetch (ms)" },
    { label: "scan (ms)" },
    { label: "persist (ms)", detail: true },
    { label: "total (ms)" },
    { label: "µs/row", detail: true },
] as const;

const STRATEGY_LABEL = { full: "full firehose", matches: "FMD matches" } as const;

/**
 * Cold-sync cost of the two note-feed strategies.
 *
 * Both run the SDK's real `syncWallet` over the same warmed scanner pool; the
 * only difference is the feed behind it, which is the only thing that differs
 * in production either. The chain and the link are modelled — see the README —
 * so these are this device's numbers against a stated network, not a
 * measurement of any deployed server.
 */
export function SyncBenchPanel() {
    const { state, status, poolSize, rows, logHandle, run, stop } = useSyncBench();
    const [total, setTotal] = useState(50_000);
    const [own, setOwn] = useState(20);
    const [gamma, setGamma] = useState(MAX_DETECTION_GAMMA);
    const [pageSize, setPageSize] = useState(1000);
    const [profileKey, setProfileKey] = useState(defaultProfile().key);
    const busy = state === "running";

    const network = NETWORK_PROFILES.find(p => p.key === profileKey) ?? defaultProfile();
    const applied = effectiveGamma(gamma, total);

    return (
        <section className="panel">
            <header className="panel-head">
                <h2>Wallet sync: FMD vs full</h2>
                <p className="sub">
                    SDK <code>syncWallet</code> · synthetic feed · {poolSize} scanner workers
                </p>
            </header>

            <div className="controls">
                <button
                    className="primary"
                    onClick={() => void run({ total, own, gamma, pageSize, network })}
                    disabled={busy}
                >
                    {busy ? "Syncing…" : "Run sync benchmark"}
                </button>
                {busy && <button onClick={stop}>Stop</button>}
                <label className="field">
                    <span>chain notes</span>
                    <input className="num num-wide" type="number" min={100} max={5_000_000} step={1000}
                        value={total} disabled={busy} onChange={e => setTotal(Number(e.target.value))} />
                </label>
                <label className="field">
                    <span>own</span>
                    <input className="num" type="number" min={1} max={1000} value={own}
                        disabled={busy} onChange={e => setOwn(Number(e.target.value))} />
                </label>
                <label className="field">
                    <span>γ</span>
                    <input className="num" type="number" min={1} max={MAX_DETECTION_GAMMA} value={gamma}
                        disabled={busy} onChange={e => setGamma(Number(e.target.value))} />
                </label>
                <label className="field">
                    <span>page</span>
                    <input className="num num-wide" type="number" min={1} max={1000} value={pageSize}
                        disabled={busy} onChange={e => setPageSize(Number(e.target.value))} />
                </label>
                <label className="field">
                    <span>network</span>
                    <select value={profileKey} disabled={busy} onChange={e => setProfileKey(e.target.value)}>
                        {NETWORK_PROFILES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                </label>
                <StatusPill state={state} status={status} />
            </div>

            <p className="sub">
                γ {applied} · 1 false positive in {formatCount(2 ** applied)}
                {applied < gamma && (
                    <span className="muted">
                        {" "}— capped from {gamma}: a chain this small cannot supply 64 decoys
                    </span>
                )}
            </p>

            {rows.length > 0 && <SyncTable rows={rows} />}

            <LogPanel lines={logHandle.lines} onClear={logHandle.clear} />
        </section>
    );
}

function SyncTable({ rows }: { rows: SyncRunSummary[] }) {
    /** The row every `matches` result is read against. */
    const full = rows.find(r => r.kind === "full");

    return (
        <div className="table-scroll">
            <table>
                <caption className="sr-only">
                    Cold sync cost per note-feed strategy. Times in milliseconds.
                </caption>
                <thead>
                    <tr>
                        {COLUMNS.map(c => (
                            <th key={c.label} scope="col" className={"detail" in c ? DETAIL : undefined}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const base = r.kind === "matches" ? full : undefined;
                        return (
                            <tr key={r.kind}>
                                <th scope="row">
                                    {STRATEGY_LABEL[r.kind]}
                                    {r.kind === "matches" && <span className="muted"> · γ {r.gamma}</span>}
                                </th>
                                <td>{formatCount(r.rows)}</td>
                                <td>{(r.wireBytes / 1e6).toFixed(2)}</td>
                                <td className={DETAIL}>{formatCount(r.pages)}</td>
                                <td>{formatMsInt(r.fetchMs)}</td>
                                <td>{formatMsInt(r.scanMs)}</td>
                                <td className={DETAIL}>{formatMsInt(r.persistMs)}</td>
                                <td className="lead">
                                    {formatMsInt(r.totalMs)}
                                    {base && r.totalMs > 0 && (
                                        <span className="muted"> · {(base.totalMs / r.totalMs).toFixed(1)}x</span>
                                    )}
                                </td>
                                <td className={DETAIL}>{r.usPerRow.toFixed(0)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
