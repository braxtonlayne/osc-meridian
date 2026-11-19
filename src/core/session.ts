/**
 * Session state for the visitor's MERIDIAN sign-in.
 *
 * IN-WORLD DATE RULE (deterministic, documented here and nowhere else):
 *   - Time of day follows the visitor's real clock.
 *   - The calendar date is fixed: canon.meta.inWorldDate (19 MAY 2008), the single
 *     source of truth shared with content, mail, the calendar and the graphics.
 *     Example: real 19 NOV 2026 14:30 local -> in-world 19 MAY 2008 14:30, and the
 *     same date on any other real day.
 *   - Site-local time is the signed-in account's site: US zone of the facility's anchor
 *     state in canon (ALPHA-03 Kentucky and ALPHA-01 Virginia: EDT, UTC-4; GAMMA-08
 *     Texas: CDT, UTC-5). ALPHA-02's anchor is withheld in the client canon, so its zone
 *     is the documented one for the deputy's account (MDT, UTC-6; docs/narrative-2/accounts.md).
 *     The in-world date is always in May, so the label is always the daylight-time one,
 *     whatever the visitor's real season. Default before sign-in: EDT.
 *
 * PROBATION DAY RULE:
 *   Accounts not on probation (AccountDef.probationStart null) have probationDay 0;
 *   the shell then hides the day count.
 *   probationDay = (in-world date - canon.operator.probationStart) in whole days + 1,
 *   clamped to 1..90 (the probationary transfer is 90 days). With the canonical
 *   start of 14 APR 2008 and the fixed date 19 MAY 2008 this yields day 36.
 */
import { computed, signal } from '@preact/signals';
import type { CompartmentId, TierNo } from './canon-types';
import { load, save } from './persist';
// Named JSON import: Vite bundles only the meta object, not the whole client canon.
import { meta as canonMeta } from '@canon';

/** The in-world date, ISO ("2008-05-19"), from canon. */
export const IN_WORLD_DATE_ISO: string = canonMeta.inWorldDate;

export const PROBATION_LENGTH_DAYS = 90;
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // matches the account notice (msg-08-04106) and DIR-0301 para 4

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** In-world calendar date: UTC midnight of canon.meta.inWorldDate (the `now` argument is kept for callers). */
export function inWorldDate(_now: Date = new Date()): Date {
  return new Date(IN_WORLD_DATE_ISO + 'T00:00:00Z');
}

/** "19 MAY 2008" */
export function formatInWorldDate(now: Date = new Date()): string {
  const d = inWorldDate(now);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** ISO timestamp with the pinned in-world date and the real UTC time of day. */
export function inWorldIso(now: Date = new Date()): string {
  const d = inWorldDate(now);
  const t = now.toISOString().slice(10); // "THH:MM:SS.sssZ"
  return d.toISOString().slice(0, 10) + t;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "1430Z" */
export function zulu(now: Date = new Date()): string {
  return `${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}Z`;
}

/** Site-local zone of the signed-in account (see the rule above). */
export interface SiteZone {
  abbr: string;
  offsetH: number;
}
export const siteZone = signal<SiteZone>({ abbr: 'EDT', offsetH: -4 });

/** Site-local "1030 EDT" in the account's site zone (or `zone`). */
export function siteLocal(now: Date = new Date(), zone: SiteZone = siteZone.peek()): string {
  const h = (((now.getUTCHours() + zone.offsetH) % 24) + 24) % 24;
  return `${pad2(h)}${pad2(now.getUTCMinutes())} ${zone.abbr}`;
}

export function probationDayFor(probationStartIso: string | null, now: Date = new Date()): number {
  if (probationStartIso == null) return 0;
  const start = Date.parse(probationStartIso + 'T00:00:00Z');
  if (Number.isNaN(start)) return 1;
  const days = Math.floor((inWorldDate(now).getTime() - start) / 86400000) + 1;
  return Math.min(Math.max(days, 1), PROBATION_LENGTH_DAYS);
}

/* ----------------------------------------------------------- session store */

interface Persisted {
  compartments: CompartmentId[];
  actingTier2: boolean;
  flags: Record<string, boolean>;
}

export const operatorId = signal('3-1147');
export const baseTier = signal<TierNo>(3);
export const site = signal('ALPHA-03');
export const divisionId = signal('RD');
export const displayName = signal('');
export const probationStart = signal<string | null>('2008-04-14');
/** Role line for the session panel (AccountDef.roleTitle). */
export const roleTitle = signal('');
export const compartments = signal<CompartmentId[]>([]);
export const actingTier2 = signal(false);
export const flags = signal<Record<string, boolean>>({});
export const tick = signal(Date.now()); // 1 Hz clock, drives clock/timers
export const tier = computed<TierNo>(() => (actingTier2.value && baseTier.value > 2 ? 2 : baseTier.value));
export const probationDay = computed(() => probationDayFor(probationStart.value, new Date(tick.value)));

/** 'boot' -> 'locked' -> 'active'; 'locked' after timeout or lock keeps windows. */
export type Phase = 'boot' | 'locked' | 'active';
export const phase = signal<Phase>('boot');
/** True once the visitor has signed in at least once this page load. */
export const signedIn = signal(false);
export const loginAt = signal<number | null>(null);
export const lockReason = signal<'initial' | 'timeout' | 'manual' | 'logoff'>('initial');

function persist(): void {
  const p: Persisted = { compartments: compartments.peek(), actingTier2: actingTier2.peek(), flags: flags.peek() };
  save('session', p);
}

export async function initSession(op: {
  operatorId: string;
  tier: TierNo;
  site: string;
  divisionId: string;
  displayName: string;
  probationStart: string | null;
  compartments: CompartmentId[];
  roleTitle?: string;
}): Promise<void> {
  operatorId.value = op.operatorId;
  roleTitle.value = op.roleTitle ?? '';
  baseTier.value = op.tier;
  site.value = op.site;
  divisionId.value = op.divisionId;
  displayName.value = op.displayName;
  probationStart.value = op.probationStart;
  const p = await load<Persisted | null>('session', null);
  compartments.value = [...new Set([...(op.compartments ?? []), ...(p?.compartments ?? [])])];
  actingTier2.value = p?.actingTier2 ?? false;
  flags.value = p?.flags ?? {};
  setInterval(() => (tick.value = Date.now()), 1000);
}

export function setFlag(name: string): void {
  if (flags.peek()[name]) return;
  flags.value = { ...flags.peek(), [name]: true };
  persist();
}

export function addCompartment(id: CompartmentId): boolean {
  if (compartments.peek().includes(id)) return false;
  compartments.value = [...compartments.peek(), id];
  persist();
  return true;
}

export function setActingTier2(on: boolean): boolean {
  if (actingTier2.peek() === on) return false;
  actingTier2.value = on;
  persist();
  return true;
}

/**
 * ReleaseKey semantics (docs/CONTRACTS.md):
 *   "T<n>"            satisfied when the effective tier is n or more senior (lower number),
 *                     except T1, which is never satisfied.
 *   "<COMPARTMENT>"   satisfied when the compartment is held.
 *   "<COMP>+T<n>"     both parts must be satisfied.
 */
export function satisfies(key: string): boolean {
  const parts = key.split('+').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return false;
  return parts.every((part) => {
    const m = /^T([1-4])$/i.exec(part);
    if (m) {
      const n = Number(m[1]);
      if (n === 1) return false;
      return tier.value <= n;
    }
    return compartments.value.includes(part.toUpperCase() as CompartmentId);
  });
}

/* ------------------------------------------------------------ idle timeout */

let lastActivity = Date.now();
let onTimeout: (() => void) | null = null;

export function noteActivity(): void {
  lastActivity = Date.now();
}

export function startIdleWatch(cb: () => void): void {
  onTimeout = cb;
  const evs: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
  for (const e of evs) window.addEventListener(e, noteActivity, { passive: true, capture: true });
  setInterval(() => {
    if (phase.peek() === 'active' && Date.now() - lastActivity > IDLE_TIMEOUT_MS) onTimeout?.();
  }, 5000);
}
