// One sync-strategy run: the SDK's real `syncWallet` over a synthetic feed.
//
// Nothing here reimplements sync. `syncWallet` takes every dependency it uses
// as a parameter, so the bench swaps in a feed that needs no server and a store
// that needs no disk, and the paging loop, cursor handling, checkpointing and
// trial-decrypt are the shipped code paths.
//
// What is measured is the cold sync: a wallet restored from its key with an
// empty store, paging the whole chain. That is the case FMD is argued about,
// and the one that grows with the chain rather than with time since the last
// poll.

import type { Jubjub } from "@lelantos-org/sdk/crypto";
import type { Scanner } from "@lelantos-org/sdk/sync";
import {
    InMemoryNoteStore,
    NoteCache,
    type SyncProgress,
    type SyncResult,
    syncWallet,
} from "@lelantos-org/sdk/wallet";

import {
    type NotePool,
    SyntheticNoteSource,
    type SyncStrategyKind,
    toWirePool,
    type WirePool,
} from "./sync-feed";
import { effectiveGamma, type NetworkProfile, ownIds } from "./sync-model";

/**
 * The `Jubjub` `SyncDeps` names but `syncWallet` never touches: decryption
 * happens inside the scanner's workers, which build their own.
 *
 * A tripwire rather than a real instance. Building one would mean loading the
 * jubjub wasm on the main thread — a browser-only dependency, and pure cost for
 * a value nothing reads — while a bare cast would silently hand sync a broken
 * object if it ever did start using it. Any access throws instead, naming what
 * happened.
 */
const unusedJubjub = (): Jubjub =>
    new Proxy({} as Jubjub, {
        get(_t, prop) {
            throw new Error(
                `sync reached Jubjub.${String(prop)} on the main thread; the bench assumes ` +
                "all curve work happens in the scanner's workers",
            );
        },
    });

/** Notes pushed through the scanner before timing starts. See {@link warmUp}. */
const WARMUP_NOTES = 256;

/**
 * Spins up the worker pool and its wasm before anything is measured.
 *
 * The first `scan` of a session pays for spawning every worker and
 * instantiating a jubjub module in each. That is a fixed cost a real wallet
 * also pays, but it is paid once — charging it to whichever strategy happens to
 * run first would have made the comparison an artefact of the button's order.
 */
export async function warmUp(scanner: Scanner, pool: NotePool): Promise<void> {
    const sample = pool.foreign.slice(0, WARMUP_NOTES).map(n => ({
        ...n,
        // The pool is reused all session and `WorkerPoolScanner` transfers the
        // buffers it is handed, detaching them. Clone, or the pool is spent.
        ciphertext: n.ciphertext.slice(),
        epk: n.epk.slice(),
    }));
    await scanner.scan(pool.ivk, sample);
}

export interface SyncRunOpts {
    kind: SyncStrategyKind;
    pool: NotePool;
    /** Notes on the modelled chain. */
    total: number;
    /** How many of them are the wallet's. */
    own: number;
    /** Requested γ; clamped by `effectiveGamma` before use. */
    gamma: number;
    /** Page size handed to `syncWallet`. The SDK default is 1000. */
    pageSize: number;
    network: NetworkProfile;
    signal?: AbortSignal;
    onPage?: (fetched: number) => void;
}

/** What one strategy's cold sync cost. Times are milliseconds of wall clock. */
export interface SyncRunSummary {
    kind: SyncStrategyKind;
    /** γ actually applied — the server's decoy floor can lower it. */
    gamma: number;
    rows: number;
    pages: number;
    /** Bytes as sent, after compression. What the link carries. */
    wireBytes: number;
    /** Bytes as parsed. What the client's decoder walks. */
    rawBytes: number;
    /** Of `fetchMs`, the part that was modelled rather than executed. */
    transferMs: number;
    /** Transfer plus the parse and hex-decode of every row. */
    fetchMs: number;
    scanMs: number;
    persistMs: number;
    totalMs: number;
    hits: number;
    /** Cost per row served, the figure that scales to other chain sizes. */
    usPerRow: number;
    stoppedBy: SyncResult["stoppedBy"];
}

/** Phases `syncWallet` reports, in the order it reports them. */
type Phase = SyncProgress["phase"];

/**
 * Splits wall clock by `syncWallet`'s own progress callbacks.
 *
 * The callback fires immediately before each phase's work, so the time charged
 * to a phase is everything between its callback and the next one. `persisting`
 * therefore also carries the per-page cursor bookkeeping and any checkpoint
 * save that follows it, which is where that work belongs.
 */
class PhaseTimer {
    readonly ms: Record<Phase, number> = { fetching: 0, scanning: 0, persisting: 0, done: 0 };
    private phase: Phase | null = null;
    private at = 0;

    enter(phase: Phase): void {
        const now = performance.now();
        if (this.phase !== null) this.ms[this.phase] += now - this.at;
        this.phase = phase;
        this.at = now;
    }

    /** Charges the trailing segment. Call once the sync has returned. */
    close(): void {
        this.enter("done");
        this.phase = null;
    }
}

/** Runs one strategy's cold sync end to end. */
export async function runSync(opts: SyncRunOpts, scanner: Scanner): Promise<SyncRunSummary> {
    const gamma = effectiveGamma(opts.gamma, opts.total);
    const own = ownIds(opts.own, opts.total);
    // Every own row maps to a distinct minted note; sharing one would collapse
    // under `addHits`'s dedupe and be read as a missed note.
    if (opts.pool.mine.length < own.length) {
        throw new Error(`pool holds ${opts.pool.mine.length} own notes, run needs ${own.length}`);
    }
    // A page must not contain the same foreign note twice: identical rows are
    // exactly what a compressor is best at, so a pool smaller than a page would
    // report a compression ratio no real feed could achieve.
    if (opts.pool.foreign.length < opts.pageSize) {
        throw new Error(
            `pool holds ${opts.pool.foreign.length} foreign notes, smaller than a ${opts.pageSize}-row page`,
        );
    }

    const wire: WirePool = toWirePool(opts.pool);
    const source = new SyntheticNoteSource({
        kind: opts.kind,
        pool: wire,
        total: opts.total,
        own,
        gamma,
        network: opts.network,
    });

    const J = unusedJubjub();
    const sink = await NoteCache.open(new InMemoryNoteStore());

    const timer = new PhaseTimer();
    const t0 = performance.now();
    const result = await syncWallet(
        { J, ivk: opts.pool.ivk, source, sink, scanner },
        {
            limit: opts.pageSize,
            ...(opts.signal ? { signal: opts.signal } : {}),
            onProgress: p => {
                timer.enter(p.phase);
                if (p.phase === "fetching") opts.onPage?.(p.fetched);
            },
        },
    );
    const totalMs = performance.now() - t0;
    timer.close();
    const { tally } = source;

    // A sync that stopped early or missed notes produces a plausible-looking
    // time for the wrong amount of work, which is worse than no number at all.
    // Aborts are the caller's doing and reported rather than thrown.
    if (result.stoppedBy !== "exhausted" && result.stoppedBy !== "aborted") {
        throw new Error(`${opts.kind} sync stopped by ${result.stoppedBy}`);
    }
    if (result.stoppedBy === "exhausted" && result.added !== own.length) {
        throw new Error(`${opts.kind} sync found ${result.added} of ${own.length} own notes`);
    }

    return {
        kind: opts.kind,
        gamma,
        rows: tally.rows,
        pages: tally.pages,
        wireBytes: tally.wireBytes,
        rawBytes: tally.rawBytes,
        transferMs: tally.transferMs,
        fetchMs: timer.ms.fetching,
        scanMs: timer.ms.scanning,
        persistMs: timer.ms.persisting,
        totalMs,
        hits: result.hits,
        usPerRow: tally.rows === 0 ? 0 : (totalMs * 1000) / tally.rows,
        stoppedBy: result.stoppedBy,
    };
}
