/** Runs `fn`, returning its result alongside the wall-clock milliseconds it took. */
export async function timed<T>(fn: () => Promise<T>): Promise<[result: T, ms: number]> {
    const t0 = performance.now();
    const result = await fn();
    return [result, performance.now() - t0];
}

/** {@link timed} for work that never yields. */
export function timedSync<T>(fn: () => T): [result: T, ms: number] {
    const t0 = performance.now();
    const result = fn();
    return [result, performance.now() - t0];
}

/**
 * Resolves once the browser has painted. Awaited before work that blocks the
 * main thread, so the status announcing it is on screen while it runs.
 */
export const nextPaint = (): Promise<void> =>
    new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
