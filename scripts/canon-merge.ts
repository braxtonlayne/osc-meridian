/**
 * canon-merge: builds content/canon/canon.json from
 *   content/canon/source.json      (canon extractor; facts from the lore source)
 *   content/canon/extended-a.json  (canon extender A; optional)
 *   content/canon/extended-b.json  (canon extender B; optional)
 *   content/canon/extended-c.json  (pass two: accounts, roster additions and shared plant data; optional)
 *   content/canon/apps/<appId>.json (pass two: per-app fragments -> canon.apps[appId], validated
 *                                   by src/core/canon-apps/<appId>.ts `schema` when present)
 *
 * It also writes the CANON-T2 release (public/data/releases/<hash>.json): the Tier 2 values the
 * client canon withholds, encoded with the release codec (docs/canon/extended-c.md).
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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  AirlockDef, Bearing, Canon, DoorDef, Facility, FacilityId, HardeningClassId, Hoist, MusterPoint, RxString, SealDrill, SealDrillStep, SiteCameras,
  SiteDoors, SiteMuster, CameraDef, Survivability,
} from '../src/core/canon-types';
import { APP_IDS, EXTENDED_C_KEYS, canonCrossChecks, canonSchema, clientCanonSchema, landingDepthFt } from '../src/core/canon-schema';
import { encodeRelease, releaseFileName } from '../src/core/release-codec';
import { CANON_T2_KEY } from '../src/core/canon-release';

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
  /** extended-c.json (pass two: accounts and shared plant data); optional. */
  extendedC?: JsonObj | null;
  /** content/canon/apps/<appId>.json fragments by appId; optional. */
  apps?: Record<string, Json>;
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
  return {
    source,
    extendedA: readJson(resolve(dir, 'extended-a.json')),
    extendedB: readJson(resolve(dir, 'extended-b.json')),
    extendedC: readJson(resolve(dir, 'extended-c.json')),
    apps: loadAppFragments(resolve(dir, 'apps')),
  };
}

/** content/canon/apps/<appId>.json, keyed by file name (sorted, so canon.json is stable). */
export function loadAppFragments(appsDir: string): Record<string, Json> {
  const out: Record<string, Json> = {};
  if (!existsSync(appsDir)) return out;
  for (const name of readdirSync(appsDir).filter((n) => n.endsWith('.json')).sort()) {
    out[basename(name, '.json')] = JSON.parse(readFileSync(resolve(appsDir, name), 'utf8')) as Json;
  }
  return out;
}

/** Directory of the optional per-app schemas (src/core/canon-apps/<appId>.ts, export `schema`). */
export const CANON_APPS_SCHEMA_DIR = resolve(ROOT, 'src/core/canon-apps');

/**
 * Validates each app fragment against its app's Zod `schema`, when the app has one.
 * Returns error strings (empty = pass). Async: schemas are TypeScript modules loaded on demand.
 */
export async function validateAppFragments(apps: Record<string, unknown>, schemaDir = CANON_APPS_SCHEMA_DIR): Promise<{ errors: string[]; unchecked: string[] }> {
  const errors: string[] = [];
  const unchecked: string[] = [];
  for (const [id, data] of Object.entries(apps)) {
    if (!(APP_IDS as readonly string[]).includes(id)) {
      errors.push(`apps/${id}.json: "${id}" is not an AppId`);
      continue;
    }
    const file = resolve(schemaDir, `${id}.ts`);
    if (!existsSync(file)) {
      unchecked.push(id);
      continue;
    }
    // Node (tsx) needs a file URL on Windows; vitest's module runner takes the plain path.
    const spec = process.env.VITEST ? file.replace(/\\/g, '/') : pathToFileURL(file).href;
    const mod = (await import(/* @vite-ignore */ spec)) as { schema?: { safeParse(v: unknown): { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } } };
    if (!mod.schema || typeof mod.schema.safeParse !== 'function') {
      errors.push(`src/core/canon-apps/${id}.ts: no exported Zod \`schema\``);
      continue;
    }
    const r = mod.schema.safeParse(data);
    if (!r.success) for (const issue of r.error?.issues ?? []) errors.push(`apps/${id}.json: ${issue.path.map(String).join('.')}: ${issue.message}`);
  }
  return { errors, unchecked };
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

  // extended-c (pass two): roster additions merge like any canon key; the plant data is
  // expanded here (templates -> per-site records, computed drill order and hoist travel).
  if (inputs.extendedC) {
    const ext = inputs.extendedC;
    const own = new Set<string>([...EXTENDED_C_KEYS]);
    const rest: JsonObj = {};
    for (const [k, v] of Object.entries(ext)) if (!own.has(k)) rest[k] = v;
    merged = mergeTopLevel(merged, rest, 'extended-c', canonKeys, warnings);
    Object.assign(merged, expandExtendedC(merged as unknown as Canon, ext as unknown as ExtendedCInput) as unknown as JsonObj);
  } else {
    warnings.push('extended-c.json not found: accounts and plant data are absent');
  }
  merged.apps = (inputs.apps ?? {}) as JsonObj;

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

  // Structural validation (without extended-c the pass-two keys are not required).
  const schema = inputs.extendedC ? canonSchema : canonSchema.omit(Object.fromEntries(EXTENDED_C_KEYS.map((k) => [k, true])) as { [K in (typeof EXTENDED_C_KEYS)[number]]: true });
  const parsed = schema.safeParse(c);
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

// ---------------------------------------------------------------------------------------
// extended-c expansion (docs/canon/extended-c.md). ALPHA plant records are listed in full in
// extended-c.json; BETA and GAMMA records are generated from class templates, in facility
// order, with no randomness, so every build gives the same ids and figures.
// ---------------------------------------------------------------------------------------

type TemplateWhen = 'tram' | 'dual-portal' | 'single-portal';
interface DoorTemplate extends Omit<DoorDef, 'ratedPsi'> {
  rated: number | 'class' | null;
  when?: TemplateWhen;
}
interface AirlockTemplate extends Omit<AirlockDef, 'outer' | 'inner'> {
  doorCycleSec: number;
  when?: TemplateWhen;
}
interface CameraTemplate extends CameraDef {
  when?: TemplateWhen;
}
interface MusterTemplate {
  id: string;
  level: number;
  location: string;
  share: number;
  capacityFactor: number;
  minCapacity: number;
}
type TemplateClass = 'BETA' | 'GAMMA';
export interface ExtendedCInput {
  accounts: Canon['accounts'];
  survivability: Survivability;
  sealDrill: Omit<SealDrill, 'sequence'>;
  templateLevels: Canon['templateLevels'];
  doors: { sites: Omit<SiteDoors, 'source'>[]; templates: Record<TemplateClass, { doors: DoorTemplate[]; airlocks: AirlockTemplate[] }> };
  cameras: { sites: Omit<SiteCameras, 'source'>[]; templates: Record<TemplateClass, CameraTemplate[]> };
  hoists: Omit<Hoist, 'stops' | 'travelFt'>[];
  musterPoints: { sites: Omit<SiteMuster, 'source'>[]; templates: Record<TemplateClass, MusterTemplate[]> };
}

/** Record id prefix for a facility: ALPHA-01 -> A01, GAMMA-08 -> G08. */
export const plantPrefix = (id: string): string => `${id[0]}${id.slice(-2)}`;

/** Split `total` by `shares` (largest remainder; ties to the earlier entry). Sums exactly to total. */
export function apportion(total: number, shares: number[]): number[] {
  const s = shares.reduce((a, b) => a + b, 0);
  const raw = shares.map((x) => (x / s) * total);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < left; k++) out[order[k]![1]]!++;
  return out;
}

/**
 * Seal drill order of receipt: ALPHA hubs by rail segments in revenue service from the origin,
 * then each hub's tram network (shortest relay time, BETA before GAMMA on ties), then sites
 * with no tram link by voice circuit, one interval apart, in designation order.
 */
export function sealDrillSequence(c: Pick<Canon, 'facilities' | 'railSegments' | 'tramNetworks'>, d: Omit<SealDrill, 'sequence'>): SealDrillStep[] {
  const fac = new Map(c.facilities.map((f) => [f.id as string, f]));
  const plant = c.facilities.filter((f) => f.class !== 'DELTA');
  const step = new Map<string, SealDrillStep>();
  const mk = (id: string, via: string | null, relay: SealDrillStep['relay'], hop: number, offsetMin: number): SealDrillStep => ({
    facility: id as FacilityId,
    network: fac.get(id)?.network ?? null,
    via: via as FacilityId | null,
    relay,
    hop,
    offsetMin,
  });
  step.set(d.origin, mk(d.origin, null, 'origin', 0, 0));
  // Rail: breadth-first over segments in revenue service (neighbours in id order).
  const queue = [d.origin as string];
  while (queue.length) {
    const at = queue.shift()!;
    const here = step.get(at)!;
    const next = c.railSegments
      .filter((s) => s.status === 'IN REVENUE SERVICE' && (s.a === at || s.b === at))
      .map((s) => (s.a === at ? s.b : s.a))
      .sort();
    for (const n of next) {
      if (step.has(n)) continue;
      step.set(n, mk(n, at, 'rail', here.hop + 1, here.offsetMin + d.relay.hubHopMin));
      queue.push(n);
    }
  }
  // Tram: shortest relay time from any hub already ordered (undirected links).
  const adj = new Map<string, string[]>();
  for (const n of c.tramNetworks)
    for (const l of n.links) {
      adj.set(l.from, [...(adj.get(l.from) ?? []), l.to]);
      adj.set(l.to, [...(adj.get(l.to) ?? []), l.from]);
    }
  const rank = (id: string) => ['ALPHA', 'BETA', 'GAMMA'].indexOf(fac.get(id)?.class ?? '');
  const open = [...step.keys()];
  const done = new Set<string>();
  while (open.length) {
    open.sort((a, b) => step.get(a)!.offsetMin - step.get(b)!.offsetMin || rank(a) - rank(b) || a.localeCompare(b));
    const at = open.shift()!;
    if (done.has(at)) continue;
    done.add(at);
    const here = step.get(at)!;
    for (const n of [...(adj.get(at) ?? [])].sort()) {
      if (fac.get(n)?.class === 'ALPHA' || fac.get(n)?.class === 'DELTA') continue;
      const off = here.offsetMin + d.relay.tramHopMin;
      const prev = step.get(n);
      if (prev && (prev.offsetMin < off || (prev.offsetMin === off && (prev.via ?? '') <= at))) continue;
      step.set(n, mk(n, at, 'tram', here.hop + 1, off));
      open.push(n);
    }
  }
  // Voice: everything not reached.
  let last = Math.max(...[...step.values()].map((s) => s.offsetMin));
  for (const f of [...plant].sort((a, b) => a.id.localeCompare(b.id))) {
    if (step.has(f.id)) continue;
    last += d.relay.unlinkedMin;
    step.set(f.id, mk(f.id, d.origin, 'voice', 1, last));
  }
  return [...step.values()]
    .filter((s) => fac.get(s.facility)?.class !== 'DELTA')
    .sort((a, b) => a.offsetMin - b.offsetMin || rank(a.facility) - rank(b.facility) || a.facility.localeCompare(b.facility));
}

/** Expand the extended-c input into the canon keys (see ExtendedCInput). */
export function expandExtendedC(c: Canon, x: ExtendedCInput): Pick<Canon, (typeof EXTENDED_C_KEYS)[number]> {
  const plant = c.facilities.filter((f) => f.class !== 'DELTA');
  const tram = new Set(c.tramNetworks.flatMap((n) => n.links.flatMap((l) => [l.from, l.to] as string[])));
  const hcOf = new Map(x.survivability.facilities.map((e) => [e.facility as string, e.hardeningClass]));
  const rated = new Map(x.survivability.classes.map((k) => [k.id, k.ratedPsi]));
  const applies = (id: string, when?: TemplateWhen): boolean => {
    if (!when) return true;
    if (when === 'tram') return tram.has(id);
    const hc = hcOf.get(id) as HardeningClassId | undefined;
    return when === 'single-portal' ? hc === 'H4' : hc !== 'H4';
  };
  const order = (a: { facility: string }, b: { facility: string }) =>
    c.facilities.findIndex((f) => f.id === a.facility) - c.facilities.findIndex((f) => f.id === b.facility);

  const doors: SiteDoors[] = [];
  const cameras: SiteCameras[] = [];
  const musterPoints: SiteMuster[] = [];
  for (const f of plant) {
    const P = plantPrefix(f.id);
    if (f.class === 'ALPHA') {
      const d = x.doors.sites.find((s) => s.facility === f.id);
      if (d) doors.push({ facility: f.id, source: 'detailed', doors: d.doors, airlocks: d.airlocks });
      const k = x.cameras.sites.find((s) => s.facility === f.id);
      if (k) cameras.push({ facility: f.id, source: 'detailed', cameras: k.cameras });
      const m = x.musterPoints.sites.find((s) => s.facility === f.id);
      if (m) musterPoints.push({ facility: f.id, source: 'detailed', points: m.points });
      continue;
    }
    const cls = f.class as TemplateClass;
    const dt = x.doors.templates[cls];
    const siteDoors: DoorDef[] = dt.doors
      .filter((t) => applies(f.id, t.when))
      .map(({ rated: r, when: _w, ...t }) => ({
        ...t,
        id: `${P}-${t.id}`,
        ratedPsi: r === 'class' ? (rated.get(hcOf.get(f.id) as HardeningClassId) ?? null) : r,
      }));
    const airlocks: AirlockDef[] = [];
    for (const { doorCycleSec, when, ...t } of dt.airlocks) {
      if (!applies(f.id, when)) continue;
      const id = `${P}-${t.id}`;
      for (const side of ['O', 'I'] as const)
        siteDoors.push({
          id: `${id}-${side}`,
          level: t.level,
          location: `${t.location}, ${side === 'O' ? 'outer' : 'inner'} door`,
          kind: 'airlock',
          normal: 'closed',
          cycleSec: doorCycleSec,
          ratedPsi: null,
          sealsOnDrill: true,
          tier: t.tier,
        });
      airlocks.push({ ...t, id, outer: `${id}-O`, inner: `${id}-I` });
    }
    siteDoors.sort((a, b) => a.level - b.level);
    doors.push({ facility: f.id, source: 'template', doors: siteDoors, airlocks });
    cameras.push({
      facility: f.id,
      source: 'template',
      cameras: x.cameras.templates[cls].filter((t) => applies(f.id, t.when)).map(({ when: _w, ...t }) => ({ ...t, id: `${P}-${t.id}` })),
    });
    const mt = x.musterPoints.templates[cls];
    const assigned = apportion(f.staff ?? 0, mt.map((t) => t.share));
    musterPoints.push({
      facility: f.id,
      source: 'template',
      points: mt.map((t, i): MusterPoint => ({
        id: `${P}-${t.id}`,
        level: t.level,
        location: t.location,
        capacity: Math.max(t.minCapacity, Math.ceil((assigned[i]! * t.capacityFactor) / 5) * 5),
        assigned: assigned[i]!,
      })),
    });
  }

  const hoists: Hoist[] = x.hoists.map((h) => {
    const f = c.facilities.find((ff) => ff.id === h.facility);
    const stops = h.levels.flatMap((n) => {
      const l = f?.levels?.find((ll) => ll.n === n);
      return l ? [{ level: n, depthFt: landingDepthFt(l) }] : [];
    });
    return { ...h, stops, travelFt: stops.length ? stops[stops.length - 1]!.depthFt - stops[0]!.depthFt : 0 };
  });

  return {
    accounts: x.accounts,
    survivability: x.survivability,
    sealDrill: { ...x.sealDrill, sequence: sealDrillSequence(c, x.sealDrill) },
    templateLevels: x.templateLevels,
    doors: doors.sort(order),
    cameras: cameras.sort(order),
    hoists,
    musterPoints: musterPoints.sort(order),
  };
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

// ---------------------------------------------------------------------------------------
// CANON-T2 release (docs/canon/extended-c.md, "Restricted values"). Every value the client
// canon withholds under key T2, as { "<dot path>": "<value>" }, encoded with the release codec
// under key CANON-T2 and written to public/data/releases/<releaseFileName('CANON-T2')>.json.
// src/core/canon-release.ts loads it for a session that satisfies T2. Tier 1 values and
// compartment-keyed values (SEXTANT, HOLLOW, ...) are never written.
// ---------------------------------------------------------------------------------------

export const RELEASES_DIR = resolve(ROOT, 'public/data/releases');

export function buildCanonT2(canon: Canon): Record<string, string> {
  const out: Record<string, string> = {};
  for (const w of buildClientCanon(canon).withheld) if (w.key === 'T2') out[w.path] = w.text;
  // Numbers the client canon nulls under T2: GAMMA depth of record, tier 2 reserve values.
  for (const f of canon.facilities) if (f.class === 'GAMMA' && typeof f.depthFt === 'number') out[`facilities.${f.id}.depthFt`] = String(f.depthFt);
  for (const it of canon.reserves.items) if (it.tier === 2 && it.value !== null) out[`reserves.${it.id}.value`] = String(it.value);
  // Accounts whose holder's name is Tier 2: the name and personal address, by account id.
  for (const a of canon.accounts ?? []) {
    if (a.tier !== 2) continue;
    const p = canon.roster.find((x) => x.pn === a.pn);
    if (!p) continue;
    out[`accounts.${a.id}.name`] = p.name;
    out[`accounts.${a.id}.rosterEmail`] = p.email;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/** Path of the CANON-T2 release file under a releases directory. */
export const canonT2File = (dir = RELEASES_DIR): string => resolve(dir, `${releaseFileName(CANON_T2_KEY)}.json`);

/** Write the encoded CANON-T2 release; returns the file path. */
export function writeCanonT2Release(canon: Canon, dir = RELEASES_DIR): string {
  mkdirSync(dir, { recursive: true });
  const file = canonT2File(dir);
  writeFileSync(file, JSON.stringify(encodeRelease(CANON_T2_KEY, buildCanonT2(canon))));
  return file;
}

/** JSON with stable formatting (schema key order is already applied by Zod parse). */
export function serialize(c: Canon): string {
  return JSON.stringify(c, null, 2) + '\n';
}

async function main(): Promise<void> {
  const inputs = loadInputs();
  const { canon, warnings, errors } = buildCanon(inputs);
  const apps = await validateAppFragments(canon.apps ?? {});
  errors.push(...apps.errors);
  if (apps.unchecked.length) warnings.push(`apps without a schema in src/core/canon-apps (not validated): ${apps.unchecked.join(', ')}`);
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
  const t2 = writeCanonT2Release(canon);
  console.log(`canon-merge: wrote ${t2} (${CANON_T2_KEY}, ${Object.keys(buildCanonT2(canon)).length} values)`);

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
if (invoked === import.meta.url)
  main().catch((e: unknown) => {
    console.error(`canon-merge: ${(e as Error).stack ?? String(e)}`);
    process.exit(1);
  });
