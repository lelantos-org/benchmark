import { useCallback, useState } from "react";

import { errMsg } from "../lib/errors";
import type { RunState } from "../lib/run-state";
import { onSdkLog } from "../lib/sdk-logs";
import { useLog, type LogHandle } from "./useLog";

export interface BenchRun {
    state: RunState;
    status: string;
    /** Fine-grained progress text; the terminal states are set by `start`. */
    setStatus: (s: string) => void;
    logHandle: LogHandle;
    /**
     * Runs `body` as one bench run: SDK records are mirrored into the panel log
     * for its duration, and anything thrown lands in the `error` state rather
     * than an unhandled rejection.
     */
    start: (body: () => Promise<void>) => Promise<void>;
}

/** State machine both panels share, so they report progress and failure alike. */
export function useBenchRun(): BenchRun {
    const [state, setState] = useState<RunState>("idle");
    const [status, setStatus] = useState("");
    const logHandle = useLog();
    const { log } = logHandle;

    const start = useCallback(async (body: () => Promise<void>) => {
        setState("running");
        const offLog = onSdkLog(log);
        try {
            await body();
            setStatus("done");
            setState("done");
        } catch (e) {
            console.error(e);
            log("ERROR: " + errMsg(e));
            setStatus("error");
            setState("error");
        } finally {
            offLog();
        }
    }, [log]);

    return { state, status, setStatus, logHandle, start };
}
