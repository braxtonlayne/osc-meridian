/**
 * @graphics/schematic: deterministic layout for the rail and tram line diagram.
 *
 * Coordinates are hand-placed on a 1400 x 800 logical board (5-unit grid) and
 * never computed from geography, so the diagram is identical on every render.
 * Mileage, hours, link membership and segment status come from canon; nothing
 * numeric is typed here except positions.
 */
import { railSegments as canonRail, tramNetworks as canonTram } from '@canon';
import type { FacilityId, NetworkId, RailSegment, TramLink, TramNetwork } from '../../core/canon-types';
import { hasRx } from '../../core/rx';

const RAIL = canonRail as unknown as RailSegment[];
const TRAM = canonTram as unknown as TramNetwork[];

export type Pt = readonly [number, number];
export type LabelSide = 'N' | 'S' | 'E' | 'W';
export type NodeClass = 'ALPHA' | 'BETA' | 'GAMMA';

/* ------------------------------------------------------------------ */
/* Link keys                                                           */
/* ------------------------------------------------------------------ */

/** Rail link key: the two-digit segment number, "01".."06". */
export function railKey(no: string | number): string {
  return String(no).trim().padStart(2, '0');
}

/** Tram link key: "FROM>TO" in canon order, e.g. "ALPHA-01>BETA-02". */
export function tramKey(from: string, to: string): string {
  return `${from}>${to}`;
}

/** Key for a canon rail segment or tram link. */
export function linkKey(link: Pick<RailSegment, 'no'> | Pick<TramLink, 'from' | 'to'>): string {
  return 'no' in link ? railKey(link.no) : tramKey(link.from, link.to);
}

/** Key for one block section of a link (1-based, counted from the link's A end). */
export function blockKey(link: string, block: number): string {
  return `${link}#${block}`;
}

export function isRailKey(key: string): boolean {
  return /^\d{1,2}$/.test(key.trim());
}

/* ------------------------------------------------------------------ */
/* Node positions                                                      */
/* ------------------------------------------------------------------ */

export interface SchematicNode {
  id: FacilityId;
  cls: NodeClass;
  x: number;
  y: number;
  /** Side the label sits on (BETA and GAMMA; ALPHA is labelled inside its box). */
  label: LabelSide;
  /** Place label as written in the tram table, e.g. "(Maine)". Empty for ALPHA. */
  place: string;
  /** Networks whose links touch this node. */
  networks: NetworkId[];
  /** ALPHA only: networks this site is the hub of. */
  hubOf: NetworkId[];
}

const NODE_XY: Record<string, readonly [number, number, LabelSide]> = {
  'ALPHA-01': [1130, 300, 'N'],
  'ALPHA-02': [480, 300, 'N'],
  'ALPHA-03': [900, 470, 'N'],
  'ALPHA-04': [200, 300, 'N'],
  'ALPHA-05': [900, 640, 'N'],
  // Eastern
  'BETA-01': [1320, 300, 'S'],
  'BETA-02': [1150, 170, 'W'],
  'BETA-10': [960, 170, 'S'],
  'GAMMA-03': [1270, 170, 'S'],
  'GAMMA-04': [1150, 80, 'E'],
  'GAMMA-07': [960, 80, 'E'],
  // Mountain/Western
  'BETA-04': [620, 160, 'N'],
  'BETA-11': [400, 160, 'N'],
  'BETA-06': [360, 440, 'S'],
  'BETA-07': [200, 160, 'N'],
  'BETA-08': [200, 440, 'S'],
  'GAMMA-13': [80, 160, 'N'],
  'GAMMA-11': [80, 440, 'S'],
  'GAMMA-14': [300, 160, 'N'],
  'GAMMA-12': [80, 300, 'S'],
  // Central
  'BETA-09': [760, 470, 'S'],
  'GAMMA-10': [640, 470, 'N'],
  'GAMMA-17': [760, 390, 'E'],
  // Southern
  'BETA-05': [640, 560, 'W'],
  'BETA-03': [1270, 710, 'S'],
  'BETA-12': [1040, 760, 'N'],
  'GAMMA-05': [1270, 620, 'E'],
  'GAMMA-06': [1360, 710, 'S'],
  'GAMMA-16': [1160, 760, 'N'],
  'GAMMA-08': [770, 710, 'S'],
  'GAMMA-09': [770, 760, 'S'],
};

/* ------------------------------------------------------------------ */
/* Link routes (orthogonal and 45 degree runs only)                    */
/* ------------------------------------------------------------------ */

interface RouteSpec {
  pts: Pt[];
  /** Fraction along the route where the tag (number, mileage, status) sits. */
  tagAt?: number;
  /** Tag goes above / right instead of below / left; train labels take the other side. */
  flip?: boolean;
}

const ROUTES: Record<string, RouteSpec> = {
  // Rail, drawn A -> B in canon order.
  '01': { pts: [[1105, 300], [1105, 430], [1065, 470], [900, 470]], tagAt: 0.63 },
  '02': { pts: [[1130, 300], [480, 300]] },
  '03': { pts: [[480, 300], [200, 300]] },
  '04': { pts: [[480, 300], [480, 600], [520, 640], [900, 640]], tagAt: 0.66 },
  '05': { pts: [[900, 470], [900, 640]], tagAt: 0.42, flip: true },
  '06': { pts: [[1155, 300], [1155, 600], [1115, 640], [900, 640]], tagAt: 0.31, flip: true },
  // Eastern
  'ALPHA-01>BETA-01': { pts: [[1130, 300], [1320, 300]], tagAt: 0.62 },
  'ALPHA-01>BETA-02': { pts: [[1150, 300], [1150, 170]], tagAt: 0.6, flip: true },
  'ALPHA-01>BETA-10': { pts: [[1110, 300], [1110, 210], [1070, 170], [960, 170]], tagAt: 0.72 },
  'BETA-02>GAMMA-03': { pts: [[1150, 170], [1270, 170]], flip: true },
  'BETA-02>GAMMA-04': { pts: [[1150, 170], [1150, 80]] },
  'BETA-10>GAMMA-07': { pts: [[960, 170], [960, 80]] },
  // Southern
  'ALPHA-05>BETA-03': { pts: [[935, 640], [935, 695], [950, 710], [1270, 710]], tagAt: 0.6, flip: true },
  'ALPHA-05>BETA-12': { pts: [[915, 640], [915, 745], [930, 760], [1040, 760]], tagAt: 0.78, flip: true },
  'ALPHA-05>BETA-05': { pts: [[875, 640], [875, 585], [850, 560], [640, 560]], tagAt: 0.62 },
  'BETA-03>GAMMA-05': { pts: [[1270, 710], [1270, 620]] },
  'BETA-03>GAMMA-06': { pts: [[1270, 710], [1360, 710]], flip: true },
  'BETA-12>GAMMA-16': { pts: [[1040, 760], [1160, 760]] },
  'ALPHA-05>GAMMA-08': { pts: [[865, 640], [865, 695], [850, 710], [770, 710]], tagAt: 0.8, flip: true },
  'ALPHA-05>GAMMA-09': { pts: [[885, 640], [885, 745], [870, 760], [770, 760]], tagAt: 0.82 },
  // Mountain/Western
  'ALPHA-02>BETA-04': { pts: [[505, 300], [505, 215], [560, 160], [620, 160]], tagAt: 0.3, flip: true },
  'ALPHA-02>BETA-11': { pts: [[455, 300], [455, 215], [400, 160]], tagAt: 0.28 },
  'ALPHA-02>BETA-06': { pts: [[455, 300], [455, 385], [400, 440], [360, 440]], tagAt: 0.7 },
  'ALPHA-04>BETA-07': { pts: [[200, 300], [200, 160]] },
  'ALPHA-04>BETA-08': { pts: [[200, 300], [200, 440]] },
  'BETA-07>GAMMA-13': { pts: [[200, 160], [80, 160]] },
  'BETA-08>GAMMA-11': { pts: [[200, 440], [80, 440]], flip: true },
  'BETA-11>GAMMA-14': { pts: [[400, 160], [300, 160]] },
  'ALPHA-04>GAMMA-12': { pts: [[200, 300], [80, 300]], flip: true },
  // Central
  'ALPHA-03>BETA-09': { pts: [[900, 470], [760, 470]], tagAt: 0.45, flip: true },
  'BETA-09>GAMMA-10': { pts: [[760, 470], [640, 470]] },
  'BETA-09>GAMMA-17': { pts: [[760, 470], [760, 390]] },
  'BETA-05>GAMMA-10': { pts: [[640, 560], [640, 470]] },
};

export interface SchematicLink {
  key: string;
  kind: 'RAIL' | 'TRAM';
  a: FacilityId;
  b: FacilityId;
  /** Rail: segment number. Tram: null. */
  segNo: string | null;
  /** Tram: owning network. Rail: null. */
  network: NetworkId | null;
  miles: number;
  hours: number;
  /** Segment status is NOT IN REVENUE SERVICE (canon). */
  notInService: boolean;
  /** Number of block sections drawn on this link. */
  blocks: number;
  pts: Pt[];
  tagAt: number;
  flip: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Block count per link: a drafting convention of this diagram, not a canon figure. */
function blockCount(kind: 'RAIL' | 'TRAM', miles: number): number {
  return kind === 'RAIL' ? clamp(Math.round(miles / 200), 2, 8) : clamp(Math.round(miles / 300), 1, 3);
}

function xyOf(id: string): Pt {
  const n = NODE_XY[id];
  return n ? [n[0], n[1]] : [700, 400];
}

function buildLinks(): SchematicLink[] {
  const out: SchematicLink[] = [];
  for (const s of RAIL) {
    const key = railKey(s.no);
    const r = ROUTES[key];
    out.push({
      key,
      kind: 'RAIL',
      a: s.a,
      b: s.b,
      segNo: key,
      network: null,
      miles: s.miles,
      hours: s.hours,
      notInService: s.status !== 'IN REVENUE SERVICE',
      blocks: blockCount('RAIL', s.miles),
      pts: r ? r.pts : [xyOf(s.a), xyOf(s.b)],
      tagAt: r?.tagAt ?? 0.5,
      flip: r?.flip ?? false,
    });
  }
  for (const net of TRAM) {
    for (const l of net.links) {
      const key = tramKey(l.from, l.to);
      const r = ROUTES[key];
      out.push({
        key,
        kind: 'TRAM',
        a: l.from,
        b: l.to,
        segNo: null,
        network: net.id,
        miles: l.miles,
        hours: l.hours,
        notInService: false,
        blocks: blockCount('TRAM', l.miles),
        pts: r ? r.pts : [xyOf(l.from), xyOf(l.to)],
        tagAt: r?.tagAt ?? 0.5,
        flip: r?.flip ?? false,
      });
    }
  }
  return out;
}

function buildNodes(links: SchematicLink[]): SchematicNode[] {
  const place = new Map<string, string>();
  for (const net of TRAM) for (const l of net.links) if (!place.has(l.to)) place.set(l.to, hasRx(l.label) ? '' : l.label); // withheld city: no place line
  const nets = new Map<string, Set<NetworkId>>();
  const seen: string[] = [];
  for (const l of links) {
    for (const id of [l.a, l.b]) {
      if (!nets.has(id)) {
        nets.set(id, new Set());
        seen.push(id);
      }
      if (l.network) nets.get(id)!.add(l.network);
    }
  }
  const order: Record<NodeClass, number> = { ALPHA: 0, BETA: 1, GAMMA: 2 };
  return seen
    .map((id): SchematicNode => {
      const [x, y] = xyOf(id);
      const cls = id.split('-')[0] as NodeClass;
      return {
        id: id as FacilityId,
        cls,
        x,
        y,
        label: NODE_XY[id]?.[2] ?? 'S',
        place: cls === 'ALPHA' ? '' : (place.get(id) ?? ''),
        networks: [...(nets.get(id) ?? [])],
        hubOf: TRAM.filter((n) => n.hubs.includes(id as FacilityId)).map((n) => n.id),
      };
    })
    .sort((p, q) => order[p.cls] - order[q.cls] || p.id.localeCompare(q.id));
}

const LINKS = buildLinks();
const NODES = buildNodes(LINKS);

/** Deterministic board: logical size, node coordinates and link routes. */
export const SCHEMATIC_LAYOUT = {
  width: 1400,
  height: 800,
  grid: 5,
  nodes: NODES as readonly SchematicNode[],
  links: LINKS as readonly SchematicLink[],
  nodeById: Object.fromEntries(NODES.map((n) => [n.id, n])) as Readonly<Record<string, SchematicNode>>,
  linkByKey: Object.fromEntries(LINKS.map((l) => [l.key, l])) as Readonly<Record<string, SchematicLink>>,
  networkNames: Object.fromEntries(TRAM.map((n) => [n.id, n.name])) as Readonly<Record<string, string>>,
} as const;

/**
 * Resolve a caller-supplied link reference to a drawn link. Accepts "4" for
 * "04" and a tram key written B>A (then `reversed` is true and positions run
 * the other way).
 */
export function resolveLink(ref: string): { link: SchematicLink; reversed: boolean } | null {
  const k = ref.trim();
  if (isRailKey(k)) {
    const link = SCHEMATIC_LAYOUT.linkByKey[railKey(k)];
    return link ? { link, reversed: false } : null;
  }
  const direct = SCHEMATIC_LAYOUT.linkByKey[k];
  if (direct) return { link: direct, reversed: false };
  const [x, y] = k.split('>');
  const back = x && y ? SCHEMATIC_LAYOUT.linkByKey[tramKey(y, x)] : undefined;
  return back ? { link: back, reversed: true } : null;
}

/* ------------------------------------------------------------------ */
/* Polyline maths                                                      */
/* ------------------------------------------------------------------ */

export interface Poly {
  pts: Pt[];
  cum: number[];
  len: number;
}

export function makePoly(pts: Pt[]): Poly {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const q = pts[i]!;
    cum.push(cum[i - 1]! + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  return { pts, cum, len: cum[cum.length - 1] ?? 0 };
}

export interface Sample {
  x: number;
  y: number;
  /** Unit tangent in the A -> B direction. */
  ux: number;
  uy: number;
}

/** Point and tangent at fraction t (0..1) of a polyline. No DOM measurement. */
export function sampleAt(poly: Poly, t: number): Sample {
  const { pts, cum, len } = poly;
  const d = clamp(t, 0, 1) * len;
  let i = 1;
  while (i < pts.length - 1 && cum[i]! < d) i++;
  const p = pts[i - 1]!;
  const q = pts[i] ?? p;
  const seg = cum[i]! - cum[i - 1]! || 1;
  const f = (d - cum[i - 1]!) / seg;
  return {
    x: p[0] + (q[0] - p[0]) * f,
    y: p[1] + (q[1] - p[1]) * f,
    ux: (q[0] - p[0]) / seg,
    uy: (q[1] - p[1]) / seg,
  };
}

/** Vertices of the part of a polyline between fractions t0 and t1. */
export function slicePoly(poly: Poly, t0: number, t1: number): Pt[] {
  const a = t0 * poly.len;
  const b = t1 * poly.len;
  const s0 = sampleAt(poly, t0);
  const s1 = sampleAt(poly, t1);
  const out: Pt[] = [[s0.x, s0.y]];
  for (let i = 1; i < poly.pts.length - 1; i++) {
    const c = poly.cum[i]!;
    if (c > a + 0.01 && c < b - 0.01) out.push(poly.pts[i]!);
  }
  out.push([s1.x, s1.y]);
  return out;
}

/**
 * Unit normal on the "tag" side of a run: below a horizontal or diagonal run,
 * left of a vertical one; `flip` reverses it. Train labels use the opposite side.
 */
export function tagNormal(ux: number, uy: number, flip: boolean): readonly [number, number] {
  let nx = -uy;
  let ny = ux;
  if (ny < -1e-6 || (Math.abs(ny) <= 1e-6 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  return flip ? [-nx, -ny] : [nx, ny];
}
