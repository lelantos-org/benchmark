import { networkInterfaces } from "node:os";

/** Non-loopback IPv4 addresses — the URLs phones on the LAN can reach. */
export function lanIPs(): string[] {
    return Object.values(networkInterfaces()).flat()
        .filter((a): a is NonNullable<typeof a> => !!a && a.family === "IPv4" && !a.internal)
        .map(a => a.address);
}
