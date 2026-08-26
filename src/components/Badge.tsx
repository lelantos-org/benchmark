import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "bad";

/**
 * Capability chip. Tone is never the only signal: the text states the condition,
 * and colour reinforces it.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
    return (
        <span className={`badge badge-${tone}`}>
            {tone !== "neutral" && <span className="dot" aria-hidden="true" />}
            {children}
        </span>
    );
}
