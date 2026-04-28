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
    type Field,
} from "../circuits/src/test/helpers";
import { flatten, fiatShamirZ } from "../sdk/src/snark-compression";

const DEPTH = 10;
const ASSET = 1n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;
const ALICE_NSK = 11n;

async function main() {
    const P = await Poseidon.build();
    const J = await Jubjub.build();

    const tree = new MerkleTree(P, DEPTH);
    const root = tree.root();

    const dA = dummyInputAt(P, DEPTH, 0n);
    const dB = dummyInputAt(P, DEPTH, 1n);

    const aliceP: Field = derivePk(P, ALICE_NSK);
    const realOut: Note = { asset: ASSET, value: PUBLIC_IN, pk: aliceP, rho: 9n,  rcm: 10n, rcv: 11n };
    const padOut:  Note = { asset: ASSET, value: 0n,        pk: aliceP, rho: 12n, rcm: 13n, rcv: 14n };

    const pubGen = J.hashToAssetGen(ASSET);

    const baseInput = toCircomInput(P, J, {
        publicAssetId: ASSET,
        publicAssetGen: pubGen,
        publicIn: PUBLIC_IN,
        publicOut: PUBLIC_OUT,
        inputs: [dA, dB],
        outputs: [realOut, padOut],
        merkleRoot: root,
        recipientAddress: RECIPIENT,
        chainId: CHAIN_ID,
        z: 0n,
    });

    const coeffs = flatten(baseInput as any);
    const z = fiatShamirZ(coeffs);
    const input = { ...baseInput, z: z.toString() };

    const out = resolve(__dirname, "public", "input.json");
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(input, null, 2) + "\n");
    console.log(`wrote -> ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
