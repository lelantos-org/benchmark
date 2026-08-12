import { useCallback, useState, type RefCallback } from "react";

/**
 * Content width of an element, tracked live. Charts need a real pixel width to
 * lay out text: scaling an SVG viewBox instead would shrink labels to nothing
 * on a phone, which is the screen this bench is mostly read on.
 *
 * A callback ref rather than an effect: the measured node often mounts on a
 * later render than the hook (a chart that waits for data), and an effect with
 * empty deps would only ever see the ref as it was on first render — null.
 */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
    const [width, setWidth] = useState(0);

    const ref = useCallback((el: T | null) => {
        if (!el) return;
        // ResizeObserver reports the initial size on observe, so the first
        // width arrives from the subscription rather than a render-time read.
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => { observer.disconnect(); };
    }, []);

    return [ref, width];
}
