import { useCallback, useRef, useState } from "react";

/** Cap on retained lines; a debug-level scan run emits thousands. Oldest drop first. */
const MAX_LINES = 5000;

export interface LogHandle {
    lines: string[];
    /** Stable across renders; safe to pass to workers and effects. */
    log: (...parts: unknown[]) => void;
    clear: () => void;
}

export function useLog(): LogHandle {
    const [lines, setLines] = useState<string[]>([]);
    // Workers emit lines faster than React commits, so buffer through a ref to
    // avoid dropping lines via a stale closure. Mutated in place and snapshotted
    // on each append; rebuilding the array per line is quadratic over a long run.
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
