/**
 * @graphics/hoist: ShaftElevation. The depth3d SVG elevation (DepthSection2D) with the hoist
 * compartments drawn over the lift shaft: one lane per hoist, rope from the head frame, the
 * cage at its live depth, and a tick at every landing the selected hoist serves.
 *
 * The overlay is a second SVG with the same viewBox, placed exactly over the elevation. Its
 * coordinate transform repeats the one in DepthSection2D (margins, fit, centring); a unit test
 * pins the two together through `sectionTransform`.
 */
import type { JSX } from 'preact';
import { DepthSection2D, buildSiteModel } from '@graphics/depth3d';
import { PLAN } from '@graphics/depth3d/model';
import type { SiteModel } from '@graphics/depth3d/model';
import './hoist-graphics.css';

export interface ElevationCage {
  /** Hoist id, e.g. "A02-H1". */
  id: string;
  /** Short label drawn beside the selected cage, e.g. "H1". */
  label: string;
  posFt: number;
  selected: boolean;
  moving: boolean;
  /** Landing depths of this hoist (ticks are drawn for the selected hoist only). */
  landings: number[];
}

export interface ShaftElevationProps {
  facilityId: string;
  /** Session tier for level-name withholding (as DepthSection2D). */
  tier: number;
  cages: ElevationCage[];
  selectedLevel?: number | null;
  onSelectLevel?: (n: number) => void;
  width?: number;
  height?: number;
}

/** The x/y transform DepthSection2D uses for a drawing of `width` x `height`. */
export function sectionTransform(m: SiteModel, width: number, height: number): { X: (x: number) => number; Y: (y: number) => number; s: number } {
  const gL = 68;
  const gR = Math.min(256, Math.round(width * 0.36));
  const padT = 14;
  const padB = 58;
  const availW = Math.max(60, width - gL - gR);
  const availH = Math.max(60, height - padT - padB);
  const b = m.bounds;
  const s = Math.min(availH / (b.y1 - b.y0), availW / (b.x1 - b.x0));
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  return { X: (x) => gL + availW / 2 + (x - cx) * s, Y: (y) => padT + availH / 2 - (y - cy) * s, s };
}

export function ShaftElevation({ facilityId, tier, cages, selectedLevel = null, onSelectLevel, width = 520, height = 600 }: ShaftElevationProps): JSX.Element {
  const m = buildSiteModel(facilityId);
  if (!m) return <p class="hg-none">No shaft section is held for {facilityId}.</p>;
  const { X, Y } = sectionTransform(m, width, height);
  const lanes = Math.max(1, cages.length);
  const laneW = (PLAN.shaftX1 - PLAN.shaftX0) / lanes;
  const headY = Y(0) - 14;
  return (
    <div class="hg-elev" style={{ aspectRatio: `${width} / ${height}` }}>
      <DepthSection2D facilityId={facilityId} tier={tier} width={width} height={height} selected={selectedLevel} onSelectLevel={onSelectLevel} />
      <svg class="hg-elev__over" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {cages.map((c, i) => {
          const xc = X(PLAN.shaftX0 + laneW * (i + 0.5));
          const half = Math.max(2.5, ((laneW * (X(1) - X(0))) / 2) - 1.5);
          const cy = Y(-c.posFt);
          return (
            <g class={`hg-cage${c.selected ? ' is-sel' : ''}${c.moving ? ' is-moving' : ''}`}>
              {c.selected &&
                c.landings.map((d) => <path class="hg-landing" d={`M${(xc - half - 3).toFixed(1)} ${Y(-d).toFixed(1)}H${(xc + half + 3).toFixed(1)}`} />)}
              <path class="hg-rope" d={`M${xc.toFixed(1)} ${headY.toFixed(1)}V${(cy - 8).toFixed(1)}`} />
              <rect class="hg-sheave" x={(xc - 2).toFixed(1)} y={(headY - 2).toFixed(1)} width="4" height="4" />
              <rect class="hg-cagebox" x={(xc - half).toFixed(1)} y={(cy - 8).toFixed(1)} width={(half * 2).toFixed(1)} height="8" />
              {c.selected && (
                <text class="hg-cagelbl" x={(X(PLAN.shaftX0) - 4).toFixed(1)} y={(cy - 1).toFixed(1)} text-anchor="end">
                  {c.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
