// results.json: an append-only JSONL log of runs posted by LAN devices.
//
// The row shape is owned by src/benches/proof/api.ts; the store only stamps
// arrival metadata and keeps each line independently parseable.

import { appendFileSync, existsSync, readFileSync } from "node:fs";

export type StoredResult = Record<string, unknown> & { ts: string; ip?: string };

export class ResultsStore {
    constructor(private readonly file: string) {}

    /** Appends one posted row, stamped with arrival time and sender address. */
    append(data: Record<string, unknown>, ip: string | undefined): StoredResult {
        const record: StoredResult = { ts: new Date().toISOString(), ip, ...data };
        appendFileSync(this.file, JSON.stringify(record) + "\n");
        return record;
    }

    /**
     * Every stored row, oldest first. A malformed line — a torn write, a manual
     * edit — is skipped with a warning rather than failing the whole table.
     */
    readAll(): StoredResult[] {
        if (!existsSync(this.file)) return [];
        const rows: StoredResult[] = [];
        readFileSync(this.file, "utf8").split("\n").forEach((line, i) => {
            if (!line.trim()) return;
            try {
                rows.push(JSON.parse(line) as StoredResult);
            } catch {
                console.warn(`results.json:${i + 1}: skipping malformed line`);
            }
        });
        return rows;
    }
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);
