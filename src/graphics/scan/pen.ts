/**
 * Pen engine: turns text into filled SVG outline paths that look written by
 * hand. Pure functions, no DOM, deterministic from (text, hand, seed).
 *
 * Pipeline: glyph stroke data -> per-glyph jitter / slant / baseline wobble ->
 * smooth curve sampling -> variable half-width per sample (pressure, speed,
 * entry and exit taper) -> closed outline polygon with round caps.
 */
import { GLYPHS, SPACE_ADVANCE, type GlyphPoint } from './glyphs';
import { hashString, jitter, mulberry32, range, type Rng } from './rng';

export interface Pt {
  x: number;
  y: number;
  corner?: boolean;
}

export type InkKind = 'ballpoint' | 'pencil';

export interface HandStyle {
  id: string;
  ink: InkKind;
  /** Pixels per glyph unit (x-height is 10 units). */
  scale: number;
  /** Horizontal stretch of letterforms. */
  widthScale: number;
  /** Slant in radians, positive leans right. */
  slant: number;
  /** Point jitter in glyph units. */
  jitter: number;
  /** Baseline wander amplitude in glyph units. */
  wobble: number;
  /** Extra letter spacing in glyph units. */
  spacing: number;
  /** Nominal pen width in px. */
  pen: number;
  /** 0..1, how much the line width responds to direction and speed. */
  widthVar: number;
  /** Writes in block capitals. */
  caps: boolean;
  /** Baseline slope per line (px per px); negative climbs to the right. */
  drift: number;
  /** Line height in glyph units. */
  leading: number;
}

const PRESETS: Record<string, Omit<HandStyle, 'id'>> = {
  // Quick, right-leaning ballpoint. Writes small, climbs slightly.
  RT: { ink: 'ballpoint', scale: 0.84, widthScale: 0.96, slant: 0.2, jitter: 0.3, wobble: 0.55, spacing: 0.7, pen: 1.15, widthVar: 0.4, caps: false, drift: -0.022, leading: 27 },
  // Upright, tidy, heavier pressure.
  JH: { ink: 'ballpoint', scale: 0.78, widthScale: 1.04, slant: 0.03, jitter: 0.17, wobble: 0.25, spacing: 1.1, pen: 1.35, widthVar: 0.22, caps: false, drift: 0.004, leading: 28 },
  // Engineer's block capitals in pencil.
  MKB: { ink: 'pencil', scale: 0.66, widthScale: 0.94, slant: 0.1, jitter: 0.24, wobble: 0.3, spacing: 1.6, pen: 1.4, widthVar: 0.3, caps: true, drift: -0.006, leading: 25 },
};

/** A known hand, or a stable one derived from the name so every initialer writes consistently. */
export function handStyle(hand: string | undefined): HandStyle {
  const id = (hand ?? 'RT').trim() || 'RT';
  const preset = PRESETS[id.toUpperCase()];
  if (preset) return { id, ...preset };
  const r = mulberry32(hashString(`hand:${id}`));
  const caps = r() < 0.25;
  return {
    id,
    ink: r() < 0.3 ? 'pencil' : 'ballpoint',
    scale: caps ? range(r, 0.56, 0.64) : range(r, 0.74, 0.88),
    widthScale: range(r, 0.9, 1.08),
    slant: range(r, -0.04, 0.24),
    jitter: range(r, 0.16, 0.3),
    wobble: range(r, 0.2, 0.5),
    spacing: range(r, 0.6, 1.5),
    pen: range(r, 1.05, 1.35),
    widthVar: range(r, 0.2, 0.4),
    caps,
    drift: range(r, -0.02, 0.008),
    leading: range(r, 25, 28),
  };
}

export const HAND_IDS: readonly string[] = Object.keys(PRESETS);

/* ------------------------------------------------------------------ */
/* Curve sampling                                                      */
/* ------------------------------------------------------------------ */

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
}

/** Sample a smooth curve through `pts` roughly every `step` px. */
function sampleRun(pts: readonly Pt[], step: number): Pt[] {
  const n = pts.length;
  const first = pts[0];
  if (!first) return [];
  if (n === 1) return [{ x: first.x, y: first.y }];
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p0 = pts[i - 1] ?? p1;
    const p3 = pts[i + 2] ?? p2;
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const k = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      out.push({ x: catmull(p0.x, p1.x, p2.x, p3.x, t), y: catmull(p0.y, p1.y, p2.y, p3.y, t) });
    }
  }
  const last = pts[n - 1]!;
  out.push({ x: last.x, y: last.y });
  return out;
}

/** Split a stroke at hard corners into independently smoothed runs. */
function splitRuns(pts: readonly Pt[]): Pt[][] {
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  pts.forEach((p, i) => {
    cur.push(p);
    if (p.corner && i > 0 && i < pts.length - 1) {
      runs.push(cur);
      cur = [p];
    }
  });
  if (cur.length) runs.push(cur);
  return runs;
}

/* ------------------------------------------------------------------ */
/* Outline construction                                                */
/* ------------------------------------------------------------------ */

export interface PenOptions {
  /** Nominal line width in px. */
  width: number;
  /** 0..1 response to direction/speed. */
  variation: number;
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

function outlineRun(samples: readonly Pt[], pen: PenOptions, rng: Rng, taperStart: boolean, taperEnd: boolean): string {
  const n = samples.length;
  if (n === 0) return '';
  const base = pen.width / 2;
  const first = samples[0]!;
  if (n === 1) {
    const r = base * 1.15;
    return `M${f(first.x - r)} ${f(first.y)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(samples[i]!.x - samples[i - 1]!.x, samples[i]!.y - samples[i - 1]!.y);
  const isDot = total < pen.width * 1.6;
  const left: string[] = [];
  const right: string[] = [];
  // Slow pressure drift along the stroke.
  const phase = rng() * Math.PI * 2;
  const freq = range(rng, 0.05, 0.11);
  let travelled = 0;
  let hFirst = base;
  let hLast = base;
  for (let i = 0; i < n; i++) {
    const p = samples[i]!;
    const a = samples[Math.max(0, i - 1)]!;
    const b = samples[Math.min(n - 1, i + 1)]!;
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    if (i > 0) travelled += Math.hypot(p.x - a.x, p.y - a.y);
    // Downstrokes (screen y increasing) press harder; sideways and up strokes run lighter.
    let k = 1 + pen.variation * (0.55 * Math.max(0, ty) - 0.28 * Math.max(0, -ty) - 0.1 * Math.abs(tx));
    k *= 1 + pen.variation * 0.3 * Math.sin(phase + travelled * freq);
    if (isDot) k = 1.3;
    else {
      if (taperStart) k *= 0.82 + 0.18 * Math.min(1, travelled / (pen.width * 2.2));
      if (taperEnd) k *= 0.58 + 0.42 * Math.min(1, (total - travelled) / (pen.width * 3.2));
    }
    const h = Math.max(0.22, base * k);
    if (i === 0) hFirst = h;
    if (i === n - 1) hLast = h;
    const nx = -ty * h;
    const ny = tx * h;
    left.push(`${f(p.x + nx)} ${f(p.y + ny)}`);
    right.push(`${f(p.x - nx)} ${f(p.y - ny)}`);
  }
  right.reverse();
  return `M${left.join('L')}A${f(hLast)} ${f(hLast)} 0 0 0 ${right[0]}L${right.join('L')}A${f(hFirst)} ${f(hFirst)} 0 0 0 ${left[0]}Z`;
}

/**
 * Convert pen strokes (px, y down) to one filled path. Each stroke is a list of
 * points the pen passes through; `corner` points break the curve.
 */
export function inkPath(strokes: readonly (readonly Pt[])[], pen: PenOptions, rng: Rng): string {
  let d = '';
  const step = Math.max(0.9, pen.width * 0.9);
  for (const stroke of strokes) {
    const runs = splitRuns(stroke);
    runs.forEach((run, i) => {
      d += outlineRun(sampleRun(run, step), pen, rng, i === 0, i === runs.length - 1);
    });
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Text layout                                                         */
/* ------------------------------------------------------------------ */

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WrittenText {
  /** Pen strokes in px (y down), origin at the first line's baseline start. */
  strokes: Pt[][];
  bounds: Bounds;
  /** Number of lines after wrapping. */
  lines: number;
}

export interface WriteOptions {
  /** Wrap width in px; unset = single line. */
  maxWidth?: number;
  /** Multiplies the hand's scale. */
  size?: number;
}

function advanceOf(ch: string, style: HandStyle): number {
  const g = GLYPHS.get(ch);
  return ((g ? g.w : SPACE_ADVANCE) + (g ? style.spacing : 0)) * style.widthScale;
}

function wrap(text: string, style: HandStyle, scale: number, maxWidth: number | undefined): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    let width = 0;
    for (const word of words) {
      let ww = 0;
      for (const ch of word) ww += advanceOf(ch, style) * scale;
      const sp = line ? advanceOf(' ', style) * scale : 0;
      if (line && maxWidth !== undefined && width + sp + ww > maxWidth) {
        lines.push(line);
        line = word;
        width = ww;
      } else {
        line = line ? `${line} ${word}` : word;
        width += sp + ww;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Lay text out as pen strokes in the given hand. */
export function writeText(text: string, style: HandStyle, seed: number, opts: WriteOptions = {}): WrittenText {
  const rng = mulberry32(hashString(`${style.id}|${seed}|${text}`));
  const scale = style.scale * (opts.size ?? 1);
  const source = style.caps ? text.toUpperCase() : text;
  const lines = wrap(source.trim(), style, scale, opts.maxWidth);
  const strokes: Pt[][] = [];
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  lines.forEach((line, li) => {
    const baseY = li * style.leading * scale;
    // Each line starts a little differently and wanders on a slow wave.
    let x = li === 0 ? 0 : jitter(rng, 2.2) * scale;
    const wavePhase = rng() * Math.PI * 2;
    const waveLen = range(rng, 42, 78);
    const lineDrift = style.drift + jitter(rng, 0.008);
    for (const ch of line) {
      const glyph = GLYPHS.get(ch);
      if (!glyph) {
        x += advanceOf(' ', style) * scale * (1 + jitter(rng, 0.18));
        continue;
      }
      const gs = scale * (1 + jitter(rng, 0.055));
      const slant = Math.tan(style.slant + jitter(rng, 0.045));
      const rot = jitter(rng, 0.03);
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const dy =
        baseY + lineDrift * x + (Math.sin(wavePhase + (x / waveLen) * Math.PI * 2) * style.wobble + jitter(rng, style.wobble * 0.55)) * scale;
      const place = (p: GlyphPoint): Pt => {
        const ux = (p.x + jitter(rng, style.jitter)) * style.widthScale;
        const uy = p.y + jitter(rng, style.jitter);
        const sx = ux + uy * slant;
        const px = (sx * cos - uy * sin) * gs;
        const py = (sx * sin + uy * cos) * gs;
        const out: Pt = { x: x + px, y: dy - py };
        if (p.corner) out.corner = true;
        if (out.x < bounds.minX) bounds.minX = out.x;
        if (out.x > bounds.maxX) bounds.maxX = out.x;
        if (out.y < bounds.minY) bounds.minY = out.y;
        if (out.y > bounds.maxY) bounds.maxY = out.y;
        return out;
      };
      for (const stroke of glyph.strokes) strokes.push(stroke.map(place));
      x += advanceOf(ch, style) * scale * (1 + jitter(rng, 0.07));
    }
  });

  if (!Number.isFinite(bounds.minX)) return { strokes, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, lines: lines.length };
  return { strokes, bounds, lines: lines.length };
}

/* ------------------------------------------------------------------ */
/* Marks: underline, circle-around, arrow, check                       */
/* ------------------------------------------------------------------ */

/** A quick underline from (x0,y) to (x1,y) with a slight bow. */
export function underlineStroke(x0: number, x1: number, y: number, rng: Rng): Pt[] {
  const w = x1 - x0;
  const tilt = jitter(rng, Math.min(2.2, Math.abs(w) * 0.03));
  return [
    { x: x0, y: y + tilt * 0.5 + jitter(rng, 0.4) },
    { x: x0 + w * 0.34, y: y + jitter(rng, 0.7) + 0.5 },
    { x: x0 + w * 0.7, y: y - tilt * 0.2 + jitter(rng, 0.7) },
    { x: x1, y: y - tilt * 0.5 + jitter(rng, 0.4) },
  ];
}

/** A hand-drawn loop around a box centred on (cx,cy): starts upper left, overshoots its start. */
export function circleStroke(cx: number, cy: number, rx: number, ry: number, rng: Rng): Pt[] {
  const pts: Pt[] = [];
  const start = -Math.PI * range(rng, 0.68, 0.8);
  const turns = range(rng, 1.07, 1.16);
  const steps = 15;
  const tilt = jitter(rng, 0.12);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Counter-clockwise on screen, radius drifting so the end misses the start.
    const a = start - t * turns * Math.PI * 2;
    const grow = 1 + 0.1 * (t - 0.5) + jitter(rng, 0.025);
    const ex = Math.cos(a) * rx * grow;
    const ey = Math.sin(a) * ry * grow;
    pts.push({ x: cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), y: cy + ex * Math.sin(tilt) + ey * Math.cos(tilt) });
  }
  return pts;
}

/** A slightly curved arrow shaft plus a two-stroke head at `to`. */
export function arrowStrokes(from: Pt, to: Pt, rng: Rng, head = 6): Pt[][] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bow = jitter(rng, len * 0.09) + len * 0.05;
  const mid: Pt = { x: from.x + dx * 0.5 - uy * bow, y: from.y + dy * 0.5 + ux * bow };
  // Head direction follows the curve's end tangent.
  let hx = to.x - mid.x;
  let hy = to.y - mid.y;
  const hl = Math.hypot(hx, hy) || 1;
  hx /= hl;
  hy /= hl;
  const wing = (angle: number): Pt => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const l = head * (1 + jitter(rng, 0.2));
    return { x: to.x - (hx * c - hy * s) * l, y: to.y - (hx * s + hy * c) * l };
  };
  return [
    [from, mid, to],
    [wing(0.5 + jitter(rng, 0.08)), { ...to, corner: true }, wing(-0.5 + jitter(rng, 0.08))],
  ];
}

/** A check mark filling a box of the given size with its top-left at (x,y). */
export function checkStroke(x: number, y: number, size: number, rng: Rng): Pt[] {
  return [
    { x: x + size * 0.12 + jitter(rng, 0.5), y: y + size * 0.52 + jitter(rng, 0.5) },
    { x: x + size * 0.4 + jitter(rng, 0.5), y: y + size * 0.86 + jitter(rng, 0.4), corner: true },
    { x: x + size * 1.18 + jitter(rng, 0.8), y: y - size * 0.22 + jitter(rng, 0.8) },
  ];
}

export function growBounds(b: Bounds, strokes: readonly (readonly Pt[])[]): Bounds {
  const out = { ...b };
  for (const s of strokes)
    for (const p of s) {
      if (p.x < out.minX) out.minX = p.x;
      if (p.x > out.maxX) out.maxX = p.x;
      if (p.y < out.minY) out.minY = p.y;
      if (p.y > out.maxY) out.maxY = p.y;
    }
  return out;
}
