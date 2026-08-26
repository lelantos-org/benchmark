// Display formatting. Timings are milliseconds internally; these helpers are
// the only place a number's presentation is decided.

/** Thousands-separated integer, e.g. `12,480`. */
export const formatCount = (n: number): string =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** A millisecond timing as a whole number, or an empty string if absent. */
export const formatMsInt = (ms: number | undefined): string =>
    typeof ms === "number" && Number.isFinite(ms) ? formatCount(Math.round(ms)) : "";

/** ISO timestamp trimmed to `YYYY-MM-DD hh:mm`. */
export const formatWhen = (ts: string | undefined): string =>
    ts ? ts.replace("T", " ").slice(0, 16) : "";
