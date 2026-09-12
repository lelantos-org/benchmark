// Synthetic note feed for the sync bench: a `NoteSource` that reproduces what
// `/v1/notes` and `/v1/matches` hand a wallet, without a server.
//
// The two SDK sources differ only in which rows they return — the trial-decrypt
// path behind them is byte-identical (see `sdk/src/sync/scan.ts`). So the feed
// is the whole experiment: `full` serves every row on the chain, `matches`
// serves the FMD-filtered subset (own notes plus false positives at 2^-γ), and
// the difference in wall clock is what delegating detection buys.
//
// What the feed does for real: build the response text, wait out the modelled
// transfer, then parse and decode it with the SDK's codecs. What it stands in
// for: the chain, the filter, and the link — all in `sync-model.ts`.

import type { ScanInput } from "@lelantos-org/sdk/sync";
import type { ListNotesOpts, NotePage, NoteSource } from "@lelantos-org/sdk/wallet";

import { gzipRatio, isFalsePositive, type NetworkProfile, transferMs } from "./sync-model";
import { byteLength, decodePage, pageText, type RowTail, rowTail, rowText } from "./sync-wire";

/** Which SDK note source this feed stands in for. */
export type SyncStrategyKind = "full" | "matches";

/** Notes minted once and reused across rows. See {@link SyntheticNoteSource}. */
export interface NotePool {
    ivk: bigint;
    /** Distinct notes encrypted to `ivk`. Must stay distinct — `addHits` dedupes by `cm`. */
    mine: ScanInput[];
    /** Notes encrypted to a stranger. Cycled across every non-own row. */
    foreign: ScanInput[];
}

/**
 * A pool with each note's wire hex precomputed.
 *
 * Hex-encoding is the server's work: doing it inside a page would charge a
 * client benchmark for something no client does. Memoised per pool so the two
 * strategies, which page over the same notes, encode them once between them.
 */
export interface WirePool {
    ivk: bigint;
    mine: RowTail[];
    foreign: RowTail[];
}

const wirePools = new WeakMap<NotePool, WirePool>();

export function toWirePool(pool: NotePool): WirePool {
    const cached = wirePools.get(pool);
    if (cached) return cached;
    if (pool.mine.length === 0 && pool.foreign.length === 0) throw new Error("empty note pool");
    const wire: WirePool = {
        ivk: pool.ivk,
        mine: pool.mine.map(rowTail),
        foreign: pool.foreign.map(rowTail),
    };
    wirePools.set(pool, wire);
    return wire;
}

export interface SyntheticFeedOpts {
    kind: SyncStrategyKind;
    pool: WirePool;
    /** Notes on the modelled chain. */
    total: number;
    /** Row ids that are the wallet's own notes. */
    own: number[];
    /** Already clamped by `effectiveGamma`. Ignored when `kind` is `full`. */
    gamma: number;
    network: NetworkProfile;
    /**
     * Highest note id the subscription's backfill has reached. Defaults to
     * complete; lower it to model a freshly-registered subscription, whose
     * resume cursor must stay clamped (see `FmdMatchesNoteSource`).
     */
    backfilledThrough?: number;
}

/** What the feed served over a sync. Accumulated across pages. */
export interface FeedTally {
    rows: number;
    /** Response bytes as sent — after compression. */
    wireBytes: number;
    /** Response bytes as parsed. */
    rawBytes: number;
    pages: number;
    /** Modelled time on the wire, separated from the decode it precedes. */
    transferMs: number;
}

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

/**
 * `NoteSource` over a pre-minted pool, paging exactly as fmd-webserver does.
 *
 * Every page is genuine JSON text that is genuinely parsed and hex-decoded, so
 * the fetch phase carries the response-handling cost a real sync pays and which
 * scales with rows fetched — the firehose's second disadvantage after
 * bandwidth. Only the transfer itself is modelled.
 */
export class SyntheticNoteSource implements NoteSource {
    readonly tally: FeedTally = { rows: 0, wireBytes: 0, rawBytes: 0, pages: 0, transferMs: 0 };

    private readonly ownAt: Map<number, number>;
    private readonly total: number;
    private readonly backfilledThrough: number;
    /** Measured once from a real page; see `gzipRatio`. */
    private ratio: Promise<number> | null = null;

    constructor(private readonly opts: SyntheticFeedOpts) {
        this.ownAt = new Map(opts.own.map((id, i) => [id, i]));
        this.total = opts.total;
        this.backfilledThrough = opts.backfilledThrough ?? opts.total;
    }

    async listNotes(opts: ListNotesOpts = {}): Promise<NotePage> {
        const after = opts.after ?? 0;
        const limit = opts.limit ?? 1000;

        const rows: string[] = [];
        let hi = after;
        for (let id = after + 1; id <= this.total && rows.length < limit; id++) {
            if (!this.serves(id)) continue;
            rows.push(rowText(id, this.tail(id), this.opts.kind));
            hi = id;
        }
        const body = pageText(rows, this.opts.kind, this.backfilledThrough);

        const raw = byteLength(body);
        const wire = Math.round(raw / (await this.compression(body)));
        const ms = transferMs(wire, this.opts.network);
        // The `ideal` profile skips the timer entirely: `setTimeout(0)` still
        // costs a clamped few milliseconds per page, which over a thousand
        // pages would be seconds of "network" on a profile meant to have none.
        if (ms > 0) await sleep(ms);

        const page = decodePage(body, this.opts.kind);

        this.tally.rows += page.inputs.length;
        this.tally.rawBytes += raw;
        this.tally.wireBytes += wire;
        this.tally.transferMs += ms;
        this.tally.pages++;

        // `full` is append-only, so both cursors are the page's highest id.
        // `matches` is filled from both ends at once and the persistable cursor
        // must stay behind the backfill watermark — see `FmdMatchesNoteSource`.
        return {
            inputs: page.inputs,
            nextAfter: hi,
            resumeAfter: this.opts.kind === "full"
                ? hi
                : Math.min(hi, page.backfilledThroughNoteId),
        };
    }

    private serves(id: number): boolean {
        if (this.opts.kind === "full") return true;
        return this.ownAt.has(id) || isFalsePositive(id, this.opts.gamma);
    }

    private tail(id: number): RowTail {
        const { mine, foreign } = this.opts.pool;
        // Own rows index by position in the own set, so each minted own note is
        // served once and only once: a repeat would be dropped by `addHits` and
        // the run's hit assertion would fail for the bench's fault rather than
        // the wallet's.
        const at = this.ownAt.get(id);
        return at === undefined ? foreign[id % foreign.length] : mine[at % mine.length];
    }

    /**
     * Compression ratio for this feed, measured once off a real page and reused.
     *
     * Once, not per page: it is a property of the encoding rather than of a
     * particular page, and gzipping every page would put megabytes of work that
     * belongs to the server inside the client's fetch phase.
     */
    private compression(sample: string): Promise<number> {
        this.ratio ??= gzipRatio(sample);
        return this.ratio;
    }
}
