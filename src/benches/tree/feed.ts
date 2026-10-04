// Synthetic commitment feed for the tree bench: the chunks `/v1/commitments`
// would serve for a chain of `leaves` notes, already decoded.
//
// Everything is built before the timed window opens, so a chunk request
// resolves to a ready object and the measured time is the SDK's alone.

import type { CommitmentFeed } from "@lelantos-org/sdk/advanced";
import { BN254_FR } from "@lelantos-org/sdk/primitives";
import type { CommitmentChunkOut, FmdTreeState } from "@lelantos-org/sdk/services";

/** Entries per chunk, as the server pages them. The SDK does not export its own. */
export const CHUNK_SIZE = 1024;

/** Arbitrary odd 253-bit multiplier; see {@link syntheticLeaf}. */
const LEAF_STEP = 0x1b3a5c7e9f0d2b4c6e8a0c2e4f6a8b0d1f3e5c7a9b2d4f6e8c0a1b3d5f7e9c1bn;

/**
 * Leaf `i` of the modelled chain. A real leaf is a Poseidon digest, so a
 * full-width field element; multiples of a fixed step mod the prime are that,
 * distinct for every index, and cost one multiplication to produce.
 */
export const syntheticLeaf = (i: number): bigint => (BigInt(i + 1) * LEAF_STEP) % BN254_FR;

/** Every chunk of a `leaves`-note chain, in chunk-id order. */
export function buildChunks(leaves: number): CommitmentChunkOut[] {
    const chunks: CommitmentChunkOut[] = [];
    for (let first = 0; first < leaves; first += CHUNK_SIZE) {
        const size = Math.min(CHUNK_SIZE, leaves - first);
        chunks.push({
            chunkId: chunks.length,
            entries: Array.from({ length: size }, (_, k) => ({
                leafIndex: first + k,
                leafHash: syntheticLeaf(first + k),
            })),
            isComplete: size === CHUNK_SIZE,
        });
    }
    return chunks;
}

export class SyntheticCommitmentFeed implements CommitmentFeed {
    constructor(private readonly chunks: readonly CommitmentChunkOut[]) {}

    /**
     * Past the tail the answer is an empty, incomplete chunk, as the server
     * gives: the SDK fetches a window ahead, and a chain that is an exact
     * multiple of the chunk size ends on such a chunk.
     */
    fetchCommitmentChunk(chunkId: number): Promise<CommitmentChunkOut> {
        return Promise.resolve(this.chunks[chunkId] ?? { chunkId, entries: [], isComplete: false });
    }

    /** Only root verification reads the mirror's head, and the bench has no mirror. */
    fetchTreeState(): Promise<FmdTreeState> {
        return Promise.reject(new Error("the tree bench does not model the mirror's tree state"));
    }
}
