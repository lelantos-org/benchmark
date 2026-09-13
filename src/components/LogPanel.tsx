import { useEffect, useRef, useState } from "react";

import { plural } from "../lib/format";

/** Distance from the bottom within which the view still counts as pinned. */
const PIN_SLACK_PX = 40;
/** How long the copy button shows its acknowledgement. */
const COPIED_MS = 1500;

interface LogPanelProps {
    lines: readonly string[];
    onClear?: () => void;
}

export function LogPanel({ lines, onClear }: LogPanelProps) {
    const ref = useRef<HTMLDivElement>(null);
    // Auto-scroll only while pinned to the tail, so scrolling up mid-run is not
    // undone by the next log record.
    const pinned = useRef(true);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        const el = ref.current;
        if (el && pinned.current) el.scrollTop = el.scrollHeight;
    }, [lines]);

    // Cleared on unmount: the panel can disappear inside the acknowledgement
    // window, leaving the timer to set state on an unmounted component.
    useEffect(() => () => clearTimeout(copiedTimer.current), []);

    if (lines.length === 0) return null;

    const onScroll = (): void => {
        const el = ref.current;
        if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_SLACK_PX;
    };

    const copy = (): void => {
        navigator.clipboard.writeText(lines.join("\n")).then(
            () => {
                setCopied(true);
                clearTimeout(copiedTimer.current);
                copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
            },
            () => setCopied(false),
        );
    };

    return (
        <details className="log-panel" open>
            <summary>
                Log <span className="count">{plural(lines.length, "line")}</span>
                <span className="log-actions">
                    {/* Buttons live inside <summary>; without preventDefault a
                        click also toggles the disclosure. */}
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
