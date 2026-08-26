import { useCallback, useEffect, useRef, useState } from "react";

/** Distance from the bottom within which the view still counts as pinned. */
const PIN_SLACK_PX = 40;
/** How long the copy button shows its acknowledgement. */
const COPIED_MS = 1500;

export function LogPanel({ lines, onClear }: { lines: string[]; onClear?: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    // Auto-scroll only while pinned to the tail, so scrolling up mid-run is not
    // undone by the next log record.
    const pinned = useRef(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (el && pinned.current) el.scrollTop = el.scrollHeight;
    }, [lines]);

    const onScroll = useCallback(() => {
        const el = ref.current;
        if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_SLACK_PX;
    }, []);

    const empty = lines.length === 0;

    // Cleared on unmount: the panel can disappear inside the acknowledgement
    // window, leaving the timer to set state on an unmounted component.
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

    const copy = useCallback(() => {
        void navigator.clipboard.writeText(lines.join("\n")).then(
            () => {
                setCopied(true);
                copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
            },
            () => { setCopied(false); },
        );
    }, [lines]);

    if (empty) return null;

    return (
        <details className="log-panel" open>
            <summary>
                Log <span className="count">{lines.length} line{lines.length === 1 ? "" : "s"}</span>
                <span className="log-actions">
                    <button type="button" className="ghost" onClick={e => { e.preventDefault(); copy(); }}>
                        {copied ? "copied" : "copy"}
                    </button>
                    {onClear && (
                        <button type="button" className="ghost" onClick={e => { e.preventDefault(); onClear(); }}>
                            clear
                        </button>
                    )}
                </span>
            </summary>
            <div className="log" ref={ref} onScroll={onScroll}>{lines.join("\n")}</div>
        </details>
    );
}
