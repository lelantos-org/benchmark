// Synthetic note feed for the scan bench. `mineFrac` of the notes are encrypted
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
import { encodeInput, type ScanInput, type WireScanInput } from "@lelantos-org/sdk/sync";

import { errMsg } from "../lib/errors";
import type { NotegenRequest, NotegenResponse } from "../lib/notegen-protocol";
import { JUBJUB_MODULE_URL, JUBJUB_WASM_URL } from "../lib/sdk-wasm";

configureJubjubWasm({
    loadModule: () => import(/* @vite-ignore */ JUBJUB_MODULE_URL),
    wasm: JUBJUB_WASM_URL,
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
interface Identity { ivk: Field; pkD: Point; pk: Field }

const post = (msg: NotegenResponse, transfer: Transferable[] = []): void =>
    ctx.postMessage(msg, transfer);

function makeIdentity(J: Jubjub, P: Poseidon, ivkSeed: bigint): Identity {
    const ivk = ivkSeed % BABYJUB_SUBGROUP_ORDER || 1n;
    return { ivk, pkD: J.mulPointEscalar(J.base8, ivk), pk: derivePkFromIvk(P, ivk) };
}

function esk(i: number): bigint {
    return (BigInt(i + 1) * GOLDEN_RATIO_64 + 1n) % BABYJUB_SUBGROUP_ORDER || 1n;
}

function buildNote(J: Jubjub, P: Poseidon, id: Identity, i: number): ScanInput {
    const n = BigInt(i);
    const payload = {
        asset:  NOTE_ASSET,
        value:  n + 1n,
        rho:    n + RHO_OFFSET,
        rcm:    n + RCM_OFFSET,
        rcvDep: n + RCV_DEP_OFFSET,
    };
    const enc = encryptNote({
        J,
        recipientPkD: id.pkD,
        esk: esk(i),
        plaintext: encodeNotePayload(payload),
    });
    // The scanner strips a 2-byte clueBits prefix even with no FMD path.
    return {
        ciphertext: withClueBitsPrefix(new Uint8Array(2), enc.ciphertext),
        epk: enc.epk,
        // The scanner reproduces this from the plaintext and rejects any note
        // that does not match, so it must be the real commitment.
        cm: buildNoteCommitment(P, { ...payload, pk: id.pk }),
        leafIndex: i,
        // Stored on the hit as `firstSeenBlock`. One notional block per note
        // keeps it monotonic, as on a real chain.
        blockNumber: i,
    };
}

async function generate(req: NotegenRequest): Promise<void> {
    const t0 = performance.now();
    const [J, P] = await Promise.all([Jubjub.build(), Poseidon.build()]);
    const me = makeIdentity(J, P, MY_IVK_SEED);
    const stranger = makeIdentity(J, P, STRANGER_IVK_SEED);

    const mineCount = Math.round(req.n * req.mineFrac);
    const inputs: WireScanInput[] = new Array<WireScanInput>(req.n);
    for (let i = 0; i < req.n; i++) {
        inputs[i] = encodeInput(buildNote(J, P, i < mineCount ? me : stranger, i));
    }

    post(
        { type: "generated", ivk: me.ivk.toString(), inputs, ms: performance.now() - t0 },
        inputs.flatMap(i => [i.ciphertext.buffer, i.epk.buffer]),
    );
}

async function handle(req: NotegenRequest): Promise<void> {
    try {
        await generate(req);
    } catch (e) {
        post({ type: "error", message: errMsg(e) });
    }
}

// The listener stays synchronous: an async one returns a promise the event
// target discards, so a rejection would surface as an unhandled rejection
// instead of the error message the client awaits.
ctx.addEventListener("message", (ev: MessageEvent<NotegenRequest>) => { void handle(ev.data); });
