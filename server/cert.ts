// Self-signed cert for the dev server. HTTPS is not optional here: the
// multi-thread Rust prover needs a secure context for SharedArrayBuffer, and
// `localhost` only counts as secure on the host itself — LAN devices need TLS.
//
// The SAN list carries every LAN IPv4 of this machine, so a phone hitting
// https://192.168.x.y:8787 gets a cert that matches the address it typed.
// iOS/Safari reject certs whose SANs miss the IP outright.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { lanIPs } from "./lan.js";

export interface DevCert { key: string; cert: string }

export function ensureSelfSignedCert(certDir: string): DevCert {
    const key = join(certDir, "key.pem");
    const cert = join(certDir, "cert.pem");
    if (existsSync(key) && existsSync(cert)) return { key, cert };

    mkdirSync(certDir, { recursive: true });
    const sans = ["DNS:localhost", "IP:127.0.0.1", ...lanIPs().map(ip => `IP:${ip}`)].join(",");
    const cnfPath = join(certDir, "openssl.cnf");
    writeFileSync(cnfPath, [
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

    execSync(
        `openssl req -x509 -newkey rsa:2048 -keyout "${key}" -out "${cert}" -days 365 -nodes -config "${cnfPath}" -extensions v3`,
        { stdio: "inherit" },
    );
    console.log(`generated self-signed cert at ${certDir}`);
    return { key, cert };
}
