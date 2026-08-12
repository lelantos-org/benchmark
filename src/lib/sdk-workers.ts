// Spawners for the SDK's own worker entries — the code paths this bench exists
// to measure.
//
// `?worker` is how Vite turns a *bare package specifier* into a module worker:
// `new Worker(new URL("@lelantos-org/sdk/prover-worker", import.meta.url))` —
// the form the SDK's docs use — only resolves relative paths, so it would break
// at runtime here.
//
// It also makes each entry a Rollup entry point, which is what kept the bench
// working before SDK 0.8.1, when the package declared a blanket
// `sideEffects: false` and side-effect imports of these entries tree-shook to
// 0-byte chunks in production. 0.8.1 allowlists both entries, so that hazard is
// gone; `?worker` stays for the resolution reason above.

import ProverWorker from "@lelantos-org/sdk/prover-worker?worker";
import ScannerWorker from "@lelantos-org/sdk/scanner-worker?worker";

export const createProverWorker = (): Worker => new ProverWorker();
export const createScannerWorker = (): Worker => new ScannerWorker();
