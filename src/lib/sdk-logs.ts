// The SDK's workers forward their log records to the client (`forwardLogs`),
// so wiring a sink is how the bench sees rayon bring-up, artifact fetches and
// per-stage timings from inside the shipped code.

import { configureLogging, type LogRecord } from "@lelantos-org/sdk/log";

export type LogListener = (line: string) => void;

const listeners = new Set<LogListener>();
let installed = false;

function format(r: LogRecord): string {
    const fields = r.fields && Object.keys(r.fields).length ? " " + JSON.stringify(r.fields) : "";
    return `  [${r.ns}] ${r.msg}${fields}`;
}

/**
 * Route SDK records to `listener` until the returned dispose is called.
 * Listeners are independent: several can be attached at once, and every one of
 * them sees every record (the panel sink and a per-run capture, typically).
 */
export function onSdkLog(listener: LogListener): () => void {
    if (!installed) {
        configureLogging({
            level: "debug",
            namespaces: "lelantos:*",
            sink: r => { for (const l of listeners) l(format(r)); },
        });
        installed = true;
    }
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export interface SdkLogCapture {
    /** Records seen so far; keeps filling until `stop` is called. */
    lines: string[];
    stop: () => void;
}

/** Collect SDK records into an array — for attaching to a posted result. */
export function captureSdkLogs(): SdkLogCapture {
    const lines: string[] = [];
    return { lines, stop: onSdkLog(line => { lines.push(line); }) };
}
