// Mints synthetic notes for the scan and sync benches. Some notes are encrypted
// to our ivk and the rest to a stranger's, so trial-decrypt sees the same mix of
// hits and misses as a real wallet sync.

import {
    BABYJUB_SUBGROUP_ORDER,
    buildNoteCommitment,
    configureJubjubWasm,
    derivePkFromIvk,
    type Field,
    Jubjub,
    type Point,
    Poseidon,
} from "@lelantos-org/sdk/crypto";
import { encodeNotePayload, encryptNote, withClueBitsPrefix } from "@lelantos-org/sdk/notes";
import { encodeInput, type WireScanInput } from "@lelantos-org/sdk/sync";

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
const MY_IVK_SEED = 1234n;
const STRANGER_IVK_SEED = 9999n;
/** 2^64/φ, the Fibonacci-hashing multiplier; spreads esk across the run. */
const GOLDEN_RATIO_64 = 0x9e3779b97f4a7c15n;

const NOTE_ASSET = 1n;
// Offsets keep the note fields distinct per index; the values are arbitrary.
const RHO_OFFSET = 1000n;
const RCM_OFFSET = 2000n;
const RCV_DEP_OFFSET = 3000n;

/**
 * `pkD` is the Jubjub point the note is encrypted to; `pk` is the Poseidon field
 * the commitment binds. Both derive from the same ivk and must agree: the
 * scanner recomputes the commitment from the decrypted payload and drops any
 * note whose `cm` does not match.
 */
interface Identity {
    ivk: Field;
    pkD: Point;
    pk: Field;
}

interface Minter {
    me: Identity;
    stranger: Identity;
    /** Note `i` — every payload field derives from it — encrypted to `to`. */
    note: (to: Identity, i: number) => WireScanInput;
}

async function createMinter(): Promise<Minter> {
    const [J, P] = await Promise.all([Jubjub.build(), Poseidon.build()]);

    const identity = (seed: bigint): Identity => {
        const ivk = seed % BABYJUB_SUBGROUP_ORDER || 1n;
        return { ivk, pkD: J.mulPointEscalar(J.base8, ivk), pk: derivePkFromIvk(P, ivk) };
    };

    const note = (to: Identity, i: number): WireScanInput => {
        const n = BigInt(i);
        const payload = {
            asset: NOTE_ASSET,
            value: n + 1n,
            rho: n + RHO_OFFSET,
            rcm: n + RCM_OFFSET,
            rcvDep: n + RCV_DEP_OFFSET,
        };
        const enc = encryptNote({
            J,
            recipientPkD: to.pkD,
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

    return { me: identity(MY_IVK_SEED), stranger: identity(STRANGER_IVK_SEED), note };
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
