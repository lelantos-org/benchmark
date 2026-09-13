import type { WorkerPoolScanner } from "@lelantos-org/sdk/sync";
import { useCallback, useEffect, useRef, useState } from "react";

import { createScanner, defaultPoolSize } from "../sdk/scanner";

export interface ScannerPool {
    /** Workers in the pool; pinned for the session so the heading stays truthful. */
    size: number;
    /**
     * The panel's scanner, created on first use. Retained across runs: a wallet
     * builds its pool once per session, and spawning one per run would fold
     * worker startup into the measurement.
     */
    acquire: () => WorkerPoolScanner;
}

/** One lazily-spawned SDK scanner pool per panel, disposed on unmount. */
export function useScannerPool(): ScannerPool {
    const [size] = useState(defaultPoolSize);
    const scanner = useRef<WorkerPoolScanner | null>(null);

    useEffect(() => () => {
        void scanner.current?.dispose();
        scanner.current = null;
    }, []);

    const acquire = useCallback(() => (scanner.current ??= createScanner(size)), [size]);

    return { size, acquire };
}
