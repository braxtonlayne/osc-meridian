/**
 * Line quality strip chart: one series against a fixed scale, with up to two limit lines
 * (dashed = warning, solid = limit) labelled in words. Recorder-paper register: grid, ink line,
 * no fills, no colour beyond tokens. Values are plotted left (oldest) to right.
 */
import './patch.css';

export interface TrendProps {
  label: string;
  values: readonly number[];
  min: number;
  max: number;
  unit: string;
  warn?: number;
  limit?: number;
  /** Captions under the left and right ends ("24 h ago", "now"). */
  from?: string;
  to?: string;
  width?: number;
  height?: number;
  /** Values beyond this index are drawn as a pending (dotted) tail: samples still to come. */
  live?: boolean;
}

export function Trend({ label, values, min, max, unit, warn, limit, from, to, width = 360, height = 120, live = false }: TrendProps) {
  const L = 34;
  const R = 8;
  const T = 8;
  const B = from || to ? 22 : 10;
  const w = width - L - R;
  const h = height - T - B;
  const y = (v: number) => T + h - ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * h;
  const n = Math.max(values.length, 2);
  const x = (i: number) => L + (i / (n - 1)) * w;
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
  const last = values[values.length - 1];
  const summary = values.length ? `${label}: ${values.length} readings, latest ${last} ${unit}` : `${label}: no readings`;
  return (
    <svg class="pt-trend" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
      <rect x={L} y={T} width={w} height={h} class="pt-trend__paper" />
      {grid.map((g) => (
        <g key={g}>
          <line x1={L} x2={L + w} y1={y(g)} y2={y(g)} class="pt-trend__grid" />
          <text x={L - 4} y={y(g) + 3} class="pt-trend__ax" text-anchor="end">
            {Number.isInteger(g) ? g : g.toFixed(1)}
          </text>
        </g>
      ))}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={L + w * f} x2={L + w * f} y1={T} y2={T + h} class="pt-trend__grid" />
      ))}
      {warn !== undefined ? (
        <g>
          <line x1={L} x2={L + w} y1={y(warn)} y2={y(warn)} class="pt-trend__warn" />
          <text x={L + 3} y={y(warn) + 9} class="pt-trend__ax" text-anchor="start">WARN</text>
        </g>
      ) : null}
      {limit !== undefined ? (
        <g>
          <line x1={L} x2={L + w} y1={y(limit)} y2={y(limit)} class="pt-trend__limit" />
          <text x={L + w - 2} y={y(limit) - 2} class="pt-trend__ax" text-anchor="end">LIMIT</text>
        </g>
      ) : null}
      {values.length > 1 ? <polyline points={pts} class="pt-trend__ink" /> : null}
      {values.length === 1 ? <circle cx={x(0)} cy={y(values[0]!)} r={2} class="pt-trend__dot" /> : null}
      {live && values.length ? <circle cx={x(values.length - 1)} cy={y(last!)} r={2.5} class="pt-trend__dot" /> : null}
      <text x={L} y={T - 1} class="pt-trend__ax">{unit}</text>
      {from ? <text x={L} y={height - 6} class="pt-trend__ax">{from}</text> : null}
      {to ? <text x={L + w} y={height - 6} class="pt-trend__ax" text-anchor="end">{to}</text> : null}
    </svg>
  );
}
