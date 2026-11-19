/**
 * Trend recorder (uPlot, loaded on first use so it stays out of the shell chunk). X axis is plant
 * time in hours before the latest sample (the panel runs on the seal drill timebase), Y in the
 * series unit. Series are told apart by tone and dash, as on the reactor trend plots.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type uPlotT from 'uplot';

export interface TrendSeries {
  label: string;
  values: (number | null)[];
}

export interface TrendProps {
  /** Plant hours relative to the latest sample (<= 0). */
  x: number[];
  series: TrendSeries[];
  unit: string;
  height: number;
  label: string;
  /** Horizontal limit lines (drawn dashed). */
  limits?: { value: number; label: string }[];
}

const STROKES = ['--text-1', '--title-active-bg', '--text-2', '--link'] as const;
const DASHES: (number[] | undefined)[] = [undefined, [5, 3], [2, 2], [8, 3, 2, 3]];

type UPlotCtor = typeof uPlotT;
let loader: Promise<UPlotCtor> | null = null;
function loadUPlot(): Promise<UPlotCtor> {
  loader ??= Promise.all([import('uplot'), import('uplot/dist/uPlot.min.css')]).then(([m]) => m.default);
  return loader;
}

export function Trend({ x, series, unit, height, label, limits = [] }: TrendProps) {
  const host = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlotT | null>(null);
  const [Ctor, setCtor] = useState<UPlotCtor | null>(null);
  const [failed, setFailed] = useState(false);
  const shape = `${series.map((s) => s.label).join('|')}|${unit}|${limits.map((l) => l.value).join(',')}`;

  useEffect(() => {
    let live = true;
    loadUPlot()
      .then((c) => live && setCtor(() => c))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const data = (): uPlotT.AlignedData => [x, ...series.map((s) => s.values), ...limits.map((l) => x.map(() => l.value))];

  useEffect(() => {
    const el = host.current;
    if (!Ctor || !el) return;
    const cs = getComputedStyle(el);
    const tok = (n: string) => cs.getPropertyValue(n).trim() || cs.color;
    const font = `10px ${cs.getPropertyValue('--font-mono').trim() || 'monospace'}`;
    const ink = tok('--text-1');
    const grid = tok('--row-rule');
    const tick = tok('--chrome-shadow');
    const opts: uPlotT.Options = {
      width: Math.max(200, el.clientWidth),
      height,
      padding: [8, 12, 0, 0],
      legend: { show: true, live: true },
      cursor: { y: false, points: { show: false }, drag: { x: false, y: false } },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: ink,
          font,
          size: 30,
          grid: { stroke: grid, width: 1 },
          ticks: { stroke: tick, width: 1, size: 4 },
          values: (_u, splits) => splits.map((v) => `${v.toFixed(v % 1 ? 1 : 0)} h`),
        },
        { stroke: ink, font, size: 52, label: unit, labelFont: font, labelSize: 14, grid: { stroke: grid, width: 1 }, ticks: { stroke: tick, width: 1, size: 4 } },
      ],
      series: [
        { label: 'Plant h', value: (_u, v) => (v == null ? '--' : `${v.toFixed(2)} h`) },
        ...series.map((s, i) => ({
          label: s.label,
          stroke: tok(STROKES[i % STROKES.length] ?? '--text-1'),
          width: 1.25,
          dash: DASHES[i % DASHES.length],
          points: { show: false },
          value: (_u: uPlotT, v: number | null) => (v == null ? '--' : v.toFixed(unit === '%' || unit === 'in. w.g.' ? 2 : unit === 'ppm' ? 0 : 1)),
        })),
        ...limits.map((l) => ({ label: l.label, stroke: tick, width: 1, dash: [3, 3], points: { show: false } })),
      ],
    };
    const u = new Ctor(opts, data(), el);
    plot.current = u;
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const w = el.clientWidth;
            if (w > 0 && w !== u.width) u.setSize({ width: w, height });
          });
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [Ctor, shape, height]);

  useEffect(() => {
    const u = plot.current;
    if (!u) return;
    u.setData(data());
    // With no cursor on the plot the legend shows the latest values.
    if (u.cursor.idx == null && x.length) u.setLegend({ idx: x.length - 1 });
  });

  return (
    <div class="env-trend" role="img" aria-label={label}>
      {failed ? <p class="env-note">The trend recorder could not be loaded on this workstation.</p> : !Ctor ? <p class="env-note">Loading trend recorder.</p> : null}
      <div ref={host} />
    </div>
  );
}
