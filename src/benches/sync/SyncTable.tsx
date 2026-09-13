import { type Column, DataTable, DETAIL } from "../../components/DataTable";
import { formatCount, formatMB, formatMsInt } from "../../lib/format";
import type { SyncStrategyKind } from "./model";
import type { SyncRunSummary } from "./run";

const COLUMNS: readonly Column[] = [
    { label: "strategy" },
    { label: "rows" },
    { label: "wire (MB)" },
    { label: "pages", detail: true },
    { label: "fetch (ms)" },
    { label: "scan (ms)" },
    { label: "persist (ms)", detail: true },
    { label: "total (ms)" },
    { label: "µs/row", detail: true },
];

const STRATEGY_LABEL: Record<SyncStrategyKind, string> = {
    full: "full firehose",
    matches: "FMD matches",
};

/** Cold sync cost per strategy; each `matches` total is also shown as a speed-up over `full`. */
export function SyncTable({ rows }: { rows: readonly SyncRunSummary[] }) {
    const full = rows.find(r => r.kind === "full");

    return (
        <DataTable caption="Cold sync cost per note-feed strategy. Times in milliseconds." columns={COLUMNS}>
            {rows.map(r => {
                const speedup = r.kind === "matches" && full && r.totalMs > 0 ? full.totalMs / r.totalMs : null;
                return (
                    <tr key={r.kind}>
                        <th scope="row">
                            {STRATEGY_LABEL[r.kind]}
                            {r.kind === "matches" && <span className="muted"> · γ {r.gamma}</span>}
                        </th>
                        <td>{formatCount(r.rows)}</td>
                        <td>{formatMB(r.wireBytes)}</td>
                        <td className={DETAIL}>{formatCount(r.pages)}</td>
                        <td>{formatMsInt(r.fetchMs)}</td>
                        <td>{formatMsInt(r.scanMs)}</td>
                        <td className={DETAIL}>{formatMsInt(r.persistMs)}</td>
                        <td className="lead">
                            {formatMsInt(r.totalMs)}
                            {speedup !== null && <span className="muted"> · {speedup.toFixed(1)}x</span>}
                        </td>
                        <td className={DETAIL}>{r.usPerRow.toFixed(0)}</td>
                    </tr>
                );
            })}
        </DataTable>
    );
}
