/**
 * Dispatcher Workstation: pure desk logic (no DOM, no signals). Route building, interlocking
 * checks, consist positions, record changes. The run model itself (positions, holds,
 * conflicts) is in src/sim/transit-model.ts so Transit Control and this desk agree.
 */
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { DispatchCanon, DispatchMode, StockCanon } from '@core/canon-apps/dispatch';
import type { AccountId, DrillState, IsolationState } from '@core/contracts';
import {
  drillNow,
  isolationNow,
  linkBetween,
  occupations,
  routeConflicts,
  runLegs,
  runState,
  shortestRoute,
  type Conflict,
  type HoldSource,
  type LinkKind,
  type Movement,
  type PlantInput,
  type PossessionSpec,
  type RunLeg,
  type RunState,
  type SimModel,
} from '@sim/transit-model';
import type { DispatchHold, DispatchRecord, DispatchSystem } from './types';

const canon = canonJson as unknown as Canon;
export const DSP = (canon.apps as Record<string, unknown>).dispatch as DispatchCanon;
export const SEG04 = DSP.seg04;

export function modeFor(account: AccountId): DispatchMode {
  return DSP.modes[account];
}

/** Seg 04 key switch positions (index into DSP.seg04.positions). */
export const KEY_NORMAL = 0;
export const KEY_ENGRG = 1;
export const KEY_INSTR = 2;

export function plantOf(isolation: IsolationState | null | undefined, drill: DrillState | null | undefined): PlantInput {
  return { isolation: isolation ?? null, drill: drill ?? null };
}

export function dwellMsFor(system: DispatchSystem): number {
  return (system === 'RAIL' ? DSP.working.dwellMin.rail : DSP.working.dwellMin.tram) * 60_000;
}

export const RULES = {
  headwayBlocks: DSP.working.headwayBlocks,
  tramLoopMinMiles: DSP.working.tramLoopMinMiles,
  loopTolerance: DSP.working.loopTolerance,
};

/* ------------------------------------------------------------------ route */

export type StepResult =
  | { ok: true; route: string[]; system: DispatchSystem }
  | { ok: false; code: 'seg04' | 'seg04-engrg' | 'mixed' | 'no-link' | 'loop'; text: string; link?: string };

function seg04Refusal(keyPos: number): StepResult {
  if (keyPos === KEY_ENGRG)
    return {
      ok: false,
      code: 'seg04-engrg',
      link: SEG04.segment,
      text: `Engineering working over segment ${SEG04.segment} is permitted only inside a possession in force on the segment. No possession is in force. Route not set.`,
    };
  return {
    ok: false,
    code: 'seg04',
    link: SEG04.segment,
    text: `Segment ${SEG04.segment} is not in revenue service. The interlocking does not accept a route over it. Route not set.`,
  };
}

/** Extend a route by one node (step mode). */
export function stepRoute(model: SimModel, route: readonly string[], node: string, keyPos: number): StepResult {
  if (!route.length) return { ok: true, route: [node], system: 'RAIL' };
  const last = route[route.length - 1]!;
  if (node === last) return { ok: true, route: [...route], system: systemOf(model, route) ?? 'RAIL' };
  const link = linkBetween(model, last, node);
  if (!link) return { ok: false, code: 'no-link', text: `${last} and ${node} are not joined by a rail segment or tram link.` };
  if (route.includes(node)) return { ok: false, code: 'loop', text: `${node} is already on the route. A route does not return through a platform it has left.` };
  const sys = systemOf(model, route);
  if (sys && sys !== link.kind) return { ok: false, code: 'mixed', text: 'A route is set over one system. Rail consists do not work tram links and tram consists do not work rail segments.' };
  if (!link.inService && !(link.key === SEG04.segment && keyPos === KEY_INSTR)) return seg04Refusal(keyPos);
  return { ok: true, route: [...route, node], system: link.kind };
}

/** Origin-to-destination route by the shortest in-service path (rail between hubs, otherwise tram). */
export function autoRoute(model: SimModel, from: string, to: string, keyPos: number = KEY_NORMAL): StepResult {
  if (from === to) return { ok: false, code: 'loop', text: 'Origin and destination are the same platform.' };
  const direct = linkBetween(model, from, to);
  if (direct && !direct.inService) return stepRoute(model, [from], to, keyPos);
  const order: LinkKind[] = from.startsWith('ALPHA') && to.startsWith('ALPHA') ? ['RAIL', 'TRAM'] : ['TRAM', 'RAIL'];
  for (const sys of order) {
    const r = shortestRoute(model, from, to, sys);
    if (r) return { ok: true, route: r, system: sys };
  }
  return { ok: false, code: 'no-link', text: `No route in revenue service joins ${from} and ${to} on one system.` };
}

export function systemOf(model: SimModel, route: readonly string[]): DispatchSystem | null {
  if (route.length < 2) return null;
  return linkBetween(model, route[0]!, route[1]!)?.kind ?? null;
}

export function routeLinks(model: SimModel, route: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < route.length; i++) out.push(linkBetween(model, route[i]!, route[i + 1]!)?.key ?? '');
  return out;
}

export function crossesSeg04(model: SimModel, route: readonly string[]): boolean {
  return routeLinks(model, route).includes(SEG04.segment);
}

export function routeMiles(model: SimModel, route: readonly string[]): number {
  return routeLinks(model, route).reduce((n, k) => n + (model.byKey[k]?.miles ?? 0), 0);
}

/* ------------------------------------------------------------------ stock */

export interface StockPosition {
  stock: StockCanon;
  /** Platform where the consist stands, or null while it is out on a run. */
  at: string | null;
  /** Dispatch record working it now, if any. */
  busy: DispatchRecord | null;
}

/** Where each consist is: its stabling point, the end of its last dispatched run, or out on a run. */
export function stockPositions(model: SimModel, recs: readonly DispatchRecord[], plant: PlantInput, now: number): StockPosition[] {
  return DSP.stock.map((stock) => {
    let at: string | null = stock.stabled;
    let busy: DispatchRecord | null = null;
    for (const r of recs) {
      if (r.consist !== stock.id) continue;
      const st = runState(model, r, plant, now);
      if (st.status === 'arrived') at = r.route[r.route.length - 1]!;
      else if (st.status === 'cancelled') at = r.endNode ?? st.atNode ?? at;
      else {
        busy = r;
        at = null;
      }
    }
    return { stock, at, busy };
  });
}

/* ------------------------------------------------------------- interlocking */

export interface RouteCheck {
  legs: RunLeg[];
  conflicts: Conflict[];
  isolation: { ref: string } | null;
  drill: { ref: string } | null;
}

export function checkRoute(
  model: SimModel,
  route: readonly string[],
  departAt: number,
  moves: readonly Movement[],
  recs: readonly DispatchRecord[],
  possessions: readonly PossessionSpec[],
  plant: PlantInput,
  now: number,
  scale = 1,
): RouteCheck {
  const sys = systemOf(model, route) ?? 'RAIL';
  const legs = runLegs(model, route, dwellMsFor(sys)) ?? [];
  const occ = occupations(model, moves, recs, plant, now);
  const conflicts = routeConflicts(model, legs, departAt, occ, possessions, RULES, scale);
  return { legs, conflicts, isolation: isolationNow(plant, now), drill: drillNow(plant) };
}

export function conflictText(c: Conflict): string {
  const where = /^\d{2}$/.test(c.link) ? `segment ${c.link}` : `tram link ${c.link.replace('>', ' to ')}`;
  switch (c.kind) {
    case 'possession':
      return `Possession ${c.with} in force on ${where}.`;
    case 'opposing':
      return `Opposing movement ${c.with} on ${where} (single line; no crossing at the loop).`;
    case 'headway':
      return `Movement ${c.with} on ${where} in the same direction inside minimum headway.`;
  }
}

/* ---------------------------------------------------------------- records */

/** "DSP-A02-0519-003": prefix, in-world month and day, serial for the day. */
export function nextRef(prefix: string, dateIso: string, recs: readonly { ref: string }[]): string {
  const day = `${dateIso.slice(5, 7)}${dateIso.slice(8, 10)}`;
  const head = `${prefix}-${day}-`;
  let max = 0;
  for (const r of recs) if (r.ref.startsWith(head)) max = Math.max(max, Number(r.ref.slice(head.length)) || 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

export function newRecord(args: {
  ref: string;
  by: AccountId;
  consist: string;
  model: SimModel;
  route: string[];
  departAt: number;
  instruction?: string;
  timeScale?: number;
  desk: string;
}): DispatchRecord {
  const system = systemOf(args.model, args.route) ?? 'RAIL';
  const rec: DispatchRecord = {
    id: args.instruction ? SEG04.suppressedLabel : args.consist,
    by: args.by,
    route: args.route,
    departAt: args.departAt,
    status: 'scheduled',
    ref: args.ref,
    consist: args.consist,
    system,
    links: routeLinks(args.model, args.route),
    dwellMs: dwellMsFor(system),
    clock: { at: args.departAt, elapsed: 0 },
    holds: [],
    released: [],
    notified: [],
    desk: args.desk,
  };
  if (args.instruction) {
    rec.instruction = args.instruction;
    rec.note = `Entered under instruction ${args.instruction}. Not booked against the working timetable.`;
  }
  if (args.timeScale) rec.timeScale = args.timeScale;
  return rec;
}

/**
 * Housekeeping the desk does on every tick: latch holds that have reached a train, keep the
 * stored status in step with the run model, withdraw instruction records after arrival.
 * Returns the same object when nothing changed.
 */
export function settle(model: SimModel, r: DispatchRecord, plant: PlantInput, now: number): DispatchRecord {
  if (r.status === 'cancelled' || r.withdrawn) return r;
  const st = runState(model, r, plant, now);
  let next = r;
  const latch = [...st.heldBy, ...st.pending].filter((h) => h.kind !== 'manual' && !r.holds.some((x) => x.ref === h.ref));
  if (latch.length) next = { ...next, holds: [...next.holds, ...latch.map((h): DispatchHold => ({ ref: h.ref, kind: h.kind, at: h.at }))] };
  if (st.status !== next.status) next = { ...next, status: st.status };
  if (next.instruction && st.status === 'arrived') {
    const arrived = r.clock.at + (st.total - r.clock.elapsed) / (r.timeScale ?? 1);
    if (now - arrived >= SEG04.withdrawAfterMs) next = { ...next, withdrawn: true, note: `Indication record withdrawn by Transit Control on instruction ${next.instruction}.` };
  }
  return next;
}

/** Release a held train: every hold on it must have cleared (a dispatcher's own hold always may be released). */
export function releaseCheck(st: RunState): { ok: true; refs: string[] } | { ok: false; standing: HoldSource[] } {
  const standing = st.heldBy.filter((h) => h.active && h.kind !== 'manual');
  if (standing.length) return { ok: false, standing };
  return { ok: true, refs: [...st.heldBy, ...st.pending.filter((h) => h.kind === 'manual')].map((h) => h.ref) };
}

export function release(r: DispatchRecord, st: RunState, refs: string[], now: number): DispatchRecord {
  return { ...r, clock: { at: now, elapsed: st.elapsed }, released: [...new Set([...r.released, ...refs])], status: 'running' };
}

export function manualHold(r: DispatchRecord, now: number): DispatchRecord {
  const n = r.holds.filter((h) => h.kind === 'manual').length + 1;
  return { ...r, holds: [...r.holds, { ref: `MAN-${n}`, kind: 'manual', at: now }] };
}

/** A train may be cancelled while it stands at a platform (scheduled, dwelling or held there). */
export function cancelCheck(st: RunState): boolean {
  return st.status !== 'arrived' && st.status !== 'cancelled' && !st.onLink && st.atNode !== null;
}

export function cancel(r: DispatchRecord, st: RunState): DispatchRecord {
  return { ...r, status: 'cancelled', endNode: st.atNode ?? r.route[0], note: `Cancelled at ${st.atNode ?? r.route[0]}.` };
}

/** Where a train is, in words: "ALPHA-02 platform", "Seg 03 block 03-07", "Tram link ... block 2". */
export function placeText(st: RunState, model: SimModel): string {
  if (st.onLink) {
    const l = model.byKey[st.onLink.link]!;
    return l.kind === 'RAIL' ? `Segment ${l.key}, ${st.onLink.from} to ${st.onLink.to}` : `Tram ${st.onLink.from} to ${st.onLink.to}`;
  }
  return st.atNode ? `${st.atNode} platform` : '--';
}
