/**
 * @graphics/depth3d: DepthSection2D, the SVG elevation drawing of the same parametric
 * model. Used when WebGL is unavailable, for print, and for prerendered HTML.
 * Colours come from depth3d.css (design tokens); nothing here is a colour literal.
 */
import type { JSX } from 'preact';
import './depth3d.css';
import { PLAN, buildSiteModel, fmtFt, isWithheld, spreadLabels, tickLabelStep, titleBlock, type SiteModel } from './model';

export interface DepthSection2DProps {
  facilityId: string;
  /** Session tier (1 = most restricted). Level names with a lower tier number are withheld. */
  tier: number;
  selected?: number | null;
  onSelectLevel?: (n: number) => void;
  /** Drawing size in px; the SVG scales to its container width. */
  width?: number;
  height?: number;
  /**
   * Depth printed beside each level: its top (default; dossiers and the depth register) or its floor,
   * which is the landing depth a hoist serves (canon hoists stops), so the hoist console reads one figure.
   */
  levelDepth?: 'top' | 'floor';
}

const px = (n: number): number => Math.round(n) + 0.5;

/** Left gutter (depth scale) and top / bottom padding of the elevation drawing, px. */
export const SECTION_GUTTER_L = 68;
export const SECTION_PAD_T = 14;
export const SECTION_PAD_B = 58;

/**
 * The elevation's model-to-pixel transform for a drawing of `width` x `height` (margins, fit,
 * centring). Overlays drawn over a DepthSection2D (hoist ShaftElevation) use this to register.
 */
export function sectionTransform(m: SiteModel, width: number, height: number): { X: (x: number) => number; Y: (y: number) => number; s: number; gL: number; gR: number; availW: number; availH: number } {
  const gL = SECTION_GUTTER_L;
  const gR = Math.min(256, Math.round(width * 0.36));
  const availW = Math.max(60, width - gL - gR);
  const availH = Math.max(60, height - SECTION_PAD_T - SECTION_PAD_B);
  const b = m.bounds;
  const s = Math.min(availH / (b.y1 - b.y0), availW / (b.x1 - b.x0));
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return { X: (x) => gL + availW / 2 + (x - cx) * s, Y: (y) => SECTION_PAD_T + availH / 2 - (y - cy) * s, s, gL, gR, availW, availH };
}

export function DepthSection2D({ facilityId, tier, selected = null, onSelectLevel, width = 760, height = 640, levelDepth = 'top' }: DepthSection2DProps): JSX.Element {
  const m = buildSiteModel(facilityId);
  if (!m) {
    return <p class="d3v-none">No depth section is held for {facilityId}.</p>;
  }
  const { X, Y, s, gR } = sectionTransform(m, width, height);
  const rect = (bx: { x0: number; x1: number; y0: number; y1: number }): { x: number; y: number; width: number; height: number } => {
    const x = px(X(bx.x0));
    const y = px(Y(bx.y1));
    return { x, y, width: Math.max(1, px(X(bx.x1)) - x), height: Math.max(1, px(Y(bx.y0)) - y) };
  };

  const hatchId = `d3v-hatch-${m.id}`;
  const axisX = px(X(PLAN.scaleX));
  const step = tickLabelStep(s);
  const labelX = Math.min(width - gR + 14, Math.round(X(m.rock.x1 + PLAN.boreStub)) + 18);
  const maxChars = Math.max(8, Math.floor((width - labelX - 78) / 5.4));
  const leftBores = m.bores.filter((x) => x.side < 0);
  const rightBores = m.bores.filter((x) => x.side > 0);
  const ys = spreadLabels(
    m.levels.map((l) => Y((l.y0 + l.y1) / 2)),
    13,
    10,
    height - 92 - rightBores.length * 12,
  );
  const rockBottom = Y(m.rock.y0);
  const lastLabelY = ys[ys.length - 1] ?? 0;
  const title = titleBlock(m);
  const ramp = m.ramp.legs.map((l, i) => `${i === 0 ? `M${X(l.xa).toFixed(1)} ${Y(l.ya).toFixed(1)} ` : ''}L${X(l.xb).toFixed(1)} ${Y(l.yb).toFixed(1)}`).join(' ');

  return (
    <svg
      class="d3v2"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Depth section of ${m.id}${m.codename ? ' ' + m.codename : ''}: ${m.levels.length} levels, terminal floor ${fmtFt(m.depthFt)} feet below grade.`}
    >
      <defs>
        <pattern id={hatchId} patternUnits="userSpaceOnUse" width="8" height="8">
          <path class="d3v2-hatch" d="M-2 2L2 -2M0 8L8 0M6 10L10 6" />
        </pattern>
      </defs>
      <rect class="d3v2-bg" x="0" y="0" width={width} height={height} />

      {/* rock, cut face */}
      <rect class="d3v2-rock" {...rect(m.rock)} />
      <rect {...rect(m.rock)} fill={`url(#${hatchId})`} stroke="none" />
      <rect class="d3v2-outline" {...rect(m.rock)} />
      <path class="d3v2-line" d={`M${px(X(m.rock.x0 - 70))} ${px(Y(0))}H${px(X(m.rock.x1 + 40))}`} />

      {/* surface cover facility */}
      {m.cover.map((c) => (
        <rect class="d3v2-cover" {...rect(c)} />
      ))}

      {/* bores */}
      {m.bores.map((bo) => (
        <rect class={`d3v2-bore${bo.inService ? '' : ' is-standby'}`} {...rect(bo)} />
      ))}

      {/* decline, shaft, levels */}
      <path class="d3v2-ramp" d={ramp} />
      <rect class="d3v2-shaft" {...rect(m.shaft)} />
      {m.levels.map((l) => (
        <rect
          class={`d3v2-slab${l.terminal ? ' is-terminal' : ''}${selected === l.n ? ' is-sel' : ''}`}
          {...rect(l)}
          onClick={onSelectLevel ? () => onSelectLevel(l.n) : undefined}
        />
      ))}

      {/* depth scale */}
      <path class="d3v2-line" d={`M${axisX} ${px(Y(0))}V${px(Y(-m.depthFt))}`} />
      {m.ticks.map((t) => {
        const y = px(Y(-t.ft));
        const len = t.canon ? 12 : t.major ? 9 : 5;
        const show = t.canon || (t.ft % step === 0 && Math.abs(t.ft - m.depthFt) * s > 11);
        return (
          <g>
            <path class={t.canon ? 'd3v2-line is-heavy' : 'd3v2-line'} d={`M${axisX - len} ${y}H${axisX}`} />
            {show && (
              <text class={`d3v2-tick${t.canon ? ' is-canon' : ''}`} x={axisX - len - 3} y={y + 3} text-anchor="end">
                {t.canon ? `${fmtFt(t.ft)} ft` : fmtFt(t.ft)}
              </text>
            )}
          </g>
        );
      })}
      <path class="d3v2-line is-heavy" d={`M${axisX} ${px(Y(-m.depthFt))}H${px(X(m.terminal.x0))}`} stroke-dasharray="4 3" />
      <text class="d3v2-tick" x={axisX - 3} y={Math.max(9, Y(0) - 8)} text-anchor="end">
        FT
      </text>

      {/* level labels and leaders */}
      {m.levels.map((l, i) => {
        const ly = Math.round(ys[i]!);
        const ax = X(l.x1);
        const ay = Y((l.y0 + l.y1) / 2);
        const withheld = isWithheld(l, tier);
        const name = l.short.length > maxChars ? l.short.slice(0, maxChars - 1).trimEnd() + '…' : l.short;
        const on = selected === l.n;
        return (
          <g class={`d3v2-lbl${on ? ' is-sel' : ''}`} onClick={onSelectLevel ? () => onSelectLevel(l.n) : undefined}>
            <path class="d3v2-leader" d={`M${ax.toFixed(1)} ${ay.toFixed(1)}L${labelX - 14} ${ly + 0.5}H${labelX - 3}`} />
            {on && <rect class="d3v2-selbox" x={labelX - 2} y={ly - 6} width={width - labelX - 4} height={12} />}
            <text x={labelX} y={ly + 3.5}>
              <tspan class="d3v2-mono">{String(l.n).padStart(2, '0')}</tspan>
              <tspan class="d3v2-mono" x={labelX + 50} text-anchor="end">
                {fmtFt(levelDepth === 'floor' ? l.topFt + l.heightFt : l.topFt)}
              </tspan>
              {!withheld && <tspan x={labelX + 58}>{name}</tspan>}
            </text>
            {withheld && (
              <rect class="d3v2-rx" x={labelX + 58} y={ly - 4} width={Math.min(30, Math.max(8, l.shortLen)) * 5.4} height={9}>
                <title>Designation withheld</title>
              </rect>
            )}
          </g>
        );
      })}

      {/* callouts: lift shaft, vehicle decline */}
      {(() => {
        const cs = m.callouts.shaft;
        const cd = m.callouts.decline;
        const sx = Math.round(X(cs.x));
        const sy = Math.round(Y(cs.y));
        const dy = Math.round(Y(cd.y));
        return (
          <g>
            <path class="d3v2-leader" d={`M${sx} ${sy + 0.5}H${sx + 11}M${X(cd.x).toFixed(1)} ${dy + 0.5}H${labelX - 3}`} />
            <rect class="d3v2-bg" x={sx + 11} y={sy - 6} width={cs.label.length * 5.2 + 6} height={12} />
            <text class="d3v2-note" x={sx + 14} y={sy + 3.5}>
              {cs.label}
            </text>
            <text class="d3v2-note" x={labelX} y={dy + 3.5}>
              {cd.label}
            </text>
          </g>
        );
      })()}

      {/* bore annotations */}
      {leftBores.map((bo, i) => {
        const x = Math.max(axisX + 8, X(bo.x0));
        const y = Math.round(rockBottom) + 14 + i * 12;
        return (
          <g>
            <path class="d3v2-leader" d={`M${px(x)} ${px(Y(bo.y0))}V${y - 3}`} />
            <text class="d3v2-ann" x={x + 4} y={y}>
              {bo.label}
            </text>
          </g>
        );
      })}
      {rightBores.map((bo, i) => {
        const y = Math.round(lastLabelY) + 18 + i * 12;
        return (
          <g>
            <path class="d3v2-leader" d={`M${X(bo.x1).toFixed(1)} ${Y((bo.y0 + bo.y1) / 2).toFixed(1)}L${labelX - 14} ${y - 2.5}H${labelX - 3}`} />
            <text class="d3v2-ann" x={labelX} y={y}>
              {bo.label}
            </text>
          </g>
        );
      })}

      {/* title block */}
      <g transform={`translate(${width - gR + 12} ${height - 4 - title.length * 11})`}>
        <rect class="d3v2-tb" x="0.5" y="-9.5" width={gR - 18} height={title.length * 11 + 6} />
        {title.map((line, i) => (
          <text class={i === 0 ? 'd3v2-note is-strong' : 'd3v2-note is-dim'} x="5" y={i * 11 + 1}>
            {line}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default DepthSection2D;
