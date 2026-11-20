/**
 * PanelFrame: the steel panel face with corner screws and a title plate.
 * PanelSection: an etched group on the face with its own caption plate.
 * MimicLine / MimicJunction / MimicSvg: flat mimic-bus connector helpers for
 * small panel mimics (the reactor module's one-line symbols are internal to
 * ReactorOneLine; use ReactorOneLine itself for a station diagram).
 */
import type { ComponentChildren, CSSProperties, JSX } from 'preact';
import { Plate } from './controls';
import { cx, legendText, ScrewMark, type Legend } from './parts';

export interface PanelFrameProps {
  /** Title plate text, e.g. ["RX-A03 REACTOR PLANT", "TRAINING SIMULATOR"]. */
  title: Legend;
  /** Drawing / panel number printed small at the lower right, e.g. "PNL-FE-0301 REV C". */
  panelNo?: string;
  children: ComponentChildren;
  /** CSS grid columns for the children, e.g. 3 or "auto 1fr auto". Default: a wrapping row. */
  columns?: number | string;
  gap?: number;
  /** Fixed width in px (the face does not stretch past it). */
  width?: number;
  class?: string;
}

export function PanelFrame({ title, panelNo, children, columns, gap = 16, width, class: klass }: PanelFrameProps) {
  const layout: CSSProperties =
    columns === undefined
      ? { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: `${gap}px` }
      : { display: 'grid', gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, auto)` : columns, gap: `${gap}px`, alignItems: 'start' };
  return (
    <section class={cx('pk-panel', klass)} aria-label={legendText(title)} style={width ? { width: `${width}px` } : undefined}>
      <ScrewMark seed={11} class="pk-panel__screw pk-panel__screw--tl" />
      <ScrewMark seed={23} class="pk-panel__screw pk-panel__screw--tr" />
      <ScrewMark seed={5} class="pk-panel__screw pk-panel__screw--bl" />
      <ScrewMark seed={17} class="pk-panel__screw pk-panel__screw--br" />
      <div class="pk-panel__title">
        <Plate text={title} variant="dark" size="lg" screws />
      </div>
      <div class="pk-panel__body" style={layout}>
        {children}
      </div>
      {panelNo ? <div class="pk-panel__no">{panelNo}</div> : null}
    </section>
  );
}

export interface PanelSectionProps {
  title?: Legend;
  children: ComponentChildren;
  columns?: number | string;
  gap?: number;
  /** Span this many grid columns of the parent PanelFrame. */
  span?: number;
  class?: string;
}

/** Etched group on the panel face, captioned by a small plate set into the top line. */
export function PanelSection({ title, children, columns, gap = 12, span, class: klass }: PanelSectionProps) {
  const layout: CSSProperties =
    columns === undefined
      ? { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: `${gap}px` }
      : { display: 'grid', gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, auto)` : columns, gap: `${gap}px`, alignItems: 'start' };
  return (
    <div
      class={cx('pk-section', klass)}
      role="group"
      aria-label={title ? legendText(title) : undefined}
      style={span ? { gridColumn: `span ${span}` } : undefined}
    >
      {title ? (
        <div class="pk-section__cap">
          <Plate text={title} size="sm" />
        </div>
      ) : null}
      <div class="pk-section__body" style={layout}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mimic helpers (inside the caller's <svg>)                           */
/* ------------------------------------------------------------------ */

export type MimicState = 'live' | 'dead' | 'flow';

export interface MimicLineProps {
  points: readonly (readonly [number, number])[];
  /** live: solid heavy bus. dead: dashed. flow: solid with direction chevrons at midpoints. */
  state?: MimicState;
  /** Stroke width in user units (default 3). */
  weight?: number;
}

/** A mimic bus segment: flat strip, no glow. Live is solid, dead is dashed, as on the reactor one-lines. */
export function MimicLine({ points, state = 'live', weight = 3 }: MimicLineProps) {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const chevrons: JSX.Element[] = [];
  if (state === 'flow') {
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]!;
      const [x1, y1] = points[i]!;
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 24) continue;
      const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const s = weight + 2;
      chevrons.push(
        <path key={i} d={`M${-s} ${-s} L${s / 2} 0 L${-s} ${s}`} transform={`translate(${mx} ${my}) rotate(${a})`} class="pk-mimic__chev pk-nofill" stroke-width={1.5} />,
      );
    }
  }
  return (
    <g class={cx('pk-mimic', `pk-mimic--${state}`)}>
      <path d={d} class="pk-mimic__line pk-nofill" stroke-width={weight} stroke-dasharray={state === 'dead' ? `${weight * 2} ${weight * 1.5}` : undefined} />
      {chevrons}
    </g>
  );
}

/** Junction dot where mimic lines meet. */
export function MimicJunction({ x, y, r = 3.5 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} class="pk-mimic__node" />;
}

/** Equipment box on a mimic, captioned in caps: pump, fan, valve, scrubber. `on` fills it. */
export function MimicBox({ x, y, w = 44, h = 22, label, on = false }: { x: number; y: number; w?: number; h?: number; label: string; on?: boolean }) {
  return (
    <g class={cx('pk-mimic__box', on && 'is-on')}>
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} class="pk-mimic__boxrect" />
      <text x={x + w / 2} y={y + h / 2 + 3} text-anchor="middle" class="pk-mimic__boxt">
        {label.toUpperCase()}
      </text>
    </g>
  );
}

/** Sunken mimic window for the helpers above. */
export function MimicSvg({ width, height, label, children }: { width: number; height: number; label: string; children: ComponentChildren }) {
  return (
    <svg class="pk-mimic-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <rect x={0} y={0} width={width} height={height} class="pk-f-mimicbg" />
      {children}
    </svg>
  );
}
