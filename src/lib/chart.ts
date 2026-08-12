// Chart geometry and number formatting — pure functions, no React and no DOM,
// so the fiddly parts (tick rounding, label fitting, the bar outline) can be
// reasoned about and exercised on their own.

export interface TimeScale {
    /** `"ms"` or `"s"`, chosen once for the whole axis. */
    unit: string;
    /** A value in the axis unit, at label precision. */
    format: (ms: number) => string;
    /** Same, with the trailing zeros a round tick doesn't need. */
    formatTick: (ms: number) => string;
}

/**
 * One unit across the whole axis and every label: a chart is read across, so
 * switching ms↔s per value would make bars incomparable at a glance. Chosen
 * from the data rather than the rounded domain — an 873 ms peak reads in ms even
 * though its axis tops out at a round 1000.
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

/** Clean tick values covering `max`, ending on a round number. */
export function niceTicks(max: number, count = 4): number[] {
    if (!(max > 0)) return [0, 1];
    const magnitude = Math.pow(10, Math.floor(Math.log10(max / count)));
    const normalised = max / count / magnitude;
    const step = (normalised >= 5 ? 10 : normalised >= 2 ? 5 : normalised >= 1 ? 2 : 1) * magnitude;
    // Multiplied rather than accumulated (repeated += on a fractional step
    // drifts), then rounded: these values are used as React keys, so a
    // 0.6000000000000001 would be a nonsense identity for the 0.6 tick.
    const steps = Math.ceil(max / step) + 1;
    return Array.from({ length: steps }, (_, i) => Number((i * step).toPrecision(12)));
}

/** Bar with a rounded data-end, square where it meets the baseline. */
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
 * Fits `label` into `gutterPx`, since SVG text has no ellipsis of its own.
 * `perChar` is the average glyph width at the label's font size.
 */
export function truncate(label: string, gutterPx: number, perChar = 7): string {
    const max = Math.max(6, Math.floor((gutterPx - 14) / perChar));
    return label.length <= max ? label : label.slice(0, max - 1) + "…";
}

/** Keeps a centred overlay (a tooltip) from hanging off either edge. */
export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), Math.max(min, max));
