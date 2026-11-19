import type { ComponentChildren, CSSProperties, VNode } from 'preact';
import { jitter, range, seeded } from './rng';

/**
 * Photocopy artefacts, drawn as overlays. Colours come from tokens via the
 * local properties --scan-paper / --scan-toner (scan.css); the feColorMatrix
 * numbers below only shape alpha.
 */

export interface TonerProps {
  seed?: number;
  /** 0..1 overall strength. Default 1; values above ~1.4 stop looking like a decent copier. */
  strength?: number;
}

/**
 * Uneven toner. Three passes:
 *  - fade: long vertical bands (the direction the sheet travelled) where the
 *    drum laid down less toner, drawn in paper colour OVER the text so the
 *    type itself goes slightly weak there;
 *  - mottle: broad, very faint grey unevenness in the background;
 *  - grain: fine toner dusting.
 */
export function Toner({ seed = 1, strength = 1 }: TonerProps) {
  const rng = seeded(seed, 'toner');
  const s = Math.floor(rng() * 900) + 1;
  const id = `scan-toner-${seed}`.replace(/[^\w-]/g, '_');
  // Band frequency varies per page so no two copies share a streak pattern.
  const fx = range(rng, 0.012, 0.02).toFixed(4);
  const fy = range(rng, 0.0005, 0.0011).toFixed(4);
  return (
    <svg class="scan-fx__layer scan-toner" width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${id}-fade`} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={`${fx} ${fy}`} numOctaves="2" seed={s} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.05" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
        <filter id={`${id}-mottle`} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.004" numOctaves="3" seed={s + 11} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -0.75" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" seed={s + 23} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -1.25" result="a" />
          <feComposite in="SourceGraphic" in2="a" operator="in" />
        </filter>
      </defs>
      <rect class="scan-toner__mottle" width="100%" height="100%" filter={`url(#${id}-mottle)`} opacity={0.05 * strength} />
      <rect class="scan-toner__grain" width="100%" height="100%" filter={`url(#${id}-grain)`} opacity={0.06 * strength} />
      <rect class="scan-toner__fade" width="100%" height="100%" filter={`url(#${id}-fade)`} opacity={Math.min(1, 0.42 * strength)} />
    </svg>
  );
}

export interface SpeckleProps {
  seed?: number;
  /** Approximate number of specks on the page. */
  count?: number;
}

/** Occasional toner specks: a few isolated dots and one or two loose clusters. Positions are % of the page. */
export function Speckle({ seed = 1, count = 22 }: SpeckleProps) {
  const rng = seeded(seed, 'speckle');
  const dots: VNode[] = [];
  const clusters = 1 + Math.floor(rng() * 2);
  const centres = Array.from({ length: clusters }, () => ({ x: range(rng, 8, 92), y: range(rng, 6, 94) }));
  for (let i = 0; i < count; i++) {
    const inCluster = rng() < 0.45;
    const c = centres[Math.floor(rng() * centres.length)];
    const x = inCluster && c ? c.x + jitter(rng, 7) : range(rng, 1.5, 98.5);
    const y = inCluster && c ? c.y + jitter(rng, 4) : range(rng, 1, 99);
    const r = rng() < 0.82 ? range(rng, 0.3, 0.62) : range(rng, 0.7, 1.05);
    dots.push(
      <ellipse
        key={i}
        cx={`${x.toFixed(2)}%`}
        cy={`${y.toFixed(2)}%`}
        rx={r.toFixed(2)}
        ry={(r * range(rng, 0.7, 1.15)).toFixed(2)}
        opacity={range(rng, 0.28, 0.7).toFixed(2)}
      />,
    );
  }
  return (
    <svg class="scan-fx__layer scan-speckle" width="100%" height="100%" aria-hidden="true" focusable="false">
      {dots}
    </svg>
  );
}

/**
 * Second-generation copy line: the edge of the sheet from an earlier copy,
 * reproduced as a thin, slightly skewed, broken grey line near the top and
 * part-way down one side.
 */
export function CopyLine({ seed = 1 }: { seed?: number }) {
  const rng = seeded(seed, 'copyline');
  const y0 = range(rng, 0.7, 1.5);
  const skew = jitter(rng, 0.42) + 0.15;
  const side = rng() < 0.5 ? 'left' : 'right';
  const xs = side === 'right' ? range(rng, 98.3, 99.1) : range(rng, 0.9, 1.6);
  const run = range(rng, 28, 62);
  const dash = `${range(rng, 260, 520).toFixed(0)} ${range(rng, 2, 7).toFixed(0)} ${range(rng, 120, 300).toFixed(0)} ${range(rng, 1, 4).toFixed(0)}`;
  return (
    <svg class="scan-fx__layer scan-copyline" width="100%" height="100%" aria-hidden="true" focusable="false">
      <line x1="0.6%" y1={`${y0.toFixed(2)}%`} x2="99.2%" y2={`${(y0 + skew).toFixed(2)}%`} stroke-dasharray={dash} opacity="0.2" />
      <line
        x1={`${xs.toFixed(2)}%`}
        y1={`${(y0 + (side === 'right' ? skew : 0)).toFixed(2)}%`}
        x2={`${(xs + (side === 'right' ? -1 : 1) * skew * 0.5).toFixed(2)}%`}
        y2={`${run.toFixed(1)}%`}
        stroke-dasharray={dash}
        opacity="0.2"
      />
    </svg>
  );
}

/** Copier edge shadow: the sheet did not sit flush, so one long edge copied grey. */
export function EdgeShadow({ seed = 1, side }: { seed?: number; side?: 'left' | 'right' }) {
  const rng = seeded(seed, 'edge');
  const s = side ?? (rng() < 0.65 ? 'right' : 'left');
  const width = range(rng, 7, 13);
  const style: CSSProperties = { width: `${width.toFixed(1)}px`, opacity: range(rng, 0.7, 1).toFixed(2) };
  return (
    <>
      <div class={`scan-edge scan-edge--${s}`} style={style} />
      <div class="scan-edge scan-edge--top" />
    </>
  );
}

const ring = (cx: number, cy: number, r: number): string =>
  `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export interface PunchHolesProps {
  /** 2 (default) or 3 holes. */
  count?: 2 | 3;
  seed?: number;
}

/**
 * Punch-hole shadows down the left margin. On a photocopy a punched hole is
 * not a hole: it is a pale disc with a dark crescent where the platen cover
 * showed through off-centre.
 */
export function PunchHoles({ count = 2, seed = 1 }: PunchHolesProps) {
  const rng = seeded(seed, 'holes');
  // Shadow falls the same way for every hole on a sheet.
  const angle = range(rng, -0.9, 0.5);
  const off = range(rng, 1.0, 1.7);
  const ox = Math.cos(angle) * off;
  const oy = Math.sin(angle) * off;
  const dx = jitter(rng, 2);
  const R = 8.5;
  const spans = count === 3 ? [-1, 0, 1] : [-0.5, 0.5];
  const pitch = count === 3 ? 310 : 206;
  return (
    <div class="scan-holes" aria-hidden="true">
      {spans.map((k, i) => {
        const id = `scan-hole-${String(seed).replace(/[^\w-]/g, '_')}-${i}`;
        const jx = jitter(rng, 0.6);
        const jy = jitter(rng, 1.2);
        return (
          <svg
            key={i}
            class="scan-hole"
            width="24"
            height="24"
            viewBox="-12 -12 24 24"
            focusable="false"
            style={{ top: `calc(50% + ${(k * pitch + jy).toFixed(1)}px)`, marginLeft: `${(dx + jx).toFixed(1)}px` }}
          >
            <defs>
              <clipPath id={id}>
                <circle r={R} />
              </clipPath>
            </defs>
            <circle class="scan-hole__disc" r={R} />
            <path class="scan-hole__crescent" d={`${ring(0, 0, R)}${ring(ox, oy, R - 0.2)}`} fill-rule="evenodd" clip-path={`url(#${id})`} />
            <circle class="scan-hole__rim" r={R - 0.3} />
          </svg>
        );
      })}
    </div>
  );
}

export interface ScanEffectsProps {
  seed?: number;
  holes?: 0 | 2 | 3;
  strength?: number;
}

/** The whole overlay stack for one page. Absolutely positioned, never intercepts pointer events. */
export function ScanEffects({ seed = 1, holes = 2, strength = 1 }: ScanEffectsProps) {
  const rng = seeded(seed, 'fx');
  return (
    <div class="scan-fx" aria-hidden="true">
      <Toner seed={seed} strength={strength} />
      <EdgeShadow seed={seed} />
      {rng() < 0.75 && <CopyLine seed={seed} />}
      <Speckle seed={seed} count={Math.round(range(rng, 12, 30))} />
      {holes !== 0 && <PunchHoles seed={seed} count={holes} />}
    </div>
  );
}

export interface ScanPageProps {
  seed?: number;
  /** Degrees. Kept within +/-1; if omitted a small rotation is derived from the seed. */
  rotate?: number;
  children?: ComponentChildren;
  /** Punch holes down the left margin. Default 2. */
  holes?: 0 | 2 | 3;
  /** Very slight (0.2px) softening of the page content. Off by default. */
  soft?: boolean;
  /** Multiplier on toner unevenness. */
  strength?: number;
  class?: string;
}

export function scanRotation(seed: number, rotate: number | undefined): number {
  const r = rotate ?? jitter(seeded(seed, 'rotate'), 0.8);
  return Math.max(-1, Math.min(1, r));
}

/** A document page as a scanned photocopy. Children stay ordinary selectable HTML. */
export function ScanPage({ seed = 1, rotate, children, holes = 2, soft = false, strength = 1, class: cls }: ScanPageProps) {
  const deg = scanRotation(seed, rotate);
  return (
    <div
      class={`scan-page scan-page--enhanced${soft ? ' scan-page--soft' : ''}${cls ? ` ${cls}` : ''}`}
      data-seed={seed}
      data-rotate={deg}
      data-scan-enhanced=""
      style={{ '--scan-rotate': `${deg}deg` }}
    >
      <div class="scan-body">{children}</div>
      <ScanEffects seed={seed} holes={holes} strength={strength} />
    </div>
  );
}
