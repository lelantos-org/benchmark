import { useCallback, useState, type RefCallback } from "react";

/**
 * Tracks the content width of an element. Charts need a real pixel width to lay
 * out text; scaling an SVG viewBox instead shrinks labels on narrow screens.
 *
 * Uses a callback ref rather than an effect: the measured node often mounts on a
 * later render than the hook (a chart awaiting data), and an effect with empty
 * deps would only ever observe the first render's ref, which is null.
 */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
    const [width, setWidth] = useState(0);

    const ref = useCallback((el: T | null) => {
        if (!el) return;
        // ResizeObserver reports the initial size on observe, so the first width
        // arrives from the subscription rather than a render-time read.
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => { observer.disconnect(); };
    }, []);

    return [ref, width];
}
