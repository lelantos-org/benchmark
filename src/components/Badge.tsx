import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "good" | "bad";

/**
 * Small capability chip. Tone is never the only signal — the text says what the
 * state is, so the colour is reinforcement rather than the message.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
    return (
        <span className={`badge badge-${tone}`}>
            {tone !== "neutral" && <span className="dot" aria-hidden="true" />}
            {children}
        </span>
    );
}
