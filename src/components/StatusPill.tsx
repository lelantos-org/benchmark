import type { RunState } from "../lib/run-state";

export function StatusPill({ state, status }: { state: RunState; status: string }) {
    if (!status) return null;
    const cls = state === "error" ? "err" : state === "done" ? "ok" : "";
    return <span className={`status ${cls}`}>{status}</span>;
}
