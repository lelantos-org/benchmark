// The SDK's workers forward log records to the client (`forwardLogs`). Wiring a
// sink exposes rayon bring-up, artifact fetches and per-stage timings from
// inside the SDK.

import { configureLogging, type LogRecord } from "@lelantos-org/sdk/log";

export type LogListener = (line: string) => void;

const listeners = new Set<LogListener>();
let installed = false;

function format(r: LogRecord): string {
    const fields = r.fields && Object.keys(r.fields).length ? " " + JSON.stringify(r.fields) : "";
    return `  [${r.ns}] ${r.msg}${fields}`;
}

/**
 * Routes SDK records to `listener` until the returned dispose function is
 * called. Listeners are independent: several can be attached at once, and each
 * receives every record.
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
    /** Records seen so far; appended to until `stop` is called. */
    lines: string[];
    stop: () => void;
}

/** Collects SDK records into an array for attaching to a posted result. */
export function captureSdkLogs(): SdkLogCapture {
    const lines: string[] = [];
    return { lines, stop: onSdkLog(line => { lines.push(line); }) };
}
