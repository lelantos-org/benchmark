// Aggregation of raw results.json rows into per-device comparisons.
//
// Rows accumulate across many sessions and devices, so the chart works on
// aggregates: one entry per (device, shape), summarised by the median of that
// pair's runs. Median rather than mean, so a single thermally-throttled outlier
// does not redefine a device.

import type { BenchResult } from "./api";
import { SHAPES, isShape, type Shape } from "../../shapes";

export interface DeviceSeries {
    /** Median of that shape's `meanMs` across runs. */
    medianMeanMs: number;
    runs: number;
}

export interface DeviceRow {
    /** Stable identity; the chart sorts and keys by this rather than by rank. */
    key: string;
    label: string;
    browser: string;
    /**
     * Secondary chart line: the browser, plus the core count only where that is
     * what separates two otherwise identically-named entries. Printing cores
     * unconditionally truncates on narrow screens.
     */
    sub: string;
    cores: number;
    /** True for the device currently viewing the page. */
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

/** Short device name derived from a user-agent. */
export function deviceLabel(row: BenchResult): string {
    const ua = row.ua || "";
    // Android user-agents carry the model, which is more specific than the
    // generic platform name.
    const model = ANDROID_MODEL.exec(ua)?.[1]?.replace(ANDROID_BUILD_SUFFIX, "").trim();
    if (model) return model;
    // `||` rather than `??`: rows come off disk, where a missing field can
    // be an empty string.
    return match(DEVICE_PATTERNS, ua) || row.platform || row.device || "unknown";
}

/** Browser family; the same machine under Safari and Chrome are distinct points. */
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

/** One row per device, browser and core count, fastest first. */
export function summariseDevices(rows: BenchResult[], selfUa: string): DeviceRow[] {
    const devices = [...collect(rows, selfUa).values()].map(summarise);
    labelDuplicates(devices);
    return devices.sort((a, b) => sortKey(a) - sortKey(b));
}

/** Buckets each usable row under its device identity. */
function collect(rows: BenchResult[], selfUa: string): Map<string, Sample> {
    const samples = new Map<string, Sample>();

    for (const row of rows) {
        if (typeof row.meanMs !== "number" || !Number.isFinite(row.meanMs)) continue;
        // Rows from earlier circuit sets measured arities the current circuits no
        // longer ship; their times are not comparable, so they are left to the
        // table rather than aggregated into the chart.
        const shape = row.shape;
        if (!shape || !isShape(shape)) continue;

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

/** Where a name and browser repeat, the core count is the distinguishing field. */
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

/** Sort key: the fastest shape the device actually ran. */
function sortKey(device: DeviceRow): number {
    for (const shape of SHAPES) {
        const series = device.byShape[shape];
        if (series) return series.medianMeanMs;
    }
    return Infinity;
}
