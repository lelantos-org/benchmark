import { useCallback, useRef, useState } from "react";

/** Oldest lines are dropped past this; a debug-level scan run emits thousands. */
const MAX_LINES = 5000;

export interface LogHandle {
    lines: string[];
    /** Stable across renders — safe to hand to workers and effects. */
    log: (...parts: unknown[]) => void;
    clear: () => void;
}

export function useLog(): LogHandle {
    const [lines, setLines] = useState<string[]>([]);
    // Workers fire log lines faster than React commits; buffer through a ref so
    // no line is dropped by a stale closure. Mutated in place and snapshotted on
    // each append — rebuilding it per line is quadratic over a long run.
    const buffer = useRef<string[]>([]);

    const log = useCallback((...parts: unknown[]) => {
        const buf = buffer.current;
        buf.push(parts.map(String).join(" "));
        if (buf.length > MAX_LINES) buf.splice(0, buf.length - MAX_LINES);
        setLines(buf.slice());
    }, []);

    const clear = useCallback(() => {
        buffer.current = [];
        setLines([]);
    }, []);

    return { lines, log, clear };
}
