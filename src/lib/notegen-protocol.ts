// Protocol for the bench-owned worker that mints the synthetic note feeds used
// by the scan and sync benches. Generation is not part of either measured path;
// it runs off the main thread so the UI stays responsive while minting 10k+
// notes.

import type { WireScanInput } from "@lelantos-org/sdk/sync";

export type NotegenRequest =
    /** Flat feed for the scan bench: `n` notes, `mineFrac` of them ours. */
    | { type: "generate"; n: number; mineFrac: number }
    /**
     * Pool for the sync bench, which pages over chains far larger than it could
     * mint. The feed cycles `foreign` across every non-own row — trial-decrypt
     * costs the same whether or not a row is unique — while `mine` stays
     * distinct, because `NoteCache.addHits` dedupes by commitment and repeats
     * would silently collapse the hit count.
     */
    | { type: "generate-pool"; own: number; foreign: number };

export type NotegenResponse =
    | { type: "generated"; ivk: string; inputs: WireScanInput[]; ms: number }
    | { type: "pool"; ivk: string; mine: WireScanInput[]; foreign: WireScanInput[]; ms: number }
    | { type: "error"; message: string };
