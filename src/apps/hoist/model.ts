/**
 * Shaft Hoist Control: pure model. Kinematics (speed profile with acceleration and creep),
 * shaft vanes and limits, interlocks, per-account authority, and the reducers that change the
 * shared `hoist` state. No DOM, no services: the app passes the clock and context in.
 *
 * Figures: hoist speeds, accelerations, cage limits and landing depths come from canon
 * `hoists`; drive and plant parameters from canon `apps.hoist` (content/canon/apps/hoist.json).
 */
import canonJson from '@canon';
import type { Canon, Facility, FacilityLevel, Hoist } from '@core/canon-types';
import type { AccountId, DrillState } from '@core/contracts';
import type { DrillStateExt } from '@apps/drill/types';
import type { HoistCanon } from '@core/canon-apps/hoist';
import type { HoistEvent, HoistMode, HoistState, HoistUnit, Motion, RunMotion, StopMotion } from './types';

export const canon = canonJson as unknown as Canon;
export const HC = canon.apps.hoist as HoistCanon;
export const M = HC.model;

export const HOISTS: readonly Hoist[] = canon.hoists;
export const HOIST_SITES: readonly string[] = [...new Set(HOISTS.map((h) => h.facility))];

export const hoistById = (id: string): Hoist | undefined => HOISTS.find((h) => h.id === id);
export const hoistsAt = (facility: string): Hoist[] => HOISTS.filter((h) => h.facility === facility);
export const facilityById = (id: string): Facility | undefined => canon.facilities.find((f) => f.id === id);
export const levelOf = (facility: string, n: number): FacilityLevel | undefined => facilityById(facility)?.levels?.find((l) => l.n === n);

const fpmToFtps = (fpm: number): number => fpm / 60;
export const ftpsToFpm = (v: number): number => v * 60;

/* ------------------------------------------------------------------ kinematics */

export interface Profile {
  dist: number;
  a: number;
  /** Peak speed reached (rated speed unless the run is short). */
  vp: number;
  vc: number;
  tA: number;
  tC: number;
  tD: number;
  tK: number;
  total: number;
}

/**
 * Speed profile of a run of `dist` ft: accelerate at `a` to `v`, cruise, slow to creep speed
 * `vc`, creep the last `creepFt`. Short runs never reach rated speed (triangular profile); a run
 * shorter than the creep distance is made at creep speed throughout.
 */
export function runProfile(dist: number, v: number, a: number, vc: number, creepFt: number): Profile {
  const d = Math.max(0, dist);
  const creep = Math.min(creepFt, d);
  const rest = d - creep;
  let vp = v;
  const dAcc = (v * v) / (2 * a);
  const dDec = (v * v - vc * vc) / (2 * a);
  if (rest < dAcc + dDec) vp = Math.sqrt(Math.max(0, a * rest + (vc * vc) / 2));
  if (vp <= vc || creep <= 0) {
    // No creep phase to slow into: cruise at min(v, vp) with plain accel/decel (inching, tiny moves).
    if (creep >= d && vc > 0 && creepFt > 0) {
      const tK = d / vc;
      return { dist: d, a, vp: vc, vc, tA: 0, tC: 0, tD: 0, tK, total: tK };
    }
    const vpk = Math.min(v, Math.sqrt(a * d));
    const tA = vpk / a;
    const dA = (vpk * vpk) / (2 * a);
    const tC = vpk > 0 ? Math.max(0, d - 2 * dA) / vpk : 0;
    return { dist: d, a, vp: vpk, vc: 0, tA, tC, tD: tA, tK: 0, total: tA + tC + tA };
  }
  const tA = vp / a;
  const dA = (vp * vp) / (2 * a);
  const dD = (vp * vp - vc * vc) / (2 * a);
  const tC = Math.max(0, rest - dA - dD) / vp;
  const tD = (vp - vc) / a;
  const tK = creep / vc;
  return { dist: d, a, vp, vc, tA, tC, tD, tK, total: tA + tC + tD + tK };
}

/** Distance covered and speed at `t` seconds into the profile. */
export function profileAt(p: Profile, t: number): { d: number; v: number } {
  if (t <= 0) return { d: 0, v: 0 };
  if (t >= p.total) return { d: p.dist, v: 0 };
  const { a, vp, vc, tA, tC, tD } = p;
  if (t < tA) return { d: 0.5 * a * t * t, v: a * t };
  const dA = 0.5 * a * tA * tA;
  if (t < tA + tC) return { d: dA + vp * (t - tA), v: vp };
  const dC = dA + vp * tC;
  if (t < tA + tC + tD) {
    const s = t - tA - tC;
    return { d: dC + vp * s - 0.5 * a * s * s, v: vp - a * s };
  }
  const dD = dC + vp * tD - 0.5 * a * tD * tD;
  const s = t - tA - tC - tD;
  return { d: Math.min(p.dist, dD + vc * s), v: vc };
}

const profileOf = (m: RunMotion): Profile => runProfile(Math.abs(m.toFt - m.fromFt), m.vFtps, m.aFtps2, m.creepFtps, m.creepFt);

/** Wall-clock ms at which a motion ends. */
export function motionEnd(m: Motion): number {
  if (m.kind === 'run') return m.startedAt + profileOf(m).total * 1000;
  return m.startedAt + (Math.abs(m.v0) / m.decel) * 1000;
}

/** Where a stop motion comes to rest. */
export const stopRest = (m: StopMotion): number => m.fromFt + Math.sign(m.v0) * ((m.v0 * m.v0) / (2 * m.decel));

export interface CageNow {
  posFt: number;
  /** Signed rope speed, ft/s (+ = down). */
  v: number;
  moving: boolean;
}

/** Cage position and speed at wall time `now`. */
export function cageAt(unit: HoistUnit, now: number): CageNow {
  const m = unit.motion;
  if (!m) return { posFt: unit.posFt, v: 0, moving: false };
  const t = (now - m.startedAt) / 1000;
  if (m.kind === 'run') {
    const dir = Math.sign(m.toFt - m.fromFt) || 1;
    const p = profileOf(m);
    const { d, v } = profileAt(p, t);
    return { posFt: m.fromFt + dir * d, v: dir * v, moving: t > 0 && t < p.total };
  }
  const tStop = Math.abs(m.v0) / m.decel;
  const s = Math.min(Math.max(0, t), tStop);
  const sign = Math.sign(m.v0);
  const v = Math.abs(m.v0) - m.decel * s;
  const d = Math.abs(m.v0) * s - 0.5 * m.decel * s * s;
  return { posFt: m.fromFt + sign * d, v: sign * Math.max(0, v), moving: s < tStop };
}

/** Seconds a landing-to-landing run of `h` takes over `dist` ft. */
export const runSeconds = (h: Hoist, dist: number): number => runProfile(dist, fpmToFtps(h.speedFpm), accelOf(h), fpmToFtps(M.creepFpm), M.creepFt).total;

export const accelOf = (h: Hoist): number => fpmToFtps(h.speedFpm) / h.accelSec;

/* ------------------------------------------------------------------ shaft */

export interface Vane {
  depthFt: number;
  level: number | null;
  /** In the hoist's stop list. */
  listed: boolean;
  kind: 'landing' | 'level' | 'sump';
}

/**
 * Landing-zone vanes fitted in the shaft. One per listed landing; the personnel hoist shafts
 * also carry a vane at each Tier 1 level they pass (not in the stop list); a sump vane where
 * canon `apps.hoist.sumpVanes` records one.
 */
export function vanes(h: Hoist): Vane[] {
  const out: Vane[] = h.stops.map((s) => ({ depthFt: s.depthFt, level: s.level, listed: true, kind: 'landing' as const }));
  const top = h.stops[0]!.depthFt;
  const bottom = h.stops[h.stops.length - 1]!.depthFt;
  if (h.kind === 'personnel') {
    for (const l of facilityById(h.facility)?.levels ?? []) {
      const floor = l.topFt + l.heightFt;
      if (l.tier === 1 && floor > top && floor < bottom && !h.levels.includes(l.n)) out.push({ depthFt: floor, level: l.n, listed: false, kind: 'level' });
    }
  }
  for (const s of HC.sumpVanes.filter((x) => x.hoist === h.id)) out.push({ depthFt: bottom + s.belowBottomFt, level: null, listed: false, kind: 'sump' });
  return out.sort((a, b) => a.depthFt - b.depthFt);
}

/** Travel limits (final limit switches). */
export function limits(h: Hoist): { top: number; bottom: number } {
  const top = h.stops[0]!.depthFt - M.overtravelFt;
  const last = h.stops[h.stops.length - 1]!.depthFt;
  const sump = HC.sumpVanes.find((x) => x.hoist === h.id);
  return { top, bottom: last + (sump ? sump.finalLimitBelowBottomFt : M.overtravelFt) };
}

export const landingAt = (h: Hoist, pos: number): number | null =>
  h.stops.find((s) => Math.abs(s.depthFt - pos) <= M.levelToleranceFt)?.level ?? null;

export const zoneAt = (h: Hoist, pos: number): Vane | null => vanes(h).find((v) => Math.abs(v.depthFt - pos) <= M.landingZoneFt) ?? null;

export const stopDepth = (h: Hoist, level: number): number | null => h.stops.find((s) => s.level === level)?.depthFt ?? null;

/** "at landing 7" / "between landings 10 and 12" / "below landing 11": listed landings only. */
export function positionWords(h: Hoist, pos: number): string {
  const at = landingAt(h, pos);
  if (at != null) return `at landing ${at}`;
  const above = [...h.stops].reverse().find((s) => s.depthFt < pos);
  const below = h.stops.find((s) => s.depthFt > pos);
  if (above && below) return `between landings ${above.level} and ${below.level}`;
  if (above) return `below landing ${above.level}`;
  return `above landing ${below!.level}`;
}

/* ------------------------------------------------------------------ state */

/** Default parking: personnel hoist at the first landing below the collar, freight/vehicle at the bottom, egress at the collar. */
export function defaultUnit(h: Hoist): HoistUnit {
  const stop = h.kind === 'personnel' ? (h.stops[1] ?? h.stops[0]!) : h.kind === 'egress' ? h.stops[0]! : h.stops[h.stops.length - 1]!;
  return {
    id: h.id,
    posFt: stop.depthFt,
    motion: null,
    mode: h.kind === 'personnel' ? 'auto' : 'manual',
    gates: 'closed',
    persons: 0,
    freightLb: 0,
    calls: [],
    trip: null,
    brakeTest: null,
    brakeTesting: null,
    dwellUntil: null,
  };
}

export const EMPTY_STATE: HoistState = { v: 1, seq: 0, units: {}, events: [] };

export const unitOf = (s: HoistState | null | undefined, h: Hoist): HoistUnit => s?.units?.[h.id] ?? defaultUnit(h);

export const loadLb = (u: HoistUnit): number => u.persons * M.personLb + u.freightLb;
export const overloaded = (u: HoistUnit, h: Hoist): boolean => loadLb(u) > h.payloadLb || u.persons > h.cagePersons;

function put(s: HoistState, u: HoistUnit): HoistState {
  return { ...s, units: { ...s.units, [u.id]: u } };
}

function event(s: HoistState, at: number, hoist: string, kind: HoistEvent['kind'], text: string, by: HoistEvent['by']): HoistState {
  const seq = s.seq + 1;
  const events = [...s.events, { seq, at, hoist, kind, text, by }];
  return { ...s, seq, events: events.length > M.recorderEvents ? events.slice(events.length - M.recorderEvents) : events };
}

const norm = (s: HoistState | null | undefined): HoistState => (s && s.v === 1 ? s : EMPTY_STATE);

/* ------------------------------------------------------------------ other apps' plant state */

/**
 * ALPHA sites whose portal is sealed by the seal drill now: status 'sealing' or 'sealed' while
 * the drill is propagating or held sealed. When no coordinator has evaluated the drill for a few
 * seconds, the status is derived from the drill plan with the coordinator's rule
 * (src/apps/drill/types.ts).
 */
export function sealedSites(d: DrillState | null | undefined, now: number): Set<string> {
  const out = new Set<string>();
  if (!d || (d.phase !== 'propagating' && d.phase !== 'sealed')) return out;
  const ext = d as Partial<DrillStateExt>;
  const stale = ext.tickedAt != null && ext.plan != null && ext.msPerMin != null && now - ext.tickedAt > 5000;
  for (const fid of HOIST_SITES) {
    let st = d.sites[fid]?.status;
    const p = stale ? ext.plan![fid] : undefined;
    if (p) {
      const t = (now - d.orderedAt) / ext.msPerMin!;
      if (p.ack != null && t >= p.ack) st = p.sealed != null && t >= p.sealed ? 'sealed' : t >= p.deadline ? 'no-report' : p.doorsDone == null ? 'acknowledged' : 'sealing';
      else st = t >= p.deadline ? 'no-report' : 'pending';
    }
    if (st === 'sealing' || st === 'sealed') out.add(fid);
  }
  return out;
}

/* ------------------------------------------------------------------ interlocks and authority */

export interface PlantCtx {
  now: number;
  /** Network isolation in force (remote control from workstations is lost). */
  isolated: boolean;
  /** Sites whose portal is sealed by a seal drill. */
  sealed: ReadonlySet<string>;
  /** In-world date label, "19 MAY 2008" (brake test due rule). */
  dateLabel: string;
}

export const portalLevel = (h: Hoist): number => h.stops[0]!.level;

export interface Interlocks {
  gates: boolean;
  load: boolean;
  seal: boolean;
  remote: boolean;
  trip: boolean;
  brake: boolean;
  ready: boolean;
}

export function interlocks(u: HoistUnit, h: Hoist, ctx: PlantCtx): Interlocks {
  const gates = u.gates === 'closed';
  const load = !overloaded(u, h);
  const seal = !ctx.sealed.has(h.facility);
  const remote = !ctx.isolated;
  const trip = u.trip == null;
  const brake = u.brakeTest?.date === ctx.dateLabel;
  return { gates, load, seal, remote, trip, brake, ready: gates && load && trip && u.brakeTesting == null };
}

/** Why a run of `h` to `level` cannot start now (in-world wording), or null. */
export function runRefusal(u: HoistUnit, h: Hoist, level: number, ctx: PlantCtx): string | null {
  const c = cageAt(u, ctx.now);
  if (u.trip) return u.trip.cause === 'estop' ? 'The hoist is tripped by an emergency stop. Trip reset is required before the cage can be run.' : 'The cage is on the final limit. Trip reset is required before the cage can be run.';
  if (c.moving || (u.motion && ctx.now < motionEnd(u.motion))) return 'The cage is in motion. Stop the cage before selecting another landing.';
  if (u.brakeTesting) return 'A brake test is in progress. The drive is held until the test completes.';
  if (stopDepth(h, level) == null) return `Landing ${level} is not in the stop list of ${h.id}.`;
  if (landingAt(h, c.posFt) === level) return `The cage is at landing ${level}.`;
  if (u.gates !== 'closed') return 'Landing and cage gates are open. Gates must be closed and proved before the drive will run.';
  if (overloaded(u, h)) return `Load weighing reads above the rated payload of ${h.payloadLb.toLocaleString('en-US')} lb or ${h.cagePersons} persons. The drive will not run until the cage is unloaded.`;
  if (ctx.sealed.has(h.facility) && level === portalLevel(h)) return `The portal landing (level ${level}) is sealed for the seal drill. Runs to the portal are held until stand-down.`;
  return null;
}

export interface Authority {
  /** Calls can be registered from this workstation. */
  call: boolean;
  /** Driver's console (run, stop, mode, gates, load, brake test, reset). */
  drive: boolean;
  estop: boolean;
  /** In-world reason when a function is refused. */
  why: string;
}

export interface Who {
  id: AccountId;
  /** Issued tier (account definition), not the acting tier. */
  tier: number;
  site: string;
}

export function authority(who: Who, h: Hoist, isolated: boolean): Authority {
  const own = who.site === h.facility;
  if (isolated) {
    return {
      call: false,
      drive: false,
      estop: false,
      why: 'Remote control is lost while the network is isolated: hub and site control circuits are down. The hoist runs on local control from the winder house only.',
    };
  }
  if (!own) {
    return {
      call: false,
      drive: false,
      estop: false,
      why: `${h.facility} hoists are displayed for information. Calls and controls are accepted only from workstations at ${h.facility}.`,
    };
  }
  const drive = who.tier <= M.driverMaxTier;
  return {
    call: true,
    drive,
    estop: true,
    why: drive ? '' : `The driver's console of ${h.id} is operated by the duty hoist driver or the site command. This workstation may register landing calls and use the emergency stop.`,
  };
}

/** Access requirement of a landing for this session: null when open, else the release key and wording. */
export function landingRestriction(h: Hoist, level: number, satisfies: (key: string) => boolean): { key: string; text: string } | null {
  const l = levelOf(h.facility, level);
  if (l && l.tier <= 2 && !satisfies(`T${l.tier}`)) {
    return { key: `T${l.tier}`, text: `Landing ${level} is a Tier ${l.tier} level. Calls to it are made through the escort desk by personnel holding a Tier ${l.tier} access determination.` };
  }
  const comp = HC.landingCompartments.find((c) => c.facility === h.facility && c.level === level);
  if (comp && !satisfies(comp.compartment)) {
    return { key: comp.compartment, text: `Landing ${level} is restricted to ${comp.compartment} holders. Calls from other badges are not registered.` };
  }
  return null;
}

/* ------------------------------------------------------------------ reducers */

const fmtFt = (n: number): string => Math.round(n).toLocaleString('en-US');

export function call(prev: HoistState | null, h: Hoist, level: number, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  if (u.calls.includes(level)) return s;
  s = put(s, { ...u, calls: [...u.calls, level] });
  return event(s, now, h.id, 'call', `Call registered, landing ${level}.`, by);
}

export function cancelCalls(prev: HoistState | null, h: Hoist, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  if (!u.calls.length) return s;
  s = put(s, { ...u, calls: [] });
  return event(s, now, h.id, 'call', 'Registered calls cancelled at the console.', by);
}

function runMotion(h: Hoist, mode: HoistMode, fromFt: number, toFt: number, toLevel: number | null, startedAt: number, by: AccountId | 'auto'): RunMotion {
  const insp = mode === 'inspection';
  const v = fpmToFtps(insp ? Math.min(M.inspectionFpm, h.speedFpm) : h.speedFpm);
  const creep = toLevel != null && !insp;
  return { kind: 'run', fromFt, toFt, toLevel, startedAt, vFtps: v, aFtps2: accelOf(h), creepFtps: creep ? fpmToFtps(M.creepFpm) : 0, creepFt: creep ? M.creepFt : 0, by };
}

/** Start a run to `level` (callers check runRefusal first). */
export function run(prev: HoistState | null, h: Hoist, level: number, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  const to = stopDepth(h, level);
  if (to == null) return s;
  const from = cageAt(u, now).posFt;
  s = put(s, { ...u, posFt: from, motion: runMotion(h, u.mode, from, to, level, now, by), dwellUntil: null });
  return event(s, now, h.id, 'run', `Run ordered ${positionWords(h, from)} to landing ${level} (${fmtFt(to)} ft).`, by);
}

/** Inspection inching toward a travel limit (released with stop()). */
export function inch(prev: HoistState | null, h: Hoist, dir: 1 | -1, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  const from = cageAt(u, now).posFt;
  const lim = limits(h);
  const to = dir > 0 ? lim.bottom : lim.top;
  if (Math.abs(to - from) < 0.05) return s;
  s = put(s, { ...u, posFt: from, motion: runMotion(h, 'inspection', from, to, null, now, by) });
  return event(s, now, h.id, 'inch', `Inspection inching ${dir > 0 ? 'down' : 'up'} from ${fmtFt(from)} ft.`, by);
}

/**
 * Stop the cage: a controlled stop on the drive, or an emergency stop on the brake (which
 * trips the hoist). Returns the state and the depth the cage comes to rest at.
 */
export function stop(prev: HoistState | null, h: Hoist, cause: 'stop' | 'estop', by: AccountId, now: number): { state: HoistState; restFt: number } {
  let s = norm(prev);
  const u = unitOf(s, h);
  const c = cageAt(u, now);
  const decel = cause === 'estop' ? M.estopDecelFtps2 : accelOf(h);
  let next: HoistUnit;
  let rest = c.posFt;
  if (c.moving && Math.abs(c.v) > 0.01) {
    const m: StopMotion = { kind: 'stop', fromFt: c.posFt, v0: c.v, startedAt: now, decel, cause, by };
    rest = stopRest(m);
    next = { ...u, posFt: c.posFt, motion: m };
  } else {
    next = { ...u, posFt: c.posFt, motion: null };
  }
  if (cause === 'estop') {
    next = { ...next, trip: { cause: 'estop', at: now, by, returnAt: now + M.estopInspectionMin * 60_000 }, calls: [], brakeTesting: null };
  }
  s = put(s, next);
  const where = positionWords(h, rest);
  const text =
    cause === 'estop'
      ? `Emergency stop. Brake applied at ${fmtFt(c.posFt)} ft, ${fmtFt(ftpsToFpm(Math.abs(c.v)))} fpm; cage at rest ${where} (${fmtFt(rest)} ft). Hoist tripped.`
      : `Controlled stop at ${fmtFt(c.posFt)} ft; cage at rest ${where} (${fmtFt(rest)} ft).`;
  return { state: event(s, now, h.id, cause === 'estop' ? 'estop' : 'stop', text, by), restFt: rest };
}

export function reset(prev: HoistState | null, h: Hoist, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  if (!u.trip) return s;
  s = put(s, { ...u, trip: null });
  return event(s, now, h.id, 'reset', `Trip reset at the console (${u.trip.cause === 'estop' ? 'emergency stop' : 'final limit'}).`, by);
}

export function setMode(prev: HoistState | null, h: Hoist, mode: HoistMode, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  if (u.mode === mode) return s;
  s = put(s, { ...u, mode, dwellUntil: null });
  return event(s, now, h.id, 'mode', `Mode selector to ${mode.toUpperCase()}.`, by);
}

export function setGates(prev: HoistState | null, h: Hoist, gates: 'open' | 'closed', by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  if (u.gates === gates) return s;
  const at = landingAt(h, cageAt(u, now).posFt);
  s = put(s, { ...u, gates });
  return event(s, now, h.id, 'gates', `Gates ${gates === 'open' ? 'opened' : 'closed'}${at != null ? ` at landing ${at}` : ''}.`, by);
}

export function setLoad(prev: HoistState | null, h: Hoist, persons: number, freightLb: number, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  const p = Math.max(0, Math.round(persons));
  const f = Math.max(0, freightLb);
  if (p === u.persons && f === u.freightLb) return s;
  const next = { ...u, persons: p, freightLb: f };
  s = put(s, next);
  const over = overloaded(next, h) && !overloaded(u, h);
  s = event(s, now, h.id, 'load', `Onsetter's report: ${p} persons, ${fmtFt(f)} lb freight; load cell ${fmtFt(loadLb(next))} lb.`, by);
  return over ? event(s, now, h.id, 'overload', `Overload: ${fmtFt(loadLb(next))} lb, ${p} persons, against ${fmtFt(h.payloadLb)} lb / ${h.cagePersons} persons rated.`, 'local') : s;
}

export function startBrakeTest(prev: HoistState | null, h: Hoist, by: AccountId, now: number): HoistState {
  let s = norm(prev);
  const u = unitOf(s, h);
  s = put(s, { ...u, brakeTesting: { until: now + M.brakeTestSec * 1000, by } });
  return event(s, now, h.id, 'brake', `Static brake test started: drive torque ${M.brakeTestTorquePct}% of rated load against the holding brake.`, by);
}

/** Deterministic 0..1 from a string (shared by every tab, so they agree on simulated loads). */
export function hash01(str: string): number {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) {
    x ^= str.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return (x >>> 0) / 4294967295;
}

export interface Finished {
  hoist: string;
  restFt: number;
  by: AccountId | 'auto';
  kind: Motion['kind'];
}

/**
 * Advance the plant to `now`: finish motions that have ended, apply the final limit, return
 * tripped hoists to service from the winder house, complete brake tests, and run AUTO mode
 * (open gates at a called landing, dwell, close and serve the next call). Pure and idempotent:
 * every tab may call it; the same inputs give the same state.
 */
export function settle(prev: HoistState | null, ctx: PlantCtx): { state: HoistState; changed: boolean; finished: Finished[] } {
  let s = norm(prev);
  const start = s;
  const finished: Finished[] = [];
  const now = ctx.now;
  for (const h of HOISTS) {
    let u = unitOf(s, h);
    // 1. motion complete
    if (u.motion && now >= motionEnd(u.motion)) {
      const m = u.motion;
      const rest = m.kind === 'run' ? m.toFt : stopRest(m);
      const lim = limits(h);
      const onLimit = m.kind === 'run' && m.toLevel == null && (Math.abs(rest - lim.bottom) < 0.05 || Math.abs(rest - lim.top) < 0.05);
      u = { ...u, posFt: rest, motion: null };
      if (m.kind === 'run' && m.toLevel != null) {
        s = put(s, u);
        s = event(s, motionEnd(m), h.id, 'arrive', `Arrived landing ${m.toLevel} (${fmtFt(rest)} ft).`, m.by);
      } else if (onLimit) {
        u = { ...u, trip: { cause: 'overtravel', at: now, by: m.by === 'auto' ? 'deputy' : m.by, returnAt: null } };
        s = put(s, u);
        s = event(s, motionEnd(m), h.id, 'limit', `Final limit reached at ${fmtFt(rest)} ft. Hoist tripped.`, 'local');
      } else {
        s = put(s, u);
      }
      finished.push({ hoist: h.id, restFt: rest, by: m.by, kind: m.kind });
    }
    // 2. return to service after inspection (winder house)
    if (u.trip?.returnAt != null && now >= u.trip.returnAt && !u.motion) {
      u = { ...u, trip: null };
      s = put(s, u);
      s = event(s, now, h.id, 'return', 'Returned to service by the duty hoist engineer after rope and brake inspection.', 'local');
    }
    // 3. brake test complete
    if (u.brakeTesting && now >= u.brakeTesting.until) {
      const by = u.brakeTesting.by;
      u = { ...u, brakeTesting: null, brakeTest: { at: u.brakeTesting.until, date: ctx.dateLabel, by, result: `PASS. Brake held ${M.brakeTestTorquePct}% torque; no rope creep recorded.` } };
      s = put(s, u);
      s = event(s, now, h.id, 'brake', `Static brake test complete: PASS at ${M.brakeTestTorquePct}% torque.`, by);
    }
    // 4. AUTO mode
    if (u.mode === 'auto' && !u.motion && !u.trip && !u.brakeTesting) {
      const at = landingAt(h, u.posFt);
      if (at != null && u.calls.includes(at)) {
        const r = hash01(`${h.id}:${at}:${s.seq}`);
        const persons = Math.floor(r * h.cagePersons * (M.autoLoadMaxPct / 100));
        u = { ...u, calls: u.calls.filter((c) => c !== at), gates: 'open', dwellUntil: now + M.dwellSec * 1000, persons, freightLb: 0 };
        s = put(s, u);
        s = event(s, now, h.id, 'gates', `Call answered at landing ${at}. Gates opened; ${persons} persons on the load cell.`, 'auto');
      } else if (u.calls.length && (u.dwellUntil == null || now >= u.dwellUntil)) {
        const targets = u.calls.filter((c) => !(ctx.sealed.has(h.facility) && c === portalLevel(h)) && c !== at);
        const pos = u.posFt;
        const target = targets.map((c) => ({ c, d: Math.abs((stopDepth(h, c) ?? pos) - pos) })).sort((a, b) => a.d - b.d)[0]?.c;
        if (target != null && !overloaded(u, h)) {
          const startAt = u.gates === 'open' ? now + M.gateCycleSec * 1000 : now;
          u = { ...u, gates: 'closed', dwellUntil: null, motion: runMotion(h, 'auto', pos, stopDepth(h, target)!, target, startAt, 'auto') };
          s = put(s, u);
          s = event(s, now, h.id, 'run', `Automatic run ${positionWords(h, pos)} to landing ${target}.`, 'auto');
        }
      }
    }
  }
  return { state: s, changed: s !== start, finished };
}
