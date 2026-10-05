import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { emptyScanStats, scanNotes } from "@lelantos-org/sdk/advanced";
import { decodeInput } from "@lelantos-org/sdk/internal";
import { Jubjub, Poseidon } from "@lelantos-org/sdk/primitives";

import { shardRanges } from "../src/notegen/client";
import { createMinter, type Minter } from "../src/notegen/mint";

describe("minter", () => {
    let J: Jubjub;
    let P: Poseidon;
    let minter: Minter;

    before(async () => {
        [J, P] = await Promise.all([Jubjub.build(), Poseidon.build()]);
        minter = createMinter(J, P);
    });

    it("mints own notes the scanner accepts and foreign ones it skips", () => {
        const stats = emptyScanStats();
        const hits = scanNotes(J, P, minter.ivk, minter.mint(0, 48, 12).map(decodeInput), stats);

        assert.deepEqual(hits.map(h => h.leafIndex), Array.from({ length: 12 }, (_, i) => i));
        assert.deepEqual(stats, { ...emptyScanStats(), scanned: 48, hits: 12, notOurs: 36 });
    });

    it("gives foreign notes the wire shape of own ones", () => {
        const [mine, foreign] = minter.mint(0, 2, 1);
        assert.equal(foreign.ciphertext.length, mine.ciphertext.length);
        assert.equal(foreign.epk.length, mine.epk.length);
        assert.equal(foreign.clueR.length, mine.clueR.length);
    });

    it("mints shards that concatenate into the unsharded feed", () => {
        assert.deepEqual([...minter.mint(0, 5, 8), ...minter.mint(5, 20, 8)], minter.mint(0, 20, 8));
    });

    it("keeps commitments distinct", () => {
        const cms = minter.mint(0, 64, 8).map(n => n.cm);
        assert.equal(new Set(cms).size, cms.length);
    });
});

describe("shardRanges", () => {
    it("covers the feed with contiguous non-empty ranges", () => {
        for (const [n, workers] of [[4116, 16], [100_000, 8], [1000, 4], [257, 300], [70_000, 300]] as const) {
            const ranges = shardRanges(n, workers);
            assert.equal(ranges[0][0], 0);
            assert.equal(ranges.at(-1)?.[1], n);
            ranges.forEach(([from, to], s) => {
                assert.ok(to > from, `empty shard ${s} of ${n}/${workers}`);
                if (s > 0) assert.equal(from, ranges[s - 1][1]);
            });
        }
    });

    it("uses every worker on a large feed and one on a small one", () => {
        assert.equal(shardRanges(100_000, 8).length, 8);
        assert.deepEqual(shardRanges(200, 8), [[0, 200]]);
    });
});
