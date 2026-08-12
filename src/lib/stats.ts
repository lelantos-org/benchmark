export interface Stats { mean: number; median: number; min: number; max: number }

/** Summary of a timing sample. Median is the upper of the two middles on even n. */
export function stats(xs: number[]): Stats {
    if (xs.length === 0) throw new Error("stats: empty sample");
    const sorted = [...xs].sort((a, b) => a - b);
    return {
        mean:   xs.reduce((a, b) => a + b, 0) / xs.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min:    sorted[0],
        max:    sorted[sorted.length - 1],
    };
}
