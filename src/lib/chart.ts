// Chart geometry and number formatting. Pure functions, free of React and the
// DOM, so tick rounding, label fitting and the bar outline can be exercised
// independently.

export interface TimeScale {
    /** `"ms"` or `"s"`, chosen once for the whole axis. */
    unit: string;
    /** Formats a value in the axis unit at label precision. */
    format: (ms: number) => string;
    /** As `format`, with trailing zeros trimmed for round ticks. */
    formatTick: (ms: number) => string;
}

/**
 * Picks one unit for the whole axis, so bars stay directly comparable. Chosen
 * from the data rather than the rounded domain: an 873 ms peak reads in ms even
 * though its axis tops out at 1000.
 */
export function timeScale(peakMs: number): TimeScale {
    const unit = peakMs < 1000 ? "ms" : "s";
    const format = (ms: number): string => (unit === "ms" ? ms.toFixed(0) : (ms / 1000).toFixed(2));
    return {
        unit,
        format,
        formatTick: ms => {
            const text = format(ms);
            return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
        },
    };
}

/** Tick values covering `max`, ending on a round number. */
export function niceTicks(max: number, count = 4): number[] {
    if (!(max > 0)) return [0, 1];
    const magnitude = Math.pow(10, Math.floor(Math.log10(max / count)));
    const normalised = max / count / magnitude;
    const step = (normalised >= 5 ? 10 : normalised >= 2 ? 5 : normalised >= 1 ? 2 : 1) * magnitude;
    // Multiplied rather than accumulated, since repeated `+=` on a fractional
    // step drifts, then rounded: these values are used as React keys, where
    // 0.6000000000000001 would not match the 0.6 tick.
    const steps = Math.ceil(max / step) + 1;
    return Array.from({ length: steps }, (_, i) => Number((i * step).toPrecision(12)));
}

/** Bar path with a rounded data end and a square baseline end. */
export function barPath(x: number, y: number, w: number, h: number, r: number): string {
    if (w <= 0) return "";
    const rr = Math.min(r, w, h / 2);
    return [
        `M${x},${y}`,
        `H${x + w - rr}`,
        `A${rr},${rr} 0 0 1 ${x + w},${y + rr}`,
        `V${y + h - rr}`,
        `A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}`,
        `H${x}`,
        "Z",
    ].join(" ");
}

/**
 * Fits `label` into `gutterPx`; SVG text has no native ellipsis. `perChar` is
 * the average glyph width at the label's font size.
 */
export function truncate(label: string, gutterPx: number, perChar = 7): string {
    const max = Math.max(6, Math.floor((gutterPx - 14) / perChar));
    return label.length <= max ? label : label.slice(0, max - 1) + "…";
}

/** Constrains a centred overlay so it does not overflow either edge. */
export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), Math.max(min, max));
