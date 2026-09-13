// Generates the spend witnesses the proof bench runs against:
//
//   public/input.4x6.json   Transact(11, 4, 6)
//
// One real input note in slot 0 — its own leaf inserted into the tree the
// witness proves membership in — plus dummies, with the rest of the value
// entering via public_in, one real output and zero-value pads. One file is
// written per entry in `CIRCUITS`.
//
// Slot 0 is real because the circuit REFUSES an all-dummy transact
// (`all_dummy.out === 0` in `lib/transact.circom`): with every input a dummy
// the merkle root is an unconstrained PolyEval coefficient, which is enough to
// solve the compression equation for an arbitrary one. This file used to build
// exactly that witness, and it stopped proving the moment the constraint
// landed.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
    type CircomTransactInput,
    circuitSignals,
    dummyInputAt,
    fiatShamirZ,
    flatten,
    toCircomInput,
    toSpentNoteFromPath,
} from "@lelantos-org/sdk/circuit";
import {
    buildNoteCommitment,
    buildRho,
    derivePk,
    type Field,
    Jubjub,
    MerkleTree,
    Poseidon,
    TAG_LEAF,
} from "@lelantos-org/sdk/crypto";
import { fmdClueKeyFromRoot, fmdExpandFlagKey } from "@lelantos-org/sdk/fmd";
import { buildOutputAux, type Note, type OutputAux } from "@lelantos-org/sdk/notes";
import { type AuxOutput, auxDigest } from "@lelantos-org/sdk/protocol";

import { artifactNames, CIRCUITS, type Circuit } from "../shared/circuits.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

const ASSET = 1n;
/** Value of the one real input note, i.e. what is spent from the tree. */
const IN_VALUE = 50n;
const PUBLIC_IN = 100n;
const PUBLIC_OUT = 0n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;

// Fixed keys: the witness only has to be valid, not secret.
const ALICE_NSK = 11n;
const ALICE_IVK = 7n;
const ALICE_DK_SEED = 0xa11cen;

interface Curves {
    P: Poseidon;
    J: Jubjub;
}

/** `AuxValidation.Output` wire shape consumed by `auxDigest`. */
function auxToWire(a: OutputAux): AuxOutput {
    return {
        clueRx: a.clueR[0],
        clueRy: a.clueR[1],
        ephPubX: a.ephPub[0],
        ephPubY: a.ephPub[1],
        ciphertext: a.ciphertext,
    };
}

/**
 * The leaf a spendable note occupies: `Poseidon(TAG_LEAF, cm, cv_dep)`.
 *
 * Recomputed here exactly as `lib/spent.circom` step 5 does, because the
 * witness has to prove membership of the leaf the circuit will derive — not of
 * the commitment alone. `cv_dep` binds the note's (asset, value) under its
 * deposit-anchor blinder, which is what stops a spender opening the same `cm`
 * as a different asset at spend time.
 */
function leafOf({ P, J }: Curves, note: Note): Field {
    const cm = buildNoteCommitment(P, note);
    const cvDep = J.valueCommit(note.value, J.hashToAssetGen(note.asset), note.rcvDep);
    return P.hash([TAG_LEAF, cm, cvDep[0], cvDep[1]]);
}

function buildWitness(curves: Curves, circuit: Circuit): CircomTransactInput {
    const { P, J } = curves;
    const tree = new MerkleTree(P, circuit.depth);
    const aliceP: Field = derivePk(P, ALICE_NSK);

    // Slot 0 spends a real note; the rest are dummies. `dummyInputAt` skips the
    // leaf check, so only this one needs to be in the tree.
    const spent: Note = {
        asset: ASSET,
        value: IN_VALUE,
        pk: aliceP,
        rho: 0xf00dn,
        rcm: 1n,
        rcv: 2n,
        rcvDep: 3n,
    };
    const leafIndex = tree.insert(leafOf(curves, spent));
    const { pathElements, pathIndices } = tree.proof(leafIndex);

    const inputs = [
        toSpentNoteFromPath(P, { note: spent, nsk: ALICE_NSK, leafIndex }, pathElements, pathIndices),
        ...Array.from({ length: circuit.nIn - 1 }, (_, i) => dummyInputAt(P, circuit.depth, BigInt(i + 1))),
    ];

    // Slot 0 carries the whole balance — the spent note plus what enters via
    // `public_in` — and the remaining slots are zero-value pads.
    //
    // The circuit pins out_rho to DeriveRho(nullifier[0], j); any other value
    // fails the `out_rho[j] === out_rho_d[j].rho` constraint.
    const outputs: Note[] = Array.from({ length: circuit.nOut }, (_, j) => ({
        asset: ASSET,
        value: j === 0 ? IN_VALUE + PUBLIC_IN - PUBLIC_OUT : 0n,
        pk: aliceP,
        rho: buildRho(P, inputs[0].nf, j),
        rcm: BigInt(10 + j),
        rcv: BigInt(20 + j),
        rcvDep: BigInt(30 + j),
    }));

    // Encrypted-note payloads: the clue witnesses are SNARK-bound, and the aux
    // digest binds ephPub and ciphertext alongside them.
    //
    // The recipient flag key is derived in two steps: `ck = B · dk_root` is the
    // clue key an address publishes, and expanding it yields the γ points
    // `X_i = ck + B·h_i`. Only the first step requires the secret, so a sender
    // can perform the second from a published address alone.
    const aliceFlagKey = fmdExpandFlagKey(J, P, fmdClueKeyFromRoot(J, ALICE_DK_SEED));
    const alicePkD = J.mulPointEscalar(J.base8, ALICE_IVK);
    const aux = outputs.map(({ asset, value, rho, rcm, rcvDep }, j) => buildOutputAux({
        J,
        P,
        recipientFlagKey: aliceFlagKey,
        recipientPkD: alicePkD,
        note: { asset, value, rho, rcm, rcvDep },
        esk: BigInt(0x1234 + j * 0x1111),
        fmdR: BigInt(0x5678 + j * 0x1111),
    }));

    const baseInput = toCircomInput(P, J, {
        publicAssetId: ASSET,
        publicIn: PUBLIC_IN,
        publicOut: PUBLIC_OUT,
        inputs,
        outputs,
        outputClues: aux.map(a => a.witness),
        outputAuxDigest: auxDigest(aux.map(a => auxToWire(a.aux))),
        merkleRoot: tree.root(),
        recipientAddress: RECIPIENT,
        chainId: CHAIN_ID,
        z: 0n,
    });

    // The challenge covers the whole bundle, signals and binding fields alike —
    // `flatten` is PubInputs.sol's word order — so z is derived before the
    // projection below drops the binding fields.
    const z = fiatShamirZ(flatten(baseInput));

    // Only the circuit's own signals reach the witness calculator.
    // `recipient_address`, `chain_id`, `payer_address`, `relayer_address`, the
    // per-output clue triples and `out_aux_digest` are logical public inputs
    // that Transact declares no signal for (see `challengeOnly` in the
    // package's vectors): they bind to the proof through z alone. Left in, the
    // wasm calculator rejects the first of them outright — "Signal
    // recipient_address not found".
    return circuitSignals({ ...baseInput, z: z.toString() });
}

const curves: Curves = { P: await Poseidon.build(), J: await Jubjub.build() };
mkdirSync(PUBLIC_DIR, { recursive: true });

for (const circuit of CIRCUITS) {
    const outPath = resolve(PUBLIC_DIR, artifactNames(circuit.name).witness);
    writeFileSync(outPath, JSON.stringify(buildWitness(curves, circuit), null, 2) + "\n");
    console.log(`wrote -> ${outPath}`);
}
