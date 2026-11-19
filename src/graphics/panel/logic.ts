/**
 * @graphics/panel pure logic: annunciator sequence, guarded-switch sequence,
 * hold progress, rotary positions, meter scales and seven-segment encoding.
 * No DOM, no timers. Unit-tested in logic.test.ts.
 */

/* ------------------------------------------------------------------ */
/* Annunciator: ISA-18.1 ring-back sequence (sequence R)               */
/* ------------------------------------------------------------------ */

/**
 * Display state of one annunciator window.
 *   normal    process normal, window dark
 *   unack     alarm, not acknowledged: slow flash
 *   ack       alarm acknowledged, still abnormal: steady on
 *   ringback  process returned to normal after the alarm: dim slow flash until RESET
 */
export type AnnSeq = 'normal' | 'unack' | 'ack' | 'ringback';

/** One window's sequence point: what it shows plus the live process condition. */
export interface AnnPoint {
  seq: AnnSeq;
  abnormal: boolean;
}

/** Process inputs (`abnormal`, `normal`) and operator pushbuttons (`ack`, `reset`). */
export type AnnEvent = 'abnormal' | 'normal' | 'ack' | 'reset';

export const ANN_NORMAL: AnnPoint = Object.freeze({ seq: 'normal', abnormal: false }) as AnnPoint;

/**
 * Advance one window through the ring-back sequence.
 * - An alarm locks in: returning to normal before ACK keeps it flashing.
 * - ACK of an alarm that already cleared goes straight to ringback.
 * - Ringback needs RESET; a new alarm during ringback flashes again.
 */
export function annunciatorStep(p: AnnPoint, e: AnnEvent): AnnPoint {
  switch (e) {
    case 'abnormal':
      if (p.seq === 'normal' || p.seq === 'ringback') return { seq: 'unack', abnormal: true };
      return p.abnormal ? p : { seq: p.seq, abnormal: true };
    case 'normal':
      if (p.seq === 'ack') return { seq: 'ringback', abnormal: false };
      return p.abnormal ? { seq: p.seq, abnormal: false } : p;
    case 'ack':
      if (p.seq !== 'unack') return p;
      return p.abnormal ? { seq: 'ack', abnormal: true } : { seq: 'ringback', abnormal: false };
    case 'reset':
      return p.seq === 'ringback' && !p.abnormal ? { seq: 'normal', abnormal: false } : p;
    default:
      return p;
  }
}

/** Fold a list of events from `start` (default normal). */
export function annunciatorRun(events: readonly AnnEvent[], start: AnnPoint = ANN_NORMAL): AnnPoint {
  return events.reduce(annunciatorStep, start);
}

export const ANN_WORD: Record<AnnSeq, string> = {
  normal: 'NORMAL',
  unack: 'ALARM, UNACKNOWLEDGED',
  ack: 'ALARM, ACKNOWLEDGED',
  ringback: 'CLEARED, RESET REQUIRED',
};

/* ------------------------------------------------------------------ */
/* Guarded switch                                                       */
/* ------------------------------------------------------------------ */

export type GuardState = 'closed' | 'lifted' | 'armed' | 'actuated';
export type GuardEvent = 'lift' | 'close' | 'press' | 'release' | 'complete';

/**
 * closed -lift-> lifted -press-> armed -complete-> actuated
 * armed -release-> lifted (hold abandoned, progress lost)
 * close from lifted, armed or actuated -> closed (Escape)
 */
export function guardStep(s: GuardState, e: GuardEvent): GuardState {
  switch (e) {
    case 'lift':
      return s === 'closed' ? 'lifted' : s;
    case 'close':
      return s === 'closed' ? s : 'closed';
    case 'press':
      return s === 'lifted' ? 'armed' : s;
    case 'release':
      return s === 'armed' ? 'lifted' : s;
    case 'complete':
      return s === 'armed' ? 'actuated' : s;
    default:
      return s;
  }
}

export interface HoldProgress {
  /** 0..1 */
  fraction: number;
  /** Whole segments lit, 0..segments. A segment lights only when its time has fully passed. */
  lit: number;
  complete: boolean;
  /** Seconds remaining, rounded up to 0.1 s. */
  remaining: number;
}

export function holdProgress(elapsedMs: number, durationMs: number, segments = 10): HoldProgress {
  const n = Math.max(1, Math.floor(segments));
  const d = Math.max(0, durationMs);
  const e = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const fraction = d === 0 ? 1 : Math.min(1, e / d);
  const lit = Math.min(n, Math.floor(fraction * n + 1e-9));
  const remaining = Math.max(0, Math.ceil((d - e) / 100 - 1e-9) / 10);
  return { fraction, lit, complete: fraction >= 1, remaining };
}

/* ------------------------------------------------------------------ */
/* Rotary controls                                                      */
/* ------------------------------------------------------------------ */

/**
 * Pointer angles in degrees from 12 o'clock, clockwise positive.
 * Two positions throw 90 degrees (-45/+45); three or more step 45 degrees
 * (compressed to fit 270 degrees above seven positions).
 */
export function rotaryAngles(n: number): number[] {
  const count = Math.max(1, Math.floor(n));
  if (count === 1) return [0];
  const step = count === 2 ? 90 : Math.min(45, 270 / (count - 1));
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

/** Move a rotary position by delta, clamped (rotary switches have end stops). */
export function stepPosition(index: number, delta: number, n: number): number {
  const max = Math.max(0, Math.floor(n) - 1);
  const i = Number.isFinite(index) ? Math.round(index) : 0;
  return Math.min(max, Math.max(0, i + delta));
}

/** Keyboard map shared by rotary controls: returns the new index or null when the key is not ours. */
export function rotaryKey(key: string, index: number, n: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return stepPosition(index, 1, n);
    case 'ArrowLeft':
    case 'ArrowDown':
      return stepPosition(index, -1, n);
    case 'Home':
      return 0;
    case 'End':
      return Math.max(0, n - 1);
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Meter scales                                                         */
/* ------------------------------------------------------------------ */

export interface Scale {
  major: number[];
  minor: number[];
}

/** Round-number major ticks (1, 2, 2.5, 5 x 10^n) with 5 or 4 minor divisions. */
export function scaleTicks(min: number, max: number, target = 5): Scale {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(span)) return { major: [min], minor: [] };
  const raw = span / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const mults = [1, 2, 2.5, 5, 10];
  const mult = mults.find((m) => span / (m * mag) <= target) ?? 10;
  const step = mult * mag;
  const major: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-6; v += step) major.push(round6(v));
  const div = mult === 2.5 ? 5 : mult === 2 ? 4 : 5;
  const minorStep = step / div;
  const minor: number[] = [];
  for (let v = Math.ceil(min / minorStep - 1e-9) * minorStep; v <= max + minorStep * 1e-6; v += minorStep) {
    const r = round6(v);
    if (!major.some((m) => Math.abs(m - r) < minorStep * 1e-3)) minor.push(r);
  }
  return { major, minor };
}

function round6(v: number): number {
  return Number(v.toFixed(6));
}

export function fmtTick(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

/** Clamp a value to 0..1 of the scale; non-finite reads as 0 (pointer parked at the stop). */
export function scaleFraction(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  const span = max - min || 1;
  return Math.min(1, Math.max(0, (v - min) / span));
}

/** Limit flags, as on the reactor gauges: number = high threshold, or an explicit lo/hi pair. */
export type Limit = number | { lo?: number; hi?: number };

export function limitBand(l: Limit | undefined): { lo?: number; hi?: number } {
  if (l === undefined) return {};
  return typeof l === 'number' ? { hi: l } : l;
}

export type LimitWord = 'NORMAL' | 'HIGH' | 'HIGH-HIGH' | 'LOW' | 'LOW-LOW' | 'NO DATA';

export function limitWord(value: number, warn?: Limit, alarm?: Limit): LimitWord {
  if (!Number.isFinite(value)) return 'NO DATA';
  const w = limitBand(warn);
  const a = limitBand(alarm);
  if (a.hi !== undefined && value >= a.hi) return 'HIGH-HIGH';
  if (a.lo !== undefined && value <= a.lo) return 'LOW-LOW';
  if (w.hi !== undefined && value >= w.hi) return 'HIGH';
  if (w.lo !== undefined && value <= w.lo) return 'LOW';
  return 'NORMAL';
}

/** Coloured scale arcs/strips derived from limits: [from, to, kind]. */
export function limitZones(min: number, max: number, warn?: Limit, alarm?: Limit): { from: number; to: number; kind: 'warn' | 'alarm' }[] {
  const w = limitBand(warn);
  const a = limitBand(alarm);
  const out: { from: number; to: number; kind: 'warn' | 'alarm' }[] = [];
  if (w.hi !== undefined) out.push({ from: w.hi, to: a.hi ?? max, kind: 'warn' });
  if (a.hi !== undefined) out.push({ from: a.hi, to: max, kind: 'alarm' });
  if (w.lo !== undefined) out.push({ from: a.lo ?? min, to: w.lo, kind: 'warn' });
  if (a.lo !== undefined) out.push({ from: min, to: a.lo, kind: 'alarm' });
  return out.filter((z) => z.to > z.from);
}

/* ------------------------------------------------------------------ */
/* Seven-segment encoding                                               */
/* ------------------------------------------------------------------ */

/** Segment order: a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left), g (middle). */
const SEG: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  A: 'abcefg',
  B: 'cdefg',
  C: 'adef',
  D: 'bcdeg',
  E: 'adefg',
  F: 'aefg',
  G: 'acdef',
  H: 'bcefg',
  I: 'ef',
  J: 'bcde',
  L: 'def',
  N: 'ceg',
  O: 'cdeg',
  P: 'abefg',
  R: 'eg',
  S: 'acdfg',
  T: 'defg',
  U: 'bcdef',
  Y: 'bcdfg',
  '-': 'g',
  _: 'd',
  ' ': '',
};

export interface SegCell {
  segs: string;
  dot: boolean;
  /** The source character, for assistive text and tests. */
  ch: string;
}

/**
 * Lay a string into `width` cells, right aligned. A '.' or ',' attaches to the
 * cell before it. Characters that cannot be drawn show as a single middle bar.
 * Overflow shows dashes in every cell (the display cannot fit the value).
 */
export function segmentCells(text: string, width: number): SegCell[] {
  const cells: SegCell[] = [];
  for (const raw of text.toUpperCase()) {
    if ((raw === '.' || raw === ',') && cells.length > 0 && !cells[cells.length - 1]!.dot) {
      cells[cells.length - 1]!.dot = true;
      continue;
    }
    if (raw === '.' || raw === ',') {
      cells.push({ segs: '', dot: true, ch: '.' });
      continue;
    }
    cells.push({ segs: SEG[raw] ?? 'g', dot: false, ch: raw });
  }
  const w = Math.max(1, Math.floor(width));
  if (cells.length > w) return Array.from({ length: w }, () => ({ segs: 'g', dot: false, ch: '-' }));
  while (cells.length < w) cells.unshift({ segs: '', dot: false, ch: ' ' });
  return cells;
}

/** Format a number for a fixed-width display: fixed decimals, or overflow dashes. */
export function formatForDisplay(value: number | string, decimals?: number): string {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '----';
  return decimals === undefined ? String(value) : value.toFixed(decimals);
}
