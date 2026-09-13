// What the sync bench models rather than executes: the chain's shape, the FMD
// filter's selectivity, and the link to fmd-webserver.
//
// Everything here is a stand-in for something a real deployment does. Kept
// apart from the feed and the wire codec so each stand-in is visible and can be
// argued with on its own.

/** Which SDK note source a feed stands in for: `/v1/notes` or `/v1/matches`. */
export type SyncStrategyKind = "full" | "matches";

/** Run order; `full` first, so `matches` is read against it. */
export const STRATEGIES: readonly SyncStrategyKind[] = ["full", "matches"];

// ─── the link ────────────────────────────────────────────────────────────────

/** Modelled link between the wallet and fmd-webserver. */
export interface NetworkProfile {
    key: string;
    label: string;
    rttMs: number;
    /** `Infinity` for the CPU-only baseline. */
    mbps: number;
}

export const NETWORK_PROFILES: readonly NetworkProfile[] = [
    { key: "ideal", label: "ideal (no network)", rttMs: 0, mbps: Number.POSITIVE_INFINITY },
    { key: "broadband", label: "broadband · 30ms · 100 Mbit", rttMs: 30, mbps: 100 },
    { key: "mobile", label: "mobile · 150ms · 10 Mbit", rttMs: 150, mbps: 10 },
    { key: "slow", label: "slow 3G · 300ms · 1.5 Mbit", rttMs: 300, mbps: 1.5 },
];

export const DEFAULT_PROFILE: NetworkProfile = NETWORK_PROFILES[1];

export const profileByKey = (key: string): NetworkProfile =>
    NETWORK_PROFILES.find(p => p.key === key) ?? DEFAULT_PROFILE;

/** Time on the wire for `bytes` over `net`, in milliseconds. */
export function transferMs(bytes: number, net: NetworkProfile): number {
    if (!Number.isFinite(net.mbps)) return net.rttMs;
    return net.rttMs + (bytes * 8) / (net.mbps * 1000);
}

// ─── compression ─────────────────────────────────────────────────────────────

/**
 * Ratio assumed when `CompressionStream` is unavailable. Hex-encoded JSON is
 * highly redundant — every byte of ciphertext is two ASCII characters drawn
 * from sixteen — so ignoring compression would overstate the firehose's
 * bandwidth several times over and hand FMD a win it has not earned.
 */
const FALLBACK_GZIP_RATIO = 4;

/**
 * Measured gzip ratio of `sample`, uncompressed ÷ compressed.
 *
 * Measured rather than assumed because it is the single biggest lever on the
 * bandwidth half of this benchmark, and it depends on the exact wire encoding:
 * a change to the row shape should move this number without anyone having to
 * remember to re-tune a constant. fmd-webserver serves through a compressing
 * layer, so the wire sees the compressed size while the client still parses the
 * full text.
 */
export async function gzipRatio(sample: string): Promise<number> {
    if (typeof CompressionStream === "undefined") return FALLBACK_GZIP_RATIO;
    const bytes = new TextEncoder().encode(sample);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const packed = await new Response(stream).arrayBuffer();
    return packed.byteLength === 0 ? FALLBACK_GZIP_RATIO : bytes.length / packed.byteLength;
}

// ─── γ ───────────────────────────────────────────────────────────────────────

/**
 * Detection γ cannot exceed the γ senders pack into a clue: `FMD_SENDER_GAMMA`
 * in `sdk/src/fmd/fmd.ts`, which `assertDetectionGamma` enforces. Mirrored as a
 * literal rather than imported so the bench keeps building against an SDK whose
 * internal constant moves; the panel shows what was actually applied.
 */
export const MAX_DETECTION_GAMMA = 5;
export const MIN_GAMMA = 1;

/** Decoys a match set must expect to hold. Mirrors the server constant. */
export const MIN_EXPECTED_DECOYS = 64;

/**
 * γ the server would grant for a chain of `noteCount` notes.
 *
 * Ported from `max_gamma_for` in
 * `backend/crates/fmd-webserver/src/services/subscriptions.rs`: a match set has
 * to keep enough false positives to hide in, so γ is capped against how many
 * notes there are to draw decoys from. Without this the bench would happily
 * claim a 2^-5 filter on a 500-note chain, which the real server refuses.
 */
export function effectiveGamma(requested: number, noteCount: number): number {
    const budget = Math.floor(noteCount / MIN_EXPECTED_DECOYS);
    const byDecoys = budget < 2 ? MIN_GAMMA : Math.floor(Math.log2(budget));
    return Math.max(MIN_GAMMA, Math.min(requested, MAX_DETECTION_GAMMA, byDecoys));
}

// ─── the filter ──────────────────────────────────────────────────────────────

/** Murmur3 finaliser. Deterministic, so two runs page over the same rows. */
function mix32(x: number): number {
    let h = x | 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Whether row `id` survives the server's FMD filter as a false positive.
 *
 * Stands in for `test_clue` having run against a detection key: a foreign note
 * survives with probability 2^-γ, and which ones do is fixed by the key rather
 * than redrawn per request. A hash of the id reproduces both properties for
 * nothing. The cost of the real test is not modelled because it is not the
 * client's to pay — that is the indexer's, and
 * `backend/crates/common-crypto/benches/filter_batch.rs` measures it.
 */
export const isFalsePositive = (id: number, gamma: number): boolean =>
    (mix32(id) & ((1 << gamma) - 1)) === 0;

/**
 * Ids of the wallet's own notes, spread evenly across the chain.
 *
 * Spread rather than clustered because the resume cursor advances with them:
 * own notes bunched at the head would checkpoint once and then page thousands
 * of rows with nothing to persist, which is not what a wallet's history looks
 * like. Real arrivals are burstier than this in both directions, so treat the
 * checkpoint count as an average rather than a worst case.
 */
export function ownIds(own: number, total: number): number[] {
    const ids = Array.from({ length: own }, (_, k) => Math.max(1, Math.round(((k + 0.5) * total) / own)));
    return [...new Set(ids)];
}
