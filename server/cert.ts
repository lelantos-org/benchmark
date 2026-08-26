// Self-signed certificate for the dev server. The multi-threaded prover needs a
// secure context for SharedArrayBuffer, and `localhost` counts as secure only on
// the host itself, so LAN devices require TLS.
//
// The SAN list carries every LAN IPv4 of this machine, so a device reaching
// https://192.168.x.y:8787 gets a certificate matching the address it used.
// iOS Safari rejects certificates whose SANs omit the IP.

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
