import type { RunState } from "../hooks/useBenchRun";

const TONE: Partial<Record<RunState, string>> = { error: "err", done: "ok" };

export function StatusPill({ state, status }: { state: RunState; status: string }) {
    if (!status) return null;
    return <span className={`status ${TONE[state] ?? ""}`} role="status">{status}</span>;
}
