/**
 * canon-merge: builds content/canon/canon.json from
 *   content/canon/source.json      (canon extractor; facts from the lore source)
 *   content/canon/extended-a.json  (canon extender A; optional)
 *   content/canon/extended-b.json  (canon extender B; optional)
 *
 * Run: npx tsx scripts/canon-merge.ts   (also `npm run canon`)
 *
 * Merge rules (documented in docs/CANON.md, "Merge and derivation"):
 *  - extended-a may carry `facilityPatches: Record<FacilityId, Partial<Facility>>` and
 *    `deltaFacilities: Facility[]`; both extended files may carry any top-level Canon key.
 *  - Arrays: an empty source array is replaced by the extended array. A non-empty source
 *    array is merged by key (id / n / no / pn / term / seat / tier / fy): matching items
 *    deep-merge, new items are appended. Arrays without a key field keep the source array.
 *  - Objects deep-merge. A non-null source scalar is a source fact and is kept if an
 *    extended file tries to change it (a warning is printed), except fields listed in
 *    EXTENDER_OWNED, which the extractor only seeds with defaults.
 *  - `headline` and `meta` are always computed/kept by this script; extended values ignored.
 *  - lat/lon are computed for every facility from its anchor (great-circle destination).
 *  - The result is validated (Zod structure + cross-checks) and written with schema key order.
 *  - It also writes content/canon/canon.client.json, the sanitised copy the browser imports
 *    through '@canon' (docs/CANON.md, "Client canon"; sentinels in src/core/rx.ts).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Bearing, Canon, Facility, RxString } from '../src/core/canon-types';
import { canonCrossChecks, canonSchema, clientCanonSchema } from '../src/core/canon-schema';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CANON_DIR = resolve(ROOT, 'content/canon');

/** Mean Earth radius in statute miles. */
export const EARTH_RADIUS_MI = 3958.8;

export const BEARING_DEG: Record<Bearing, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };

const CLASS_ORDER = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;

/** Facility fields the extractor seeds with defaults that extenders are expected to set. */
const EXTENDER_OWNED = new Set(['reactor', 'commanderId', 'origin', 'network']);

/** Extender B division names -> extender A division ids, where the names differ. */
const DIVISION_ALIASES: Record<string, string> = {
  'Facility Engineering': 'FE',
  'Facilities Engineering': 'FE',
  'Security Forces Command': 'SFC',
  'Office of Internal Assurance': 'OIA',
  'Cover Programs Office': 'CVO',
  'Cover Operations': 'CVO',
};

const KEY_FIELDS =['id', 'n', 'no', 'pn', 'term', 'seat', 'tier', 'fy'] as const;

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type JsonObj = { [k: string]: Json };

const isObj = (v: unknown): v is JsonObj => !!v && typeof v === 'object' && !Array.isArray(v);

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

/** Great-circle destination from (lat, lon) travelling `miles` on initial bearing `bearingDeg`. */
export function destination(lat: number, lon: number, bearingDeg: number, miles: number): { lat: number; lon: number } {
  const d = miles / EARTH_RADIUS_MI;
  const th = toRad(bearingDeg);
  const p1 = toRad(lat);
  const l1 = toRad(lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: round4(toDeg(p2)), lon: round4(((toDeg(l2) + 540) % 360) - 180) };
}

/** Haversine great-circle distance in miles. */
export function greatCircleMi(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dp = toRad(bLat - aLat);
  const dl = toRad(bLon - aLon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** FNV-1a 32-bit hash; deterministic across runs and platforms. */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Offset for facilities anchored to an area with no stated distance (GAMMA, some DELTA):
 * 4 to 9 miles from the city centre on a bearing derived from the facility id, so two
 * markers never sit on the same point and the placement never changes between builds.
 */
export function areaOffset(id: string): { miles: number; bearingDeg: number } {
  const h = fnv1a(id);
  return { miles: 4 + (h % 6), bearingDeg: (h >>> 8) % 360 };
}

export function positionFacility(f: Pick<Facility, 'id' | 'anchor'>): { lat: number; lon: number } {
  const a = f.anchor;
  if (typeof a.cityLat !== 'number' || typeof a.cityLon !== 'number') throw new Error(`${f.id}: anchor has no city coordinates`);
  if (typeof a.miles === 'number' && a.bearing) return destination(a.cityLat, a.cityLon, BEARING_DEG[a.bearing], a.miles);
  const o = areaOffset(f.id);
  return destination(a.cityLat, a.cityLon, o.bearingDeg, o.miles);
}

function keyOf(items: Json[]): string | null {
  const first = items.find(isObj);
  if (!first) return null;
  for (const k of KEY_FIELDS) if (k in first && items.every((x) => isObj(x) && k in x)) return k;
  return null;
}

/** Deep merge `ext` onto `src` following the rules in the header. */
function deepMerge(src: Json, ext: Json, path: string, warnings: string[]): Json {
  if (ext === undefined) return src;
  if (Array.isArray(src) && Array.isArray(ext)) {
    if (src.length === 0) return ext;
    if (ext.length === 0) return src;
    const k = keyOf(src) && keyOf(ext) === keyOf(src) ? keyOf(src) : null;
    if (!k) {
      if (JSON.stringify(src) === JSON.stringify(ext)) return src;
      warnings.push(`${path}: source array is non-empty and has no key field; extended array ignored`);
      return src;
    }
    const out: Json[] = src.map((x) => x);
    for (const item of ext) {
      const kv = (item as JsonObj)[k];
      const i = out.findIndex((x) => (x as JsonObj)[k] === kv);
      if (i === -1) out.push(item);
      else out[i] = deepMerge(out[i] as Json, item, `${path}[${k}=${String(kv)}]`, warnings);
    }
    if (k === 'n' || k === 'seat' || k === 'tier') out.sort((a, b) => Number((a as JsonObj)[k]) - Number((b as JsonObj)[k]));
    return out;
  }
  if (isObj(src) && isObj(ext)) {
    const out: JsonObj = { ...src };
    for (const [k, v] of Object.entries(ext)) {
      out[k] = k in src ? deepMerge(src[k] as Json, v, path ? `${path}.${k}` : k, warnings) : v;
    }
    return out;
  }
  // Scalars (or type change).
  if (src === null || src === undefined || src === '') return ext;
  if (src === ext) return src;
  const leaf = path.split('.').pop() ?? '';
  if (EXTENDER_OWNED.has(leaf)) return ext;
  warnings.push(`${path}: extended value ${JSON.stringify(ext)} conflicts with source ${JSON.stringify(src)}; source kept`);
  return src;
}

export interface MergeInputs {
  source: JsonObj;
  extendedA: JsonObj | null;
  extendedB: JsonObj | null;
}

export interface MergeResult {
  canon: Canon;
  warnings: string[];
  errors: string[];
}

function readJson(p: string): JsonObj | null {
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as JsonObj;
}

export function loadInputs(dir = CANON_DIR): MergeInputs {
  const source = readJson(resolve(dir, 'source.json'));
  if (!source) throw new Error(`missing ${resolve(dir, 'source.json')}`);
  return { source, extendedA: readJson(resolve(dir, 'extended-a.json')), extendedB: readJson(resolve(dir, 'extended-b.json')) };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function buildCanon(inputs: MergeInputs): MergeResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const canonKeys = new Set(Object.keys(inputs.source));
  let merged: JsonObj = structuredClone(inputs.source);

  if (!inputs.extendedA) warnings.push('extended-a.json not found: DELTA sites, reactors, divisions, roster, compartments, council seats and numbering are empty');
  if (!inputs.extendedB) warnings.push('extended-b.json not found: glossary, ledger line items, fiscal years and contractor register are empty');

  // extended-a facility handling.
  if (inputs.extendedA) {
    const { facilityPatches, deltaFacilities, offices, ...rest } = inputs.extendedA;
    // Offices are an extender-A addition with no source counterpart (not divisions).
    if (Array.isArray(offices)) merged.offices = offices;
    let facilities = merged.facilities as JsonObj[];
    if (isObj(facilityPatches)) {
      facilities = facilities.map((f) => {
        const patch = facilityPatches[f.id as string];
        if (!isObj(patch)) return f;
        const out = deepMerge(f, patch, `facilities[${String(f.id)}]`, warnings) as JsonObj;
        out.origin = f.origin === 'source' ? 'mixed' : (out.origin ?? f.origin ?? 'extended');
        return out;
      });
      for (const id of Object.keys(facilityPatches)) {
        if (!facilities.some((f) => f.id === id) && !(Array.isArray(deltaFacilities) && deltaFacilities.some((d) => isObj(d) && d.id === id)))
          warnings.push(`facilityPatches.${id}: no such facility`);
      }
    }
    if (Array.isArray(deltaFacilities)) {
      for (const d of deltaFacilities) {
        if (!isObj(d)) continue;
        if (facilities.some((f) => f.id === d.id)) {
          errors.push(`deltaFacilities: ${String(d.id)} already exists`);
          continue;
        }
        const patch = isObj(facilityPatches) ? facilityPatches[d.id as string] : undefined;
        const base: JsonObj = { origin: 'extended', ...d };
        facilities.push(isObj(patch) ? (deepMerge(base, patch, `facilities[${String(d.id)}]`, warnings) as JsonObj) : base);
      }
    } else {
      warnings.push('extended-a.json has no deltaFacilities');
    }
    merged.facilities = facilities;
    merged = mergeTopLevel(merged, rest, 'extended-a', canonKeys, warnings);
  }
  if (inputs.extendedB) {
    const { facilityPatches, deltaFacilities, ...rest } = inputs.extendedB;
    if (facilityPatches !== undefined || deltaFacilities !== undefined)
      warnings.push('extended-b.json: facilityPatches/deltaFacilities belong to extended-a and were ignored');
    merged = mergeTopLevel(merged, rest, 'extended-b', canonKeys, warnings);
  }

  // Facility order and positions.
  const facs = merged.facilities as unknown as Facility[];
  facs.sort((a, b) => CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) || a.id.localeCompare(b.id));
  for (const f of facs) {
    if (!f.anchor || typeof f.anchor.cityLat !== 'number' || typeof f.anchor.cityLon !== 'number') {
      errors.push(`${f.id}: anchor missing city coordinates`);
      continue;
    }
    const p = positionFacility(f);
    f.lat = p.lat;
    f.lon = p.lon;
  }

  // Headline derivations.
  const c = merged as unknown as Canon;

  // threatDetail.ownerDivision is a division name written before extended-a's ids existed:
  // resolve it to a Division.id by exact name, then by the alias table, then through an office
  // (offices[], extender A) to its parent division; null when unmatched.
  c.offices ??= [];
  for (const t of c.threatDetail ?? []) {
    const byName = c.divisions.find((d) => d.name.toLowerCase() === t.ownerDivision.toLowerCase());
    const alias = DIVISION_ALIASES[t.ownerDivision];
    const office = c.offices.find((o) => o.name.toLowerCase() === t.ownerDivision.toLowerCase());
    const viaOffice = office && c.divisions.some((d) => d.id === office.parentDivision) ? office.parentDivision : null;
    const id = byName?.id ?? (alias && c.divisions.some((d) => d.id === alias) ? alias : viaOffice);
    t.ownerDivisionId = id;
    if (!id && c.divisions.length > 0) warnings.push(`threatDetail ${t.id}: owner division "${t.ownerDivision}" has no Division record`);
  }
  const classes = c.classes;
  let staffPosted = 0;
  for (const k of classes) {
    const inClass = facs.filter((f) => f.class === k.id);
    if (inClass.length === 0) {
      staffPosted += k.statedStaff;
      warnings.push(`class ${k.id}: no facility records; staffPosted uses stated class staff (${k.statedStaff})`);
    } else {
      staffPosted += sum(inClass.map((f) => f.staff ?? 0));
    }
  }
  const railEngineeringMi = sum(c.railSegments.map((s) => s.miles));
  const tramEngineeringMi = sum(c.tramNetworks.map((n) => n.statedTotalMi));
  const tramLinkSumMi = sum(c.tramNetworks.flatMap((n) => n.links.map((l) => l.miles)));
  c.headline = {
    ...c.headline,
    facilities: sum(classes.map((k) => k.count)),
    capacitySurge: sum(classes.map((k) => k.statedCapacity)),
    staffTotal: sum(c.tiers.map((t) => t.count)),
    staffPosted,
    staffUnposted: sum(c.tiers.map((t) => t.count)) - staffPosted,
    railEngineeringMi,
    tramEngineeringMi,
    tramLinkSumMi,
  };
  const util = Math.round((c.headline.staffTotal / c.headline.capacitySustained) * 1000) / 10;
  if (util !== c.headline.utilizationPct) errors.push(`utilizationPct ${c.headline.utilizationPct} != computed ${util}`);

  // Class aggregates against facility rows (where the class is fully enumerated).
  for (const k of classes) {
    const inClass = facs.filter((f) => f.class === k.id);
    if (inClass.length === k.count) {
      const s = sum(inClass.map((f) => f.staff ?? 0));
      const cap = sum(inClass.map((f) => f.capacity ?? 0));
      if (s !== k.statedStaff) errors.push(`class ${k.id}: facility staff sum ${s} != stated ${k.statedStaff}`);
      if (cap !== k.statedCapacity) errors.push(`class ${k.id}: facility capacity sum ${cap} != stated ${k.statedCapacity}`);
    }
  }

  // Structural validation.
  const parsed = canonSchema.safeParse(c);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`schema: ${issue.path.join('.')}: ${issue.message}`);
    return { canon: c, warnings, errors };
  }
  const canon = parsed.data as Canon;
  errors.push(...canonCrossChecks(canon, { extendedA: !!inputs.extendedA }));

  // Tunnel lengths shorter than the straight line are a source discrepancy (stated lengths are
  // route-miles as returned, not survey): canon, reported by main() as an info line only.

  return { canon, warnings, errors };
}

function mergeTopLevel(merged: JsonObj, ext: JsonObj, label: string, canonKeys: Set<string>, warnings: string[]): JsonObj {
  const out = { ...merged };
  for (const [k, v] of Object.entries(ext)) {
    if (k === 'headline' || k === 'meta' || k === 'facilities') {
      warnings.push(`${label}.${k}: ignored (computed or source-owned)`);
      continue;
    }
    if (k.startsWith('$') || k.startsWith('_')) continue; // comments / schema hints
    if (!canonKeys.has(k)) {
      warnings.push(`${label}.${k}: not a Canon key; ignored`);
      continue;
    }
    out[k] = deepMerge(out[k] as Json, v, k, warnings);
  }
  return out;
}

/** Tunnel links whose stated length is shorter than the great-circle distance between endpoints. */
export function tunnelShorterThanCrowFlies(c: Canon): { kind: string; label: string; statedMi: number; straightMi: number }[] {
  const pos = new Map(c.facilities.map((f) => [f.id, f]));
  const out: { kind: string; label: string; statedMi: number; straightMi: number }[] = [];
  const check = (kind: string, label: string, a: string, b: string, miles: number) => {
    const fa = pos.get(a as Facility['id']);
    const fb = pos.get(b as Facility['id']);
    if (!fa || !fb || typeof fa.lat !== 'number' || typeof fb.lat !== 'number' || typeof fa.lon !== 'number' || typeof fb.lon !== 'number') return;
    const d = greatCircleMi(fa.lat, fa.lon, fb.lat, fb.lon);
    if (miles < d) out.push({ kind, label, statedMi: miles, straightMi: Math.round(d) });
  };
  for (const s of c.railSegments) check('rail', `segment ${s.no} ${s.a}-${s.b}`, s.a, s.b, s.miles);
  for (const n of c.tramNetworks) for (const l of n.links) check('tram', `${l.from}-${l.to}`, l.from, l.to, l.miles);
  return out;
}

// ---------------------------------------------------------------------------------------
// Client canon (docs/CANON.md, "Client canon"). The browser bundle imports
// content/canon/canon.client.json through '@canon'; every restricted value is replaced by
// a sentinel `[[RX:<key>:<len>]]` (strings) or null (numbers, coordinates, bearing), so the
// withheld text is not in the shipped JS at all. Build scripts and tests read canon.json.
// ---------------------------------------------------------------------------------------

/** Compartment that governs DELTA location detail in the client canon. */
export const DELTA_LOCATION_KEY = 'SEXTANT';
/** Compartment for detached and unposted personnel records. */
export const HOLLOW_KEY = 'HOLLOW';
export const UNPOSTED_SITE = 'DETACHED / UNPOSTED';
/**
 * Sites (besides the operator's own) whose location prose and cover row are released at
 * baseline by content (content/assurance/cover-catalogue.md, registry dossiers).
 */
export const RELEASED_SITES: readonly string[] = ['BETA-09'];

export interface ClientCanonResult {
  client: Canon;
  /** Every withheld original string (used for the scrub pass and by tests). */
  withheld: { path: string; key: string; text: string; scrub: boolean }[];
  /** Other fields where a withheld string was found and replaced by its sentinel. */
  scrubbed: string[];
}

/** Withheld strings shorter than this are not searched for inside other fields. */
const SCRUB_MIN = 8;

export function buildClientCanon(canon: Canon): ClientCanonResult {
  const c = structuredClone(canon);
  const withheld: ClientCanonResult['withheld'] = [];
  const scrubKeys = new Map<string, string>(); // original text -> sentinel
  const rx = (path: string, key: string, text: string, scrub = true): RxString => {
    // Partial canons (test fixtures) may lack a field: leave it as it is.
    if (typeof text !== 'string') return text as unknown as RxString;
    const s: RxString = `[[RX:${key}:${text.length}]]`;
    const doScrub = scrub && text.length >= SCRUB_MIN;
    withheld.push({ path, key, text, scrub: doScrub });
    if (doScrub && !scrubKeys.has(text)) scrubKeys.set(text, s);
    return s;
  };

  // Roster: tier 1 and 2 names and in-world addresses.
  for (const p of c.roster) {
    if (p.site === UNPOSTED_SITE) {
      // HOLLOW: detached and unposted personnel. Only pn, site and tier (which the pn
      // already encodes) stay; rank is null in canon for all three.
      const k = HOLLOW_KEY;
      const at = `roster.${p.pn}`;
      p.name = rx(`${at}.name`, k, p.name);
      p.role = rx(`${at}.role`, k, p.role);
      p.email = rx(`${at}.email`, k, p.email);
      p.notes = rx(`${at}.notes`, k, p.notes);
      if (p.rank) p.rank = rx(`${at}.rank`, k, p.rank, false);
      if (p.divisionId) p.divisionId = rx(`${at}.divisionId`, k, p.divisionId, false);
      continue;
    }
    if (p.tier > 2) continue;
    const key = `T${p.tier}`;
    p.name = rx(`roster.${p.pn}.name`, key, p.name);
    p.email = rx(`roster.${p.pn}.email`, key, p.email);
    // Tier 1 rows keep pn and role only (seat roles are public on the Council composition
    // page). Tier 2 notes stay: the personnel directory shows them at baseline.
    if (p.tier === 1) {
      p.notes = rx(`roster.${p.pn}.notes`, key, p.notes);
      p.site = rx(`roster.${p.pn}.site`, key, p.site, false);
      if (p.rank) p.rank = rx(`roster.${p.pn}.rank`, key, p.rank, false);
      if (p.divisionId) p.divisionId = rx(`roster.${p.pn}.divisionId`, key, p.divisionId, false);
    }
  }

  // SEXTANT: sites released at baseline are the operator's own and those the content
  // releases (RELEASED_SITES). Every other site's cover row and location prose is withheld.
  const ownSite = c.operator?.site as string | undefined;
  const released = new Set<string>([...(ownSite ? [ownSite] : []), ...RELEASED_SITES]);
  for (const row of c.coverCatalogue ?? []) {
    if (released.has(row.facility)) continue;
    const k = DELTA_LOCATION_KEY;
    const at = `coverCatalogue.${row.facility}`;
    // Agency and facility-type phrases repeat across rows (including released ones): no scrub.
    row.coverAgency = rx(`${at}.coverAgency`, k, row.coverAgency, false);
    row.coverFacilityType = rx(`${at}.coverFacilityType`, k, row.coverFacilityType, false);
    row.publicRecordsPosture = rx(`${at}.publicRecordsPosture`, k, row.publicRecordsPosture);
    row.lastCoverReview = rx(`${at}.lastCoverReview`, k, row.lastCoverReview, false);
    row.visibleSurfaceStaff = null;
  }
  // Contractor register: site assignments other than the operator's site. DELTA entries
  // are tier 1 (as in the assurance compartment matrix), the rest SEXTANT. Facility ids are
  // never scrubbed from other fields.
  for (const pc of c.contractors?.register ?? []) {
    pc.sites = (pc.sites ?? []).map((s, i) =>
      s === ownSite ? s : rx(`contractors.${pc.id}.sites.${i}`, s.startsWith('DELTA-') ? 'T1' : DELTA_LOCATION_KEY, s, false),
    );
  }

  // Registry plan (src/apps/registry/model.ts): the operator's site and the sites directly
  // linked to it (rail in revenue service, tram links) are released in full. For every other
  // ALPHA/BETA site: location, position, terrain, cover story and connections are SEXTANT, and
  // a BETA site's reactor identity is SEXTANT. GAMMA: metro area and position open; depth T2,
  // cover story T2 and connections SEXTANT unless linked. DELTA: designation and class only.
  const near = ownSite ? adjacentSites(c, ownSite) : new Set<string>();
  const withholdPosition = (f: Facility, k: string): void => {
    const at = `facilities.${f.id}`;
    const a = f.anchor;
    f.locationText = rx(`${at}.locationText`, k, f.locationText);
    if (f.terrain) f.terrain = rx(`${at}.terrain`, k, f.terrain);
    // City and area names can be shared with released sites: never scrubbed elsewhere.
    a.city = rx(`${at}.anchor.city`, k, a.city, false);
    a.state = rx(`${at}.anchor.state`, k, a.state, false);
    if (a.areaLabel) a.areaLabel = rx(`${at}.anchor.areaLabel`, k, a.areaLabel, false);
    a.miles = null;
    a.bearing = null;
    a.cityLat = null;
    a.cityLon = null;
    f.lat = null;
    f.lon = null;
  };
  const hiddenReactorSites = new Set<string>();
  for (const f of c.facilities) {
    const at = `facilities.${f.id}`;
    const S = DELTA_LOCATION_KEY;
    if ((f.class === 'ALPHA' || f.class === 'BETA') && !near.has(f.id)) {
      withholdPosition(f, S);
      if (f.coverStory) f.coverStory = rx(`${at}.coverStory`, S, f.coverStory);
      if (f.connectionsText) f.connectionsText = rx(`${at}.connectionsText`, S, f.connectionsText, false);
      if (f.class === 'BETA') {
        if (f.reactor) hiddenReactorSites.add(f.id);
        f.reactor = null;
      }
    }
    if (f.class === 'GAMMA') {
      f.depthFt = null; // T2 (pipeline nullKey: GAMMA facility -> T2)
      if (!near.has(f.id)) {
        if (f.coverStory) f.coverStory = rx(`${at}.coverStory`, 'T2', f.coverStory);
        if (f.connectionsText) f.connectionsText = rx(`${at}.connectionsText`, S, f.connectionsText, false);
      }
    }
    // Restricted levels: designation and notes.
    for (const l of f.levels ?? []) {
      if (l.tier > 2) continue;
      const key = `T${l.tier}`;
      l.name = rx(`facilities.${f.id}.levels.${l.n}.name`, key, l.name);
      if (l.notes) l.notes = rx(`facilities.${f.id}.levels.${l.n}.notes`, key, l.notes);
    }
    // DELTA: every location and cover detail. Real values ship only in release files.
    if (f.class === 'DELTA') {
      // Everything but designation and class. Strings are SEXTANT sentinels; numbers are null
      // (tier 1 in the pipeline's nullKey), including capacity and staff, and the staff
      // breakdown is emptied. The class aggregates stay in clear in classes[] (statedCapacity,
      // statedStaff), which the DELTA class page shows at baseline.
      const k = DELTA_LOCATION_KEY;
      withholdPosition(f, k);
      if (f.codename) f.codename = rx(`${at}.codename`, k, f.codename);
      if (f.coverIdentity) f.coverIdentity = rx(`${at}.coverIdentity`, k, f.coverIdentity);
      if (f.coverStory) f.coverStory = rx(`${at}.coverStory`, k, f.coverStory);
      if (f.connectionsText) f.connectionsText = rx(`${at}.connectionsText`, k, f.connectionsText);
      f.function = rx(`${at}.function`, k, f.function);
      if (f.completed) f.completed = rx(`${at}.completed`, k, f.completed, false);
      f.depthFt = null;
      f.capacity = null;
      f.staff = null;
      f.staffBreakdown = [];
      f.reactor = null;
      f.commanderId = null;
      f.network = null;
    }
  }
  // Reactor records at withheld BETA sites: the site link is SEXTANT.
  for (const r of c.reactors ?? []) {
    if (hiddenReactorSites.has(r.site)) r.site = rx(`reactors.${r.id}.site`, DELTA_LOCATION_KEY, r.site, false);
  }

  // Reserves: tier 1 and 2 items keep id, category, unit, site and tier only.
  for (const it of c.reserves.items) {
    if (it.tier > 2) continue;
    const key = `T${it.tier}`;
    it.label = rx(`reserves.${it.id}.label`, key, it.label, false);
    it.text = rx(`reserves.${it.id}.text`, key, it.text, false);
    it.value = null;
  }

  // Contingency protocols whose titles are withheld: a tier 1 bar (no title exists in canon;
  // the bar length is derived from the designation so it is stable between builds).
  for (const t of c.threatDetail) {
    if (t.protocol.titleWithheld) t.protocol.title = `[[RX:T1:${18 + (fnv1a(t.protocol.designation) % 24)}]]`;
  }

  // Scrub pass: a withheld string quoted anywhere else (notes, glossary, cover text) is
  // replaced by the same sentinel. Longest first, so a name inside an address is not split.
  const scrubbed: string[] = [];
  const needles = [...scrubKeys.entries()].sort((a, b) => b[0].length - a[0].length);
  const walk = (v: unknown, path: string): unknown => {
    if (typeof v === 'string') {
      let s = v;
      for (const [text, sentinel] of needles) if (s !== sentinel && s.includes(text)) s = s.split(text).join(sentinel);
      if (s !== v) scrubbed.push(path);
      return s;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) o[k] = walk(o[k], path ? `${path}.${k}` : k);
      return o;
    }
    return v;
  };
  walk(c, '');
  return { client: c, withheld, scrubbed };
}

/**
 * The operator's site plus every site directly linked to it by rail in revenue service or by
 * a tram link (same rule as adjacentTo in src/apps/registry/model.ts).
 */
export function adjacentSites(c: Pick<Canon, 'railSegments' | 'tramNetworks'>, home: string): Set<string> {
  const out = new Set<string>([home]);
  for (const s of c.railSegments ?? []) {
    if (s.status !== 'IN REVENUE SERVICE') continue;
    if (s.a === home) out.add(s.b);
    if (s.b === home) out.add(s.a);
  }
  for (const n of c.tramNetworks ?? [])
    for (const l of n.links ?? []) {
      if (l.from === home) out.add(l.to);
      if (l.to === home) out.add(l.from);
    }
  return out;
}

/** JSON with stable formatting (schema key order is already applied by Zod parse). */
export function serialize(c: Canon): string {
  return JSON.stringify(c, null, 2) + '\n';
}

function main(): void {
  const inputs = loadInputs();
  const { canon, warnings, errors } = buildCanon(inputs);
  for (const w of warnings) console.warn(`canon-merge: warning: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`canon-merge: error: ${e}`);
    console.error(`canon-merge: ${errors.length} error(s); canon.json not written`);
    process.exit(1);
  }
  const out = resolve(CANON_DIR, 'canon.json');
  writeFileSync(out, serialize(canon));

  const { client, withheld, scrubbed } = buildClientCanon(canon);
  const cp = clientCanonSchema.safeParse(client);
  if (!cp.success) {
    for (const issue of cp.error.issues) console.error(`canon-merge: error: client schema: ${issue.path.join('.')}: ${issue.message}`);
    process.exit(1);
  }
  const clientText = serialize(client);
  // Scrubbed kinds must not occur anywhere. (Two-letter states and generic reserve labels
  // such as "Small arms" are not searched for; they occur legitimately elsewhere.)
  const hard = withheld.filter((w) => w.scrub && clientText.includes(JSON.stringify(w.text).slice(1, -1)));
  if (hard.length) {
    for (const w of hard) console.error(`canon-merge: error: client canon still contains withheld ${w.path}`);
    process.exit(1);
  }
  const clientOut = resolve(CANON_DIR, 'canon.client.json');
  writeFileSync(clientOut, clientText);
  console.log(`canon-merge: wrote ${clientOut} (${withheld.length} values withheld${scrubbed.length ? `; scrubbed from ${scrubbed.join(', ')}` : ''})`);

  // Info only: stated tunnel lengths come from the lore source (docs/canon/inconsistencies.md item 16).
  const short = tunnelShorterThanCrowFlies(canon);
  if (short.length)
    console.log(`canon-merge: info: ${short.length} tunnel lengths are shorter than the straight line (source route-miles as returned; inconsistencies.md 16): ${short.map((t) => `${t.label} ${t.statedMi}/${t.straightMi}`).join("; ")}`);
  const h = canon.headline;
  console.log(
    `canon-merge: wrote ${out} (${canon.facilities.length} facilities; staff ${h.staffTotal} = posted ${h.staffPosted} + unposted ${h.staffUnposted}; ` +
      `surge ${h.capacitySurge}; rail ${h.railEngineeringMi} mi; tram ${h.tramEngineeringMi} mi)`,
  );
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invoked === import.meta.url) main();
