/**
 * @graphics/lock — asset family 13.
 * Lock-screen graphics: temporary access card, smart-token reader, desktop
 * watermark, lock backdrop, self-test row.
 *
 * All colour comes from design tokens (var(--…)); nothing here is interactive.
 * The OSC seal is drawn by @graphics/seal and imported from there. Components
 * that show it also take a `seal` slot so a caller can substitute another mark
 * (a division mark, say). See README.md.
 */
import type { ComponentChildren, JSX } from 'preact';
import { Seal } from '../seal/index';
import './lock.css';

/* ------------------------------------------------------------------ */
/* Code 39 strip                                                       */
/* ------------------------------------------------------------------ */

/** Code 39 element widths (bar, space, bar … ; 1 = wide). */
const CODE39: Readonly<Record<string, string>> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', A: '100001001', B: '001001001',
  C: '101001000', D: '000011001', E: '100011000', F: '001011000',
  G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011',
  O: '100010010', P: '001010010', Q: '000000111', R: '100000110',
  S: '001000110', T: '000010110', U: '110000001', V: '011000001',
  W: '111000000', X: '010010001', Y: '110010000', Z: '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
};

const NARROW = 1;
const WIDE = 3;

interface Bar {
  x: number;
  w: number;
}

/** Bars for `value` framed by start/stop characters. Unknown characters become '-'. */
export function code39Bars(value: string): { bars: Bar[]; width: number } {
  const text = `*${value.toUpperCase().replace(/[^0-9A-Z. -]/g, '-')}*`;
  const bars: Bar[] = [];
  let x = 0;
  for (const ch of text) {
    const pattern = CODE39[ch] ?? CODE39['-'] ?? '';
    for (let i = 0; i < pattern.length; i += 1) {
      const w = pattern[i] === '1' ? WIDE : NARROW;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    }
    x += NARROW; // inter-character gap
  }
  return { bars, width: x - NARROW };
}

function CardBarcode({ value }: { value: string }): JSX.Element {
  const { bars, width } = code39Bars(value);
  return (
    <svg
      class="lk-card__bars"
      viewBox={`0 0 ${width} 10`}
      width={width}
      height="26"
      preserveAspectRatio="none"
      shape-rendering="crispEdges"
      role="img"
      aria-label={`Card barcode ${value}`}
    >
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="10" fill="var(--text-1)" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* AccessCard                                                          */
/* ------------------------------------------------------------------ */

export interface AccessCardProps {
  /** Issued operator ID. Printed in mono; this is what the visitor types. */
  operatorId: string;
  /** Issued passphrase. Printed in mono; this is what the visitor types. */
  passphrase: string;
  /** Holder line. In-world designation only; never a real name. */
  displayName: string;
  /** Tier as a number (rendered "TIER 3") or a ready-made label. */
  tier: number | string;
  /** Site and division, e.g. "ALPHA-03 / RECORDS DIVISION". */
  site: string;
  /** Issue date, house format: "05 MAY 2008". */
  issued: string;
  /** Expiry date, house format: "31 MAY 2008". */
  expires: string;
  /** Card serial; also drives the barcode strip. */
  cardNo: string;
  /** Printed form reference in the card header. */
  formRef?: string;
  /** Issuing office under the agency name (default "RECORDS DIVISION · SECURITY OFFICE"). */
  issuer?: string;
  /** Replaces the default header seal (`<Seal size={34} variant="mono" />`). */
  seal?: ComponentChildren;
  class?: string;
}

export function AccessCard(props: AccessCardProps): JSX.Element {
  const {
    operatorId,
    passphrase,
    displayName,
    tier,
    site,
    issued,
    expires,
    cardNo,
    formRef = 'SO FORM 22 (REV 02-08)',
    issuer = 'RECORDS DIVISION · SECURITY OFFICE',
    seal,
  } = props;
  const tierLabel = typeof tier === 'number' ? `TIER ${tier}` : tier;

  return (
    <section class={`lk-card${props.class ? ` ${props.class}` : ''}`} aria-label="Temporary access card">
      <header class="lk-card__head">
        <div class="lk-card__seal">{seal ?? <Seal size={34} variant="mono" />}</div>
        <div class="lk-card__org">
          <div class="lk-card__org-name">OFFICE OF STRATEGIC CONTINUITY</div>
          <div class="lk-card__org-sub">{issuer}</div>
        </div>
        <div class="lk-card__form">{formRef}</div>
      </header>

      <div class="lk-card__title">
        <h2 class="lk-card__name">TEMPORARY ACCESS CARD</h2>
        <div class="lk-card__no">
          <span class="lk-card__lbl">CARD NO.</span>
          <span class="lk-mono">{cardNo}</span>
        </div>
      </div>

      <dl class="lk-card__fields">
        <div class="lk-card__field lk-card__field--wide">
          <dt>ISSUED TO</dt>
          <dd>{displayName}</dd>
        </div>
        <div class="lk-card__field">
          <dt>TIER</dt>
          <dd>{tierLabel}</dd>
        </div>
        <div class="lk-card__field">
          <dt>SITE / DIVISION</dt>
          <dd>{site}</dd>
        </div>
        <div class="lk-card__field">
          <dt>VALID FROM</dt>
          <dd class="lk-mono">{issued}</dd>
        </div>
        <div class="lk-card__field">
          <dt>VALID UNTIL</dt>
          <dd class="lk-mono">{expires}</dd>
        </div>
      </dl>

      <div class="lk-card__creds">
        <div class="lk-card__creds-head">
          <span class="lk-card__creds-title">ISSUED CREDENTIALS</span>
          <span class="lk-card__creds-note">Enter at the logon panel exactly as printed.</span>
        </div>
        <dl class="lk-card__creds-body">
          <div class="lk-card__cred">
            <dt>OPERATOR ID</dt>
            <dd class="lk-mono lk-card__cred-val">{operatorId}</dd>
          </div>
          <div class="lk-card__cred">
            <dt>PASSPHRASE</dt>
            <dd class="lk-mono lk-card__cred-val">{passphrase}</dd>
          </div>
        </dl>
      </div>

      <p class="lk-card__return">
        PROPERTY OF THE OFFICE. RETURN TO {issuer.replace(' · ', ' ')} ON EXPIRY, ON TRANSFER, OR ON DEMAND.
      </p>

      <footer class="lk-card__foot">
        <div class="lk-card__strip">
          <CardBarcode value={cardNo} />
          <div class="lk-mono lk-card__strip-no">{cardNo}</div>
        </div>
        <p class="lk-card__small">
          Not transferable. Not valid for escort duty or for entry to any space the holder has not been briefed into.
          Issue of this card is not a compartment briefing. Report loss to the issuing office within one duty shift.
          Credentials printed here lapse at 2359 local on the date shown.
        </p>
      </footer>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SmartToken                                                          */
/* ------------------------------------------------------------------ */

export interface SmartTokenProps {
  /** True draws the token seated in the reader and the "TOKEN PRESENT" state. */
  inserted: boolean;
  /** Reader model lettering on the faceplate. */
  model?: string;
  class?: string;
}

/**
 * Desktop smart-token reader, front elevation, 180 x 60.
 * Status is a 10px square plus a word, per the house rule.
 */
export function SmartToken({ inserted, model = 'TR-240', class: cls }: SmartTokenProps): JSX.Element {
  const word = inserted ? 'TOKEN PRESENT' : 'NO TOKEN';
  return (
    <svg
      class={`lk-token${cls ? ` ${cls}` : ''}`}
      viewBox="0 0 180 60"
      width="180"
      height="60"
      shape-rendering="crispEdges"
      role="img"
      aria-label={`Smart token reader: ${word.toLowerCase()}`}
    >
      {/* Token standing in the slot (drawn first; the reader body covers its lower edge). */}
      {inserted && (
        <g>
          <rect x="44.5" y="1.5" width="92" height="26" fill="var(--surface)" stroke="var(--chrome-outer)" />
          {/* printed band */}
          <rect x="45" y="5" width="91" height="5" fill="var(--chrome-shadow)" />
          {/* contact pad */}
          <rect x="52.5" y="13.5" width="14" height="11" fill="var(--chrome-face)" stroke="var(--chrome-shadow)" />
          <path d="M52.5 19H66.5M59.5 13.5V24.5" fill="none" stroke="var(--chrome-shadow)" />
          {/* printed serial lines */}
          <rect x="74" y="14" width="54" height="1" fill="var(--text-3)" />
          <rect x="74" y="18" width="38" height="1" fill="var(--text-3)" />
        </g>
      )}

      {/* Reader body */}
      <rect x="0.5" y="20.5" width="179" height="39" fill="var(--chrome-face)" stroke="var(--chrome-outer)" />
      <path d="M1.5 58.5V21.5H178.5" fill="none" stroke="var(--chrome-hi)" />
      <path d="M1.5 58.5H178.5V21.5" fill="none" stroke="var(--chrome-shadow)" />

      {/* Slot recess */}
      <rect x="36.5" y="24.5" width="108" height="5" fill="var(--chrome-outer)" stroke="var(--chrome-shadow)" />
      {inserted && <rect x="45" y="25" width="92" height="3" fill="var(--surface)" />}
      {inserted && <path d="M44.5 25V28M136.5 25V28" fill="none" stroke="var(--chrome-outer)" />}

      {/* Faceplate rule */}
      <path d="M8 35.5H172" fill="none" stroke="var(--chrome-shadow)" />
      <path d="M8 36.5H172" fill="none" stroke="var(--chrome-hi)" />

      {/* Status: 10px square + word */}
      <rect
        x="10.5"
        y="42.5"
        width="9"
        height="9"
        fill={inserted ? 'var(--st-nominal)' : 'var(--st-offline)'}
        stroke="var(--chrome-outer)"
      />
      <text class="lk-token__word" x="26" y="51" shape-rendering="auto">
        {word}
      </text>
      <text class="lk-token__model" x="170" y="51" text-anchor="end" shape-rendering="auto">
        {model}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* DesktopWatermark / LockBackdrop                                     */
/* ------------------------------------------------------------------ */

export interface DesktopWatermarkProps {
  /** Replaces the default `<Seal size={512} variant="mono" />`. Scaled to fit by CSS. */
  seal?: ComponentChildren;
  class?: string;
}

/**
 * Workspace fill (--ws-bg) with the mono seal centred at 4% opacity.
 * Fills its positioned parent; never takes pointer events.
 */
export function DesktopWatermark({ seal, class: cls }: DesktopWatermarkProps): JSX.Element {
  return (
    <div class={`lk-wm${cls ? ` ${cls}` : ''}`} aria-hidden="true">
      <div class="lk-wm__seal">{seal ?? <Seal size={512} variant="mono" />}</div>
    </div>
  );
}

export interface LockBackdropProps {
  /** Also draw the 4% seal watermark behind the grid. Off by default. */
  watermark?: boolean;
  /** Replaces the default mono seal; used only when `watermark` is set. */
  seal?: ComponentChildren;
  class?: string;
}

/**
 * Lock-screen background: flat --ws-bg under a 32px one-pixel drafting grid
 * with a heavier line every fourth cell. Drawn as an SVG pattern so there is
 * no gradient anywhere in the treatment.
 */
export function LockBackdrop({ watermark = false, seal, class: cls }: LockBackdropProps): JSX.Element {
  return (
    <div class={`lk-backdrop${cls ? ` ${cls}` : ''}`} aria-hidden="true">
      {watermark && <div class="lk-wm__seal">{seal ?? <Seal size={512} variant="mono" />}</div>}
      <svg class="lk-backdrop__grid" width="100%" height="100%" shape-rendering="crispEdges" focusable="false">
        <defs>
          <pattern id="lk-grid-minor" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="32" height="1" fill="var(--chrome-hi)" />
            <rect x="0" y="0" width="1" height="32" fill="var(--chrome-hi)" />
          </pattern>
          <pattern id="lk-grid-major" width="128" height="128" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="128" height="1" fill="var(--chrome-hi)" />
            <rect x="0" y="0" width="1" height="128" fill="var(--chrome-hi)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lk-grid-minor)" opacity="0.03" />
        <rect width="100%" height="100%" fill="url(#lk-grid-major)" opacity="0.035" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SelfTestRow                                                         */
/* ------------------------------------------------------------------ */

export type SelfTestStatus = 'nominal' | 'degraded' | 'fault' | 'offline' | 'pending';

const SELF_TEST_WORD: Readonly<Record<SelfTestStatus, string>> = {
  nominal: 'PASS',
  degraded: 'DEGRADED',
  fault: 'FAULT',
  offline: 'NOT FITTED',
  pending: 'TESTING',
};

export interface SelfTestRowProps {
  /** Device or check name, e.g. "MEMORY 2048 MB". */
  label: string;
  status: SelfTestStatus;
  /** Override the status word. */
  word?: string;
  /** Optional trailing detail, e.g. a part or firmware reference. */
  detail?: string;
}

/** One line of the pre-boot hardware self-test list: label, leader, square, word. */
export function SelfTestRow({ label, status, word, detail }: SelfTestRowProps): JSX.Element {
  return (
    <div class="lk-st" role="listitem">
      <span class="lk-st__label">{label}</span>
      <span class="lk-st__leader" aria-hidden="true" />
      {detail ? <span class="lk-st__detail">{detail}</span> : null}
      <span class={`lk-st__sq lk-st__sq--${status}`} aria-hidden="true" />
      <span class="lk-st__word">{word ?? SELF_TEST_WORD[status]}</span>
    </div>
  );
}
