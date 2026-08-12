// Display formatting. Timings are milliseconds everywhere internally; only
// these helpers decide how a number is shown.

/** `12,480` — thousands separated, no fractional part. */
export const formatCount = (n: number): string =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** A millisecond timing as a whole number, or blank if there isn't one. */
export const formatMsInt = (ms: number | undefined): string =>
    typeof ms === "number" && Number.isFinite(ms) ? formatCount(Math.round(ms)) : "";

/** Timestamp trimmed to `YYYY-MM-DD hh:mm`. */
export const formatWhen = (ts: string | undefined): string =>
    ts ? ts.replace("T", " ").slice(0, 16) : "";
