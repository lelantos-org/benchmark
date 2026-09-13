// Minimal response helpers for the bench middleware. Every response carries the
// cross-origin isolation headers: see `ISOLATION_HEADERS`.

import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, isAbsolute, relative, resolve } from "node:path";

/**
 * Cross-origin isolation for the multi-threaded prover: SharedArrayBuffer
 * (wasm-bindgen-rayon) is only exposed to isolated pages, and every script the
 * page runs — module workers included — must be served with these.
 */
export const ISOLATION_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
} as const;

export const BENCH_HEADERS = {
    ...ISOLATION_HEADERS,
    "Access-Control-Allow-Origin": "*",
} as const;

const MIME: Record<string, string> = {
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".wasm": "application/wasm",
    ".zkey": "application/octet-stream",
};

export const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";
export const CACHE_NONE = "no-store";

export function send(res: ServerResponse, status: number, body: string, type = "text/plain; charset=utf-8"): void {
    res.writeHead(status, { "Content-Type": type, ...BENCH_HEADERS });
    res.end(body);
}

export function sendJson(res: ServerResponse, status: number, value: unknown): void {
    send(res, status, JSON.stringify(value), "application/json; charset=utf-8");
}

/** Streams a regular file, or answers 404. HEAD requests get headers only. */
export function streamFile(req: IncomingMessage, res: ServerResponse, path: string, cacheControl: string): void {
    const st = existsSync(path) ? statSync(path) : null;
    if (!st?.isFile()) return send(res, 404, "not found");

    res.writeHead(200, {
        "Content-Type": MIME[extname(path).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": st.size,
        "Cache-Control": cacheControl,
        ...BENCH_HEADERS,
    });
    if (req.method === "HEAD") return void res.end();

    createReadStream(path)
        .on("error", () => res.destroy())
        .pipe(res);
}

/** Resolves `rel` under `base`, or `null` if it would escape it. */
export function resolveWithin(base: string, rel: string): string | null {
    const file = resolve(base, rel);
    const offset = relative(base, file);
    return offset.startsWith("..") || isAbsolute(offset) ? null : file;
}

export class PayloadTooLargeError extends Error {}

/**
 * Buffers a request body, rejecting once it exceeds `limitBytes`. The rest of
 * an oversized body is drained rather than the socket destroyed, so the caller
 * can still answer with a status.
 */
export function readBody(req: IncomingMessage, limitBytes: number): Promise<string> {
    return new Promise((resolveBody, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size <= limitBytes) chunks.push(chunk);
        });
        req.on("end", () => {
            if (size > limitBytes) reject(new PayloadTooLargeError(`body exceeds ${limitBytes} bytes`));
            else resolveBody(Buffer.concat(chunks).toString("utf8"));
        });
        req.on("error", reject);
    });
}
