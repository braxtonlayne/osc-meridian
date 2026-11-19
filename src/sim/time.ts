/**
 * Time helpers for the transit simulation. Pure; safe in a worker (no DOM, no signals).
 *
 * The in-world date follows the rule in src/core/session.ts: the calendar date is fixed
 * (canon.meta.inWorldDate, 19 MAY 2008); time of day is real. The main thread passes the
 * session date into the simulation worker (setInWorldDate); the canon value is the default. Board
 * times are Zulu with the platform's local time in brackets. Every facility on the
 * network is in a US state that observed daylight time in May 2008 except Arizona.
 */

// Named JSON import: Vite bundles only the meta object, not the whole client canon.
import { meta as canonMeta } from '@canon';

const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

let worldDate: string = canonMeta.inWorldDate;

/** Set the in-world date ("2008-05-19"), e.g. from session.inWorldDate() on the main thread or a worker message. */
export function setInWorldDate(iso: string): void {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) worldDate = iso;
}

/** Zone label and offset from UTC (hours) in May, by the US state of the facility anchor. */
const ZONE_BY_STATE: Record<string, [string, number]> = {};
for (const s of 'ME NH VT MA RI CT NY NJ PA DE MD DC VA WV NC SC GA FL OH MI IN KY'.split(' ')) ZONE_BY_STATE[s] = ['EDT', -4];
for (const s of 'AL MS TN LA AR MO IA MN WI IL TX OK KS NE SD ND'.split(' ')) ZONE_BY_STATE[s] = ['CDT', -5];
for (const s of 'MT WY CO NM UT ID'.split(' ')) ZONE_BY_STATE[s] = ['MDT', -6];
ZONE_BY_STATE.AZ = ['MST', -7];
for (const s of 'WA OR CA NV'.split(' ')) ZONE_BY_STATE[s] = ['PDT', -7];

export interface Zone {
  abbr: string;
  offsetH: number;
}

export function zoneForState(state: string | null | undefined): Zone {
  const z = state ? ZONE_BY_STATE[state.toUpperCase()] : undefined;
  return z ? { abbr: z[0], offsetH: z[1] } : { abbr: 'EDT', offsetH: -4 };
}

/** "1430Z" */
export function hhmmZ(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}

/** "1030 EDT" */
export function hhmmLocal(ms: number, zone: Zone): string {
  const d = new Date(ms + zone.offsetH * 3600_000);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())} ${zone.abbr}`;
}

/** "1430Z (1030 EDT)" */
export function zAndLocal(ms: number, zone: Zone): string {
  return `${hhmmZ(ms)} (${hhmmLocal(ms, zone)})`;
}

/** "1430:12Z" for the board clock. */
export function hhmmssZ(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
}

/** In-world day of month (1..31). The calendar date is fixed; `ms` is kept for callers. */
export function inWorldDay(_ms: number): number {
  return Number(worldDate.slice(8, 10));
}

/** "2008-05-19" */
export function inWorldDateIso(_ms: number): string {
  return worldDate;
}

/** "19 MAY 2008" */
export function inWorldDateText(_ms: number): string {
  return `${worldDate.slice(8, 10)} ${MONTHS[Number(worldDate.slice(5, 7)) - 1]} ${worldDate.slice(0, 4)}`;
}

/** "2008-05-19" -> "19 MAY 2008" (any ISO date; the text as given, no clock involved). */
export function isoDateText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? '???'} ${m[1]}` : iso;
}

/** Day of week of the in-world date, 0 = Sunday. */
export function inWorldWeekday(_ms: number): number {
  return new Date(`${worldDate}T00:00:00Z`).getUTCDay();
}

export const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Real UTC midnight of the instant's UTC day. Timetable minutes are counted from here. */
export function utcDayStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** "1430Z" -> 870 (minutes after 0000Z), or null. */
export function parseZ(text: string | null | undefined): number | null {
  const m = /(\d{2})(\d{2})Z/.exec(text ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** "2 h 06 min" from minutes. */
export function durText(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  return `${h} h ${pad2(m % 60)} min`;
}

/** Deterministic 32-bit FNV-1a hash. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32), returns [0,1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
