/**
 * The operator's own access, appended to an incident ticket's access log.
 *
 * A ticket's "Access log" section (heading id `access-log`) lists the recorded
 * access to the items it concerns. Whatever app renders the ticket (Assurance's
 * ticket view, the Records Library viewer) appends this workstation's own audit
 * entries to that table in the log's columns, so the record is the same wherever
 * the ticket is read.
 */
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "19 MAY 2008 1430Z (1030 EDT)"; site-local for ALPHA-03 in May is UTC-4. */
function stamp(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(h)}${pad(m)}Z (${pad((h + 20) % 24)}${pad(m)} EDT)`;
}

/** Accession numbers (RD-ACC-YY-NNNNN) named in a string. */
export function accessionsIn(s: string): string[] {
  return [...new Set(s.match(/RD-ACC-\d{2}-\d{5}/g) ?? [])];
}

/**
 * Terms an incident ticket covers: its number, accession numbers in its title and
 * summary, and the documents it cross-references at the top marking (`topMarking`).
 */
export function ticketTerms(
  entry: Pick<RouteEntry, 'docNo' | 'title'>,
  doc: Pick<DocJson, 'title' | 'summary' | 'xrefs'> | null,
  byDocNo: (d: string) => Pick<RouteEntry, 'marking'> | undefined,
  topMarking: MarkingId | string | undefined,
): string[] {
  const t = new Set<string>([entry.docNo, ...accessionsIn(entry.title)]);
  if (doc) {
    for (const a of accessionsIn(`${doc.title} ${doc.summary}`)) t.add(a);
    for (const x of doc.xrefs) if (topMarking && byDocNo(x.docNo)?.marking === topMarking) t.add(x.docNo);
  }
  return [...t];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The operator's own entries for a ticket's access log, in the log's columns
 * (Date / time, Workstation, Operator, Recorded as). `items` are the index items the log
 * covers (e.g. the EYES ONLY image); `accessions` are accession numbers named by the ticket.
 */
export function accessLogRows(
  entries: readonly AuditEntry[],
  o: { ticket: string; items: readonly string[]; accessions: readonly string[]; workstation: string; operator: string },
): string[][] {
  const items = new Set(o.items.map((x) => x.toUpperCase()));
  const acc = o.accessions.map((x) => x.toUpperCase());
  const ticket = o.ticket.toUpperCase();
  const out: string[][] = [];
  for (const e of entries) {
    const subj = e.subject.toUpperCase();
    let what: string | null = null;
    if (e.kind === 'doc.read' && items.has(subj)) what = `Opened. Access recorded under ${o.ticket}.`;
    else if (e.kind === 'doc.read' && subj === ticket) what = 'Incident record displayed.';
    else if (e.kind === 'search' && (subj.includes(ticket) || acc.some((a) => subj.includes(a) || subj.includes(a.slice(-5))))) what = `Index query "${e.subject}".`;
    if (what) out.push([stamp(e.at), o.workstation, o.operator, what]);
  }
  return out;
}

/** Append rows to the first table after the heading with id `headingId` (before the next h2). */
export function appendRowsAfterHeading(html: string, headingId: string, rows: readonly string[][]): string {
  if (!rows.length) return html;
  const h = html.search(new RegExp(`<h[1-6][^>]*\\bid="${headingId}"`));
  if (h < 0) return html;
  const nextH2 = html.indexOf('<h2', h + 3);
  const end = html.indexOf('</tbody>', h);
  if (end < 0 || (nextH2 >= 0 && end > nextH2)) return html;
  const tr = rows.map((r) => `<tr class="asr-own-access">${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return html.slice(0, end) + tr + html.slice(end);
}

export const ACCESS_LOG_HEADING = 'access-log';

/**
 * The document with this workstation's own access appended to its access log.
 * Returns `doc` unchanged when it has no access-log table or nothing to add.
 */
export function withOwnAccess(
  doc: DocJson,
  o: {
    entries: readonly AuditEntry[];
    terms: readonly string[];
    workstation: string;
    operator: string;
  },
): DocJson {
  if (!doc.html.includes(`id="${ACCESS_LOG_HEADING}"`)) return doc;
  const accessions = o.terms.filter((t) => t.startsWith('RD-ACC-'));
  const items = o.terms.filter((t) => t !== doc.docNo && !t.startsWith('RD-ACC-'));
  const rows = accessLogRows(o.entries, { ticket: doc.docNo, items, accessions, workstation: o.workstation, operator: o.operator });
  if (!rows.length) return doc;
  return { ...doc, html: appendRowsAfterHeading(doc.html, ACCESS_LOG_HEADING, rows) };
}
