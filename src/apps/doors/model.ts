/**
 * Door and Airlock Control: pure model. Door schedules, airlock cycles, interlocks,
 * pressure differential, seal drill application, alarms, authority by account.
 * No DOM, no services; every figure comes from canon (`doors`, `sealDrill`, `apps.doors`).
 */
import canonJson from '@canon';
import type { Canon, AirlockDef, DoorDef, DoorKind, SiteDoors, FacilityLevel } from '@core/canon-types';
import type { AccountDef, DrillState } from '@core/contracts';
import type { DoorsCanon } from '@core/canon-apps/doors';
import {
  currentStep,
  DOORS_EMPTY,
  type AirlockRecord,
  type AirlockStep,
  type DoorLogLine,
  type DoorPosition,
  type DoorRecord,
  type DoorStep,
  type DoorsState,
} from './types';

export const canon = canonJson as unknown as Canon;
export const DC = (canon.apps as Record<string, unknown>).doors as DoorsCanon;

/* ------------------------------------------------------------------ canon lookups */

const SITES: SiteDoors[] = canon.doors;
const DOOR_BY_ID = new Map<string, { def: DoorDef; site: string }>();
const AIRLOCK_BY_ID = new Map<string, { def: AirlockDef; site: string }>();
const AIRLOCK_OF_LEAF = new Map<string, AirlockDef>();
for (const s of SITES) {
  for (const d of s.doors) DOOR_BY_ID.set(d.id, { def: d, site: s.facility });
  for (const a of s.airlocks) {
    AIRLOCK_BY_ID.set(a.id, { def: a, site: s.facility });
    AIRLOCK_OF_LEAF.set(a.outer, a);
    AIRLOCK_OF_LEAF.set(a.inner, a);
  }
}

export const siteIds = (): string[] => SITES.map((s) => s.facility);
export const siteDoors = (facility: string): SiteDoors | undefined => SITES.find((s) => s.facility === facility);
export const doorDef = (id: string): DoorDef | undefined => DOOR_BY_ID.get(id)?.def;
export const doorSite = (id: string): string | undefined => DOOR_BY_ID.get(id)?.site ?? AIRLOCK_BY_ID.get(id)?.site;
export const airlockDef = (id: string): AirlockDef | undefined => AIRLOCK_BY_ID.get(id)?.def;
export const airlockOfLeaf = (doorId: string): AirlockDef | undefined => AIRLOCK_OF_LEAF.get(doorId);
export const siteClass = (facility: string): 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA' =>
  (canon.facilities.find((f) => f.id === facility)?.class ?? 'GAMMA') as 'ALPHA' | 'BETA' | 'GAMMA' | 'DELTA';

/** The level index the board shows for a site: facility levels (ALPHA) or the class template. */
export function levelIndex(facility: string): { n: number; name: string; tier: number }[] {
  const f = canon.facilities.find((x) => x.id === facility);
  const lv = (f as unknown as { levels?: FacilityLevel[] } | undefined)?.levels;
  if (lv && lv.length) return lv.map((l) => ({ n: l.n, name: l.name, tier: l.tier }));
  const cls = siteClass(facility);
  const tpl = cls === 'BETA' || cls === 'GAMMA' ? canon.templateLevels[cls] : [];
  return tpl.map((l) => ({ n: l.n, name: l.name, tier: 4 }));
}

/* ------------------------------------------------------------------ door motion */

const S = 1000;

export function restingPos(def: DoorDef): DoorPosition {
  return def.normal === 'open' ? 'open' : 'closed-locked';
}

/** Open: unlocking, opening, open. Total = canon cycleSec (scaled). */
export function planOpen(def: DoorDef, at: number, scale = 1): DoorStep[] {
  const unlock = Math.min(DC.motion.unlockSec[def.kind], def.cycleSec) * S / scale;
  const total = (def.cycleSec * S) / scale;
  return [
    { pos: 'unlocking', from: at },
    { pos: 'opening', from: at + unlock },
    { pos: 'open', from: at + total },
  ];
}

/** Close: closing, seated, closed-locked. Total = canon cycleSec (scaled). */
export function planClose(def: DoorDef, at: number, scale = 1): DoorStep[] {
  const dog = Math.min(DC.motion.dogSec[def.kind], def.cycleSec) * S / scale;
  const total = (def.cycleSec * S) / scale;
  return [
    { pos: 'closing', from: at },
    { pos: 'seated', from: at + total - dog },
    { pos: 'closed-locked', from: at + total },
  ];
}

export interface DoorView {
  pos: DoorPosition;
  /** 0 closed .. 1 open */
  frac: number;
  moving: boolean;
  /** Ms the door has been in its current step (or since the record began). */
  since: number | null;
  /** When the current movement ends (null if at rest). */
  endsAt: number | null;
  rec: DoorRecord | undefined;
}

export function doorView(def: DoorDef, rec: DoorRecord | undefined, now: number): DoorView {
  if (!rec) {
    const pos = restingPos(def);
    return { pos, frac: pos === 'open' ? 1 : 0, moving: false, since: null, endsAt: null, rec };
  }
  const { step, next } = currentStep(rec.steps, now);
  const last = rec.steps[rec.steps.length - 1];
  const moving = step.pos !== 'open' && step.pos !== 'closed-locked';
  let frac = 0;
  if (step.pos === 'open') frac = 1;
  else if (step.pos === 'opening' || step.pos === 'closing') {
    const t = next ? Math.min(1, Math.max(0, (now - step.from) / Math.max(1, next.from - step.from))) : 1;
    frac = step.pos === 'opening' ? t : 1 - t;
  }
  return { pos: step.pos, frac, moving, since: step.from, endsAt: moving && last ? last.from : null, rec };
}

export const POS_WORD: Record<DoorPosition, string> = {
  'closed-locked': 'CLOSED-LOCKED',
  unlocking: 'UNLOCKING',
  opening: 'OPENING',
  open: 'OPEN',
  closing: 'CLOSING',
  seated: 'SEATED',
};

/* ------------------------------------------------------------------ airlocks */

export interface AirlockPlan {
  airlock: AirlockRecord;
  outer: DoorRecord;
  inner: DoorRecord;
  endsAt: number;
}

/** Leaf stroke (unlock + travel) for an airlock leaf, ms. */
const leafMs = (def: DoorDef) => def.cycleSec * S;

/**
 * One airlock cycle. 'in' (outside to inside): vent chamber to outside, outer leaf open/dwell/close,
 * decon dwell (if any), pressurise to inside, inner leaf open/dwell/close, idle.
 * 'out' (inside to outside): inner leaf open/dwell/close, vent, outer leaf open/dwell/close, pressurise, idle.
 * 4 leaf strokes + 2 dwells + 2 equalizations = canon airlock cycleSec; decon adds deconSec.
 */
export function planAirlock(
  al: AirlockDef,
  dir: 'in' | 'out',
  decon: boolean,
  at: number,
  by: AirlockRecord['by'],
  count: number | null,
  deconSkip = false,
): AirlockPlan {
  const outerDef = doorDef(al.outer)!;
  const innerDef = doorDef(al.inner)!;
  const eq = DC.airlock.equalizeSec * S;
  const dwell = DC.airlock.dwellSec * S;
  const P = DC.pressure;
  const steps: AirlockStep[] = [];
  const outer: DoorStep[] = [{ pos: 'closed-locked', from: at }];
  const inner: DoorStep[] = [{ pos: 'closed-locked', from: at }];
  let t = at;
  const leaf = (def: DoorDef, into: DoorStep[], phase: 'outer-open' | 'inner-open', dp: number) => {
    steps.push({ phase, from: t, dp });
    into.push(...planOpen(def, t));
    t += leafMs(def) + dwell;
    into.push(...planClose(def, t));
    t += leafMs(def);
  };
  const useDecon = dir === 'in' && decon && al.deconSec != null && !deconSkip;
  if (dir === 'in') {
    steps.push({ phase: 'equalize', from: t, dp: P.insideDp });
    t += eq;
    leaf(outerDef, outer, 'outer-open', 0);
    if (useDecon) {
      steps.push({ phase: 'decon', from: t, dp: P.deconDp });
      t += (al.deconSec ?? 0) * S;
    }
    steps.push({ phase: 'equalize', from: t, dp: useDecon ? P.deconDp : 0 });
    t += eq;
    leaf(innerDef, inner, 'inner-open', P.insideDp);
  } else {
    leaf(innerDef, inner, 'inner-open', P.insideDp);
    steps.push({ phase: 'equalize', from: t, dp: P.insideDp });
    t += eq;
    leaf(outerDef, outer, 'outer-open', 0);
    steps.push({ phase: 'equalize', from: t, dp: 0 });
    t += eq;
  }
  steps.push({ phase: 'idle', from: t, dp: P.insideDp });
  return {
    airlock: { dir, decon: useDecon, steps, by, count },
    outer: { steps: outer, cmd: 'close', by: 'airlock', override: null },
    inner: { steps: inner, cmd: 'close', by: 'airlock', override: null },
    endsAt: t,
  };
}

/** Chamber pressure relative to outside at `now` (interpolated through equalize steps). */
export function chamberDp(rec: AirlockRecord | undefined, now: number): number {
  if (!rec) return DC.pressure.insideDp;
  const { step, next } = currentStep(rec.steps, now);
  if (step.phase !== 'equalize' || !next) return step.dp;
  const t = Math.min(1, Math.max(0, (now - step.from) / Math.max(1, next.from - step.from)));
  return step.dp + (next.dp - step.dp) * t;
}

export function airlockPhase(rec: AirlockRecord | undefined, now: number): AirlockRecord['steps'][number]['phase'] {
  if (!rec) return 'idle';
  return currentStep(rec.steps, now).step.phase;
}

export function airlockBusy(rec: AirlockRecord | undefined, now: number): boolean {
  const p = airlockPhase(rec, now);
  return p !== 'idle' && p !== 'fault';
}

export type LeafRefusal = 'interlock' | 'dp' | 'cycle' | null;

/**
 * May this airlock leaf be commanded open directly? Interlock: the other leaf must be closed-locked.
 * Permissive: differential across the leaf within leafOpenMaxDp. No direct command during a cycle.
 */
export function leafPermissive(al: AirlockDef, leafId: string, state: DoorsState, now: number): LeafRefusal {
  if (airlockBusy(state.airlocks[al.id], now)) return 'cycle';
  const otherId = leafId === al.outer ? al.inner : al.outer;
  const other = doorView(doorDef(otherId)!, state.doors[otherId], now);
  if (other.pos !== 'closed-locked') return 'interlock';
  const ch = chamberDp(state.airlocks[al.id], now);
  const across = leafId === al.outer ? ch : DC.pressure.insideDp - ch;
  if (Math.abs(across) > DC.pressure.leafOpenMaxDp) return 'dp';
  return null;
}

/** Both leaves of an airlock off closed at the same moment (must never happen). */
export function bothLeavesOpen(al: AirlockDef, state: DoorsState, now: number): boolean {
  const o = doorView(doorDef(al.outer)!, state.doors[al.outer], now);
  const i = doorView(doorDef(al.inner)!, state.doors[al.inner], now);
  return o.pos !== 'closed-locked' && i.pos !== 'closed-locked';
}

/* ------------------------------------------------------------------ seal drill */

export function drillScale(): number {
  return canon.sealDrill.timeScale;
}

/**
 * Write the seal drill into door schedules. Sites start closing at their `acknowledged`
 * time; doors move at drill time (canon sealDrill.timeScale). Stand-down / abort reopens
 * the doors that are normally open from `endedAt`. Pure: returns null when nothing changes.
 * Deterministic, so two tabs writing it agree.
 */
export function applyDrill(state: DoorsState, drill: DrillState | null, now: number): { next: DoorsState; lines: { at: number; site: string; event: string; note: string }[] } | null {
  if (!drill) return null;
  const scale = drillScale();
  const ended = drill.phase === 'stand-down' || drill.phase === 'aborted';
  const want: 'sealed' | 'stand-down' = ended ? 'stand-down' : 'sealed';
  const started = Object.entries(drill.sites)
    .filter(([, s]) => s.acknowledged != null && (ended || s.status === 'sealing' || s.status === 'sealed'))
    .map(([k]) => k)
    .sort();
  const prev = state.drill && state.drill.id === drill.id && state.drill.phase === want ? state.drill.sites : [];
  const fresh = started.filter((k) => !prev.includes(k));
  if (!fresh.length) {
    if (state.drill?.id === drill.id && state.drill.phase === want) return null;
    if (!started.length) return null;
  }
  const doors = { ...state.doors };
  const airlocks = { ...state.airlocks };
  const lines: { at: number; site: string; event: string; note: string }[] = [];
  for (const site of fresh) {
    const st = drill.sites[site];
    const sd = siteDoors(site);
    if (!sd || !st || st.acknowledged == null) continue;
    const t0 = st.acknowledged;
    for (const d of sd.doors) {
      if (!d.sealsOnDrill) continue;
      const cur = doors[d.id];
      if (!ended) {
        if (cur?.override?.kind === 'drill-hold') continue;
        if (cur && cur.by === 'drill' && cur.cmd === 'close') continue;
        const v = doorView(d, cur, t0);
        if (v.pos === 'closed-locked') {
          if (cur) doors[d.id] = { steps: [{ pos: 'closed-locked', from: t0 }], cmd: 'close', by: 'drill', override: null };
          continue;
        }
        // A door in travel finishes its stroke first, then closes.
        const startAt = v.moving && v.endsAt ? v.endsAt : t0;
        const head = cur ? cur.steps.filter((s) => s.from < startAt) : [];
        doors[d.id] = { steps: [...head, ...planClose(d, startAt, scale)], cmd: 'close', by: 'drill', override: null };
      } else if (cur && cur.by === 'drill' && drill.endedAt != null) {
        const tEnd = Math.max(drill.endedAt, cur.steps[cur.steps.length - 1]?.from ?? 0);
        if (d.normal === 'open') doors[d.id] = { steps: [...cur.steps, ...planOpen(d, tEnd, scale)], cmd: 'open', by: 'drill', override: null };
        else delete doors[d.id];
      }
    }
    if (!ended) {
      for (const a of sd.airlocks) {
        const rec = airlocks[a.id];
        if (rec && airlockBusy(rec, t0)) {
          airlocks[a.id] = { ...rec, steps: [...rec.steps.filter((s) => s.from < t0), { phase: 'idle', from: t0, dp: DC.pressure.insideDp }] };
        }
      }
    }
    lines.push({ at: ended ? drill.endedAt ?? now : t0, site, event: ended ? 'DRILL STAND-DOWN' : 'DRILL SEAL', note: drill.id });
  }
  return { next: { ...state, doors, airlocks, drill: { id: drill.id, phase: want, sites: started } }, lines };
}

/** True while a site is held sealed by the drill (sealing or sealed, not stood down). */
export function drillHolds(drill: DrillState | null, site: string): boolean {
  if (!drill || drill.phase === 'stand-down' || drill.phase === 'aborted') return false;
  const s = drill.sites[site];
  return !!s && s.acknowledged != null && (s.status === 'sealing' || s.status === 'sealed');
}

/* ------------------------------------------------------------------ alarms */

export type AlarmId = 'held' | 'interlock' | 'portal' | 'override' | 'decon' | 'drill' | 'remote' | 'travel';

export const ALARM_TILES: { id: AlarmId; legend: string[]; priority: 'alarm' | 'warning' | 'status' }[] = [
  { id: 'held', legend: ['DOOR', 'HELD OPEN'], priority: 'alarm' },
  { id: 'interlock', legend: ['AIRLOCK', 'INTERLOCK'], priority: 'alarm' },
  { id: 'portal', legend: ['PORTAL DOOR', 'NOT SECURE'], priority: 'warning' },
  { id: 'override', legend: ['OVERRIDE', 'IN FORCE'], priority: 'warning' },
  { id: 'remote', legend: ['HUB CIRCUITS', 'DOWN'], priority: 'warning' },
  { id: 'decon', legend: ['DECON', 'CYCLE'], priority: 'status' },
  { id: 'drill', legend: ['SEAL DRILL', 'DOORS HELD'], priority: 'status' },
  { id: 'travel', legend: ['DOOR', 'IN TRAVEL'], priority: 'status' },
];

/** Doors in held-open at `now`: normally closed, open (or opening) longer than heldOpenSec, no hold-open override. */
export function heldOpen(site: string, state: DoorsState, now: number): string[] {
  const sd = siteDoors(site);
  if (!sd) return [];
  const out: string[] = [];
  for (const d of sd.doors) {
    if (d.normal !== 'closed') continue;
    const rec = state.doors[d.id];
    if (!rec || rec.override?.kind === 'hold-open' || rec.by === 'airlock') continue;
    const first = rec.steps.find((s) => s.pos === 'open');
    if (!first || rec.cmd !== 'open') continue;
    if (now - first.from > DC.motion.heldOpenSec[d.kind] * S) out.push(d.id);
  }
  return out;
}

/** Interlock reject: an INTERLOCK REJECT log line at this site within the window. */
export const INTERLOCK_WINDOW_MS = 5 * S;

export function abnormal(site: string, state: DoorsState, now: number, drill: DrillState | null, remoteLost: boolean): Record<AlarmId, boolean> {
  const sd = siteDoors(site);
  const doors = sd?.doors ?? [];
  const views = doors.map((d) => ({ d, v: doorView(d, state.doors[d.id], now) }));
  return {
    held: heldOpen(site, state, now).length > 0,
    interlock:
      state.log.some((l) => l.site === site && l.event === 'INTERLOCK REJECT' && now - l.at < INTERLOCK_WINDOW_MS && l.at <= now) ||
      (sd?.airlocks ?? []).some((a) => bothLeavesOpen(a, state, now)),
    portal: views.some(({ d, v }) => d.kind === 'portal' && v.pos !== 'closed-locked'),
    override: doors.some((d) => state.doors[d.id]?.override),
    remote: remoteLost,
    decon: (sd?.airlocks ?? []).some((a) => airlockPhase(state.airlocks[a.id], now) === 'decon'),
    drill: drillHolds(drill, site),
    travel: views.some(({ v }) => v.moving),
  };
}

/* ------------------------------------------------------------------ authority */

export type Authority =
  | { kind: 'operate' }
  | { kind: 'view'; reason: string; reference: string };

export interface AccountRules {
  /** Sites whose board this account may display. */
  boards: string[];
  /** Sites whose cycle log this account may read. */
  logs: string[];
  /** Overrides permitted (drill-hold, hold-open). */
  overrides: boolean;
  /** Decon bypass permitted (commander's authority). */
  deconBypass: boolean;
}

/** Network ALPHA hubs adjacent on segment 04 (the deputy's portal pair). */
export const SEG04_PAIR = ['A02-BD9', 'A05-BD8'] as const;

export function rulesFor(acct: AccountDef): AccountRules {
  const all = siteIds();
  switch (acct.id) {
    case 'lifesupport':
      return { boards: [acct.site], logs: [acct.site], overrides: true, deconBypass: false };
    case 'deputy':
      return { boards: all, logs: [acct.site, 'ALPHA-05'], overrides: true, deconBypass: true };
    case 'auditor':
      return { boards: [acct.site], logs: all, overrides: false, deconBypass: false };
    default:
      return { boards: [acct.site], logs: [acct.site], overrides: false, deconBypass: false };
  }
}

/**
 * May this account command this door? Tier 4 technician: every door at its own site.
 * Deputy: its own site. Analyst: the records stack vault doors at its own site with LANTERN.
 * Auditor: none. Remote sites: none (local control only).
 */
export function authority(acct: AccountDef, compartments: readonly string[], site: string, def: DoorDef | AirlockDef): Authority {
  if (acct.id === 'auditor') {
    return { kind: 'view', reason: 'The Office of Internal Assurance holds no door control authority. Door boards are open to OIA for review only.', reference: 'OSC-MEM-08-0146 para 2' };
  }
  if (site !== acct.site) {
    return { kind: 'view', reason: `Door control at ${site} is held by the ${site} security control room. This workstation displays the board for indication only.`, reference: 'OSC-MEM-08-0146 para 3' };
  }
  if (acct.id === 'lifesupport' || acct.id === 'deputy') return { kind: 'operate' };
  // analyst
  const isStackVault = 'kind' in def && def.kind === 'blast' && /Records Stacks/i.test(levelName(site, def.level));
  if (isStackVault && compartments.includes('LANTERN')) return { kind: 'operate' };
  return {
    kind: 'view',
    reason: 'Door control is restricted to security control and Facilities Engineering staff. Records Division staff may operate the records stack vault doors only.',
    reference: 'OSC-MEM-08-0146 para 3',
  };
}

export function levelName(site: string, n: number): string {
  return levelIndex(site).find((l) => l.n === n)?.name ?? '';
}

/* ------------------------------------------------------------------ log */

export interface LogRow {
  key: string;
  at: number;
  atIso: string;
  site: string;
  door: string;
  level: number | null;
  event: string;
  by: string;
  count: number | null;
  note: string;
  seeded: boolean;
}

/** Canon history (in-world times) + live lines, newest first, within retention and not after now. */
export function logRows(state: DoorsState, sites: readonly string[], nowIso: string): LogRow[] {
  const nowMs = Date.parse(nowIso);
  const floor = nowMs - DC.logRetentionDays * 86400 * S;
  const rows: LogRow[] = [];
  DC.history.forEach((h, i) => {
    const at = Date.parse(h.at);
    if (!sites.includes(h.site) || at > nowMs || at < floor) return;
    rows.push({ key: `h${i}`, at, atIso: h.at, site: h.site, door: h.door, level: h.level, event: h.event, by: h.by, count: h.count, note: h.note, seeded: true });
  });
  state.log.forEach((l, i) => {
    if (!sites.includes(l.site)) return;
    const at = Date.parse(l.atIso);
    const def = doorDef(l.door) ?? airlockDef(l.door);
    rows.push({
      key: `l${i}-${l.at}`,
      at: Number.isNaN(at) ? l.at : at,
      atIso: l.atIso,
      site: l.site,
      door: l.door,
      level: def ? def.level : null,
      event: l.event,
      by: opOf(l.by),
      count: null,
      note: l.note ?? '',
      seeded: false,
    });
  });
  return rows.sort((a, b) => b.at - a.at);
}

/** Display name for a log source: operator id for an account, else the source word. */
export function opOf(by: string): string {
  if (by === 'drill') return 'SEAL DRILL';
  if (by === 'airlock') return 'AIRLOCK';
  if (by === 'system') return 'SYSTEM';
  return canon.accounts.find((a) => a.id === by)?.operatorId ?? by.toUpperCase();
}

/** Is this door or airlock id on the site's board? */
export function onBoard(id: string): boolean {
  return DOOR_BY_ID.has(id) || AIRLOCK_BY_ID.has(id);
}

/* ------------------------------------------------------------------ time */

const pad2 = (n: number) => String(n).padStart(2, '0');
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "1430Z (0930 CDT)" for sites with a local zone in the fragment, else "1430Z". */
export function zl(iso: string, site: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const z = `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
  const zone = DC.localZones.find((x) => x.facility === site);
  if (!zone) return z;
  const l = new Date(d.getTime() + zone.offsetH * 3600 * S);
  return `${z} (${pad2(l.getUTCHours())}${pad2(l.getUTCMinutes())} ${zone.label})`;
}

/** "13 MAY 2008" */
export function dayOf(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Did a watch change (canon shiftChangeZ) fall in (prev, now]? Returns the hour, or null. */
export function crossedShift(prevMs: number, nowMs: number): number | null {
  if (nowMs <= prevMs || nowMs - prevMs > 6 * 3600 * S) return null;
  for (const h of DC.shiftChangeZ) {
    const d = new Date(nowMs);
    const mark = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h);
    for (const m of [mark, mark - 86400 * S]) if (m > prevMs && m <= nowMs) return h;
  }
  return null;
}

/** "DOR-G08-0003" */
export function overrideRef(site: string, serial: number): string {
  const short = site.replace(/^([ABG])[A-Z]+-/, '$1');
  return `DOR-${short}-${String(serial).padStart(4, '0')}`;
}

/** Bypass key number for an airlock: "KS-G08-AL1". */
export function bypassKey(al: AirlockDef): string {
  return `${DC.bypassKeyPrefix}-${al.id}`;
}

/** Doors off their canon normal position at `now` (for the handover report). */
export function offNormal(site: string, state: DoorsState, now: number): { def: DoorDef; v: DoorView }[] {
  const sd = siteDoors(site);
  if (!sd) return [];
  return sd.doors
    .map((def) => ({ def, v: doorView(def, state.doors[def.id], now) }))
    .filter(({ def, v }) => v.pos !== restingPos(def));
}

export function kindWord(k: DoorKind): string {
  return k === 'portal' ? 'Portal door' : k === 'blast' ? 'Blast door' : 'Airlock leaf';
}

export function trimLog(log: DoorLogLine[]): DoorLogLine[] {
  return log.length > DC.logCap ? log.slice(log.length - DC.logCap) : log;
}

export { DOORS_EMPTY };
