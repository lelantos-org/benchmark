import { useCallback, useEffect, useRef, useState } from "react";

import { errMsg } from "../lib/errors";
import { onSdkLog } from "../sdk/logs";
import { useLog, type LogHandle } from "./useLog";

/** Lifecycle of a single bench run. */
export type RunState = "idle" | "running" | "done" | "error";

/** A run's work. Long runs should honour `signal` at their natural boundaries. */
export type RunBody = (signal: AbortSignal) => Promise<void>;

export interface BenchRun {
    state: RunState;
    status: string;
    busy: boolean;
    /** Fine-grained progress text; terminal states are set by `start`. */
    setStatus: (status: string) => void;
    logHandle: LogHandle;
    /**
     * Runs `body` as one bench run. SDK records are mirrored into the panel log
     * for its duration, and anything thrown resolves to the `error` state rather
     * than an unhandled rejection. Ignored while a run is already in progress.
     */
    start: (body: RunBody) => Promise<void>;
    /** Aborts the current run's signal; a no-op when idle. */
    stop: () => void;
}

/** Run state machine shared by every panel, unifying progress and failure reporting. */
export function useBenchRun(): BenchRun {
    const [state, setState] = useState<RunState>("idle");
    const [status, setStatus] = useState("");
    const logHandle = useLog();
    const { log } = logHandle;
    // A ref, not state: two clicks inside one frame both see the stale state.
    const active = useRef<AbortController | null>(null);

    useEffect(() => () => active.current?.abort(), []);

    const start = useCallback(async (body: RunBody) => {
        if (active.current) return;
        const controller = new AbortController();
        active.current = controller;
        setState("running");
        setStatus("starting…");
        const offLog = onSdkLog(log);
        try {
            await body(controller.signal);
            setStatus(controller.signal.aborted ? "stopped" : "done");
            setState("done");
        } catch (e) {
            console.error(e);
            log("ERROR: " + errMsg(e));
            setStatus("error");
            setState("error");
        } finally {
            offLog();
            active.current = null;
        }
    }, [log]);

    const stop = useCallback(() => active.current?.abort(), []);

    return { state, status, busy: state === "running", setStatus, logHandle, start, stop };
}
