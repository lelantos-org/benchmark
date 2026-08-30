// Mean prove time per device, grouped by circuit shape.
//
// Grouped horizontal bars: device names are long and read better in a left
// gutter than under vertical columns. The results table below presents the same
// numbers, so no value here is reachable only by hover.

import { useMemo, useState } from "react";

import { useElementWidth } from "../hooks/useElementWidth";
import type { BenchResult } from "../lib/api";
import { barPath, clamp, niceTicks, timeScale, truncate, type TimeScale } from "../lib/chart";
import { formatCount } from "../lib/format";
import { summariseDevices, type DeviceRow } from "../lib/results";
import { SHAPES, type Shape } from "../../shapes";

/** Devices shown in the chart; the remainder appear only in the table. */
const MAX_DEVICES = 10;

const BAR_H = 16;
const BAR_GAP = 2;         // gap between the bars of one group
const GROUP_PAD = 18;
const HIT_PAD = 4;         // extends each bar's hover/focus target past the mark
const PAD_TOP = 6;
const AXIS_BAND = 26;      // space for the x tick labels inside the SVG
const VALUE_GUTTER = 60;   // space for the value label past the longest bar
const END_RADIUS = 4;
const TOOLTIP_INSET = 80;  // keeps a centred tooltip clear of either edge

/** Colour is keyed to the shape, not to its position in the sorted data. */
const SERIES_SLOT: Record<Shape, string> = {
    "4x6": "series-1",
};

interface Hover {
    x: number;
    y: number;
    device: DeviceRow;
    shape: Shape;
    ms: number;
    runs: number;
}

export function DeviceChart({ rows, selfUa }: { rows: BenchResult[]; selfUa: string }) {
    const [box, width] = useElementWidth<HTMLElement>();
    const [hover, setHover] = useState<Hover | null>(null);

    // The pointer moves far more often than results arrive, so summarisation is
    // memoised rather than repeated per hover.
    const all = useMemo(() => summariseDevices(rows, selfUa), [rows, selfUa]);
    const devices = useMemo(() => all.slice(0, MAX_DEVICES), [all]);
    const shapes = useMemo(() => SHAPES.filter(s => devices.some(d => d.byShape[s])), [devices]);

    if (devices.length === 0 || shapes.length === 0) return null;

    const groupH = shapes.length * BAR_H + (shapes.length - 1) * BAR_GAP + GROUP_PAD;
    const height = PAD_TOP + devices.length * groupH + AXIS_BAND;
    const labelGutter = Math.max(84, Math.min(150, width * 0.28));
    const plotW = Math.max(60, width - labelGutter - VALUE_GUTTER);

    const peak = Math.max(...devices.flatMap(d => shapes.map(s => d.byShape[s]?.medianMeanMs ?? 0)));
    const ticks = niceTicks(peak);
    const domain = ticks[ticks.length - 1] || 1;
    const scale = timeScale(peak);
    const x = (ms: number): number => labelGutter + (ms / domain) * plotW;

    return (
        <figure className="chart" ref={box}>
            <figcaption>
                <h3>Mean prove time by device</h3>
                <p className="sub">
                    Median across recorded runs, in {scale.unit === "ms" ? "milliseconds" : "seconds"} · lower is faster
                </p>
            </figcaption>

            {shapes.length > 1 && (
                <ul className="legend">
                    {shapes.map(shape => (
                        <li key={shape}>
                            <span className={`swatch ${SERIES_SLOT[shape]}`} aria-hidden="true" />
                            {shape}
                        </li>
                    ))}
                </ul>
            )}

            <div className="chart-plot">
                {width > 0 && (
                    <svg width={width} height={height} role="img"
                        aria-label={`Mean prove time for ${formatCount(devices.length)} devices, in ${scale.unit}`}>
                        {ticks.map(tick => (
                            <g key={tick}>
                                <line className="grid" x1={x(tick)} x2={x(tick)} y1={PAD_TOP} y2={height - AXIS_BAND} />
                                <text className="tick" x={x(tick)} y={height - AXIS_BAND + 16} textAnchor="middle">
                                    {scale.formatTick(tick)}
                                </text>
                            </g>
                        ))}
                        <line className="axis" x1={labelGutter} x2={labelGutter} y1={PAD_TOP} y2={height - AXIS_BAND} />

                        {devices.map((device, i) => (
                            <DeviceGroup key={device.key} device={device} shapes={shapes} scale={scale}
                                top={PAD_TOP + i * groupH} groupH={groupH} labelGutter={labelGutter}
                                plotW={plotW} x={x} onHover={setHover} />
                        ))}
                    </svg>
                )}

                {hover && (
                    // Visual echo of the focused bar's aria-label; hidden from
                    // assistive technology to avoid announcing it twice.
                    <div className="tooltip" aria-hidden="true"
                        style={{ left: clamp(hover.x, TOOLTIP_INSET, width - TOOLTIP_INSET), top: hover.y }}>
                        <strong>{scale.format(hover.ms)} {scale.unit}</strong>
                        <span className="tooltip-key">
                            <span className={`stroke ${SERIES_SLOT[hover.shape]}`} aria-hidden="true" />
                            {hover.shape} · {hover.device.label} · {hover.device.browser}
                        </span>
                        <span className="tooltip-meta">
                            {hover.device.cores || "?"} cores · median of {formatCount(hover.runs)} run{hover.runs === 1 ? "" : "s"}
                        </span>
                    </div>
                )}
            </div>

            {all.length > devices.length && (
                <p className="note">
                    Showing the {MAX_DEVICES} fastest devices; {all.length - devices.length} more are in the table below.
                </p>
            )}
        </figure>
    );
}

interface DeviceGroupProps {
    device: DeviceRow;
    shapes: Shape[];
    scale: TimeScale;
    top: number;
    groupH: number;
    labelGutter: number;
    plotW: number;
    x: (ms: number) => number;
    onHover: (hover: Hover | null) => void;
}

/** One device's label pair and one bar per shape. */
function DeviceGroup({ device, shapes, scale, top, groupH, labelGutter, plotW, x, onHover }: DeviceGroupProps) {
    return (
        <g>
            <text className={`device ${device.isSelf ? "self" : ""}`}
                x={labelGutter - 10} y={top + groupH / 2 - 4} textAnchor="end" dominantBaseline="middle">
                {truncate(device.label, labelGutter)}
            </text>
            <text className="device-sub" x={labelGutter - 10} y={top + groupH / 2 + 10}
                textAnchor="end" dominantBaseline="middle">
                {truncate(device.sub, labelGutter, 5.2)}
            </text>

            {shapes.map((shape, j) => {
                const series = device.byShape[shape];
                if (!series) return null;

                const y = top + j * (BAR_H + BAR_GAP);
                const tip = x(series.medianMeanMs);
                const value = `${scale.format(series.medianMeanMs)} ${scale.unit}`;
                const show = (): void => onHover({
                    x: tip, y: y + BAR_H / 2, device, shape,
                    ms: series.medianMeanMs, runs: series.runs,
                });

                return (
                    <g key={shape} className="bar-group" tabIndex={0} role="img"
                        aria-label={`${device.label}, ${device.browser}, ${shape}: ${value}`}
                        onPointerEnter={show} onFocus={show}
                        onPointerLeave={() => onHover(null)} onBlur={() => onHover(null)}>
                        <path className={SERIES_SLOT[shape]}
                            d={barPath(labelGutter, y, tip - labelGutter, BAR_H, END_RADIUS)} />
                        <text className="value" x={tip + 8} y={y + BAR_H / 2} dominantBaseline="middle">
                            {scale.format(series.medianMeanMs)}
                        </text>
                        {/* Transparent target spanning the plot: a 16px bar is
                            too small a pointer target on its own. */}
                        <rect className="hit" x={labelGutter} y={y - HIT_PAD}
                            width={plotW} height={BAR_H + HIT_PAD * 2} />
                    </g>
                );
            })}
        </g>
    );
}
