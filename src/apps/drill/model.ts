/**
 * Seal drill model: pure functions, no DOM, no signals.
 *
 * Every timing is canon: class acknowledge / door cycle / seal times, relay offsets and the
 * receipt order are canon `sealDrill`; the reasons a site runs late or gives no report are
 * canon facts read through the rules in canon.apps.drill (one duty officer posted, completion
 * date against the in-world date, a calendar entry in session, an order wire), and isolation
 * cuts the hub circuits. The same inputs always give the same drill.
 */
import type { CalendarEvent, Canon, DrillClassId, FacilityId } from '@core/canon-types';
import type { DrillCanon } from '@core/canon-apps/drill';
import type { AccountId } from '@core/contracts';
import type { DrillRecord, DrillStateExt, SiteCause, SitePlan, SiteStatus } from './types';

export type ModelCanon = Pick<Canon, 'sealDrill' | 'facilities' | 'railSegments' | 'calendar' | 'meta'>;

const EPS = 1e-9;

/** "ALPHA-05" -> "A05" */
export function shortId(id: string): string {
  const m = /^([A-Z])[A-Z]*-(\d{2})$/.exec(id);
  return m ? `${m[1]}${m[2]}` : id;
}

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return (y ?? 0) * 12 + ((m ?? 1) - 1);
}

/** Whole months from a site's completion ("2008-04") to the in-world date ("2008-05-19"). */
export function monthsSince(completed: string | null, inWorldIso: string): number | null {
  if (!completed || !/^\d{4}-\d{2}/.test(completed)) return null;
  return monthIndex(inWorldIso.slice(0, 7)) - monthIndex(completed.slice(0, 7));
}

function hhmmOf(z: string | null): number | null {
  const m = z ? /^(\d{2})(\d{2})Z$/.exec(z) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Is calendar entry `ev` in session at wall time `ms` on the in-world date? */
export function calendarInSession(ev: CalendarEvent | undefined, through: string, inWorldIso: string, ms: number): boolean {
  if (!ev) return false;
  const day = inWorldIso.slice(0, 10);
  if (day < ev.date || day > through) return false;
  const a = hhmmOf(ev.startZ);
  const b = hhmmOf(ev.endZ);
  if (a === null || b === null) return false;
  const d = new Date(ms);
  const m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

/** Circuit the order reached `fac` on. */
export function relayCircuit(c: ModelCanon, step: { facility: FacilityId; via: FacilityId | null; relay: SitePlan['relay'] }): string {
  switch (step.relay) {
    case 'origin':
      return 'NETWORK CONTROL';
    case 'rail': {
      const seg = c.railSegments.find((s) => (s.a === step.via && s.b === step.facility) || (s.b === step.via && s.a === step.facility));
      return seg ? `INTER-HUB SEG ${seg.no}` : 'INTER-HUB';
    }
    case 'tram':
      return `TRAM ${shortId(step.via ?? '')}>${shortId(step.facility)}`;
    case 'voice':
      return `VOICE ${shortId(c.sealDrill.origin)}`;
  }
}

export interface PlanInput {
  canon: ModelCanon;
  frag: DrillCanon;
  /** In-world date "2008-05-19". */
  inWorldIso: string;
  /** Wall ms of the order (for calendar sessions). */
  orderedAt: number;
  /** Hub circuits down at the order. */
  isolated: boolean;
}

/** Sites the origin reaches without a hub circuit: the origin and its own tram network. */
export function localSites(c: ModelCanon): Set<string> {
  const byFac = new Map(c.sealDrill.sequence.map((s) => [s.facility, s]));
  const memo = new Map<string, boolean>();
  const local = (f: string): boolean => {
    if (memo.has(f)) return memo.get(f)!;
    const s = byFac.get(f as FacilityId);
    const r = !!s && (s.relay === 'origin' || (s.relay === 'tram' && !!s.via && local(s.via)));
    memo.set(f, r);
    return r;
  };
  return new Set(c.sealDrill.sequence.map((s) => s.facility).filter(local));
}

function cutSite(p: SitePlan): SitePlan {
  return { ...p, ack: null, doorsDone: null, sealed: null, causes: p.causes.includes('cut') ? p.causes : [...p.causes, 'cut'] };
}

/** The drill plan: one row per canon sequence step, in receipt order. */
export function buildPlan(inp: PlanInput): SitePlan[] {
  const { canon: c, frag } = inp;
  const cls = new Map(c.sealDrill.classes.map((k) => [k.classId, k]));
  const facs = new Map(c.facilities.map((f) => [f.id, f]));
  const drilled = new Set(frag.drilledSites.map((d) => d.facility));
  const local = localSites(c);
  return c.sealDrill.sequence.map((step): SitePlan => {
    const f = facs.get(step.facility);
    const k = cls.get((f?.class ?? 'GAMMA') as DrillClassId)!;
    const causes: SiteCause[] = [];
    const receipt = step.offsetMin;
    let ackDelay = 0;
    let doorDelay = 0;
    let noSealReport = false;
    let deferred = false;

    const duty = f?.staffBreakdown?.find((b) => /^Duty Officer/i.test(b.role));
    if (duty && duty.count === 1) {
      ackDelay = frag.singleDutyOfficer.ackDelayMin;
      causes.push('single-duty-officer');
    }
    const months = monthsSince(f?.completed ?? null, inp.inWorldIso);
    if (months !== null && !drilled.has(step.facility)) {
      if (months < frag.completion.acceptanceMonths) {
        noSealReport = true;
        causes.push('acceptance');
      } else if (months < frag.completion.unpracticedMonths) {
        doorDelay = frag.completion.doorDelayMin;
        causes.push('unpracticed');
      }
    }
    for (const h of frag.calendarHolds) {
      if (h.facility !== step.facility) continue;
      const ev = c.calendar.find((e) => e.id === h.calendarId);
      if (calendarInSession(ev, h.through, inp.inWorldIso, inp.orderedAt)) {
        deferred = true;
        causes.push('calendar');
      }
    }

    let ack: number | null = receipt + k.ackMin + ackDelay;
    let ackCircuit = relayCircuit(c, step);
    const wire = frag.orderWire.find((w) => w.facility === step.facility);
    if (wire) {
      ack = wire.ackAtMin;
      ackCircuit = wire.circuit;
      causes.push('order-wire');
    }
    const doorsDone: number | null = deferred ? null : ack + k.doorCycleMin + doorDelay;
    let sealed: number | null = deferred || noSealReport ? null : Math.max(receipt + k.sealMin + ackDelay + doorDelay, doorsDone ?? 0);
    const deadline = receipt + 2 * k.sealMin;
    if (sealed !== null && sealed > deadline + EPS) sealed = null;

    const plan: SitePlan = {
      facility: step.facility,
      cls: k.classId,
      network: step.network,
      via: step.via,
      relay: step.relay,
      hop: step.hop,
      receipt,
      ack,
      doorsDone,
      sealed,
      deadline,
      sealMin: k.sealMin,
      causes,
      circuit: relayCircuit(c, step),
      ackCircuit,
    };
    return inp.isolated && !local.has(step.facility) ? cutSite(plan) : plan;
  });
}

/** Status of one site at drill minute `t` (see the rules in types.ts). */
export function siteStatusAt(p: SitePlan, t: number): SiteStatus {
  if (p.ack !== null && t >= p.ack - EPS) {
    if (p.sealed !== null && t >= p.sealed - EPS) return 'sealed';
    if (t >= p.deadline - EPS) return 'no-report';
    if (p.doorsDone === null) return 'acknowledged';
    return 'sealing';
  }
  if (t >= p.deadline - EPS) return 'no-report';
  return 'pending';
}

/** Drill minute at which a site's status stops changing (sealed or no report). */
export function settledAt(p: SitePlan): number {
  return p.sealed !== null ? p.sealed : p.deadline;
}

export interface NewDrill {
  id: string;
  now: number;
  by: AccountId;
  secondOfficer: string;
  observer?: AccountId | null;
}

/** A fresh drill state, evaluated at its order time. */
export function createDrill(inp: PlanInput & NewDrill): DrillStateExt {
  const msPerMin = 60_000 / inp.canon.sealDrill.timeScale;
  const plan = buildPlan({ ...inp, orderedAt: inp.now });
  const s: DrillStateExt = {
    v: 1,
    id: inp.id,
    orderedAt: inp.now,
    by: inp.by,
    phase: 'propagating',
    sites: {},
    endedAt: null,
    msPerMin,
    plan: Object.fromEntries(plan.map((p) => [p.facility, p])),
    tickedAt: inp.now,
    sealedAt: null,
    isolatedAtOrder: inp.isolated,
    observer: inp.observer ?? null,
    endedBy: null,
    secondOfficer: inp.secondOfficer,
  };
  return evaluate(s, inp.now, false, inp.canon, { holdMin: Infinity });
}

/** Wall ms of drill minute `m`. */
export const wallAt = (s: Pick<DrillStateExt, 'orderedAt' | 'msPerMin'>, m: number) => Math.round(s.orderedAt + m * s.msPerMin);
/** Drill minute of wall ms. */
export const minuteAt = (s: Pick<DrillStateExt, 'orderedAt' | 'msPerMin'>, ms: number) => (ms - s.orderedAt) / s.msPerMin;

/**
 * Re-evaluate a drill at wall time `now`. Applies isolation to sites not yet reached, moves the
 * phase on (sealed when every site settles, stand-down `holdMin` drill minutes later) and
 * freezes statuses at `endedAt`. Returns the same object when nothing but the clock changed.
 */
export function evaluate(
  s: DrillStateExt,
  now: number,
  isolatedNow: boolean,
  canon: ModelCanon,
  opts: { holdMin: number },
): DrillStateExt {
  let plan = s.plan;
  const ended = s.phase === 'stand-down' || s.phase === 'aborted';
  const at = ended && s.endedAt !== null ? Math.min(now, s.endedAt) : now;
  const t = minuteAt(s, at);

  if (isolatedNow && !ended) {
    const local = localSites(canon);
    let changed = false;
    const next: Record<string, SitePlan> = { ...plan };
    for (const p of Object.values(plan)) {
      if (!local.has(p.facility) && p.receipt > t && !p.causes.includes('cut')) {
        next[p.facility] = cutSite(p);
        changed = true;
      }
    }
    if (changed) plan = next;
  }

  const sites: DrillStateExt['sites'] = {};
  for (const p of Object.values(plan)) {
    const status = siteStatusAt(p, t);
    const ackReached = p.ack !== null && t >= p.ack - EPS;
    sites[p.facility] = {
      ordered: wallAt(s, p.receipt),
      acknowledged: ackReached ? wallAt(s, p.ack!) : null,
      sealed: status === 'sealed' ? wallAt(s, p.sealed!) : null,
      status,
    };
  }

  let phase = s.phase;
  let sealedAt = s.sealedAt;
  let endedAt = s.endedAt;
  let endedBy = s.endedBy;
  if (!ended) {
    const all = Object.values(plan);
    const settled = all.every((p) => t >= settledAt(p) - EPS);
    if (settled) {
      phase = 'sealed';
      if (sealedAt === null) sealedAt = wallAt(s, Math.max(...all.map(settledAt)));
      const standAt = sealedAt + opts.holdMin * s.msPerMin;
      if (Number.isFinite(standAt) && now >= standAt) {
        phase = 'stand-down';
        endedAt = Math.round(standAt);
        endedBy = 'network-control';
      }
    }
  }

  const same =
    plan === s.plan &&
    phase === s.phase &&
    sealedAt === s.sealedAt &&
    endedAt === s.endedAt &&
    sameSites(sites, s.sites);
  if (same) return s;
  return { ...s, plan, sites, phase, sealedAt, endedAt, endedBy, tickedAt: now };
}

function sameSites(a: DrillStateExt['sites'], b: DrillStateExt['sites']): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    const x = a[k]!;
    const y = b[k];
    if (!y || x.status !== y.status || x.ordered !== y.ordered || x.acknowledged !== y.acknowledged || x.sealed !== y.sealed) return false;
  }
  return true;
}

/** End a drill by an operator (stand-down after sealing, or abort while propagating). */
export function endDrill(s: DrillStateExt, now: number, kind: 'stand-down' | 'aborted', by: AccountId, canon: ModelCanon): DrillStateExt {
  const frozen = evaluate(s, now, false, canon, { holdMin: Infinity });
  return evaluate({ ...frozen, phase: kind, endedAt: now, endedBy: by }, now, false, canon, { holdMin: Infinity });
}

/** A site operator acknowledges the order at their own workstation. */
export function manualAck(s: DrillStateExt, fac: string, now: number): DrillStateExt | null {
  const p = s.plan[fac];
  if (!p || p.ack === null || s.phase !== 'propagating') return null;
  const t = minuteAt(s, now);
  if (t < p.receipt || t >= p.ack) return null;
  const shift = t - p.ack;
  const next: SitePlan = {
    ...p,
    ack: t,
    doorsDone: p.doorsDone === null ? null : p.doorsDone + shift,
    manualAck: now,
  };
  return { ...s, plan: { ...s.plan, [fac]: next } };
}

/** A site operator reports the site sealed once its doors have closed. */
export function manualSealed(s: DrillStateExt, fac: string, now: number): DrillStateExt | null {
  const p = s.plan[fac];
  if (!p || p.sealed === null || p.doorsDone === null || p.ack === null || s.phase !== 'propagating') return null;
  const t = minuteAt(s, now);
  if (t < p.doorsDone || t >= p.sealed || t >= p.deadline) return null;
  return { ...s, plan: { ...s.plan, [fac]: { ...p, sealed: t, manualSealed: now } } };
}

/** What the drill came to (so far, or at its end). */
export function summarize(s: DrillStateExt): { sites: number; sealed: number; late: string[]; noReport: string[]; outOfSequence: string[]; pending: number; acknowledged: number } {
  const late: string[] = [];
  const noReport: string[] = [];
  const outOfSequence: string[] = [];
  let sealed = 0;
  let pending = 0;
  let acknowledged = 0;
  for (const [f, site] of Object.entries(s.sites)) {
    const p = s.plan[f];
    if (site.status === 'sealed') {
      sealed++;
      if (p && p.sealed !== null && p.sealed > p.receipt + p.sealMin + EPS) late.push(f);
    } else if (site.status === 'no-report') noReport.push(f);
    else if (site.status === 'pending') pending++;
    if (site.acknowledged !== null) acknowledged++;
    if (p && site.acknowledged !== null && p.ack !== null && p.ack < p.receipt - EPS) outOfSequence.push(f);
  }
  return { sites: Object.keys(s.sites).length, sealed, late, noReport, outOfSequence, pending, acknowledged };
}

export function toRecord(s: DrillStateExt, prev?: DrillRecord): DrillRecord {
  const sum = summarize(s);
  return {
    id: s.id,
    orderedAt: s.orderedAt,
    by: s.by,
    secondOfficer: s.secondOfficer,
    observer: s.observer,
    phase: s.phase,
    endedAt: s.endedAt,
    endedBy: s.endedBy,
    sites: sum.sites,
    sealed: sum.sealed,
    late: sum.late,
    noReport: sum.noReport,
    outOfSequence: sum.outOfSequence,
    isolated: s.isolatedAtOrder || Object.values(s.plan).some((p) => p.causes.includes('cut')),
    mailed: prev?.mailed ?? {},
  };
}

/** "SD-08-0519-03": the next drill number on the in-world date. */
export function nextDrillId(prefix: string, inWorldIso: string, existing: readonly string[]): string {
  const stem = `${prefix}-${inWorldIso.slice(2, 4)}-${inWorldIso.slice(5, 7)}${inWorldIso.slice(8, 10)}-`;
  let n = 1;
  for (const id of existing) {
    if (id.startsWith(stem)) n = Math.max(n, Number(id.slice(stem.length)) + 1);
  }
  return `${stem}${String(n).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ message log */

export interface LogLine {
  /** Drill minute. */
  t: number;
  /** Wall ms. */
  at: number;
  from: string;
  to: string;
  circuit: string;
  text: string;
  /** Facility the line is about (null for Network Control broadcasts). */
  facility: string | null;
  kind: 'order' | 'relay' | 'ack' | 'doors' | 'sealed' | 'deferred' | 'no-report' | 'not-passed' | 'network' | 'end';
  /** Stable key for selection. */
  key: string;
}

const NC = 'NC A01';

/** "T+02:30" */
export function drillClock(t: number): string {
  const sec = Math.max(0, Math.round(t * 60));
  const neg = t < 0;
  return `T${neg ? '-' : '+'}${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

/**
 * The relay traffic up to `now`, oldest first, in cable voice. Each line is computed from the
 * plan, so every tab and every account reads the same log.
 */
export function logLines(s: DrillStateExt, now: number, hhmm: (ms: number) => string): LogLine[] {
  const ended = s.phase === 'stand-down' || s.phase === 'aborted';
  const until = minuteAt(s, ended && s.endedAt !== null ? Math.min(now, s.endedAt) : now);
  const out: LogLine[] = [];
  const add = (l: Omit<LogLine, 'at' | 'key'>) => {
    if (l.t <= until + EPS) out.push({ ...l, at: wallAt(s, l.t), key: `${l.kind}:${l.facility ?? 'NC'}:${l.t.toFixed(3)}` });
  };
  const id = s.id;
  add({ t: 0, from: NC, to: 'ALL STATIONS', circuit: 'ORDER WIRE', text: `SEAL DRILL ${id} ORDERED. ALL STATIONS SEAL ON RECEIPT. ACKNOWLEDGE.`, facility: null, kind: 'order' });
  for (const p of Object.values(s.plan)) {
    const f = p.facility;
    const from = p.via ? shortId(p.via) : NC;
    if (p.causes.includes('cut')) {
      add({ t: p.receipt, from: NC, to: shortId(f), circuit: p.circuit, text: `ORDER ${id} NOT PASSED TO ${f}. HUB CIRCUITS DOWN.`, facility: f, kind: 'not-passed' });
    } else if (p.relay !== 'origin') {
      add({ t: p.receipt, from, to: shortId(f), circuit: p.circuit, text: `SEAL DRILL ${id}. SEAL ON RECEIPT. ACKNOWLEDGE.`, facility: f, kind: 'relay' });
    }
    if (p.ack !== null) {
      const deferred = p.doorsDone === null;
      add({
        t: p.ack,
        from: shortId(f),
        to: NC,
        circuit: p.ackCircuit,
        text: deferred ? `ACK ${id}. SEAL DEFERRED. SEE FOLLOWING.` : `ACK ${id}. ${f} SEALING.`,
        facility: f,
        kind: 'ack',
      });
      if (deferred) add({ t: p.ack, from: shortId(f), to: NC, circuit: p.ackCircuit, text: `${f} SEAL DEFERRED: SURFACE COVER TRAFFIC. PORTAL HELD OPEN. WILL ADVISE.`, facility: f, kind: 'deferred' });
    }
    if (p.doorsDone !== null) add({ t: p.doorsDone, from: shortId(f), to: NC, circuit: p.ackCircuit, text: `${f} SEAL DOORS CLOSED. CHECKS IN HAND.`, facility: f, kind: 'doors' });
    if (p.sealed !== null) add({ t: p.sealed, from: shortId(f), to: NC, circuit: p.ackCircuit, text: `${f} SEALED (DRILL) ${hhmm(wallAt(s, p.sealed))}. SEAL DOORS CLOSED AND DOGGED.`, facility: f, kind: 'sealed' });
    else add({ t: p.deadline, from: NC, to: 'FILE', circuit: 'ORDER WIRE', text: `${f} NOT REPORTED SEALED BY ${drillClock(p.deadline)}. CARRIED AS NO REPORT.`, facility: f, kind: 'no-report' });
  }
  if (s.sealedAt !== null) {
    const sum = summarize(s);
    add({ t: minuteAt(s, s.sealedAt), from: NC, to: 'ALL STATIONS', circuit: 'ORDER WIRE', text: `NETWORK HELD SEALED FOR DRILL ${id}. ${sum.sealed} SEALED. ${sum.noReport.length} NO REPORT.`, facility: null, kind: 'network' });
  }
  if (ended && s.endedAt !== null) {
    const txt = s.phase === 'aborted' ? `DRILL ${id} ABORTED. ALL STATIONS RESUME NORMAL CONDITION.` : `DRILL ${id} STAND DOWN. ALL STATIONS OPEN SEAL DOORS AND RESUME NORMAL CONDITION.`;
    add({ t: minuteAt(s, s.endedAt), from: NC, to: 'ALL STATIONS', circuit: 'ORDER WIRE', text: txt, facility: null, kind: 'end' });
  }
  const order: Record<LogLine['kind'], number> = { order: 0, 'not-passed': 1, relay: 1, ack: 2, deferred: 3, doors: 4, sealed: 5, 'no-report': 6, network: 7, end: 8 };
  return out.sort((a, b) => a.t - b.t || order[a.kind] - order[b.kind] || (a.facility ?? '').localeCompare(b.facility ?? ''));
}
