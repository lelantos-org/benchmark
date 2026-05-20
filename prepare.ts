// Build bench/public/input.json — canonical witness for the 2x2 deposit case.
// Mirrors contracts/script/fixtures/gen_proof_deposit.ts up to FS-derived z.

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import {
    Poseidon,
    Jubjub,
    MerkleTree,
    derivePk,
    BABYJUB_SUBGROUP_ORDER,
    type Field,
} from "@lelantos-org/sdk/crypto";
import {
    toCircomInput,
    dummyInputAt,
    fmdFlag,
    fmdFlagKeyFromDetection,
    fmdGenDetectionKey,
    FMD_DEFAULT_GAMMA,
    flatten,
    fiatShamirZ,
    type Note,
} from "@lelantos-org/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEPTH = 10;
const ASSET = 1n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;
const ALICE_NSK = 11n;

const OUTPUT_PATH = resolve(__dirname, "public", "input.json");

interface ClueOut {
    witness: { clueBits: bigint; clueRx: bigint; clueRy: bigint };
}

function buildClue(P: Poseidon, J: Jubjub, seed: bigint, r: bigint): ClueOut {
    let s = seed | 1n;
    const stream = (): bigint => {
        s = (s * 6364136223846793005n + 1442695040888963407n) & ((1n << 128n) - 1n);
        return s | 1n;
    };
    const dk = fmdGenDetectionKey(stream, FMD_DEFAULT_GAMMA);
    const fk = fmdFlagKeyFromDetection(J, dk);
    const rMod = r % BABYJUB_SUBGROUP_ORDER || 1n;
    const clue = fmdFlag(J, P, fk, rMod);
    const Rpoint = J.unpackPoint(clue.R);
    if (!Rpoint) throw new Error("clue R unpack");
    let bits = 0n;
    for (let i = 0; i < FMD_DEFAULT_GAMMA; i++) {
        const b = (clue.bits[i >> 3] >> (i & 7)) & 1;
        if (b) bits |= 1n << BigInt(i);
    }
    return { witness: { clueBits: bits, clueRx: Rpoint[0], clueRy: Rpoint[1] } };
}

async function main() {
    const P = await Poseidon.build();
    const J = await Jubjub.build();

    const tree = new MerkleTree(P, DEPTH);
    const aliceP: Field = derivePk(P, ALICE_NSK);

    const realOut: Note = { asset: ASSET, value: PUBLIC_IN, pk: aliceP, rho: 9n,  rcm: 10n, rcv: 11n, rcvDep: 15n };
    const padOut:  Note = { asset: ASSET, value: 0n,        pk: aliceP, rho: 12n, rcm: 13n, rcv: 14n, rcvDep: 16n };

    const clue0 = buildClue(P, J, 0xa0n, 0x1234n);
    const clue1 = buildClue(P, J, 0xa1n, 0x5678n);

    const baseInput = toCircomInput(P, J, {
        publicAssetId:    ASSET,
        publicIn:         PUBLIC_IN,
        publicOut:        PUBLIC_OUT,
        inputs:           [dummyInputAt(P, DEPTH, 0n), dummyInputAt(P, DEPTH, 1n)],
        outputs:          [realOut, padOut],
        outputClues:      [clue0.witness, clue1.witness],
        merkleRoot:       tree.root(),
        recipientAddress: RECIPIENT,
        chainId:          CHAIN_ID,
        z:                0n,
    });

    const z = fiatShamirZ(flatten(baseInput as any));
    const input = { ...baseInput, z: z.toString() };

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(input, null, 2) + "\n");
    console.log(`wrote -> ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
