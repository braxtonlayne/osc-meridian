/**
 * @graphics/map: continental US base map and facility marker system (asset family 3).
 *
 * The register is a 2008 GIS thick client with one states layer loaded: flat
 * pale land, thin grey state lines, a faint graticule, small labels. Geometry
 * is bundled (geo/conus.topo.json, derived from us-atlas by geo/build.mjs);
 * nothing is fetched. Every marker position is projected from the lat/lon that
 * canon-merge computed; nothing here places a site by hand.
 *
 * Colours come only from design tokens (map.css). Class is coded by SHAPE.
 */
import type { ComponentChildren, JSX } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import { geoAlbers, geoAlbersUsa, geoDistance, geoGraticule, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature, merge, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, MultiLineString, MultiPolygon } from 'geojson';
import canonJson from '@canon';
import type { Canon, ClassId, Facility, FacilityId } from '@core/canon-types';
import topoJson from './geo/conus.topo.json';
import './map.css';

const canon = canonJson as unknown as Canon;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

interface StateProps {
  name: string;
  postal: string;
}
type StateFeature = Feature<MultiPolygon, StateProps>;
type ConusTopology = Topology<{ states: GeometryCollection<StateProps> }>;

interface Geo {
  states: StateFeature[];
  /** Coast and land frontier of the 48 states and DC, as one outline. */
  outline: MultiPolygon;
  /** Interior state lines, each drawn once. */
  borders: MultiLineString;
}

let geoCache: Geo | null = null;
function geo(): Geo {
  if (geoCache) return geoCache;
  const topo = topoJson as unknown as ConusTopology;
  const obj = topo.objects.states;
  geoCache = {
    states: obj.geometries.map((g) => feature(topo, g) as unknown as StateFeature),
    outline: merge(topo, obj.geometries as never),
    borders: mesh(topo, obj as never, (a, b) => a !== b),
  };
  return geoCache;
}

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_MI = 3958.8;

/** Inner margin between the frame and the fitted land, in px. */
function margins(width: number, height: number): { t: number; r: number; b: number; l: number } {
  const m = Math.max(6, Math.round(Math.min(width, height) * 0.02));
  return { t: m + 4, r: m, b: m, l: m };
}

/**
 * The map projection for a frame of the given size: d3.geoAlbersUsa fitted to
 * the 48 contiguous states and DC. Alaska and Hawaii are not drawn (all 47
 * registered sites are in the contiguous states), so the composite's inset
 * corners stay empty and carry the scale bar and north arrow instead.
 *
 * `projectionFor(w, h)([lon, lat])` returns `[x, y]` in the same pixel space
 * UsMap draws in, or null for a point outside the United States.
 */
export function projectionFor(width: number, height: number): GeoProjection {
  const m = margins(width, height);
  return geoAlbersUsa().fitExtent(
    [
      [m.l, m.t],
      [Math.max(m.l + 1, width - m.r), Math.max(m.t + 1, height - m.b)],
    ],
    geo().outline,
  );
}

/**
 * The lower-48 conic of the composite, on its own: identical output for any
 * point in the contiguous states, but unclipped, so it can also place the
 * graticule and frame labels over open water.
 */
function conicFor(p: GeoProjection): GeoProjection {
  return geoAlbers().scale(p.scale()).translate(p.translate());
}

/** What a function child of UsMap receives. */
export interface MapContext {
  width: number;
  height: number;
  projection: GeoProjection;
  /** `[x, y]` for a lon/lat, or null if it falls outside the map. */
  project: (lon: number, lat: number) => [number, number] | null;
}

interface Base {
  projection: GeoProjection;
  conic: GeoProjection;
  land: string;
  borders: string;
  grid: string;
  gridStep: number;
  gridLabels: Array<{ x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }>;
  stateLabels: Array<{ x: number; y: number; text: string }>;
  milesPerPx: number;
}

const baseCache = new Map<string, Base>();

function bisect(f: (v: number) => number, lo: number, hi: number): number | null {
  let a = f(lo);
  const b = f(hi);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a * b > 0) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const v = f(mid);
    if (a * v <= 0) hi = mid;
    else {
      lo = mid;
      a = v;
    }
  }
  return (lo + hi) / 2;
}

function baseFor(width: number, height: number): Base {
  const key = `${width}x${height}`;
  const hit = baseCache.get(key);
  if (hit) return hit;

  const g = geo();
  const projection = projectionFor(width, height);
  const conic = conicFor(projection);
  const path = geoPath(projection).digits(1);
  const conicPath = geoPath(conic).digits(1);

  const gridStep = width >= 700 ? 5 : 10;
  const graticule = geoGraticule()
    .extent([
      [-150, 10],
      [-40, 65],
    ])
    .step([gridStep, gridStep])
    .precision(1);

  // Frame labels: meridians along the top edge, parallels along the right edge.
  const fs = width >= 900 ? 9 : 8;
  const gridLabels: Base['gridLabels'] = [];
  const at = (lon: number, lat: number): [number, number] => conic([lon, lat]) ?? [NaN, NaN];
  const topY = fs + 2;
  for (let lon = -130; lon <= -65; lon += gridStep) {
    const lat = bisect((v) => at(lon, v)[1] - topY, 30, 70);
    if (lat === null) continue;
    const x = at(lon, lat)[0];
    if (x < 28 || x > width - 28) continue;
    gridLabels.push({ x: x + 3, y: topY, text: `${-lon}°W`, anchor: 'start' });
  }
  const rightX = width - 3;
  for (let lat = 25; lat <= 50; lat += gridStep) {
    const lon = bisect((v) => at(v, lat)[0] - rightX, -96, -30);
    if (lon === null) continue;
    const y = at(lon, lat)[1];
    if (y < fs * 2 + 6 || y > height - 6) continue;
    gridLabels.push({ x: rightX, y: y - 3, text: `${lat}°N`, anchor: 'end' });
  }

  // State postal codes at the projected centroid, where the state is big enough to carry one.
  const sfs = width >= 900 ? 9 : 8;
  const stateLabels: Base['stateLabels'] = [];
  if (width >= 520) {
    for (const s of g.states) {
      const [[x0, y0], [x1, y1]] = path.bounds(s);
      if (x1 - x0 < sfs * 2.6 || y1 - y0 < sfs * 1.9) continue;
      const [cx, cy] = path.centroid(s);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      stateLabels.push({ x: Math.round(cx), y: Math.round(cy + sfs * 0.35), text: s.properties.postal });
    }
  }

  // Ground distance of one pixel, measured across 100 px at the middle of the frame.
  const a = projection.invert?.([width / 2 - 50, height / 2]);
  const b = projection.invert?.([width / 2 + 50, height / 2]);
  const milesPerPx = a && b ? (geoDistance(a, b) * EARTH_RADIUS_MI) / 100 : 1;

  const base: Base = {
    projection,
    conic,
    land: path(g.outline) ?? '',
    borders: path(g.borders) ?? '',
    grid: conicPath(graticule()) ?? '',
    gridStep,
    gridLabels,
    stateLabels,
    milesPerPx,
  };
  if (baseCache.size >= 8) baseCache.delete(baseCache.keys().next().value as string);
  baseCache.set(key, base);
  return base;
}

/* ------------------------------------------------------------------ */
/* Marker glyphs                                                       */
/* ------------------------------------------------------------------ */

export type MarkerState = 'normal' | 'hover' | 'selected' | 'dim';

export const CLASS_ORDER: readonly ClassId[] = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'];

/** Half-extent of the drawn shape for a unit size, by class (DELTA is deliberately small). */
const HALF: Record<ClassId, number> = { ALPHA: 0.5, BETA: 0.64, GAMMA: 0.45, DELTA: 0.42 };

const n1 = (v: number): number => Math.round(v * 10) / 10;

export interface MarkerShapeProps {
  cls: ClassId;
  /** Unit size in px; an ALPHA square has this side. */
  size: number;
  state?: MarkerState;
}

/**
 * The class shape as SVG children centred on the origin, for use inside any
 * SVG (the map, a line diagram). ALPHA filled square, BETA filled diamond,
 * GAMMA hollow circle, DELTA small hollow triangle. `selected` adds the 1 px
 * black box; `hover` a 1 px grey box.
 */
export function MarkerShape({ cls, size, state = 'normal' }: MarkerShapeProps): JSX.Element {
  const r = n1(size * HALF[cls]);
  const box = Math.round(size * HALF[cls]) + 3;
  let shape: JSX.Element;
  if (cls === 'ALPHA') {
    shape = <rect class="um-shape" x={-r} y={-r} width={r * 2} height={r * 2} shape-rendering="crispEdges" />;
  } else if (cls === 'BETA') {
    shape = <path class="um-shape" d={`M0,${-r}L${r},0L0,${r}L${-r},0Z`} />;
  } else if (cls === 'GAMMA') {
    shape = <circle class="um-shape" r={r} />;
  } else {
    const hx = n1(r * 1.05);
    shape = <path class="um-shape" d={`M0,${-r}L${hx},${n1(r * 0.8)}L${-hx},${n1(r * 0.8)}Z`} />;
  }
  return (
    <g class={`um-glyph um-glyph--${cls.toLowerCase()}${state === 'dim' ? ' um-glyph--dim' : ''}`}>
      {shape}
      {state === 'selected' || state === 'hover' ? (
        <rect
          class={state === 'selected' ? 'um-selbox' : 'um-hoverbox'}
          x={-box}
          y={-box}
          width={box * 2}
          height={box * 2}
          shape-rendering="crispEdges"
        />
      ) : null}
    </g>
  );
}

export interface MarkerGlyphProps {
  cls: ClassId;
  /** Side of the square SVG box in px. */
  size: number;
  state?: MarkerState;
  /** Accessible name; omitted, the glyph is decorative. */
  title?: string;
}

/** A class marker as a standalone inline SVG (legends, table cells, list rows). */
export function MarkerGlyph({ cls, size, state = 'normal', title }: MarkerGlyphProps): JSX.Element {
  const c = size / 2;
  // Leave room for the selection box inside the viewport.
  const unit = Math.max(4, Math.floor((size - 8) / (HALF[cls] * 2)));
  const snap = Math.floor(c) + 0.5;
  return (
    <svg
      class="um-glyph-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g transform={`translate(${snap},${snap})`}>
        <MarkerShape cls={cls} size={Math.min(unit, size - 8)} state={state} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Label placement                                                     */
/* ------------------------------------------------------------------ */

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const overlaps = (a: Box, b: Box, pad = 0): boolean =>
  a.x0 < b.x1 + pad && a.x1 > b.x0 - pad && a.y0 < b.y1 + pad && a.y1 > b.y0 - pad;

interface Placed {
  box: Box;
  /** True when the label had to move off the first ring and needs a leader line. */
  leader: boolean;
}

/**
 * Greedy placement of one w x h label around a marker at (x, y) with half
 * extent r. Tries E, W, NE, NW, SE, SW, N, S, then the same eight further out.
 * `hard` boxes (labels already placed, frame furniture) are never overlapped;
 * `soft` boxes (other markers) are avoided while any ring still has room.
 * Returns null only if `rings` is exhausted.
 */
function place(
  x: number,
  y: number,
  r: number,
  w: number,
  h: number,
  frame: Box,
  hard: Box[],
  soft: Box[],
  rings: number,
): Placed | null {
  let fallback: Placed | null = null;
  for (let ring = 0; ring < rings; ring++) {
    const g = r + 3 + ring * (h + 2);
    const d = g * 0.6;
    const cands: Array<[number, number]> = [
      [x + g, y - h / 2],
      [x - g - w, y - h / 2],
      [x + d, y - d - h],
      [x - d - w, y - d - h],
      [x + d, y + d],
      [x - d - w, y + d],
      [x - w / 2, y - g - h],
      [x - w / 2, y + g],
    ];
    for (const [cx, cy] of cands) {
      const bx = Math.round(cx);
      const by = Math.round(cy);
      const box: Box = { x0: bx, y0: by, x1: bx + w, y1: by + h };
      if (box.x0 < frame.x0 || box.y0 < frame.y0 || box.x1 > frame.x1 || box.y1 > frame.y1) continue;
      if (hard.some((o) => overlaps(box, o, 1))) continue;
      const placed: Placed = { box, leader: ring > 0 };
      if (!soft.some((o) => overlaps(box, o))) return placed;
      fallback ??= placed;
    }
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Furniture: scale bar, north arrow                                   */
/* ------------------------------------------------------------------ */

const NICE_MILES = [1000, 800, 600, 500, 400, 300, 200, 100, 50, 20, 10];

export interface ScaleBarProps {
  /** Ground miles per pixel at the middle of the map. */
  milesPerPx: number;
  /** Longest acceptable bar, px. */
  maxWidth: number;
  /** Left end of the bar and its baseline. */
  x: number;
  y: number;
  fontSize?: number;
}

/** Scale bar in statute miles, plain line style: a baseline, three ticks, three figures. */
export function ScaleBar({ milesPerPx, maxWidth, x, y, fontSize = 9 }: ScaleBarProps): JSX.Element {
  const miles = NICE_MILES.find((m) => m / milesPerPx <= maxWidth) ?? 10;
  const len = miles / milesPerPx;
  const x0 = Math.round(x) + 0.5;
  const y0 = Math.round(y) + 0.5;
  const mid = Math.round(x + len / 2) + 0.5;
  const end = Math.round(x + len) + 0.5;
  const ty = y0 - 8;
  return (
    <g class="um-scale" aria-label={`Scale bar: ${miles} statute miles`} role="img">
      <path
        class="um-furn-line"
        d={`M${x0},${y0 - 5}V${y0}H${end}V${y0 - 5}M${mid},${y0 - 4}V${y0}`}
        shape-rendering="crispEdges"
      />
      <text class="um-furn-text" x={x0} y={ty} font-size={fontSize} text-anchor="middle">
        0
      </text>
      <text class="um-furn-text" x={mid} y={ty} font-size={fontSize} text-anchor="middle">
        {miles / 2}
      </text>
      <text class="um-furn-text" x={end} y={ty} font-size={fontSize} text-anchor="middle">
        {miles}
      </text>
      <text class="um-furn-text" x={end + String(miles).length * fontSize * 0.3 + 4} y={ty} font-size={fontSize} text-anchor="start">
        mi
      </text>
    </g>
  );
}

export interface NorthArrowProps {
  /** Foot of the arrow. */
  x: number;
  y: number;
  /** Shaft length, px. */
  size?: number;
  /** Clockwise rotation in degrees; 0 points up the frame. */
  rotate?: number;
  fontSize?: number;
}

/** North arrow in plain line style: a shaft, an open two-stroke head, the letter N. */
export function NorthArrow({ x, y, size = 26, rotate = 0, fontSize = 9 }: NorthArrowProps): JSX.Element {
  const fx = Math.round(x) + 0.5;
  const fy = Math.round(y) + 0.5;
  const head = Math.max(4, Math.round(size * 0.22));
  return (
    <g class="um-north" role="img" aria-label="North arrow" transform={`translate(${fx},${fy}) rotate(${n1(rotate)})`}>
      <path
        class="um-furn-line"
        d={`M0,0V${-size}M${-head * 0.7},${-size + head}L0,${-size}L${head * 0.7},${-size + head}M${-head * 0.7},0H${head * 0.7}`}
      />
      <text class="um-furn-text um-furn-text--n" x={0} y={-size - 4} font-size={fontSize} text-anchor="middle">
        N
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

export interface MapLegendProps {
  /** Classes to list; default all four, in class order. */
  classes?: ClassId[];
  /** When false (default) the DELTA row is shown greyed and noted as not plotted. */
  revealDelta?: boolean;
  /** Show the registered count of each class (canon). Default true. */
  counts?: boolean;
  class?: string;
}

/** Legend panel for the marker system. Class names and counts are read from canon. */
export function MapLegend({ classes, revealDelta = false, counts = true, class: cls }: MapLegendProps): JSX.Element {
  const rows = CLASS_ORDER.filter((c) => !classes || classes.includes(c));
  return (
    <div class={`um-legend${cls ? ` ${cls}` : ''}`} role="group" aria-label="Map legend">
      <div class="um-legend__title">Legend</div>
      <table class="um-legend__table">
        <tbody>
          {rows.map((id) => {
            const info = canon.classes.find((k) => k.id === id);
            const withheld = id === 'DELTA' && !revealDelta;
            return (
              <tr key={id} class={withheld ? 'um-legend__row um-legend__row--off' : 'um-legend__row'}>
                <td class="um-legend__glyph">
                  <MarkerGlyph cls={id} size={17} state={withheld ? 'dim' : 'normal'} />
                </td>
                <td class="um-legend__id">{id}</td>
                <td class="um-legend__name">{info?.name ?? ''}</td>
                {counts ? <td class="um-legend__n">{withheld ? 'not plotted' : (info?.count ?? '')}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UsMap                                                               */
/* ------------------------------------------------------------------ */

export interface UsMapProps {
  /** Sites to plot. Default: every facility in canon. Positions come from `lat`/`lon` only. */
  facilities?: Facility[];
  width: number;
  height: number;
  selected?: FacilityId | null;
  onSelect?: (id: FacilityId) => void;
  /** Classes to plot. Default all four (DELTA still needs `revealDelta`). */
  classes?: ClassId[];
  /** Designation labels: none, ALPHA only (default), or every plotted site that has room. */
  showLabels?: 'none' | 'alpha' | 'all';
  /**
   * Base layers. `states` = state lines and postal codes, `grid` = graticule and
   * its frame labels, `furniture` = scale bar and north arrow. All default true.
   */
  layers?: { states?: boolean; grid?: boolean; furniture?: boolean };
  /** DELTA locations are withheld by default: no DELTA marker is drawn unless this is true. */
  revealDelta?: boolean;
  /**
   * SVG content drawn over the base map and under the markers (routes, areas).
   * A function child receives the projection for this frame.
   */
  children?: ComponentChildren | ((ctx: MapContext) => ComponentChildren);
  /** HTML positioned over the map frame (for example an inset MapLegend). */
  overlay?: ComponentChildren;
  /** Accessible name of the map. */
  label?: string;
  class?: string;
}

interface Site {
  f: Facility;
  x: number;
  y: number;
  r: number;
  box: Box;
}

interface SiteLabel {
  id: FacilityId;
  cls: ClassId;
  text: string;
  box: Box;
  leader: boolean;
  from: [number, number];
}

const fmt = (n: number): string => n.toLocaleString('en-US');

function className(id: ClassId): string {
  return canon.classes.find((k) => k.id === id)?.name ?? '';
}

function describe(f: Facility): string {
  const parts: string[] = [f.id];
  if (f.codename) parts.push(f.codename);
  parts.push(`class ${f.class}, ${className(f.class)}`);
  parts.push(`posted staff ${fmt(f.staff)}`);
  parts.push(`capacity ${fmt(f.capacity)} berths`);
  return parts.join(', ');
}

export function UsMap(props: UsMapProps): JSX.Element {
  const {
    width,
    height,
    selected = null,
    onSelect,
    classes,
    showLabels = 'alpha',
    layers,
    revealDelta = false,
    children,
    overlay,
    label = 'Facility map, contiguous United States',
  } = props;
  const facilities = props.facilities ?? canon.facilities;
  const showStates = layers?.states !== false;
  const showGrid = layers?.grid !== false;
  const showFurniture = layers?.furniture !== false;

  const base = baseFor(width, height);
  const unit = width >= 1000 ? 9 : width >= 700 ? 8 : 7;
  const fs = width >= 900 ? 10 : 9;
  const classKey = classes ? classes.join(',') : '';

  /* ---- sites: filter, project, order ---- */
  const sites = useMemo<Site[]>(() => {
    const out: Site[] = [];
    for (const cls of CLASS_ORDER) {
      if (classes && !classes.includes(cls)) continue;
      if (cls === 'DELTA' && !revealDelta) continue;
      for (const f of facilities) {
        if (f.class !== cls || typeof f.lat !== 'number' || typeof f.lon !== 'number') continue;
        const p = base.projection([f.lon, f.lat]);
        if (!p) continue;
        const x = Math.floor(p[0]) + 0.5;
        const y = Math.floor(p[1]) + 0.5;
        const r = Math.ceil(unit * HALF[cls]) + 1;
        out.push({ f, x, y, r, box: { x0: x - r, y0: y - r, x1: x + r, y1: y + r } });
      }
    }
    return out;
  },[facilities, base, unit, classKey, revealDelta]);

  /* ---- furniture geometry (also an obstacle for labels) ---- */
  const furn = useMemo(() => {
    const m = margins(width, height);
    const small = width < 700;
    const arrow = small ? 18 : 26;
    const ax = m.l + (small ? 12 : 18);
    const ay = height - m.b - (small ? 4 : 8);
    // True north at the foot of the arrow: meridians converge in a conic.
    const ll = base.conic.invert?.([ax, ay]);
    let rot = 0;
    if (ll) {
      const a = base.conic(ll);
      const b = base.conic([ll[0], ll[1] + 0.5]);
      if (a && b) rot = (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
    }
    const sx = ax + (small ? 22 : 34);
    const maxBar = Math.min(width * 0.2, 240);
    const zone: Box = { x0: 0, y0: ay - arrow - 18, x1: sx + maxBar + 34, y1: height };
    return { ax, ay, arrow, rot, sx, sy: ay, maxBar, zone, ffs: small ? 8 : 9 };
  }, [base, width, height]);

  /* ---- labels: selected plate first, then ALPHA, then the rest ---- */
  const { labels, plate, stateLabels } = useMemo(() => {
    const frame: Box = { x0: 2, y0: 2, x1: width - 2, y1: height - 2 };
    const hard: Box[] = showFurniture ? [furn.zone] : [];
    const soft: Box[] = sites.map((s) => s.box);
    const cw = fs * 0.6; // IBM Plex Mono advance
    const out: SiteLabel[] = [];
    let selPlate: (SiteLabel & { codename: string | null }) | null = null;

    const sel = sites.find((s) => s.f.id === selected);
    if (sel) {
      const text = sel.f.codename ? `${sel.f.id}  ${sel.f.codename}` : sel.f.id;
      const w = Math.ceil(text.length * cw) + 9;
      const h = fs + 7;
      const others = soft.filter((b) => b !== sel.box);
      const p = place(sel.x, sel.y, sel.r + 4, w, h, frame, hard, others, 8);
      if (p) {
        hard.push(p.box);
        selPlate = {
          id: sel.f.id,
          cls: sel.f.class,
          text,
          codename: sel.f.codename,
          box: p.box,
          leader: true,
          from: [sel.x, sel.y],
        };
      }
    }

    if (showLabels !== 'none') {
      for (const s of sites) {
        if (s.f.id === selected) continue;
        const isAlpha = s.f.class === 'ALPHA';
        if (!isAlpha && showLabels !== 'all') continue;
        const w = Math.ceil(s.f.id.length * cw) + 2;
        const h = fs + 2;
        const others = soft.filter((b) => b !== s.box);
        // ALPHA labels always land somewhere clear of every other label; the rest
        // are dropped if the first ring has no clear position.
        const p = isAlpha
          ? place(s.x, s.y, s.r, w, h, frame, hard, others, 12)
          : place(s.x, s.y, s.r, w, h, frame, [...hard, ...others], [], 1);
        if (!p) continue;
        hard.push(p.box);
        out.push({ id: s.f.id, cls: s.f.class, text: s.f.id, box: p.box, leader: p.leader, from: [s.x, s.y] });
      }
    }

    // State codes give way to everything else.
    const sfs = width >= 900 ? 9 : 8;
    const taken = [...hard, ...soft];
    const st = showStates
      ? base.stateLabels.filter((l) => {
          const b: Box = { x0: l.x - sfs * 0.8, y0: l.y - sfs, x1: l.x + sfs * 0.8, y1: l.y + 2 };
          return !taken.some((o) => overlaps(b, o, 1));
        })
      : [];
    return { labels: out, plate: selPlate, stateLabels: st };
  }, [sites, selected, showLabels, showStates, showFurniture, furn, base, width, height, fs]);

  /* ---- interaction ---- */
  const [hoverId, setHoverId] = useState<FacilityId | null>(null);
  const [focusId, setFocusId] = useState<FacilityId | null>(null);
  const [roving, setRoving] = useState<FacilityId | null>(null);
  const nodes = useRef(new Map<FacilityId, SVGGElement>());

  const ids = sites.map((s) => s.f.id);
  const tabStop =
    (roving && ids.includes(roving) && roving) || (selected && ids.includes(selected) && selected) || ids[0] || null;

  const move = (from: FacilityId, to: number): void => {
    if (!ids.length) return;
    const i = ids.indexOf(from);
    const next = ids[((to === Infinity ? ids.length - 1 : to === -Infinity ? 0 : i + to) + ids.length) % ids.length];
    if (!next) return;
    setRoving(next);
    nodes.current.get(next)?.focus();
  };

  const onKey = (e: KeyboardEvent, id: FacilityId): void => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        move(id, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        move(id, -1);
        break;
      case 'Home':
        move(id, -Infinity);
        break;
      case 'End':
        move(id, Infinity);
        break;
      case 'Enter':
      case ' ':
        onSelect?.(id);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const tipId = focusId ?? hoverId;
  const tipSite = tipId ? sites.find((s) => s.f.id === tipId) : undefined;

  const ctx: MapContext = {
    width,
    height,
    projection: base.projection,
    project: (lon, lat) => base.projection([lon, lat]),
  };
  const overlayChildren =
    typeof children === 'function' ? (children as (c: MapContext) => ComponentChildren)(ctx) : children;

  const gfs = width >= 900 ? 9 : 8;

  return (
    <div class={`um${props.class ? ` ${props.class}` : ''}`} style={{ width: `${width}px`, height: `${height}px` }}>
      <svg class="um-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}>
        <g class="um-base" aria-hidden="true">
          <rect class="um-water" x={0} y={0} width={width} height={height} />
          <path class="um-land" d={base.land} />
          {showGrid ? <path class="um-grid" d={base.grid} /> : null}
          {showStates ? <path class="um-borders" d={base.borders} /> : null}
          <path class="um-coast" d={base.land} />
          {showGrid
            ? base.gridLabels.map((l) => (
                <text key={l.text} class="um-grid-label" x={n1(l.x)} y={n1(l.y)} font-size={gfs} text-anchor={l.anchor}>
                  {l.text}
                </text>
              ))
            : null}
          {stateLabels.map((l) => (
            <text key={l.text} class="um-state-label" x={l.x} y={l.y} font-size={gfs} text-anchor="middle">
              {l.text}
            </text>
          ))}
        </g>

        {showFurniture ? (
          <g class="um-furniture">
            <NorthArrow x={furn.ax} y={furn.ay} size={furn.arrow} rotate={furn.rot} fontSize={furn.ffs} />
            <ScaleBar milesPerPx={base.milesPerPx} maxWidth={furn.maxBar} x={furn.sx} y={furn.sy} fontSize={furn.ffs} />
          </g>
        ) : null}

        {overlayChildren ? <g class="um-overlay">{overlayChildren}</g> : null}

        <g class="um-labels" aria-hidden="true">
          {labels.map((l) => (
            <g key={l.id} class={`um-label um-label--${l.cls.toLowerCase()}`}>
              {l.leader ? <Leader from={l.from} box={l.box} cls="um-leader" /> : null}
              <text x={l.box.x0 + 1} y={l.box.y1 - 3} font-size={fs}>
                {l.text}
              </text>
            </g>
          ))}
        </g>

        {/* Drawn back to front so the higher class sits on top where sites are close. */}
        <g class="um-markers">
          {[...sites].reverse().map((s) => {
            const id = s.f.id;
            const state: MarkerState =
              id === selected ? 'selected' : id === hoverId ? 'hover' : s.f.class === 'DELTA' ? 'dim' : 'normal';
            return (
              <g
                key={id}
                ref={(el: SVGGElement | null) => {
                  if (el) nodes.current.set(id, el);
                  else nodes.current.delete(id);
                }}
                class={`um-marker${id === selected ? ' um-marker--selected' : ''}`}
                transform={`translate(${s.x},${s.y})`}
                role="button"
                tabindex={id === tabStop ? 0 : -1}
                aria-label={describe(s.f)}
                aria-pressed={id === selected}
                data-id={id}
                onClick={() => {
                  setRoving(id);
                  onSelect?.(id);
                }}
                onKeyDown={(e: KeyboardEvent) => onKey(e, id)}
                onMouseEnter={() => setHoverId(id)}
                onMouseLeave={() => setHoverId((h) => (h === id ? null : h))}
                onFocus={() => {
                  setFocusId(id);
                  setRoving(id);
                }}
                onBlur={() => setFocusId((h) => (h === id ? null : h))}
              >
                <rect class="um-hit" x={-s.r - 3} y={-s.r - 3} width={(s.r + 3) * 2} height={(s.r + 3) * 2} />
                <MarkerShape cls={s.f.class} size={unit} state={state} />
                <rect
                  class="um-focusbox"
                  x={-s.r - 3}
                  y={-s.r - 3}
                  width={(s.r + 3) * 2}
                  height={(s.r + 3) * 2}
                  shape-rendering="crispEdges"
                />
              </g>
            );
          })}
        </g>

        {plate ? (
          <g class="um-plate" aria-hidden="true">
            <Leader from={plate.from} box={plate.box} cls="um-plate__leader" />
            <rect
              class="um-plate__box"
              x={plate.box.x0 + 0.5}
              y={plate.box.y0 + 0.5}
              width={plate.box.x1 - plate.box.x0 - 1}
              height={plate.box.y1 - plate.box.y0 - 1}
              shape-rendering="crispEdges"
            />
            <text x={plate.box.x0 + 5} y={plate.box.y1 - 5} font-size={fs}>
              <tspan class="um-plate__id">{plate.id}</tspan>
              {plate.codename ? <tspan class="um-plate__name">{`  ${plate.codename}`}</tspan> : null}
            </text>
          </g>
        ) : null}

        <rect class="um-neatline" x={0.5} y={0.5} width={width - 1} height={height - 1} shape-rendering="crispEdges" />
      </svg>

      {tipSite ? <Tooltip site={tipSite} width={width} height={height} instant={focusId === tipSite.f.id} /> : null}
      {overlay ? <div class="um-html">{overlay}</div> : null}
    </div>
  );
}

/** 1 px line from a marker to the nearest point of its label box. */
function Leader({ from, box, cls }: { from: [number, number]; box: Box; cls: string }): JSX.Element | null {
  const tx = Math.max(box.x0, Math.min(box.x1, from[0]));
  const ty = Math.max(box.y0, Math.min(box.y1, from[1]));
  if (Math.hypot(tx - from[0], ty - from[1]) < 2) return null;
  return <line class={cls} x1={from[0]} y1={from[1]} x2={n1(tx)} y2={n1(ty)} />;
}

function Tooltip({
  site,
  width,
  height,
  instant,
}: {
  site: Site;
  width: number;
  height: number;
  instant: boolean;
}): JSX.Element {
  const f = site.f;
  const TIP_W = 236;
  const TIP_H = 66;
  const right = site.x + site.r + 10 + TIP_W <= width;
  const below = site.y + site.r + 8 + TIP_H <= height;
  const style = {
    left: right ? `${Math.round(site.x + site.r + 10)}px` : undefined,
    right: right ? undefined : `${Math.round(width - site.x + site.r + 10)}px`,
    top: below ? `${Math.round(site.y + site.r + 8)}px` : undefined,
    bottom: below ? undefined : `${Math.round(height - site.y + site.r + 8)}px`,
  };
  return (
    <div class={`um-tip${instant ? ' um-tip--instant' : ''}`} style={style} role="tooltip">
      <div class="um-tip__head">
        <span class="um-tip__id">{f.id}</span>
        {f.codename ? <span class="um-tip__name">{f.codename}</span> : null}
      </div>
      <dl class="um-tip__rows">
        <dt>Class</dt>
        <dd>
          {f.class}: {className(f.class)}
        </dd>
        <dt>Staff</dt>
        <dd>
          <span class="um-num">{fmt(f.staff)}</span> posted
        </dd>
        <dt>Capacity</dt>
        <dd>
          <span class="um-num">{fmt(f.capacity)}</span> berths
        </dd>
      </dl>
    </div>
  );
}

export type { ClassId, Facility, FacilityId };
