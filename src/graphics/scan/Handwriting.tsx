import type { ComponentChildren, CSSProperties } from 'preact';
import {
  arrowStrokes,
  circleStroke,
  growBounds,
  handStyle,
  inkPath,
  underlineStroke,
  writeText,
  type Bounds,
  type HandStyle,
  type InkKind,
  type Pt,
} from './pen';
import { hashString, jitter, mulberry32, range } from './rng';

export type NoteMark = 'none' | 'underline' | 'circle' | 'arrow-left' | 'arrow-right';

export interface InkGeometry {
  d: string;
  viewBox: string;
  width: number;
  height: number;
  /** Distance from the bottom of the box up to the first baseline, for inline alignment. */
  descent: number;
  ink: InkKind;
}

const PAD = 3;
const r1 = (n: number): number => Math.round(n * 10) / 10;

function geometry(strokes: Pt[][], bounds: Bounds, style: HandStyle, seedKey: string, penScale = 1): InkGeometry {
  const rng = mulberry32(hashString(`ink|${seedKey}`));
  const d = inkPath(strokes, { width: style.pen * penScale, variation: style.widthVar }, rng);
  const x = Math.floor(bounds.minX - PAD);
  const y = Math.floor(bounds.minY - PAD);
  const width = Math.ceil(bounds.maxX + PAD) - x;
  const height = Math.ceil(bounds.maxY + PAD) - y;
  return { d, viewBox: `${x} ${y} ${width} ${height}`, width, height, descent: r1(y + height), ink: style.ink };
}

export interface ComposeOptions {
  maxWidth?: number;
  size?: number;
  mark?: NoteMark;
}

/** Text plus an optional emphasis mark, as one ink path. Pure; usable without Preact. */
export function composeInk(text: string, hand: string | undefined, seed: number, opts: ComposeOptions = {}): InkGeometry {
  const style = handStyle(hand);
  const written = writeText(text, style, seed, { maxWidth: opts.maxWidth, size: opts.size });
  const rng = mulberry32(hashString(`mark|${style.id}|${seed}|${text}`));
  let strokes = written.strokes;
  let bounds = written.bounds;
  const mark = opts.mark ?? 'none';
  const b = written.bounds;
  if (mark === 'underline') {
    const extra = [underlineStroke(b.minX - 1, b.maxX + range(rng, 1, 5), b.maxY + range(rng, 2.5, 4), rng)];
    strokes = strokes.concat(extra);
    bounds = growBounds(bounds, extra);
  } else if (mark === 'circle') {
    const rx = (b.maxX - b.minX) / 2 + range(rng, 7, 10);
    const ry = (b.maxY - b.minY) / 2 + range(rng, 5, 7);
    const loop = [circleStroke((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, rx, ry, rng)];
    strokes = strokes.concat(loop);
    bounds = growBounds(bounds, loop);
    bounds = { minX: bounds.minX - 2, minY: bounds.minY - 2, maxX: bounds.maxX + 2, maxY: bounds.maxY + 2 };
  } else if (mark === 'arrow-left' || mark === 'arrow-right') {
    const midY = -5 * style.scale * (style.caps ? 1.6 : 1) + jitter(rng, 1.5);
    const len = range(rng, 20, 27);
    const left = mark === 'arrow-left';
    const from: Pt = { x: left ? b.minX - 5 : b.maxX + 5, y: midY };
    const to: Pt = { x: left ? from.x - len : from.x + len, y: midY + range(rng, 1, 5) };
    const arrow = arrowStrokes(from, to, rng, 5.5);
    strokes = strokes.concat(arrow);
    bounds = growBounds(bounds, arrow);
  }
  return geometry(strokes, bounds, style, `${style.id}|${seed}|${text}|${mark}`);
}

interface InkSvgProps {
  geo: InkGeometry;
  label?: string;
  class?: string;
  style?: CSSProperties;
  /** Unique-ish key for filter ids. */
  idKey: string;
}

/** Renders ink geometry. Pencil gets a fine graphite grain; ballpoint is solid. */
export function InkSvg({ geo, label, class: cls, style, idKey }: InkSvgProps) {
  const pencil = geo.ink === 'pencil';
  const fid = `ink-grain-${hashString(idKey).toString(36)}`;
  return (
    <svg
      class={`ink ink--${geo.ink}${cls ? ` ${cls}` : ''}`}
      width={geo.width}
      height={geo.height}
      viewBox={geo.viewBox}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
      style={style}
    >
      {pencil && (
        <defs>
          <filter id={fid} x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={hashString(idKey) % 997} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.28" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
        </defs>
      )}
      <path d={geo.d} fill="currentColor" filter={pencil ? `url(#${fid})` : undefined} />
    </svg>
  );
}

/** Flatten Preact children to the plain text a note says. */
export function textOf(children: ComponentChildren): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number' || typeof children === 'bigint') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

export interface HandwritingProps {
  text: string;
  hand?: string;
  seed?: number;
  /** Multiplier on the hand's natural size. */
  size?: number;
  /** Wrap width in px. */
  maxWidth?: number;
  mark?: NoteMark;
  /** Sit on the surrounding text baseline (single-line use). */
  inline?: boolean;
  class?: string;
}

/** Any text in a given hand, as an SVG path. */
export function Handwriting({ text, hand, seed = 1, size, maxWidth, mark, inline, class: cls }: HandwritingProps) {
  const geo = composeInk(text, hand, seed, { size, maxWidth, mark });
  return (
    <InkSvg
      geo={geo}
      label={text}
      class={cls}
      idKey={`${hand}|${seed}|${text}`}
      style={inline ? { verticalAlign: `${-geo.descent}px` } : undefined}
    />
  );
}

export interface MarginNoteProps {
  /** Whose handwriting: 'RT', 'JH', 'MKB', or any initials (a stable hand is derived). */
  hand?: string;
  seed?: number;
  children?: ComponentChildren;
  /** Wrap width in px. Defaults to the margin column. */
  width?: number;
  mark?: NoteMark;
  class?: string;
}

/** The contents of a margin note: the ink, plus the same words as real text for search, copy and screen readers. */
export function NoteInk({ text, hand, seed = 1, width = 112, mark }: { text: string; hand?: string; seed?: number; width?: number; mark?: NoteMark }) {
  const geo = composeInk(text, hand, seed, { maxWidth: width, mark });
  const tilt = jitter(mulberry32(hashString(`tilt|${hand}|${seed}|${text}`)), 2.2) - 1.2;
  return (
    <>
      <InkSvg geo={geo} idKey={`${hand}|${seed}|${text}`} style={{ transform: `rotate(${tilt.toFixed(2)}deg)` }} />
      <span class="scan-sr">
        [handwritten{hand ? `, ${hand}` : ''}: {text}]
      </span>
    </>
  );
}

/** A handwritten marginal note. Inside a ScanPage it floats into the right margin beside the text that follows it. */
export function MarginNote({ hand = 'RT', seed = 1, children, width, mark, class: cls }: MarginNoteProps) {
  const text = textOf(children).trim();
  return (
    <span class={`margin-note${cls ? ` ${cls}` : ''}`} data-hand={hand} data-seed={seed} data-mark={mark} data-scan-enhanced="">
      <NoteInk text={text} hand={hand} seed={seed} width={width} mark={mark} />
    </span>
  );
}

export interface RoutingInitialsProps {
  /** e.g. "JH" or "JH 5/2". */
  initials: string;
  seed?: number;
  /** Defaults to the letters at the start of `initials`. */
  hand?: string;
  size?: number;
}

/** Handwritten routing initials (optionally with a date), e.g. "JH 5/2". */
export function RoutingInitials({ initials, seed = 1, hand, size = 1.12 }: RoutingInitialsProps) {
  const who = hand ?? (/^[A-Za-z]+/.exec(initials.trim())?.[0] ?? 'RT');
  return <Handwriting text={initials} hand={who} seed={seed} size={size} class="routing-initials" />;
}

/* ------------------------------------------------------------------ */
/* Standalone marks, for laying over typed text                        */
/* ------------------------------------------------------------------ */

export interface InkMarkProps {
  hand?: string;
  seed?: number;
  class?: string;
}

function markGeo(strokes: Pt[][], hand: string | undefined, key: string): InkGeometry {
  const style = handStyle(hand);
  const bounds = growBounds({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }, strokes);
  return geometry(strokes, bounds, style, key);
}

/**
 * A loop drawn around a box of `width` x `height` px. The SVG is larger than
 * the box and absolutely positioned (`.ink-mark`) so that its origin lands on
 * the top-left corner of a `position: relative` parent the size of the box.
 */
export function InkCircle({ width, height, hand, seed = 1, class: cls }: InkMarkProps & { width: number; height: number }) {
  const rng = mulberry32(hashString(`circle|${hand}|${seed}|${width}x${height}`));
  const loop = circleStroke(width / 2, height / 2, width / 2 + range(rng, 6, 9), height / 2 + range(rng, 3.5, 5.5), rng);
  const geo = markGeo([loop], hand, `circle|${hand}|${seed}|${width}`);
  const [x, y] = geo.viewBox.split(' ').map(Number);
  return <InkSvg geo={geo} idKey={`c|${hand}|${seed}`} class={`ink-mark${cls ? ` ${cls}` : ''}`} style={{ left: `${x}px`, top: `${y}px` }} />;
}

/** An underline `width` px long; origin at its left end. */
export function InkUnderline({ width, hand, seed = 1, class: cls }: InkMarkProps & { width: number }) {
  const rng = mulberry32(hashString(`underline|${hand}|${seed}|${width}`));
  const geo = markGeo([underlineStroke(-1, width + range(rng, 1, 4), 0, rng)], hand, `u|${hand}|${seed}|${width}`);
  const [x, y] = geo.viewBox.split(' ').map(Number);
  return <InkSvg geo={geo} idKey={`u|${hand}|${seed}`} class={`ink-mark${cls ? ` ${cls}` : ''}`} style={{ left: `${x}px`, top: `${y}px` }} />;
}

/** An arrow from the origin to (dx, dy) px. */
export function InkArrow({ dx, dy, hand, seed = 1, class: cls }: InkMarkProps & { dx: number; dy: number }) {
  const rng = mulberry32(hashString(`arrow|${hand}|${seed}|${dx},${dy}`));
  const geo = markGeo(arrowStrokes({ x: 0, y: 0 }, { x: dx, y: dy }, rng), hand, `a|${hand}|${seed}|${dx}`);
  const [x, y] = geo.viewBox.split(' ').map(Number);
  return <InkSvg geo={geo} idKey={`a|${hand}|${seed}`} class={`ink-mark${cls ? ` ${cls}` : ''}`} style={{ left: `${x}px`, top: `${y}px` }} />;
}
