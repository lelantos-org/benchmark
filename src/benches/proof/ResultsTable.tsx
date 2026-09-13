import { type Column, DataTable, DETAIL } from "../../components/DataTable";
import { formatMsInt, formatWhen } from "../../lib/format";
import type { BenchResult } from "./api";
import { browserLabel, deviceLabel } from "./devices";

// Iters is constant, and min/max/when are also carried by the chart and the
// wide layout, so those are what the narrow layout drops.
const COLUMNS: readonly Column[] = [
    { label: "device" },
    { label: "shape" },
    { label: "cores" },
    { label: "iters", detail: true },
    { label: "mean (ms)" },
    { label: "median (ms)" },
    { label: "min (ms)", detail: true },
    { label: "max (ms)", detail: true },
    { label: "when", detail: true },
];

/** Table view of every recorded run; the accessible equivalent of the chart. */
export function ResultsTable({ rows, selfUa }: { rows: readonly BenchResult[]; selfUa: string }) {
    if (rows.length === 0) {
        return <p className="empty">No runs recorded yet. Run a bench and the table fills in.</p>;
    }

    return (
        <DataTable caption="Recorded proof runs, newest first. Times in milliseconds." columns={COLUMNS}>
            {[...rows].reverse().map((row, i) => (
                <tr key={`${row.ts ?? ""}-${i}`} className={row.ua === selfUa ? "self" : undefined}>
                    <th scope="row">
                        {deviceLabel(row)}
                        <span className="muted"> · {browserLabel(row)}</span>
                    </th>
                    <td>{row.shape ?? "—"}</td>
                    <td>{row.cores || ""}</td>
                    <td className={DETAIL}>{row.iters || ""}</td>
                    <td className="lead">{formatMsInt(row.meanMs)}</td>
                    <td>{formatMsInt(row.medianMs)}</td>
                    <td className={DETAIL}>{formatMsInt(row.minMs)}</td>
                    <td className={DETAIL}>{formatMsInt(row.maxMs)}</td>
                    <td className={`muted ${DETAIL}`}>{formatWhen(row.ts)}</td>
                </tr>
            ))}
        </DataTable>
    );
}
