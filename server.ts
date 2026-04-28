// LAN bench server. Static UI + circuit artifacts + ark-circom wasm pkg.
// Multi-thread Rust prover requires secure context (HTTPS or localhost).

import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "http";
import { createServer as createHttpsServer } from "https";
import {
    appendFileSync, createReadStream, existsSync, mkdirSync,
    readFileSync, statSync, writeFileSync,
} from "fs";
import { execSync } from "child_process";
import { networkInterfaces } from "os";
import { extname, join, normalize, resolve } from "path";

// ── paths & config ──────────────────────────────────────────────────────────
const ROOT = resolve(__dirname, "..");
const PUBLIC = resolve(__dirname, "public");
const RUST_PROVER_PKG = resolve(__dirname, "rust-prover-pkg");
const RESULTS = resolve(__dirname, "results.json");
const CIRCUITS = resolve(ROOT, "circuits", "build");

const FILES = {
    "/2x2.wasm":             resolve(CIRCUITS, "2x2_js", "2x2.wasm"),
    "/2x2_final.zkey":       resolve(CIRCUITS, "2x2_final.zkey"),
    "/witness_calculator.js":resolve(CIRCUITS, "2x2_js", "witness_calculator.js"),
};

const PORT = parseInt(process.env.PORT ?? "8787", 10);
const USE_HTTPS = process.env.HTTPS === "1";
const CERT_DIR = resolve(__dirname, ".certs");
const CERT_KEY = join(CERT_DIR, "key.pem");
const CERT_CRT = join(CERT_DIR, "cert.pem");

const MIME: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".wasm": "application/wasm",
    ".zkey": "application/octet-stream",
};

// SAB / wasm-bindgen-rayon need cross-origin isolation.
const COI_HEADERS = {
    "Cross-Origin-Opener-Policy":   "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
} as const;

// ── helpers ─────────────────────────────────────────────────────────────────
function lanIPs(): string[] {
    const ifs = networkInterfaces();
    return Object.values(ifs).flat()
        .filter((a): a is NonNullable<typeof a> => !!a && a.family === "IPv4" && !a.internal)
        .map(a => a.address);
}

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((res, rej) => {
        const chunks: Buffer[] = [];
        req.on("data", c => chunks.push(c));
        req.on("end", () => res(Buffer.concat(chunks).toString("utf8")));
        req.on("error", rej);
    });
}

function send(res: ServerResponse, status: number, body: string, type = "text/plain") {
    res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*", ...COI_HEADERS });
    res.end(body);
}

function streamFile(res: ServerResponse, path: string) {
    if (!existsSync(path)) return send(res, 404, "not found");
    const st = statSync(path);
    if (st.isDirectory()) return send(res, 404, "is a directory");
    const ext = extname(path).toLowerCase();
    const longCache = ext === ".wasm" || ext === ".zkey";
    res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": st.size,
        "Cache-Control": longCache ? "public, max-age=31536000, immutable" : "no-store",
        "Access-Control-Allow-Origin": "*",
        ...COI_HEADERS,
    });
    createReadStream(path).pipe(res);
}

function safeJoin(base: string, rel: string): string | null {
    const file = join(base, normalize(rel).replace(/^(\.\.[\/\\])+/, ""));
    return file.startsWith(base) ? file : null;
}

// ── self-signed cert (HTTPS mode) ───────────────────────────────────────────
function ensureSelfSignedCert() {
    if (existsSync(CERT_KEY) && existsSync(CERT_CRT)) return;
    mkdirSync(CERT_DIR, { recursive: true });
    const sans = ["DNS:localhost", "IP:127.0.0.1", ...lanIPs().map(ip => `IP:${ip}`)].join(",");
    const cnf = [
        "[req]",
        "distinguished_name = dn",
        "x509_extensions = v3",
        "prompt = no",
        "",
        "[dn]",
        "CN = lelantos-bench",
        "",
        "[v3]",
        `subjectAltName = ${sans}`,
        "basicConstraints = CA:FALSE",
        "keyUsage = digitalSignature, keyEncipherment",
        "extendedKeyUsage = serverAuth",
        "",
    ].join("\n");
    const cnfPath = join(CERT_DIR, "openssl.cnf");
    writeFileSync(cnfPath, cnf);
    execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${CERT_KEY}" -out "${CERT_CRT}" -days 365 -nodes -config "${cnfPath}" -extensions v3`,
        { stdio: "inherit" },
    );
    console.log(`generated self-signed cert at ${CERT_DIR}`);
}

// ── request handlers ────────────────────────────────────────────────────────
async function handlePostResult(req: IncomingMessage, res: ServerResponse) {
    try {
        const data = JSON.parse(await readBody(req));
        const record = { ts: new Date().toISOString(), ip: req.socket.remoteAddress, ...data };
        appendFileSync(RESULTS, JSON.stringify(record) + "\n");
        console.log(`result <- ${record.ip} ${record.device ?? ""} mean=${record.meanMs?.toFixed?.(0)}ms`);
        send(res, 200, JSON.stringify({ ok: true }), "application/json");
    } catch (e: any) {
        send(res, 400, JSON.stringify({ error: e.message }), "application/json");
    }
}

function handleGetResults(res: ServerResponse) {
    if (!existsSync(RESULTS)) return send(res, 200, "[]", "application/json");
    const lines = readFileSync(RESULTS, "utf8").trim().split("\n").filter(Boolean);
    send(res, 200, "[" + lines.join(",") + "]", "application/json");
}

const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const path = new URL(req.url ?? "/", `http://${req.headers.host}`).pathname;

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.end();
    }

    if (req.method === "POST" && path === "/result")  return handlePostResult(req, res);
    if (req.method === "GET"  && path === "/results") return handleGetResults(res);

    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "method not allowed");

    if (path in FILES) return streamFile(res, FILES[path as keyof typeof FILES]);

    if (path === "/rust-prover" || path === "/rust-prover/") {
        return streamFile(res, join(RUST_PROVER_PKG, "rust_prover.js"));
    }
    if (path.startsWith("/rust-prover/")) {
        const file = safeJoin(RUST_PROVER_PKG, path.slice("/rust-prover/".length));
        return file ? streamFile(res, file) : send(res, 403, "forbidden");
    }

    const file = safeJoin(PUBLIC, path === "/" ? "index.html" : path);
    return file ? streamFile(res, file) : send(res, 403, "forbidden");
};

// ── boot ────────────────────────────────────────────────────────────────────
for (const p of [...Object.values(FILES), join(PUBLIC, "input.json")]) {
    if (!existsSync(p)) console.warn(`WARN: missing ${p}`);
}
if (!existsSync(RUST_PROVER_PKG)) {
    console.warn(`WARN: missing ${RUST_PROVER_PKG} — run 'just rust-prover-build' first`);
}

const proto = USE_HTTPS ? "https" : "http";
const server = USE_HTTPS
    ? (ensureSelfSignedCert(), createHttpsServer({ key: readFileSync(CERT_KEY), cert: readFileSync(CERT_CRT) }, handler))
    : createHttpServer(handler);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`bench server listening on 0.0.0.0:${PORT} (${proto})`);
    console.log(`local:    ${proto}://localhost:${PORT}`);
    for (const ip of lanIPs()) console.log(`lan:      ${proto}://${ip}:${PORT}`);
    console.log(`results:  ${RESULTS}`);
    if (USE_HTTPS) {
        console.log("note: self-signed cert. iPhone must visit URL once and accept the cert warning.");
    } else {
        console.log("note: HTTPS disabled. multi-thread Rust prover needs secure context — set HTTPS=1.");
    }
});
