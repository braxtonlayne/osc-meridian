/**
 * Readers' helpers for shared key `isolation` (owner: isolate app). Pure, no canon, no
 * services: the shell and every app that reacts to isolation import these (value imports are
 * allowed from this file only; everything else in the isolate app stays type-only to readers).
 *
 * Rules:
 * - Isolated = `active`, no automatic clear time passed (`clearsAt`), and no restoration
 *   (certificate approved or automatic) recorded against the latest initiation. A panel that
 *   was closed when `clearsAt` passed never wrote `active: false`; readers must not wait for it.
 * - Wall-clock times: initiations carry `ms` (wall ms of the initiation) and, once restored,
 *   `clearedMs`. Older stored values without them fall back to the in-world `at` (pinned date,
 *   real time of day) and to `clearsAt`.
 * - Anything malformed reads as "never initiated" rather than throwing.
 */
import type { IsolationState } from '@core/contracts';
import type { Initiation, IsolateState, Restoration } from './types';

export const ISOLATION_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function initiationOf(v: unknown): Initiation | null {
  if (!isObj(v) || typeof v.at !== 'string' || typeof v.ref !== 'string') return null;
  const by = typeof v.by === 'string' ? v.by : 'analyst';
  const out: Initiation = { at: v.at, by: by as Initiation['by'], ref: v.ref };
  if (typeof v.level === 'number') out.level = v.level;
  if (typeof v.operatorId === 'string') out.operatorId = v.operatorId;
  if (typeof v.ms === 'number' && Number.isFinite(v.ms)) out.ms = v.ms;
  if (typeof v.clearedMs === 'number' && Number.isFinite(v.clearedMs)) out.clearedMs = v.clearedMs;
  return out;
}

function restorationOf(v: unknown): Restoration | null {
  if (!isObj(v) || typeof v.ref !== 'string' || typeof v.status !== 'string') return null;
  return { cert: typeof v.cert === 'string' ? v.cert : '', level: typeof v.level === 'number' ? v.level : 0, raisedBy: 'system', raisedAt: '', ...(v as object) } as Restoration;
}

/**
 * Validate and repair a stored `isolation` value (any shape, any age) into an IsolateState.
 * Never throws. Unknown fields are kept.
 */
export function readIsolation(raw: unknown): IsolateState {
  if (!isObj(raw)) return { ...ISOLATION_NONE, restorations: [], seal: null, withdrawn: false };
  const lv = Number(raw.level);
  const level = (Number.isFinite(lv) ? Math.max(0, Math.min(5, Math.floor(lv))) : 0) as IsolationState['level'];
  const initiations = Array.isArray(raw.initiations) ? raw.initiations.map(initiationOf).filter((x): x is Initiation => !!x) : [];
  const restorations = Array.isArray(raw.restorations) ? raw.restorations.map(restorationOf).filter((x): x is Restoration => !!x) : [];
  const seal = isObj(raw.seal) && typeof raw.seal.no === 'string' ? (raw.seal as unknown as IsolateState['seal']) : null;
  return {
    ...(raw as object),
    level,
    initiations,
    active: raw.active === true,
    clearsAt: typeof raw.clearsAt === 'number' && Number.isFinite(raw.clearsAt) ? raw.clearsAt : null,
    restorations,
    seal,
    withdrawn: raw.withdrawn === true || level >= 5,
  } as IsolateState;
}

export function latestInitiation(s: IsolationState | null | undefined): Initiation | undefined {
  const list = s && Array.isArray(s.initiations) ? s.initiations : [];
  return list[list.length - 1] as Initiation | undefined;
}

/** A restoration (approved certificate or automatic) recorded against `ref`. */
function restoredBy(s: IsolationState, ref: string): Restoration | undefined {
  const rs = (s as IsolateState).restorations;
  if (!Array.isArray(rs)) return undefined;
  return rs.find((r) => r && r.ref === ref && (r.status === 'approved' || r.status === 'automatic'));
}

/** Wall-clock ms of an in-world ISO time (pinned date, real time of day): the latest such instant not after `now` (one minute of slack). */
export function wallOfInWorld(iso: string, now: number): number | null {
  const m = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
  if (!m) return null;
  const d = new Date(now);
  let t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Number(m[1]), Number(m[2]), Number(m[3] ?? 0));
  if (t > now + 60_000) t -= 86_400_000;
  return t;
}

/** Wall-clock ms an initiation was made (its `ms`, else its in-world time of day). */
export function initiationMs(i: Pick<Initiation, 'at' | 'ms'>, now: number): number {
  if (typeof i.ms === 'number') return i.ms;
  return wallOfInWorld(i.at, now) ?? now;
}

/** True while the network is isolated at `now` (clearsAt and restorations honoured). */
export function isolatedAt(s: IsolationState | null | undefined, now: number): boolean {
  if (!s || typeof s !== 'object' || s.active !== true) return false;
  if (typeof s.clearsAt === 'number' && now >= s.clearsAt) return false;
  const last = latestInitiation(s);
  // A hand-made state with no initiation recorded: `active` alone decides.
  if (!last || typeof last !== 'object') return true;
  if (typeof last.clearedMs === 'number' && now >= last.clearedMs) return false;
  return !restoredBy(s, last.ref);
}

/**
 * Wall-clock ms the latest isolation cleared, or null if it has not (or none was made).
 * Order of evidence: `clearedMs` written at restoration, then `clearsAt` once passed, then the
 * in-world decision time of the restoration record.
 */
export function clearedAt(s: IsolationState | null | undefined, now: number): number | null {
  const last = latestInitiation(s);
  if (!s || !last || isolatedAt(s, now)) return null;
  if (typeof last.clearedMs === 'number') return last.clearedMs;
  if (typeof s.clearsAt === 'number' && now >= s.clearsAt) return s.clearsAt;
  const r = restoredBy(s, last.ref);
  const at = r?.decidedAt ?? r?.raisedAt;
  const start = initiationMs(last, now);
  if (at) {
    const w = wallOfInWorld(at, now);
    if (w != null) return Math.max(w, start);
  }
  return s.active ? null : start;
}

/** Every isolation period, oldest first: wall-clock start and end (end null while in force). */
export function isolationPeriods(s: IsolationState | null | undefined, now: number): { ref: string; from: number; to: number | null }[] {
  const list = s && Array.isArray(s.initiations) ? (s.initiations as Initiation[]) : [];
  return list.map((i, k) => {
    const from = initiationMs(i, now);
    if (k === list.length - 1) return { ref: i.ref, from, to: isolatedAt(s, now) ? null : (clearedAt(s, now) ?? from) };
    const next = initiationMs(list[k + 1]!, now);
    const r = restoredBy(s!, i.ref);
    const rAt = r?.decidedAt ?? r?.raisedAt;
    const rMs = rAt ? wallOfInWorld(rAt, now) : null;
    const to = typeof i.clearedMs === 'number' ? i.clearedMs : rMs != null && rMs >= from && rMs <= next ? rMs : next;
    return { ref: i.ref, from, to: Math.max(from, Math.min(to, next)) };
  });
}
