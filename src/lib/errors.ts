/** Message of an unknown throwable; workers and `fetch` can reject with non-Errors. */
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
