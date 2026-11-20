/**
 * Public address: pure model. No DOM, no services; unit-tested in model.test.ts.
 *
 * - zone table per site from canon (facility levels or template levels, muster areas,
 *   division zones, and the fragment's unassigned zones)
 * - airtime of a library message (tones from the fragment)
 * - who may call what (per account, per site, drill and isolation)
 * - the controller simulation: queue, priority pre-emption, lapse, cancel
 * - automatic broadcasts derived from the drill and isolation plant state
 */
import canonJson from '@canon';
import type { AccountDef, DrillState, IsolationState } from '@core/contracts';
import type { Canon, ClassId, FacilityId, TierNo } from '@core/canon-types';
import type { PaCanon, PaMessage, PaToneId } from '@core/canon-apps/pa';
import type { PaOutcome, PaRequest, PaState, PaStatus } from './types';
import { clearedAt } from '@apps/isolate/state';

export const canon = canonJson as unknown as Canon;
export const pa = canon.apps.pa as PaCanon;

/* ------------------------------------------------------------------ zones */

export type ZoneKind = 'level' | 'area' | 'division' | 'unassigned';

export interface Zone {
  id: string; // "A02-Z05", "A02-MP1", "A03-RD", "A02-Z00"
  site: FacilityId;
  kind: ZoneKind;
  /** Zone number as engraved on the controller ("05"); null for areas and division zones. */
  zoneNo: string | null;
  /** Facility level number; null for an unassigned zone and for multi-level division zones. */
  level: number | null;
  levels: number[];
  /** Level name (may be a redaction sentinel), area location or division zone name. */
  name: string;
  /** Lowest tier the level name is shown to. */
  tier: TierNo;
  rack: number;
  speakers: number;
  /** Amplifier channel keys this zone occupies. */
  keys: string[];
}

export interface SiteZones {
  site: FacilityId;
  short: string; // "A02"
  cls: ClassId;
  zones: Zone[];
  /** Zones answering a site all-call (level and unassigned zones). */
  allCall: Zone[];
}

/** "ALPHA-02" -> "A02". */
export function siteShort(id: string): string {
  const m = /^([A-Z])[A-Z]*-(\d{2})$/.exec(id);
  return m ? `${m[1]}${m[2]}` : id;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Controller zone number for a facility level: level 0 is zone 01. */
export const zoneNoForLevel = (n: number): string => pad2(n + 1);

export function siteZones(site: FacilityId, c: Canon = canon, p: PaCanon = pa): SiteZones | null {
  const f = c.facilities.find((x) => x.id === site);
  if (!f || f.class === 'DELTA') return null;
  const cls = f.class;
  const short = siteShort(site);
  const levels: { n: number; name: string; tier: TierNo }[] =
    cls === 'ALPHA'
      ? (f.levels ?? []).map((l) => ({ n: l.n, name: l.name, tier: l.tier }))
      : (c.templateLevels[cls] ?? []).map((l) => ({ n: l.n, name: l.name, tier: 4 as TierNo }));
  const speakers = p.speakers[cls];
  const zones: Zone[] = levels.map((l) => {
    const zoneNo = zoneNoForLevel(l.n);
    const id = `${short}-Z${zoneNo}`;
    return { id, site, kind: 'level', zoneNo, level: l.n, levels: [l.n], name: l.name, tier: l.tier, rack: Math.floor(l.n / p.zonesPerRack) + 1, speakers, keys: [id] };
  });
  const levelZone = (n: number) => zones.find((z) => z.level === n);
  const extra: Zone[] = [];
  for (const u of p.unassignedZones.filter((u) => u.site === site)) {
    const id = `${short}-Z${u.zone}`;
    extra.push({ id, site, kind: 'unassigned', zoneNo: u.zone, level: null, levels: [], name: '', tier: 4, rack: u.rack, speakers: u.speakers, keys: [id] });
  }
  const all = [...extra, ...zones];
  for (const d of p.divisionZones.filter((d) => d.site === site)) {
    const parts = d.levels.map(levelZone).filter((z): z is Zone => !!z);
    all.push({
      id: d.id,
      site,
      kind: 'division',
      zoneNo: null,
      level: d.levels.length === 1 ? d.levels[0]! : null,
      levels: [...d.levels],
      name: d.name,
      tier: parts.reduce<TierNo>((t, z) => (z.tier > t ? z.tier : t), 1),
      rack: parts[0]?.rack ?? 1,
      speakers: parts.reduce((s, z) => s + z.speakers, 0),
      keys: parts.map((z) => z.id),
    });
  }
  const muster = c.musterPoints.find((m) => m.facility === site);
  for (const mp of muster?.points ?? []) {
    const parent = levelZone(mp.level);
    if (!parent) continue;
    all.push({ id: mp.id, site, kind: 'area', zoneNo: null, level: mp.level, levels: [mp.level], name: mp.location, tier: parent.tier, rack: parent.rack, speakers: 0, keys: [parent.id] });
  }
  return { site, short, cls, zones: all, allCall: all.filter((z) => z.kind === 'level' || z.kind === 'unassigned') };
}

/** Every non-DELTA site in canon order. */
export function allSites(c: Canon = canon): FacilityId[] {
  return c.facilities.filter((f) => f.class !== 'DELTA').map((f) => f.id);
}

const zoneCache = new Map<string, SiteZones | null>();
export function zonesOf(site: string): SiteZones | null {
  if (!zoneCache.has(site)) zoneCache.set(site, siteZones(site as FacilityId));
  return zoneCache.get(site) ?? null;
}

/** Facility id for a zone id prefix ("A02-Z05" -> "ALPHA-02"). */
export function siteOfZone(zoneId: string, c: Canon = canon): FacilityId | null {
  const short = zoneId.split('-')[0] ?? '';
  return c.facilities.find((f) => f.class !== 'DELTA' && siteShort(f.id) === short)?.id ?? null;
}

/* ------------------------------------------------------------- channel keys */

/** True when two calls would share an amplifier channel. */
export function keysOverlap(a: readonly string[], b: readonly string[]): boolean {
  for (const x of a) {
    for (const y of b) {
      if (x === '*' || y === '*' || x === y) return true;
      if (x.endsWith('-*') && y.startsWith(x.slice(0, -1))) return true;
      if (y.endsWith('-*') && x.startsWith(y.slice(0, -1))) return true;
    }
  }
  return false;
}

/** Channel keys for a selection of zone ids (site all-call "A02-ALL", network "NET-ALL"). */
export function keysFor(zoneIds: readonly string[]): string[] {
  const out = new Set<string>();
  for (const id of zoneIds) {
    if (id === 'NET-ALL') return ['*'];
    if (id.endsWith('-ALL')) {
      out.add(`${id.slice(0, -4)}-*`);
      continue;
    }
    const site = siteOfZone(id);
    const z = site ? zonesOf(site)?.zones.find((x) => x.id === id) : undefined;
    for (const k of z?.keys ?? [id]) out.add(k);
  }
  return [...out];
}

/* ----------------------------------------------------------------- airtime */

export function messageByNo(no: string, p: PaCanon = pa): PaMessage | undefined {
  return p.messages.find((m) => m.no === no);
}

export function toneMs(id: PaToneId | null, p: PaCanon = pa): number {
  if (!id) return 0;
  return p.tones.find((t) => t.id === id)?.steps.reduce((s, x) => s + x.ms, 0) ?? 0;
}

/** Airtime of one call of a library message, ms. */
export function airtimeMs(m: PaMessage, p: PaCanon = pa): number {
  return toneMs(m.pre, p) + m.durationSec * 1000 * m.repeat + toneMs(m.post, p);
}

/** "0:47" */
export function mss(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
}

export function priorityName(level: number, p: PaCanon = pa): string {
  return p.priorities.find((x) => x.level === level)?.name ?? `P${level}`;
}

/* --------------------------------------------------------------- test window */

/** True when `now` (wall clock) is inside the published tone test window (Zulu, in-world weekday). */
export function inTestWindow(now: Date, inWorldIsoDate: string, p: PaCanon = pa): boolean {
  const wd = new Date(`${inWorldIsoDate}T00:00:00Z`).getUTCDay();
  if (wd !== p.testWindow.weekday) return false;
  const hm = now.getUTCHours() * 100 + now.getUTCMinutes();
  return hm >= Number(p.testWindow.startZ) && hm < Number(p.testWindow.endZ);
}

/* ------------------------------------------------------------- authorisation */

export type Refusal = { title: string; reason: string; reference: string };
export type Verdict =
  | { ok: true; /** Consequence mail key, if the call is carried but noted. */ note?: 'restricted' | null }
  | { ok: false; refusal: Refusal; /** Consequence mail key for the refused attempt. */ mail?: 'zone' | 'lifesafety' | null };

export interface CallContext {
  account: AccountDef;
  /** Site of the zones selected. */
  site: FacilityId;
  /** Zone ids selected (or ["<short>-ALL"] / ["NET-ALL"]). */
  zones: string[];
  message: PaMessage;
  isolated: boolean;
  /** Sites under an active seal drill (propagating or sealed). */
  drillSites: ReadonlySet<string>;
  /** Kind of call: a message broadcast or a zone tone test. */
  kind: 'broadcast' | 'test';
}

const DIR = () => pa.system.procedureDocNo.replace(/^OSC-/, '');

/** Zones in a selection that sit on a level the account's tier does not reach (restricted). */
export function restrictedIn(zones: readonly string[], account: AccountDef): Zone[] {
  const out: Zone[] = [];
  for (const id of zones) {
    if (id.endsWith('-ALL')) continue;
    const site = siteOfZone(id);
    const z = site ? zonesOf(site)?.zones.find((x) => x.id === id) : undefined;
    if (z && z.kind !== 'unassigned' && z.tier < Math.max(3, account.tier)) out.push(z);
  }
  return out;
}

export function authorise(ctx: CallContext): Verdict {
  const { account, site, zones, message, isolated, drillSites, kind } = ctx;
  const own = account.site;
  const refuse = (title: string, reason: string, reference: string, mail: 'zone' | 'lifesafety' | null = null): Verdict => ({ ok: false, refusal: { title, reason, reference }, mail });

  if (account.auditReader) {
    return refuse(
      'Not originated by this office',
      'The Office of Internal Assurance does not originate public address traffic. Calls carried by the zone controllers are reviewed from the broadcast log.',
      `${DIR()} para 9`,
    );
  }
  if (zones.includes('NET-ALL')) {
    return refuse('Network all-call not available', `Network all-call is keyed at ${pa.networkKey.heldBy}. Key ${pa.networkKey.keyNo} is not issued to this console.`, `${DIR()} para 5`);
  }
  if (message.use === 'withheld') {
    return refuse('Message not held at this console', `Library message ${message.no} is carried from ${pa.withheld.carriedFrom} only.`, pa.withheld.ref);
  }
  if (message.use !== 'operator' && message.use !== 'test') {
    return refuse('Message reserved', `Library message ${message.no} is sent by the zone controller itself on a ${message.use === 'drill' ? 'seal drill' : 'network'} event and cannot be selected at a console.`, `${DIR()} para 7`);
  }
  if (site !== own && isolated) {
    return refuse('Remote controller not reachable', `Calls to ${site} are carried on the hub circuits, which are down. Only the ${own} controller can be reached from this console.`, 'DIR-0447', null);
  }
  if (site !== own) {
    return refuse('Zone not assigned to this console', `This console originates calls for ${own} only. The ${site} zone controller accepts calls from its own consoles.`, `${DIR()} para 4`, 'zone');
  }
  const cls = canon.facilities.find((f) => f.id === site)?.class;
  if (cls && !message.classes.includes(cls as 'ALPHA' | 'BETA' | 'GAMMA')) {
    return refuse('Message not used at this site', `Library message ${message.no} is not used at this site.`, pa.system.libraryDocNo);
  }
  if (drillSites.has(site) && message.priority >= 4) {
    return refuse('Seal drill in progress', 'Routine calls and tone tests are suspended at a site under seal drill until the drill is stood down.', `${DIR()} para 8`);
  }

  // Tier 4: own site only (the console shows no other), no life safety calls.
  if (account.tier === 4) {
    if (message.priority === 1) {
      return refuse(
        'Life safety call not authorised',
        'Life safety calls at this site are made by the site superintendent or the duty supervisor. Ask the duty supervisor to make the call.',
        `${pa.system.libraryDocNo}`,
        'lifesafety',
      );
    }
    if (zones.some((z) => z.endsWith('-Z00'))) {
      return refuse('Zone not in service', 'The selected zone is not assigned to a level.', pa.system.libraryDocNo);
    }
    return { ok: true, note: null };
  }

  // Tier 3 analyst: own division zone only, routine messages only, no zone tests.
  if (account.tier === 3) {
    const division = pa.divisionZones.find((d) => d.site === own && d.division === account.divisionId);
    if (kind === 'test') {
      return refuse('Tone tests not authorised', `Zone tone tests at ${own} are made by Communications Security or the site command section. Use the console monitor test.`, `${DIR()} para 8`);
    }
    if (!division || zones.length !== 1 || zones[0] !== division.id) {
      return refuse(
        'Zone not assigned to this operator',
        division
          ? `This console is assigned to ${division.name} (zone ${division.id}). Calls to other zones of ${own} are made by the site command section.`
          : `This console has no public address zone assignment at ${own}.`,
        `${DIR()} para 4`,
        'zone',
      );
    }
    if (message.priority < 4) {
      return refuse('Message not authorised', `Division consoles carry routine messages only. Message ${message.no} (${priorityName(message.priority)}) is made by the site command section.`, `${DIR()} para 4`);
    }
    return { ok: true, note: null };
  }

  // Tier 2 site command: any zone of the own site except an unassigned zone.
  if (zones.some((z) => /-Z00$/.test(z))) {
    return refuse('Zone not assigned to a level', `Zone 00 at ${site} is not assigned to a level. Selective calls to it are made from ${pa.withheld.carriedFrom}.`, pa.withheld.ref);
  }
  const restricted = zones.some((z) => !z.endsWith('-ALL')) && restrictedIn(zones, account).length > 0;
  return { ok: true, note: restricted ? 'restricted' : null };
}

/* ---------------------------------------------------------------- simulate */

interface Sim {
  r: PaRequest;
  o: PaOutcome;
}

/**
 * Run the controller over the requests up to `now`. Rules (DIR-0458 para 6):
 * a call starts at once if its channels are free; if they are busy with calls of strictly lower
 * priority (higher number) those calls are pre-empted and not resumed; otherwise it queues.
 * When channels free, queued calls start in priority order, then order of arrival.
 * A queued call lapses `lapseSec` after arrival. Cancels end a queued or airing call.
 */
export function simulate(state: PaState, now: number, lapseSec: number = pa.system.queueLapseSec): Map<string, PaOutcome> {
  const reqs = dedupe(state.requests).slice().sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const cancels = state.cancels.slice().sort((a, b) => a.at - b.at);
  const sims = new Map<string, Sim>(reqs.map((r) => [r.id, { r, o: { status: 'QUEUED', start: null, end: null } }]));
  const airing: Sim[] = [];
  const waiting: Sim[] = [];
  let ai = 0;
  let ci = 0;
  const lapseMs = lapseSec * 1000;

  const start = (s: Sim, t: number) => {
    s.o = { status: 'ON AIR', start: t, end: t + s.r.durationMs };
    airing.push(s);
  };
  const stop = (s: Sim, status: PaStatus, t: number, by?: string) => {
    s.o = { ...s.o, status, end: t, ...(by ? { preemptedBy: by } : {}) };
    const i = airing.indexOf(s);
    if (i >= 0) airing.splice(i, 1);
    const w = waiting.indexOf(s);
    if (w >= 0) waiting.splice(w, 1);
  };
  const drain = (t: number) => {
    waiting.sort((a, b) => a.r.priority - b.r.priority || a.r.at - b.r.at);
    for (const w of [...waiting]) {
      if (!airing.some((x) => keysOverlap(x.r.keys, w.r.keys))) {
        waiting.splice(waiting.indexOf(w), 1);
        start(w, t);
      }
    }
  };

  for (let guard = 0; guard < 100000; guard++) {
    const nextArr = reqs[ai]?.at ?? Infinity;
    const nextCan = cancels[ci]?.at ?? Infinity;
    const nextEnd = airing.reduce((m, s) => Math.min(m, s.o.end ?? Infinity), Infinity);
    const nextLapse = waiting.reduce((m, s) => Math.min(m, s.r.at + lapseMs), Infinity);
    const t = Math.min(nextArr, nextCan, nextEnd, nextLapse);
    if (t === Infinity || t > now) break;
    if (nextEnd === t) {
      for (const s of airing.filter((x) => x.o.end === t)) stop(s, 'COMPLETE', t);
      drain(t);
      continue;
    }
    if (nextLapse === t) {
      for (const s of waiting.filter((x) => x.r.at + lapseMs === t)) stop(s, 'LAPSED', t);
      continue;
    }
    if (nextCan === t) {
      const c = cancels[ci++]!;
      const s = sims.get(c.id);
      if (s && (s.o.status === 'QUEUED' || s.o.status === 'ON AIR') && s.r.at <= t) {
        stop(s, 'CANCELLED', t);
        drain(t);
      }
      continue;
    }
    const r = reqs[ai++]!;
    const s = sims.get(r.id)!;
    const busy = airing.filter((x) => keysOverlap(x.r.keys, r.keys));
    if (busy.length === 0) start(s, t);
    else if (busy.every((x) => x.r.priority > r.priority)) {
      for (const b of busy) stop(b, 'PRE-EMPTED', t, r.id);
      start(s, t);
      drain(t);
    } else waiting.push(s);
  }
  return new Map([...sims].map(([id, s]) => [id, s.o]));
}

/** Drop a second request carrying an autoKey already used (two tabs reconciling at once). */
export function dedupe(reqs: readonly PaRequest[]): PaRequest[] {
  const seen = new Set<string>();
  const ids = new Set<string>();
  const out: PaRequest[] = [];
  for (const r of reqs) {
    if (ids.has(r.id)) continue;
    if (r.autoKey) {
      if (seen.has(r.autoKey)) continue;
      seen.add(r.autoKey);
    }
    ids.add(r.id);
    out.push(r);
  }
  return out;
}

/* ------------------------------------------------------------ requests */

/** "PA-0519-0007" from the in-world ISO date and a serial. */
export function requestId(inWorldIsoDate: string, serial: number): string {
  return `PA-${inWorldIsoDate.slice(5, 7)}${inWorldIsoDate.slice(8, 10)}-${String(serial % 10000).padStart(4, '0')}`;
}

export type NewRequest = Omit<PaRequest, 'id'>;

/** Append requests (with fresh serials), skipping autoKeys already present; keeps the log limit. */
export function appendRequests(prev: PaState, add: readonly NewRequest[], inWorldIsoDate: string, limit: number = pa.system.logLimit): PaState {
  const have = new Set(prev.requests.map((r) => r.autoKey).filter(Boolean));
  let serial = prev.serial;
  const fresh: PaRequest[] = [];
  const oldest = prev.requests[0]?.at ?? -Infinity;
  for (const n of add) {
    if (n.autoKey && have.has(n.autoKey)) continue;
    // A full log does not take back automatic calls older than its oldest record.
    if (n.autoKey && prev.requests.length >= limit && n.at < oldest) continue;
    if (n.autoKey) have.add(n.autoKey);
    serial += 1;
    fresh.push({ ...n, id: requestId(inWorldIsoDate, serial) });
  }
  if (!fresh.length) return prev;
  const requests = [...prev.requests, ...fresh];
  const trimmed = requests.length > limit ? requests.slice(requests.length - limit) : requests;
  const keep = new Set(trimmed.map((r) => r.id));
  return { ...prev, serial, requests: trimmed, cancels: prev.cancels.filter((c) => keep.has(c.id)) };
}

/** A broadcast request for a library message. */
export function makeRequest(args: {
  at: number;
  by: PaRequest['by'];
  origin: string;
  source: PaRequest['source'];
  message: PaMessage;
  zones: string[];
  ref?: string;
  autoKey?: string;
}): NewRequest {
  const { message, zones, ...rest } = args;
  return {
    ...rest,
    msg: message.no,
    zones,
    keys: keysFor(zones),
    priority: message.priority,
    durationMs: airtimeMs(message),
    ...(args.ref ? { ref: args.ref } : {}),
    ...(args.autoKey ? { autoKey: args.autoKey } : {}),
  };
}

/* ------------------------------------------------------ automatic broadcasts */

const DRILL_ACTIVE: DrillState['phase'][] = ['propagating', 'sealed'];

/** Sites under an active seal drill. */
export function drillSites(d: DrillState | null): Set<string> {
  if (!d || !DRILL_ACTIVE.includes(d.phase)) return new Set();
  return new Set(Object.keys(d.sites));
}

/**
 * Wall-clock ms for an in-world ISO time (pinned date, real time of day): today's date at that
 * time, or yesterday's when that would be in the future.
 */
export function wallFromInWorld(iso: string, now: number): number | null {
  const m = /T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Number(m[1]), Number(m[2]), Number(m[3]));
  return t > now ? t - 86400000 : t;
}

/**
 * The automatic broadcasts the plant state calls for up to `now` (DIR-0458 para 7):
 * seal drill order (31) at each site as it receives the order, site sealed (32) as each site
 * seals, stand down (33) or cancelled (34) network-wide at the end; inter-site communications
 * interrupted (35) on each isolation initiation and restored (36) when it clears.
 */
export function autoBroadcasts(drill: DrillState | null, iso: IsolationState | null, now: number, lastSeen: { isolationActive: boolean } = { isolationActive: false }): NewRequest[] {
  const out: NewRequest[] = [];
  const msg = (no: string) => messageByNo(no)!;
  const mk = (at: number, no: string, zones: string[], key: string, ref: string, source: 'drill' | 'isolation', origin: string) =>
    out.push(makeRequest({ at, by: 'system', origin, source, message: msg(no), zones, ref, autoKey: key }));
  if (drill) {
    for (const [site, s] of Object.entries(drill.sites)) {
      if (!zonesOf(site)) continue;
      const short = siteShort(site);
      if (s.ordered != null && s.ordered <= now) mk(s.ordered, '31', [`${short}-ALL`], `drill:${drill.id}:order:${site}`, drill.id, 'drill', site);
      if (s.sealed != null && s.sealed <= now) mk(s.sealed, '32', [`${short}-ALL`], `drill:${drill.id}:sealed:${site}`, drill.id, 'drill', site);
    }
    if ((drill.phase === 'stand-down' || drill.phase === 'aborted') && drill.endedAt != null && drill.endedAt <= now) {
      mk(drill.endedAt, drill.phase === 'aborted' ? '34' : '33', ['NET-ALL'], `drill:${drill.id}:${drill.phase}`, drill.id, 'drill', 'NETWORK');
    }
  }
  if (iso) {
    const n = iso.initiations.length;
    const cleared = clearedAt(iso, now);
    iso.initiations.forEach((i, idx) => {
      const ms = (i as { ms?: unknown }).ms;
      const at = typeof ms === 'number' ? ms : wallFromInWorld(i.at, now);
      if (at == null) return;
      mk(at, '35', ['NET-ALL'], `iso:${i.ref}`, i.ref, 'isolation', 'NETWORK');
      const latest = idx === n - 1;
      // Restored (36) at the wall-clock clear time (isolate's clearedAt: clearsAt or a restoration),
      // or, for an old value with no clear time, when a reader saw `active` go false.
      if (latest && cleared != null && cleared <= now) mk(Math.max(cleared, at + 1), '36', ['NET-ALL'], `iso:${i.ref}:restored`, i.ref, 'isolation', 'NETWORK');
      else if (latest && !iso.active && lastSeen.isolationActive) mk(Math.max(now, at + 1), '36', ['NET-ALL'], `iso:${i.ref}:restored`, i.ref, 'isolation', 'NETWORK');
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* -------------------------------------------------------------- log rows */

export interface LogRow {
  id: string;
  /** Sort key, wall-clock ms (history rows: their in-world time). */
  sort: number;
  date: string; // "19 MAY 2008"
  time: string; // "1432Z"
  site: string; // facility id or NETWORK
  zones: string[];
  keys: string[];
  msg: string;
  by: string;
  source: PaRequest['source'] | 'record';
  priority: number;
  status: PaStatus;
  start: number | null;
  end: number | null;
  durationMs: number;
  preemptedBy?: string;
  ref?: string;
  live: boolean;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function oscDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}
export function zuluOf(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}

/** Sites a request concerns (for filtering by site). */
export function requestSites(r: { zones: readonly string[]; origin: string }): string[] {
  if (r.zones.includes('NET-ALL')) return ['NETWORK'];
  const s = new Set<string>();
  for (const z of r.zones) {
    const f = siteOfZone(z);
    if (f) s.add(f);
  }
  return s.size ? [...s] : [r.origin];
}

export function liveRows(state: PaState, outcomes: Map<string, PaOutcome>, inWorldIsoDate: string, labelFor: (by: PaRequest['by']) => string): LogRow[] {
  return dedupe(state.requests).map((r) => {
    const o = outcomes.get(r.id) ?? { status: 'QUEUED' as PaStatus, start: null, end: null };
    const sites = requestSites(r);
    return {
      id: r.id,
      sort: r.at,
      date: oscDate(inWorldIsoDate),
      time: zuluOf(r.at),
      site: sites.length === 1 ? sites[0]! : sites.join(', '),
      zones: r.zones,
      keys: r.keys,
      msg: r.msg,
      by: labelFor(r.by),
      source: r.source,
      priority: r.priority,
      status: o.status,
      start: o.start,
      end: o.end,
      durationMs: r.durationMs,
      ...(o.preemptedBy ? { preemptedBy: o.preemptedBy } : {}),
      ...(r.ref ? { ref: r.ref } : {}),
      live: true,
    };
  });
}

export function historyRows(p: PaCanon = pa): LogRow[] {
  return p.history.map((h) => {
    const m = messageByNo(h.msg, p);
    const sort = Date.parse(`${h.date}T${h.time.slice(0, 2)}:${h.time.slice(2)}:00Z`);
    return {
      id: h.id,
      sort,
      date: oscDate(h.date),
      time: `${h.time}Z`,
      site: h.site,
      zones: h.zones,
      keys: keysFor(h.zones),
      msg: h.msg,
      by: h.by,
      source: 'record' as const,
      priority: m?.priority ?? 4,
      status: h.status,
      start: null,
      end: null,
      durationMs: m ? airtimeMs(m, p) : 0,
      live: false,
    };
  });
}

/** True when a row may be shown to an account (Tier 4: own site only). */
export function rowVisible(row: Pick<LogRow, 'zones' | 'site'>, account: Pick<AccountDef, 'tier' | 'site'>): boolean {
  if (account.tier !== 4) return true;
  const short = siteShort(account.site);
  if (row.zones.includes('NET-ALL')) return true;
  return row.zones.some((z) => z.startsWith(`${short}-`));
}

/** Zones of a row a Tier 4 reader may see (network calls are shown as the own site). */
export function zonesShown(zones: readonly string[], account: Pick<AccountDef, 'tier' | 'site'>): string[] {
  if (account.tier !== 4) return [...zones];
  const short = siteShort(account.site);
  if (zones.includes('NET-ALL')) return [`${short}-ALL`];
  return zones.filter((z) => z.startsWith(`${short}-`));
}

/** Zones answering a call (answer-back count). */
export function answerBack(zones: readonly string[]): number {
  let n = 0;
  for (const z of zones) {
    if (z === 'NET-ALL') n += allSites().reduce((s, f) => s + (zonesOf(f)?.allCall.length ?? 0), 0);
    else if (z.endsWith('-ALL')) {
      const site = siteOfZone(z);
      n += (site && zonesOf(site)?.allCall.length) || 0;
    } else {
      const site = siteOfZone(z);
      const zone = site ? zonesOf(site)?.zones.find((x) => x.id === z) : undefined;
      n += zone?.kind === 'division' ? zone.keys.length : 1;
    }
  }
  return n;
}
