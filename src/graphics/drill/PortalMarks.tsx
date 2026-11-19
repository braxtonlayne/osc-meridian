/**
 * Portal state marks drawn over @graphics/schematic's LineDiagram at the same size. Each node on
 * the line diagram gets a small two-leaf portal symbol beside it: leaves apart (open), stepping
 * together while the site's seal doors cycle, closed and barred when it reports sealed, and a
 * hollow box with a query mark when the site gives no report.
 *
 * The board transform is the one LineDiagram uses (uniform scale to fit, centred, legend band
 * under the board at or below 640 px wide); SCHEMATIC_LAYOUT gives the node positions.
 */
import { SCHEMATIC_LAYOUT, schematicTransform } from '@graphics/schematic';
import type { GanttStatus } from './Gantt';
import './drill-graphics.css';

export interface PortalMark {
  status: GanttStatus;
  /** 0..1 door travel while sealing (1 = closed). */
  closed: number;
  /** The order has reached the site. */
  reached: boolean;
  cut?: boolean;
}

export interface PortalMarksProps {
  width: number;
  height: number;
  marks: Record<string, PortalMark>;
  selected?: string | null;
}

/** LineDiagram's own layout-to-pixel transform (schematic/index.tsx), so the marks stay registered. */
export function boardTransform(width: number, height: number) {
  const { s, ox, oy, compact, alphaW, alphaH } = schematicTransform(width, height);
  return { s, ox, oy, compact, alphaW, alphaH };
}

export function PortalMarks({ width, height, marks, selected }: PortalMarksProps) {
  const g = boardTransform(width, height);
  const W = g.compact ? 10 : 14;
  const H = g.compact ? 7 : 9;
  return (
    <svg class="dg-portals" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {SCHEMATIC_LAYOUT.nodes.map((n) => {
        const m = marks[n.id];
        if (!m || (!m.reached && m.status === 'pending')) return null;
        const cx = Math.round(g.ox + n.x * g.s);
        const cy = Math.round(g.oy + n.y * g.s);
        const alpha = n.cls === 'ALPHA';
        // Beside the node, on the side away from its place label.
        const gap0 = g.compact ? 6 : 9;
        let x0: number;
        let y0: number;
        if (alpha) {
          x0 = cx + Math.round(g.alphaW / 2) + 3;
          y0 = cy - Math.round(g.alphaH / 2) - H - 2;
        } else if (n.label === 'E') {
          x0 = cx - gap0 - W;
          y0 = cy - Math.round(H / 2);
        } else if (n.label === 'W') {
          x0 = cx + gap0;
          y0 = cy - Math.round(H / 2);
        } else if (n.label === 'N') {
          x0 = cx - Math.round(W / 2);
          y0 = cy + gap0;
        } else {
          x0 = cx - Math.round(W / 2);
          y0 = cy - gap0 - H;
        }
        const leaf = W / 2;
        let gap = W - 2; // fully open
        if (m.status === 'sealing') gap = Math.max(0, Math.round((W - 2) * (1 - m.closed)));
        if (m.status === 'sealed') gap = 0;
        const lw = Math.max(1, Math.round((W - gap) / 2));
        const sel = selected === n.id;
        return (
          <g key={n.id} transform={`translate(${x0} ${y0})`} class={`dg-portal dg-portal--${m.cut ? 'cut' : m.status}${sel ? ' is-sel' : ''}`}>
            <rect x={-1.5} y={-1.5} width={W + 3} height={H + 3} class="dg-portal-frame" />
            {m.status === 'no-report' || m.cut ? (
              <text x={W / 2} y={H - 1} class="dg-portal-q" text-anchor="middle">
                ?
              </text>
            ) : (
              <>
                <rect x={0} y={0} width={Math.min(leaf, lw)} height={H} class="dg-portal-leaf" />
                <rect x={W - Math.min(leaf, lw)} y={0} width={Math.min(leaf, lw)} height={H} class="dg-portal-leaf" />
                {m.status === 'sealed' && <line x1={0} x2={W} y1={H / 2 + 0.5} y2={H / 2 + 0.5} class="dg-portal-bar" />}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Small legend glyph for one portal state, for the app's key. */
export function PortalGlyph({ status, closed = 0.5 }: { status: GanttStatus | 'cut'; closed?: number }) {
  const W = 14;
  const H = 9;
  const gap = status === 'sealed' ? 0 : status === 'sealing' ? Math.round((W - 2) * (1 - closed)) : W - 2;
  const lw = Math.max(1, Math.round((W - gap) / 2));
  return (
    <svg width={W + 4} height={H + 4} viewBox={`-2 -2 ${W + 4} ${H + 4}`} class={`dg-portal dg-portal--${status}`} aria-hidden="true">
      <rect x={-1.5} y={-1.5} width={W + 3} height={H + 3} class="dg-portal-frame" />
      {status === 'no-report' || status === 'cut' ? (
        <text x={W / 2} y={H - 1} class="dg-portal-q" text-anchor="middle">
          ?
        </text>
      ) : (
        <>
          <rect x={0} y={0} width={Math.min(W / 2, lw)} height={H} class="dg-portal-leaf" />
          <rect x={W - Math.min(W / 2, lw)} y={0} width={Math.min(W / 2, lw)} height={H} class="dg-portal-leaf" />
          {status === 'sealed' && <line x1={0} x2={W} y1={H / 2 + 0.5} y2={H / 2 + 0.5} class="dg-portal-bar" />}
        </>
      )}
    </svg>
  );
}
