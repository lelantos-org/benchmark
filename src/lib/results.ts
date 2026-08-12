// Turning the raw results.json rows into something comparable across devices.
//
// Rows accumulate over many sessions and many phones, so the chart works on
// aggregates: one entry per (device, shape), summarised by the median of that
// pair's runs. Median rather than mean — a single thermally-throttled outlier
// should not redefine a device.

import type { BenchResult } from "./api";
import { SHAPES, type Shape } from "./sdk-wasm";

/** Rows with no `shape` predate the 2x2/3x3 split; they were all 2x2. */
const LEGACY_SHAPE: Shape = "2x2";

export interface DeviceSeries {
    /** Median of that shape's `meanMs` across runs. */
    medianMeanMs: number;
    runs: number;
}

export interface DeviceRow {
    /** Stable identity — the chart sorts and keys by this, never by rank. */
    key: string;
    label: string;
    browser: string;
    /**
     * Secondary line for the chart: the browser, plus the core count only where
     * that is what separates two otherwise identically-named entries. Always
     * printing cores would truncate on a phone for no gain.
     */
    sub: string;
    cores: number;
    /** True for the device currently looking at the page. */
    isSelf: boolean;
    byShape: Partial<Record<Shape, DeviceSeries>>;
}

const ANDROID_MODEL = /Android[^;)]*;\s*([^;)]+)/;
const ANDROID_BUILD_SUFFIX = /\s+Build.*/i;

const DEVICE_PATTERNS: [RegExp, string][] = [
    [/iPhone/, "iPhone"],
    [/iPad/, "iPad"],
    [/Macintosh|Mac OS X/, "Mac"],
    [/Windows/, "Windows"],
    [/Android/, "Android"],
    [/Linux/, "Linux"],
];

// Order matters: Edge and Opera also claim Chrome, and Chrome also claims Safari.
const BROWSER_PATTERNS: [RegExp, string][] = [
    [/Edg\//, "Edge"],
    [/OPR\//, "Opera"],
    [/Firefox\//, "Firefox"],
    [/Chrome\//, "Chrome"],
    [/Safari\//, "Safari"],
];

/** Short device name from a user-agent — good enough to tell phones apart. */
export function deviceLabel(row: BenchResult): string {
    const ua = row.ua || "";
    // Android UAs carry the actual model, which beats the generic name.
    const model = ANDROID_MODEL.exec(ua)?.[1]?.replace(ANDROID_BUILD_SUFFIX, "").trim();
    if (model) return model;
    // `||`, not `??`: rows come off disk, where a missing field can be "".
    return match(DEVICE_PATTERNS, ua) || row.platform || row.device || "unknown";
}

/** Browser family — a Mac in Safari and in Chrome are different data points. */
export const browserLabel = (row: BenchResult): string =>
    match(BROWSER_PATTERNS, row.ua || "") || "browser";

const match = (patterns: [RegExp, string][], ua: string): string | undefined =>
    patterns.find(([pattern]) => pattern.test(ua))?.[1];

const median = (xs: number[]): number => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
};

interface Sample {
    row: DeviceRow;
    timesByShape: Map<Shape, number[]>;
}

/** One row per device+browser+cores, fastest first. */
export function summariseDevices(rows: BenchResult[], selfUa: string): DeviceRow[] {
    const devices = [...collect(rows, selfUa).values()].map(summarise);
    labelDuplicates(devices);
    return devices.sort((a, b) => sortKey(a) - sortKey(b));
}

/** Buckets every usable row under its device identity. */
function collect(rows: BenchResult[], selfUa: string): Map<string, Sample> {
    const samples = new Map<string, Sample>();

    for (const row of rows) {
        if (typeof row.meanMs !== "number" || !Number.isFinite(row.meanMs)) continue;

        const label = deviceLabel(row);
        const browser = browserLabel(row);
        const cores = row.cores || 0;
        const key = `${label}·${browser}·${cores}`;

        let sample = samples.get(key);
        if (!sample) {
            sample = {
                row: { key, label, browser, sub: browser, cores, isSelf: false, byShape: {} },
                timesByShape: new Map(),
            };
            samples.set(key, sample);
        }
        if (row.ua === selfUa) sample.row.isSelf = true;

        const shape = row.shape ?? LEGACY_SHAPE;
        const times = sample.timesByShape.get(shape) ?? [];
        times.push(row.meanMs);
        sample.timesByShape.set(shape, times);
    }

    return samples;
}

function summarise({ row, timesByShape }: Sample): DeviceRow {
    for (const [shape, times] of timesByShape) {
        row.byShape[shape] = { medianMeanMs: median(times), runs: times.length };
    }
    return row;
}

/** Same name and browser twice means the core count is the distinguishing bit. */
function labelDuplicates(devices: DeviceRow[]): void {
    const counts = new Map<string, number>();
    const name = (d: DeviceRow): string => `${d.label}·${d.browser}`;

    for (const device of devices) counts.set(name(device), (counts.get(name(device)) ?? 0) + 1);
    for (const device of devices) {
        if (device.cores && (counts.get(name(device)) ?? 0) > 1) {
            device.sub = `${device.browser} · ${device.cores}c`;
        }
    }
}

/** Fastest-first, on whichever shape the device actually ran. */
function sortKey(device: DeviceRow): number {
    for (const shape of SHAPES) {
        const series = device.byShape[shape];
        if (series) return series.medianMeanMs;
    }
    return Infinity;
}
