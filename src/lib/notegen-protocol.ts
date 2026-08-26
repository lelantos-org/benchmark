// Protocol for the bench-owned worker that mints the synthetic note feed used
// by the scan bench. Generation is not part of the measured path; it runs off
// the main thread so the UI stays responsive while minting 10k+ notes.

import type { WireScanInput } from "@lelantos-org/sdk/sync";

export type NotegenRequest = { type: "generate"; n: number; mineFrac: number };

export type NotegenResponse =
    | { type: "generated"; ivk: string; inputs: WireScanInput[]; ms: number }
    | { type: "error"; message: string };
