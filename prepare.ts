// Build the canonical deposit witnesses the bench proves against:
//
//   public/input.2x2.json   Transact(10, 2, 2)
//   public/input.3x3.json   Transact(10, 3, 3)
//
// Both are the same deposit story at different arities — every input dummy,
// value entering via public_in, one real output plus pads. Mirrors
// contracts/script/fixtures/gen_proof_deposit.ts up to the FS-derived z.

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import {
    Poseidon,
    Jubjub,
    MerkleTree,
    buildRho,
    derivePk,
    type Field,
} from "@lelantos-org/sdk/crypto";
import {
    toCircomInput,
    dummyInputAt,
    flatten,
    fiatShamirZ,
} from "@lelantos-org/sdk/circuit";
import { fmdClueKeyFromRoot, fmdExpandFlagKey } from "@lelantos-org/sdk/fmd";
import {
    buildOutputAux,
    type Note,
    type OutputAux,
} from "@lelantos-org/sdk/notes";
import { auxDigest, type AuxOutput } from "@lelantos-org/sdk/protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEPTH = 10;
const ASSET = 1n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;
const ALICE_NSK = 11n;

const ALICE_IVK = 7n;
const ALICE_DK_SEED = 0xa11cen;

interface Shape { name: string; nIn: number; nOut: number }

const SHAPES: Shape[] = [
    { name: "2x2", nIn: 2, nOut: 2 },
    { name: "3x3", nIn: 3, nOut: 3 },
];

/** `AuxValidation.Output` wire shape — what `auxDigest` hashes. */
function auxToWire(a: OutputAux): AuxOutput {
    return {
        clueRx: a.clueR[0],
        clueRy: a.clueR[1],
        ephPubX: a.ephPub[0],
        ephPubY: a.ephPub[1],
        ciphertext: a.ciphertext,
    };
}

function buildWitness(P: Poseidon, J: Jubjub, shape: Shape): Record<string, unknown> {
    const tree = new MerkleTree(P, DEPTH);
    const aliceP: Field = derivePk(P, ALICE_NSK);

    const inputs = Array.from({ length: shape.nIn }, (_, i) => dummyInputAt(P, DEPTH, BigInt(i)));

    // out_rho is pinned in-circuit to DeriveRho(nullifier[0], j); anything else
    // fails the `out_rho[j] === out_rho_d[j].rho` constraint.
    const outRho = (j: number): Field => buildRho(P, inputs[0].nf, j);

    // Slot 0 carries the deposited value; the rest are zero-value pads, which
    // is what a real deposit looks like at any arity.
    const outputs: Note[] = Array.from({ length: shape.nOut }, (_, j) => ({
        asset:  ASSET,
        value:  j === 0 ? PUBLIC_IN : 0n,
        pk:     aliceP,
        rho:    outRho(j),
        rcm:    BigInt(10 + j),
        rcv:    BigInt(20 + j),
        rcvDep: BigInt(30 + j),
    }));

    // Encrypted-note payloads: the clue witnesses are SNARK-bound and the aux
    // digest binds ephPub + ciphertext alongside them.
    //
    // The recipient's flag key is the sender's view of their address, built in
    // two steps: `ck = B · dk_root` is the clue key an address publishes, and
    // expanding it gives the γ points `X_i = ck + B·h_i`. Only the first step
    // touches the secret, which is why a sender can do the second from a
    // published address alone.
    const aliceFlagKey = fmdExpandFlagKey(J, P, fmdClueKeyFromRoot(J, ALICE_DK_SEED));
    const alicePkD = J.mulPointEscalar(J.base8, ALICE_IVK);
    const aux = outputs.map((note, j) => buildOutputAux({
        J,
        P,
        recipientFlagKey: aliceFlagKey,
        recipientPkD:     alicePkD,
        note:             { asset: note.asset, value: note.value, rho: note.rho, rcm: note.rcm, rcvDep: note.rcvDep },
        esk:              BigInt(0x1234 + j * 0x1111),
        fmdR:             BigInt(0x5678 + j * 0x1111),
    }));

    const baseInput = toCircomInput(P, J, {
        publicAssetId:    ASSET,
        publicIn:         PUBLIC_IN,
        publicOut:        PUBLIC_OUT,
        inputs,
        outputs,
        outputClues:      aux.map(a => a.witness),
        outputAuxDigest:  auxDigest(aux.map(a => auxToWire(a.aux))),
        merkleRoot:       tree.root(),
        recipientAddress: RECIPIENT,
        chainId:          CHAIN_ID,
        z:                0n,
    });

    const z = fiatShamirZ(flatten(baseInput));
    return { ...baseInput, z: z.toString() };
}

async function main() {
    const P = await Poseidon.build();
    const J = await Jubjub.build();

    for (const shape of SHAPES) {
        const outPath = resolve(__dirname, "public", `input.${shape.name}.json`);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, JSON.stringify(buildWitness(P, J, shape), null, 2) + "\n");
        console.log(`wrote -> ${outPath}`);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
