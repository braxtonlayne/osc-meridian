/**
 * Pure logic for the Directives library: index rows, supersession graph,
 * paragraph references, and acknowledgement records read back from the audit trail.
 * No DOM, no services: unit-tested in model.test.ts.
 */
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';

/* ------------------------------------------------------------ numbers */

/** "OSC-DIR-0412" -> "DIR-0412" (the short form used in citations). */
export function shortNo(docNo: string): string {
  return docNo.replace(/^OSC-/, '');
}

/** "OSC-DIR-0412" -> 412; NaN-safe (non-directive numbers sort last). */
export function serialOf(docNo: string): number {
  const m = /DIR-(\d+)/.exec(docNo);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** Accept "0412", "412", "DIR-412", "osc-dir-0412" -> "OSC-DIR-0412", or null. */
export function normalizeDirNo(input: string): string | null {
  const m = /^\s*(?:osc-)?(?:dir-?)?\s*(\d{1,4})\s*$/i.exec(input);
  if (!m) return null;
  return `OSC-DIR-${m[1]!.padStart(4, '0')}`;
}

/* ------------------------------------------------------- frontmatter */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const s = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined);

/** The directive block of a DocJson's frontmatter (`directive:`), merged over any top-level keys. */
export function directiveFm(doc: Pick<DocJson, 'frontmatter'> | undefined): Obj {
  const fm = (doc?.frontmatter ?? {}) as Obj;
  const block = isObj(fm.directive) ? fm.directive : {};
  return { ...fm, ...block };
}

/** A DocJson whose frontmatter carries the directive block flattened, as the directive template reads it. */
export function flattenForView(doc: DocJson): DocJson {
  return { ...doc, frontmatter: directiveFm(doc) };
}

export interface PredecessorRef {
  docNo: string;
  title?: string;
  effective?: string;
  note?: string;
}

const DIRNO_RE = /\bOSC-DIR-\d{3,4}\b/gi;

/**
 * Supersession references in any of the accepted shapes: a docNo, a published supersession
 * line ("OSC-DIR-0412 Revision 2, 03 SEP 2007. Revision 1 cancelled OSC-DIR-0398."),
 * a list of either, or [{docNo,title,effective,note}]. Every directive number named is returned.
 */
export function refsOf(v: unknown): PredecessorRef[] {
  const list = Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
  const out: PredecessorRef[] = [];
  const add = (r: PredecessorRef) => {
    if (!out.some((x) => x.docNo === r.docNo)) out.push(r);
  };
  for (const item of list) {
    if (typeof item === 'string') {
      for (const m of item.matchAll(DIRNO_RE)) add({ docNo: m[0].toUpperCase() });
    } else if (isObj(item)) {
      const no = s(item.docNo) ?? s(item.number) ?? s(item.no);
      if (no) add({ docNo: no.toUpperCase(), title: s(item.title), effective: s(item.effective) ?? s(item.date), note: s(item.note) ?? s(item.disposition) });
    }
  }
  return out;
}

const MON: Record<string, string> = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06', JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };

/** "03 SEP 2007" -> "2007-09-03". */
export function isoFromOsc(d: string): string | undefined {
  const m = /^(\d{1,2}) ([A-Z]{3}) (\d{4})$/i.exec(d.trim());
  const mon = m ? MON[m[2]!.toUpperCase()] : undefined;
  return m && mon ? `${m[3]}-${mon}-${m[1]!.padStart(2, '0')}` : undefined;
}

/** From a supersession line naming the directive's own number: the earlier revision it replaces. */
export function priorRevisionOf(line: string | undefined, docNo: string): { rev: number; date?: string } | null {
  if (!line) return null;
  const esc = docNo.replace(/[-]/g, '\\-');
  const m = new RegExp(`${esc}\\s+Revision\\s+(\\d+)(?:,?\\s*(?:of\\s+)?(\\d{1,2} [A-Z]{3} \\d{4}))?`, 'i').exec(line);
  if (!m) return null;
  return { rev: Number(m[1]), date: m[2] ? isoFromOsc(m[2]) : undefined };
}

/** Title and disposition of a cancelled predecessor, from the body's supersession paragraph. */
export function predecessorFromText(html: string, docNo: string): { title?: string; note?: string } {
  const text = html.replace(/<[^>]+>/g, '');
  const esc = docNo.replace(/[-]/g, '\\-');
  const m = new RegExp(`${esc}, ([^,.;]{3,120}), which is (cancelled|withdrawn|rescinded)`, 'i').exec(text);
  if (m) return { title: m[1]!.trim(), note: m[2]!.toLowerCase() };
  if (new RegExp(`(cancel\\w*|absorbs and cancels)\\s+${esc}`, 'i').test(text)) return { note: 'cancelled' };
  return {};
}

export interface Revision {
  rev: number;
  date?: string;
  change?: string;
  by?: string;
}

function revisionsOf(v: unknown): Revision[] {
  if (!Array.isArray(v)) return [];
  const out: Revision[] = [];
  for (const r of v) {
    if (!isObj(r)) continue;
    const rev = Number(r.rev ?? r.revision);
    if (!Number.isFinite(rev)) continue;
    out.push({ rev, date: s(r.date), change: s(r.change), by: s(r.by) });
  }
  return out.sort((a, b) => b.rev - a.rev);
}

/* ---------------------------------------------------------- index rows */

export interface DirRow {
  docNo: string;
  id: string;
  route: string;
  title: string;
  marking: RouteEntry['marking'];
  access?: RouteEntry['access'];
  /** Division code of the office of primary responsibility ("PV"). */
  opr: string;
  /** OPR as carried on the route ("PV/ALPHA-01"). */
  oprFull: string;
  /** OPR as written in the directive box, which may name a section ("PV/ALPHA-01 (Training Records)"). */
  oprDetail: string;
  /** Supersession line as published, when it is more than a bare number. */
  supersessionLine?: string;
  /** Earlier revision of this number replaced by the current one. */
  priorRevision: { rev: number; date?: string } | null;
  /** Revision history, newest first. */
  revisions: Revision[];
  effective: string;
  revision: number;
  category?: string;
  certifiedCurrent?: string;
  /** Explicit status from the directive block, upper-cased, when given. */
  declaredStatus?: string;
  supersedes: PredecessorRef[];
  /** Directive block stated "superseded by" (rare: normally derived). */
  supersededByDeclared: string[];
  /** True once the DocJson has been read (frontmatter known). */
  loaded: boolean;
}

export function rowFromEntry(e: RouteEntry, doc?: DocJson): DirRow {
  const fm = doc ? directiveFm(doc) : {};
  const top = (doc?.frontmatter ?? {}) as Obj;
  const oprFull = s(top.opr) ?? e.originator;
  const oprDetail = s(fm.opr) ?? oprFull;
  const rawLine = typeof fm.supersedes === 'string' ? fm.supersedes.trim() : undefined;
  const sup = [...refsOf(doc?.supersedes), ...refsOf(fm.supersedes)].filter((r, i, a) => r.docNo !== e.docNo && a.findIndex((x) => x.docNo === r.docNo) === i);
  if (doc) {
    for (const p of sup) {
      if (p.title && p.note) continue;
      const t = predecessorFromText(doc.html, p.docNo);
      p.title ??= t.title;
      p.note ??= t.note;
    }
  }
  return {
    docNo: e.docNo,
    id: e.id,
    route: e.route,
    title: e.title,
    marking: e.marking,
    access: e.access,
    opr: oprFull.split('/')[0]!.trim(),
    oprFull,
    oprDetail,
    supersessionLine: rawLine && !/^none$/i.test(rawLine) && rawLine.toUpperCase() !== sup[0]?.docNo ? rawLine : undefined,
    priorRevision: priorRevisionOf(rawLine, e.docNo),
    revisions: revisionsOf(top.revisions ?? fm.revisions),
    effective: s(fm.effective) ?? e.date,
    revision: e.revision,
    category: s(fm.category),
    certifiedCurrent: s(fm.certifiedCurrent),
    declaredStatus: s(fm.status)?.toUpperCase(),
    supersedes: sup,
    supersededByDeclared: refsOf(fm.supersededBy).map((r) => r.docNo),
    loaded: !!doc,
  };
}

/* ------------------------------------------------------- supersession */

export interface DirNode {
  docNo: string;
  /** Held in the electronic library (has a route). */
  held: boolean;
  row?: DirRow;
  /** Details known only from a successor's supersession line. */
  ref?: PredecessorRef;
  supersedes: string[];
  supersededBy: string[];
}

export type Graph = Map<string, DirNode>;

export function buildGraph(rows: DirRow[]): Graph {
  const g: Graph = new Map();
  const node = (docNo: string): DirNode => {
    let n = g.get(docNo);
    if (!n) {
      n = { docNo, held: false, supersedes: [], supersededBy: [] };
      g.set(docNo, n);
    }
    return n;
  };
  for (const r of rows) {
    const n = node(r.docNo);
    n.held = true;
    n.row = r;
  }
  const link = (newer: string, older: string) => {
    if (newer === older) return;
    const a = node(newer);
    const b = node(older);
    if (!a.supersedes.includes(older)) a.supersedes.push(older);
    if (!b.supersededBy.includes(newer)) b.supersededBy.push(newer);
  };
  for (const r of rows) {
    for (const p of r.supersedes) {
      link(r.docNo, p.docNo);
      const pn = node(p.docNo);
      if (!pn.held && !pn.ref) pn.ref = p;
    }
    for (const nb of r.supersededByDeclared) link(nb, r.docNo);
  }
  return g;
}

export type Status = 'CURRENT' | 'SUPERSEDED' | string;

/** Status in words: declared status wins; otherwise SUPERSEDED when any directive supersedes it. */
export function statusOf(docNo: string, g: Graph): Status {
  const n = g.get(docNo);
  if (n?.row?.declaredStatus) return n.row.declaredStatus;
  if (n && !n.held && /cancel/i.test(n.ref?.note ?? '')) return 'CANCELLED';
  if (n && n.supersededBy.length) return 'SUPERSEDED';
  return 'CURRENT';
}

export interface Issue {
  rev: number;
  date?: string;
  change?: string;
  current: boolean;
}

/**
 * Issues of one held directive, newest first: the current revision, then earlier revisions
 * from the revision history, or the one named in the supersession line when there is no history.
 */
export function issuesOf(r: DirRow): Issue[] {
  const out: Issue[] = [];
  const hist = new Map(r.revisions.map((x) => [x.rev, x]));
  out.push({ rev: r.revision, date: r.effective, change: hist.get(r.revision)?.change, current: true });
  for (const x of r.revisions) if (x.rev < r.revision) out.push({ rev: x.rev, date: x.date, change: x.change, current: false });
  if (r.priorRevision && !hist.has(r.priorRevision.rev) && r.priorRevision.rev < r.revision) {
    out.push({ rev: r.priorRevision.rev, date: r.priorRevision.date, current: false });
    out.sort((a, b) => b.rev - a.rev);
  }
  return out;
}

/** Short description of what the current issue replaced, for tables. */
export function supersedesText(r: DirRow): string {
  const parts: string[] = [];
  if (r.priorRevision) parts.push(`Rev ${r.priorRevision.rev}`);
  else {
    const earlier = r.revisions.find((x) => x.rev < r.revision);
    if (earlier) parts.push(`Rev ${earlier.rev}`);
  }
  for (const p of r.supersedes) parts.push(`${shortNo(p.docNo)}${/cancel/i.test(p.note ?? '') ? ' (cancelled)' : ''}`);
  return parts.length ? parts.join('; ') : 'None (original issue)';
}

/**
 * The lineage containing `docNo`, newest first. Walks to the newest successor
 * (first successor at each branch), then back through predecessors. Cycles are cut.
 */
export function lineage(docNo: string, g: Graph): string[] {
  const seen = new Set<string>([docNo]);
  let head = docNo;
  for (;;) {
    const n = g.get(head);
    const next = n?.supersededBy.find((x) => !seen.has(x));
    if (!next) break;
    seen.add(next);
    head = next;
  }
  const out: string[] = [];
  const walked = new Set<string>();
  let cur: string | undefined = head;
  while (cur && !walked.has(cur)) {
    walked.add(cur);
    out.push(cur);
    cur = g.get(cur)?.supersedes.find((x) => !walked.has(x));
  }
  if (!out.includes(docNo)) out.push(docNo);
  return out;
}

/** Every lineage with at least two issues, newest head first by serial. Held directives with no supersession are excluded. */
export function allLineages(g: Graph): string[][] {
  const heads = [...g.values()].filter((n) => n.supersededBy.length === 0 && n.supersedes.length > 0);
  return heads.map((h) => lineage(h.docNo, g)).sort((a, b) => serialOf(a[0]!) - serialOf(b[0]!));
}

/* ---------------------------------------------------------- paragraphs */

export interface ParaRef {
  sec: number;
  sub?: number;
  /** Lettered subparagraph, e.g. 4(c): `sub` is the letter index (a = 1). */
  letter?: boolean;
}

/** "#para-6", "para-6.2", "6", "6.2", "para 6(b)" -> {sec, sub}. Sub-letters map a=1. */
export function parsePara(input: string): ParaRef | null {
  const t = input.trim().replace(/^#/, '').replace(/^para(?:graph)?[-\s.]*/i, '');
  const m = /^(\d{1,2})(?:[.\s]*(\d{1,2})|\s*\(?([a-z])\)?)?\.?$/i.exec(t);
  if (!m) return null;
  const sec = Number(m[1]);
  if (!sec) return null;
  if (m[2]) return { sec, sub: Number(m[2]) };
  if (m[3]) return { sec, sub: m[3].toLowerCase().charCodeAt(0) - 96, letter: true };
  return { sec };
}

export function paraKey(p: ParaRef): string {
  if (p.sub && p.letter) return `${p.sec}${String.fromCharCode(96 + p.sub)}`;
  return p.sub ? `${p.sec}.${p.sub}` : String(p.sec);
}

export function paraHash(p: ParaRef): string {
  return `#para-${paraKey(p)}`;
}

/**
 * Number the body the way the directive stylesheet does (counters on `h2` and
 * following `p`): returns, for each top-level child index, its paragraph key.
 */
export function numberBlocks(tags: string[]): (string | null)[] {
  let sec = 0;
  let sub = 0;
  return tags.map((tag) => {
    const t = tag.toUpperCase();
    if (t === 'H2') {
      sec++;
      sub = 0;
      return String(sec);
    }
    if (t === 'P' && sec > 0) {
      sub++;
      return `${sec}.${sub}`;
    }
    return null;
  });
}

/* ------------------------------------------------------ acknowledgement */

export const ACK_PREFIX = 'Acknowledgement of reading recorded';

export interface AckRecord {
  docNo: string;
  revision: number;
  receipt: string;
  at: string;
  seq: number;
}

const ACK_RE = /^Acknowledgement of reading recorded: (\S+) revision (\d+)\. Receipt (\S+)\./;

export function ackDetail(operator: string, docNo: string, revision: number, receipt: string, title: string): string {
  return `${ACK_PREFIX}: ${docNo} revision ${revision}. Receipt ${receipt}. Operator ${operator} certified having read and understood "${title}". Record held by the OPR for compliance reporting.`;
}

export function parseAcks(entries: readonly AuditEntry[]): AckRecord[] {
  const out: AckRecord[] = [];
  for (const e of entries) {
    if (e.kind !== 'form.submit') continue;
    const m = ACK_RE.exec(e.detail);
    if (!m) continue;
    out.push({ docNo: m[1]!, revision: Number(m[2]), receipt: m[3]!, at: e.at, seq: e.seq });
  }
  return out;
}

/** Receipt number: ACK/<short no>/R<rev>/<yy>-<serial5>. */
export function ackReceipt(docNo: string, revision: number, yy: string, serial: number): string {
  return `ACK/${shortNo(docNo)}/R${revision}/${yy}-${String(serial).padStart(5, '0')}`;
}

export type AckState = { kind: 'none' } | { kind: 'current'; rec: AckRecord } | { kind: 'earlier'; rec: AckRecord };

export function ackStateFor(docNo: string, revision: number, acks: AckRecord[]): AckState {
  const mine = acks.filter((a) => a.docNo === docNo);
  const cur = mine.filter((a) => a.revision === revision).pop();
  if (cur) return { kind: 'current', rec: cur };
  const earlier = mine.pop();
  return earlier ? { kind: 'earlier', rec: earlier } : { kind: 'none' };
}

/* ---------------------------------------------------------------- time */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "2008-05-19T14:30:05.000Z" -> "1430Z (1030 EDT)". */
export function zuluLocal(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return '';
  const h = Number(m[1]);
  return `${m[1]}${m[2]}Z (${pad2((h + 20) % 24)}${m[2]} EDT)`;
}

/* -------------------------------------------------------------- sorting */

const STATUS_ORDER: Record<string, number> = { CURRENT: 0, 'UNDER REVISION': 1, SUPERSEDED: 2, CANCELLED: 3 };
export function statusRank(st: string): number {
  return STATUS_ORDER[st] ?? 1.5;
}

export interface Filter {
  text: string;
  opr: string; // '' = all
  status: string; // '' = all
}

export function matches(r: DirRow, status: string, f: Filter): boolean {
  if (f.opr && r.opr !== f.opr) return false;
  if (f.status && status !== f.status) return false;
  const q = f.text.trim().toLowerCase();
  if (!q) return true;
  const hay = `${r.docNo} ${shortNo(r.docNo)} ${r.title} ${r.oprFull} ${r.category ?? ''}`.toLowerCase();
  return q.split(/\s+/).every((w) => hay.includes(w));
}
