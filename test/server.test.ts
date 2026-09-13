import assert from "node:assert/strict";
import { appendFileSync, mkdtempSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";

import { PayloadTooLargeError, readBody, resolveWithin } from "../server/http";
import { isRecord, ResultsStore } from "../server/results-store";

describe("resolveWithin", () => {
    it("keeps paths under the base", () => {
        assert.equal(resolveWithin("/srv/wasm", "jubjub/pkg/a.js"), "/srv/wasm/jubjub/pkg/a.js");
        assert.equal(resolveWithin("/srv/wasm", "a/../b.js"), "/srv/wasm/b.js");
    });

    it("rejects traversal and sibling prefixes", () => {
        assert.equal(resolveWithin("/srv/wasm", "../secret"), null);
        assert.equal(resolveWithin("/srv/wasm", "../wasm-evil/x"), null);
        assert.equal(resolveWithin("/srv/wasm", "/etc/passwd"), null);
    });
});

describe("ResultsStore", () => {
    it("stamps rows and skips malformed lines", () => {
        const file = join(mkdtempSync(join(tmpdir(), "bench-")), "results.json");
        const store = new ResultsStore(file);
        assert.deepEqual(store.readAll(), []);

        store.append({ meanMs: 1 }, "10.0.0.2");
        appendFileSync(file, "{torn\n");
        store.append({ meanMs: 2 }, undefined);

        const rows = store.readAll();
        assert.deepEqual(rows.map(r => r.meanMs), [1, 2]);
        assert.equal(rows[0].ip, "10.0.0.2");
        assert.match(rows[0].ts, /^\d{4}-\d{2}-\d{2}T/);
    });

    it("accepts only plain objects as rows", () => {
        assert.equal(isRecord({}), true);
        assert.equal(isRecord([]), false);
        assert.equal(isRecord(null), false);
        assert.equal(isRecord(3), false);
    });
});

describe("readBody", () => {
    const request = (...chunks: string[]): IncomingMessage => {
        const stream = new PassThrough();
        for (const c of chunks) stream.write(c);
        stream.end();
        return stream as unknown as IncomingMessage;
    };

    it("buffers a body", async () => {
        assert.equal(await readBody(request("ab", "cd"), 10), "abcd");
    });

    it("rejects an oversized body after draining it", async () => {
        await assert.rejects(readBody(request("abcdef", "ghijkl"), 8), PayloadTooLargeError);
    });
});
