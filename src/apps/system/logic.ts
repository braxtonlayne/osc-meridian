/**
 * System Tools: pure helpers (no DOM, no services). Unit-tested in logic.test.ts.
 */
import type { AuditEntry, RouteEntry } from '@core/contracts';
import type { CalendarEvent, GlossaryTerm, Marking, MarkingId, TierNo } from '@core/canon-types';

/* ------------------------------------------------------------------ views */

export type ViewId = 'home' | 'kb' | 'glossary' | 'settings' | 'monitor' | 'calendar' | 'about' | 'colophon';

export const HOME = '/system';
export const KB_PREFIX = '/system/kb/';

/** Fixed pages of the System Tools module, in navigation order. */
export const PAGES: { view: Exclude<ViewId, 'home' | 'kb'>; path: string; label: string; short: string }[] = [
  { view: 'glossary', path: '/system/glossary', label: 'Glossary of Terms', short: 'Glossary' },
  { view: 'calendar', path: '/system/calendar', label: 'Facility Calendar', short: 'Calendar' },
  { view: 'monitor', path: '/system/monitor', label: 'System Monitor', short: 'Monitor' },
  { view: 'settings', path: '/system/settings', label: 'Workstation Settings', short: 'Settings' },
  { view: 'about', path: '/system/about', label: 'About This Terminal', short: 'About' },
  { view: 'colophon', path: '/system/colophon', label: 'Colophon', short: 'Colophon' },
];

export function viewFor(path: string): ViewId {
  const p = path.replace(/\/+$/, '') || HOME;
  if (p === HOME) return 'home';
  if (p.startsWith(KB_PREFIX)) return 'kb';
  return PAGES.find((x) => x.path === p)?.view ?? 'home';
}

/** Help Desk articles among the registered routes, in article-number order. */
export function kbArticles(routes: RouteEntry[]): RouteEntry[] {
  return routes.filter((r) => r.app === 'system' && r.route.startsWith(KB_PREFIX)).sort((a, b) => a.docNo.localeCompare(b.docNo));
}

/** Local (title, number, summary) match used while the operator types in the help search box. */
export function matchHelp(list: RouteEntry[], q: string): RouteEntry[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((r) => {
    const hay = `${r.docNo} ${r.title} ${r.summary}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/* --------------------------------------------------------------- markings */

/** Highest-ranked marking among `ids`; the lowest-ranked canon marking when `ids` is empty. */
export function highestMarking(ids: MarkingId[], markings: readonly Marking[]): MarkingId {
  const rank = new Map(markings.map((m) => [m.id, m.rank]));
  const sorted = [...markings].sort((a, b) => a.rank - b.rank);
  let best: MarkingId | null = null;
  for (const id of ids) if (best === null || (rank.get(id) ?? 0) > (rank.get(best) ?? 0)) best = id;
  return best ?? sorted[0]?.id ?? 'TSSCI-OSC';
}

/* --------------------------------------------------------------- glossary */

export function glossaryLetter(term: string): string {
  const c = term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export function filterGlossary(terms: GlossaryTerm[], q: string, letter: string | null): GlossaryTerm[] {
  const needle = q.trim().toLowerCase();
  return terms.filter((t) => {
    if (letter && glossaryLetter(t.term) !== letter) return false;
    if (!needle) return true;
    return t.term.toLowerCase().includes(needle) || t.def.toLowerCase().includes(needle);
  });
}

/** Terms whose see-also list names `term` (the reverse references). */
export function referencedBy(terms: GlossaryTerm[], term: string): string[] {
  return terms.filter((t) => t.term !== term && t.seeAlso.includes(term)).map((t) => t.term);
}

/* --------------------------------------------------------------- calendar */

export interface DayCell {
  iso: string; // 2008-05-01
  day: number;
  inMonth: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Weeks (Sunday first) covering the month; month is 1-based. */
export function monthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86400000);
  const last = new Date(Date.UTC(year, month, 0));
  const weeks: DayCell[][] = [];
  for (let d = start; ; ) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        iso: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === month - 1,
      });
      d = new Date(d.getTime() + 86400000);
    }
    weeks.push(week);
    if (d.getTime() > last.getTime()) break;
  }
  return weeks;
}

/** An event is shown in full when the session tier is at least as senior as the event's tier. */
export function eventReleased(ev: Pick<CalendarEvent, 'tier'>, tier: TierNo): boolean {
  return tier <= ev.tier;
}

export function sortEvents(evs: CalendarEvent[]): CalendarEvent[] {
  const key = (e: CalendarEvent) => `${e.date} ${e.startZ ?? '0000Z'} ${e.id}`;
  return [...evs].sort((a, b) => key(a).localeCompare(key(b)));
}

/** Minutes past midnight for "0930Z"; null when absent. */
function zMinutes(z: string | null): number | null {
  const m = z ? /^(\d{2})(\d{2})Z$/.exec(z) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export type EventState = 'SCHEDULED' | 'IN PROGRESS' | 'COMPLETE' | 'NO TIMES ENTERED';

/** State of an event against the in-world date (ISO) and the real UTC time of day in minutes. */
export function eventState(ev: Pick<CalendarEvent, 'date' | 'startZ' | 'endZ'>, todayIso: string, nowMin: number): EventState {
  if (ev.date < todayIso) return 'COMPLETE';
  if (ev.date > todayIso) return 'SCHEDULED';
  const s = zMinutes(ev.startZ);
  const e = zMinutes(ev.endZ);
  if (s === null) return 'NO TIMES ENTERED';
  if (nowMin < s) return 'SCHEDULED';
  if (e === null) return nowMin === s ? 'IN PROGRESS' : 'COMPLETE';
  return nowMin < e ? 'IN PROGRESS' : 'COMPLETE';
}

/* ------------------------------------------------------------ print queue */

export const PRINT_PURGE_MS = 4 * 60 * 60 * 1000;

export interface PrintJob {
  job: string; // PQ-0318
  docNo: string;
  at: string; // ISO
  state: 'SPOOLING' | 'SENT TO DEVICE';
}

/**
 * Print jobs from the audit trail, newest first. Jobs older than the purge interval are dropped;
 * the newest `spooling` jobs are still in the spooler.
 */
export function printJobs(entries: AuditEntry[], nowIso: string, spooling: number): PrintJob[] {
  const now = Date.parse(nowIso);
  const jobs = entries
    .filter((e) => e.kind === 'print' && now - Date.parse(e.at) <= PRINT_PURGE_MS && now - Date.parse(e.at) >= -60000)
    .sort((a, b) => b.seq - a.seq);
  return jobs.map((e, i) => ({
    job: `PQ-${String(e.seq % 10000).padStart(4, '0')}`,
    docNo: e.subject,
    at: e.at,
    state: i < spooling ? 'SPOOLING' : 'SENT TO DEVICE',
  }));
}

/* ------------------------------------------------------------------- time */

/** "02:07:45" from milliseconds; days carried as "3d 02:07:45". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = `${pad2(Math.floor((s % 86400) / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
  return d ? `${d}d ${hms}` : hms;
}

/** "1430Z" from an ISO timestamp. */
export function zuluOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}Z`;
}
