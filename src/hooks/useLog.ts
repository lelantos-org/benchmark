import { useCallback, useEffect, useRef, useState } from "react";

/** Cap on retained lines; a debug-level scan run emits thousands. Oldest drop first. */
const MAX_LINES = 5000;

export interface LogHandle {
    lines: readonly string[];
    /** Stable across renders; safe to pass to workers and effects. */
    log: (...parts: unknown[]) => void;
    clear: () => void;
}

export function useLog(): LogHandle {
    const [lines, setLines] = useState<readonly string[]>([]);
    // Workers emit lines far faster than React commits. Appends go to a buffer
    // and are published at most once per frame: snapshotting per line would copy
    // up to MAX_LINES entries for every record, quadratic over a long run.
    const buffer = useRef<string[]>([]);
    const frame = useRef<number | null>(null);

    const flush = useCallback(() => {
        frame.current = null;
        setLines(buffer.current.slice());
    }, []);

    const log = useCallback((...parts: unknown[]) => {
        const buf = buffer.current;
        buf.push(parts.map(String).join(" "));
        if (buf.length > MAX_LINES) buf.splice(0, buf.length - MAX_LINES);
        frame.current ??= requestAnimationFrame(flush);
    }, [flush]);

    const clear = useCallback(() => {
        buffer.current = [];
        setLines([]);
    }, []);

    useEffect(() => () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
    }, []);

    return { lines, log, clear };
}
