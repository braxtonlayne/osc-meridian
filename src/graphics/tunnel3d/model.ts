/**
 * Tunnel network model: canon -> projected sites and link depth profiles.
 * Pure (no three, no DOM) so the transit app and tests can use the same geometry.
 * Every figure here is read from canon; the only constants are drawing conventions.
 */
import { geoAlbersUsa, geoInterpolate } from 'd3-geo';
import canonJson from '@canon';
import type { Canon, ClassId, FacilityId } from '@core/canon-types';
import { PLATE_H, PLATE_W } from './plate-data';

const canon = canonJson as unknown as Canon;

/** Same frame as the us-atlas "albers" files the plate outline was generated from. */
const ALBERS_SCALE = 1300;
/** Mean Earth radius in feet: one projected unit is EARTH_RADIUS_FT / ALBERS_SCALE feet on the ground. */
const EARTH_RADIUS_FT = 20_902_231;
export const FEET_PER_UNIT = EARTH_RADIUS_FT / ALBERS_SCALE;

/** Samples per link (uniform along the great circle). */
export const LINK_SAMPLES = 64;

export type LinkKind = 'rail' | 'tram';

export interface SiteNode {
  id: FacilityId;
  cls: ClassId;
  /** Plate coordinates, origin at plate centre, +x east, +z south. */
  x: number;
  z: number;
  /** Null where canon gives no depth (some DELTA sites): drawn as a surface marker only. */
  depthFt: number | null;
  /** Keys of links that terminate here. */
  links: string[];
}

export interface LinkPath {
  /** Rail: segment number "01".."06". Tram: "FROM>TO" as listed in canon. */
  key: string;
  kind: LinkKind;
  a: FacilityId;
  b: FacilityId;
  /** Canon route note (rail) or link label (tram). */
  note: string;
  network: string | null;
  miles: number;
  hours: number;
  /** "IN REVENUE SERVICE" / "NOT IN REVENUE SERVICE"; trams carry no status in canon. */
  status: string | null;
  inService: boolean;
  /** Nominal running depth between the terminal ramps, feet below surface. */
  runFt: number;
  /** LINK_SAMPLES + 1 triples: x, depthFt, z. */
  samples: Float32Array;
}

export interface TunnelModel {
  sites: SiteNode[];
  links: LinkPath[];
  siteById: Map<string, SiteNode>;
  linkByKey: Map<string, LinkPath>;
  /** Canon transit depth band, feet. */
  bandMinFt: number;
  bandMaxFt: number;
  bandText: string;
  rail: { minFt: number; maxFt: number };
  tram: { minFt: number; maxFt: number };
  /** Deepest class limit in canon: the bottom of the reference frame. */
  datumFt: number;
  railSystem: string;
  tramSystem: string;
}

/** FNV-1a to [0, 1): the only source of variation, so the drawing is identical on every load. */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x1_0000_0000;
}

function parseBand(text: string): [number, number] {
  const nums = (text.match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => Number.isFinite(n));
  const lo = nums[0];
  const hi = nums[1];
  if (lo === undefined || hi === undefined) throw new Error(`tunnel3d: cannot read a depth band from "${text}"`);
  return [Math.min(lo, hi), Math.max(lo, hi)];
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Depth along a link, t in 0..1 from a to b.
 * Terminal depth, a ramp to the running depth, a gentle deterministic undulation, a ramp to the far terminal.
 */
function depthProfile(key: string, miles: number, runFt: number, aFt: number, bFt: number): (t: number) => number {
  const ramp = Math.min(0.4, Math.max(0.05, 45 / miles));
  const cycles = 1 + Math.round(miles / 320);
  const phase = hash01(`${key}/phase`);
  const swing = 12 + 22 * hash01(`${key}/swing`);
  return (t) => {
    if (t <= ramp) return aFt + (runFt - aFt) * smooth(t / ramp);
    if (t >= 1 - ramp) return bFt + (runFt - bFt) * smooth((1 - t) / ramp);
    const u = (t - ramp) / (1 - 2 * ramp);
    return runFt + swing * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * (cycles * u + phase));
  };
}

let cached: TunnelModel | null = null;

export function buildTunnelModel(): TunnelModel {
  if (cached) return cached;
  const project = geoAlbersUsa()
    .scale(ALBERS_SCALE)
    .translate([PLATE_W / 2, PLATE_H / 2]);

  const tech = canon.transitTech;
  const bandText = tech.averageDepth ?? '';
  const [bandMinFt, bandMaxFt] = parseBand(bandText);
  const third = (bandMaxFt - bandMinFt) / 3;
  const rail = { minFt: bandMaxFt - third, maxFt: bandMaxFt };
  const tram = { minFt: bandMinFt, maxFt: bandMinFt + third };

  const lonLat = new Map<string, [number, number]>();
  const sites: SiteNode[] = [];
  for (const f of canon.facilities) {
    if (typeof f.lat !== 'number' || typeof f.lon !== 'number') continue;
    const p = project([f.lon, f.lat]);
    if (!p) continue;
    lonLat.set(f.id, [f.lon, f.lat]);
    sites.push({ id: f.id, cls: f.class, x: p[0] - PLATE_W / 2, z: p[1] - PLATE_H / 2, depthFt: f.depthFt, links: [] });
  }
  const siteById = new Map<string, SiteNode>(sites.map((s) => [s.id, s]));

  const links: LinkPath[] = [];
  const add = (
    key: string,
    kind: LinkKind,
    a: FacilityId,
    b: FacilityId,
    rest: Pick<LinkPath, 'note' | 'network' | 'miles' | 'hours' | 'status' | 'inService'>,
  ) => {
    const sa = siteById.get(a);
    const sb = siteById.get(b);
    const la = lonLat.get(a);
    const lb = lonLat.get(b);
    if (!sa || !sb || !la || !lb) return;
    const range = kind === 'rail' ? rail : tram;
    const runFt = Math.round(range.minFt + (range.maxFt - range.minFt) * hash01(`${key}/run`));
    // Rail terminates at the bottom level of each ALPHA site. Trams terminate at station depth at
    // BETA and GAMMA sites, and join an ALPHA shaft at running depth (the shaft passes through it).
    const terminal = (s: SiteNode) => {
      const d = s.depthFt ?? runFt;
      return kind === 'tram' && s.cls === 'ALPHA' ? Math.min(d, runFt) : d;
    };
    const depth = depthProfile(key, rest.miles, runFt, terminal(sa), terminal(sb));
    const arc = geoInterpolate(la, lb);
    const samples = new Float32Array((LINK_SAMPLES + 1) * 3);
    for (let i = 0; i <= LINK_SAMPLES; i++) {
      const t = i / LINK_SAMPLES;
      const p = project(arc(t));
      // Great-circle points between two lower-48 sites always project; fall back to the chord if not.
      samples[i * 3] = p ? p[0] - PLATE_W / 2 : sa.x + (sb.x - sa.x) * t;
      samples[i * 3 + 1] = depth(t);
      samples[i * 3 + 2] = p ? p[1] - PLATE_H / 2 : sa.z + (sb.z - sa.z) * t;
    }
    links.push({ key, kind, a, b, runFt, samples, ...rest });
    sa.links.push(key);
    sb.links.push(key);
  };

  for (const s of canon.railSegments) {
    add(s.no, 'rail', s.a, s.b, {
      note: s.routeNote,
      network: null,
      miles: s.miles,
      hours: s.hours,
      status: s.status,
      inService: s.status === 'IN REVENUE SERVICE',
    });
  }
  for (const n of canon.tramNetworks) {
    for (const l of n.links) {
      add(`${l.from}>${l.to}`, 'tram', l.from, l.to, {
        note: l.label,
        network: n.name,
        miles: l.miles,
        hours: l.hours,
        status: null,
        inService: true,
      });
    }
  }

  const datumFt = Math.max(...canon.classes.map((c) => c.depthMaxFt ?? 0), ...sites.map((s) => s.depthFt ?? 0));

  const built: TunnelModel = {
    sites,
    links,
    siteById,
    linkByKey: new Map(links.map((l) => [l.key, l])),
    bandMinFt,
    bandMaxFt,
    bandText,
    rail,
    tram,
    datumFt,
    railSystem: tech.railSystem ?? '',
    tramSystem: tech.tramSystem ?? '',
  };
  cached = built;
  return built;
}

/**
 * Resolve a train's link key to a link and direction. Rail keys are segment numbers; tram keys are
 * "FROM>TO". A reversed tram key ("TO>FROM") resolves to the same link with pos measured backwards.
 */
export function resolveLink(model: TunnelModel, key: string): { link: LinkPath; reversed: boolean } | null {
  const direct = model.linkByKey.get(key);
  if (direct) return { link: direct, reversed: false };
  const i = key.indexOf('>');
  if (i > 0) {
    const back = model.linkByKey.get(`${key.slice(i + 1)}>${key.slice(0, i)}`);
    if (back) return { link: back, reversed: true };
  }
  return null;
}

/** Point on a link at t (0 = a, 1 = b): [x, depthFt, z]. */
export function pointOnLink(link: LinkPath, t: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const u = Math.min(1, Math.max(0, t)) * LINK_SAMPLES;
  const i = Math.min(LINK_SAMPLES - 1, Math.floor(u));
  const f = u - i;
  const s = link.samples;
  const o = i * 3;
  out[0] = (s[o] ?? 0) * (1 - f) + (s[o + 3] ?? 0) * f;
  out[1] = (s[o + 1] ?? 0) * (1 - f) + (s[o + 4] ?? 0) * f;
  out[2] = (s[o + 2] ?? 0) * (1 - f) + (s[o + 5] ?? 0) * f;
  return out;
}
