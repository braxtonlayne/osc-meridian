/**
 * HubMimic: the key distribution network hub circuits as a small mimic. Hubs are placed
 * by rank of their canon longitude (across) and latitude (down), a schematic, not a map; circuits follow the rail segments. A live circuit is a solid
 * bus, a dropped one dashed (the panel kit's MimicLine rules). Hub boxes are filled
 * while the hub is reachable from this workstation.
 */
import { MimicBox, MimicLine, MimicSvg } from '@graphics/panel';
import './isolate-graphics.css';

export interface HubNode {
  id: string; // "ALPHA-01"
  lat: number;
  lon: number;
  /** Reachable from this workstation (filled box). */
  up: boolean;
  /** This workstation's own site. */
  local?: boolean;
}

export interface HubLink {
  id: string; // "SEG 01"
  a: string;
  b: string;
  /** Circuit carrying traffic. */
  live: boolean;
  /** Short caption at the midpoint ("NOT IN SERVICE"). */
  note?: string;
}

export interface HubMimicProps {
  nodes: readonly HubNode[];
  links: readonly HubLink[];
  width?: number;
  height?: number;
  label: string;
}

const BW = 64;
const BH = 22;

export function HubMimic({ nodes, links, width = 420, height = 220, label }: HubMimicProps) {
  const pad = { x: BW / 2 + 10, y: BH / 2 + 14 };
  // Rank placement: west to east across, north to south down. Keeps every hub apart however
  // close two sites are on the ground; the mimic is a schematic, not a map.
  const k = Math.max(1, nodes.length - 1);
  const byLon = [...nodes].sort((a, b) => a.lon - b.lon).map((n) => n.id);
  const byLat = [...nodes].sort((a, b) => b.lat - a.lat).map((n) => n.id);
  const at = new Map(
    nodes.map((n) => [n.id, [Math.round(pad.x + (byLon.indexOf(n.id) / k) * (width - 2 * pad.x)), Math.round(pad.y + (byLat.indexOf(n.id) / k) * (height - 2 * pad.y))] as const]),
  );
  return (
    <MimicSvg width={width} height={height} label={label}>
      {links.map((l) => {
        const a = at.get(l.a);
        const b = at.get(l.b);
        if (!a || !b) return null;
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        return (
          <g key={l.id}>
            <MimicLine points={[a, b]} state={l.live ? 'live' : 'dead'} weight={l.live ? 3 : 2} />
            <text x={mx} y={my - 4} text-anchor="middle" class="pk-mimic__boxt hm-cap">
              {l.id}
            </text>
            {l.note ? (
              <text x={mx} y={my + 10} text-anchor="middle" class="pk-mimic__boxt hm-cap">
                {l.note}
              </text>
            ) : null}
          </g>
        );
      })}
      {nodes.map((n) => {
        const p = at.get(n.id)!;
        return (
          <g key={n.id}>
            <MimicBox x={p[0] - BW / 2} y={p[1] - BH / 2} w={BW} h={BH} label={n.id} on={n.up} />
            <text x={p[0]} y={p[1] + BH / 2 + 10} text-anchor="middle" class="pk-mimic__boxt hm-cap">
              {n.local ? 'THIS SITE' : n.up ? 'UP' : 'DOWN'}
            </text>
          </g>
        );
      })}
    </MimicSvg>
  );
}
