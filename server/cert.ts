// Self-signed certificate for the dev server. The multi-threaded prover needs a
// secure context for SharedArrayBuffer, and `localhost` counts as secure only on
// the host itself, so LAN devices require TLS.
//
// The SAN list carries every LAN IPv4 of this machine, so a device reaching
// https://192.168.x.y:8787 gets a certificate matching the address it used.
// iOS Safari rejects certificates whose SANs omit the IP.

import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { lanIPs } from "./lan.js";

export interface DevCert {
    key: string;
    cert: string;
}

const VALIDITY_DAYS = 365;

export function ensureSelfSignedCert(certDir: string): DevCert {
    const paths: DevCert = { key: join(certDir, "key.pem"), cert: join(certDir, "cert.pem") };
    const ips = ["127.0.0.1", ...lanIPs()];

    const stale = staleReason(paths, ips);
    if (!stale) return paths;

    console.log(`regenerating self-signed cert: ${stale}`);
    generate(certDir, paths, ips);
    console.log(`generated self-signed cert at ${certDir}`);
    return paths;
}

/**
 * Why the existing certificate cannot be reused, or `null` if it can. A laptop
 * that moved networks has a new LAN address, and a cert without it is rejected
 * by the very devices the bench exists for.
 */
function staleReason({ key, cert }: DevCert, ips: string[]): string | null {
    if (!existsSync(key) || !existsSync(cert)) return "none on disk";
    let x509: X509Certificate;
    try {
        x509 = new X509Certificate(readFileSync(cert));
    } catch {
        return "unreadable";
    }
    if (new Date(x509.validTo).getTime() <= Date.now()) return "expired";

    const sans = x509.subjectAltName ?? "";
    const missing = ips.filter(ip => !sans.includes(`IP Address:${ip}`));
    return missing.length > 0 ? `SAN lacks ${missing.join(", ")}` : null;
}

function generate(certDir: string, { key, cert }: DevCert, ips: string[]): void {
    mkdirSync(certDir, { recursive: true });
    const sans = ["DNS:localhost", ...ips.map(ip => `IP:${ip}`)].join(",");
    const config = join(certDir, "openssl.cnf");
    writeFileSync(config, [
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
    ].join("\n"));

    execFileSync("openssl", [
        "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", key, "-out", cert,
        "-days", String(VALIDITY_DAYS),
        "-config", config, "-extensions", "v3",
    ], { stdio: "inherit" });
}
