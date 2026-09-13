import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { barPath, niceTicks, timeScale, truncate } from "../src/lib/chart";
import { formatMB, formatMsInt, formatWhen, plural } from "../src/lib/format";
import { clamp, requireInt } from "../src/lib/math";
import { median, stats } from "../src/lib/stats";

describe("stats", () => {
    it("summarises a sample, taking the upper middle for even n", () => {
        assert.deepEqual(stats([4, 1, 3, 2]), { mean: 2.5, median: 3, min: 1, max: 4 });
        assert.equal(median([5, 1, 3]), 3);
    });

    it("rejects an empty sample", () => {
        assert.throws(() => stats([]));
        assert.throws(() => median([]));
    });

    it("does not reorder its input", () => {
        const xs = [3, 1, 2];
        stats(xs);
        assert.deepEqual(xs, [3, 1, 2]);
    });
});

describe("chart", () => {
    it("ends ticks on a round value covering the peak", () => {
        assert.deepEqual(niceTicks(873), [0, 500, 1000]);
        assert.deepEqual(niceTicks(0), [0, 1]);
        for (const tick of niceTicks(0.7)) assert.equal(tick, Number(tick.toPrecision(12)));
    });

    it("picks one axis unit from the data peak", () => {
        assert.equal(timeScale(873).unit, "ms");
        const s = timeScale(3249);
        assert.equal(s.unit, "s");
        assert.equal(s.format(3249), "3.25");
        assert.equal(s.formatTick(2000), "2");
    });

    it("truncates labels to the gutter", () => {
        assert.equal(truncate("iPhone", 150), "iPhone");
        assert.equal(truncate("a very long device label indeed", 84), "a very lo…");
    });

    it("draws nothing for a non-positive bar", () => {
        assert.equal(barPath(0, 0, 0, 16, 4), "");
        assert.match(barPath(10, 0, 50, 16, 4), /^M10,0 /);
    });
});

describe("format", () => {
    it("formats timings, sizes and timestamps", () => {
        assert.equal(formatMsInt(1234.6), "1,235");
        assert.equal(formatMsInt(undefined), "");
        assert.equal(formatMsInt(Number.NaN), "");
        assert.equal(formatMB(2_345_678), "2.35");
        assert.equal(formatWhen("2026-08-25T10:11:12.000Z"), "2026-08-25 10:11");
        assert.equal(plural(1, "run"), "1 run");
        assert.equal(plural(1200, "line"), "1,200 lines");
    });
});

describe("math", () => {
    it("clamps, with min winning an empty range", () => {
        assert.equal(clamp(5, 0, 1), 1);
        assert.equal(clamp(-1, 0, 1), 0);
        assert.equal(clamp(5, 10, 0), 10);
    });

    it("validates user integers", () => {
        assert.equal(requireInt("n", 5, 1, 10), 5);
        assert.throws(() => requireInt("n", Number.NaN, 1, 10), /n must be an integer/);
        assert.throws(() => requireInt("n", 0, 1, 10));
        assert.throws(() => requireInt("n", 1.5, 1, 10));
    });
});
