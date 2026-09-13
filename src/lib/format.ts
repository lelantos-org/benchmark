// Display formatting. Timings are milliseconds internally; these helpers are
// the only place a number's presentation is decided.

/** Thousands-separated integer, e.g. `12,480`. */
export const formatCount = (n: number): string =>
    n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** A millisecond timing as a whole number, or an empty string if absent. */
export const formatMsInt = (ms: number | undefined): string =>
    typeof ms === "number" && Number.isFinite(ms) ? formatCount(Math.round(ms)) : "";

/** A millisecond timing for a log line, e.g. `1234ms`. */
export const formatMs = (ms: number): string => `${ms.toFixed(0)}ms`;

/** Bytes as megabytes to two places, without the unit. */
export const formatMB = (bytes: number): string => (bytes / 1e6).toFixed(2);

/** ISO timestamp trimmed to `YYYY-MM-DD hh:mm`. */
export const formatWhen = (ts: string | undefined): string =>
    ts ? ts.replace("T", " ").slice(0, 16) : "";

/** `1 run`, `3 runs`. */
export const plural = (n: number, noun: string): string =>
    `${formatCount(n)} ${noun}${n === 1 ? "" : "s"}`;
