/**
 * Switchboard meters: EdgewiseMeter (vertical edgewise), ArcMeter (90 degree
 * square switchboard meter), BarMeter (segmented bar graph), SegmentDisplay
 * (seven-segment digits as flat polygons, no glow).
 *
 * For a full telemetry instrument with tag, readout field and status word in one
 * box, use Gauge / ReadoutRow from @graphics/reactor; these are panel-mounted
 * hardware with the legend on a plate.
 */
import { StatusWord } from '@graphics/reactor/gauges';
import type { StatusId } from '@graphics/reactor/model';
import { Plate } from './controls';
import { fmtTick, formatForDisplay, limitWord, limitZones, scaleFraction, scaleTicks, segmentCells, type Limit, type LimitWord } from './logic';
import { cx, legendText, type Legend } from './parts';

export interface MeterProps {
  /** Engraved plate under the meter. */
  label: Legend;
  value: number;
  min: number;
  max: number;
  unit: string;
  warn?: Limit;
  alarm?: Limit;
  /** Major tick count target (default 5). */
  ticks?: number;
  /** Equipment tag, e.g. EI-101, printed on the scale plate. */
  tag?: string;
  /** Status square + limit word under the meter. Default: shown when limits are given. */
  showStatus?: boolean;
  /** Decimal places in the assistive value text (default from the span). */
  digits?: number;
}

const LIMIT_STATUS: Record<LimitWord, StatusId> = {
  NORMAL: 'NOMINAL',
  HIGH: 'DEGRADED',
  LOW: 'DEGRADED',
  'HIGH-HIGH': 'FAULT',
  'LOW-LOW': 'FAULT',
  'NO DATA': 'OFFLINE',
};

function autoDigits(min: number, max: number): number {
  const span = Math.abs(max - min);
  return span >= 100 ? 0 : span >= 10 ? 1 : 2;
}

function meterAria(p: MeterProps, word: LimitWord) {
  const d = p.digits ?? autoDigits(p.min, p.max);
  const text = Number.isFinite(p.value) ? p.value.toFixed(d) : 'no data';
  return {
    role: 'meter',
    'aria-label': legendText(p.label),
    'aria-valuemin': p.min,
    'aria-valuemax': p.max,
    'aria-valuenow': Number.isFinite(p.value) ? Math.min(p.max, Math.max(p.min, p.value)) : undefined,
    'aria-valuetext': `${text} ${p.unit}${word === 'NORMAL' ? '' : `, ${word}`}`,
  } as const;
}

function MeterFoot({ p, word }: { p: MeterProps; word: LimitWord }) {
  const show = p.showStatus ?? (p.warn !== undefined || p.alarm !== undefined);
  return (
    <>
      <Plate text={p.label} size="sm" />
      {show ? <StatusWord status={LIMIT_STATUS[word]} word={word} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* EdgewiseMeter                                                        */
/* ------------------------------------------------------------------ */

/** Vertical edgewise switchboard meter: black bezel, white scale, horizontal pointer. */
export function EdgewiseMeter(p: MeterProps) {
  const { value, min, max, unit, warn, alarm, ticks = 5, tag } = p;
  const W = 66;
  const H = 176;
  const top = 26;
  const bot = 146;
  const sx = 40;
  const yOf = (v: number): number => bot - scaleFraction(v, min, max) * (bot - top);
  const sc = scaleTicks(min, max, ticks);
  const word = limitWord(value, warn, alarm);
  const ok = Number.isFinite(value);
  const py = ok ? yOf(value) : bot + 4;
  return (
    <div class="pk-ctl pk-meter pk-edgewise" {...meterAria(p, word)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <rect x={0} y={0} width={W} height={H} class="pk-f-meterbezel" />
        <path d={`M0.5 ${H - 0.5} V0.5 H${W - 0.5}`} class="pk-s-sh pk-nofill" />
        <rect x={6} y={6} width={W - 12} height={H - 12} class="pk-f-scale" />
        <path d={`M6.5 ${H - 6.5} V6.5 H${W - 6.5}`} class="pk-s-outer pk-nofill" />
        {tag ? (
          <text x={W / 2} y={14} text-anchor="middle" class="pk-scale-t pk-scale-tag">
            {tag}
          </text>
        ) : null}
        {limitZones(min, max, warn, alarm).map((z, i) => (
          <rect key={`z${i}`} x={sx + 1} y={yOf(z.to)} width={4} height={yOf(z.from) - yOf(z.to)} class={`pk-zone pk-zone--${z.kind}`} />
        ))}
        <line x1={sx + 0.5} y1={top} x2={sx + 0.5} y2={bot} class="pk-s-ink" />
        {sc.minor.map((v) => (
          <line key={`m${v}`} x1={sx - 4} x2={sx} y1={yOf(v)} y2={yOf(v)} class="pk-s-ink pk-hair" />
        ))}
        {sc.major.map((v) => (
          <g key={`M${v}`}>
            <line x1={sx - 8} x2={sx} y1={yOf(v)} y2={yOf(v)} class="pk-s-ink" />
            <text x={sx - 10} y={yOf(v) + 3} text-anchor="end" class="pk-scale-t">
              {fmtTick(v)}
            </text>
          </g>
        ))}
        <text x={W / 2} y={bot + 18} text-anchor="middle" class="pk-scale-t pk-scale-unit">
          {unit}
        </text>
        {/* pointer: a thin needle across the scale from the right-hand pivot slot */}
        <polygon points={`${sx - 6},${py} ${sx + 2},${py - 1.6} ${W - 8},${py - 1.6} ${W - 8},${py + 1.6} ${sx + 2},${py + 1.6}`} class="pk-f-needle" />
        <rect x={W - 12} y={6} width={6} height={H - 12} class="pk-f-meterbezel" />
      </svg>
      <MeterFoot p={p} word={word} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ArcMeter                                                             */
/* ------------------------------------------------------------------ */

/** 90 degree square switchboard meter (the DIN 96 type): black bezel, pivot under a cover strip. */
export function ArcMeter(p: MeterProps) {
  const { value, min, max, unit, warn, alarm, ticks = 5, tag } = p;
  const W = 128;
  const H = 108;
  const px = W / 2;
  const py = 94;
  const R = 72;
  const ang = (v: number): number => ((135 - scaleFraction(v, min, max) * 90) * Math.PI) / 180;
  const pt = (v: number, r: number): [number, number] => [px + Math.cos(ang(v)) * r, py - Math.sin(ang(v)) * r];
  const arcD = (a: number, b: number, r: number): string => {
    const [x0, y0] = pt(a, r);
    const [x1, y1] = pt(b, r);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const sc = scaleTicks(min, max, ticks);
  const word = limitWord(value, warn, alarm);
  const ok = Number.isFinite(value);
  const [nx, ny] = pt(ok ? value : min, R + 4);
  const lo = ok && value < min;
  return (
    <div class="pk-ctl pk-meter pk-arcmeter" {...meterAria(p, word)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <rect x={0} y={0} width={W} height={H} class="pk-f-meterbezel" />
        <path d={`M0.5 ${H - 0.5} V0.5 H${W - 0.5}`} class="pk-s-sh pk-nofill" />
        <rect x={6} y={6} width={W - 12} height={H - 12} class="pk-f-scale" />
        <path d={`M6.5 ${H - 6.5} V6.5 H${W - 6.5}`} class="pk-s-outer pk-nofill" />
        {limitZones(min, max, warn, alarm).map((z, i) => (
          <path key={`z${i}`} d={arcD(z.from, z.to, R + 3)} class={`pk-nofill pk-zonearc pk-zonearc--${z.kind}`} />
        ))}
        <path d={arcD(min, max, R)} class="pk-nofill pk-s-ink" />
        {sc.minor.map((v) => {
          const [x1, y1] = pt(v, R);
          const [x2, y2] = pt(v, R - 4);
          return <line key={`m${v}`} x1={x1} y1={y1} x2={x2} y2={y2} class="pk-s-ink pk-hair" />;
        })}
        {sc.major.map((v) => {
          const [x1, y1] = pt(v, R);
          const [x2, y2] = pt(v, R - 8);
          const [tx, ty] = pt(v, R - 16);
          return (
            <g key={`M${v}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} class="pk-s-ink" />
              <text x={tx} y={ty + 3} text-anchor="middle" class="pk-scale-t">
                {fmtTick(v)}
              </text>
            </g>
          );
        })}
        <text x={px} y={py - 26} text-anchor="middle" class="pk-scale-t pk-scale-unit">
          {unit}
        </text>
        {tag ? (
          <text x={11} y={17} class="pk-scale-t pk-scale-tag">
            {tag}
          </text>
        ) : null}
        <line x1={px} y1={py} x2={nx} y2={ny} class={cx('pk-s-needle', lo && 'is-under')} />
        <rect x={6} y={py - 6} width={W - 12} height={H - py} class="pk-f-meterbezel" />
        <line x1={6} y1={py - 5.5} x2={W - 6} y2={py - 5.5} class="pk-s-sh" />
      </svg>
      <MeterFoot p={p} word={word} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BarMeter                                                             */
/* ------------------------------------------------------------------ */

export interface BarMeterProps extends MeterProps {
  /** Segments in the bar (default 20). */
  segments?: number;
  /** Bar length in px (default 180). */
  length?: number;
  /** Show the numeric readout field right of the bar (default true). */
  readout?: boolean;
}

/** Horizontal segmented bar graph with scale, limit flags and readout field. */
export function BarMeter(p: BarMeterProps) {
  const { value, min, max, unit, warn, alarm, ticks = 5, segments = 20, length = 180, readout = true } = p;
  const L = length;
  const x0 = 6;
  const segW = (L - 4) / segments;
  const xOf = (v: number): number => x0 + 2 + scaleFraction(v, min, max) * (L - 4);
  const sc = scaleTicks(min, max, ticks);
  const word = limitWord(value, warn, alarm);
  const lit = Number.isFinite(value) ? Math.round(scaleFraction(value, min, max) * segments) : 0;
  const zones = limitZones(min, max, warn, alarm);
  const d = p.digits ?? autoDigits(min, max);
  const W = L + 12;
  const H = 44;
  return (
    <div class="pk-ctl pk-meter pk-barmeter" {...meterAria(p, word)}>
      <div class="pk-barmeter__row">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {zones.map((z, i) => (
            <rect key={`z${i}`} x={xOf(z.from)} y={4} width={xOf(z.to) - xOf(z.from)} height={3} class={`pk-zone pk-zone--${z.kind}`} />
          ))}
          <rect x={x0} y={9} width={L} height={16} class="pk-f-scale" />
          <path d={`M${x0 + 0.5} ${25.5} V9.5 H${x0 + L - 0.5}`} class="pk-s-sh pk-nofill" />
          <path d={`M${x0 + 0.5} ${24.5} H${x0 + L - 0.5} V9.5`} class="pk-s-hi pk-nofill" />
          {Array.from({ length: segments }, (_, i) => (
            <rect key={i} x={x0 + 2 + i * segW + 0.5} y={11} width={Math.max(1, segW - 1.5)} height={12} class={i < lit ? 'pk-f-seg-on' : 'pk-f-seg-off'} />
          ))}
          {sc.minor.map((v) => (
            <line key={`m${v}`} x1={xOf(v)} x2={xOf(v)} y1={27} y2={30} class="pk-s-ink pk-hair" />
          ))}
          {sc.major.map((v) => (
            <g key={`M${v}`}>
              <line x1={xOf(v)} x2={xOf(v)} y1={27} y2={33} class="pk-s-ink" />
              <text x={xOf(v)} y={42} text-anchor="middle" class="pk-scale-t">
                {fmtTick(v)}
              </text>
            </g>
          ))}
        </svg>
        {readout ? (
          <span class="pk-readout">
            <span class="pk-field">{Number.isFinite(value) ? value.toFixed(d) : '----'}</span>
            <span class="pk-unit">{unit}</span>
          </span>
        ) : null}
      </div>
      <MeterFoot p={p} word={word} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SegmentDisplay                                                       */
/* ------------------------------------------------------------------ */

export interface SegmentDisplayProps {
  value: number | string;
  /** Character cells (default 4). A value that does not fit shows dashes. */
  digits?: number;
  /** Fixed decimals for numeric values. */
  decimals?: number;
  /** lcd (default): dark segments on a pale window. led: amber segments on a black window, flat. */
  variant?: 'lcd' | 'led';
  size?: 'sm' | 'md' | 'lg';
  /** Engraved plate under the display. */
  label?: Legend;
  /** Unit printed right of the window. */
  unit?: string;
  /** Accessible name when there is no label. */
  ariaLabel?: string;
}

const T = 2.6; // segment thickness
const DW = 12; // digit width
const DH = 22; // digit height
const CELL = 19;

function hseg(x1: number, x2: number, y: number): string {
  const h = T / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
}
function vseg(x: number, y1: number, y2: number): string {
  const h = T / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
}

function segPolys(x: number, y: number): Record<string, string> {
  const m = y + DH / 2;
  return {
    a: hseg(x + 1, x + DW - 1, y),
    b: vseg(x + DW, y + 1, m - 1),
    c: vseg(x + DW, m + 1, y + DH - 1),
    d: hseg(x + 1, x + DW - 1, y + DH),
    e: vseg(x, m + 1, y + DH - 1),
    f: vseg(x, y + 1, m - 1),
    g: hseg(x + 1, x + DW - 1, m),
  };
}

/** Seven-segment numeric display. Unlit segments are drawn faintly, as on the real part. */
export function SegmentDisplay({ value, digits = 4, decimals, variant = 'lcd', size = 'md', label, unit, ariaLabel }: SegmentDisplayProps) {
  const text = formatForDisplay(value, decimals);
  const cells = segmentCells(text, digits);
  const k = size === 'sm' ? 0.75 : size === 'lg' ? 1.4 : 1;
  const W = 8 + cells.length * CELL;
  const H = 34;
  const name = ariaLabel ?? (label ? legendText(label) : 'Display');
  const said = cells.some((c) => c.ch === '-') && cells.every((c) => c.ch === '-') ? 'over range' : text.trim();
  return (
    <div class={cx('pk-ctl', 'pk-seg', `pk-seg--${variant}`)} role="img" aria-label={`${name}: ${said}${unit ? ' ' + unit : ''}`}>
      <div class="pk-seg__row">
        <svg width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <rect x={0} y={0} width={W} height={H} class="pk-f-segwin" />
          <path d={`M0.5 ${H - 0.5} V0.5 H${W - 0.5}`} class="pk-s-sh pk-nofill" />
          <path d={`M0.5 ${H - 0.5} H${W - 0.5} V0.5`} class="pk-s-hi pk-nofill" />
          {cells.map((c, i) => {
            const x = 6 + i * CELL;
            const y = 6;
            const polys = segPolys(x, y);
            return (
              <g key={i}>
                {Object.entries(polys).map(([s, pts]) => (
                  <polygon key={s} points={pts} class={c.segs.includes(s) ? 'pk-segon' : 'pk-segoff'} />
                ))}
                <rect x={x + DW + 2} y={y + DH - 1.3} width={2.6} height={2.6} class={c.dot ? 'pk-segon' : 'pk-segoff'} />
              </g>
            );
          })}
        </svg>
        {unit ? <span class="pk-unit">{unit}</span> : null}
      </div>
      {label ? <Plate text={label} size="sm" /> : null}
    </div>
  );
}
