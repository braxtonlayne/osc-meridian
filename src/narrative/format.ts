/**
 * Pure formatting for narrative slots and audit lines. Mirrors the in-world date
 * rule in src/core/session.ts (date pinned to May 2008, day of month follows the
 * visitor's local clock, site-local is always EDT = UTC-4) without importing
 * the session store, so the rule engine stays free of runtime state.
 */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function inWorldDay(ms: number): number {
  return Math.min(Math.max(new Date(ms).getDate(), 1), 31);
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
  return `${pad(inWorldDay(ms))} ${MONTHS[4]} 2008`;
}

/** "AUD-080519-004417" */
export function auditRef(ms: number, seq: number): string {
  return `AUD-0805${pad(inWorldDay(ms))}-${pad(seq, 6)}`;
}

/** "2 min 30 s", "45 s" */
export function durationSlot(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r} s`;
  return r ? `${m} min ${r} s` : `${m} min`;
}
