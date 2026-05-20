// Browser scan-throughput bench worker. Measures decrypt-only throughput:
// no FMD pre-filter, so no Poseidon required (avoids pulling circomlibjs +
// node polyfills into the bundle). WasmJubjub provides ECDH + ChaCha path.

import {
    buildJubjub,
    BABYJUB_SUBGROUP_ORDER,
    type Field,
    type Jubjub,
    type Point,
    type Poseidon,
    encryptNote,
    encodeNotePayload,
    withClueBitsPrefix,
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

interface Identity { ivk: Field; pkD: Point }

interface State {
    J: Jubjub;
    P: Poseidon;
    me: Identity;
    eve: Identity;
}

let state: State | null = null;

const post = (msg: unknown): void =>
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage(msg);

function makeIdentity(J: Jubjub, ivkSeed: bigint): Identity {
    const ivk = ivkSeed % BABYJUB_SUBGROUP_ORDER || 1n;
    const pkD = J.mulPointEscalar(J.base8, ivk);
    return { ivk, pkD };
}

async function prepare(): Promise<void> {
    const J = await buildJubjub();
    // Decrypt-only bench: scanNotes never touches P when no detectionKey is
    // passed, so a no-op stub satisfies the type without bundling Poseidon.
    const P = { hash: () => 0n } as unknown as Poseidon;
    const me = makeIdentity(J, 1234n);
    const eve = makeIdentity(J, 9999n);
    state = { J, P, me, eve };
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
            rcvDep: BigInt(i + 3000),
        }),
    });
    // scanNotes -> stripClueBitsPrefix expects a 2B prefix even without FMD;
    // pad with zeros since we run no detection-key path.
    const wire = withClueBitsPrefix(new Uint8Array(2), enc.ciphertext);
    return { ciphertext: wire, epk: enc.epk, cm: BigInt(i), leafIndex: i };
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
    scanNotes(s.J, s.P, s.me.ivk, inputs.slice(0, Math.min(50, inputs.length)));

    const t0 = performance.now();
    const hits = scanNotes(s.J, s.P, s.me.ivk, inputs);
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
