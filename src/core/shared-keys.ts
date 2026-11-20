/**
 * Validate / migrate helpers for the shared plant state keys (docs/CONTRACTS.md "Shared plant
 * state"). Registered with the shared store, so every reader of a key (shell and apps, every
 * tab) receives a repaired value: a stored value that is missing, partial, malformed or of an
 * old version never reaches a reader in a shape that throws.
 *
 * Each validator takes the parsed JSON and returns
 *   - a repaired value of the key's type (missing arrays/records filled, malformed entries dropped), or
 *   - `undefined`: unusable, the reader's own fallback applies (same as an absent key).
 * Validators never throw (the store also catches). Owners still write the real shape; nothing
 * here writes back to storage.
 */
import type { DrillState, Trace } from './contracts';
import type { DrillRecord, DrillStateExt } from '@apps/drill/types';
import type { DispatchRecord } from '@apps/dispatch/types';
import { readIsolation } from '@apps/isolate/state';

type Validator = (raw: unknown) => unknown;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string';
const arr = <T = unknown>(v: unknown, keep: (x: unknown) => boolean = isObj): T[] => (Array.isArray(v) ? (v.filter(keep) as T[]) : []);
const rec = (v: unknown, keep: (x: unknown) => boolean = isObj): Record<string, unknown> => {
  if (!isObj(v)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) if (keep(x)) out[k] = x;
  return out;
};

/**
 * Generic plant record: an object (version `v` when given must match), with the named fields
 * forced to arrays / records / numbers. Returns undefined for a non-object or a wrong version.
 */
function shape(spec: { v?: number; arrays?: string[]; records?: string[]; numbers?: Record<string, number>; nullable?: boolean }): Validator {
  return (raw) => {
    if (raw === null && spec.nullable) return null;
    if (!isObj(raw)) return undefined;
    if (spec.v !== undefined && raw.v !== spec.v) return undefined;
    const out: Record<string, unknown> = { ...raw };
    for (const k of spec.arrays ?? []) out[k] = arr(raw[k]);
    for (const k of spec.records ?? []) out[k] = rec(raw[k]);
    for (const [k, d] of Object.entries(spec.numbers ?? {})) out[k] = num(raw[k]) ? raw[k] : d;
    return out;
  };
}

/* ------------------------------------------------------------------ drill */

const SITE_STATUS = new Set(['pending', 'acknowledged', 'sealing', 'sealed', 'no-report']);
const PHASES = new Set(['propagating', 'sealed', 'stand-down', 'aborted']);
const numOrNull = (v: unknown): number | null => (num(v) ? v : null);

/** `drill`: DrillStateExt (v: 1) or null. A pre-v1 value (core DrillState only) is repaired and kept in that shape (check `v === 1` before using the plan). */
export function readDrill(raw: unknown): DrillStateExt | null | undefined {
  if (raw === null) return null;
  if (!isObj(raw) || !str(raw.id) || !num(raw.orderedAt) || !PHASES.has(raw.phase as string)) return undefined;
  const sites: DrillState['sites'] = {};
  for (const [k, s] of Object.entries(rec(raw.sites))) {
    const x = s as Record<string, unknown>;
    if (!SITE_STATUS.has(x.status as string)) continue;
    sites[k] = { ordered: num(x.ordered) ? x.ordered : (raw.orderedAt as number), acknowledged: numOrNull(x.acknowledged), sealed: numOrNull(x.sealed), status: x.status as DrillState['sites'][string]['status'] };
  }
  // Old version (the pass-one core DrillState, no `v`): kept as that shape. Readers that need the
  // plan check `v === 1` (the coordinator and its headless ticker never evaluate it).
  if (raw.v !== 1) return { ...(raw as object), sites, endedAt: numOrNull(raw.endedAt) } as DrillStateExt;
  const plan = rec(raw.plan, (p) => isObj(p) && num(p.receipt) && num(p.deadline) && Array.isArray(p.causes));
  return {
    ...(raw as object),
    sites,
    plan,
    endedAt: numOrNull(raw.endedAt),
    msPerMin: num(raw.msPerMin) && raw.msPerMin > 0 ? raw.msPerMin : 2000,
    tickedAt: num(raw.tickedAt) ? raw.tickedAt : (raw.orderedAt as number),
    sealedAt: numOrNull(raw.sealedAt),
  } as DrillStateExt;
}

export function readDrillRegister(raw: unknown): DrillRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((r): r is Record<string, unknown> => isObj(r) && str(r.id) && num(r.orderedAt))
    .map((r) => ({
      ...(r as object),
      late: arr<string>(r.late, str),
      noReport: arr<string>(r.noReport, str),
      outOfSequence: arr<string>(r.outOfSequence, str),
      mailed: isObj(r.mailed) ? r.mailed : {},
    })) as DrillRecord[];
}

/* ---------------------------------------------------------------- dispatch */

export function readDispatch(raw: unknown): DispatchRecord[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((r): r is Record<string, unknown> => isObj(r) && str(r.ref) && Array.isArray(r.route) && num(r.departAt))
    .map((r) => ({
      ...(r as object),
      route: arr<string>(r.route, str),
      links: arr<string>(r.links, str),
      holds: arr(r.holds, (h) => isObj(h) && str(h.ref) && num(h.at)),
      released: arr<string>(r.released, str),
      notified: arr<string>(r.notified, str),
      clock: isObj(r.clock) && num(r.clock.at) && num(r.clock.elapsed) ? r.clock : { at: r.departAt as number, elapsed: 0 },
      dwellMs: num(r.dwellMs) ? r.dwellMs : 0,
    })) as DispatchRecord[];
}

/* ------------------------------------------------------------------ traces */

export function readTraces(raw: unknown): Trace[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((t): t is Record<string, unknown> => isObj(t) && str(t.id) && str(t.kind) && str(t.from) && str(t.to) && str(t.at))
    .map((t) => ({
      ...(t as object),
      subject: str(t.subject) ? t.subject : '',
      ...(isObj(t.data) ? { data: Object.fromEntries(Object.entries(t.data).map(([k, v]) => [k, typeof v === 'string' ? v : String(v)])) } : {}),
      // seenBy is optional (absent = unseen); keep it absent rather than inventing one.
      ...(t.seenBy !== undefined ? { seenBy: arr<string>(t.seenBy, str) } : {}),
    })) as Trace[];
}

/* ---------------------------------------------------------------- registry */

/** Validators by shared key. Keys not listed are passed through as stored. */
export const SHARED_VALIDATORS: Record<string, Validator> = {
  isolation: (raw) => (isObj(raw) ? readIsolation(raw) : undefined),
  drill: readDrill,
  'drill-register': readDrillRegister,
  dispatch: readDispatch,
  traces: readTraces,
  doors: shape({ v: 1, records: ['doors', 'airlocks', 'serial'], arrays: ['log'] }),
  pa: shape({ v: 1, arrays: ['requests', 'cancels'], numbers: { serial: 0 } }),
  muster: (raw) => {
    const v = shape({ arrays: ['runs'], numbers: { seq: 0 } })(raw) as { runs: Record<string, unknown>[] } | undefined;
    if (!v) return undefined;
    v.runs = v.runs
      .filter((r) => str(r.id) && str(r.site) && num(r.startedAt))
      .map((r) => ({ ...r, sweeps: arr(r.sweeps), notices: arr(r.notices, str), closeout: isObj(r.closeout) ? r.closeout : null }));
    return v;
  },
  patch: shape({ v: 1, arrays: ['cords', 'tests', 'calls'], records: ['links'], numbers: { serial: 0, updatedAt: 0 }, nullable: true }),
  hoist: shape({ v: 1, records: ['units'], arrays: ['events'], numbers: { seq: 0 } }),
  strike: shape({ arrays: ['scenarios'], numbers: { seq: 0 } }),
  cctv: shape({ v: 1, records: ['ptz'], arrays: ['journal', 'gaps'], numbers: { stills: 0 } }),
  plant: shape({ v: 1, records: ['sims'], arrays: ['trips'] }),
  environ: (raw) => {
    if (raw === null) return null;
    const v = shape({ v: 1, arrays: ['log', 'handover', 'events'], records: ['filters'], numbers: { rev: 0 } })(raw) as Record<string, unknown> | undefined;
    if (!v) return undefined;
    const cp = v.checkpoint as Record<string, unknown> | undefined;
    if (!isObj(cp) || !num(cp.at) || !isObj(cp.plant) || !isObj(v.controls)) return undefined;
    if (!isObj(v.excursion)) v.excursion = { since: null, peak: 0, reported: false };
    return v;
  },
};

