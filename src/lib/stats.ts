export interface Stats {
    mean: number;
    median: number;
    min: number;
    max: number;
}

function ascending(xs: readonly number[], fn: string): number[] {
    if (xs.length === 0) throw new Error(`${fn}: empty sample`);
    return [...xs].sort((a, b) => a - b);
}

/** Upper middle value of a sorted, non-empty sample. */
const upperMiddle = (sorted: readonly number[]): number => sorted[Math.floor(sorted.length / 2)];

/** Median of a non-empty sample. For even n this is the upper middle value. */
export const median = (xs: readonly number[]): number => upperMiddle(ascending(xs, "median"));

/** Summary of a timing sample. For even n the median is the upper middle value. */
export function stats(xs: readonly number[]): Stats {
    const sorted = ascending(xs, "stats");
    return {
        mean: xs.reduce((a, b) => a + b, 0) / xs.length,
        median: upperMiddle(sorted),
        min: sorted[0],
        max: sorted[sorted.length - 1],
    };
}
