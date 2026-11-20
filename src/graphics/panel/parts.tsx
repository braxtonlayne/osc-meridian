/**
 * Shared drawing parts and hooks for @graphics/panel: screws, bevel rectangles,
 * lens colours, the reduced-motion hook. Internal except where index.ts re-exports.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import './panel.css';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Lens and cap colours. Each maps to a design token in panel.css (.pk-lens--*). */
export type LensColor = 'red' | 'green' | 'amber' | 'white' | 'blue' | 'black' | 'grey';

/** A legend is one line or several; always drawn in capitals. */
export type Legend = string | readonly string[];

export function legendLines(l: Legend | undefined): string[] {
  if (l === undefined) return [];
  return (typeof l === 'string' ? l.split('\n') : [...l]).map((s) => s.toUpperCase());
}

export function legendText(l: Legend | undefined): string {
  return legendLines(l).join(' ');
}

/** FNV-1a: stable per-label variation (screw slot angles). */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * True when motion should be off: the `reducedMotion` prop wins; otherwise the
 * OS preference. (CSS also honours `[data-motion="reduced"]` on any ancestor.)
 */
export function useReducedMotion(prop?: boolean): boolean {
  const [media, setMedia] = useState<boolean>(() => queryReduced());
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = (): void => setMedia(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return prop ?? media;
}

function queryReduced(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Slotted panel screw, flat: rim, head, slot. */
export function Screw({ x, y, r = 3.5, seed = 0 }: { x: number; y: number; r?: number; seed?: number }) {
  const a = ((seed * 37) % 180) * (Math.PI / 180);
  const dx = Math.cos(a) * (r - 1);
  const dy = Math.sin(a) * (r - 1);
  return (
    <g class="pk-screw">
      <circle cx={x} cy={y} r={r} class="pk-screw__head" />
      <line x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} class="pk-screw__slot" />
    </g>
  );
}

/** HTML screw for frames laid out with CSS. */
export function ScrewMark({ seed = 0, class: klass }: { seed?: number; class?: string }) {
  return (
    <svg class={cx('pk-screwmark', klass)} width={9} height={9} viewBox="0 0 9 9" aria-hidden="true">
      <Screw x={4.5} y={4.5} r={3.5} seed={seed} />
    </svg>
  );
}

/**
 * Flat rectangle with a 1px bevel: highlight top/left, shadow bottom/right
 * (swapped when `sunken`). Lines sit on half pixels so they stay crisp at 1x.
 */
export function BevelRect({
  x,
  y,
  w,
  h,
  fill = 'pk-f-face',
  sunken = false,
  outline = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  sunken?: boolean;
  outline?: boolean;
}) {
  const hi = sunken ? 'pk-s-sh' : 'pk-s-hi';
  const sh = sunken ? 'pk-s-hi' : 'pk-s-sh';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} class={fill} />
      <path d={`M${x + 1.5} ${y + h - 1.5} V${y + 1.5} H${x + w - 1.5}`} class={cx(hi, 'pk-nofill')} />
      <path d={`M${x + 1.5} ${y + h - 1.5} H${x + w - 1.5} V${y + 1.5}`} class={cx(sh, 'pk-nofill')} />
      {outline ? <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} class="pk-s-outer pk-nofill" /> : null}
    </g>
  );
}

/** Small caption under or over a control (the plate is separate: see Plate). */
export function Caption({ children }: { children: ComponentChildren }) {
  return <span class="pk-caption">{children}</span>;
}
