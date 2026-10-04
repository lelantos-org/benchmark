// Mints synthetic notes for the scan and sync benches. Some notes are encrypted
// to our ivk and the rest to a stranger's, so trial-decrypt sees the same mix of
// hits and misses as a real wallet sync.

import { encodeInput, encodeNotePayload, type WireScanInput } from "@lelantos-org/sdk/internal";
import {
    BABYJUB_SUBGROUP_ORDER,
    buildNoteCommitment,
    buildSpendingKey,
    configureJubjubWasm,
    encryptNote,
    Jubjub,
    Poseidon,
    type SpendingKey,
    withClueBitsPrefix,
} from "@lelantos-org/sdk/primitives";

import { errMsg } from "../lib/errors";
import { JUBJUB_WASM } from "../sdk/artifacts";
import type { NotegenRequest, NotegenResponse } from "./protocol";

configureJubjubWasm({
    loadModule: () => import(/* @vite-ignore */ JUBJUB_WASM.jubjubModuleUrl),
    wasm: JUBJUB_WASM.jubjubWasmUrl,
});

// Both the DOM and WebWorker libs are in scope for src/, so `self` widens to
// `Window`. Pin the worker scope once rather than casting at each use.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

/**
 * Fixed seeds. The feed only needs to be deterministic and to split into
 * decryptable and non-decryptable notes; none of this is security-sensitive.
 */
const MY_NSK = 1234n;
const STRANGER_NSK = 9999n;
/** 2^64/φ, the Fibonacci-hashing multiplier; spreads esk across the run. */
const GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15n;

const NOTE_ASSET = 1n;
// Offsets keep the note fields distinct per index; the values are arbitrary.
const RHO_OFFSET = 1000n;
const RCM_OFFSET = 2000n;

/**
 * `pk_d` is the Jubjub point the note is encrypted to; `pk` is the Poseidon field
 * the commitment binds, under the account's default diversifier. Both derive
 * from the same ivk and must agree: the scanner recomputes the commitment from
 * the decrypted payload and its own default `pk`, and drops any note whose `cm`
 * does not match.
 */
type Identity = Pick<SpendingKey, "ivk" | "pk_d" | "pk">;

interface Minter {
    me: Identity;
    stranger: Identity;
    /** Note `i` — every payload field derives from it — encrypted to `to`. */
    note: (to: Identity, i: number) => WireScanInput;
}

async function createMinter(): Promise<Minter> {
    const [J, P] = await Promise.all([Jubjub.build(), Poseidon.build()]);

    const note = (to: Identity, i: number): WireScanInput => {
        const n = BigInt(i);
        const payload = {
            asset: NOTE_ASSET,
            value: n + 1n,
            rho: n + RHO_OFFSET,
            rcm: n + RCM_OFFSET,
        };
        const enc = encryptNote({
            J,
            recipientPkD: to.pk_d,
            esk: (BigInt(i + 1) * GOLDEN_RATIO_64 + 1n) % BABYJUB_SUBGROUP_ORDER || 1n,
            plaintext: encodeNotePayload(payload),
        });
        return encodeInput({
            // The scanner strips a 2-byte clueBits prefix even with no FMD path.
            ciphertext: withClueBitsPrefix(new Uint8Array(2), enc.ciphertext),
            epk: enc.epk,
            // The scanner reproduces this from the plaintext and rejects any
            // note that does not match, so it must be the real commitment.
            cm: buildNoteCommitment(P, { ...payload, pk: to.pk }),
            leafIndex: i,
            // Stored on the hit as `firstSeenBlock`. One notional block per
            // note keeps it monotonic, as on a real chain.
            blockNumber: i,
        });
    };

    return {
        me: buildSpendingKey(P, J, MY_NSK),
        stranger: buildSpendingKey(P, J, STRANGER_NSK),
        note,
    };
}

const buffersOf = (inputs: WireScanInput[]): Transferable[] =>
    inputs.flatMap(i => [i.ciphertext.buffer, i.epk.buffer]);

function mintFeed({ me, stranger, note }: Minter, n: number, mineFrac: number): WireScanInput[] {
    const mineCount = Math.round(n * mineFrac);
    return Array.from({ length: n }, (_, i) => note(i < mineCount ? me : stranger, i));
}

/**
 * Disjoint index ranges: every payload field derives from the index, so this
 * keeps every commitment in the pool distinct. The sync feed relies on that —
 * it cycles the foreign pool across rows and dedupes hits by commitment.
 */
function mintPool({ me, stranger, note }: Minter, own: number, foreign: number) {
    return {
        mine: Array.from({ length: own }, (_, i) => note(me, i)),
        foreign: Array.from({ length: foreign }, (_, i) => note(stranger, own + i)),
    };
}

async function handle(req: NotegenRequest): Promise<void> {
    const t0 = performance.now();
    const minter = await createMinter();
    const ivk = minter.me.ivk.toString();

    switch (req.type) {
        case "feed": {
            const inputs = mintFeed(minter, req.n, req.mineFrac);
            return post({ type: "feed", ivk, inputs, ms: performance.now() - t0 }, buffersOf(inputs));
        }
        case "pool": {
            const { mine, foreign } = mintPool(minter, req.own, req.foreign);
            return post(
                { type: "pool", ivk, mine, foreign, ms: performance.now() - t0 },
                [...buffersOf(mine), ...buffersOf(foreign)],
            );
        }
    }
}

function post(msg: NotegenResponse, transfer: Transferable[] = []): void {
    ctx.postMessage(msg, transfer);
}

// The listener stays synchronous: an async one returns a promise the event
// target discards, so a rejection would surface as an unhandled rejection
// instead of the error message the client awaits.
ctx.addEventListener("message", (ev: MessageEvent<NotegenRequest>) => {
    handle(ev.data).catch((e: unknown) => post({ type: "error", message: errMsg(e) }));
});
