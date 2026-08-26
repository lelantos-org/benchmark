export interface Stat {
    label: string;
    value: string;
    /** Rendered smaller alongside the value. */
    unit?: string;
}

/** KPI row for the headline numbers of a finished run. */
export function StatTiles({ items }: { items: Stat[] }) {
    if (items.length === 0) return null;
    return (
        <dl className="tiles">
            {items.map(item => (
                <div className="tile" key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>
                        {item.value}
                        {item.unit && <span className="unit">{item.unit}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
