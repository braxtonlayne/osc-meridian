/**
 * Message Traffic: pure model. No DOM, no services; unit-tested in model.test.ts.
 *
 * - message headers read from DocJson.frontmatter.message (or .cable)
 * - precedence and DTG handling
 * - recipient resolution against the directory (in-world .mer addresses only)
 * - Sent Items, read-receipt returns and delivery reports derived from the audit trail
 * - slot filling for engine-fed templates ({docNo}, {time}, ...)
 * - reply / forward quoting
 */
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { inWorldIso } from '@core/session';

/* ------------------------------------------------------------ precedence */

export const PRECEDENCES = ['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH'] as const;
export type Precedence = (typeof PRECEDENCES)[number];

/** Single-letter prosign used in message lists (R, P, O, Z). */
export const PRECEDENCE_CODE: Record<Precedence, string> = { ROUTINE: 'R', PRIORITY: 'P', IMMEDIATE: 'O', FLASH: 'Z' };

export function normPrecedence(v: unknown): Precedence {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return (PRECEDENCES as readonly string[]).includes(s) ? (s as Precedence) : 'ROUTINE';
}

/** Precedences an operator below Tier 2 may originate. */
export function mayOriginate(p: Precedence, tier: number): boolean {
  return tier <= 2 || p === 'ROUTINE' || p === 'PRIORITY';
}

/* ------------------------------------------------------------------- DTG */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "201507Z MAY 08" -> sortable "2008-05-20T15:07"; null when unparseable. */
export function dtgKey(dtg: string): string | null {
  const m = /^(\d{2})(\d{2})(\d{2})Z\s+([A-Z]{3})\s+(\d{2})$/.exec(dtg.trim().toUpperCase());
  if (!m) return null;
  const mon = MONTHS.indexOf(m[4]!);
  if (mon < 0) return null;
  return `20${m[5]}-${String(mon + 1).padStart(2, '0')}-${m[1]}T${m[2]}:${m[3]}`;
}

/** DTG for a real instant on the pinned in-world date (ISO from the audit trail). */
export function dtgFromIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}${m[4]}${m[5]}Z ${MONTHS[Number(m[2]) - 1]} ${m[1]!.slice(2)}`;
}

/**
 * Sent DTG when there is no delivery record: the message's own frontmatter DTG, else the
 * entry date; never later than the session date. A DTG dated after the session date (or an
 * unparseable one) gives way to the session clock (`sessionIso`, in-world ISO).
 */
export function fallbackSent(raw: string | undefined, entryDate: string, sessionIso: string): string {
  const day = sessionIso.slice(0, 10);
  const own = raw && dtgKey(raw) ? raw : undefined;
  const cand = own ?? (/^\d{4}-\d{2}-\d{2}$/.test(entryDate) ? dtgFromIso(`${entryDate}T00:00`) : undefined);
  const key = cand ? dtgKey(cand) : null;
  if (!cand || !key || key.slice(0, 10) > day) return dtgFromIso(sessionIso);
  return cand;
}

/** "1432Z (1032 EDT)" for an ISO instant (ALPHA-03 local is UTC-4 in May). */
export function zuluLocal(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return iso;
  const h = Number(m[1]);
  const local = `${String((h + 20) % 24).padStart(2, '0')}${m[2]}`;
  return `${m[1]}${m[2]}Z (${local} EDT)`;
}

/** "AUD-080520-004417" */
export function auditRef(e: Pick<AuditEntry, 'at' | 'seq'>): string {
  const m = /^\d{2}(\d{2})-(\d{2})-(\d{2})/.exec(e.at);
  const ymd = m ? `${m[1]}${m[2]}${m[3]}` : '000000';
  return `AUD-${ymd}-${String(e.seq).padStart(6, '0')}`;
}

/* --------------------------------------------------------------- headers */

export interface MsgHeaders {
  from: string;
  to: string[];
  cc: string[];
  precedence: Precedence;
  sent: string; // DTG
  sortKey: string;
  folder: string;
  thread: string | null;
  inReplyTo: string | null;
  readReceipt: boolean;
  subject: string;
  receipt?: string;
  attachments: string[]; // docNos
  slots: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : typeof v === 'string' && v.trim() ? [v] : [];
const strOf = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined);

/** Header block for a message or cable page: nested `message:`/`cable:` first, top level as fallback. */
export function headerBlock(doc: Pick<DocJson, 'frontmatter' | 'template'>): Record<string, unknown> {
  const fm = (doc.frontmatter ?? {}) as Record<string, unknown>;
  const msg = isObj(fm.message) ? fm.message : {};
  const cab = isObj(fm.cable) ? fm.cable : {};
  return doc.template === 'cable' ? { ...fm, ...msg, ...cab } : { ...fm, ...cab, ...msg };
}

/** Mail envelope: the `message:` block wins over a cable heading (list and reply use the envelope). */
function envelope(doc: Pick<DocJson, 'frontmatter'>): Record<string, unknown> {
  const fm = (doc.frontmatter ?? {}) as Record<string, unknown>;
  const msg = isObj(fm.message) ? fm.message : {};
  const cab = isObj(fm.cable) ? fm.cable : {};
  return { ...fm, ...cab, ...msg };
}

/** Arrival rule type from the envelope ("login", "after", "step", "audit"), when present. */
export function arrivalType(doc: Pick<DocJson, 'frontmatter'> | null | undefined): string | undefined {
  if (!doc) return undefined;
  const a = envelope(doc).arrival;
  return isObj(a) && typeof a.type === 'string' ? a.type : undefined;
}

export interface Delivery {
  at: string; // in-world ISO
  slots?: Record<string, string>;
}

/**
 * Headers for a delivered page. `entry` supplies fallbacks before the DocJson is loaded.
 * Traffic that arrives during the session (any arrival rule other than login) is stamped with
 * its delivery time; slot tokens in the subject are filled from the delivery record.
 */
export function readHeaders(entry: RouteEntry, doc?: DocJson | null, delivery?: Delivery, sessionIso: string = inWorldIso()): MsgHeaders {
  const h = doc ? envelope(doc) : {};
  const arrival = arrivalType(doc);
  const stamped = delivery?.at && arrival && arrival !== 'login' ? dtgFromIso(delivery.at) : undefined;
  const sent = stamped ?? fallbackSent(strOf(h.sent) ?? strOf(h.dtg), entry.date, sessionIso);
  const from = strOf(h.from) ?? strOf(h.fm) ?? entry.originator;
  const slots = strArr(h.slots);
  const subject = strOf(h.subject) ?? strOf(h.subj) ?? entry.title;
  const atts = Array.isArray(h.attachments)
    ? h.attachments.map((a) => (typeof a === 'string' ? a : isObj(a) ? strOf(a.docNo) : undefined)).filter((x): x is string => !!x)
    : [];
  return {
    from,
    to: strArr(h.to),
    cc: strArr(h.cc).concat(strArr(h.info)),
    precedence: normPrecedence(h.precedence),
    sent,
    sortKey: dtgKey(sent) ?? `${entry.date}T00:00`,
    folder: strOf(h.folder) ?? 'Inbox',
    thread: strOf(h.thread) ?? null,
    inReplyTo: strOf(h.inReplyTo) ?? null,
    readReceipt: h.readReceipt === true,
    subject: fillText(subject, delivery?.slots ?? {}, slots),
    receipt: strOf(h.receipt),
    attachments: atts,
    slots,
  };
}

/**
 * The same DocJson as DocumentView's templates read it: header block lifted to the top level,
 * slot tokens filled in the body, the subject and the title, and the delivery DTG on `sent`.
 */
export function forView(doc: DocJson, h: MsgHeaders, delivery?: Delivery): DocJson {
  const vals = delivery?.slots ?? {};
  const html = fillSlots(doc.html, vals, h.slots);
  const fm = { ...headerBlock(doc), subject: h.subject, sent: h.sent };
  const stampedDate = delivery?.at && arrivalType(doc) && arrivalType(doc) !== 'login' ? delivery.at.slice(0, 10) : doc.date;
  return { ...doc, html, title: fillText(doc.title, vals, h.slots), date: stampedDate, frontmatter: fm };
}

/* ------------------------------------------------------------- addresses */

export const MER_ADDRESS = /^[a-z0-9]+(?:[._-][a-z0-9]+)*@[a-z0-9]+(?:[.-][a-z0-9]+)*\.mer$/i;

export interface DirEntry {
  address: string;
  name: string; // may be a redaction sentinel
  role?: string;
  site?: string;
}

export type Resolution =
  | { status: 'resolved'; address: string; name: string; input: string }
  | { status: 'unlisted'; address: string; input: string }
  | { status: 'external'; input: string }
  | { status: 'ambiguous'; input: string; matches: DirEntry[] }
  | { status: 'unknown'; input: string };

/** Split "a; b, c" into tokens. */
export function splitRecipients(s: string): string[] {
  return s
    .split(/[;,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Resolve one recipient token against the directory. Only `.mer` mailboxes are reachable. */
export function resolveRecipient(input: string, dir: DirEntry[], isRedacted: (s: string) => boolean = () => false): Resolution {
  const t = input.trim().replace(/^<|>$/g, '');
  if (t.includes('@')) {
    if (!MER_ADDRESS.test(t)) return { status: 'external', input };
    const hit = dir.find((d) => d.address.toLowerCase() === t.toLowerCase());
    return hit ? { status: 'resolved', address: hit.address, name: hit.name, input } : { status: 'unlisted', address: t.toLowerCase(), input };
  }
  const q = t.toLowerCase();
  if (q.length < 2) return { status: 'unknown', input };
  const matches = dir.filter((d) => {
    if (isRedacted(d.name)) return false;
    const name = d.name.toLowerCase();
    const local = d.address.split('@')[0]!.toLowerCase();
    return name === q || local === q || name.split(/\s+/).some((w) => w.replace(/[^a-z]/g, '') === q.replace(/[^a-z]/g, ''));
  });
  if (matches.length === 1) return { status: 'resolved', address: matches[0]!.address, name: matches[0]!.name, input };
  if (matches.length > 1) return { status: 'ambiguous', input, matches };
  return { status: 'unknown', input };
}

/** "initial.surname@site..." -> "I. SURNAME"; "word.word@..." -> "WORD WORD". */
export function displayFromAddress(address: string): string {
  const local = address.split('@')[0] ?? address;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2 && parts[0]!.length === 1) return `${parts[0]!.toUpperCase()}. ${parts.slice(1).join(' ').toUpperCase()}`;
  return parts.join(' ').toUpperCase();
}

/* ------------------------------------------------------ sent traffic log */

export interface SentItem {
  kind: 'message';
  seq: number;
  at: string;
  to: string[];
  cc: string[];
  subject: string;
  precedence: Precedence;
  marking: MarkingId;
  receiptRequested: boolean;
  attachments: string[];
  inReplyTo: string | null;
  text: string;
}

export interface ReceiptReturn {
  kind: 'receipt';
  seq: number;
  at: string;
  docNo: string;
  to: string;
}

export interface Outgoing {
  to: string[];
  cc: string[];
  subject: string;
  precedence: Precedence;
  marking: MarkingId;
  receiptRequested: boolean;
  attachments: string[];
  inReplyTo: string | null;
  text: string;
}

/** Characters of message text an operator may send (one message-centre block). */
export const TEXT_LIMIT = 4000;

/** Line closing a quotation cut to fit the message-centre limit. */
export const QUOTE_CUT = '> [Remainder of the original message not quoted.]';

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * audit.log arguments for a dispatched message (CONTRACTS "Narrative engine"):
 * subject = message subject; data = { to, cc?, subject, body, ... } with comma-separated addresses.
 * Sent Items is rebuilt from these entries by parseSent.
 */
export function sendAudit(operator: string, m: Outgoing): { subject: string; detail: string; data: Record<string, string> } {
  const subject = clean(m.subject) || '(no subject)';
  const all = [...m.to, ...m.cc];
  const data: Record<string, string> = {
    to: m.to.join(','),
    subject,
    body: m.text.replace(/\r\n/g, '\n'),
    precedence: m.precedence,
    marking: m.marking,
  };
  if (m.cc.length) data.cc = m.cc.join(',');
  if (m.inReplyTo) data.inReplyTo = m.inReplyTo;
  if (m.attachments.length) data.attachments = m.attachments.join(',');
  if (m.receiptRequested) data.receipt = 'requested';
  const detail =
    `Operator ${operator} dispatched message "${subject}" (${m.precedence}) to ${all.join('; ')}.` +
    (m.attachments.length ? ` Attached ${m.attachments.join('; ')}.` : '') +
    ' Message text retained with the audit trail.';
  return { subject, detail, data };
}

/** audit.log arguments for a returned read receipt. */
export function receiptAudit(operator: string, docNo: string, subject: string, to: string): { subject: string; detail: string; data: Record<string, string> } {
  const s = `Read: ${clean(subject)}`;
  return {
    subject: s,
    detail: `Operator ${operator} returned a read receipt for ${docNo} to ${to}.`,
    data: { to, subject: s, body: `Your message ${docNo} was read by the addressee.`, receiptFor: docNo },
  };
}

const list = (v: string | undefined) => (v ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);

/** Rebuild Sent Items and receipt returns from mail.send audit entries. */
export function parseSent(entries: readonly AuditEntry[]): (SentItem | ReceiptReturn)[] {
  const out: (SentItem | ReceiptReturn)[] = [];
  for (const e of entries) {
    if (e.kind !== 'mail.send' || !e.data) continue;
    const d = e.data;
    if (d.receiptFor) {
      out.push({ kind: 'receipt', seq: e.seq, at: e.at, docNo: d.receiptFor, to: d.to ?? '' });
      continue;
    }
    out.push({
      kind: 'message',
      seq: e.seq,
      at: e.at,
      subject: d.subject ?? e.subject,
      precedence: normPrecedence(d.precedence),
      marking: (d.marking as MarkingId | undefined) ?? 'TSSCI-OSC',
      to: list(d.to),
      cc: list(d.cc),
      inReplyTo: d.inReplyTo ?? null,
      attachments: list(d.attachments),
      receiptRequested: d.receipt === 'requested',
      text: d.body ?? '',
    });
  }
  return out;
}


/** Message number the transfer system assigns to an outgoing item. */
export function sentDocNo(s: Pick<SentItem, 'at' | 'seq'>): string {
  return `MSG-${s.at.slice(2, 4)}-${String(60000 + (s.seq % 40000)).padStart(5, '0')}`;
}

/**
 * Mailboxes that are carried centrally: the transfer system returns its own non-delivery
 * notice for them (narrative rule A7), so no delivery report is generated here.
 */
export function isCarriedCentrally(address: string, dir: readonly { address: string; site?: string }[]): boolean {
  const d = dir.find((x) => x.address.toLowerCase() === address.toLowerCase());
  return !!d && d.site === 'DETACHED / UNPOSTED';
}

export interface DeliveryLine {
  address: string;
  outcome: 'delivered' | 'manual';
}

/** Delivery report lines for a sent item; null when every recipient is carried centrally. */
export function deliveryLines(s: SentItem, dir: readonly DirEntry[]): DeliveryLine[] | null {
  const lines: DeliveryLine[] = [];
  for (const a of [...s.to, ...s.cc]) {
    if (isCarriedCentrally(a, dir)) continue;
    const listed = dir.some((d) => d.address.toLowerCase() === a.toLowerCase());
    lines.push({ address: a, outcome: listed ? 'delivered' : 'manual' });
  }
  return lines.length ? lines : null;
}

/* ----------------------------------------------------------------- slots */

const SLOT_RE = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Slot names present in a body. */
export function slotNames(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(SLOT_RE)) out.add(m[1]!);
  return [...out];
}

/** Blank form line for a declared slot the delivery record carries no value for (register copies). */
export const UNFILLED = '________';

function fill(s: string, values: Record<string, string>, declared: string[], esc: (v: string) => string): string {
  return s.replace(SLOT_RE, (whole, name: string) => {
    if (Object.prototype.hasOwnProperty.call(values, name)) return esc(values[name]!);
    return declared.includes(name) ? UNFILLED : whole;
  });
}

/**
 * Replace {slot} tokens in HTML with delivery values (escaped). Tokens with a value are always
 * filled; declared slots without one read "(not recorded)"; other braces are left as written.
 */
export function fillSlots(html: string, values: Record<string, string>, declared: string[] = []): string {
  return fill(html, values, declared, escapeHtml);
}

/** fillSlots for plain text (subjects, titles). */
export function fillText(text: string, values: Record<string, string>, declared: string[] = []): string {
  return fill(text, values, declared, (v) => v);
}

/** "2008-05-20T..." -> "20 MAY 2008" */
export function dateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/* -------------------------------------------------------- reply/forward */

export function prefixSubject(prefix: 'RE' | 'FW', subject: string): string {
  const s = subject.replace(/^((RE|FW|FWD):\s*)+/i, '');
  return `${prefix}: ${s}`;
}

export interface QuoteSource {
  from: string;
  to: string[];
  cc: string[];
  sent: string;
  subject: string;
  docNo: string;
  text: string;
}

export function quoteBody(q: QuoteSource, maxLen = TEXT_LIMIT): string {
  const head = [
    '',
    '',
    '-----Original Message-----',
    `From: ${q.from}`,
    `Sent: ${q.sent}`,
    `To: ${q.to.join('; ')}`,
    ...(q.cc.length ? [`Cc: ${q.cc.join('; ')}`] : []),
    `Subject: ${q.subject}`,
    `Message No: ${q.docNo}`,
    '',
    '',
  ].join('\n');
  const lines = q.text.split('\n').map((l) => `> ${l}`.trimEnd());
  let out = head + lines.join('\n');
  if (out.length <= maxLen) return out;
  out = head;
  for (const l of lines) {
    if (out.length + l.length + 1 + QUOTE_CUT.length > maxLen) break;
    out += l + '\n';
  }
  return out + QUOTE_CUT;
}

/** Reply-all recipients: sender first, then To and Cc, minus the operator's own mailbox. */
export function replyAllRecipients(h: Pick<MsgHeaders, 'from' | 'to' | 'cc'>, self: string): { to: string[]; cc: string[] } {
  const me = self.toLowerCase();
  const seen = new Set<string>([me]);
  const take = (list: string[]) =>
    list.filter((a) => {
      const k = a.toLowerCase();
      if (seen.has(k) || !a.includes('@')) return false;
      seen.add(k);
      return true;
    });
  const to = take([h.from, ...h.to]);
  const cc = take(h.cc);
  return { to, cc };
}

/** Plain text -> paragraph HTML (escaped). */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/* ----------------------------------------------------------------- misc */

export function highestMarking(ids: readonly MarkingId[], rank: (id: MarkingId) => number, fallback: MarkingId): MarkingId {
  let best = fallback;
  let r = rank(fallback);
  for (const id of ids) {
    const x = rank(id);
    if (x > r) {
      best = id;
      r = x;
    }
  }
  return best;
}
