/**
 * Plate, Lamp, PushButton, ToggleSwitch: the small hardware on every panel.
 * Front elevation, flat fills, 1px bevels, engraved legends in capitals.
 */
import type { ComponentChildren, CSSProperties } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { cx, legendLines, legendText, ScrewMark, type Legend, type LensColor } from './parts';

/* ------------------------------------------------------------------ */
/* Plate                                                                */
/* ------------------------------------------------------------------ */

export type PlateVariant = 'light' | 'dark' | 'warning' | 'danger';

export interface PlateProps {
  /** Engraved text; lines split on '\n' or given as an array. Children are used when absent. */
  text?: Legend;
  children?: ComponentChildren;
  /** light: white laminate, black engraving (default). dark: black laminate, white engraving.
   *  warning: amber laminate, black engraving. danger: red laminate, white engraving. */
  variant?: PlateVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Two fixing screws at the ends. */
  screws?: boolean;
  width?: number | string;
  align?: 'center' | 'left';
  class?: string;
}

/** Engraved label plate (traffolyte). Plain text for assistive technology. */
export function Plate({ text, children, variant = 'light', size = 'md', screws = false, width, align = 'center', class: klass }: PlateProps) {
  const lines = legendLines(text);
  const style: CSSProperties | undefined = width === undefined ? undefined : { width: typeof width === 'number' ? `${width}px` : width };
  return (
    <div class={cx('pk-plate', `pk-plate--${variant}`, `pk-plate--${size}`, align === 'left' && 'pk-plate--left', screws && 'pk-plate--screws', klass)} style={style}>
      {screws ? <ScrewMark seed={lines.length + 3} class="pk-plate__screw pk-plate__screw--l" /> : null}
      <span class="pk-plate__text">
        {lines.length > 0
          ? lines.map((l, i) => (
              <span class="pk-plate__line" key={i}>
                {l}
              </span>
            ))
          : children}
      </span>
      {screws ? <ScrewMark seed={lines.length + 7} class="pk-plate__screw pk-plate__screw--r" /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lamp                                                                 */
/* ------------------------------------------------------------------ */

export interface LampProps {
  /** Engraved legend on the plate under the lamp. */
  legend: Legend;
  lit: boolean;
  color?: LensColor;
  size?: 'sm' | 'md';
  /** Print the lamp state as a word under the plate (ON / OFF unless `words` given). */
  showState?: boolean;
  words?: { on: string; off: string };
  /** Equipment tag, e.g. DS-12, printed small above the lamp. */
  tag?: string;
}

/** Indicating lamp: bezel, flat lens, legend plate. role="img", the label carries the state. */
export function Lamp({ legend, lit, color = 'white', size = 'md', showState = false, words, tag }: LampProps) {
  const d = size === 'sm' ? 22 : 30;
  const c = d / 2;
  const word = lit ? (words?.on ?? 'ON') : (words?.off ?? 'OFF');
  return (
    <div class={cx('pk-ctl', 'pk-lamp', `pk-lens--${color}`, lit ? 'is-lit' : 'is-dark')} role="img" aria-label={`${legendText(legend)}: ${word}`}>
      {tag ? <span class="pk-tag">{tag}</span> : null}
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} aria-hidden="true" class="pk-lamp__svg">
        <circle cx={c} cy={c} r={c - 0.5} class="pk-f-bezel pk-s-outer" />
        <circle cx={c} cy={c} r={c - 3} class="pk-f-face pk-s-sh" />
        <path d={arc(c, c, c - 3, 45, 225)} class="pk-s-hi pk-nofill" />
        <circle cx={c} cy={c} r={c - 5.5} class="pk-lens pk-s-dark" />
      </svg>
      <Plate text={legend} size="sm" />
      {showState ? <span class="pk-state-word">{word}</span> : null}
    </div>
  );
}

/** Arc path between two angles (degrees, 0 = 3 o'clock, counter-clockwise positive, SVG y down). */
export function arc(cx0: number, cy0: number, r: number, a0: number, a1: number): string {
  const p = (a: number): [number, number] => [cx0 + Math.cos((a * Math.PI) / 180) * r, cy0 - Math.sin((a * Math.PI) / 180) * r];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* PushButton                                                           */
/* ------------------------------------------------------------------ */

export interface PushButtonProps {
  /** Legend engraved on the cap (1-3 short lines). */
  legend: Legend;
  /** Engraved plate above the button. */
  label?: Legend;
  /** momentary (default): onPress on push, onRelease on let-go. latching: push-on/push-off via onChange. */
  mode?: 'momentary' | 'latching';
  /** Latched state (latching mode); for momentary, forces the pushed-in drawing. */
  pressed?: boolean;
  /** Lamp in the button. Ignored for black/grey caps, which are not illuminated. */
  lit?: boolean;
  color?: LensColor;
  size?: 'sm' | 'md';
  disabled?: boolean;
  onPress?: () => void;
  onRelease?: () => void;
  onChange?: (latched: boolean) => void;
  /** Accessible name override; defaults to the legend. */
  ariaLabel?: string;
  tag?: string;
}

/** Square illuminated pushbutton (22mm class) in a black bezel. Native <button>. */
export function PushButton(props: PushButtonProps) {
  const { legend, label, mode = 'momentary', pressed, lit = false, color = 'grey', size = 'md', disabled = false, tag } = props;
  const [held, setHeld] = useState(false);
  const holding = useRef(false);
  const illuminated = color !== 'black' && color !== 'grey';
  const down = mode === 'latching' ? !!pressed || held : !!pressed || held;
  const lines = legendLines(legend);
  const d = size === 'sm' ? 40 : 50;
  const inset = size === 'sm' ? 4 : 5;
  const off = down ? 1 : 0;
  const cap = d - inset * 2 - off;

  const begin = (): void => {
    if (disabled || holding.current) return;
    holding.current = true;
    setHeld(true);
    if (mode === 'momentary') props.onPress?.();
  };
  const end = (commit: boolean): void => {
    if (!holding.current) return;
    holding.current = false;
    setHeld(false);
    if (mode === 'momentary') props.onRelease?.();
    else if (commit) props.onChange?.(!pressed);
  };

  const fs = size === 'sm' ? 7.5 : 8.5;
  const lh = fs + 1.5;
  const y0 = inset + off + cap / 2 - ((lines.length - 1) * lh) / 2 + fs * 0.36;
  const name = props.ariaLabel ?? `${label ? legendText(label) + ': ' : ''}${legendText(legend)}`;

  return (
    <div class={cx('pk-ctl', 'pk-pb', `pk-lens--${color}`, illuminated ? (lit ? 'is-lit' : 'is-dark') : 'is-cap', down && 'is-down', disabled && 'is-disabled')}>
      {label ? <Plate text={label} size="sm" /> : null}
      <button
        type="button"
        class="pk-hit pk-pb__btn"
        aria-label={name}
        aria-pressed={mode === 'latching' ? !!pressed : undefined}
        aria-disabled={disabled || undefined}
        data-lamp={illuminated ? (lit ? 'on' : 'off') : undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={() => end(true)}
        onPointerCancel={() => end(false)}
        onLostPointerCapture={() => end(false)}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            end(true);
          }
        }}
        onBlur={() => end(false)}
      >
        <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} aria-hidden="true">
          <rect x={0} y={0} width={d} height={d} class="pk-f-bezel" />
          <path d={`M0.5 ${d - 0.5} V0.5 H${d - 0.5}`} class="pk-s-sh pk-nofill" />
          <rect x={inset - 1} y={inset - 1} width={d - inset * 2 + 2} height={d - inset * 2 + 2} class="pk-f-dark" />
          <rect x={inset + off} y={inset + off} width={cap} height={cap} class="pk-cap" />
          <path
            d={`M${inset + off + 0.5} ${inset + off + cap - 0.5} V${inset + off + 0.5} H${inset + off + cap - 0.5}`}
            class={cx(down ? 'pk-s-capsh' : 'pk-s-caphi', 'pk-nofill')}
          />
          <path
            d={`M${inset + off + 0.5} ${inset + off + cap - 0.5} H${inset + off + cap - 0.5} V${inset + off + 0.5}`}
            class={cx(down ? 'pk-s-caphi' : 'pk-s-capsh', 'pk-nofill')}
          />
          {lines.map((l, i) => (
            <text x={inset + off + cap / 2} y={y0 + i * lh} text-anchor="middle" class="pk-cap-ink" font-size={fs} key={i}>
              {l}
            </text>
          ))}
        </svg>
      </button>
      {tag ? <span class="pk-tag">{tag}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ToggleSwitch                                                         */
/* ------------------------------------------------------------------ */

export interface ToggleSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Engraved plate above. */
  label?: Legend;
  onLegend?: string;
  offLegend?: string;
  disabled?: boolean;
  tag?: string;
}

/** Bat-handle toggle on a hex nut, lever up = ON. role="switch". */
export function ToggleSwitch({ checked, onChange, label, onLegend = 'ON', offLegend = 'OFF', disabled = false, tag }: ToggleSwitchProps) {
  const set = (v: boolean): void => {
    if (!disabled && v !== checked) onChange?.(v);
  };
  const cy = 30;
  const tipY = checked ? 7 : 53;
  const baseY = cy;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `${(20 + Math.cos(a) * 10).toFixed(2)},${(cy + Math.sin(a) * 10).toFixed(2)}`;
  }).join(' ');
  return (
    <div class={cx('pk-ctl', 'pk-toggle', checked ? 'is-on' : 'is-off', disabled && 'is-disabled')}>
      {label ? <Plate text={label} size="sm" /> : null}
      <span class={cx('pk-toggle__legend', checked && 'is-active')} aria-hidden="true">
        {onLegend.toUpperCase()}
      </span>
      <button
        type="button"
        role="switch"
        class="pk-hit pk-toggle__btn"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-label={`${label ? legendText(label) : 'Toggle'}: ${checked ? onLegend : offLegend}`}
        onClick={() => set(!checked)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            set(true);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            set(false);
          }
        }}
      >
        <svg width={40} height={60} viewBox="0 0 40 60" aria-hidden="true">
          <polygon points={hex} class="pk-f-nut pk-s-outer" />
          <circle cx={20} cy={cy} r={6} class="pk-f-face pk-s-outer" />
          {/* lever: tapered bat from the bushing to the tip */}
          <polygon
            points={`16.5,${baseY} 23.5,${baseY} ${22.5},${tipY + (checked ? 3 : -3)} ${17.5},${tipY + (checked ? 3 : -3)}`}
            class="pk-f-lever pk-s-outer"
          />
          <line x1={22.2} y1={baseY} x2={21.6} y2={tipY + (checked ? 3 : -3)} class="pk-s-sh" />
          <ellipse cx={20} cy={tipY} rx={4.5} ry={3.5} class="pk-f-lever pk-s-outer" />
          <circle cx={20} cy={cy} r={3} class="pk-f-dark" />
        </svg>
      </button>
      <span class={cx('pk-toggle__legend', !checked && 'is-active')} aria-hidden="true">
        {offLegend.toUpperCase()}
      </span>
      {tag ? <span class="pk-tag">{tag}</span> : null}
    </div>
  );
}
