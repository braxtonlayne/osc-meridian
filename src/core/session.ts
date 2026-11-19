/**
 * Session state for the visitor's MERIDIAN sign-in.
 *
 * IN-WORLD DATE RULE (deterministic, documented here and nowhere else):
 *   - Time of day follows the visitor's real clock.
 *   - The calendar date is pinned to May 2008. The in-world day of month is the
 *     visitor's real local day of month (1..31). Every real month has at most 31
 *     days, so the in-world date is always within 01 MAY 2008 .. 31 MAY 2008 and
 *     can never pass the 31 MAY 2008 ceiling.
 *     Example: real 19 NOV 2026 14:30 local -> in-world 19 MAY 2008 14:30.
 *   - Site-local time for ALPHA-03 is US Eastern. Because the in-world date is
 *     always in May (daylight time), site-local is always UTC-4 and labelled EDT,
 *     whatever the visitor's real season.
 *
 * PROBATION DAY RULE:
 *   probationDay = (in-world date - canon.operator.probationStart) in whole days + 1,
 *   clamped to 1..90 (the probationary transfer is 90 days). With the canonical
 *   start of 14 APR 2008 this yields day 18 on 01 MAY and day 48 on 31 MAY.
 */
import { computed, signal } from '@preact/signals';
import type { CompartmentId, TierNo } from './canon-types';
import { load, save } from './persist';

export const PROBATION_LENGTH_DAYS = 90;
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** In-world calendar date (UTC midnight of the pinned May 2008 day). */
export function inWorldDate(now: Date = new Date()): Date {
  const day = Math.min(Math.max(now.getDate(), 1), 31);
  return new Date(Date.UTC(2008, 4, day));
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

/** Site-local (ALPHA-03, Eastern Daylight, UTC-4) "1030 EDT". */
export function siteLocal(now: Date = new Date()): string {
  const h = (now.getUTCHours() + 24 - 4) % 24;
  return `${pad2(h)}${pad2(now.getUTCMinutes())} EDT`;
}

export function probationDayFor(probationStartIso: string, now: Date = new Date()): number {
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
export const probationStart = signal('2008-04-14');
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
  probationStart: string;
  compartments: CompartmentId[];
}): Promise<void> {
  operatorId.value = op.operatorId;
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
