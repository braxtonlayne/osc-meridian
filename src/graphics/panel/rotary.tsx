/**
 * SelectorSwitch and KeySwitch: rotary controls with engraved position legends.
 * Both are role="slider" (arrows, Home/End); clicking a legend selects it.
 */
import type { ComponentChildren } from 'preact';
import { cx, legendText, type Legend } from './parts';
import { Plate } from './controls';
import { rotaryAngles, rotaryKey, stepPosition } from './logic';

const W = 112;
const H = 92;
const CX = W / 2;
const CY = 54;
const R_LEGEND = 38;

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CX + Math.sin(a) * r, CY - Math.cos(a) * r];
}

interface RotaryBaseProps {
  positions: readonly string[];
  value: number;
  label?: Legend;
  disabled?: boolean;
  tag?: string;
}

function RotaryShell({
  kind,
  positions,
  value,
  label,
  locked,
  disabled,
  tag,
  ariaLabel,
  onSelect,
  onLocked,
  children,
}: RotaryBaseProps & {
  kind: 'selector' | 'key';
  locked: boolean;
  ariaLabel: string;
  onSelect: (i: number) => void;
  onLocked?: () => void;
  children: (angle: number) => ComponentChildren;
}) {
  const n = positions.length;
  const angles = rotaryAngles(n);
  const idx = stepPosition(value, 0, n);
  const angle = angles[idx] ?? 0;
  const inert = disabled || locked;
  const pick = (i: number): void => {
    if (disabled) return;
    if (locked) {
      onLocked?.();
      return;
    }
    if (i !== idx) onSelect(i);
  };
  return (
    <div class={cx('pk-ctl', 'pk-rotary', `pk-rotary--${kind}`, inert && 'is-disabled')}>
      {label ? <Plate text={label} size="sm" /> : null}
      <div
        class="pk-hit pk-rotary__hit"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={idx}
        aria-valuetext={positions[idx] ?? ''}
        aria-disabled={inert || undefined}
        onKeyDown={(e) => {
          const next = rotaryKey(e.key, idx, n);
          if (next === null) return;
          e.preventDefault();
          pick(next);
        }}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {angles.map((a, i) => {
            const [x1, y1] = polar(a, 25);
            const [x2, y2] = polar(a, 29);
            const [tx, ty] = polar(a, R_LEGEND);
            const anchor = a < -20 ? 'end' : a > 20 ? 'start' : 'middle';
            const dy = Math.abs(a) > 100 ? 8 : Math.abs(a) > 60 ? 3.5 : 0;
            return (
              <g key={i} class={cx('pk-rotary__pos', i === idx && 'is-active')} onClick={() => pick(i)}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} class="pk-s-ink" />
                <text x={tx} y={ty + dy} text-anchor={anchor} class="pk-legend">
                  {(positions[i] ?? '').toUpperCase()}
                </text>
              </g>
            );
          })}
          <g
            onClick={() => {
              if (n > 1) pick(idx === n - 1 ? 0 : idx + 1);
            }}
          >
            {children(angle)}
          </g>
        </svg>
      </div>
      {tag ? <span class="pk-tag">{tag}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export interface SelectorSwitchProps extends RotaryBaseProps {
  onChange?: (index: number) => void;
}

/** Rotary selector with a black bar handle and white index line, 2-7 positions. */
export function SelectorSwitch({ positions, value, label, disabled = false, tag, onChange }: SelectorSwitchProps) {
  return (
    <RotaryShell
      kind="selector"
      positions={positions}
      value={value}
      label={label}
      disabled={disabled}
      tag={tag}
      locked={false}
      ariaLabel={label ? legendText(label) : 'Selector switch'}
      onSelect={(i) => onChange?.(i)}
    >
      {(angle) => (
        <g>
          <circle cx={CX} cy={CY} r={19} class="pk-f-knobbase pk-s-ink" />
          <g transform={`rotate(${angle} ${CX} ${CY})`}>
            <rect x={CX - 6} y={CY - 22} width={12} height={44} rx={2} class="pk-f-knob" />
            <line x1={CX - 5.5} y1={CY - 20} x2={CX - 5.5} y2={CY + 20} class="pk-s-knobhi" />
            <rect x={CX - 1} y={CY - 20} width={2} height={14} class="pk-f-index" />
          </g>
        </g>
      )}
    </RotaryShell>
  );
}

/* ------------------------------------------------------------------ */

export interface KeySwitchProps extends RotaryBaseProps {
  onChange?: (index: number) => void;
  /** The key is in the lock. Without it the switch cannot be turned (onLocked fires instead). */
  keyPresent?: boolean;
  /** Positions where the key can be withdrawn; drawn as a small dot beside the legend. */
  removableAt?: readonly number[];
  /** Tried to turn without the key: the app decides the in-world refusal. */
  onLocked?: () => void;
  /** Number stamped on the key bow, e.g. "K-114". */
  keyNo?: string;
}

/** Cylinder lock switch with the key drawn in the keyway. Default positions OFF / ON. */
export function KeySwitch({
  positions,
  value,
  label,
  disabled = false,
  tag,
  onChange,
  keyPresent = true,
  removableAt,
  onLocked,
  keyNo,
}: KeySwitchProps) {
  const angles = rotaryAngles(positions.length);
  return (
    <RotaryShell
      kind="key"
      positions={positions}
      value={value}
      label={label}
      disabled={disabled}
      tag={tag}
      locked={!keyPresent}
      ariaLabel={`${label ? legendText(label) : 'Key switch'}${keyPresent ? '' : ' (key not inserted)'}`}
      onSelect={(i) => onChange?.(i)}
      onLocked={onLocked}
    >
      {(angle) => (
        <g>
          {(removableAt ?? []).map((i) => {
            const a = angles[i];
            if (a === undefined) return null;
            const [x, y] = polar(a, 32);
            return <circle key={`r${i}`} cx={x} cy={y} r={1.6} class="pk-f-ink" />;
          })}
          <circle cx={CX} cy={CY} r={19} class="pk-f-bezel pk-s-outer" />
          <circle cx={CX} cy={CY} r={15} class="pk-f-face pk-s-sh" />
          <circle cx={CX} cy={CY} r={11} class="pk-f-cyl pk-s-outer" />
          <g transform={`rotate(${angle} ${CX} ${CY})`}>
            <rect x={CX - 1.5} y={CY - 8} width={3} height={16} class="pk-f-dark" />
            {keyPresent ? (
              <g class="pk-key">
                <rect x={CX - 2.5} y={CY - 12} width={5} height={13} class="pk-f-keymetal pk-s-outer" />
                <rect x={CX - 9} y={CY - 29} width={18} height={18} rx={3} class="pk-f-keymetal pk-s-outer" />
                <circle cx={CX} cy={CY - 25} r={2.4} class="pk-f-face pk-s-outer" />
                <line x1={CX - 6} y1={CY - 13.5} x2={CX + 6} y2={CY - 13.5} class="pk-s-sh" />
                {keyNo ? (
                  <text x={CX} y={CY - 16.5} text-anchor="middle" class="pk-keyno">
                    {keyNo}
                  </text>
                ) : null}
              </g>
            ) : null}
          </g>
        </g>
      )}
    </RotaryShell>
  );
}
