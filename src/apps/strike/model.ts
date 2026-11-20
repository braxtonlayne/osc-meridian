/**
 * Planning model PM-3, as its method text in canon (survivability.method) states it. Pure
 * functions only: geometry on a sphere, the contour table, interpolation, effective rating,
 * condition, egress basis and anchor parsing. No figure is typed here; every constant comes
 * from canon.survivability or the strike canon fragment (content/canon/apps/strike.json).
 */
import type { Canon, ClassId, Facility, FacilityId, HardeningClassId, Survivability, SurvivabilityCondition } from '@core/canon-types';
import type { StrikeCanon } from '@core/canon-apps/strike';
import { isRx } from '@core/rx';

export interface Pt {
  lat: number;
  lon: number;
}

const RAD = Math.PI / 180;

/* ---------------------------------------------------------------- sphere */

/** Great-circle distance in statute miles. */
export function distanceMi(a: Pt, b: Pt, radiusMi: number): number {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusMi * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from true north, 0 to 360. */
export function bearingDeg(a: Pt, b: Pt): number {
  const y = Math.sin((b.lon - a.lon) * RAD) * Math.cos(b.lat * RAD);
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos((b.lon - a.lon) * RAD);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Point reached from p after `miles` along initial bearing `deg` (great circle). */
export function destination(p: Pt, deg: number, miles: number, radiusMi: number): Pt {
  const d = miles / radiusMi;
  const t = deg * RAD;
  const la1 = p.lat * RAD;
  const lo1 = p.lon * RAD;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(t));
  const lo2 = lo1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 / RAD, lon: ((((lo2 / RAD) + 540) % 360) - 180) };
}

/** Nearest of the sixteen compass points for a bearing. */
export function compass(deg: number, points: StrikeCanon['compassPoints']): string {
  let best = points[0]!;
  let bestD = Infinity;
  for (const p of points) {
    const d = Math.min(Math.abs(deg - p.deg), 360 - Math.abs(deg - p.deg));
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.id;
}

/* -------------------------------------------------------------- contours */

export interface ContourRange {
  psi: number;
  rangeMi: number;
}

/** Method 1: range to each contour = coefficient x kt^(1/3). Ordered as canon (psi ascending). */
export function contourRanges(s: Survivability, kt: number): ContourRange[] {
  const k = Math.cbrt(kt);
  return s.contours.map((c) => ({ psi: c.psi, rangeMi: c.rangeCoeffMi * k }));
}

export type Overpressure =
  | { band: 'below' } // beyond the outermost contour: unaffected
  | { band: 'psi'; psi: number }
  | { band: 'above'; psi: number }; // inside the innermost contour: above the model's range (psi = that contour)

/** Method 2: log-log interpolation between contours. */
export function overpressureAt(ranges: ContourRange[], d: number): Overpressure {
  const outer = ranges[0]!;
  const inner = ranges[ranges.length - 1]!;
  if (d > outer.rangeMi) return { band: 'below' };
  if (d <= inner.rangeMi) return { band: 'above', psi: inner.psi };
  for (let i = 0; i < ranges.length - 1; i++) {
    const a = ranges[i]!;
    const b = ranges[i + 1]!;
    if (d <= a.rangeMi && d > b.rangeMi) {
      const t = (Math.log(d) - Math.log(a.rangeMi)) / (Math.log(b.rangeMi) - Math.log(a.rangeMi));
      return { band: 'psi', psi: Math.exp(Math.log(a.psi) + t * (Math.log(b.psi) - Math.log(a.psi))) };
    }
  }
  return { band: 'psi', psi: outer.psi };
}

/** Method 3: effective rating = rated psi x (1 + coupling x depth in thousands of feet). */
export function effectiveRating(cls: { ratedPsi: number; depthCoupling: number }, depthFt: number): number {
  return cls.ratedPsi * (1 + cls.depthCoupling * (depthFt / 1000));
}

/** Method 4: condition from the ratio; inside the innermost contour always the last condition. */
export function conditionFor(s: Survivability, op: Overpressure, eff: number): { id: SurvivabilityCondition; ratio: number | null } {
  const fallback = s.conditions.find((c) => c.maxRatio === null) ?? s.conditions[s.conditions.length - 1]!;
  if (op.band === 'above') return { id: fallback.id, ratio: null };
  const ratio = op.band === 'below' ? 0 : op.psi / eff;
  for (const c of s.conditions) if (c.maxRatio !== null && ratio <= c.maxRatio) return { id: c.id, ratio };
  return { id: fallback.id, ratio };
}

/** Rank of a condition (0 = best). */
export function conditionRank(s: Survivability, id: string): number {
  const i = s.conditions.findIndex((c) => c.id === id);
  return i < 0 ? -1 : i;
}

/* ---------------------------------------------------------------- egress */

export interface Egress {
  no: string;
  to: FacilityId;
  miles: number;
  status: string;
}

/**
 * Tunnel egress basis of the model: the inter-hub rail segments touching an ALPHA site that
 * were complete by the model revision month (PM-3 was compiled from the segment table of
 * that month). BETA and GAMMA egress is by tram and is not listed by the model.
 */
export function egressFor(canon: Canon, site: FacilityId): Egress[] {
  const basis = canon.survivability.model.date.slice(0, 7);
  const out: Egress[] = [];
  for (const s of canon.railSegments) {
    if (s.completed > basis) continue;
    if (s.a === site) out.push({ no: s.no, to: s.b, miles: s.miles, status: s.status });
    else if (s.b === site) out.push({ no: s.no, to: s.a, miles: s.miles, status: s.status });
  }
  return out.sort((a, b) => a.no.localeCompare(b.no));
}

/* -------------------------------------------------------------- evaluate */

export type DepthBasis = 'record' | 'planning' | 'release';

export interface SiteResult {
  id: FacilityId;
  cls: ClassId;
  hClass: HardeningClassId;
  point: Pt;
  distanceMi: number;
  bearing: number;
  depthFt: number;
  depthBasis: DepthBasis;
  ratedPsi: number;
  effectivePsi: number;
  op: Overpressure;
  ratio: number | null;
  condition: SurvivabilityCondition;
  egress: Egress[];
}

export interface Evaluation {
  point: Pt;
  kt: number;
  ranges: ContourRange[];
  /** Every evaluated site, nearest first. */
  rows: SiteResult[];
  /** Non-DELTA sites whose position is not held at this workstation. */
  notEvaluated: FacilityId[];
  /** DELTA sites (never modelled). */
  delta: FacilityId[];
}

/** Position of a facility if the client canon carries it. */
export function positionOf(f: Facility): Pt | null {
  return typeof f.lat === 'number' && typeof f.lon === 'number' ? { lat: f.lat, lon: f.lon } : null;
}

/**
 * Evaluate every facility. `releasedDepths` holds depths of record the session may read
 * (GAMMA depths from the CANON-T2 release); otherwise GAMMA sites take the planning depth.
 */
export function evaluate(canon: Canon, frag: StrikeCanon, point: Pt, kt: number, releasedDepths: Partial<Record<string, number>> = {}): Evaluation {
  const s = canon.survivability;
  const ranges = contourRanges(s, kt);
  const hByFacility = new Map(s.facilities.map((x) => [x.facility, x.hardeningClass]));
  const classById = new Map(s.classes.map((c) => [c.id, c]));
  const rows: SiteResult[] = [];
  const notEvaluated: FacilityId[] = [];
  const delta: FacilityId[] = [];
  for (const f of canon.facilities) {
    if (f.class === 'DELTA') {
      delta.push(f.id);
      continue;
    }
    const h = hByFacility.get(f.id);
    const cls = h ? classById.get(h) : undefined;
    const pos = positionOf(f);
    if (!h || !cls || !pos) {
      notEvaluated.push(f.id);
      continue;
    }
    let depthFt: number;
    let depthBasis: DepthBasis;
    const rel = releasedDepths[f.id];
    if (typeof f.depthFt === 'number' && !isRx(f.depthFt)) {
      depthFt = f.depthFt;
      depthBasis = 'record';
    } else if (typeof rel === 'number' && Number.isFinite(rel)) {
      depthFt = rel;
      depthBasis = 'release';
    } else {
      depthFt = s.gammaPlanningDepthFt;
      depthBasis = 'planning';
    }
    const d = distanceMi(point, pos, frag.earthRadiusMi);
    const op = overpressureAt(ranges, d);
    const eff = effectiveRating(cls, depthFt);
    const c = conditionFor(s, op, eff);
    const blocked = conditionRank(s, c.id) >= conditionRank(s, 'ISOLATED');
    rows.push({
      id: f.id,
      cls: f.class,
      hClass: h,
      point: pos,
      distanceMi: d,
      bearing: bearingDeg(point, pos),
      depthFt,
      depthBasis,
      ratedPsi: cls.ratedPsi,
      effectivePsi: eff,
      op,
      ratio: c.ratio,
      condition: c.id,
      egress: blocked && f.class === 'ALPHA' ? egressFor(canon, f.id) : [],
    });
  }
  rows.sort((a, b) => a.distanceMi - b.distanceMi || a.id.localeCompare(b.id));
  return { point, kt, ranges, rows, notEvaluated, delta };
}

/** Summary stored with a register entry. */
export function summarize(s: Survivability, ev: Evaluation): { evaluated: number; affected: number; worst: string | null; worstSites: string } {
  const affected = ev.rows.filter((r) => r.op.band !== 'below');
  let worst: string | null = null;
  let rank = -1;
  for (const r of affected) {
    const k = conditionRank(s, r.condition);
    if (k > rank) {
      rank = k;
      worst = r.condition;
    }
  }
  const worstSites = worst ? affected.filter((r) => r.condition === worst).map((r) => r.id).join(', ') : '';
  return { evaluated: ev.rows.length, affected: affected.length, worst, worstSites };
}

/* ---------------------------------------------------------------- anchors */

export interface Place {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

/** Cities the anchor parser knows: released facility anchor cities first, then the fragment gazetteer. */
export function gazetteer(canon: Canon, frag: StrikeCanon): Place[] {
  const out: Place[] = [];
  const seen = new Set<string>();
  const add = (p: Place) => {
    const k = `${norm(p.name)}|${p.state}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(p);
  };
  for (const f of canon.facilities) {
    const a = f.anchor as { city?: unknown; state?: unknown; cityLat?: unknown; cityLon?: unknown };
    if (typeof a.city !== 'string' || isRx(a.city) || typeof a.state !== 'string' || isRx(a.state)) continue;
    if (typeof a.cityLat !== 'number' || typeof a.cityLon !== 'number') continue;
    add({ name: a.city, state: a.state, lat: a.cityLat, lon: a.cityLon });
  }
  for (const g of frag.gazetteer) add(g);
  return out;
}

const norm = (s: string): string =>
  s
    .toUpperCase()
    .replace(/,/g, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\bSAINT\b/g, 'ST')
    .replace(/\s+/g, ' ')
    .trim();

export type AnchorResult =
  | { ok: true; point: Pt; label: string; site?: FacilityId }
  | { ok: false; error: 'empty' | 'syntax' | 'unknown-place' | 'ambiguous' | 'position-not-held' | 'delta' | 'unknown-site'; detail: string; site?: FacilityId };

export interface AnchorContext {
  canon: Canon;
  frag: StrikeCanon;
  places: Place[];
}

const fmtCoord = (p: Pt): string => `${Math.abs(p.lat).toFixed(4)}${p.lat >= 0 ? 'N' : 'S'} ${Math.abs(p.lon).toFixed(4)}${p.lon >= 0 ? 'E' : 'W'}`;
export { fmtCoord };

/**
 * Parse a typed point. Accepted forms (case and punctuation free):
 *   ALPHA-03                        an installation whose position is held
 *   LEXINGTON / LEXINGTON KY        a gazetteer city
 *   24 MI S OF LEXINGTON KY         distance and compass point from any of the above
 *   37.6932N 84.5037W / 37.6932, -84.5037
 */
export function parseAnchor(text: string, ctx: AnchorContext): AnchorResult {
  const t = norm(text);
  if (!t) return { ok: false, error: 'empty', detail: 'No point was given.' };

  const ll = /^(-?\d+(?:\.\d+)?)\s?([NS])?\s(-?\d+(?:\.\d+)?)\s?([EW])?$/.exec(t.replace(/\//g, ' ').replace(/\s+/g, ' '));
  if (ll) {
    let lat = Number(ll[1]);
    let lon = Number(ll[3]);
    if (ll[2] === 'S') lat = -Math.abs(lat);
    // Longitude without a hemisphere letter is taken as west (the model covers the contiguous states).
    if (ll[4] === 'W' || (!ll[4] && lon > 0)) lon = -Math.abs(lon);
    if (ll[4] === 'E') lon = Math.abs(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return { ok: false, error: 'syntax', detail: `"${text.trim()}" is not a valid latitude and longitude.` };
    }
    const point = { lat, lon };
    return { ok: true, point, label: fmtCoord(point) };
  }

  const off =/^(\d+(?:\.\d+)?)\s(?:MI\s|MILES?\s|SM\s)?([NESW]{1,3})\s(?:OF\s)?(.+)$/.exec(t.replace(/^(\d+(?:\.\d+)?)(MI|MILES?|SM)\b/, '$1 $2'));
  if (off) {
    const miles = Number(off[1]);
    const cp = ctx.frag.compassPoints.find((p) => p.id === off[2]);
    if (!cp || !Number.isFinite(miles)) return { ok: false, error: 'syntax', detail: `"${text.trim()}" is not a distance, compass point and place.` };
    const base = parseAnchor(off[3]!, ctx);
    if (!base.ok) return base;
    const point = destination(base.point, cp.deg, miles, ctx.frag.earthRadiusMi);
    return { ok: true, point, label: `${fmtMiles(miles)} MI ${cp.id} OF ${base.label}` };
  }

  const site = /^(ALPHA|BETA|GAMMA|DELTA)\s?-?\s?(\d{1,2})$/.exec(t);
  if (site) {
    const id = `${site[1]}-${site[2]!.padStart(2, '0')}` as FacilityId;
    const f = ctx.canon.facilities.find((x) => x.id === id);
    if (!f) return { ok: false, error: 'unknown-site', detail: `No installation ${id} is registered.` };
    if (f.class === 'DELTA') return { ok: false, error: 'delta', detail: ctx.canon.survivability.notModelled.text, site: id };
    const pos = positionOf(f);
    if (!pos) return { ok: false, error: 'position-not-held', detail: id, site: id };
    return { ok: true, point: pos, label: id, site: id };
  }

  const words = t.split(' ');
  const last = words[words.length - 1]!;
  const hasState = words.length > 1 && /^[A-Z]{2}$/.test(last) && ctx.places.some((p) => p.state === last);
  const name = hasState ? words.slice(0, -1).join(' ') : t;
  const hits = ctx.places.filter((p) => norm(p.name) === name && (!hasState || p.state === last));
  if (hits.length === 1) {
    const p = hits[0]!;
    return { ok: true, point: { lat: p.lat, lon: p.lon }, label: `${norm(p.name)} ${p.state}` };
  }
  if (hits.length > 1) return { ok: false, error: 'ambiguous', detail: `${name} is held for ${hits.map((h) => h.state).join(' and ')}. Add the state.` };
  return { ok: false, error: 'unknown-place', detail: `${name} is not in the PM-3 gazetteer.` };
}

export function fmtMiles(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
