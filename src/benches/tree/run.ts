// One tree rebuild: the SDK's `TreeStore` filled from a synthetic commitment
// feed, then restored from what it would have persisted.
//
// Three ways a wallet ends up holding the tree are timed, in decreasing cost:
//
//   cold       `sync()` from leaf 0, then `root()` — a wallet with no stored
//              tree, or one that `reset()` after diverging from the chain.
//   leaves     `loadState` of leaves alone, then `root()` — a persistence
//              backend that does not store `TreeStoreState.nodes`.
//   nodes      `loadState` of leaves and nodes, then `root()` — the default
//              restore, which should hash nothing.
//
// `sync()` and the `root()` after it are timed separately because where the
// hashing happens is the SDK's choice and has moved between versions: either
// inside `sync`, a chunk at a time with the event loop released in between, or
// all at once in the first `root()`.

import { TreeStore, type TreeStoreState } from "@lelantos-org/sdk/advanced";
import type { Poseidon, PoseidonBackend } from "@lelantos-org/sdk/primitives";

import { timed, timedSync } from "../../lib/timing";
import { buildChunks, SyntheticCommitmentFeed } from "./feed";

/** Steps of a run, in order. `feed` is the only one not timed. */
export type TreePhase = "feed" | "cold" | "leaves" | "nodes";

export interface TreeRunOpts {
    P: Poseidon;
    /** Notes on the modelled chain. */
    leaves: number;
    /** Merkle depth; the tree holds `4^depth` leaves. */
    depth: number;
    signal?: AbortSignal;
    /**
     * Called before each phase and awaited. All but the cold sync hash in one
     * uninterrupted block, so this is the caller's only chance to paint.
     */
    onPhase?: (phase: TreePhase) => void | Promise<void>;
    onProgress?: (synced: number) => void;
}

/** What one rebuild cost. Times are milliseconds of wall clock. */
export interface TreeRunSummary {
    leaves: number;
    depth: number;
    /** `js` means the Poseidon wasm did not load and every time here is the fallback's. */
    backend: PoseidonBackend;
    chunks: number;
    /** Internal nodes of the finished tree: the hashes a rebuild cannot avoid. */
    nodes: number;
    /** Same on every device for the same `leaves` and `depth`. */
    root: bigint;
    /** `sync()` from leaf 0. */
    syncMs: number;
    /** The first `root()` after it. */
    rootMs: number;
    /** `syncMs + rootMs`: empty store to a usable root. */
    coldMs: number;
    /** Restore from leaves alone. */
    leavesMs: number;
    /** Restore from leaves and nodes. */
    nodesMs: number;
    /** From the leaves-only restore, which is hashing and nothing else. */
    usPerHash: number;
}

/** Runs one rebuild end to end; `null` if aborted during the cold sync. */
export async function runTreeBench(opts: TreeRunOpts): Promise<TreeRunSummary | null> {
    const { P, leaves, depth } = opts;
    if (leaves > 4 ** depth) {
        throw new Error(`${leaves} leaves do not fit a depth-${depth} tree (${4 ** depth})`);
    }

    await opts.onPhase?.("feed");
    const feed = new SyntheticCommitmentFeed(buildChunks(leaves));

    await opts.onPhase?.("cold");
    const store = new TreeStore(P, feed, depth);
    const [sync, syncMs] = await timed(() => store.sync({
        signal: opts.signal,
        onProgress: p => opts.onProgress?.(p.syncedCount),
    }));
    if (sync.stoppedBy === "aborted") return null;
    // A short tree hashes less; its time would read as a fast rebuild.
    if (sync.syncedCount !== leaves) {
        throw new Error(`sync stopped by ${sync.stoppedBy} at ${sync.syncedCount} of ${leaves} leaves`);
    }
    const [root, rootMs] = timedSync(() => store.root());

    /** Time for a fresh store to load `saved` and produce the synced root. */
    const restore = (saved: TreeStoreState): number => {
        const restored = new TreeStore(P, feed, depth);
        const [restoredRoot, ms] = timedSync(() => {
            restored.loadState(saved);
            return restored.root();
        });
        if (restoredRoot !== root) {
            throw new Error("a restored tree disagrees with the synced one on the root");
        }
        return ms;
    };

    const state = store.saveState();
    await opts.onPhase?.("leaves");
    const leavesMs = restore({ ...state, nodes: undefined });
    await opts.onPhase?.("nodes");
    const nodesMs = restore(state);

    const nodes = state.nodes?.length ?? 0;
    return {
        leaves,
        depth,
        backend: P.backend,
        chunks: sync.chunksFetched,
        nodes,
        root,
        syncMs,
        rootMs,
        coldMs: syncMs + rootMs,
        leavesMs,
        nodesMs,
        usPerHash: nodes === 0 ? 0 : (leavesMs * 1000) / nodes,
    };
}
