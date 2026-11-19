/**
 * Geographic view: the engineering tunnel map with the board's live layer drawn over it
 * (consist positions and occupied blocks on segment 04). The overlay uses the map's own
 * projection and link curves (@graphics/tunnelmap/geometry) and repeats the map's sheet
 * layout (frame band, title block share) so both line up.
 */
import { useMemo } from 'preact/hooks';
import { TunnelMap, type TunnelLayer } from '@graphics/tunnelmap';
import { allLinkGeometry, tunnelProjection, type Box, type Pt } from '@graphics/tunnelmap/geometry';
import { blockSpan, type SimModel } from '@sim/transit-model';
import { useSize, type Snapshot } from './views';

/* Mirrors layoutFor() in @graphics/tunnelmap/index.tsx (not exported there). */
const OUTER = 6;
const BAND = 16;
const TB_W = 320;

function mapBoxFor(width: number, height: number): Box {
  const inset = OUTER + BAND;
  const frame = { x0: inset, y0: inset, x1: width - inset, y1: height - inset };
  const unit = Math.max(0.55, Math.min(1, width / 1100));
  return { x0: frame.x0 + 14, y0: frame.y0 + 12, x1: frame.x1 - 14 - TB_W * unit * 0.6, y1: frame.y1 - 12 };
}

const mapId = (key: string) => (key.includes('>') ? `TRAM-${key.replace('>', ':')}` : `RAIL-${key}`);

function along(pts: Pt[], f: number): Pt {
  const x = Math.min(Math.max(f, 0), 1) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(x));
  const a = pts[i]!;
  const b = pts[i + 1]!;
  const t = x - i;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function slice(pts: Pt[], f0: number, f1: number): string {
  const n = 8;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const p = along(pts, f0 + ((f1 - f0) * i) / n);
    d += `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  return d;
}

export function GeoView({ model, state, layer, selected, onSelect }: { model: SimModel; state: Snapshot | null; layer: TunnelLayer; selected: string | null; onSelect: (key: string | null) => void }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const w = Math.max(size.w, 320);
  const h = Math.max(size.h, 240);
  const geo = useMemo(() => {
    const proj = tunnelProjection(mapBoxFor(w, h));
    return new Map(allLinkGeometry(proj).map((g) => [g.link.id as string, g.pts]));
  }, [w, h]);
  const highlight = selected ? (model.byKey[selected] ? mapId(selected) : selected) : null;
  const seg = state?.seg04;
  const segLink = model.byKey['04'];
  const segPts = geo.get('RAIL-04');
  return (
    <div class="tr-geo" ref={ref}>
      {size.w > 0 && (
        <>
          <TunnelMap
            width={w}
            height={h}
            layer={layer}
            highlight={highlight}
            onSelect={(id) => {
              if (!id) return onSelect(null);
              const m = /^RAIL-(\d{2})$/.exec(id);
              onSelect(m ? m[1]! : id.replace(/^TRAM-/, '').replace(':', '>'));
            }}
          />
          <svg class="tr-geo-live" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {seg?.active && segLink && segPts && seg.lit.map((n) => {
              const [a, b] = blockSpan(segLink, n);
              return <path key={n} d={slice(segPts, a, b)} class="tr-geo-occ" />;
            })}
            {layer !== 'certified' &&
              (state?.trains ?? []).map((t) => {
                const pts = geo.get(mapId(t.link));
                if (!pts) return null;
                const p = along(pts, t.pos);
                return (
                  <g key={t.id} transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}>
                    <rect x={-3} y={-3} width={6} height={6} class={t.kind === 'RAIL' ? 'tr-geo-rail' : 'tr-geo-tram'} />
                    {t.kind === 'RAIL' && (
                      <text x={6} y={-5} class="tr-geo-label">
                        {t.suppressed ? '#'.repeat(Math.max(4, t.label.length)) : t.label}
                      </text>
                    )}
                  </g>
                );
              })}
          </svg>
        </>
      )}
    </div>
  );
}
