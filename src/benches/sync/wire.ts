// The bytes fmd-webserver would actually send, and the cost of reading them.
//
// The first version of this bench handed `ScanInput` objects straight to
// `syncWallet` and priced a page by `JSON.stringify`-ing one sample row. That
// left out the client's largest non-crypto cost on a firehose sync: parsing the
// response and hex-decoding every field of every row. On a 500k-note chain that
// is half a million `JSON.parse` entries and 1.5M hex decodes, all of it work a
// `matches` sync never does — so leaving it out flattered the strategy that
// fetches everything.
//
// So pages are built as real JSON text and decoded with the SDK's own codecs.
// Per-note hex is precomputed once with the pool, because encoding is the
// server's job and does not belong in a client's timings; assembling and
// decoding a page is what remains, and both are charged to the fetch phase
// where `FmdClient.listNotes` puts them.

import { bytesToHex, hexBytes, hexToBigint } from "@lelantos-org/sdk/core";
import type { ScanInput } from "@lelantos-org/sdk/sync";

import type { SyncStrategyKind } from "./model";

/** Chain the modelled server is serving. Anvil, as everywhere else in the bench. */
const CHAIN_ID = 31337;

/**
 * A pool note's constant half of a wire row: everything from `commitmentHex`
 * on. Only the numeric prefix varies per row, so this is built once per pool
 * entry and concatenated thereafter.
 */
export type RowTail = string;

export function rowTail(note: ScanInput): RowTail {
    return (
        `,"commitmentHex":"0x${note.cm.toString(16).padStart(64, "0")}"` +
        `,"ciphertextHex":"${bytesToHex(note.ciphertext)}"` +
        `,"ephPubPackedHex":"${bytesToHex(note.epk)}"}`
    );
}

/**
 * One row of the response.
 *
 * `/v1/matches` names the row id `noteId` where `/v1/notes` names it `id` —
 * carried through so neither strategy is credited with a payload it does not
 * send.
 */
export function rowText(id: number, tail: RowTail, kind: SyncStrategyKind): string {
    const idField = kind === "matches" ? "noteId" : "id";
    return `{"${idField}":${id},"chainId":${CHAIN_ID},"blockNumber":${id},"leafIndex":${id}${tail}`;
}

/**
 * The full response body.
 *
 * `/v1/notes` answers with a bare array; `/v1/matches` wraps it alongside the
 * backfill watermark. See `FmdClient.listMatches`.
 */
export function pageText(rows: string[], kind: SyncStrategyKind, backfilledThrough: number): string {
    const array = `[${rows.join(",")}]`;
    return kind === "full"
        ? array
        : `{"matches":${array},"backfilledThroughNoteId":${backfilledThrough}}`;
}

/** Decoded page: the rows plus the watermark, mirroring `FmdMatchesPage`. */
export interface DecodedPage {
    inputs: ScanInput[];
    backfilledThroughNoteId: number;
}

/**
 * Parse and decode a response body exactly as `FmdClient` does.
 *
 * The hex codecs are the SDK's own — imported, not reimplemented — so this
 * tracks the real per-row decode cost including its validation, rather than a
 * faster lookalike.
 */
export function decodePage(body: string, kind: SyncStrategyKind): DecodedPage {
    const raw: unknown = JSON.parse(body);
    const rows = kind === "full"
        ? (raw as unknown[])
        : ((raw as { matches: unknown[] }).matches);
    const watermark = kind === "full"
        ? 0
        : (raw as { backfilledThroughNoteId: number }).backfilledThroughNoteId;

    const inputs: ScanInput[] = new Array<ScanInput>(rows.length);
    for (let i = 0; i < rows.length; i++) {
        const d = rows[i] as Record<string, unknown>;
        inputs[i] = {
            ciphertext: hexBytes(d.ciphertextHex, "$.ciphertextHex"),
            epk: hexBytes(d.ephPubPackedHex, "$.ephPubPackedHex"),
            cm: hexToBigint(d.commitmentHex as string),
            leafIndex: d.leafIndex as number,
            blockNumber: d.blockNumber as number,
        };
    }
    return { inputs, backfilledThroughNoteId: watermark };
}

/**
 * Bytes a body occupies uncompressed.
 *
 * A response is hex, digits and JSON punctuation throughout, so every character
 * is one UTF-8 byte and the string length is the byte count — worth using
 * directly rather than encoding half a megabyte per page to count it.
 */
export const byteLength = (body: string): number => body.length;
