import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BenchResult } from "../src/benches/proof/api";
import { browserLabel, deviceLabel, summariseDevices } from "../src/benches/proof/devices";

const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const PIXEL = "Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP4A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0 Mobile Safari/537.36";

const row = (over: Partial<BenchResult>): BenchResult => ({
    ua: MAC_CHROME,
    platform: "MacIntel",
    cores: 16,
    memGB: 8,
    viewport: "1x1",
    shape: "4x6",
    iters: 5,
    timesMs: [],
    meanMs: 100,
    medianMs: 100,
    minMs: 100,
    maxMs: 100,
    prepareMs: 0,
    sdkLogs: [],
    ...over,
});

describe("user-agent labels", () => {
    it("names devices and browsers", () => {
        assert.equal(deviceLabel(row({})), "Mac");
        assert.equal(browserLabel(row({})), "Chrome");
        assert.equal(deviceLabel(row({ ua: IPHONE })), "iPhone");
        assert.equal(browserLabel(row({ ua: IPHONE })), "Safari");
        assert.equal(deviceLabel(row({ ua: PIXEL })), "Pixel 9");
    });

    it("falls back to platform, then to unknown", () => {
        assert.equal(deviceLabel(row({ ua: "curl/8", platform: "Plan9" })), "Plan9");
        assert.equal(deviceLabel(row({ ua: "", platform: "" })), "unknown");
    });
});

describe("summariseDevices", () => {
    it("takes the median per device and sorts fastest first", () => {
        const devices = summariseDevices([
            row({ meanMs: 900, ua: IPHONE, cores: 4 }),
            row({ meanMs: 100 }),
            row({ meanMs: 300 }),
            row({ meanMs: 200 }),
        ], IPHONE);

        assert.deepEqual(devices.map(d => d.label), ["Mac", "iPhone"]);
        assert.deepEqual(devices[0].byShape["4x6"], { medianMeanMs: 200, runs: 3 });
        assert.equal(devices[1].isSelf, true);
        assert.equal(devices[0].isSelf, false);
    });

    it("skips shapes the installed circuits no longer ship", () => {
        assert.deepEqual(summariseDevices([row({ shape: "3x3" }), row({ meanMs: Number.NaN })], ""), []);
    });

    it("adds cores only where they disambiguate", () => {
        const devices = summariseDevices([row({ cores: 8 }), row({ cores: 16 }), row({ ua: IPHONE })], "");
        const subs = devices.map(d => d.sub).sort();
        assert.deepEqual(subs, ["Chrome · 16c", "Chrome · 8c", "Safari"]);
    });
});
