/**
 * Seal drill layer for @graphics/map's UsMap (pass as its function child). Draws the relay
 * path of the order (a line from the relaying site to each site once the order has reached
 * it; heavier for the inter-hub circuits, dashed for voice calls) and a state ring around each
 * marker: dashed when the order has arrived, single when acknowledged, double while sealing,
 * a box when sealed, a cross when no report. Under the markers, so the class shapes stay legible.
 */
import type { MapContext } from '@graphics/map';
import type { GanttStatus } from './Gantt';
import './drill-graphics.css';

export interface MapSite {
  id: string;
  lon: number;
  lat: number;
  via: { lon: number; lat: number } | null;
  relay: 'origin' | 'rail' | 'tram' | 'voice';
  reached: boolean;
  status: GanttStatus;
  cut?: boolean;
}

export function DrillMapLayer({ ctx, sites }: { ctx: MapContext; sites: readonly MapSite[] }) {
  const small = ctx.width < 700;
  const r = small ? 7 : 9;
  return (
    <g class="dg-map" aria-hidden="true">
      {sites.map((s) => {
        if (!s.via || !s.reached || s.cut) return null;
        const a = ctx.project(s.via.lon, s.via.lat);
        const b = ctx.project(s.lon, s.lat);
        if (!a || !b) return null;
        return <line key={`l-${s.id}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} class={`dg-relay dg-relay--${s.relay}`} />;
      })}
      {sites.map((s) => {
        const p = ctx.project(s.lon, s.lat);
        if (!p) return null;
        const [x, y] = p;
        if (s.cut) return <rect key={s.id} x={x - r} y={y - r} width={2 * r} height={2 * r} class="dg-ring dg-ring--cut" />;
        if (!s.reached && s.status === 'pending') return null;
        switch (s.status) {
          case 'pending':
            return <circle key={s.id} cx={x} cy={y} r={r} class="dg-ring dg-ring--ordered" />;
          case 'acknowledged':
            return <circle key={s.id} cx={x} cy={y} r={r} class="dg-ring dg-ring--ack" />;
          case 'sealing':
            return (
              <g key={s.id}>
                <circle cx={x} cy={y} r={r} class="dg-ring dg-ring--ack" />
                <circle cx={x} cy={y} r={r + 3} class="dg-ring dg-ring--ack" />
              </g>
            );
          case 'sealed':
            return <rect key={s.id} x={x - r} y={y - r} width={2 * r} height={2 * r} class="dg-ring dg-ring--sealed" />;
          case 'no-report':
            return <path key={s.id} d={`M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`} class="dg-ring dg-ring--noreport" />;
        }
      })}
    </g>
  );
}

/** Legend glyphs for the map key. */
export function MapRingGlyph({ status }: { status: GanttStatus | 'cut' | 'ordered' }) {
  const r = 6;
  const c = 9;
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" class="dg-map" aria-hidden="true">
      {status === 'ordered' && <circle cx={c} cy={c} r={r} class="dg-ring dg-ring--ordered" />}
      {status === 'acknowledged' && <circle cx={c} cy={c} r={r} class="dg-ring dg-ring--ack" />}
      {status === 'sealing' && (
        <>
          <circle cx={c} cy={c} r={r - 2} class="dg-ring dg-ring--ack" />
          <circle cx={c} cy={c} r={r + 1} class="dg-ring dg-ring--ack" />
        </>
      )}
      {status === 'sealed' && <rect x={c - r} y={c - r} width={2 * r} height={2 * r} class="dg-ring dg-ring--sealed" />}
      {status === 'no-report' && <path d={`M${c - r} ${c - r}L${c + r} ${c + r}M${c + r} ${c - r}L${c - r} ${c + r}`} class="dg-ring dg-ring--noreport" />}
      {status === 'cut' && <rect x={c - r} y={c - r} width={2 * r} height={2 * r} class="dg-ring dg-ring--cut" />}
    </svg>
  );
}
