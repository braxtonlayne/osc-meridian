/**
 * TelemetryChart: thin uPlot wrapper styled to the design tokens. Hairline
 * grid, mono ticks, Zulu time axis, no colour coding: series are told apart by
 * line tone and dash, and named in a legend row with the value under the cursor.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './reactor.css';

export interface TelemetrySeries {
  label: string;
  unit: string;
  /** [x, y]: x in Unix seconds (shown as Zulu), y in `unit`. */
  data: [number[], number[]];
  /** Draw as a step trace (states, setpoints). */
  stepped?: boolean;
  digits?: number;
}

export interface TelemetryChartProps {
  series: TelemetrySeries[];
  height: number;
  /** Accessible summary of what the chart shows. */
  label?: string;
}

const STROKES = ['--text-1', '--title-active-bg', '--text-2', '--link', '--chrome-outer'] as const;
const DASHES: (number[] | undefined)[] = [undefined, undefined, [5, 3], [2, 2], [8, 3, 2, 3]];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const LEGEND_H = 22;

function p2(n: number): string {
  return String(n).padStart(2, '0');
}

function sameX(series: TelemetrySeries[]): boolean {
  const first = series[0]?.data[0];
  if (!first) return true;
  return series.every((s) => s.data[0] === first || (s.data[0].length === first.length && s.data[0].every((v, i) => v === first[i])));
}

function align(series: TelemetrySeries[]): uPlot.AlignedData {
  if (series.length === 0) return [[]];
  if (sameX(series)) return [series[0]?.data[0] ?? [], ...series.map((s) => s.data[1])];
  return uPlot.join(series.map((s) => [s.data[0], s.data[1]] as uPlot.AlignedData));
}

function lastFinite(a: ArrayLike<number | null | undefined>): number | null {
  for (let i = a.length - 1; i >= 0; i--) {
    const v = a[i];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

export function TelemetryChart({ series, height, label }: TelemetryChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [tones, setTones] = useState<string[]>([]);
  const units = [...new Set(series.map((s) => s.unit))];
  // Rebuild only when the shape changes; plain data updates go through setData.
  const shape = series.map((s) => `${s.label}|${s.unit}|${s.stepped ? 1 : 0}`).join(';');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const tok = (name: string) => cs.getPropertyValue(name).trim() || cs.color;
    const mono = cs.getPropertyValue('--font-mono').trim() || 'monospace';
    const font = `10px ${mono}`;
    const ink = tok('--text-1');
    const grid = tok('--row-rule');
    const tick = tok('--chrome-shadow');
    const strokes = series.map((_, i) => tok(STROKES[i % STROKES.length] ?? '--text-1'));
    setTones(strokes);
    const stepped = uPlot.paths.stepped ? uPlot.paths.stepped({ align: 1 }) : undefined;

    const axis = (scale: string, side: 1 | 3, showGrid: boolean): uPlot.Axis => ({
      scale,
      side,
      stroke: ink,
      font,
      labelFont: font,
      label: scale,
      labelSize: 14,
      labelGap: 2,
      size: 46,
      gap: 4,
      grid: { show: showGrid, stroke: grid, width: 1 },
      ticks: { stroke: tick, width: 1, size: 4 },
      border: { show: true, stroke: tick, width: 1 },
    });

    const opts: uPlot.Options = {
      width: Math.max(160, el.clientWidth),
      height: Math.max(60, height - LEGEND_H),
      padding: [8, units.length > 1 ? 4 : 12, 0, 0],
      tzDate: (ts) => uPlot.tzDate(new Date(ts * 1e3), 'Etc/UTC'),
      legend: { show: false },
      cursor: { y: false, points: { show: false }, drag: { x: false, y: false } },
      scales: { x: { time: true } },
      axes: [
        {
          stroke: ink,
          font,
          size: 38,
          gap: 4,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: tick, width: 1, size: 4 },
          border: { show: true, stroke: tick, width: 1 },
          values: (_u, splits) => {
            let day = -1;
            return splits.map((t) => {
              const d = new Date(t * 1e3);
              const hm = `${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}Z`;
              const first = d.getUTCDate() !== day;
              day = d.getUTCDate();
              return first ? `${hm}\n${p2(day)} ${MON[d.getUTCMonth()] ?? ''}` : hm;
            });
          },
        },
        ...units.slice(0, 2).map((u, i) => axis(u, i === 0 ? 3 : 1, i === 0)),
      ],
      series: [
        {},
        ...series.map(
          (s, i): uPlot.Series => ({
            label: s.label,
            scale: s.unit,
            stroke: strokes[i],
            width: 1,
            dash: DASHES[i % DASHES.length],
            points: { show: false },
            spanGaps: false,
            ...(s.stepped && stepped ? { paths: stepped } : {}),
          }),
        ),
      ],
      hooks: {
        setCursor: [(u) => setCursor(typeof u.cursor.idx === 'number' ? u.cursor.idx : null)],
      },
    };
    const u = new uPlot(opts, align(series), el);
    plot.current = u;
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const w = el.clientWidth;
            if (w > 0 && w !== u.width) u.setSize({ width: w, height: Math.max(60, height - LEGEND_H) });
          });
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [shape, height]);

  useEffect(() => {
    plot.current?.setData(align(series));
  }, [series]);

  const aligned = plot.current?.data;
  return (
    <div class="rx-chart" style={{ height: `${height}px` }} role="img" aria-label={label ?? `Trend: ${series.map((s) => s.label).join(', ')}`}>
      <div class="rx-chart__plot" ref={host} />
      <div class="rx-chart__legend" aria-hidden="true">
        {series.map((s, i) => {
          const col = aligned?.[i + 1] as ArrayLike<number | null | undefined> | undefined;
          const raw = cursor !== null && col ? col[cursor] : col ? lastFinite(col) : lastFinite(s.data[1]);
          const v = typeof raw === 'number' && Number.isFinite(raw) ? raw.toFixed(s.digits ?? 1) : '----';
          return (
            <span class="rx-chart__key">
              <svg width={22} height={8} viewBox="0 0 22 8">
                <line
                  x1={0}
                  y1={4}
                  x2={22}
                  y2={4}
                  style={{ stroke: tones[i] ?? 'currentColor' }}
                  stroke-width={1.5}
                  stroke-dasharray={(DASHES[i % DASHES.length] ?? []).join(' ')}
                />
              </svg>
              <span class="rx-chart__name">{s.label}</span>
              <span class="rx-chart__val">{v}</span>
              <span class="rx-chart__unit">{s.unit}</span>
            </span>
          );
        })}
        <span class="rx-chart__mode">{cursor !== null ? 'AT CURSOR' : 'LAST'}</span>
      </div>
    </div>
  );
}
