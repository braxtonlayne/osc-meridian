/**
 * Facility Registry: pure register model.
 *
 * Builds register rows from canon and decides, field by field, what a session may see.
 * The withholding plan follows the registry index (OSC-FAC-IDX): the operator's own site
 * and its immediate connections are released in full. For every other site the location,
 * cover story, connections and BETA reactor identity are SEXTANT (designation, class, cover
 * identity, function, network, berthing and staff stay open, as in the dossiers); GAMMA
 * metro areas are open and their depths Tier 2; DELTA rows show designation and class only. Adjacency is derived from
 * canon (rail segments in revenue service and tram links that touch the home site), never
 * typed by hand.
 */
import type { Canon, ClassId, Facility, FacilityId } from '@core/canon-types';
import { rxInfo } from '@core/rx';

export const CLASS_IDS: readonly ClassId[] = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'];

export type Field =
  | 'codename'
  | 'location'
  | 'position'
  | 'terrain'
  | 'cover'
  | 'coverStory'
  | 'function'
  | 'connections'
  | 'network'
  | 'depth'
  | 'capacity'
  | 'staff'
  | 'breakdown'
  | 'completed'
  | 'reactor'
  | 'commander'
  | 'telemetry';

/** Requirement key for a withheld value: "T1", "T2" or a compartment id. */
export type Requirement = string;

export interface Withheld {
  key: Requirement;
  len: number;
}

export type Cell<T> = { v: T } | { rx: Withheld };

export const isOpen = <T>(c: Cell<T>): c is { v: T } => 'v' in c;

/** Sites directly connected to `home` by rail in revenue service or by a tram link. */
export function adjacentTo(canon: Canon, home: FacilityId): Set<FacilityId> {
  const out = new Set<FacilityId>([home]);
  for (const s of canon.railSegments) {
    if (s.status !== 'IN REVENUE SERVICE') continue;
    if (s.a === home) out.add(s.b);
    if (s.b === home) out.add(s.a);
  }
  for (const n of canon.tramNetworks) {
    for (const l of n.links) {
      if (l.from === home) out.add(l.to);
      if (l.to === home) out.add(l.from);
    }
  }
  return out;
}

/**
 * Requirement key that withholds `field` of `f` from an operator at `home`, or null when the
 * field is released at baseline. A value that arrives from canon as a redaction sentinel is
 * always withheld under its own key, whatever this plan says.
 */
export function requirementFor(f: Facility, field: Field, adjacent: Set<FacilityId>): Requirement | null {
  if (f.class === 'DELTA') {
    if (field === 'staff' || field === 'breakdown') return 'T2';
    return 'T1';
  }
  const near = adjacent.has(f.id);
  switch (field) {
    case 'codename':
    case 'cover':
    case 'function':
    case 'network':
    case 'capacity':
    case 'staff':
    case 'breakdown':
    case 'completed':
    case 'commander':
    case 'telemetry':
      return null;
    case 'location':
    case 'position':
    case 'terrain':
      return near || f.class === 'GAMMA' ? null : 'SEXTANT';
    case 'coverStory':
      return near ? null : f.class === 'GAMMA' ? 'T2' : 'SEXTANT';
    case 'connections':
      return near ? null : 'SEXTANT';
    case 'depth':
      return f.class === 'GAMMA' ? 'T2' : null;
    case 'reactor':
      return f.class === 'ALPHA' || near ? null : 'SEXTANT';
  }
}

export interface Viewer {
  adjacent: Set<FacilityId>;
  satisfies(key: Requirement): boolean;
}

/** Text length used to size a bar when the value itself is a number or boolean. */
const lenOf = (v: unknown): number => (typeof v === 'string' ? v.length : typeof v === 'number' ? v.toLocaleString('en-US').length : 3);

/** Resolve one field to a released value or a withheld bar. */
export function cell<T>(f: Facility, field: Field, value: T, viewer: Viewer, display?: string): Cell<T> {
  const sentinel = rxInfo(value);
  if (sentinel) return { rx: sentinel };
  if (value === null || value === undefined) {
    const key = requirementFor(f, field, viewer.adjacent);
    if (key && !viewer.satisfies(key)) return { rx: { key, len: 4 } };
    return { v: value };
  }
  const key = requirementFor(f, field, viewer.adjacent);
  if (key && !viewer.satisfies(key)) return { rx: { key, len: Math.max(2, display?.length ?? lenOf(value)) } };
  return { v: value };
}

/**
 * Resolve a figure the full canon always carries (berthing, posted staff, reactor fitted) but
 * the client canon may withhold as null. A null is never a value: it is a bar, keyed T1 for
 * DELTA (the client canon's key for nulled DELTA figures) and otherwise to the plan's key.
 */
export function figureCell<T>(f: Facility, field: Field, value: T | null, viewer: Viewer): Cell<T> {
  if (value === null) {
    const key = f.class === 'DELTA' ? 'T1' : (requirementFor(f, field, viewer.adjacent) ?? 'T1');
    return { rx: { key, len: 4 } };
  }
  return cell(f, field, value, viewer);
}

export const fmtInt = (n: number): string => n.toLocaleString('en-US');

/** "24 mi S of Lexington, KY" / the area label for GAMMA sites / the source text otherwise. */
export function locationLabel(f: Facility): string {
  const a = f.anchor;
  if (a.miles != null && a.bearing && a.city && !rxInfo(a.city)) return `${a.miles} mi ${a.bearing} of ${a.city}, ${a.state}`;
  if (a.areaLabel) return a.areaLabel;
  return f.locationText;
}

export function connectionsLabel(f: Facility, canon: Canon): string {
  const rail = canon.railSegments
    .filter((s) => s.a === f.id || s.b === f.id)
    .map((s) => `SEG ${s.no} ${s.a === f.id ? s.b : s.a}${s.status === 'IN REVENUE SERVICE' ? '' : ' (not in revenue service)'}`);
  const tram: string[] = [];
  for (const n of canon.tramNetworks) {
    for (const l of n.links) {
      if (l.from === f.id) tram.push(`tram ${l.to}`);
      else if (l.to === f.id) tram.push(`tram ${l.from}`);
    }
  }
  return [...rail, ...tram].join('; ');
}

export function networkName(canon: Canon, id: string | null): string {
  if (!id) return '';
  return canon.tramNetworks.find((n) => n.id === id)?.name ?? id;
}

export interface RegRow {
  id: FacilityId;
  f: Facility;
  cls: ClassId;
  codename: Cell<string | null>;
  location: Cell<string>;
  cover: Cell<string | null>;
  fn: Cell<string>;
  network: Cell<string>;
  depth: Cell<number | null>;
  capacity: Cell<number>;
  staff: Cell<number>;
  completed: Cell<string | null>;
  reactor: Cell<boolean>;
}

export function buildRows(canon: Canon, viewer: Viewer): RegRow[] {
  return canon.facilities.map((f) => ({
    id: f.id,
    f,
    cls: f.class,
    codename: cell(f, 'codename', f.codename, viewer),
    location: cell(f, 'location', locationLabel(f), viewer),
    cover: cell(f, 'cover', f.coverIdentity, viewer),
    fn: cell(f, 'function', f.function, viewer),
    network: cell(f, 'network', networkName(canon, f.network), viewer),
    depth: cell(f, 'depth', f.depthFt, viewer),
    capacity: figureCell(f, 'capacity', f.capacity, viewer),
    staff: figureCell(f, 'staff', f.staff, viewer),
    completed: cell(f, 'completed', f.completed, viewer),
    reactor: figureCell(f, 'reactor', f.reactor, viewer),
  }));
}

export interface RowFilter {
  classes: ReadonlySet<ClassId>;
  text: string;
  reactorOnly: boolean;
}

/** Text search runs over released values only, so a filter cannot be used to probe a bar. */
export function filterRows(rows: RegRow[], flt: RowFilter): RegRow[] {
  const q = flt.text.trim().toLowerCase();
  return rows.filter((r) => {
    if (!flt.classes.has(r.cls)) return false;
    if (flt.reactorOnly && !(isOpen(r.reactor) && r.reactor.v)) return false;
    if (!q) return true;
    const hay = [r.id, open(r.codename), open(r.location), open(r.cover), open(r.fn), open(r.network)].join(' ').toLowerCase();
    return hay.includes(q);
  });
}

function open<T>(c: Cell<T>): string {
  return isOpen(c) && c.v != null ? String(c.v) : '';
}

/** Sort key: released values sort; withheld values sort after every released one. */
export function sortKey<T>(c: Cell<T>): string | number | null {
  if (!isOpen(c)) return null;
  const v = c.v;
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v as unknown as string | number;
}

export interface Totals {
  rows: number;
  capacity: number;
  staff: number;
  capacityWithheld: number;
  staffWithheld: number;
}

export function totals(rows: RegRow[]): Totals {
  const t: Totals = { rows: rows.length, capacity: 0, staff: 0, capacityWithheld: 0, staffWithheld: 0 };
  for (const r of rows) {
    if (isOpen(r.capacity)) t.capacity += r.capacity.v;
    else t.capacityWithheld++;
    if (isOpen(r.staff)) t.staff += r.staff.v;
    else t.staffWithheld++;
  }
  return t;
}

/** Withholding authority and reference shown on a bar's hover, by requirement key. */
export function authorityFor(canon: Canon, key: Requirement): { auth: string; ref: string } {
  const comp = canon.compartments.find((c) => c.id === key);
  if (comp) return { auth: `FE (${comp.id})`, ref: comp.briefingDocNo };
  return { auth: 'FE', ref: 'OSC-ASR-CG' };
}

/** Facility id from a dossier route ("/registry/facility/alpha-03" -> "ALPHA-03"). */
export function facilityFromRoute(route: string): FacilityId | null {
  const m = /^\/registry\/facility\/(alpha|beta|gamma|delta)-(\d{2})$/i.exec(route);
  return m ? (`${m[1]!.toUpperCase()}-${m[2]}` as FacilityId) : null;
}

export const dossierRoute = (id: string): string => `/registry/facility/${id.toLowerCase()}`;
export const classRoute = (cls: ClassId): string => `/registry/class/${cls.toLowerCase()}`;

export function classFromRoute(route: string): ClassId | null {
  const m = /^\/registry\/class\/(alpha|beta|gamma|delta)$/i.exec(route);
  return m ? (m[1]!.toUpperCase() as ClassId) : null;
}

/** Staffing lines with their share of the site total, for the staffing bars. */
export function staffingBars(f: Facility): { role: string; count: number; pct: number }[] {
  const total = f.staffBreakdown.reduce((s, l) => s + l.count, 0) || 1;
  return f.staffBreakdown.map((l) => ({ role: l.role, count: l.count, pct: (l.count / total) * 100 }));
}

/** Sustainment window in words, from the facility record or its class standard. */
export function sustainmentText(canon: Canon, f: Facility): string {
  const cls = canon.classes.find((c) => c.id === f.class);
  if (f.sustainedMonths != null) return `${f.sustainedMonths} months at full reserves`;
  if (cls?.sustainDaysMin != null && cls.sustainDaysMax != null) return `${cls.sustainDaysMin} to ${cls.sustainDaysMax} days (class standard)`;
  if (cls?.sustainDaysMax != null) return `${cls.sustainDaysMax * 24}-hour maximum (class standard)`;
  return cls?.sustainabilityText ?? '';
}
