// Browser scan-throughput bench worker. WasmJubjub-only — circomlibjs is
// node-flavored (pulls assert/buffer/events) and would bloat the bundle by
// ~MB; we generate synthetic notes using WASM primitives directly.

import { WasmJubjub } from "../../sdk/src/crypto/jubjub-wasm";
import {
    BABYJUB_SUBGROUP_ORDER,
    type Field,
    type Jubjub,
    type Point,
} from "../../sdk/src/crypto/index";
import { encryptNote } from "../../sdk/src/note-encrypt";
import {
    encodeNotePayload,
    withClueBitsPrefix,
    clueBitsToPrefix,
} from "../../sdk/src/note-codec";
import {
    fmdFlag,
    fmdGenDetectionKey,
    fmdFlagKeyFromDetection,
    type FmdDetectionKey,
    type FmdFlagKey,
} from "../../sdk/src/fmd";
import { scanNotes, type ScanInput } from "../../sdk/src/sync";

interface PrepareReq { type: "prepare" }
interface RunReq { type: "run"; n: number; mineFrac: number }
interface ScanResultMsg {
    type: "result";
    n: number;
    mineFrac: number;
    hits: number;
    totalMs: number;
    perNoteMs: number;
    notesPerSec: number;
}

interface Identity { ivk: Field; pkD: Point; fk: FmdFlagKey }

interface State {
    W: WasmJubjub;
    me: Identity;
    eve: Identity;
    dk: FmdDetectionKey;
}

let state: State | null = null;

const post = (msg: unknown): void =>
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg);

// SDK types `Jubjub` as the JS interface; WasmJubjub is structurally compatible.
const asJ = (w: WasmJubjub): Jubjub => w as unknown as Jubjub;

function makeIdentity(W: WasmJubjub, ivkSeed: bigint, dkSeed: bigint): Identity {
    const ivk = ivkSeed % BABYJUB_SUBGROUP_ORDER || 1n;
    const pkD = W.mulPointEscalar(W.base8, ivk);
    const dk = fmdGenDetectionKey(() => dkSeed);
    const fk = fmdFlagKeyFromDetection(asJ(W), dk);
    return { ivk, pkD, fk };
}

async function prepare(): Promise<void> {
    // Synthetic keys: ivk = random scalar, pk_d = base8 · ivk. Bench measures
    // scan, not on-chain ops — no real SpendingKey required.
    const W = await WasmJubjub.build();
    const me = makeIdentity(W, 1234n, 7n);
    const eve = makeIdentity(W, 9999n, 13n);
    const dk = fmdGenDetectionKey(() => 7n); // matches `me`
    state = { W, me, eve, dk };
    post({ type: "prepared" });
}

function rand(seed: number): bigint {
    return (BigInt(seed) * 0x9e3779b97f4a7c15n + 1n) % BABYJUB_SUBGROUP_ORDER || 1n;
}

function buildNote(s: State, i: number, mine: boolean): ScanInput {
    const id = mine ? s.me : s.eve;
    const J = asJ(s.W);
    const enc = encryptNote({
        J,
        recipientPkD: id.pkD,
        esk: rand(i + 1),
        plaintext: encodeNotePayload({
            asset: 1n,
            value: BigInt(i + 1),
            rho: BigInt(i + 1000),
            rcm: BigInt(i + 2000),
        }),
    });
    const clue = fmdFlag(J, id.fk, rand(i + 12345));
    const wire = withClueBitsPrefix(
        clueBitsToPrefix(clue.bits, clue.gamma),
        enc.ciphertext,
    );
    return { ciphertext: wire, epk: enc.epk, cm: BigInt(i), leafIndex: i, clue };
}

function buildBatch(s: State, n: number, mineFrac: number): ScanInput[] {
    const mineCount = Math.round(n * mineFrac);
    const out: ScanInput[] = new Array(n);
    for (let i = 0; i < n; i++) out[i] = buildNote(s, i, i < mineCount);
    return out;
}

async function run(req: RunReq): Promise<void> {
    if (!state) throw new Error("worker not prepared");
    const s = state;
    const J = asJ(s.W);
    const inputs = buildBatch(s, req.n, req.mineFrac);

    // warm
    scanNotes(J, s.me.ivk, inputs.slice(0, Math.min(50, inputs.length)), s.dk);

    const t0 = performance.now();
    const hits = scanNotes(J, s.me.ivk, inputs, s.dk);
    const totalMs = performance.now() - t0;

    const result: ScanResultMsg = {
        type: "result",
        n: req.n,
        mineFrac: req.mineFrac,
        hits: hits.length,
        totalMs,
        perNoteMs: totalMs / req.n,
        notesPerSec: (req.n / totalMs) * 1000,
    };
    post(result);
}

self.addEventListener("message", async (ev: MessageEvent) => {
    const msg = ev.data as PrepareReq | RunReq;
    try {
        if (msg.type === "prepare") await prepare();
        else if (msg.type === "run") await run(msg);
    } catch (e) {
        post({ type: "error", message: e instanceof Error ? e.message : String(e) });
    }
});
