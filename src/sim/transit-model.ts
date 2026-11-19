/**
 * Transit Control simulation model. Pure functions; used by src/sim/transit.worker.ts and by
 * the unit tests. No DOM, no signals.
 *
 * Sources:
 *   - Network, mileages, booked running times, segment status: canon `railSegments`, `tramNetworks`.
 *   - Line speeds: canon `transitTech.railSpeed` / `tramSpeed` ("180 mph average").
 *   - Paths, consists, dwell and weekend working: the working timetable document
 *     (OSC-TRN-TT-08-02), parsed by `parseTimetable` from its tables and text. Paths the
 *     operator cannot read (network geography withheld) are not run on the board.
 *   - Possessions: canon `calendar` entries of category TRANSIT.
 *   - Block sections: the line diagram's drafting convention (SCHEMATIC_LAYOUT); each drawn
 *     rail section is three signalling blocks, so segment 04's four sections are blocks 04-01..04-12.
 *
 * Consists move at the canon line speed, so arrival differs from the booked time where the
 * segment sheet's running time and the speed basis disagree. The board shows the difference.
 */
import type { CalendarEvent, FacilityId, NetworkId, RailSegment, TramNetwork } from '@core/canon-types';
import { seg04LogLine } from '@narrative/seg04';
import { SEG04_LABEL, SEG04_NO, seg04BlockId, seg04Phase, type Seg04Window } from './seg04';
import { hash32, hhmmLocal, hhmmZ, inWorldDateIso, inWorldDay, inWorldWeekday, parseZ, rng, utcDayStart, zAndLocal, zoneForState, type Zone } from './time';

/* ------------------------------------------------------------------ model */

export type LinkKind = 'RAIL' | 'TRAM';
export type BlockState = 'CLEAR' | 'OCCUPIED' | 'POSSESSED';

export interface SimLink {
  /** Rail "01".."06"; tram "FROM>TO" (canon order). */
  key: string;
  kind: LinkKind;
  a: FacilityId;
  b: FacilityId;
  network: NetworkId | null;
  /** Short network letters for tram block and consist ids: EA SO MW CE. */
  netCode: string | null;
  /** Tram: position of the link in its network's table, 1-based. */
  linkNo: number;
  label: string;
  miles: number;
  bookedHours: number;
  speedMph: number;
  inService: boolean;
  /** Drawn sections on the line diagram. */
  sections: number;
  /** Signalling blocks. */
  blocks: number;
  /** Block 1 is at the canon `a` end (false: at the `b` end). */
  fromA: boolean;
}

/** Block arrangement stated on a segment engineering sheet. */
export interface BlockSheet {
  blocks: number;
  /** Facility at whose end block 1 lies. */
  origin: FacilityId | null;
}

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five'];

/** Read block count and numbering origin from a segment sheet's text. */
export function parseBlockSheet(seg: string, text: string): BlockSheet | null {
  let blocks = 0;
  const stated = /\b([a-z-]+|\d+) block sections\b/i.exec(text);
  if (stated) {
    const w = stated[1]!.toLowerCase();
    blocks = /^\d+$/.test(w) ? Number(w) : NUM_WORDS.indexOf(w);
  }
  if (blocks <= 0) {
    const re = new RegExp(`\\b${seg}-(\\d{2})\\b`, 'g');
    for (let m = re.exec(text); m; m = re.exec(text)) blocks = Math.max(blocks, Number(m[1]));
  }
  if (blocks <= 0) return null;
  const from = /numbered from the (ALPHA-\d{2}) end/i.exec(text)?.[1] ?? new RegExp(`\\b${seg}-01\\b[^A-Z]{0,24}(ALPHA-\\d{2})`).exec(text)?.[1] ?? null;
  return { blocks, origin: (from as FacilityId | null) ?? null };
}

/** Model with block counts and numbering taken from the segment sheets. */
export function withBlockSheets(model: SimModel, sheets: Record<string, BlockSheet>): SimModel {
  const links = model.links.map((l) => {
    const s = l.kind === 'RAIL' ? sheets[l.key] : undefined;
    if (!s) return l;
    return { ...l, blocks: s.blocks, fromA: s.origin ? s.origin === l.a : l.fromA };
  });
  return { ...model, links, byKey: Object.fromEntries(links.map((l) => [l.key, l])) };
}

export interface SimModel {
  links: SimLink[];
  byKey: Record<string, SimLink>;
  railSpeed: number;
  tramSpeed: number;
  zones: Record<string, Zone>;
}

export interface ModelInput {
  railSegments: readonly RailSegment[];
  tramNetworks: readonly TramNetwork[];
  railSpeedText: string;
  tramSpeedText: string;
  /** Drawn sections per link key (SCHEMATIC_LAYOUT). */
  sections: Record<string, number>;
  /** Facility id -> US state, for platform-local time. */
  states: Record<string, string>;
}

export const NET_CODE: Record<string, string> = { EASTERN: 'EA', SOUTHERN: 'SO', MOUNTAIN_WESTERN: 'MW', CENTRAL: 'CE' };

export const tramKeyOf = (from: string, to: string) => `${from}>${to}`;

/** First number in "180 mph average". */
export function speedOf(text: string): number {
  const m = /(\d+(?:\.\d+)?)/.exec(text);
  return m ? Number(m[1]) : NaN;
}

export function buildModel(input: ModelInput): SimModel {
  const railSpeed = speedOf(input.railSpeedText);
  const tramSpeed = speedOf(input.tramSpeedText);
  const links: SimLink[] = [];
  for (const s of input.railSegments) {
    const sections = input.sections[s.no] ?? 2;
    links.push({
      key: s.no,
      kind: 'RAIL',
      a: s.a,
      b: s.b,
      network: null,
      netCode: null,
      linkNo: Number(s.no),
      label: s.routeNote,
      miles: s.miles,
      bookedHours: s.hours,
      speedMph: railSpeed,
      inService: s.status === 'IN REVENUE SERVICE',
      sections,
      blocks: sections * 3,
      fromA: true,
    });
  }
  for (const n of input.tramNetworks) {
    n.links.forEach((l, i) => {
      const key = tramKeyOf(l.from, l.to);
      const sections = input.sections[key] ?? 1;
      links.push({
        key,
        kind: 'TRAM',
        a: l.from,
        b: l.to,
        network: n.id,
        netCode: NET_CODE[n.id] ?? n.id.slice(0, 2),
        linkNo: i + 1,
        label: l.label,
        miles: l.miles,
        bookedHours: l.hours,
        speedMph: tramSpeed,
        inService: true,
        sections,
        blocks: sections,
        fromA: true,
      });
    });
  }
  const zones: Record<string, Zone> = {};
  for (const [id, st] of Object.entries(input.states)) zones[id] = zoneForState(st);
  return { links, byKey: Object.fromEntries(links.map((l) => [l.key, l])), railSpeed, tramSpeed, zones };
}

export function zoneOf(model: SimModel, facility: string): Zone {
  return model.zones[facility] ?? zoneForState(null);
}

/** Signalling block id. Rail: "04-07" (as on the segment sheet). Tram: "CE03-1". */
export function blockId(link: SimLink, n: number): string {
  if (link.kind === 'RAIL') return `${link.key}-${String(n).padStart(2, '0')}`;
  return `${link.netCode}${String(link.linkNo).padStart(2, '0')}-${n}`;
}

/** Block number (1-based) holding a position measured from the canon a end. */
export function blockAt(link: SimLink, posFromA: number): number {
  const p = Math.min(Math.max(posFromA, 0), 0.999999);
  const q = link.fromA ? p : 1 - p;
  return Math.min(link.blocks, Math.max(1, Math.floor(q * link.blocks) + 1));
}

/** Extent of block n as fractions measured from the canon a end. */
export function blockSpan(link: SimLink, n: number): [number, number] {
  const lo = (n - 1) / link.blocks;
  const hi = n / link.blocks;
  return link.fromA ? [lo, hi] : [1 - hi, 1 - lo];
}

/** Drawn section of the line diagram (1-based from the a end) that holds the middle of block n. */
export function sectionOf(link: SimLink, n: number): number {
  const [lo, hi] = blockSpan(link, n);
  return Math.min(link.sections, Math.floor(((lo + hi) / 2) * link.sections) + 1);
}

/* -------------------------------------------------------------- timetable */

export interface RailPathSpec {
  seg: string;
  id: string;
  from: FacilityId;
  to: FacilityId;
  depMin: number;
  arrMin: number;
  consist: string;
}

export interface TramPathSpec {
  link: string;
  /** Paths each way. */
  paths: number;
  /** First departure from the hub end (minutes after 0000Z); null when the timetable gives none. */
  firstDepMin: number | null;
  consist: string;
  /** "Second path 2300Z ..." */
  secondDepMin: number | null;
  /** Weekdays (0 = Sunday) on which the second path runs; null = daily. */
  secondDays: number[] | null;
}

export interface Timetable {
  source: string;
  rail: RailPathSpec[];
  tram: TramPathSpec[];
  dwellRailMin: number;
  dwellTramMin: number;
  /** Segments that keep their full pattern at weekends; null = no weekend rule. */
  weekendFullSegments: string[] | null;
  /** Segments printed as having no paths. */
  noPaths: string[];
}

export interface TimetableInput {
  source: string;
  /** Every table in the document: rows of cell text, header row first. */
  tables: string[][][];
  /** Plain text of the whole document body (released blocks included). */
  text: string;
}

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const FAC = /([A-Z]+-\d{2})/;

/** Read the working timetable out of the document's tables and text. */
export function parseTimetable(input: TimetableInput, model: SimModel): Timetable {
  const rail: RailPathSpec[] = [];
  const tram: TramPathSpec[] = [];
  const noPaths: string[] = [];
  for (const t of input.tables) {
    const head = (t[0] ?? []).map((h) => h.toLowerCase());
    const iPath = head.findIndex((h) => h === 'path');
    const iDep = head.findIndex((h) => h.startsWith('depart'));
    const iArr = head.findIndex((h) => h.startsWith('arrive'));
    const iCon = head.findIndex((h) => h.startsWith('consist') || h.includes('standard consist'));
    const iSeg = head.findIndex((h) => h === 'seg' || h === 'segment');
    if (iPath >= 0 && iDep >= 0 && iArr >= 0) {
      for (const row of t.slice(1)) {
        const seg = (row[iSeg >= 0 ? iSeg : 0] ?? '').trim();
        const id = (row[iPath] ?? '').trim();
        const dep = row[iDep] ?? '';
        const arr = row[iArr] ?? '';
        if (!id) {
          if (/^\d{2}$/.test(seg) && /no paths/i.test(row.join(' '))) noPaths.push(seg);
          continue;
        }
        const from = FAC.exec(dep)?.[1];
        const to = FAC.exec(arr)?.[1];
        const depMin = parseZ(dep);
        let arrMin = parseZ(arr);
        const consist = (row[iCon] ?? '').match(/[A-Z]\d{2}-\d{3}|T[A-Z]{2}-\d{3}/)?.[0] ?? '';
        if (!from || !to || depMin === null || arrMin === null || !model.byKey[seg]) continue;
        if (arrMin < depMin) arrMin += 1440;
        rail.push({ seg, id, from: from as FacilityId, to: to as FacilityId, depMin, arrMin, consist });
      }
      continue;
    }
    const iLink = head.findIndex((h) => h === 'link');
    const iEach = head.findIndex((h) => h.includes('paths'));
    const iFirst = head.findIndex((h) => h.includes('first'));
    const iNotes = head.findIndex((h) => h.startsWith('note'));
    if (iLink >= 0 && iEach >= 0) {
      for (const row of t.slice(1)) {
        const ends = (row[iLink] ?? '').match(/[A-Z]+-\d{2}/g);
        if (!ends || ends.length < 2) continue;
        const key = linkKeyFor(model, ends[0]!, ends[1]!);
        if (!key) continue;
        const notes = iNotes >= 0 ? (row[iNotes] ?? '') : '';
        const second = /second path (\d{4}Z)/i.exec(notes);
        tram.push({
          link: key,
          paths: Math.max(1, Number((row[iEach] ?? '').match(/\d+/)?.[0] ?? 1)),
          firstDepMin: iFirst >= 0 ? parseZ(row[iFirst]) : null,
          consist: (row[iCon] ?? '').match(/T[A-Z]{2}-\d{3}/)?.[0] ?? '',
          secondDepMin: second ? parseZ(second[1]) : null,
          secondDays: second ? daysIn(notes) : null,
        });
      }
    }
  }
  // Network paths given as running text (released to holders of the geography compartment).
  const seen = new Set(tram.map((p) => p.link));
  const re = /([A-Z]+-\d{2}) to ([A-Z]+-\d{2}), (\d+) paths?(?: each way)?, (T[A-Z]{2}-\d{3})/g;
  for (let m = re.exec(input.text); m; m = re.exec(input.text)) {
    const key = linkKeyFor(model, m[1]!, m[2]!);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tram.push({ link: key, paths: Number(m[3]), firstDepMin: null, consist: m[4]!, secondDepMin: null, secondDays: null });
  }
  const dwell = /dwell[^.]*?(\d+) minutes for rail and (\d+) minutes for tram/i.exec(input.text);
  const weekend = /saturday and sunday: first path in each direction only(?:, except ([^.]+))?/i.exec(input.text);
  return {
    source: input.source,
    rail,
    tram,
    dwellRailMin: dwell ? Number(dwell[1]) : 0,
    dwellTramMin: dwell ? Number(dwell[2]) : 0,
    weekendFullSegments: weekend ? (weekend[1]?.match(/\d{2}/g) ?? []) : null,
    noPaths,
  };
}

function daysIn(notes: string): number[] | null {
  if (!/only/i.test(notes)) return null;
  const out = DAYS.map((d, i) => (new RegExp(d, 'i').test(notes) ? i : -1)).filter((i) => i >= 0);
  return out.length ? out : null;
}

function linkKeyFor(model: SimModel, x: string, y: string): string | null {
  if (model.byKey[tramKeyOf(x, y)]) return tramKeyOf(x, y);
  if (model.byKey[tramKeyOf(y, x)]) return tramKeyOf(y, x);
  return null;
}

/* ---------------------------------------------------------------- movements */

export type MoveStatus = 'BOOKED' | 'RUNNING' | 'ARRIVED' | 'CANCELLED';

export interface Movement {
  /** Path id + day, unique. */
  key: string;
  pathId: string;
  kind: LinkKind;
  link: string;
  consist: string;
  from: FacilityId;
  to: FacilityId;
  depMs: number;
  bookedArrMs: number;
  expArrMs: number;
  cancelled: string | null;
}

export interface PossessionSpec {
  id: string;
  date: string;
  link: string | null;
  limits: string;
  fromMs: number | null;
  toMs: number | null;
  timeText: string;
  originator: string;
  title: string;
  note: string;
}

/** TRANSIT calendar entries as possessions. `dayStartFor` maps an ISO in-world date to the UTC midnight it runs on. */
export function possessionsFrom(calendar: readonly CalendarEvent[], model: SimModel, dayStartFor: (iso: string) => number): PossessionSpec[] {
  const out: PossessionSpec[] = [];
  for (const e of calendar) {
    if (e.category !== 'TRANSIT' || !/possession/i.test(e.title)) continue;
    const seg = /segment (\d{2})/i.exec(e.title)?.[1];
    const ends = e.title.match(/[A-Z]+-\d{2}/g);
    const link = seg && model.byKey[seg] ? seg : ends && ends.length >= 2 ? linkKeyFor(model, ends[0]!, ends[1]!) : null;
    const day = dayStartFor(e.date);
    const s = parseZ(e.startZ);
    const f = parseZ(e.endZ);
    out.push({
      id: e.id,
      date: e.date,
      link,
      limits: seg ? `Segment ${seg}` : ends && ends.length >= 2 ? `Tram link ${ends[0]} to ${ends[1]}` : e.title,
      fromMs: s === null ? null : day + s * 60_000,
      toMs: f === null ? null : day + (f <= (s ?? 0) ? f + 1440 : f) * 60_000,
      timeText: e.timeText,
      originator: e.originator,
      title: e.title,
      note: e.note,
    });
  }
  return out;
}

function runMs(link: SimLink): number {
  return (link.miles / link.speedMph) * 3600_000;
}

/**
 * All movements booked to depart on the UTC day starting `dayStart`. `weekday` is the
 * in-world weekday for the weekend rule and day-specific tram paths.
 */
export function expandDay(model: SimModel, tt: Timetable, dayStart: number, weekday: number, possessions: readonly PossessionSpec[] = []): Movement[] {
  const out: Movement[] = [];
  const weekend = weekday === 0 || weekday === 6;
  const dayTag = new Date(dayStart).toISOString().slice(0, 10);
  const firstOfDir = new Set<string>();
  const railSorted = [...tt.rail].sort((p, q) => p.depMin - q.depMin);
  for (const p of railSorted) {
    const link = model.byKey[p.seg];
    if (!link || !link.inService) continue;
    const dirKey = `${p.seg}:${p.from}`;
    const isFirst = !firstOfDir.has(dirKey);
    firstOfDir.add(dirKey);
    if (weekend && tt.weekendFullSegments && !tt.weekendFullSegments.includes(p.seg) && !isFirst) continue;
    const dep = dayStart + p.depMin * 60_000;
    out.push(mk(model, link, p.id, p.consist, p.from, p.to, dep, dayStart + p.arrMin * 60_000, dayTag, possessions));
  }
  for (const spec of tt.tram) {
    const link = model.byKey[spec.link];
    if (!link) continue;
    const first = spec.firstDepMin ?? defaultFirstDep(link);
    const booked = link.bookedHours * 3600_000;
    const dwell = tt.dwellTramMin * 60_000;
    let n = spec.paths;
    if (spec.secondDays && !spec.secondDays.includes(weekday)) n = Math.min(n, 1);
    let t = dayStart + first * 60_000;
    for (let i = 0; i < n; i++) {
      if (i === 1 && spec.secondDepMin !== null) {
        const s = dayStart + spec.secondDepMin * 60_000;
        if (s > t) t = s;
      }
      const code = `${link.netCode}${String(link.linkNo).padStart(2, '0')}`;
      const outId = `${code}D${String(i * 2 + 1).padStart(2, '0')}`;
      const backId = `${code}U${String(i * 2 + 2).padStart(2, '0')}`;
      const outMove = mk(model, link, outId, spec.consist, link.a, link.b, t, t + booked, dayTag, possessions);
      const backDep = Math.max(outMove.expArrMs, outMove.bookedArrMs) + dwell;
      const back = mk(model, link, backId, spec.consist, link.b, link.a, backDep, backDep + booked, dayTag, possessions);
      out.push(outMove, back);
      t = Math.max(back.expArrMs, back.bookedArrMs) + dwell;
    }
  }
  return out.sort((p, q) => p.depMs - q.depMs || p.pathId.localeCompare(q.pathId));
}

/** Network sheets carry the first departure for networks outside this timetable's full tables. */
function defaultFirstDep(link: SimLink): number {
  return 6 * 60 + (hash32(link.key) % 12) * 30;
}

function mk(model: SimModel, link: SimLink, pathId: string, consist: string, from: FacilityId, to: FacilityId, dep: number, bookedArr: number, dayTag: string, possessions: readonly PossessionSpec[]): Movement {
  void model;
  const exp = dep + runMs(link);
  const hit = possessions.find((p) => p.link === link.key && p.fromMs !== null && p.toMs !== null && dep < p.toMs && Math.max(exp, bookedArr) > p.fromMs);
  return {
    key: `${dayTag}:${pathId}`,
    pathId,
    kind: link.kind,
    link: link.key,
    consist,
    from,
    to,
    depMs: dep,
    bookedArrMs: bookedArr,
    expArrMs: exp,
    cancelled: hit ? `Possession ${hit.limits}` : null,
  };
}

export function statusOf(m: Movement, now: number): MoveStatus {
  if (m.cancelled) return 'CANCELLED';
  if (now < m.depMs) return 'BOOKED';
  if (now < m.expArrMs) return 'RUNNING';
  return 'ARRIVED';
}

/* ------------------------------------------------------------------ board */

export interface TrainState {
  id: string;
  kind: LinkKind;
  link: string;
  /** 0 at the link's canon a end. */
  pos: number;
  dir: 1 | -1;
  label: string;
  from: FacilityId;
  to: FacilityId;
  block: string;
  pathId: string;
  depMs: number;
  bookedArrMs: number;
  expArrMs: number;
  /** mph; null when not shown. */
  speed: number | null;
  /** Expected minus booked arrival, whole minutes; null when not shown. */
  runningMin: number | null;
  unbooked: boolean;
  /** Consist identity suppressed on the drawn board (Transit Control instruction). */
  suppressed: boolean;
}

export interface LogEntry {
  serial: number;
  ms: number;
  /** Full line, time first: "2131Z (1731 EDT) ...". */
  text: string;
  place: string;
  /** Present only for the segment 04 entry. */
  transient?: boolean;
}

export interface PossessionState extends PossessionSpec {
  status: 'PLANNED' | 'IN FORCE' | 'SURRENDERED' | 'CLOSED' | 'NO TIMES';
}

export interface BoardState {
  now: number;
  date: string;
  weekday: number;
  trains: TrainState[];
  /** Signalling block id -> state (only blocks that are not CLEAR). */
  blocks: Record<string, BlockState>;
  /** Line diagram keys: link key or "key#section". */
  occupancy: Record<string, 'CLEAR' | 'OCCUPIED' | 'POSSESSION' | 'DARK'>;
  movements: (Movement & { status: MoveStatus })[];
  log: LogEntry[];
  possessions: PossessionState[];
  seg04: { active: boolean; lit: number[]; start: number; end: number } | null;
}

export interface BoardOptions {
  timetable: Timetable | null;
  possessions: readonly PossessionSpec[];
  /** Movement window published by the narrative engine. */
  seg04: Seg04Window | null;
  /** Latest filed incident log serial and the in-world day it was filed. */
  logBase: { serial: number; day: number } | null;
  /** Consists that may appear in routine log entries when no timetable is loaded. */
  places: string[];
}

export function boardState(model: SimModel, now: number, opt: BoardOptions): BoardState {
  const today = utcDayStart(now);
  const weekday = inWorldWeekday(now);
  const prevWeekday = (weekday + 6) % 7;
  const tt = opt.timetable;
  const movesToday = tt ? expandDay(model, tt, today, weekday, opt.possessions) : [];
  const movesPrev = tt ? expandDay(model, tt, today - 86400_000, prevWeekday, opt.possessions) : [];
  const trains: TrainState[] = [];
  const blocks: Record<string, BlockState> = {};
  const occupancy: BoardState['occupancy'] = {};

  for (const l of model.links) if (!l.inService) occupancy[l.key] = 'DARK';

  for (const m of [...movesPrev, ...movesToday]) {
    if (m.cancelled || now < m.depMs || now >= m.expArrMs) continue;
    const link = model.byKey[m.link]!;
    const f = (now - m.depMs) / (m.expArrMs - m.depMs);
    const towardB = m.from === link.a;
    const pos = towardB ? f : 1 - f;
    const n = blockAt(link, pos);
    const id = blockId(link, n);
    blocks[id] = 'OCCUPIED';
    occupancy[`${link.key}#${sectionOf(link, n)}`] = 'OCCUPIED';
    trains.push({
      id: m.key,
      kind: link.kind,
      link: link.key,
      pos,
      dir: towardB ? 1 : -1,
      label: m.consist,
      from: m.from,
      to: m.to,
      block: id,
      pathId: m.pathId,
      depMs: m.depMs,
      bookedArrMs: m.bookedArrMs,
      expArrMs: m.expArrMs,
      speed: link.speedMph,
      runningMin: Math.round((m.expArrMs - m.bookedArrMs) / 60_000),
      unbooked: false,
      suppressed: false,
    });
  }

  const possessions: PossessionState[] = opt.possessions.map((p) => {
    const date = inWorldDateIso(now);
    let status: PossessionState['status'];
    if (p.fromMs === null || p.toMs === null) status = 'NO TIMES';
    else if (p.date < date) status = 'CLOSED';
    else if (p.date > date) status = 'PLANNED';
    else status = now < p.fromMs ? 'PLANNED' : now < p.toMs ? 'IN FORCE' : 'SURRENDERED';
    if (status === 'IN FORCE' && p.link) {
      const link = model.byKey[p.link];
      if (link) {
        occupancy[link.key] = 'POSSESSION';
        for (let n = 1; n <= link.blocks; n++) blocks[blockId(link, n)] = 'POSSESSED';
      }
    }
    return { ...p, status };
  });

  let seg04: BoardState['seg04'] = null;
  const seg = model.byKey[SEG04_NO];
  let seg04Entry: LogEntry | null = null;
  if (opt.seg04 && seg) {
    const w = opt.seg04;
    const ph = seg04Phase(w, now);
    if (ph.active) {
      for (const n of ph.lit) {
        blocks[seg04BlockId(n)] = 'OCCUPIED';
        occupancy[`${SEG04_NO}#${sectionOf(seg, n)}`] = 'OCCUPIED';
      }
      trains.push({
        id: 'SEG04-UNBOOKED',
        kind: 'RAIL',
        link: SEG04_NO,
        pos: ph.posFromA,
        dir: -1,
        label: SEG04_LABEL,
        from: seg.b,
        to: seg.a,
        block: seg04BlockId(ph.head),
        pathId: 'UNBOOKED',
        depMs: w.start,
        bookedArrMs: NaN,
        expArrMs: NaN,
        speed: null,
        runningMin: null,
        unbooked: true,
        suppressed: true,
      });
    }
    if (ph.logged) {
      seg04 = { active: ph.active, lit: ph.lit, start: w.start, end: w.end };
      seg04Entry = { serial: 0, ms: ph.headSince, text: seg04LogLine(ph.headSince, ph.active ? ph.head : seg.blocks), place: seg.b, transient: true };
    }
  }

  const log = incidentLog(model, now, opt, movesToday, seg04Entry);

  return {
    now,
    date: inWorldDateIso(now),
    weekday,
    trains,
    blocks,
    occupancy,
    movements: movesToday.map((m) => ({ ...m, status: statusOf(m, now) })),
    log,
    possessions,
    seg04,
  };
}

/* -------------------------------------------------------------- incident log */

const ROUTINE: ((r: () => number, c: string, site: string) => string)[] = [
  (r, _c, site) => `PLATFORM SCREEN DOOR ${1 + Math.floor(r() * 8)} FAILED TO CLOSE, ${site} PLATFORM ${1 + Math.floor(r() * 4)}. RESET BY PLATFORM SUPERVISOR. NO DELAY TO BOOKED PATHS.`,
  (r, c, site) => `CONSIST ${c} DOOR ${1 + Math.floor(r() * 6)} INDICATION FAULT AT ${site}. DOOR ISOLATED; CONSIST RAN IN SERVICE. DEPOT ADVISED.`,
  (r, _c, site) => `ESCALATOR E${1 + Math.floor(r() * 4)}, ${site} CONCOURSE, STOPPED ON SAFETY EDGE. RESTARTED BY FE AFTER INSPECTION.`,
  (_r, c, site) => `CONSIST ${c} LOADED BRAKE TEST AT ${site} COMPLETED SATISFACTORY BEFORE FIRST BOOKED PATH.`,
  (r, _c, site) => `PORTAL AIR HANDLING UNIT ${1 + Math.floor(r() * 4)}, ${site}: FILTER DIFFERENTIAL HIGH. FE ADVISED; FILTER CHANGE BOOKED.`,
  (r, _c, site) => `PUBLIC ADDRESS ZONE ${1 + Math.floor(r() * 9)}, ${site} PLATFORM, INAUDIBLE. FE ADVISED.`,
  (r, c, site) => `PASSENGER BOOKING DISCREPANCY ON CONSIST ${c}: TWO HOLDERS FOR SEAT ${1 + Math.floor(r() * 40)}. RESOLVED BY TRAVEL OFFICE ${site}.`,
];

/** Network Control (ALPHA-01) keeps the log in its own local time, as the engine's segment 04 line does. */
const LOG_ZONE = zoneForState('VA');

/** Routine entries per in-world day. */
export const LOG_PER_DAY = 3;

/** Serial of the first routine entry on in-world day `day`. */
export function firstSerialOn(day: number, base: { serial: number; day: number } | null): number {
  if (!base) return 1 + LOG_PER_DAY * (day - 1);
  return Math.max(1, base.serial + 1 + LOG_PER_DAY * (day - base.day - 1));
}

/** Today's routine entries (deterministic per in-world day), all times, unnumbered. */
export function routineEntries(model: SimModel, now: number, consists: string[], places: string[]): LogEntry[] {
  const day = inWorldDay(now);
  const r = rng(hash32(`INC:${inWorldDateIso(now)}`));
  const today = utcDayStart(now);
  const out: LogEntry[] = [];
  const sites = places.length ? places : model.links.filter((l) => l.kind === 'RAIL').map((l) => l.a);
  for (let i = 0; i < LOG_PER_DAY; i++) {
    const ms = today + Math.floor(r() * 1440) * 60_000;
    const site = sites[Math.floor(r() * sites.length)] ?? 'ALPHA-01';
    const c = consists.length ? consists[Math.floor(r() * consists.length)]! : 'R01-214';
    const tpl = ROUTINE[Math.floor(r() * ROUTINE.length)]!;
    out.push({ serial: 0, ms, text: `${hhmmZ(ms)} (${hhmmLocal(ms, LOG_ZONE)}) ${tpl(r, c, site)}`, place: site });
  }
  void day;
  return out.sort((p, q) => p.ms - q.ms);
}

/**
 * The live log: today's entries up to `now`, numbered. The segment 04 entry takes the next
 * serial while it stands; once withdrawn its serial is not reused, so later entries skip one.
 */
export function incidentLog(model: SimModel, now: number, opt: BoardOptions, movesToday: Movement[], seg04Entry: LogEntry | null): LogEntry[] {
  const consists = [...new Set(movesToday.map((m) => m.consist).filter(Boolean))];
  const routine = routineEntries(model, now, consists, opt.places);
  let serial = firstSerialOn(inWorldDay(now), opt.logBase);
  const seg04Start = opt.seg04 ? opt.seg04.start : null;
  const sameDay = seg04Start !== null && utcDayStart(seg04Start) === utcDayStart(now);
  const out: LogEntry[] = [];
  // The previous in-world day stays on the board until it rolls off (day 1 has none before it).
  const day = inWorldDay(now);
  if (day > 1) {
    const prev = routineEntries(model, now - 86400_000, consists, opt.places);
    let ps = firstSerialOn(day - 1, opt.logBase);
    for (const e of prev) out.push({ ...e, serial: ps++ });
  }
  let skipped = false;
  for (const e of routine) {
    if (sameDay && !skipped && e.ms >= seg04Start!) {
      if (seg04Entry) out.push({ ...seg04Entry, serial });
      serial++;
      skipped = true;
    }
    if (e.ms > now) break;
    out.push({ ...e, serial: serial++ });
  }
  if (sameDay && !skipped && seg04Entry) out.push({ ...seg04Entry, serial });
  return out.filter((e) => e.ms <= now).sort((p, q) => p.serial - q.serial);
}

/** "INC-08-018" */
export function incNo(serial: number): string {
  return `INC-08-${String(serial).padStart(3, '0')}`;
}

/** "2131Z (1631 CDT)" for a board entry at a facility. */
export function stamp(model: SimModel, ms: number, facility: string): string {
  return zAndLocal(ms, zoneOf(model, facility));
}

/* ------------------------------------------------------------- environment */

export interface EnvReading {
  block: string;
  tempF: number;
  rh: number;
  co2: number;
  airflow: number;
  state: BlockState;
}

/**
 * Tunnel environmental readings for one rail block: a slow deterministic drift about the
 * ventilation set points, raised while the block is occupied. Sensor model only.
 */
export function envReading(blockKey: string, now: number, state: BlockState): EnvReading {
  const h = hash32(blockKey);
  const slow = Math.sin(now / 1_800_000 + (h % 628) / 100);
  const occ = state === 'OCCUPIED' ? 1 : 0;
  const pos = state === 'POSSESSED' ? 1 : 0;
  return {
    block: blockKey,
    tempF: Math.round((61 + (h % 7) * 0.4 + slow * 0.6 + occ * 2.4 + pos * 0.8) * 10) / 10,
    rh: Math.round(48 + (h % 9) + slow * 2 + occ * 3),
    co2: Math.round(410 + (h % 40) + slow * 12 + occ * 380 + pos * 140),
    airflow: Math.round((5.8 + (h % 5) * 0.2 + slow * 0.1 - occ * 0.6) * 10) / 10,
    state,
  };
}
