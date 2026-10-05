// Protocol for the bench-owned workers that mint the synthetic note feeds used
// by the scan and sync benches. Generation is not part of either measured path;
// it runs off the main thread so the UI stays responsive while minting 10k+
// notes, and is split across workers because each note is independent.

import type { WireScanInput } from "@lelantos-org/sdk/internal";

/**
 * One shard of a feed: notes `[from, to)`, of which index `i` is ours when
 * `i < mineBelow`. See `Minter.mint`.
 */
export interface NotegenRequest {
    from: number;
    to: number;
    mineBelow: number;
}

export type NotegenResponse =
    | { type: "minted"; ivk: string; inputs: WireScanInput[] }
    | { type: "error"; message: string };
