/**
 * Pure formatting for narrative slots and audit lines. The calendar date comes
 * from session.inWorldDate() (canon.meta.inWorldDate, fixed); time of day is the
 * visitor's real clock; site-local is always EDT = UTC-4.
 */
import { inWorldDate } from '@core/session';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** In-world calendar date (fixed by canon.meta.inWorldDate); only time of day is real. */
function day(ms: number): Date {
  return inWorldDate(new Date(ms));
}

/** "1430Z" */
export function zuluOf(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}Z`;
}

/** "1030 EDT" */
export function localOf(ms: number): string {
  const d = new Date(ms);
  return `${pad((d.getUTCHours() + 20) % 24)}${pad(d.getUTCMinutes())} EDT`;
}

/** "1430Z (1030 EDT)" */
export function timeSlot(ms: number): string {
  return `${zuluOf(ms)} (${localOf(ms)})`;
}

/** "19 MAY 2008" */
export function dateSlot(ms: number): string {
  const d = day(ms);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "AUD-080519-004417" */
export function auditRef(ms: number, seq: number): string {
  const d = day(ms);
  return `AUD-${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(seq, 6)}`;
}

/** "2 min 30 s", "45 s" */
export function durationSlot(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} s`;
  return r ? `${m} min ${r} s` : `${m} min`;
}
