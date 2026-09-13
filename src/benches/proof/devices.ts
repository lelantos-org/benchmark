// Aggregation of raw results.json rows into per-device comparisons.
//
// Rows accumulate across many sessions and devices, so the chart works on
// aggregates: one entry per (device, shape), summarised by the median of that
// pair's runs. Median rather than mean, so a single thermally-throttled outlier
// does not redefine a device.

import { isShape, SHAPES, type Shape } from "../../../shared/circuits";
import { median } from "../../lib/stats";
import type { BenchResult } from "./api";

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

type Patterns = readonly (readonly [RegExp, string])[];

const ANDROID_MODEL = /Android[^;)]*;\s*([^;)]+)/;
const ANDROID_BUILD_SUFFIX = /\s+Build.*/i;

const DEVICE_PATTERNS: Patterns = [
    [/iPhone/, "iPhone"],
    [/iPad/, "iPad"],
    [/Macintosh|Mac OS X/, "Mac"],
    [/Windows/, "Windows"],
    [/Android/, "Android"],
    [/Linux/, "Linux"],
];

// Order matters: Edge and Opera also claim Chrome, and Chrome also claims Safari.
const BROWSER_PATTERNS: Patterns = [
    [/Edg\//, "Edge"],
    [/OPR\//, "Opera"],
    [/Firefox\//, "Firefox"],
    [/Chrome\//, "Chrome"],
    [/Safari\//, "Safari"],
];

const firstMatch = (patterns: Patterns, ua: string): string | undefined =>
    patterns.find(([pattern]) => pattern.test(ua))?.[1];

// `||` rather than `??` throughout: rows come off disk, where a missing field
// can be an empty string.

/** Short device name derived from a user-agent. */
export function deviceLabel(row: BenchResult): string {
    const ua = row.ua || "";
    // Android user-agents carry the model, which is more specific than the
    // generic platform name.
    const model = ANDROID_MODEL.exec(ua)?.[1]?.replace(ANDROID_BUILD_SUFFIX, "").trim();
    return model || firstMatch(DEVICE_PATTERNS, ua) || row.platform || row.device || "unknown";
}

/** Browser family; the same machine under Safari and Chrome are distinct points. */
export const browserLabel = (row: BenchResult): string =>
    firstMatch(BROWSER_PATTERNS, row.ua || "") || "browser";

/** One row per device, browser and core count, fastest first. */
export function summariseDevices(rows: readonly BenchResult[], selfUa: string): DeviceRow[] {
    const devices = new Map<string, { row: DeviceRow; times: Map<Shape, number[]> }>();

    for (const result of rows) {
        if (typeof result.meanMs !== "number" || !Number.isFinite(result.meanMs)) continue;
        // Rows from earlier circuit sets measured arities the current circuits no
        // longer ship; their times are not comparable, so they are left to the
        // table rather than aggregated into the chart.
        if (!result.shape || !isShape(result.shape)) continue;

        const label = deviceLabel(result);
        const browser = browserLabel(result);
        const cores = result.cores || 0;
        const key = `${label}·${browser}·${cores}`;

        let device = devices.get(key);
        if (!device) {
            device = {
                row: { key, label, browser, sub: browser, cores, isSelf: false, byShape: {} },
                times: new Map(),
            };
            devices.set(key, device);
        }
        if (result.ua === selfUa) device.row.isSelf = true;

        const times = device.times.get(result.shape);
        if (times) times.push(result.meanMs);
        else device.times.set(result.shape, [result.meanMs]);
    }

    const summary = [...devices.values()].map(({ row, times }) => {
        for (const [shape, xs] of times) row.byShape[shape] = { medianMeanMs: median(xs), runs: xs.length };
        return row;
    });
    disambiguateByCores(summary);
    return summary.sort((a, b) => sortKey(a) - sortKey(b));
}

/** Where a name and browser repeat, the core count is the distinguishing field. */
function disambiguateByCores(devices: DeviceRow[]): void {
    const name = (d: DeviceRow): string => `${d.label}·${d.browser}`;
    const counts = new Map<string, number>();
    for (const d of devices) counts.set(name(d), (counts.get(name(d)) ?? 0) + 1);
    for (const d of devices) {
        if (d.cores && (counts.get(name(d)) ?? 0) > 1) d.sub = `${d.browser} · ${d.cores}c`;
    }
}

/** Sort key: the first shape, in circuit order, the device actually ran. */
function sortKey(device: DeviceRow): number {
    for (const shape of SHAPES) {
        const series = device.byShape[shape];
        if (series) return series.medianMeanMs;
    }
    return Infinity;
}
