// Mints synthetic notes for the scan and sync benches. Some notes are encrypted
// to our ivk and the rest to a stranger's, so trial-decrypt sees the same mix of
// hits and misses as a real wallet sync.
//
// Note `i` is a function of `i` alone, so any index range can be minted on its
// own and shards concatenate into the feed a single pass would have produced.

import type { ScanInput } from "@lelantos-org/sdk/advanced";
import { encodeInput, encodeNotePayload, type WireScanInput } from "@lelantos-org/sdk/internal";
import {
    buildDiversifiedKeys,
    buildNoteCommitment,
    buildSpendingKey,
    clueBitsToPrefix,
    defaultDiversifier,
    deriveOutgoingKey,
    type DiversifiedKeys,
    encodeMemo,
    encryptNote,
    expandSeed,
    FMD_DEFAULT_GAMMA,
    type Jubjub,
    type Poseidon,
    toLeBytes,
    withClueBitsPrefix,
} from "@lelantos-org/sdk/primitives";
import { sealOutput } from "@lelantos-org/sdk/protocol";

/**
 * Fixed seeds. The feed only needs to be deterministic and to split into
 * decryptable and non-decryptable notes; none of this is security-sensitive.
 */
const MY_NSK = 1234n;
const STRANGER_NSK = 9999n;
/** Every note has the same sender; its outgoing key seeds each output's randomness. */
const SENDER_NSK = 4321n;
/** Anvil, as everywhere else in the bench. */
const CHAIN_ID = 31337n;

const NOTE_ASSET = 1n;
/** No note carries a memo: the field is all zero. */
const NO_MEMO = encodeMemo(undefined);
// Keeps rho distinct per index; the value is arbitrary.
const RHO_OFFSET = 1000n;

const CLUE_BITS_MASK = (1n << BigInt(FMD_DEFAULT_GAMMA)) - 1n;
const CLUE_BITS_BYTES = Math.ceil(FMD_DEFAULT_GAMMA / 8);

export interface Minter {
    /** Viewing key the notes below `mineBelow` decrypt under. */
    ivk: bigint;
    /**
     * Notes `[from, to)`. Index `i` is encrypted to `ivk` when `i < mineBelow`
     * and to a stranger otherwise. Every payload field derives from the index,
     * so commitments are distinct across the whole feed.
     */
    mint: (from: number, to: number, mineBelow: number) => WireScanInput[];
}

/** What sealing a note yields; the rest of a `ScanInput` is its position on chain. */
type Sealed = Pick<ScanInput, "ciphertext" | "epk" | "clueR" | "cm">;

/** An account's `ivk` and the keys of its default address. */
function account(J: Jubjub, P: Poseidon, nsk: bigint): { ivk: bigint; keys: DiversifiedKeys } {
    const { ivk } = buildSpendingKey(P, nsk);
    return { ivk, keys: buildDiversifiedKeys(P, J, ivk, defaultDiversifier(ivk)) };
}

export function createMinter(J: Jubjub, P: Poseidon): Minter {
    const outgoingKey = deriveOutgoingKey(SENDER_NSK);
    const me = account(J, P, MY_NSK);
    const stranger = account(J, P, STRANGER_NSK).keys;

    // Sealed as a spend seals an output, so `rcm`, `esk` and the clue are the
    // ones the plaintext's seed expands to: the scanner recomputes all three
    // and rejects a note that differs in any.
    const own = (rho: bigint, value: bigint): Sealed => {
        const { note, aux: { aux } } = sealOutput(J, P, {
            outgoingKey,
            chainId: CHAIN_ID,
            rho,
            asset: NOTE_ASSET,
            value,
            recipient: me.keys,
            nullifiers: [],
        });
        return {
            ciphertext: aux.ciphertext,
            epk: J.packPoint(aux.ephPub),
            clueR: J.packPoint(aux.clueR),
            cm: buildNoteCommitment(P, note),
        };
    };

    // The scanner drops a stranger's note when its AEAD tag fails, before it
    // reads the commitment or the clue. Only the encryption is real: the clue
    // is seed-derived bytes of the published width, which skips the seven
    // scalar multiplications a clue costs and leaves the scan and the wire row
    // unchanged. Such a note would not pass the scanner's checks under the
    // stranger's own key.
    const foreign = (rho: bigint, value: bigint): Sealed => {
        const rseed = toLeBytes(rho);
        const { rcm, esk, fmdR } = expandSeed(rseed, rho);
        const enc = encryptNote({
            J,
            gD: stranger.g_d,
            recipientPkD: stranger.pk_d,
            esk,
            plaintext: encodeNotePayload({
                asset: NOTE_ASSET,
                value,
                rho,
                rseed,
                d: stranger.d,
                memo: NO_MEMO,
            }),
        });
        const clueBits = toLeBytes(rcm & CLUE_BITS_MASK, CLUE_BITS_BYTES);
        return {
            ciphertext: withClueBitsPrefix(clueBitsToPrefix(clueBits, FMD_DEFAULT_GAMMA), enc.ciphertext),
            epk: enc.epk,
            clueR: toLeBytes(fmdR),
            cm: buildNoteCommitment(P, { asset: NOTE_ASSET, value, pk: stranger.pk, rho, rcm }),
        };
    };

    const note = (i: number, mine: boolean): WireScanInput => {
        const n = BigInt(i);
        return encodeInput({
            ...(mine ? own : foreign)(n + RHO_OFFSET, n + 1n),
            leafIndex: i,
            // Stored on a hit as `firstSeenBlock`. One notional block per note
            // keeps it monotonic, as on a real chain.
            blockNumber: i,
        });
    };

    return {
        ivk: me.ivk,
        mint: (from, to, mineBelow) =>
            Array.from({ length: to - from }, (_, k) => note(from + k, from + k < mineBelow)),
    };
}
