import { useState } from "react";

import { NumberField } from "../../components/NumberField";
import { Panel } from "../../components/Panel";
import { StatusPill } from "../../components/StatusPill";
import { formatCount } from "../../lib/format";
import {
    DEFAULT_PROFILE,
    effectiveGamma,
    MAX_DETECTION_GAMMA,
    MIN_EXPECTED_DECOYS,
    NETWORK_PROFILES,
    profileByKey,
} from "./model";
import { SyncTable } from "./SyncTable";
import { LIMITS, useSyncBench } from "./useSyncBench";

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
    const { state, status, busy, poolSize, rows, logHandle, run, stop } = useSyncBench();
    const [total, setTotal] = useState(50_000);
    const [own, setOwn] = useState(20);
    const [gamma, setGamma] = useState(MAX_DETECTION_GAMMA);
    const [pageSize, setPageSize] = useState(1000);
    const [profileKey, setProfileKey] = useState(DEFAULT_PROFILE.key);

    const applied = effectiveGamma(gamma, total);

    return (
        <Panel title="Wallet sync: FMD vs full" log={logHandle}
            subtitle={<>SDK <code>syncWallet</code> · synthetic feed · {poolSize} scanner workers</>}>
            <div className="controls">
                <button className="primary" disabled={busy}
                    onClick={() => void run({ total, own, gamma, pageSize, network: profileByKey(profileKey) })}>
                    {busy ? "Syncing…" : "Run sync benchmark"}
                </button>
                {busy && <button onClick={stop}>Stop</button>}
                <NumberField label="chain notes" wide step={1000} {...LIMITS.total} value={total}
                    disabled={busy} onChange={setTotal} />
                <NumberField label="own" {...LIMITS.own} value={own} disabled={busy} onChange={setOwn} />
                <NumberField label="γ" {...LIMITS.gamma} value={gamma} disabled={busy} onChange={setGamma} />
                <NumberField label="page" wide {...LIMITS.pageSize} value={pageSize}
                    disabled={busy} onChange={setPageSize} />
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
                        {" "}— capped from {gamma}: a chain this small cannot supply {MIN_EXPECTED_DECOYS} decoys
                    </span>
                )}
            </p>

            {rows.length > 0 && <SyncTable rows={rows} />}
        </Panel>
    );
}
