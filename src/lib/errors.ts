/** Message of anything thrown — workers and `fetch` both reject with non-Errors. */
export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
