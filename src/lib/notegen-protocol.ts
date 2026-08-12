// Bench-only worker that mints the synthetic note feed the scan bench measures
// against. Generation is not the code path under test — it lives off the main
// thread purely so the UI stays responsive while minting 10k+ notes.

import type { WireScanInput } from "@lelantos-org/sdk/sync";

export type NotegenRequest = { type: "generate"; n: number; mineFrac: number };

export type NotegenResponse =
    | { type: "generated"; ivk: string; inputs: WireScanInput[]; ms: number }
    | { type: "error"; message: string };
