/**
 * @graphics/seal: the OSC seal and the five division marks.
 *
 * Everything here is original artwork drawn in code. The seal is not derived
 * from any real seal or coat of arms. Colours come from tokens only:
 *   --seal-ink    (defaults to --title-active-bg)
 *   --seal-paper  (defaults to --paper)
 * See README.md for the design notes and the rendered check.
 */
import type { JSX } from 'preact';
import { useId } from 'preact/hooks';

export type SealVariant = 'full' | 'mono' | 'tiny';
export type DivisionCode = 'RD' | 'OIA' | 'TO' | 'FE' | 'PV';

export interface SealProps {
  /** Rendered width and height in CSS pixels. */
  size: number;
  variant: SealVariant;
  /** Accessible name. Omit for decorative use (watermark); the SVG is then aria-hidden. */
  title?: string;
  /** Legend around the top of the ring. */
  legend?: string;
  /** Founding line around the bottom of the ring. */
  founded?: string;
  /** Number of marks in the inner band: one per registered facility. Defaults to canon.headline.facilities (see setSealCanon). */
  marks?: number;
  class?: string;
}

export interface DivisionMarkProps {
  division: DivisionCode;
  size: number;
  /** Accessible name. Defaults to the division's full name. */
  title?: string;
  class?: string;
}

export const DIVISION_NAMES: Record<DivisionCode, string> = {
  RD: 'Records Division',
  OIA: 'Office of Internal Assurance',
  TO: 'Transit Operations',
  FE: 'Facilities Engineering',
  PV: 'Personnel & Vetting',
};

const INK = 'var(--seal-ink, var(--title-active-bg, currentColor))';
const PAPER = 'var(--seal-paper, var(--paper, transparent))';
/** The attribute carries the no-token fallback; the style carries the token. */
const FONT_ATTR = 'Arial, Helvetica, sans-serif';
const FONT_STYLE = 'var(--font-ui, Arial), Arial, Helvetica, sans-serif';

const DEFAULT_LEGEND = 'OFFICE OF STRATEGIC CONTINUITY';
/**
 * Defaults for the founding line and the facility band. The module does not import canon
 * (the seal is in the shell's initial chunk; canon loads lazily), so the shell sets these
 * from canon with setSealCanon() once canon has loaded: founded from the first programme
 * phase's start year (canon.phases[0].startYear), marks from canon.headline.facilities.
 * The literals below are only the pre-canon fallback and equal the canon values.
 */
let DEFAULT_FOUNDED = 'ESTABLISHED MMI';
let DEFAULT_MARKS = 47;

/** 2001 -> "MMI". */
export function romanYear(year: number): string {
  const table: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let n = Math.max(0, Math.floor(year));
  let out = '';
  for (const [v, s] of table) for (; n >= v; n -= v) out += s;
  return out;
}

/** Set the seal's canon-derived defaults (shell, after canon loads). */
export function setSealCanon(c: { foundedYear?: number | null; facilities?: number | null }): void {
  if (c.foundedYear) DEFAULT_FOUNDED = `ESTABLISHED ${romanYear(c.foundedYear)}`;
  if (c.facilities) DEFAULT_MARKS = c.facilities;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Point on a circle about the seal centre; angle in degrees clockwise from 12 o'clock. */
function polar(radius: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [r2(100 + radius * Math.sin(a)), r2(100 - radius * Math.cos(a))];
}

function a11y(title: string | undefined): { role?: 'img'; 'aria-label'?: string; 'aria-hidden'?: true; focusable?: 'false' } {
  return title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: 'false' };
}

/* ------------------------------------------------------------------ */
/* Seal, drawn on a 200 x 200 field                                    */
/* ------------------------------------------------------------------ */

function tickPath(count: number): string {
  const n = Math.max(1, Math.floor(count));
  let d = '';
  for (let i = 0; i < n; i++) {
    const deg = (360 / n) * i;
    const [x1, y1] = polar(60.6, deg);
    const [x2, y2] = polar(64.8, deg);
    d += `M${x1} ${y1}L${x2} ${y2}`;
  }
  return d;
}

function lozenge(deg: number): string {
  const [x, y] = polar(81.5, deg);
  return `M${x} ${r2(y - 3.2)}L${r2(x + 3.2)} ${y}L${x} ${r2(y + 3.2)}L${r2(x - 3.2)} ${y}Z`;
}

/** Circle path starting at 6 o'clock, clockwise: its midpoint is 12 o'clock. */
const TOP_ARC = 'M100 177.4A77.4 77.4 0 0 1 100 22.6A77.4 77.4 0 0 1 100 177.4';
/** Circle path starting at 12 o'clock, anticlockwise: its midpoint is 6 o'clock, reading left to right. */
const BOTTOM_ARC = 'M100 13.8A86.2 86.2 0 0 0 100 186.2A86.2 86.2 0 0 0 100 13.8';

const MOUNTAIN = 'M40 115L71 84L79 91L100 61L119 90L128 82L160 115Z';
const PORTAL_OUTER = 'M88.5 115V100A11.5 11.5 0 0 1 111.5 100V115Z';
const PORTAL_LEAF = 'M92 115V100A8 8 0 0 1 108 100V115Z';

function SealArt({ ink, paper, legend, founded, marks }: {
  ink: string;
  paper: string | null;
  legend: string;
  founded: string;
  marks: number;
}): JSX.Element {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const topId = `osc-seal-t-${uid}`;
  const botId = `osc-seal-b-${uid}`;
  const maskId = `osc-seal-m-${uid}`;
  const clipId = `osc-seal-c-${uid}`;
  const text = {
    'font-family': FONT_ATTR,
    'font-weight': 700,
    'text-anchor': 'middle' as const,
    style: { fontFamily: FONT_STYLE, fill: ink, textTransform: 'uppercase' as const },
  };
  return (
    <>
      <defs>
        <path id={topId} d={TOP_ARC} />
        <path id={botId} d={BOTTOM_ARC} />
        <clipPath id={clipId}>
          <circle cx="100" cy="100" r="57" />
        </clipPath>
        {/* White prints in ink; black is knocked out to the paper. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <g clip-path={`url(#${clipId})`}>
            <g fill="none" stroke="#fff" stroke-width="0.9">
              <ellipse cx="100" cy="100" rx="19" ry="56.6" />
              <ellipse cx="100" cy="100" rx="38.5" ry="56.6" />
              <path d="M40 62H160M40 80H160M40 98H160" />
            </g>
            <path d="M100 43V70" stroke="#fff" stroke-width="2.4" />
            <path d={MOUNTAIN} fill="#fff" />
            <rect x="40" y="114.5" width="120" height="50" fill="#fff" />
            {/* portal, strata and the meridian carried below grade */}
            <path d={PORTAL_OUTER} fill="#000" />
            <path d={PORTAL_LEAF} fill="#fff" />
            <path d="M100 93V115" stroke="#000" stroke-width="1.2" />
            <path d="M40 116.2H88.5M111.5 116.2H160" stroke="#000" stroke-width="1.3" />
            <path d="M52 126H148M59 135H141M68 144H132" stroke="#000" stroke-width="1.3" />
            <path d="M100 115V144" stroke="#000" stroke-width="2.4" />
            <rect x="95.6" y="139.6" width="8.8" height="8.8" fill="#000" />
            <rect x="97.9" y="141.9" width="4.2" height="4.2" fill="#fff" />
          </g>
        </mask>
      </defs>

      {paper !== null && <circle cx="100" cy="100" r="99" style={{ fill: paper }} />}

      <g fill="none" style={{ stroke: ink }}>
        <circle cx="100" cy="100" r="97.4" stroke-width="3.2" />
        <circle cx="100" cy="100" r="92.6" stroke-width="0.8" />
        <circle cx="100" cy="100" r="68.4" stroke-width="0.8" />
        <path d={tickPath(marks)} stroke-width="1.15" />
        <circle cx="100" cy="100" r="57.4" stroke-width="1.8" />
      </g>

      <path d={lozenge(113) + lozenge(-113)} style={{ fill: ink }} />

      <text {...text} font-size="10.6">
        <textPath href={`#${topId}`} startOffset="50%" textLength="226" lengthAdjust="spacing">
          {legend}
        </textPath>
      </text>
      <text {...text} font-size="9.4">
        <textPath href={`#${botId}`} startOffset="50%" textLength={Math.min(200, r2(founded.length * 7.4))} lengthAdjust="spacing">
          {founded}
        </textPath>
      </text>

      <rect x="40" y="40" width="120" height="120" mask={`url(#${maskId})`} style={{ fill: ink }} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tiny seal: redrawn on a 16 x 16 pixel grid                          */
/* ------------------------------------------------------------------ */

/** '#' ink, 'o' paper, '.' clear. Ring, peak, portal, one stratum. */
const TINY_BITMAP: readonly string[] = [
  '.....######.....',
  '...##oooooo##...',
  '..#oooooooooo#..',
  '.#ooooo##ooooo#.',
  '.#oooo####oooo#.',
  '#oooo######oooo#',
  '#ooo########ooo#',
  '#oo####oo####oo#',
  '#o#####oo#####o#',
  '################',
  '################',
  '.###oooooooo###.',
  '.##############.',
  '..############..',
  '...##########...',
  '.....######.....',
];

/** One path of merged horizontal runs for a given cell character. */
function bitmapPath(rows: readonly string[], ch: string): string {
  let d = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== ch) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      d += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return d;
}

const TINY_INK = bitmapPath(TINY_BITMAP, '#');
const TINY_PAPER = bitmapPath(TINY_BITMAP, 'o');

/* ------------------------------------------------------------------ */

export function Seal(props: SealProps): JSX.Element {
  const { size, variant, title } = props;
  const common = {
    width: size,
    height: size,
    class: props.class,
    'data-seal': variant,
    ...a11y(title),
  };
  if (variant === 'tiny') {
    return (
      <svg {...common} viewBox="0 0 16 16" shape-rendering="crispEdges">
        <path d={TINY_PAPER} style={{ fill: PAPER }} />
        <path d={TINY_INK} style={{ fill: INK }} />
      </svg>
    );
  }
  return (
    <svg {...common} viewBox="0 0 200 200">
      <SealArt
        ink={variant === 'mono' ? 'currentColor' : INK}
        paper={variant === 'mono' ? null : PAPER}
        legend={props.legend ?? DEFAULT_LEGEND}
        founded={props.founded ?? DEFAULT_FOUNDED}
        marks={props.marks ?? DEFAULT_MARKS}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Division marks, drawn on a 64 x 64 field                            */
/* ------------------------------------------------------------------ */

function gearTeeth(): string {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const pt = (rad: number, half: number): string =>
      `${r2(32 + rad * s + half * c)} ${r2(24.5 - rad * c + half * s)}`;
    d += `M${pt(7, -2.3)}L${pt(11.6, -1.8)}L${pt(11.6, 1.8)}L${pt(7, 2.3)}Z`;
  }
  return d;
}
const GEAR_TEETH = gearTeeth();

function Device({ division }: { division: DivisionCode }): JSX.Element {
  const line = { fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'miter' as const, style: { stroke: INK } };
  const fine = { ...line, 'stroke-width': 1.5 };
  const solid = { style: { fill: INK } };
  switch (division) {
    case 'RD':
      // tabbed file folder with two ruled lines
      return (
        <>
          <path d="M20 35.5V14.5H28.5L31.5 18H44V35.5Z" {...line} />
          <path d="M24.5 24H39.5M24.5 29.5H39.5" {...fine} />
        </>
      );
    case 'OIA':
      // verification box: a square frame, checked
      return (
        <>
          <path d="M22.5 15H41.5V34H22.5Z" {...line} />
          <path d="M26.5 24.5L30.5 29L37.5 19.5" {...line} stroke-width={2.6} />
        </>
      );
    case 'TO':
      // tunnel bore with a track running to the vanishing point
      return (
        <>
          <path d="M20.5 36V24.5A11.5 11.5 0 0 1 43.5 24.5V36" {...line} />
          <path d="M25.5 36L30.8 21M38.5 36L33.2 21" {...fine} />
          <path d="M26.5 32.5H37.5M28.2 28H35.8M30 24H34" {...fine} stroke-width={1.2} />
        </>
      );
    case 'FE':
      // eight-tooth gear
      return (
        <>
          <path d={GEAR_TEETH} {...solid} />
          <circle cx="32" cy="24.5" r="8" {...solid} />
          <circle cx="32" cy="24.5" r="3.4" style={{ fill: PAPER }} />
        </>
      );
    case 'PV':
      // identification photograph: head and shoulders in a frame
      return (
        <>
          <path d="M21.5 13.5H42.5V36H21.5Z" {...fine} />
          <circle cx="32" cy="21.5" r="4" {...solid} />
          <path d="M24.5 35.2V33A7.5 6.5 0 0 1 39.5 33V35.2Z" {...solid} />
        </>
      );
  }
}

const CODE_SPACING: Record<DivisionCode, number> = { RD: 1.4, OIA: 1.1, TO: 1.4, FE: 1.4, PV: 1.4 };

export function DivisionMark(props: DivisionMarkProps): JSX.Element {
  const { division, size } = props;
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const clipId = `osc-div-c-${uid}`;
  const spacing = CODE_SPACING[division];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      class={props.class}
      data-division={division}
      {...a11y(props.title ?? DIVISION_NAMES[division])}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="27.2" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30.6" stroke-width="2.4" style={{ fill: PAPER, stroke: INK }} />
      <circle cx="32" cy="32" r="27.2" fill="none" stroke-width="0.8" style={{ stroke: INK }} />
      <rect x="0" y="41.5" width="64" height="24" clip-path={`url(#${clipId})`} style={{ fill: INK }} />
      <Device division={division} />
      <text
        x={32 + spacing / 2}
        y="53.4"
        font-family={FONT_ATTR}
        font-size="10.5"
        font-weight="700"
        text-anchor="middle"
        letter-spacing={spacing}
        style={{ fontFamily: FONT_STYLE, fill: PAPER }}
      >
        {division}
      </text>
    </svg>
  );
}
