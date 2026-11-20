/**
 * @graphics/strike: local plot for planning model PM-3 (drawn by Opus, pass two).
 *
 * A plain GIS-client "local plot" around a point: azimuthal equidistant projection centred on
 * the point, so every PM-3 contour is an exact circle and every distance from the centre is
 * true. Flat pale land, thin grey state lines (the same bundled outline as @graphics/map),
 * 1 px contour rings labelled in psi, the class marker shapes of @graphics/map, a scale bar
 * and a north arrow. No fills by severity, no glow; colours come from design tokens only.
 */
import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';
import { geoAzimuthalEquidistant, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { merge, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { MultiLineString, MultiPolygon } from 'geojson';
import type { ClassId } from '@core/canon-types';
import { MarkerShape, NorthArrow } from '@graphics/map';
import topoJson from '@graphics/map/geo/conus.topo.json';
import './plot.css';

export interface PlotPoint {
  lat: number;
  lon: number;
}

export interface PlotRing {
  psi: number;
  rangeMi: number;
}

export interface PlotSite {
  id: string;
  cls: ClassId;
  point: PlotPoint;
  /** Short word drawn under the designation (e.g. the condition), optional. */
  note?: string;
}

export interface LocalPlotProps {
  width: number;
  height: number;
  center: PlotPoint;
  /** Ground miles across the shorter side of the frame. */
  spanMi: number;
  rings: PlotRing[];
  sites: PlotSite[];
  /** Mean earth radius in statute miles (canon). */
  radiusMi: number;
  selected?: string | null;
  onSelectSite?: (id: string) => void;
  /** Click on open ground: the point under the pointer. */
  onPick?: (p: PlotPoint) => void;
  /** Accessible name. */
  label: string;
  /** Second centre (comparison): drawn as a dashed cross with its own outer ring. */
  ghost?: { center: PlotPoint; outerMi: number } | null;
}

type Conus = Topology<{ states: GeometryCollection<{ name: string; postal: string }> }>;
let geoCache: { land: MultiPolygon; borders: MultiLineString } | null = null;
function conus() {
  if (geoCache) return geoCache;
  const topo = topoJson as unknown as Conus;
  geoCache = {
    land: merge(topo, topo.objects.states.geometries as never),
    borders: mesh(topo, topo.objects.states as never, (a, b) => a !== b),
  };
  return geoCache;
}

/** Scale-bar lengths the plot may use, in miles (largest that fits wins). */
const BAR_STEPS = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25];

export function projectionAt(center: PlotPoint, width: number, height: number, spanMi: number, radiusMi: number): GeoProjection {
  const pxPerMi = Math.min(width, height) / spanMi;
  return geoAzimuthalEquidistant()
    .rotate([-center.lon, -center.lat])
    .scale(pxPerMi * radiusMi)
    .translate([width / 2, height / 2])
    .clipAngle(Math.min(170, ((spanMi * 2) / radiusMi) * (180 / Math.PI) + 1))
    .clipExtent([
      [0, 0],
      [width, height],
    ]);
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export function LocalPlot(props: LocalPlotProps): JSX.Element {
  const { width, height, center, spanMi, rings, sites, radiusMi, selected, onSelectSite, onPick, label, ghost } = props;
  const pxPerMi = Math.min(width, height) / spanMi;
  const proj = useMemo(() => projectionAt(center, width, height, spanMi, radiusMi), [center.lat, center.lon, width, height, spanMi, radiusMi]);
  const paths = useMemo(() => {
    const g = conus();
    const path = geoPath(proj);
    return { land: path(g.land) ?? '', borders: path(g.borders) ?? '' };
  }, [proj]);

  const cx = r1(width / 2);
  const cy = r1(height / 2);
  const bar = BAR_STEPS.find((m) => m * pxPerMi <= width * 0.28) ?? BAR_STEPS[BAR_STEPS.length - 1]!;
  const barPx = Math.round(bar * pxPerMi);
  const fs = width >= 500 ? 10 : 9;

  // Ring labels: drawn at the top of each ring when it is large enough to carry one and does
  // not crowd the previous label.
  let lastLabelY = Infinity;
  const ringEls = rings.map((r) => {
    const rad = r.rangeMi * pxPerMi;
    let lbl: JSX.Element | null = null;
    const ly = cy - rad + fs + 1;
    if (rad > fs * 1.6 && lastLabelY - ly > fs + 2 && cy - rad > 0) {
      lastLabelY = ly;
      lbl = (
        <text class="spl-ring-label" x={cx} y={r1(ly)} font-size={fs - 1} text-anchor="middle">
          {r.psi.toLocaleString('en-US')} psi
        </text>
      );
    }
    return (
      <g key={r.psi}>
        <circle class={`spl-ring${r === rings[0] ? ' spl-ring--outer' : ''}`} cx={cx} cy={cy} r={r1(Math.max(0.5, rad))} />
        {lbl}
      </g>
    );
  });

  const ghostEl = (() => {
    if (!ghost) return null;
    const p = proj([ghost.center.lon, ghost.center.lat]);
    if (!p) return null;
    return (
      <g class="spl-ghost" aria-hidden="true">
        <circle cx={r1(p[0])} cy={r1(p[1])} r={r1(Math.max(1, ghost.outerMi * pxPerMi))} />
        <path d={`M${r1(p[0] - 6)},${r1(p[1])}H${r1(p[0] + 6)}M${r1(p[0])},${r1(p[1] - 6)}V${r1(p[1] + 6)}`} />
      </g>
    );
  })();

  const onClick = (e: MouseEvent) => {
    if (!onPick) return;
    const svg = e.currentTarget as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const inv = proj.invert?.([e.clientX - box.left, e.clientY - box.top]);
    if (inv) onPick({ lon: inv[0], lat: inv[1] });
  };

  return (
    <svg class="spl" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label} onClick={onClick}>
      <rect class="spl-water" x={0} y={0} width={width} height={height} />
      <path class="spl-land" d={paths.land} />
      <path class="spl-borders" d={paths.borders} />
      {ghostEl}
      <g class="spl-rings" aria-hidden="true">
        {ringEls}
      </g>
      <path class="spl-gz" d={`M${cx - 7},${cy}H${cx + 7}M${cx},${cy - 7}V${cy + 7}`} aria-hidden="true" />
      <circle class="spl-gz" cx={cx} cy={cy} r={3} aria-hidden="true" />
      <g class="spl-sites">
        {sites.map((s) => {
          const p = proj([s.point.lon, s.point.lat]);
          if (!p) return null;
          const x = Math.floor(p[0]) + 0.5;
          const y = Math.floor(p[1]) + 0.5;
          const sel = s.id === selected;
          return (
            <g
              key={s.id}
              class="spl-site"
              transform={`translate(${x},${y})`}
              role="button"
              tabindex={-1}
              aria-label={`${s.id}${s.note ? `, ${s.note}` : ''}`}
              aria-pressed={sel}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSite?.(s.id);
              }}
            >
              <MarkerShape cls={s.cls} size={10} state={sel ? 'selected' : 'normal'} />
              <text class="spl-site-label" x={10} y={-2} font-size={fs}>
                {s.id}
              </text>
              {s.note ? (
                <text class="spl-site-note" x={10} y={fs + 0} font-size={fs - 1}>
                  {s.note}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
      <g class="spl-furn" aria-hidden="true">
        <NorthArrow x={width - 18} y={46} size={24} rotate={0} fontSize={fs - 1} />
        <path class="um-furn-line" d={`M10.5,${height - 15}V${height - 10.5}H${10.5 + barPx}V${height - 15}`} shape-rendering="crispEdges" />
        <text class="um-furn-text" x={10} y={height - 18} font-size={fs - 1}>
          {`0`}
        </text>
        <text class="um-furn-text" x={10 + barPx} y={height - 18} font-size={fs - 1} text-anchor="middle">
          {`${bar} mi`}
        </text>
      </g>
      <rect class="spl-neat" x={0.5} y={0.5} width={width - 1} height={height - 1} />
    </svg>
  );
}

/** Span (miles across the shorter side) that shows the outermost ring with the given margin. */
export function spanFor(outerMi: number, margin: number, minSpan: number): number {
  return Math.max(minSpan, outerMi * 2 * margin);
}
