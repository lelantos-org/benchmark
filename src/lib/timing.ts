/** Runs `fn`, returning its result alongside the wall-clock milliseconds it took. */
export async function timed<T>(fn: () => Promise<T>): Promise<[result: T, ms: number]> {
    const t0 = performance.now();
    const result = await fn();
    return [result, performance.now() - t0];
}
