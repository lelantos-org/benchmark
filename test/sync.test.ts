import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ScanInput } from "@lelantos-org/sdk/sync";

import { SyntheticNoteSource, toWirePool } from "../src/benches/sync/feed";
import {
    effectiveGamma,
    gzipRatio,
    isFalsePositive,
    MAX_DETECTION_GAMMA,
    NETWORK_PROFILES,
    ownIds,
    profileByKey,
    transferMs,
} from "../src/benches/sync/model";
import { decodePage, pageText, rowTail, rowText } from "../src/benches/sync/wire";
import type { NotePool } from "../src/notegen/client";

const IDEAL = profileByKey("ideal");

const note = (i: number): ScanInput => ({
    ciphertext: Uint8Array.from({ length: 48 }, (_, k) => (i * 31 + k) & 0xff),
    epk: Uint8Array.from({ length: 32 }, (_, k) => (i * 17 + k) & 0xff),
    cm: BigInt(i) * 0x1_0000_0001n + 7n,
    leafIndex: i,
    blockNumber: i,
});

const pool = (own: number, foreign: number): NotePool => ({
    ivk: 1n,
    mine: Array.from({ length: own }, (_, i) => note(i)),
    foreign: Array.from({ length: foreign }, (_, i) => note(own + i)),
});

describe("model", () => {
    it("caps γ by the sender maximum and by the decoy floor", () => {
        assert.equal(effectiveGamma(10, 10_000_000), MAX_DETECTION_GAMMA);
        assert.equal(effectiveGamma(5, 500), 2);
        assert.equal(effectiveGamma(5, 100), 1);
        assert.equal(effectiveGamma(5, 64 * 8), 3);
        assert.equal(effectiveGamma(0, 1_000_000), 1);
    });

    it("fires the filter at roughly 2^-γ, deterministically", () => {
        const n = 200_000;
        let hits = 0;
        for (let id = 1; id <= n; id++) if (isFalsePositive(id, 4)) hits++;
        assert.ok(Math.abs(hits / n - 1 / 16) < 0.005, `rate ${hits / n}`);
        assert.equal(isFalsePositive(12345, 4), isFalsePositive(12345, 4));
    });

    it("spreads distinct own ids across the chain", () => {
        assert.deepEqual(ownIds(4, 100), [13, 38, 63, 88]);
        assert.deepEqual(ownIds(3, 1), [1]);
    });

    it("models transfer time", () => {
        assert.equal(transferMs(1e6, IDEAL), 0);
        assert.equal(transferMs(125_000, { key: "k", label: "", rttMs: 10, mbps: 1 }), 1010);
        assert.equal(profileByKey("nope"), NETWORK_PROFILES[1]);
    });

    it("measures a gzip ratio above 1 on hex JSON", async () => {
        const body = pageText(Array.from({ length: 50 }, (_, i) => rowText(i, rowTail(note(i)), "full")), "full", 0);
        assert.ok((await gzipRatio(body)) > 1);
    });
});

describe("wire", () => {
    for (const kind of ["full", "matches"] as const) {
        it(`round-trips a ${kind} page`, () => {
            const notes = [note(1), note(2)];
            const body = pageText(notes.map((n, i) => rowText(i + 1, rowTail(n), kind)), kind, 99);
            const page = decodePage(body, kind);

            assert.equal(page.backfilledThroughNoteId, kind === "full" ? 0 : 99);
            assert.deepEqual(page.inputs.map(i => i.cm), notes.map(n => n.cm));
            assert.deepEqual(page.inputs[1].ciphertext, notes[1].ciphertext);
            assert.deepEqual(page.inputs[1].epk, notes[1].epk);
            assert.equal(page.inputs[1].leafIndex, 2);
        });
    }
});

describe("SyntheticNoteSource", () => {
    const drain = async (source: SyntheticNoteSource, limit: number) => {
        const cms: bigint[] = [];
        let after = 0;
        for (;;) {
            const page = await source.listNotes({ after, limit });
            if (page.inputs.length === 0) return cms;
            cms.push(...page.inputs.map(i => i.cm));
            after = page.nextAfter;
        }
    };

    it("serves every row for full and a filtered subset for matches", async () => {
        const p = pool(3, 16);
        const own = ownIds(3, 500);
        const opts = { pool: toWirePool(p), total: 500, own, gamma: 2, network: IDEAL };

        const full = new SyntheticNoteSource({ ...opts, kind: "full" });
        assert.equal((await drain(full, 64)).length, 500);
        assert.equal(full.tally.rows, 500);
        assert.equal(full.tally.pages, Math.ceil(500 / 64) + 1);

        const matches = new SyntheticNoteSource({ ...opts, kind: "matches" });
        const served = await drain(matches, 64);
        const expected = Array.from({ length: 500 }, (_, i) => i + 1)
            .filter(id => own.includes(id) || isFalsePositive(id, 2)).length;
        assert.equal(served.length, expected);
        for (const mine of p.mine) assert.ok(served.includes(mine.cm));
        assert.ok(matches.tally.wireBytes < full.tally.wireBytes);
    });

    it("keeps the matches resume cursor behind the backfill watermark", async () => {
        const source = new SyntheticNoteSource({
            kind: "matches", pool: toWirePool(pool(1, 8)), total: 1000, own: [500],
            gamma: 1, network: IDEAL, backfilledThrough: 100,
        });
        const page = await source.listNotes({ after: 0, limit: 1000 });
        assert.ok(page.nextAfter > 100);
        assert.equal(page.resumeAfter, 100);
    });
});
