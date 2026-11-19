/**
 * @graphics/banners — asset family 12.
 * Classification banners, per-window marking strips, the document cover sheet
 * and the rubber stamp set of the fictional OSC marking system.
 *
 * Marking colours are never defined here: every component takes a canon
 * `Marking` and reads `bannerBg` / `bannerFg` from it at runtime.
 * All wording and layouts are original to this project.
 */
import { render } from 'preact';
import type { JSX } from 'preact';
import type { Marking, MarkingId } from '@core/canon-types';
import './banners.css';
import './stamps.css';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** `2008-05-02` -> `02 MAY 2008`. Anything else is passed through in capitals. */
export function formatStampDate(input: string | undefined | null): string {
  if (!input) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
  if (!m) return input.trim().toUpperCase();
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return input.trim().toUpperCase();
  return `${m[3]} ${month} ${m[1]}`;
}

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** Marking colours as custom properties. Anything that is not a hex colour is dropped. */
function markingVars(marking: Marking): string {
  const bg = HEX.test(marking.bannerBg) ? marking.bannerBg : 'currentColor';
  const fg = HEX.test(marking.bannerFg) ? marking.bannerFg : 'inherit';
  return `--mk-bg:${bg};--mk-fg:${fg}`;
}

/* ------------------------------------------------------------------ */
/* Banner and strip                                                    */
/* ------------------------------------------------------------------ */

export interface ClassificationBannerProps {
  marking: Marking;
  position: 'top' | 'bottom';
}

/** Full-width 18px bar. The shell places one at the top and one at the bottom of the viewport. */
export function ClassificationBanner({ marking, position }: ClassificationBannerProps) {
  return (
    <div
      class="cls-banner"
      data-position={position}
      data-marking={marking.id}
      style={markingVars(marking)}
      role={position === 'top' ? 'note' : undefined}
      aria-label={position === 'top' ? `Session marking: ${marking.label}` : undefined}
      aria-hidden={position === 'bottom' ? true : undefined}
    >
      <span class="cls-banner__label">{marking.label}</span>
    </div>
  );
}

/**
 * Canon markings used to resolve a MarkingId passed to MarkingStrip. The shell
 * registers them once canon has loaded (kept out of this module so the initial
 * chunk does not carry canon); a `markings` prop overrides the registry.
 */
let registeredMarkings: readonly Marking[] = [];
export function registerMarkings(markings: readonly Marking[]): void {
  registeredMarkings = markings;
}

/** Resolve a marking id against the given list (or the registered canon markings). */
export function resolveMarking(marking: Marking | MarkingId, markings: readonly Marking[] = registeredMarkings): Marking | null {
  if (typeof marking !== 'string') return marking;
  return markings.find((m) => m.id === marking) ?? null;
}

export interface MarkingStripProps {
  /** A canon Marking, or its id (resolved against `markings` or the registered canon markings). */
  marking: Marking | MarkingId;
  markings?: readonly Marking[];
}

/** Thin strip that sits directly under a window title bar. Renders nothing for an unknown id. */
export function MarkingStrip(props: MarkingStripProps) {
  const marking = resolveMarking(props.marking, props.markings);
  if (!marking) return null;
  return (
    <div class="mk-strip" data-marking={marking.id} style={markingVars(marking)} aria-label={`Window marking: ${marking.label}`}>
      <span class="mk-strip__label">{marking.label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cover sheet                                                         */
/* ------------------------------------------------------------------ */

export interface CoverSheetProps {
  marking: Marking;
  docNo: string;
  title: string;
  copyNo?: number;
  copiesTotal?: number;
  distribution?: string[];
  originator: string;
  date: string;
  /** Number of empty ruled lines in the receipt and access record. */
  logRows?: number;
}

const HANDLING: readonly string[] = [
  'This cover sheet remains attached while the document is outside an approved container. Remove it only to read the document, and replace it before the document leaves your hands.',
  'The holder named on the last completed line of the record below is accountable for this copy until the next line is completed.',
  'Do not leave this copy unattended on a desk, in a vehicle, or in any room that is not posted for this marking. Return it to the container before you leave the room.',
  'Contents are not to be discussed, summarised or quoted to any person whose access has not been confirmed with the originating division.',
  'No copies, extracts, transcriptions or photographs are to be made of this document except by the originating registry, which will number them.',
  'If this copy is found unattended, do not read it. Place it face down, remain with it, and call the site security desk.',
];

const BLANK = ' ';

export function CoverSheet(props: CoverSheetProps) {
  const { marking, docNo, title, copyNo, copiesTotal, distribution, originator, date } = props;
  const rows = Math.max(4, props.logRows ?? 16);
  const dist = distribution ?? [];
  const copyText = (
    <>
      <span class="cs-fill">{copyNo != null ? String(copyNo).padStart(2, '0') : BLANK}</span>
      {' of '}
      <span class="cs-fill">{copiesTotal != null ? String(copiesTotal).padStart(2, '0') : BLANK}</span>
    </>
  );
  return (
    <section class="cover-sheet" data-marking={marking.id} style={markingVars(marking)} aria-label={`Cover sheet, ${docNo}, ${marking.label}`}>
      <div class="cs-inner">
        <header class="cs-head">
          <div class="cs-head__org">
            <div class="cs-head__name">Office of Strategic Continuity</div>
            <div class="cs-head__sub">Central Registry</div>
          </div>
          <div class="cs-head__title">Controlled Document Cover Sheet</div>
          <div class="cs-head__form">
            <div>OSC FORM 114</div>
            <div>REV 03-07</div>
          </div>
        </header>

        <div class="cs-marking">
          <div class="cs-marking__bar" />
          <div class="cs-marking__label">{marking.label}</div>
          <div class="cs-marking__usage">The attached document carries the marking shown above. Applied to: {marking.usage}</div>
          <div class="cs-marking__bar" />
        </div>

        <table class="cs-control">
          <caption>1. Document control</caption>
          <tbody>
            <tr>
              <th scope="row">Document no.</th>
              <td class="cs-mono">{docNo}</td>
              <th scope="row">Copy</th>
              <td class="cs-mono">{copyText}</td>
            </tr>
            <tr>
              <th scope="row">Title</th>
              <td colSpan={3}>{title}</td>
            </tr>
            <tr>
              <th scope="row">Originator</th>
              <td>{originator}</td>
              <th scope="row">Date</th>
              <td class="cs-mono">{formatStampDate(date)}</td>
            </tr>
            <tr>
              <th scope="row">Distribution</th>
              <td colSpan={3}>
                {dist.length > 0 ? (
                  <ol class="cs-dist">
                    {dist.map((d, i) => (
                      <li key={d}>
                        <span class="cs-mono">{String(i + 1).padStart(2, '0')}</span> {d}
                      </li>
                    ))}
                  </ol>
                ) : (
                  'As recorded in the registry distribution ledger for this document number.'
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="cs-handling">
          <div class="cs-section">2. Handling</div>
          <ol>
            {HANDLING.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </div>

        <table class="cs-log">
          <caption>3. Receipt and access record (complete one line each time this copy changes hands or is opened)</caption>
          <thead>
            <tr>
              <th scope="col" class="cs-log__n">Line</th>
              <th scope="col">Date</th>
              <th scope="col">Time (Z)</th>
              <th scope="col" class="cs-log__name">Name (print)</th>
              <th scope="col">Operator ID</th>
              <th scope="col">Received from</th>
              <th scope="col">Initials</th>
              <th scope="col">Returned</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                <td class="cs-log__n cs-mono">{String(i + 1).padStart(2, '0')}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
                <td>{BLANK}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer class="cs-foot">
          <span>When every line is used, attach a continuation sheet and file this one with the registry.</span>
          <span>Detached from its document, this sheet carries no marking of its own.</span>
          <span class="cs-mono cs-foot__ref">{docNo}</span>
        </footer>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stamps                                                              */
/* ------------------------------------------------------------------ */

export const STAMP_KINDS = [
  'RECEIVED',
  'COPY-NO',
  'FILE-COPY',
  'SUPERSEDED',
  'CANCELLED',
  'ACTION',
  'INFO',
  'DISTRIBUTION-LIMITED',
  'REPRODUCTION-PROHIBITED',
  'NO-ELECTRONIC-COPY',
  'REVIEWED-OIA',
  'DESTROY-BY',
  'VOID',
  'TSSCI-OSC',
  'UMBRA-R',
  'UMBRA-C',
  'UMBRA-U',
  'UMBRA-EO',
] as const;

export type StampKind = (typeof STAMP_KINDS)[number];
export type StampInk = 'red' | 'blue';

/** Stamp face text for the marking stamps when no `marking` or `text` is supplied. */
const MARKING_FACE: Record<MarkingId, string> = {
  'TSSCI-OSC': 'TS//SCI//OSC',
  'UMBRA-R': 'UMBRA//OSC RESTRICTED',
  'UMBRA-C': 'UMBRA//OSC COMPARTMENTED',
  'UMBRA-U': 'UMBRA//OSC UNRESTRICTED',
  'UMBRA-EO': 'UMBRA//OSC EYES ONLY',
};

const KIND_ALIASES: Record<string, StampKind> = {
  COPY: 'COPY-NO',
  'COPY-NO-OF-11': 'COPY-NO',
  'COPY-NO-OF': 'COPY-NO',
  DISTRIBUTION: 'DISTRIBUTION-LIMITED',
  LIMITED: 'DISTRIBUTION-LIMITED',
  'NO-COPY': 'REPRODUCTION-PROHIBITED',
  REVIEWED: 'REVIEWED-OIA',
  OIA: 'REVIEWED-OIA',
  DESTROY: 'DESTROY-BY',
  CANCELED: 'CANCELLED',
  FILE: 'FILE-COPY',
};

/** Accepts `FILE COPY`, `file_copy`, `Distribution: Limited` and so on. Returns null for an unknown kind. */
export function normalizeStampKind(raw: string): StampKind | null {
  const k = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if ((STAMP_KINDS as readonly string[]).includes(k)) return k as StampKind;
  return KIND_ALIASES[k] ?? null;
}

export interface StampProps {
  /** A `StampKind`; loose spellings are normalised. An unknown kind is stamped as its own text. */
  kind: StampKind | (string & {});
  /** ISO date or already formatted. Used by RECEIVED, DESTROY-BY, REVIEWED-OIA. */
  date?: string;
  /** COPY-NO: the copy number. SUPERSEDED: the superseding document number. Otherwise replaces the face text. */
  text?: string;
  /** Seeds the ink mask and the rotation. Defaults to a hash of kind, date and text. */
  seed?: number;
  /** COPY-NO: total copies. Defaults to 11. */
  of?: number;
  /** Overrides the default ink for the kind. */
  ink?: StampInk;
  /** Marking stamps: the canon marking, so the face reads exactly as `marking.label`. */
  marking?: Marking;
  /** Scale factor; 1 renders one SVG unit per CSS pixel. */
  scale?: number;
  class?: string;
}

type Row =
  | { type: 'text'; t: string; fs: number; mono?: boolean; light?: boolean }
  | { type: 'rule' }
  | { type: 'gap'; h: number };

interface Face {
  rows: Row[];
  ink: StampInk;
  padX: number;
  padY: number;
  minW?: number;
}

const T = (t: string, fs: number, opt: { mono?: boolean; light?: boolean } = {}): Row => ({ type: 'text', t, fs, ...opt });
const RULE: Row = { type: 'rule' };
const GAP = (h: number): Row => ({ type: 'gap', h });

function splitMarking(label: string): Row[] {
  // Long labels break at the first space so the stamp stays a sensible shape.
  if (label.length <= 14 || !label.includes(' ')) return [T(label, 17)];
  const i = label.indexOf(' ');
  const a = label.slice(0, i);
  const b = label.slice(i + 1);
  return [T(a, 13), GAP(1), T(b, 18)];
}

function buildFace(kind: StampKind | null, raw: string, p: StampProps): Face {
  const date = formatStampDate(p.date);
  const text = p.text?.trim().toUpperCase() ?? '';
  switch (kind) {
    case 'RECEIVED':
      return {
        ink: 'blue',
        padX: 12,
        padY: 7,
        rows: [T('RECEIVED', 15), RULE, T(date || '__ ___ ____', 15, { mono: true }), RULE, T(text || 'OSC CENTRAL REGISTRY', 8)],
      };
    case 'COPY-NO':
      return {
        ink: 'blue',
        padX: 12,
        padY: 8,
        rows: [T(`COPY NO ${text ? text.padStart(2, '0') : '__'} OF ${p.of ?? 11}`, 14, { mono: !!text })],
      };
    case 'FILE-COPY':
      return { ink: 'blue', padX: 14, padY: 8, rows: [T(text || 'FILE COPY', 19)] };
    case 'SUPERSEDED':
      return {
        ink: 'red',
        padX: 12,
        padY: 7,
        rows: text ? [T('SUPERSEDED', 18), RULE, T(`BY ${text}`, 10, { mono: true })] : [T('SUPERSEDED', 18)],
      };
    case 'CANCELLED':
      return { ink: 'red', padX: 14, padY: 8, rows: [T(text || 'CANCELLED', 21)] };
    case 'ACTION':
      return { ink: 'red', padX: 10, padY: 6, rows: [T(text || 'ACTION', 14)] };
    case 'INFO':
      return { ink: 'blue', padX: 10, padY: 6, rows: [T(text || 'INFO', 14)] };
    case 'DISTRIBUTION-LIMITED':
      return { ink: 'red', padX: 12, padY: 7, rows: [T('DISTRIBUTION', 10, { light: true }), GAP(1), T(text || 'LIMITED', 19)] };
    case 'REPRODUCTION-PROHIBITED':
      return { ink: 'red', padX: 12, padY: 7, rows: [T('REPRODUCTION', 14), GAP(1), T('PROHIBITED', 14)] };
    case 'NO-ELECTRONIC-COPY':
      return {
        ink: 'red',
        padX: 12,
        padY: 7,
        rows: [T('NO ELECTRONIC COPY', 15), RULE, T(text || 'PAPER RECORD ONLY', 8, { light: true })],
      };
    case 'REVIEWED-OIA':
      return {
        ink: 'blue',
        padX: 12,
        padY: 7,
        rows: [T('REVIEWED', 9, { light: true }), GAP(1), T('OIA', 20), RULE, T(date || '__ ___ ____', 10, { mono: true })],
      };
    case 'DESTROY-BY':
      return {
        ink: 'red',
        padX: 12,
        padY: 7,
        rows: [T('DESTROY BY', 13), RULE, T(date || '__ ___ ____', 14, { mono: true })],
      };
    case 'VOID':
      return { ink: 'red', padX: 18, padY: 7, rows: [T(text || 'VOID', 26)] };
    case 'TSSCI-OSC':
    case 'UMBRA-R':
    case 'UMBRA-C':
    case 'UMBRA-U':
    case 'UMBRA-EO': {
      const label = (text || p.marking?.label || MARKING_FACE[kind]).toUpperCase();
      return { ink: 'red', padX: 13, padY: 8, rows: splitMarking(label), minW: 110 };
    }
    default:
      return { ink: 'blue', padX: 12, padY: 8, rows: [T((text || raw).toUpperCase(), 15)] };
  }
}

/** Advance estimate in em for capitals; the text is fitted to it with `textLength`, so it is exact on any font. */
const EM_SANS = 0.7;
const EM_SANS_LIGHT = 0.8; // widely tracked small capitals
const EM_MONO = 0.62;

function rowWidth(r: Row): number {
  if (r.type !== 'text') return 0;
  const em = r.mono ? EM_MONO : r.light ? EM_SANS_LIGHT : EM_SANS;
  return r.t.length * r.fs * em;
}

function rowHeight(r: Row): number {
  if (r.type === 'text') return r.fs * 1.12;
  if (r.type === 'rule') return 7;
  return r.h;
}

const EDGE = 3; // room for the ink to spread past the outer rule
const OUTER = 2.4;
const INNER = 0.9;
const RULE_GAP = 3.1;

interface StampGeometry {
  face: Face;
  kind: StampKind | null;
  seed: number;
  rot: number;
  w: number;
  h: number;
}

function stampGeometry(p: StampProps): StampGeometry {
  const kind = normalizeStampKind(p.kind);
  const face = buildFace(kind, p.kind, p);
  const seed = (p.seed ?? hashString(`${p.kind}|${p.date ?? ''}|${p.text ?? ''}`)) >>> 0;
  // Rotation within +/-3 degrees, never exactly square to the page.
  let rot = ((hashString(`rot${seed}`) % 601) - 300) / 100;
  if (Math.abs(rot) < 0.4) rot = rot < 0 ? -0.6 : 0.6;
  const inset = OUTER + RULE_GAP + INNER;
  const contentW = Math.max(face.minW ?? 0, ...face.rows.map(rowWidth));
  const contentH = face.rows.reduce((a, r) => a + rowHeight(r), 0);
  const w = Math.ceil(contentW + 2 * (face.padX + inset + EDGE));
  const h = Math.ceil(contentH + 2 * (face.padY + inset + EDGE));
  return { face, kind, seed, rot, w, h };
}

function StampSvg({ g, scale }: { g: StampGeometry; scale: number }) {
  const { face, seed, w, h } = g;
  const fid = `stamp-ink-${seed.toString(36)}`;
  const inset = OUTER + RULE_GAP + INNER;
  const left = EDGE + inset;
  const innerW = w - 2 * left;
  const cx = w / 2;
  let y = EDGE + inset + face.padY;
  const out: JSX.Element[] = [];
  face.rows.forEach((r, i) => {
    const rh = rowHeight(r);
    if (r.type === 'text') {
      out.push(
        <text
          key={i}
          class={r.mono ? 'stamp__mono' : r.light ? 'stamp__light' : 'stamp__word'}
          x={cx}
          y={y + r.fs * 0.93}
          font-size={r.fs}
          text-anchor="middle"
          textLength={Math.round(rowWidth(r) * 10) / 10}
          lengthAdjust="spacingAndGlyphs"
        >
          {r.t}
        </text>,
      );
    } else if (r.type === 'rule') {
      out.push(<line key={i} x1={left + 5} x2={left + innerW - 5} y1={y + rh / 2} y2={y + rh / 2} stroke="currentColor" stroke-width={0.9} />);
    }
    y += rh;
  });
  // Pressure varies across the die: the low-frequency field is offset per seed.
  const tilt = (seed % 7) / 100;
  return (
    <svg
      class="stamp__svg"
      viewBox={`0 0 ${w} ${h}`}
      width={Math.round(w * scale)}
      height={Math.round(h * scale)}
      role="img"
      aria-label={`Stamp: ${face.rows
        .filter((r): r is Extract<Row, { type: 'text' }> => r.type === 'text')
        .map((r) => r.t)
        .join(' ')}`}
    >
      <defs>
        <filter id={fid} x="-4%" y="-8%" width="108%" height="116%" color-interpolation-filters="sRGB">
          {/* fine grain: paper tooth and dry spots */}
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed % 9973} result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.42" result="grainA" />
          {/* broad field: uneven pressure across the die */}
          <feTurbulence type="fractalNoise" baseFrequency={0.018 + tilt / 4} numOctaves={2} seed={(seed % 9973) + 17} result="press" />
          <feColorMatrix in="press" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 -0.12" result="pressA" />
          <feComposite in="grainA" in2="pressA" operator="arithmetic" k1={0.55} k2={0.25} k3={0.3} k4={0} result="mask" />
          {/* slightly ragged edges where the rubber met the paper */}
          <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves={1} seed={(seed % 9973) + 41} result="edge" />
          <feDisplacementMap in="SourceGraphic" in2="edge" scale={1.1} xChannelSelector="R" yChannelSelector="G" result="ragged" />
          <feComposite in="ragged" in2="mask" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${fid})`} fill="currentColor">
        <rect x={EDGE + OUTER / 2} y={EDGE + OUTER / 2} width={w - 2 * EDGE - OUTER} height={h - 2 * EDGE - OUTER} rx={1.6} fill="none" stroke="currentColor" stroke-width={OUTER} />
        <rect
          x={EDGE + OUTER + RULE_GAP + INNER / 2}
          y={EDGE + OUTER + RULE_GAP + INNER / 2}
          width={w - 2 * (EDGE + OUTER + RULE_GAP) - INNER}
          height={h - 2 * (EDGE + OUTER + RULE_GAP) - INNER}
          rx={0.6}
          fill="none"
          stroke="currentColor"
          stroke-width={INNER}
        />
        {out}
      </g>
    </svg>
  );
}

function stampRootAttrs(g: StampGeometry, p: StampProps) {
  return {
    kind: g.kind ?? 'OTHER',
    ink: p.ink ?? g.face.ink,
    style: `--stamp-rot:${g.rot.toFixed(2)}deg`,
  };
}

/** Rubber stamp as inline SVG. Sits in the text flow as an inline block; position it from the caller. */
export function Stamp(props: StampProps) {
  const g = stampGeometry(props);
  const a = stampRootAttrs(g, props);
  return (
    <span class={`stamp${props.class ? ` ${props.class}` : ''}`} data-kind={a.kind} data-ink={a.ink} data-enhanced="" style={a.style}>
      <StampSvg g={g} scale={props.scale ?? 1} />
    </span>
  );
}

/**
 * Upgrades `.stamp[data-kind]` elements emitted by the content pipeline into SVG stamps.
 * Reads `data-kind`, `data-date`, `data-text`, `data-seed`, `data-of`, `data-ink`, `data-scale`.
 * Safe to call repeatedly; returns the number of elements upgraded on this call.
 */
export function enhanceStamps(root: ParentNode = document, markings?: readonly Marking[]): number {
  const els = root.querySelectorAll<HTMLElement>('.stamp[data-kind]:not([data-enhanced])');
  let n = 0;
  els.forEach((el) => {
    const d = el.dataset;
    const kindRaw = d.kind ?? '';
    if (!kindRaw) return;
    const seedNum = d.seed != null && d.seed !== '' ? Number(d.seed) : NaN;
    const ofNum = d.of != null && d.of !== '' ? Number(d.of) : NaN;
    const scaleNum = d.scale != null && d.scale !== '' ? Number(d.scale) : NaN;
    const kind = normalizeStampKind(kindRaw);
    const props: StampProps = {
      kind: kindRaw,
      date: d.date,
      text: d.text,
      seed: Number.isFinite(seedNum) ? seedNum : undefined,
      of: Number.isFinite(ofNum) ? ofNum : undefined,
      ink: d.ink === 'red' || d.ink === 'blue' ? d.ink : undefined,
      marking: kind ? markings?.find((m) => m.id === kind) : undefined,
    };
    const g = stampGeometry(props);
    const a = stampRootAttrs(g, props);
    el.textContent = '';
    render(<StampSvg g={g} scale={Number.isFinite(scaleNum) && scaleNum > 0 ? scaleNum : 1} />, el);
    el.dataset.ink = a.ink;
    el.style.setProperty('--stamp-rot', `${g.rot.toFixed(2)}deg`);
    el.setAttribute('data-enhanced', '');
    n++;
  });
  return n;
}
