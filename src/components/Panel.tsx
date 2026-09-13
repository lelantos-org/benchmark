import type { ReactNode } from "react";

import type { LogHandle } from "../hooks/useLog";
import { LogPanel } from "./LogPanel";

interface PanelProps {
    title: string;
    subtitle: ReactNode;
    /** The panel's run log, rendered last. */
    log: LogHandle;
    children: ReactNode;
}

/** One bench: heading, body, and the run log beneath. */
export function Panel({ title, subtitle, log, children }: PanelProps) {
    return (
        <section className="panel">
            <header className="panel-head">
                <h2>{title}</h2>
                <p className="sub">{subtitle}</p>
            </header>
            {children}
            <LogPanel lines={log.lines} onClear={log.clear} />
        </section>
    );
}
