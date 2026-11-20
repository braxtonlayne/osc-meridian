/**
 * Muster Board model: pure and deterministic. Given canon (assembly points, roster, cameras),
 * the muster canon fragment and a run's start time, it says which badge was read at which reader
 * and when. Every tab and every account computes the same reads, so nothing but the operators'
 * actions needs to be stored (types.ts).
 */
import type { Canon, MusterPoint, SiteMuster } from '@core/canon-types';
import type { DrillState } from '@core/contracts';
import type { MusterCanon } from '@core/canon-apps/muster';
import type { MusterCloseout, MusterRun, MusterState } from './types';

type ClassId = 'ALPHA' | 'BETA' | 'GAMMA';
export type ClassModel = MusterCanon['classes'][number];

/* ------------------------------------------------------------------ hashing */

/** FNV-1a 32-bit, as a fraction in [0, 1). */
export function hash01(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

/** Standard normal deviate from two hashes (Box-Muller). */
function normal(s: string): number {
  const u = Math.max(1e-9, hash01(`${s}:u`));
  const v = hash01(`${s}:v`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ ids */

/** "ALPHA-02" -> "A02". */
export function shortSite(site: string): string {
  const [cls, no] = site.split('-');
  return `${(cls ?? '?').charAt(0)}${no ?? ''}`;
}

/** Drill-minute duration in wall ms at the drill time scale. */
export const minToMs = (min: number, timeScale: number): number => (min * 60000) / timeScale;

/* ------------------------------------------------------------------ site model */

export interface Reader {
  id: string; // "A02-MP3-R3"
  point: string;
  label: string;
  inService: boolean;
  note: string | null;
}

export type Fate = 'badge' | 'roster' | 'sweep';

export interface Person {
  badge: string; // "05-0142", visitors "V-A02-03"
  /** Roster personnel number when the badge belongs to a directory entry. */
  pn: string | null;
  tier: number | null;
  /** Roster name as the client canon carries it (may be a redaction sentinel). */
  name: string | null;
  role: string | null;
  point: string;
  reader: string;
  /** Drill minutes after the alarm at which the badge is read; null = never read. */
  atMin: number | null;
  fate: Fate;
  kind: 'posted' | 'visitor' | 'unknown';
}

export interface SiteModel {
  site: string;
  classId: ClassId;
  cls: ClassModel;
  points: MusterPoint[];
  readers: Reader[];
  /** Posted staff (assigned to points; sums to the site's staff). */
  people: Person[];
  visitors: Person[];
  /** Badges read that resolve to no posted person. */
  unknown: Person[];
}

export interface ModelInputs {
  canon: Pick<Canon, 'musterPoints' | 'roster' | 'cameras' | 'facilities'>;
  muster: MusterCanon;
}

function classOf(site: string): ClassId {
  return site.split('-')[0] as ClassId;
}

function readersFor(site: string, p: MusterPoint, inp: ModelInputs): Reader[] {
  const oos = new Map(inp.muster.readersOutOfService.map((r) => [r.reader, r.note]));
  const mk = (k: number, label: string): Reader => {
    const id = `${p.id}-R${k}`;
    return { id, point: p.id, label, inService: !oos.has(id), note: oos.get(id) ?? null };
  };
  if (/platform/i.test(p.location)) {
    const cams = inp.canon.cameras.find((c) => c.facility === site)?.cameras.filter((c) => c.kind === 'platform' && c.level === p.level) ?? [];
    if (cams.length > 0) return cams.map((c, i) => mk(i + 1, c.location));
  }
  const count = Math.min(inp.muster.maxReadersPerPoint, Math.max(1, Math.ceil(p.capacity / inp.muster.readerCapacity)));
  return Array.from({ length: count }, (_, i) => mk(i + 1, count === 1 ? `${p.location} reader` : `${p.location} reader ${i + 1}`));
}

/** Badge number on a roster personnel number: "P-3-05-0142" -> "05-0142". */
export function badgeOfPn(pn: string): string {
  return pn.split('-').slice(2).join('-');
}

function arrival(seed: string, cls: ClassModel): number {
  const mu = Math.log(cls.arrivalMedianMin);
  const sigma = Math.log(cls.arrivalP90Min / cls.arrivalMedianMin) / 1.2816;
  const t = Math.exp(mu + sigma * normal(seed));
  return Math.round(Math.min(cls.reportMin - 0.5, Math.max(0.4, t)) * 100) / 100;
}

const siteCache = new WeakMap<ModelInputs, Map<string, SiteModel>>();

/** Everything about a site that does not depend on a run. Memoised per inputs object. */
export function siteModel(site: string, inp: ModelInputs): SiteModel | null {
  let cache = siteCache.get(inp);
  if (!cache) siteCache.set(inp, (cache = new Map()));
  const hit = cache.get(site);
  if (hit) return hit;
  const sm: SiteMuster | undefined = inp.canon.musterPoints.find((s) => s.facility === site);
  const classId = classOf(site);
  const cls = inp.muster.classes.find((c) => c.classId === classId);
  if (!sm || !cls) return null;
  const points = sm.points;
  const readers = points.flatMap((p) => readersFor(site, p, inp));
  const liveReaders = (pt: string) => {
    const rs = readers.filter((r) => r.point === pt && r.inService);
    return rs.length > 0 ? rs : readers.filter((r) => r.point === pt);
  };

  // Directory entries posted here, placed at a point that still has room.
  const roster = inp.canon.roster.filter((r) => r.site === site && /^P-[1-4]-\d{2}-\d{4}$/.test(r.pn));
  const room = new Map(points.map((p) => [p.id, p.assigned]));
  const placed: { pn: string; point: string }[] = [];
  for (const r of roster) {
    let i = Math.floor(hash01(`${r.pn}:pt`) * points.length);
    for (let k = 0; k < points.length; k++, i = (i + 1) % points.length) {
      const id = points[i]!.id;
      if ((room.get(id) ?? 0) > 0) {
        room.set(id, (room.get(id) ?? 0) - 1);
        placed.push({ pn: r.pn, point: id });
        break;
      }
    }
  }

  const reserved = new Set<string>([...inp.canon.roster.map((r) => badgeOfPn(r.pn)), ...inp.muster.unknownBadges.map((u) => u.badge)]);
  const people: Person[] = [];
  const person = (badge: string, point: string, extra: Partial<Person>): Person => {
    const rs = liveReaders(point);
    const reader = rs[Math.floor(hash01(`${site}:${badge}:rd`) * rs.length)]!.id;
    const nb = hash01(`${site}:${badge}:nb`) * 1000 < inp.muster.noBadgePer1000;
    const fate: Fate = !nb ? 'badge' : hash01(`${site}:${badge}:ro`) * 100 < inp.muster.rosterAccountedPct ? 'roster' : 'sweep';
    return { badge, pn: null, tier: null, name: null, role: null, point, reader, atMin: fate === 'badge' ? arrival(`${site}:${badge}`, cls) : null, fate, kind: 'posted', ...extra };
  };
  for (const pl of placed) {
    const r = roster.find((x) => x.pn === pl.pn)!;
    people.push(person(badgeOfPn(r.pn), pl.point, { pn: r.pn, tier: r.tier, name: r.name, role: r.role }));
  }
  for (const p of points) {
    const n = room.get(p.id) ?? 0;
    for (let k = 0; k < n; k++) {
      let badge = '';
      for (let salt = 0; !badge || reserved.has(badge); salt++) {
        const yy = 1 + Math.floor(hash01(`${p.id}:${k}:${salt}:yy`) * 8);
        const nnnn = 300 + Math.floor(hash01(`${p.id}:${k}:${salt}:nn`) * 9600);
        badge = `${String(yy).padStart(2, '0')}-${String(nnnn).padStart(4, '0')}`;
      }
      reserved.add(badge);
      people.push(person(badge, p.id, {}));
    }
  }

  const sp = shortSite(site);
  const nVis = Math.floor(hash01(`${site}:visitors`) * (cls.visitorsMax + 1));
  const first = points[0]!;
  const visitors: Person[] = Array.from({ length: nVis }, (_, i) => {
    const badge = `${inp.muster.badge.visitorPrefix}-${sp}-${String(i + 1).padStart(2, '0')}`;
    const rs = liveReaders(first.id);
    return { badge, pn: null, tier: null, name: null, role: null, point: first.id, reader: rs[i % rs.length]!.id, atMin: arrival(`${site}:${badge}`, cls), fate: 'badge', kind: 'visitor' };
  });

  const unknown: Person[] = inp.muster.unknownBadges
    .filter((u) => u.site === site)
    .map((u) => ({ badge: u.badge, pn: null, tier: null, name: null, role: null, point: readers.find((r) => r.id === u.reader)?.point ?? first.id, reader: u.reader, atMin: u.atMin, fate: 'badge', kind: 'unknown' }));

  const model: SiteModel = { site, classId, cls, points, readers, people, visitors, unknown };
  cache.set(site, model);
  return model;
}

/* ------------------------------------------------------------------ run evaluation */

export interface Read {
  atMin: number;
  badge: string;
  reader: string;
  point: string;
  kind: 'posted' | 'visitor' | 'unknown' | 'located';
  person: Person;
}

export interface Tally {
  assigned: number;
  present: number; // posted staff badged at a reader
  located: number; // found by a sweep team
  roster: number; // accounted by the duty roster at report time
  unaccounted: number;
  visitors: number;
  unknown: number;
}

export interface PointView extends Tally {
  point: MusterPoint;
  /** Every badge read at the point (posted + visitors + unknown). */
  reads: number;
  sweep: 'none' | 'sweeping' | 'complete';
  readers: { reader: Reader; reads: number }[];
}

export interface RunView {
  run: MusterRun;
  model: SiteModel;
  elapsedMin: number;
  reportDue: boolean;
  closed: boolean;
  points: PointView[];
  totals: Tally;
  reads: Read[];
  activeSweeps: number;
}

const ZERO: Tally = { assigned: 0, present: 0, located: 0, roster: 0, unaccounted: 0, visitors: 0, unknown: 0 };

export function addTally(a: Tally, b: Tally): Tally {
  return {
    assigned: a.assigned + b.assigned,
    present: a.present + b.present,
    located: a.located + b.located,
    roster: a.roster + b.roster,
    unaccounted: a.unaccounted + b.unaccounted,
    visitors: a.visitors + b.visitors,
    unknown: a.unknown + b.unknown,
  };
}

/** When a sweep of `point` completes, in wall ms (earliest sweep of that point), or null. */
export function sweepDone(run: MusterRun, point: string, cls: ClassModel, timeScale: number): number | null {
  const s = run.sweeps.filter((x) => x.point === point).map((x) => x.at + minToMs(cls.sweepMin, timeScale));
  return s.length ? Math.min(...s) : null;
}

/**
 * Wall ms the drill behind a drill muster stood down or aborted, or null (not a drill muster, or
 * still running). Read from the live `drill` key, else from the drill register once a later drill replaced it.
 */
export function drillEndFor(run: Pick<MusterRun, 'drillId'>, drill: Pick<DrillState, 'id' | 'endedAt'> | null, register: readonly { id: string; endedAt?: number | null }[] = []): number | null {
  if (!run.drillId) return null;
  if (drill && drill.id === run.drillId) return typeof drill.endedAt === 'number' ? drill.endedAt : null;
  const r = Array.isArray(register) ? register.find((x) => x && x.id === run.drillId) : undefined;
  return typeof r?.endedAt === 'number' ? r.endedAt : null;
}

/** The board at wall time `now` (a closed run is frozen at its signature). */
export function evaluate(run: MusterRun, now: number, inp: ModelInputs, timeScale: number, drillEndedAt: number | null = null): RunView | null {
  const model = siteModel(run.site, inp);
  if (!model) return null;
  // A closed run is frozen at its signature; a drill muster's exercise clock stops at the drill's stand-down or abort.
  let t = run.closeout ? Math.min(now, run.closeout.at) : now;
  const drillOver = run.drillId !== null && drillEndedAt !== null && t >= drillEndedAt;
  if (drillOver) t = Math.max(run.startedAt, drillEndedAt);
  const elapsedMin = Math.max(0, ((t - run.startedAt) / 60000) * timeScale);
  const reportDue = elapsedMin >= model.cls.reportMin || drillOver;
  const reads: Read[] = [];
  const points: PointView[] = model.points.map((p) => {
    const done = sweepDone(run, p.id, model.cls, timeScale);
    const swept = done !== null && t >= done;
    const sweepingNow = run.sweeps.some((x) => x.point === p.id) && !swept;
    const tally: Tally = { ...ZERO, assigned: p.assigned };
    const perReader = new Map<string, number>();
    const bump = (r: string) => perReader.set(r, (perReader.get(r) ?? 0) + 1);
    for (const ps of model.people) {
      if (ps.point !== p.id) continue;
      if (ps.fate === 'badge' && ps.atMin !== null && ps.atMin <= elapsedMin) {
        tally.present++;
        bump(ps.reader);
        reads.push({ atMin: ps.atMin, badge: ps.badge, reader: ps.reader, point: p.id, kind: 'posted', person: ps });
      } else if (ps.fate === 'sweep' && swept && done !== null) {
        tally.located++;
        reads.push({ atMin: ((done - run.startedAt) / 60000) * timeScale, badge: ps.badge, reader: ps.reader, point: p.id, kind: 'located', person: ps });
      } else if (ps.fate === 'roster' && reportDue) {
        tally.roster++;
      } else {
        tally.unaccounted++;
      }
    }
    for (const v of [...model.visitors, ...model.unknown]) {
      if (v.point !== p.id || v.atMin === null || v.atMin > elapsedMin) continue;
      if (v.kind === 'visitor') tally.visitors++;
      else tally.unknown++;
      bump(v.reader);
      reads.push({ atMin: v.atMin, badge: v.badge, reader: v.reader, point: p.id, kind: v.kind, person: v });
    }
    return {
      ...tally,
      point: p,
      reads: tally.present + tally.visitors + tally.unknown,
      sweep: swept ? 'complete' : sweepingNow ? 'sweeping' : 'none',
      readers: model.readers.filter((r) => r.point === p.id).map((r) => ({ reader: r, reads: perReader.get(r.id) ?? 0 })),
    };
  });
  reads.sort((a, b) => a.atMin - b.atMin || a.badge.localeCompare(b.badge));
  const totals = points.reduce<Tally>((acc, p) => addTally(acc, p), ZERO);
  const activeSweeps = run.sweeps.filter((s) => t < s.at + minToMs(model.cls.sweepMin, timeScale)).length;
  return { run, model, elapsedMin, reportDue, closed: !!run.closeout, points, totals, reads, activeSweeps };
}

/* ------------------------------------------------------------------ runs */

/** Drill musters: one per site the drill order has reached (acknowledged). */
export function drillRuns(drill: DrillState | null, sites: readonly string[]): MusterRun[] {
  if (!drill) return [];
  const out: MusterRun[] = [];
  for (const site of sites) {
    const s = drill.sites[site];
    if (!s || s.acknowledged === null) continue;
    out.push({ id: `${drill.id}/${shortSite(site)}`, site, startedAt: s.acknowledged, by: 'drill', drillId: drill.id, sweeps: [], closeout: null, notices: [] });
  }
  return out;
}

/** Stored runs plus drill runs not yet stored (stored wins), newest first. */
export function allRuns(state: MusterState, drill: DrillState | null, sites: readonly string[]): MusterRun[] {
  const stored = new Map(state.runs.map((r) => [r.id, r]));
  const derived = drillRuns(drill, sites).filter((r) => !stored.has(r.id));
  return [...state.runs, ...derived].sort((a, b) => b.startedAt - a.startedAt);
}

/** The run a site board shows: the newest at that site (open or closed), if any. */
export function currentRun(runs: readonly MusterRun[], site: string): MusterRun | null {
  return runs.find((r) => r.site === site) ?? null;
}

/** "MU-A02-0519-03" for the n-th operator muster. */
export function runId(site: string, inWorldIso: string, n: number): string {
  return `MU-${shortSite(site)}-${inWorldIso.slice(5, 7)}${inWorldIso.slice(8, 10)}-${String(n).padStart(2, '0')}`;
}

/** Apply `fn` to the run `run.id`, storing a derived (drill) run first if needed. */
export function upsertRun(state: MusterState, run: MusterRun, fn: (r: MusterRun) => MusterRun): MusterState {
  const has = state.runs.some((r) => r.id === run.id);
  const runs = has ? state.runs.map((r) => (r.id === run.id ? fn(r) : r)) : [...state.runs, fn(run)];
  return { ...state, runs };
}

/* ------------------------------------------------------------------ close-out */

export function discrepancies(v: RunView): string[] {
  const out: string[] = [];
  const t = v.totals;
  if (t.unaccounted > 0) out.push(`${t.unaccounted} posted ${t.unaccounted === 1 ? 'person' : 'personnel'} not accounted for at close-out.`);
  for (const p of v.points) {
    const counted = p.present + p.located + p.roster + p.unknown;
    if (counted > p.assigned) out.push(`${p.point.id} ${p.point.location}: ${counted} staff accounted for against ${p.assigned} assigned.`);
  }
  if (t.unknown > 0) {
    const byReader = new Map<string, string[]>();
    for (const r of v.reads.filter((x) => x.kind === 'unknown')) byReader.set(r.reader, [...(byReader.get(r.reader) ?? []), r.badge]);
    for (const [reader, badges] of byReader) {
      const rd = v.model.readers.find((x) => x.id === reader);
      out.push(`Reader ${reader}${rd ? ` (${rd.label}${rd.inService ? '' : ', not in service'})` : ''}: ${badges.length} ${badges.length === 1 ? 'badge' : 'badges'} not on posted strength (${badges.join(', ')}).`);
    }
  }
  return out;
}

export function closeoutOf(v: RunView, by: MusterCloseout['by'], at: number): MusterCloseout {
  const t = v.totals;
  return { ref: v.run.id, by, at, assigned: t.assigned, present: t.present, located: t.located, roster: t.roster, unaccounted: t.unaccounted, visitors: t.visitors, unknown: t.unknown, discrepancies: discrepancies(v) };
}

/* ------------------------------------------------------------------ network */

export interface Reconciliation {
  totalPersonnel: number;
  postedStaff: number;
  unposted: number;
  assignedToPoints: number;
  /** Posted staff with no assembly point on the plant network (DELTA sites). */
  postedOffNetwork: number;
}

export function reconciliation(c: Pick<Canon, 'headline' | 'musterPoints'>): Reconciliation {
  const assignedToPoints = c.musterPoints.reduce((a, s) => a + s.points.reduce((b, p) => b + p.assigned, 0), 0);
  return {
    totalPersonnel: c.headline.staffTotal,
    postedStaff: c.headline.staffPosted,
    unposted: c.headline.staffUnposted,
    assignedToPoints,
    postedOffNetwork: c.headline.staffPosted - assignedToPoints,
  };
}

/** Name display rule: a name shows only for a person at or below the viewer's tier (numerically >=). */
export function nameVisible(personTier: number | null, viewerTier: number): boolean {
  return personTier !== null && personTier >= viewerTier && personTier > 1;
}
