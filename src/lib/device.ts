export interface DeviceInfo {
    ua: string;
    platform: string;
    cores: number;
    memGB: number | null;
    viewport: string;
}

export function deviceInfo(): DeviceInfo {
    const nav = navigator as Navigator & { deviceMemory?: number };
    return {
        ua: nav.userAgent,
        platform: nav.platform,
        cores: nav.hardwareConcurrency || 0,
        memGB: nav.deviceMemory ?? null,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
}
