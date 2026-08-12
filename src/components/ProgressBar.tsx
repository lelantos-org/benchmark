/**
 * Run progress. The track is a lighter step of the fill's own ramp so the
 * remaining work still reads as part of the same measure.
 */
export function ProgressBar({ value, label }: { value: number; label: string }) {
    const pct = Math.max(0, Math.min(1, value)) * 100;
    return (
        <div className="progress" role="progressbar" aria-label={label}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
    );
}
