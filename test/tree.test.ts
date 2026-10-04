import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { BN254_FR, MerkleTree, Poseidon } from "@lelantos-org/sdk/primitives";

import { buildChunks, CHUNK_SIZE, SyntheticCommitmentFeed, syntheticLeaf } from "../src/benches/tree/feed";
import { runTreeBench, type TreePhase } from "../src/benches/tree/run";

describe("tree feed", () => {
    it("mints distinct canonical field elements", () => {
        const leaves = Array.from({ length: 5000 }, (_, i) => syntheticLeaf(i));
        assert.equal(new Set(leaves).size, leaves.length);
        assert.ok(leaves.every(l => l > 0n && l < BN254_FR));
    });

    it("pages contiguous leaves and marks only the tail incomplete", () => {
        const chunks = buildChunks(2 * CHUNK_SIZE + 5);
        assert.deepEqual(chunks.map(c => c.entries.length), [CHUNK_SIZE, CHUNK_SIZE, 5]);
        assert.deepEqual(chunks.map(c => c.isComplete), [true, true, false]);
        assert.deepEqual(chunks.flatMap(c => c.entries.map(e => e.leafIndex)),
            Array.from({ length: 2 * CHUNK_SIZE + 5 }, (_, i) => i));
    });

    it("answers past the tail with an empty incomplete chunk", async () => {
        const feed = new SyntheticCommitmentFeed(buildChunks(CHUNK_SIZE));
        assert.equal((await feed.fetchCommitmentChunk(0)).isComplete, true);
        assert.deepEqual(await feed.fetchCommitmentChunk(1), { chunkId: 1, entries: [], isComplete: false });
        await assert.rejects(feed.fetchTreeState());
    });
});

/** Internal nodes above `leaves` real leaves: each level is a quarter of the one below, rounded up. */
function internalNodes(leaves: number, depth: number): number {
    let total = 0;
    for (let width = leaves, level = 1; level <= depth; level++) {
        width = Math.ceil(width / 4);
        total += width;
    }
    return total;
}

describe("runTreeBench", () => {
    let P: Poseidon;
    before(async () => {
        P = await Poseidon.build();
    });

    // 4^depth leaves is a full tree; a chunk multiple ends on an empty tail chunk.
    for (const [leaves, depth] of [[2500, 7], [2 * CHUNK_SIZE, 6], [4 ** 6, 6], [1, 3]] as const) {
        it(`rebuilds ${leaves} leaves at depth ${depth}`, async () => {
            const phases: TreePhase[] = [];
            const r = await runTreeBench({ P, leaves, depth, onPhase: p => void phases.push(p) });

            assert.ok(r);
            assert.deepEqual(phases, ["feed", "cold", "leaves", "nodes"]);
            assert.equal(r.leaves, leaves);
            assert.equal(r.backend, P.backend);
            assert.equal(r.coldMs, r.syncMs + r.rootMs);
            assert.equal(r.nodes, internalNodes(leaves, depth));
        });
    }

    it("builds the tree the SDK's MerkleTree builds from the same leaves", async () => {
        const r = await runTreeBench({ P, leaves: 300, depth: 6 });

        const reference = new MerkleTree(P, 6);
        reference.bulkInsert(Array.from({ length: 300 }, (_, i) => syntheticLeaf(i)));
        assert.equal(r?.root, reference.root());
    });

    it("rejects more leaves than the depth holds", async () => {
        await assert.rejects(runTreeBench({ P, leaves: 65, depth: 3 }), /do not fit/);
    });

    it("returns null when aborted", async () => {
        assert.equal(await runTreeBench({ P, leaves: 5000, depth: 7, signal: AbortSignal.abort() }), null);
    });
});
