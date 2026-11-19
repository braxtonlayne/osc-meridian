/*
 * @graphics/tunnelmap: projection and path geometry.
 * Base: d3.geoAlbersUsa fitted to the conterminous states from the bundled us-atlas
 * TopoJSON (no network). Link paths follow the great circle between the two computed
 * facility positions, with a small deterministic sideways bend so links that leave a
 * site in similar directions do not lie on top of each other.
 */
import {
  geoAlbers,
  geoAlbersUsa,
  geoGraticule,
  geoInterpolate,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
} from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import statesTopo from 'us-atlas/states-10m.json';
import { positionOf, tunnelLinks, type LonLat, type TunnelLink } from './links';

type StatesTopology = Topology<{ states: GeometryCollection; nation: GeometryCollection }>;
const topo = statesTopo as unknown as StatesTopology;

// Alaska, Hawaii and the territories carry no site and are left off the sheet.
const OFF_SHEET = new Set(['02', '15', '60', '66', '69', '72', '78']);
const conusGeoms = topo.objects.states.geometries.filter((g) => !OFF_SHEET.has(String(g.id)));

const conusStates = feature(topo, {
  type: 'GeometryCollection',
  geometries: conusGeoms,
} as GeometryCollection) as FeatureCollection;

const conusOutline: MultiPolygon = merge(topo, conusGeoms as Parameters<typeof merge>[1]);

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface LinkGeometry {
  link: TunnelLink;
  d: string;
  /** Point on the drawn curve at half its parameter. */
  mid: Pt;
  /** Unit normal of the chord (screen space). */
  normal: Pt;
  a: Pt;
  b: Pt;
  /** The drawn polyline, for label avoidance. */
  pts: Pt[];
}

export interface BaseGeometry {
  projection: GeoProjection;
  statesD: string;
  outlineD: string;
  graticuleD: string;
  /** Meridian and parallel positions along the frame for the edge ticks. */
  ticks: { side: 'top' | 'bottom' | 'left' | 'right'; pos: number; label: string }[];
}

/** The projection used for a sheet whose map area is `box`. */
export function tunnelProjection(box: Box): GeoProjection {
  return geoAlbersUsa().fitExtent(
    [
      [box.x0, box.y0],
      [box.x1, box.y1],
    ],
    conusStates,
  );
}

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

export function buildBase(mapBox: Box, frame: Box): BaseGeometry {
  const projection = tunnelProjection(mapBox);
  const path = geoPath(projection);
  const statesD = path(conusStates as GeoPermissibleObjects) ?? '';
  const outlineD = path(conusOutline) ?? '';

  // geoAlbersUsa is a composite; its lower-48 member is this conic at the same scale and
  // translate. The graticule is drawn through the plain conic so it runs to the frame.
  const conic = geoAlbers()
    .rotate([96, 0])
    .center([-0.6, 38.7])
    .parallels([29.5, 45.5])
    .scale(projection.scale())
    .translate(projection.translate())
    .clipExtent([
      [frame.x0, frame.y0],
      [frame.x1, frame.y1],
    ]);
  const grat = geoGraticule()
    .extent([
      [-140, 15],
      [-50, 60],
    ])
    .step([5, 5])
    .precision(0.5);
  const graticuleD = geoPath(conic)(grat()) ?? '';

  // Edge ticks: where each 5-degree meridian meets the top and bottom frame lines and each
  // parallel meets the left and right ones. Found by bisection along the frame edge.
  const ticks: BaseGeometry['ticks'] = [];
  const inv = conic.invert?.bind(conic);
  if (inv) {
    const solve = (f: (t: number) => number, lo: number, hi: number, target: number): number | null => {
      let a = lo;
      let b = hi;
      let fa = f(a) - target;
      const fb = f(b) - target;
      if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return null;
      for (let i = 0; i < 40; i++) {
        const m = (a + b) / 2;
        const fm = f(m) - target;
        if (fa * fm <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      return (a + b) / 2;
    };
    const lonAt = (x: number, y: number): number => inv([x, y])?.[0] ?? NaN;
    const latAt = (x: number, y: number): number => inv([x, y])?.[1] ?? NaN;
    for (let lon = -135; lon <= -55; lon += 5) {
      const label = `${Math.abs(lon)}W`;
      const xt = solve((x) => lonAt(x, frame.y0), frame.x0, frame.x1, lon);
      if (xt !== null) ticks.push({ side: 'top', pos: xt, label });
      const xb = solve((x) => lonAt(x, frame.y1), frame.x0, frame.x1, lon);
      if (xb !== null) ticks.push({ side: 'bottom', pos: xb, label });
    }
    for (let lat = 20; lat <= 55; lat += 5) {
      const label = `${lat}N`;
      const yl = solve((y) => latAt(frame.x0, y), frame.y0, frame.y1, lat);
      if (yl !== null) ticks.push({ side: 'left', pos: yl, label });
      const yr = solve((y) => latAt(frame.x1, y), frame.y0, frame.y1, lat);
      if (yr !== null) ticks.push({ side: 'right', pos: yr, label });
    }
  }

  return { projection, statesD, outlineD, graticuleD, ticks };
}

export function projectFacility(projection: GeoProjection, id: string): Pt | null {
  const ll = positionOf(id);
  if (!ll) return null;
  const p = projection(ll);
  return p ? { x: p[0], y: p[1] } : null;
}

/** FNV-1a, 32-bit. Used only to make the bend of a link a fixed function of its id. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Signed bend of a link as a fraction of its chord length.
 * Rail bows a fixed 5.5 per cent; tram 3.5 to 7 per cent. The side is taken from the
 * link id so the drawing is identical on every render and in every layer.
 */
export function bendOf(link: TunnelLink): number {
  const h = hash(link.id);
  const side = h & 1 ? 1 : -1;
  if (link.kind === 'RAIL') return side * 0.055;
  return side * (0.035 + ((h >>> 8) % 36) / 1000);
}

const SAMPLES = 28;

export function linkGeometry(projection: GeoProjection, link: TunnelLink, bend: number = bendOf(link)): LinkGeometry | null {
  const la = positionOf(link.a);
  const lb = positionOf(link.b);
  if (!la || !lb) return null;
  const interp = geoInterpolate(la, lb);
  const raw: Pt[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = projection(interp(i / SAMPLES) as LonLat);
    if (!p) return null;
    raw.push({ x: p[0], y: p[1] });
  }
  const a = raw[0];
  const b = raw[SAMPLES];
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const chord = Math.hypot(dx, dy) || 1;
  const normal: Pt = { x: -dy / chord, y: dx / chord };
  const amp = bend * chord;
  let d = '';
  let mid: Pt = a;
  const pts: Pt[] = [];
  raw.forEach((p, i) => {
    const k = Math.sin((Math.PI * i) / SAMPLES) * amp;
    const x = p.x + normal.x * k;
    const y = p.y + normal.y * k;
    d += `${i === 0 ? 'M' : 'L'}${r1(x)},${r1(y)}`;
    pts.push({ x, y });
    if (i === SAMPLES / 2) mid = { x, y };
  });
  return { link, d, mid, normal, a, b, pts };
}

/** Links leaving a shared site within this angle of each other are bowed apart. */
const SPREAD_DEG = 25;

/**
 * Bend of every link for a given projection. Starts from `bendOf`; then, for each pair of
 * links that leave a shared site in nearly the same direction, the side of both is set so
 * they bow away from each other. Pairs are applied widest first, so the tightest pair has
 * the last word. Deterministic.
 */
export function resolveBends(projection: GeoProjection): Map<string, number> {
  const bends = new Map<string, number>();
  const ends = new Map<string, { a: Pt; b: Pt }>();
  for (const l of tunnelLinks) {
    bends.set(l.id, bendOf(l));
    const a = projectFacility(projection, l.a);
    const b = projectFacility(projection, l.b);
    if (a && b) ends.set(l.id, { a, b });
  }
  const unit = (from: Pt, to: Pt): Pt => {
    const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
  };
  const pairs: { i: TunnelLink; j: TunnelLink; di: Pt; dj: Pt; angle: number }[] = [];
  for (let p = 0; p < tunnelLinks.length; p++) {
    for (let q = p + 1; q < tunnelLinks.length; q++) {
      const i = tunnelLinks[p];
      const j = tunnelLinks[q];
      if (!i || !j) continue;
      const ei = ends.get(i.id);
      const ej = ends.get(j.id);
      if (!ei || !ej) continue;
      const shared = i.a === j.a || i.a === j.b ? i.a : i.b === j.a || i.b === j.b ? i.b : null;
      if (!shared) continue;
      const di = shared === i.a ? unit(ei.a, ei.b) : unit(ei.b, ei.a);
      const dj = shared === j.a ? unit(ej.a, ej.b) : unit(ej.b, ej.a);
      const angle = (Math.acos(Math.max(-1, Math.min(1, di.x * dj.x + di.y * dj.y))) * 180) / Math.PI;
      if (angle < SPREAD_DEG) pairs.push({ i, j, di, dj, angle });
    }
  }
  pairs.sort((p, q) => q.angle - p.angle);
  const away = (l: TunnelLink, other: Pt): void => {
    const e = ends.get(l.id);
    if (!e) return;
    const c = unit(e.a, e.b);
    const side = -c.y * other.x + c.x * other.y >= 0 ? -1 : 1;
    bends.set(l.id, side * Math.abs(bends.get(l.id) ?? 0));
  };
  for (const { i, j, di, dj } of pairs) {
    away(i, dj);
    away(j, di);
  }
  return bends;
}

export function allLinkGeometry(projection: GeoProjection): LinkGeometry[] {
  const bends = resolveBends(projection);
  const out: LinkGeometry[] = [];
  for (const l of tunnelLinks) {
    const g = linkGeometry(projection, l, bends.get(l.id));
    if (g) out.push(g);
  }
  return out;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
  rect: Rect;
}

/**
 * Greedy label placement. Each label tries eight positions round its marker in a fixed
 * order and takes the first that clears every marker, every label already placed and
 * every reserved rectangle (legend, title block). Deterministic for a given input order.
 */
export function placeLabels(
  items: { id: string; at: Pt; text: string; priority: number }[],
  charW: number,
  lineH: number,
  reserved: Rect[],
  avoid: Pt[],
): PlacedLabel[] {
  const gap = 7;
  const markers: Rect[] = items.map((it) => ({ x: it.at.x - 5, y: it.at.y - 5, w: 10, h: 10 }));
  const dots: Rect[] = avoid.map((p) => ({ x: p.x - 2, y: p.y - 2, w: 4, h: 4 }));
  const placed: PlacedLabel[] = [];
  const order = items.map((it, i) => ({ it, i })).sort((p, q) => p.it.priority - q.it.priority || p.i - q.i);
  for (const { it } of order) {
    const w = it.text.length * charW;
    const cands: { x: number; y: number; anchor: PlacedLabel['anchor'] }[] = [
      { x: it.at.x + gap, y: it.at.y + lineH * 0.35, anchor: 'start' },
      { x: it.at.x - gap, y: it.at.y + lineH * 0.35, anchor: 'end' },
      { x: it.at.x + gap - 1, y: it.at.y - gap + 2, anchor: 'start' },
      { x: it.at.x - gap + 1, y: it.at.y - gap + 2, anchor: 'end' },
      { x: it.at.x + gap - 1, y: it.at.y + gap + lineH * 0.6, anchor: 'start' },
      { x: it.at.x - gap + 1, y: it.at.y + gap + lineH * 0.6, anchor: 'end' },
      { x: it.at.x, y: it.at.y - gap - 1, anchor: 'middle' },
      { x: it.at.x, y: it.at.y + gap + lineH * 0.75, anchor: 'middle' },
    ];
    let best: PlacedLabel | null = null;
    let bestCost = Infinity;
    for (const [ci, c] of cands.entries()) {
      const x = c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - w : c.x - w / 2;
      const rect: Rect = { x: x - 1, y: c.y - lineH * 0.8, w: w + 2, h: lineH };
      let cost = ci * 0.01;
      for (const m of markers) if (overlaps(rect, m)) cost += 4;
      for (const p of placed) if (overlaps(rect, p.rect)) cost += 6;
      for (const r of reserved) if (overlaps(rect, r)) cost += 10;
      for (const dt of dots) if (overlaps(rect, dt)) cost += 0.35;
      if (cost < bestCost) {
        bestCost = cost;
        best = { id: it.id, x: c.x, y: c.y, anchor: c.anchor, rect };
      }
    }
    if (best) placed.push(best);
  }
  return placed;
}
