/**
 * Pure helpers for the Assurance application (Office of Internal Assurance workbench).
 * No DOM, no services: everything here is unit-tested in logic.test.ts.
 */
import type { AuditEntry, AuditKind, RouteEntry } from '@core/contracts';
import type { Contractor, Facility, Marking, MarkingId } from '@core/canon-types';

/* ------------------------------------------------------------- markings */

/** Highest-ranked marking among `ids` (rank from canon.markings). Falls back to the lowest canon marking. */
export function highestMarking(ids: readonly (MarkingId | null | undefined)[], markings: readonly Marking[]): MarkingId {
  const byId = new Map(markings.map((m) => [m.id, m]));
  let best: Marking | undefined;
  for (const id of ids) {
    const m = id ? byId.get(id) : undefined;
    if (m && (!best || m.rank > best.rank)) best = m;
  }
  if (best) return best.id;
  const lowest = [...markings].sort((a, b) => a.rank - b.rank)[0];
  return (lowest?.id ?? 'TSSCI-OSC') as MarkingId;
}

/* ---------------------------------------------------------------- audit */

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Audit reference in the OIA house format: AUD-{yymmdd}-{serial6}. */
export function auditRef(e: Pick<AuditEntry, 'at' | 'seq'>): string {
  const d = new Date(e.at);
  if (Number.isNaN(d.getTime())) return `AUD-000000-${pad(e.seq, 6)}`;
  return `AUD-${pad(d.getUTCFullYear() % 100)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(e.seq, 6)}`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "1430Z (1030 EDT)". Site-local for ALPHA-03 in May is always UTC-4 (see src/core/session.ts). */
export function auditTime(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${pad(h)}${pad(m)}Z (${pad((h + 20) % 24)}${pad(m)} EDT)`;
}

/** "19 MAY 2008" */
export function auditDate(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** True when a window.open entry records a refusal rather than an opened window. */
export function isRefusal(e: Pick<AuditEntry, 'kind' | 'detail'>): boolean {
  return e.kind === 'window.open' && /refused|not authori[sz]ed/i.test(e.detail);
}

/** The action column, in the Office of Internal Assurance's terms. */
export function actionLabel(e: Pick<AuditEntry, 'kind' | 'detail'>): string {
  if (isRefusal(e)) return 'REQUEST REFUSED';
  return ACTION_LABELS[e.kind] ?? e.kind.toUpperCase();
}

export const ACTION_LABELS: Record<AuditKind, string> = {
  'window.open': 'WINDOW OPENED',
  'window.close': 'WINDOW CLOSED',
  'doc.read': 'DOCUMENT DISPLAYED',
  search: 'INDEX QUERY',
  'redaction.hover': 'WITHHELD ITEM EXAMINED',
  print: 'REPRODUCTION',
  'form.submit': 'FORM SUBMITTED',
  'mail.read': 'MESSAGE OPENED',
  'mail.send': 'MESSAGE DISPATCHED',
  'terminal.cmd': 'COMMAND ENTERED',
  'transit.watch': 'BOARD DISPLAYED',
  'clearance.grant': 'ACCESS RECORDED',
  login: 'AUTHENTICATED',
  logout: 'LOGGED OFF',
  timeout: 'SESSION LOCKED',
  system: 'SYSTEM NOTICE',
  control: 'CONTROL OPERATED',
  trace: 'ROUTED ITEM RECEIVED',
};

/** Filter groups offered in the activity view. */
export type ActivityFilter = 'all' | 'documents' | 'withheld' | 'refusals' | 'queries' | 'reproduction' | 'forms' | 'session';

export const ACTIVITY_FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All recorded actions' },
  { id: 'documents', label: 'Documents displayed' },
  { id: 'withheld', label: 'Withheld items examined' },
  { id: 'refusals', label: 'Requests refused' },
  { id: 'queries', label: 'Index queries and commands' },
  { id: 'reproduction', label: 'Reproduction' },
  { id: 'forms', label: 'Forms and messages' },
  { id: 'session', label: 'Sign-in and locking' },
];

export function matchesFilter(e: AuditEntry, f: ActivityFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'documents':
      return e.kind === 'doc.read';
    case 'withheld':
      return e.kind === 'redaction.hover';
    case 'refusals':
      return isRefusal(e);
    case 'queries':
      return e.kind === 'search' || e.kind === 'terminal.cmd';
    case 'reproduction':
      return e.kind === 'print';
    case 'forms':
      return e.kind === 'form.submit' || e.kind === 'mail.send' || e.kind === 'mail.read' || e.kind === 'clearance.grant';
    case 'session':
      return e.kind === 'login' || e.kind === 'logout' || e.kind === 'timeout';
  }
}

/** Entries of the current sign-in: from the last `login` entry onward (all entries if none). */
export function currentSession(entries: readonly AuditEntry[]): AuditEntry[] {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i]!.kind === 'login') return entries.slice(i);
  }
  return entries.slice();
}

export interface ActivitySummary {
  total: number;
  documents: number; // distinct docNos displayed
  displays: number; // doc.read entries
  withheld: number;
  refusals: number;
  queries: number;
  commands: number;
  prints: number;
  forms: number;
  /** Distinct docNos displayed at or above the given marking rank. */
  highDocs: string[];
  firstAt: string | null;
}

/**
 * Counts for the activity summary. `markingOf` resolves a docNo to its marking rank (or null);
 * documents displayed at rank >= `highRank` are listed in `highDocs`.
 */
export function summarize(entries: readonly AuditEntry[], markingRankOf: (docNo: string) => number | null, highRank: number): ActivitySummary {
  const docs = new Set<string>();
  const high = new Set<string>();
  const s: ActivitySummary = { total: entries.length, documents: 0, displays: 0, withheld: 0, refusals: 0, queries: 0, commands: 0, prints: 0, forms: 0, highDocs: [], firstAt: entries[0]?.at ?? null };
  for (const e of entries) {
    if (e.kind === 'doc.read') {
      s.displays++;
      docs.add(e.subject);
      const r = markingRankOf(e.subject);
      if (r !== null && r >= highRank) high.add(e.subject);
    } else if (e.kind === 'redaction.hover') s.withheld++;
    else if (e.kind === 'search') s.queries++;
    else if (e.kind === 'terminal.cmd') s.commands++;
    else if (e.kind === 'print') s.prints++;
    else if (e.kind === 'form.submit') s.forms++;
    if (isRefusal(e)) s.refusals++;
  }
  s.documents = docs.size;
  s.highDocs = [...high];
  return s;
}

/**
 * Audit entries that bear on an incident ticket: any entry whose subject or detail names
 * one of `terms` (ticket number, related document numbers, accession numbers), case-insensitive.
 * Sign-in and close entries are left out; they do not concern the item.
 */
export function accessRecord(entries: readonly AuditEntry[], terms: readonly string[]): AuditEntry[] {
  const t = terms.map((x) => x.trim().toUpperCase()).filter(Boolean);
  if (!t.length) return [];
  return entries.filter((e) => {
    if (e.kind === 'login' || e.kind === 'logout' || e.kind === 'timeout' || e.kind === 'window.close') return false;
    const hay = `${e.subject} ${e.detail}`.toUpperCase();
    return t.some((x) => hay.includes(x));
  });
}

// Moved to src/apps/shared/access-log (also used by the Records Library viewer).
export { accessionsIn, accessLogRows, appendRowsAfterHeading } from '../shared/access-log';

/* ------------------------------------------------------------ incidents */

const TICKET_NO = /^OIA-\d{2}-\d{3}$/;

/** Incident tickets among the registered routes: document numbers in the OIA-YY-NNN series. */
export function incidentRoutes(routes: readonly RouteEntry[]): RouteEntry[] {
  return routes.filter((r) => TICKET_NO.test(r.docNo)).sort((a, b) => b.docNo.localeCompare(a.docNo));
}

/** "Security Incident OIA-08-031: Electronic image ..." -> "Electronic image ...". */
export function ticketSubject(r: Pick<RouteEntry, 'title' | 'docNo'>): string {
  const i = r.title.indexOf(':');
  if (i > 0 && r.title.slice(0, i).includes(r.docNo)) return r.title.slice(i + 1).trim();
  return r.title;
}

export interface FieldLine {
  label: string;
  value: string;
}

/** `fields` as [{label, value}] or as a { Label: value } map (STYLE.md §5). */
export function normalizeFields(v: unknown): FieldLine[] {
  const out: FieldLine[] = [];
  const val = (x: unknown) => (typeof x === 'string' ? x : typeof x === 'number' || typeof x === 'boolean' ? String(x) : null);
  if (Array.isArray(v)) {
    for (const o of v) {
      if (o && typeof o === 'object' && 'label' in o) {
        const rec = o as Record<string, unknown>;
        const value = val(rec.value);
        if (typeof rec.label === 'string' && value !== null) out.push({ label: rec.label, value });
      }
    }
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const value = val(x);
      if (value !== null) out.push({ label: k, value });
    }
  }
  return out;
}

export interface TicketFields {
  status?: string;
  severity?: string;
  opened?: string;
  officer?: string;
  suspense?: string;
  reportedBy?: string;
}

const FIELD_RULES: [keyof TicketFields, RegExp][] = [
  ['status', /^(ticket |incident )?status/i],
  ['severity', /severity|priority|category/i],
  ['opened', /opened|date (of )?report|reported on|date raised/i],
  ['officer', /action officer|assigned|investigating officer/i],
  ['suspense', /suspense/i],
  ['reportedBy', /reported by|reporting (party|officer)|reporter/i],
];

/** Pick the ticket header fields out of a record's `fields` by label. First match wins. */
export function ticketFields(lines: readonly FieldLine[]): TicketFields {
  const out: TicketFields = {};
  for (const l of lines) {
    for (const [k, re] of FIELD_RULES) {
      if (out[k] === undefined && re.test(l.label)) {
        out[k] = l.value;
        break;
      }
    }
  }
  return out;
}

/** Section headings that hold a ticket's worklog. */
export const WORKLOG_HEADING = /work ?log|action log|actions taken|log of action|inquiry log|chronolog/i;

/* -------------------------------------------------------------- threats */

/** Route of the threat register page for a protocol designation ("OSC-CP-04" -> OSC-ASR-THR-04). */
export function threatRouteFor(designation: string, routes: readonly RouteEntry[]): RouteEntry | undefined {
  const n = /(\d{2})$/.exec(designation)?.[1];
  if (!n) return undefined;
  return routes.find((r) => r.docNo === `OSC-ASR-THR-${n}`);
}

/* ---------------------------------------------------------- geography */

/**
 * Sites whose geography is released to the holder without SEXTANT: the holder's own site and
 * the facilities on its regional network (CONTRACTS: SEXTANT = "network geography beyond the
 * holder's assigned site"). DELTA sites are never included.
 */
export function releasedSites(site: string, facilities: readonly Pick<Facility, 'id' | 'class' | 'network'>[]): Set<string> {
  const own = facilities.find((f) => f.id === site);
  const out = new Set<string>([site]);
  if (!own?.network) return out;
  for (const f of facilities) if (f.class !== 'DELTA' && f.network === own.network) out.add(f.id);
  return out;
}

/* ---------------------------------------------------------- contractors */

export interface ContractorStats {
  primes: number;
  subs: number;
  meanSubs: number;
  maxSites: number;
  overLimit: string[];
  sitesCovered: number;
}

export function contractorStats(register: readonly Pick<Contractor, 'id' | 'sites' | 'subcontractors'>[], limit: number): ContractorStats {
  const covered = new Set<string>();
  let subs = 0;
  let maxSites = 0;
  const over: string[] = [];
  for (const c of register) {
    subs += c.subcontractors;
    maxSites = Math.max(maxSites, c.sites.length);
    if (c.sites.length > limit) over.push(c.id);
    for (const s of c.sites) covered.add(s);
  }
  return {
    primes: register.length,
    subs,
    meanSubs: register.length ? Math.round((subs / register.length) * 10) / 10 : 0,
    maxSites,
    overLimit: over,
    sitesCovered: covered.size,
  };
}

/* ------------------------------------------------------- audit review (pass two) */

/** Audit kinds offered in the audit review filter, in the order the office lists them. */
export const REVIEW_KINDS: AuditKind[] = [
  'doc.read', 'redaction.hover', 'window.open', 'search', 'terminal.cmd', 'print', 'form.submit',
  'mail.read', 'mail.send', 'clearance.grant', 'transit.watch', 'control', 'trace', 'system',
  'login', 'logout', 'timeout', 'window.close',
];

export interface TrailFilter {
  /** An AuditKind, 'refusals', or 'all'. */
  kind: string;
  /** In-world day "2008-05-19", or 'all'. */
  date: string;
  text: string;
}

/** In-world days present in a trail, oldest first ("2008-05-19"). */
export function trailDates(entries: readonly Pick<AuditEntry, 'at'>[]): string[] {
  return [...new Set(entries.map((e) => e.at.slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

/** Entries of another operator's trail matching the review filter, newest first. */
export function filterTrail(entries: readonly AuditEntry[], f: TrailFilter): AuditEntry[] {
  const q = f.text.trim().toUpperCase();
  return entries
    .filter((e) => f.kind === 'all' || (f.kind === 'refusals' ? isRefusal(e) : e.kind === f.kind))
    .filter((e) => f.date === 'all' || e.at.slice(0, 10) === f.date)
    .filter((e) => !q || `${e.subject} ${e.detail} ${actionLabel(e)} ${auditRef(e)}`.toUpperCase().includes(q))
    .slice()
    .reverse();
}

/** Categories under which the office records an audit finding. */
export const FINDING_CATEGORIES: { id: string; label: string }[] = [
  { id: 'need-to-know', label: 'Access outside need to know' },
  { id: 'withheld', label: 'Repeated examination of withheld material' },
  { id: 'refusals', label: 'Repeated refused requests' },
  { id: 'reproduction', label: 'Reproduction not accounted for' },
  { id: 'traffic', label: 'Message traffic outside the chain of command' },
  { id: 'controls', label: 'Plant control operated without authority' },
  { id: 'procedure', label: 'Procedural irregularity' },
];

/**
 * Audit finding reference: OIA-AF-YY-NNN. Findings are numbered apart from incident tickets
 * (OIA-YY-NNN) so the series never collides with a ticket; serial from 101, one per finding.
 */
export function findingRef(existing: number, yy = '08'): string {
  return `OIA-AF-${yy}-${String(101 + Math.max(0, existing)).padStart(3, '0')}`;
}
