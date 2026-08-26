import type { BenchResult } from "../lib/api";
import { formatMsInt, formatWhen } from "../lib/format";
import { browserLabel, deviceLabel } from "../lib/results";

// Every timing column is in milliseconds: a table is read down a column, so one
// unit per column keeps rows comparable.
//
// `detail` marks the columns the narrow layout drops. It is applied as a class
// on both the header and its cells, so reordering this list cannot desynchronise
// it from the stylesheet.
const COLUMNS = [
    { label: "device" },
    { label: "shape" },
    { label: "cores" },
    { label: "iters", detail: true },
    { label: "mean (ms)" },
    { label: "median (ms)" },
    { label: "min (ms)", detail: true },
    { label: "max (ms)", detail: true },
    { label: "when", detail: true },
] as const;

const DETAIL = "col-detail";

/** Table view of every recorded run; the accessible equivalent of the chart. */
export function ResultsTable({ rows, selfUa }: { rows: BenchResult[]; selfUa: string }) {
    if (rows.length === 0) {
        return <p className="empty">No runs recorded yet. Run a bench and the table fills in.</p>;
    }

    return (
        <div className="table-scroll">
            <table>
                <caption className="sr-only">Recorded proof runs, newest first. Times in milliseconds.</caption>
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
                    {rows.slice().reverse().map((row, i) => (
                        <tr key={`${row.ts ?? ""}-${i}`} className={row.ua === selfUa ? "self" : undefined}>
                            <th scope="row">
                                {deviceLabel(row)}
                                <span className="muted"> · {browserLabel(row)}</span>
                            </th>
                            <td>{row.shape ?? "2x2"}</td>
                            <td>{row.cores || ""}</td>
                            <td className={DETAIL}>{row.iters || ""}</td>
                            <td className="lead">{formatMsInt(row.meanMs)}</td>
                            <td>{formatMsInt(row.medianMs)}</td>
                            <td className={DETAIL}>{formatMsInt(row.minMs)}</td>
                            <td className={DETAIL}>{formatMsInt(row.maxMs)}</td>
                            <td className={`muted ${DETAIL}`}>{formatWhen(row.ts)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
