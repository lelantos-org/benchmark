// Build bench/public/input.json — canonical witness for the 2x2 deposit case.
// Same logic as ../contracts/script/fixtures/gen_proof_deposit.ts up to
// FS-derived z, but stops before snarkjs proving (browser does that part).

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

import {
    Poseidon,
    Jubjub,
    MerkleTree,
    derivePk,
    toCircomInput,
    dummyInputAt,
    fmdFlag,
    fmdFlagKeyFromDetection,
    fmdGenDetectionKey,
    FMD_DEFAULT_GAMMA,
    BABYJUB_SUBGROUP_ORDER,
    type Note,
    type OutputClueWitness,
} from "../circuits/src/test/helpers";
import { flatten, fiatShamirZ } from "@lelantos-org/sdk";

const DEPTH = 10;
const ASSET = 1n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;
const ALICE_NSK = 11n;

const OUTPUT_PATH = resolve(__dirname, "public", "input.json");

// Deterministic clue synth: bench timing doesn't care about clue contents,
// only that the witness satisfies ClueCheck. Mirrors `makeClueGen` in
// circuits/src/test/lib/transact.ts.
function makeClueGen(P: Poseidon, J: Jubjub): () => OutputClueWitness {
    const dk = fmdGenDetectionKey(() => 1n, FMD_DEFAULT_GAMMA);
    const fk = fmdFlagKeyFromDetection(J, dk);
    let counter = 0n;
    return () => {
        counter += 1n;
        const r = (counter * 1234567n + 89n) % BABYJUB_SUBGROUP_ORDER;
        const clue = fmdFlag(J, P, fk, r === 0n ? 1n : r);
        let packed = 0n;
        for (let i = 0; i < clue.bits.length; i++) {
            packed |= BigInt(clue.bits[i]) << BigInt(8 * i);
        }
        return { r, fk: fk.X, clueBits: packed };
    };
}

async function main() {
    const P = await Poseidon.build();
    const J = await Jubjub.build();

    const tree = new MerkleTree(P, DEPTH);
    const aliceP = derivePk(P, ALICE_NSK);

    const realOut: Note = { asset: ASSET, value: PUBLIC_IN, pk: aliceP, rho: 9n,  rcm: 10n, rcv: 11n };
    const padOut:  Note = { asset: ASSET, value: 0n,        pk: aliceP, rho: 12n, rcm: 13n, rcv: 14n };

    const nextClue = makeClueGen(P, J);
    const outputClues = [nextClue(), nextClue()];

    const baseInput = toCircomInput(P, J, {
        publicAssetId:   ASSET,
        publicAssetGen:  J.hashToAssetGen(ASSET),
        publicIn:        PUBLIC_IN,
        publicOut:       PUBLIC_OUT,
        inputs:          [dummyInputAt(P, DEPTH, 0n), dummyInputAt(P, DEPTH, 1n)],
        outputs:         [realOut, padOut],
        outputClues,
        merkleRoot:      tree.root(),
        recipientAddress: RECIPIENT,
        chainId:         CHAIN_ID,
        z:               0n,
    });

    const z = fiatShamirZ(flatten(baseInput as any));
    const input = { ...baseInput, z: z.toString() };

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(input, null, 2) + "\n");
    console.log(`wrote -> ${OUTPUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
