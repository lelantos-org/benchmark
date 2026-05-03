// Browser scan-throughput bench worker. WasmJubjub-only — circomlibjs is
// node-flavored (pulls assert/buffer/events) and would bloat the bundle by
// ~MB; we generate synthetic notes using WASM primitives directly.

import {
    buildJubjub,
    Poseidon,
    BABYJUB_SUBGROUP_ORDER,
    type Field,
    type Jubjub,
    type Point,
    encryptNote,
    encodeNotePayload,
    withClueBitsPrefix,
    clueBitsToPrefix,
    fmdFlag,
    fmdGenDetectionKey,
    fmdFlagKeyFromDetection,
    type FmdDetectionKey,
    type FmdFlagKey,
    scanNotes,
    type ScanInput,
} from "@lelantos-org/sdk";

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
    J: Jubjub;
    P: Poseidon;
    me: Identity;
    eve: Identity;
    dk: FmdDetectionKey;
}

let state: State | null = null;

const post = (msg: unknown): void =>
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg);

function makeIdentity(J: Jubjub, ivkSeed: bigint, dkSeed: bigint): Identity {
    const ivk = ivkSeed % BABYJUB_SUBGROUP_ORDER || 1n;
    const pkD = J.mulPointEscalar(J.base8, ivk);
    const dk = fmdGenDetectionKey(() => dkSeed);
    const fk = fmdFlagKeyFromDetection(J, dk);
    return { ivk, pkD, fk };
}

async function prepare(): Promise<void> {
    // Synthetic keys: ivk = random scalar, pk_d = base8 · ivk. Bench measures
    // scan, not on-chain ops — no real SpendingKey required.
    const [J, P] = await Promise.all([buildJubjub(), Poseidon.build()]);
    const me = makeIdentity(J, 1234n, 7n);
    const eve = makeIdentity(J, 9999n, 13n);
    const dk = fmdGenDetectionKey(() => 7n); // matches `me`
    state = { J, P, me, eve, dk };
    post({ type: "prepared" });
}

function rand(seed: number): bigint {
    return (BigInt(seed) * 0x9e3779b97f4a7c15n + 1n) % BABYJUB_SUBGROUP_ORDER || 1n;
}

function buildNote(s: State, i: number, mine: boolean): ScanInput {
    const id = mine ? s.me : s.eve;
    const enc = encryptNote({
        J: s.J,
        recipientPkD: id.pkD,
        esk: rand(i + 1),
        plaintext: encodeNotePayload({
            asset: 1n,
            value: BigInt(i + 1),
            rho: BigInt(i + 1000),
            rcm: BigInt(i + 2000),
        }),
    });
    const clue = fmdFlag(s.J, s.P, id.fk, rand(i + 12345));
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
    const inputs = buildBatch(s, req.n, req.mineFrac);

    // warm
    scanNotes(s.J, s.P, s.me.ivk, inputs.slice(0, Math.min(50, inputs.length)), s.dk);

    const t0 = performance.now();
    const hits = scanNotes(s.J, s.P, s.me.ivk, inputs, s.dk);
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
