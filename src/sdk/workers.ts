// Spawners for the SDK's worker entries, the code paths this bench measures.
//
// `?worker` is required to turn a bare package specifier into a module worker:
// `new Worker(new URL("@lelantos-org/sdk/prover-worker", import.meta.url))`
// resolves relative paths only and fails at runtime here.

import ProverWorker from "@lelantos-org/sdk/prover-worker?worker";
import ScannerWorker from "@lelantos-org/sdk/scanner-worker?worker";

export const createProverWorker = (): Worker => new ProverWorker();
export const createScannerWorker = (): Worker => new ScannerWorker();
