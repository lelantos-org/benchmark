import type { ReactNode } from "react";

/**
 * Class for the columns the narrow layout drops. Applied to both the header and
 * its cells, so reordering a column list cannot desynchronise it from the
 * stylesheet.
 */
export const DETAIL = "col-detail";

export interface Column {
    label: string;
    /** Hidden on narrow screens. */
    detail?: boolean;
}

interface DataTableProps {
    /** Screen-reader caption; state the units here. */
    caption: string;
    columns: readonly Column[];
    /** `<tr>` rows. */
    children: ReactNode;
}

/**
 * Scrollable table with a sticky header. Every timing column is in one unit: a
 * table is read down a column, so one unit per column keeps rows comparable.
 */
export function DataTable({ caption, columns, children }: DataTableProps) {
    return (
        <div className="table-scroll">
            <table>
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr>
                        {columns.map(c => (
                            <th key={c.label} scope="col" className={c.detail ? DETAIL : undefined}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
}
