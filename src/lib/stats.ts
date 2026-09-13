export interface Stats {
    mean: number;
    median: number;
    min: number;
    max: number;
}

const ascending = (xs: readonly number[]): number[] => [...xs].sort((a, b) => a - b);

/** Median of a non-empty sample. For even n this is the upper middle value. */
export function median(xs: readonly number[]): number {
    if (xs.length === 0) throw new Error("median: empty sample");
    return ascending(xs)[Math.floor(xs.length / 2)];
}

/** Summary of a timing sample. For even n the median is the upper middle value. */
export function stats(xs: readonly number[]): Stats {
    if (xs.length === 0) throw new Error("stats: empty sample");
    const sorted = ascending(xs);
    return {
        mean: xs.reduce((a, b) => a + b, 0) / xs.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
    };
}
