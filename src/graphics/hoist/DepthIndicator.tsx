/**
 * @graphics/hoist: DepthIndicator. The driver's vertical depth indicator for one hoist: a linear
 * scale from the upper to the lower travel limit, a mark at every vane fitted in the shaft
 * (numbered where the vane is a landing in the stop list), the travel limits, registered calls,
 * the selected landing, and the cage pointer. Drawn like the engraved strip beside a drum
 * winder's dial: flat, black on the panel face, no motion of its own.
 */
import type { JSX } from 'preact';
import './hoist-graphics.css';

export interface IndicatorMark {
  depthFt: number;
  /** Landing number when the vane is a listed landing; null for a vane with no landing. */
  level: number | null;
}

export interface DepthIndicatorProps {
  marks: IndicatorMark[];
  limits: { top: number; bottom: number };
  posFt: number;
  /** Selected (target) landing. */
  target?: number | null;
  /** Landings with a registered call. */
  calls?: number[];
  /** Landing zone lamp lit (cage within a vane's zone). */
  zone?: boolean;
  height?: number;
  label?: string;
}

const W = 112;

export function DepthIndicator({ marks, limits, posFt, target = null, calls = [], zone = false, height = 420, label = 'Depth indicator' }: DepthIndicatorProps): JSX.Element {
  const padT = 18;
  const padB = 18;
  const span = Math.max(1, limits.bottom - limits.top);
  const Y = (ft: number): number => padT + ((ft - limits.top) / span) * (height - padT - padB);
  const axis = 46;
  const ticks: number[] = [];
  for (let ft = Math.ceil(limits.top / 100) * 100; ft <= limits.bottom; ft += 100) ticks.push(ft);
  const py = Math.min(height - padB, Math.max(padT, Y(posFt)));
  const listed = marks.filter((m) => m.level != null);
  return (
    <svg class="hg-ind" viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" aria-label={`${label}: cage at ${Math.round(posFt).toLocaleString('en-US')} feet`}>
      <rect class="hg-ind__face" x="0.5" y="0.5" width={W - 1} height={height - 1} />
      <text class="hg-ind__cap" x={W / 2} y="11" text-anchor="middle">
        FT BELOW GRADE
      </text>
      <path class="hg-ind__axis" d={`M${axis + 0.5} ${Y(limits.top)}V${Y(limits.bottom)}`} />
      {ticks.map((ft) => (
        <g>
          <path class="hg-ind__tick" d={`M${axis - (ft % 500 === 0 ? 8 : 4)} ${Math.round(Y(ft)) + 0.5}H${axis}`} />
          {ft % 500 === 0 && (
            <text class="hg-ind__num" x={axis - 10} y={Y(ft) + 3} text-anchor="end">
              {ft.toLocaleString('en-US')}
            </text>
          )}
        </g>
      ))}
      {/* travel limits */}
      {[limits.top, limits.bottom].map((ft) => (
        <path class="hg-ind__limit" d={`M${axis - 12} ${Math.round(Y(ft)) + 0.5}H${axis + 30}`} />
      ))}
      {/* vanes */}
      {marks.map((m) => {
        const y = Math.round(Y(m.depthFt)) + 0.5;
        return <path class={m.level != null ? 'hg-ind__vane' : 'hg-ind__vane is-bare'} d={`M${axis} ${y}H${axis + (m.level != null ? 16 : 10)}`} />;
      })}
      {listed.map((m, i) => {
        const y = Y(m.depthFt);
        // Alternate label columns where landings sit closer than the type.
        const prev = listed[i - 1];
        const tight = prev && Math.abs(Y(prev.depthFt) - y) < 10;
        const x = axis + 20 + (tight && i % 2 === 1 ? 22 : 0);
        const on = target === m.level;
        const called = calls.includes(m.level!);
        return (
          <g>
            {on && <rect class="hg-ind__sel" x={x - 2} y={y - 5.5} width="18" height="11" />}
            <text class={`hg-ind__lvl${on ? ' is-sel' : ''}`} x={x} y={y + 3.5}>
              {String(m.level).padStart(2, '0')}
            </text>
            {called && <rect class="hg-ind__call" x={x + 18} y={y - 2.5} width="5" height="5" />}
          </g>
        );
      })}
      {/* cage pointer */}
      <path class={`hg-ind__ptr${zone ? ' is-zone' : ''}`} d={`M${axis - 1} ${py}l-9 -5v10z`} />
      <path class="hg-ind__ptrline" d={`M${axis - 10} ${Math.round(py) + 0.5}H${W - 6}`} />
    </svg>
  );
}
