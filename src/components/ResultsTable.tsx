import type { BenchResult } from "../lib/api";
import { formatMsInt, formatWhen } from "../lib/format";
import { browserLabel, deviceLabel } from "../lib/results";

// Milliseconds in every timing column: a table is read down, not across, so one
// unit per column beats switching to seconds on the larger rows.
const COLUMNS = ["device", "shape", "cores", "iters", "mean (ms)", "median (ms)", "min (ms)", "max (ms)", "when"] as const;

/** Table view of every recorded run — the chart's WCAG-clean twin. */
export function ResultsTable({ rows, selfUa }: { rows: BenchResult[]; selfUa: string }) {
    if (rows.length === 0) {
        return <p className="empty">No runs recorded yet. Run a bench and the table fills in.</p>;
    }

    return (
        <div className="table-scroll">
            <table>
                <caption className="sr-only">Recorded proof runs, newest first. Times in milliseconds.</caption>
                <thead>
                    <tr>{COLUMNS.map(c => <th key={c} scope="col">{c}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.slice().reverse().map((row, i) => (
                        <tr key={`${row.ts ?? ""}-${i}`} className={row.ua === selfUa ? "self" : undefined}>
                            <th scope="row">
                                {deviceLabel(row)}
                                <span className="muted"> · {browserLabel(row)}</span>
                            </th>
                            <td>{row.shape ?? "2x2"}</td>
                            <td>{row.cores || ""}</td>
                            <td>{row.iters || ""}</td>
                            <td className="lead">{formatMsInt(row.meanMs)}</td>
                            <td>{formatMsInt(row.medianMs)}</td>
                            <td>{formatMsInt(row.minMs)}</td>
                            <td>{formatMsInt(row.maxMs)}</td>
                            <td className="muted">{formatWhen(row.ts)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
