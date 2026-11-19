/**
 * Facility telemetry instruments: Gauge (flat bar or dial), ReadoutRow,
 * SealStateIndicator. Flat 2008 HMI: sunken numeric fields, hairline scales,
 * limit flags lettered L / LL / H / HH. Status is a 10px square and a word.
 */
import type { JSX } from 'preact';
import type { StatusId } from './model';
import './reactor.css';

/** A limit is a high threshold (number) or an explicit low/high pair. */
export type Limit = number | { lo?: number; hi?: number };

export interface GaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  warn?: Limit;
  alarm?: Limit;
  /** 'bar' (default): vertical bar with scale. 'dial': 240 degree flat dial. */
  kind?: 'bar' | 'dial';
  /** Decimal places for the readout; default chosen from the span. */
  digits?: number;
  /** Equipment tag shown above the label, e.g. PT-201. */
  tag?: string;
}

const SQ: Record<StatusId, string> = {
  NOMINAL: 'rx-sq rx-sq--nominal',
  DEGRADED: 'rx-sq rx-sq--degraded',
  FAULT: 'rx-sq rx-sq--fault',
  OFFLINE: 'rx-sq rx-sq--offline',
};

export function StatusWord({ status, word }: { status: StatusId; word?: string }) {
  return (
    <span class="rx-status">
      <span class={SQ[status]} aria-hidden="true" />
      <span class="rx-status__word">{word ?? status}</span>
    </span>
  );
}

function band(l: Limit | undefined): { lo?: number; hi?: number } {
  if (l === undefined) return {};
  return typeof l === 'number' ? { hi: l } : l;
}

function evaluate(value: number, warn?: Limit, alarm?: Limit): { status: StatusId; word: string } {
  if (!Number.isFinite(value)) return { status: 'OFFLINE', word: 'NO DATA' };
  const w = band(warn);
  const a = band(alarm);
  if (a.hi !== undefined && value >= a.hi) return { status: 'FAULT', word: 'HIGH-HIGH' };
  if (a.lo !== undefined && value <= a.lo) return { status: 'FAULT', word: 'LOW-LOW' };
  if (w.hi !== undefined && value >= w.hi) return { status: 'DEGRADED', word: 'HIGH' };
  if (w.lo !== undefined && value <= w.lo) return { status: 'DEGRADED', word: 'LOW' };
  return { status: 'NOMINAL', word: 'NORMAL' };
}

function autoDigits(min: number, max: number): number {
  const span = Math.abs(max - min);
  return span >= 100 ? 0 : span >= 10 ? 1 : 2;
}

function niceTicks(min: number, max: number, target: number): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-6; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

function fmtTick(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

function flags(warn?: Limit, alarm?: Limit): { v: number; letter: string }[] {
  const w = band(warn);
  const a = band(alarm);
  const out: { v: number; letter: string }[] = [];
  if (a.hi !== undefined) out.push({ v: a.hi, letter: 'HH' });
  if (w.hi !== undefined) out.push({ v: w.hi, letter: 'H' });
  if (w.lo !== undefined) out.push({ v: w.lo, letter: 'L' });
  if (a.lo !== undefined) out.push({ v: a.lo, letter: 'LL' });
  return out;
}

function BarFace({ value, min, max, warn, alarm }: GaugeProps): JSX.Element {
  const top = 8;
  const h = 120;
  const x = 44;
  const w = 16;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
  const yOf = (v: number) => top + h - frac(v) * h;
  const major = niceTicks(min, max, 5);
  const minorStep = major.length > 1 ? ((major[1] ?? 0) - (major[0] ?? 0)) / 5 : 0;
  const minor: number[] = [];
  if (minorStep > 0) for (let v = major[0] ?? min; v <= max + 1e-9; v += minorStep) minor.push(v);
  const fillH = Number.isFinite(value) ? frac(value) * h : 0;
  return (
    <svg class="rx-gauge__face" width={104} height={136} viewBox="0 0 104 136" aria-hidden="true">
      {minor.map((v) => (
        <line x1={x - 4} x2={x} y1={yOf(v)} y2={yOf(v)} class="rx-hair" />
      ))}
      {major.map((v) => (
        <g>
          <line x1={x - 7} x2={x} y1={yOf(v)} y2={yOf(v)} class="rx-tick" />
          <text x={x - 10} y={yOf(v) + 3} text-anchor="end" class="rx-t rx-s">
            {fmtTick(v)}
          </text>
        </g>
      ))}
      <rect x={x} y={top} width={w} height={h} class="rx-gauge__track" />
      <rect x={x + 1} y={top + h - fillH} width={w - 2} height={fillH} class="rx-gauge__fill" />
      <rect x={x} y={top} width={w} height={h} class="rx-gauge__rim" />
      {flags(warn, alarm).map((f) => (
        <g>
          <line x1={x} x2={x + w + 5} y1={yOf(f.v)} y2={yOf(f.v)} class="rx-tick" />
          <polygon
            points={`${x + w + 5},${yOf(f.v)} ${x + w + 11},${yOf(f.v) - 4} ${x + w + 11},${yOf(f.v) + 4}`}
            class="rx-arrow"
          />
          <text x={x + w + 14} y={yOf(f.v) + 3} class="rx-t rx-s">
            {f.letter}
          </text>
        </g>
      ))}
    </svg>
  );
}

function DialFace({ value, min, max, warn, alarm }: GaugeProps): JSX.Element {
  const cx = 52;
  const cy = 62;
  const R = 44;
  const a0 = 210; // degrees, measured clockwise from 12 o'clock is awkward: use math angles
  const sweep = 240;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min || 1)));
  const ang = (v: number) => ((a0 - frac(v) * sweep) * Math.PI) / 180;
  const pt = (v: number, r: number): [number, number] => [cx + Math.cos(ang(v)) * r, cy - Math.sin(ang(v)) * r];
  const major = niceTicks(min, max, 5);
  const minorStep = major.length > 1 ? ((major[1] ?? 0) - (major[0] ?? 0)) / 5 : 0;
  const minor: number[] = [];
  if (minorStep > 0) for (let v = major[0] ?? min; v <= max + 1e-9; v += minorStep) minor.push(v);
  const [sx, sy] = pt(min, R);
  const [ex, ey] = pt(max, R);
  const ok = Number.isFinite(value);
  const [nx, ny] = pt(ok ? value : min, R - 9);
  return (
    <svg class="rx-gauge__face" width={104} height={104} viewBox="0 0 104 104" aria-hidden="true">
      <path d={`M${sx} ${sy} A${R} ${R} 0 1 1 ${ex} ${ey}`} class="rx-tick rx-nofill" />
      {minor.map((v) => {
        const [x1, y1] = pt(v, R);
        const [x2, y2] = pt(v, R - 3);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} class="rx-hair" />;
      })}
      {major.map((v) => {
        const [x1, y1] = pt(v, R);
        const [x2, y2] = pt(v, R - 6);
        const [tx, ty] = pt(v, R - 16);
        return (
          <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} class="rx-tick" />
            <text x={tx} y={ty + 3} text-anchor="middle" class="rx-t rx-tiny">
              {fmtTick(v)}
            </text>
          </g>
        );
      })}
      {flags(warn, alarm).map((f) => {
        const [x1, y1] = pt(f.v, R + 1);
        const [x2, y2] = pt(f.v, R + 7);
        return <line x1={x1} y1={y1} x2={x2} y2={y2} class="rx-flag" />;
      })}
      {ok ? <line x1={cx} y1={cy} x2={nx} y2={ny} class="rx-needle" /> : null}
      <circle cx={cx} cy={cy} r={3.5} class="rx-arrow" />
    </svg>
  );
}

export function Gauge(props: GaugeProps) {
  const { label, value, min, max, unit, warn, alarm, kind = 'bar', tag } = props;
  const digits = props.digits ?? autoDigits(min, max);
  const st = evaluate(value, warn, alarm);
  const text = Number.isFinite(value) ? value.toFixed(digits) : '----';
  return (
    <div
      class={`rx-gauge rx-gauge--${kind}`}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number.isFinite(value) ? value : undefined}
      aria-valuetext={`${text} ${unit}, ${st.word}`}
    >
      <div class="rx-gauge__head">
        {tag ? <span class="rx-gauge__tag">{tag}</span> : null}
        <span class="rx-gauge__label">{label}</span>
      </div>
      {kind === 'dial' ? <DialFace {...props} /> : <BarFace {...props} />}
      <div class="rx-gauge__read">
        <span class="rx-field">{text}</span>
        <span class="rx-gauge__unit">{unit}</span>
      </div>
      <StatusWord status={st.status} word={st.word} />
    </div>
  );
}

export interface ReadoutRowProps {
  label: string;
  value: number | string;
  unit?: string;
  status?: StatusId;
  /** Word beside the square; defaults to the status id. */
  word?: string;
  digits?: number;
  tag?: string;
}

export function ReadoutRow({ label, value, unit, status = 'NOMINAL', word, digits, tag }: ReadoutRowProps) {
  const text = typeof value === 'number' ? (Number.isFinite(value) ? value.toFixed(digits ?? 1) : '----') : value;
  return (
    <div class="rx-readout" role="group" aria-label={`${label}: ${text} ${unit ?? ''}, ${word ?? status}`}>
      <span class="rx-readout__tag">{tag ?? ''}</span>
      <span class="rx-readout__label">{label}</span>
      <span class="rx-field rx-readout__value">{text}</span>
      <span class="rx-readout__unit">{unit ?? ''}</span>
      <StatusWord status={status} word={word} />
    </div>
  );
}

export type SealState = 'SEALED' | 'VENTED' | 'CYCLING';

const SEAL_STATUS: Record<SealState, StatusId> = { SEALED: 'NOMINAL', CYCLING: 'DEGRADED', VENTED: 'OFFLINE' };
const SEAL_ORDER: readonly SealState[] = ['SEALED', 'CYCLING', 'VENTED'];

/** Door-leaf glyph: leaves shut (SEALED), half way (CYCLING), parked open (VENTED). */
function SealGlyph({ state }: { state: SealState }) {
  const gap = state === 'SEALED' ? 0 : state === 'CYCLING' ? 7 : 16;
  return (
    <svg width={44} height={30} viewBox="0 0 44 30" aria-hidden="true" class="rx-seal__glyph">
      <rect x={1.5} y={1.5} width={41} height={27} class="rx-tick rx-nofill" />
      <rect x={4} y={4} width={18 - gap} height={22} class="rx-arrow" />
      <rect x={22 + gap} y={4} width={18 - gap} height={22} class="rx-arrow" />
      {state === 'CYCLING' ? <path d="M17 15 h10 M19 12 l-3 3 3 3 M25 12 l3 3 -3 3" class="rx-tick rx-nofill" /> : null}
    </svg>
  );
}

export function SealStateIndicator({ state, label = 'ENVELOPE SEAL' }: { state: SealState; label?: string }) {
  return (
    <div class="rx-seal" role="status" aria-label={`${label}: ${state}`}>
      <span class="rx-seal__label">{label}</span>
      <SealGlyph state={state} />
      <span class="rx-seal__lamps">
        {SEAL_ORDER.map((s) => (
          <span class={s === state ? 'rx-seal__lamp rx-seal__lamp--on' : 'rx-seal__lamp'} aria-hidden="true">
            {s}
          </span>
        ))}
      </span>
      <StatusWord status={SEAL_STATUS[state]} word={state} />
    </div>
  );
}
