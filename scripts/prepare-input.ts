// Generates the spend witnesses the proof bench runs against:
//
//   public/input.4x6.json   Transact(11, 4, 6)
//
// A shielded transfer: one real input note in slot 0 — its commitment inserted
// into the tree the witness proves membership in — plus dummies, one real
// output and zero-value pads. One file is written per entry in `CIRCUITS`.
//
// Slot 0 is real because the circuit refuses an all-dummy transact
// (`all_dummy.out === 0` in `lib/transact.circom`): with every input a dummy
// the merkle root is an unconstrained PolyEval coefficient, which is enough to
// solve the compression equation for an arbitrary one.

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
} from "@lelantos-org/sdk/internal";
import {
    buildDiversifiedKeys,
    buildNoteCommitment,
    buildRho,
    deriveIvk,
    deriveOutgoingKey,
    Jubjub,
    MerkleTree,
    type Note,
    type OutputAux,
    Poseidon,
} from "@lelantos-org/sdk/primitives";
import { type AuxOutput, auxDigest, sealOutput } from "@lelantos-org/sdk/protocol";

import { artifactNames, CIRCUITS, type Circuit } from "../shared/circuits.js";

const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

const ASSET = 1n;
/** Value of the one real input note, i.e. what is spent from the tree. */
const IN_VALUE = 50n;
const RECIPIENT = 0xbeefn;
const CHAIN_ID = 31337n;

// Fixed keys: the witness only has to be valid, not secret.
const ALICE_NSK = 11n;
/** Any value proves: the circuit only checks `pk = Poseidon(TAG_PK, ivk, d)`. */
const ALICE_DIVERSIFIER = 0n;

interface Curves {
    P: Poseidon;
    J: Jubjub;
}

/** `AuxValidation.Output` wire shape consumed by `auxDigest`. */
function auxToWire(a: OutputAux): AuxOutput {
    return {
        clueRx: a.clueR[0],
        clueRy: a.clueR[1],
        clueQx: a.clueQ[0],
        clueQy: a.clueQ[1],
        ephPubX: a.ephPub[0],
        ephPubY: a.ephPub[1],
        ciphertext: a.ciphertext,
    };
}

function buildWitness(curves: Curves, circuit: Circuit): CircomTransactInput {
    const { P, J } = curves;
    const tree = new MerkleTree(P, circuit.depth);
    // Alice pays herself: she owns the spent note and receives every output.
    const alice = buildDiversifiedKeys(P, J, deriveIvk(P, ALICE_NSK), ALICE_DIVERSIFIER);

    // Slot 0 spends a real note, whose commitment is its tree leaf; the rest
    // are dummies. A dummy skips Merkle membership, so only this one needs to
    // be in the tree.
    const spent: Note = {
        asset: ASSET,
        value: IN_VALUE,
        pk: alice.pk,
        rho: 0xf00dn,
        rcm: 1n,
    };
    const leafIndex = tree.insert(buildNoteCommitment(P, spent));
    const { pathElements, pathIndices } = tree.proof(leafIndex);

    // Each dummy needs its own (rho, rcm): a repeated pair repeats the nullifier.
    const inputs = [
        toSpentNoteFromPath(
            P,
            { note: spent, nsk: ALICE_NSK, d: ALICE_DIVERSIFIER, leafIndex },
            pathElements,
            pathIndices,
        ),
        ...Array.from({ length: circuit.nIn - 1 }, (_, i) => dummyInputAt(P, circuit.depth, {
            nsk: ALICE_NSK,
            rho: BigInt(0xd00 + i),
            rcm: BigInt(0xe00 + i),
        })),
    ];

    // Slot 0 carries the whole balance and the remaining slots are zero-value
    // pads.
    //
    // The circuit pins out_rho to DeriveRho(nullifier[0], j); any other value
    // fails the `out_rho[j] === out_rho_d[j].rho` constraint.
    //
    // Sealing yields each note with its encrypted payload: the clue witnesses
    // are bound through the challenge, and the aux digest binds ephPub and
    // ciphertext alongside them.
    const nullifiers = inputs.map(i => i.nf);
    const outgoingKey = deriveOutgoingKey(ALICE_NSK);
    const sealed = Array.from({ length: circuit.nOut }, (_, j) => sealOutput(J, P, {
        outgoingKey,
        chainId: CHAIN_ID,
        rho: buildRho(P, nullifiers[0], j),
        asset: ASSET,
        value: j === 0 ? IN_VALUE : 0n,
        recipient: alice,
        nullifiers,
    }));
    const outputs: Note[] = sealed.map(s => s.note);
    const aux = sealed.map(s => s.aux);

    // A transfer withdraws nothing, and names no asset when `public_out` is zero.
    const baseInput = toCircomInput(P, {
        publicAssetId: 0n,
        publicOut: 0n,
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

    // Only the circuit's own input signals reach the witness calculator.
    // `recipient_address`, `chain_id`, `payer_address`, `relayer_address`,
    // `intent_hash`, the per-output clue triples and `out_aux_digest` are
    // logical public inputs that Transact declares no signal for (see
    // `challengeOnly` in the package's vectors): they bind to the proof through
    // z alone. `digest` is a circuit output. Left in, the wasm calculator
    // rejects the first of them outright — "Signal recipient_address not found".
    return circuitSignals({ ...baseInput, z: z.toString() });
}

const curves: Curves = { P: await Poseidon.build(), J: await Jubjub.build() };
mkdirSync(PUBLIC_DIR, { recursive: true });

for (const circuit of CIRCUITS) {
    const outPath = resolve(PUBLIC_DIR, artifactNames(circuit.name).witness);
    writeFileSync(outPath, JSON.stringify(buildWitness(curves, circuit), null, 2) + "\n");
    console.log(`wrote -> ${outPath}`);
}
