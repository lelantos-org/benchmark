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
    type Note,
} from "../circuits/src/test/helpers";
import { flatten, fiatShamirZ } from "../sdk/src/snark-compression";

const DEPTH = 10;
const ASSET = 1n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;
const ALICE_NSK = 11n;

const OUTPUT_PATH = resolve(__dirname, "public", "input.json");

async function main() {
    const P = await Poseidon.build();
    const J = await Jubjub.build();

    const tree = new MerkleTree(P, DEPTH);
    const aliceP = derivePk(P, ALICE_NSK);

    const realOut: Note = { asset: ASSET, value: PUBLIC_IN, pk: aliceP, rho: 9n,  rcm: 10n, rcv: 11n };
    const padOut:  Note = { asset: ASSET, value: 0n,        pk: aliceP, rho: 12n, rcm: 13n, rcv: 14n };

    const baseInput = toCircomInput(P, J, {
        publicAssetId:   ASSET,
        publicAssetGen:  J.hashToAssetGen(ASSET),
        publicIn:        PUBLIC_IN,
        publicOut:       PUBLIC_OUT,
        inputs:          [dummyInputAt(P, DEPTH, 0n), dummyInputAt(P, DEPTH, 1n)],
        outputs:         [realOut, padOut],
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
