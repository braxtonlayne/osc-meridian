/**
 * Forms Center model: everything the filler needs that is not drawing.
 * Pure functions only (no services, no DOM), so the validation rules are unit-tested
 * in model.test.ts.
 *
 *  - parseFormSpec(): reads the `form:` frontmatter block (scripts/content/schema.ts,
 *    docs/BRIEF-CONTENT.md) into a typed spec. Unknown keys are ignored, odd values tolerated.
 *  - initialValues() / validateForm(): entries and in-world validation.
 *  - flattenValues(): every field value as a string, keyed by field name.
 *  - matchRefusal(): `refusals: [{ when: {field: regex}, message }]` dispositions.
 *  - receiptNumber(): canon form receipt scheme OSC-F-NNN/YY-NNNNN.
 *  - formatSubmitDetail() / parseSubmitDetail(): the `form.submit` audit detail.
 */
import { DATE_CEILING, formatOscDate, parseOscDate } from '@design/util';

/* ------------------------------------------------------------------ types */

export const FIELD_TYPES = [
  'text', 'textarea', 'date', 'time', 'select', 'radio', 'checkbox', 'pn', 'docno', 'facility', 'signature', 'number',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldOption {
  value: string;
  label: string;
  /** Release key the operator must satisfy for the option to be offered ("SEXTANT", "T2"). */
  key?: string;
}

export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: FieldOption[];
  /** checkbox with options = mark any number. */
  multi: boolean;
  pattern?: string;
  help?: string;
  /** Grid columns (of 12) the field box spans; undefined = automatic. */
  span?: number;
  min?: string | number;
  max?: string | number;
  step?: number;
  maxLength?: number;
  /** "operator.pn", "operator.site", ... resolved by the app. */
  prefill?: string;
}

export interface BlockSpec {
  n: string;
  label: string;
  note?: string;
  fields: FieldSpec[];
}

export interface Refusal {
  when: Record<string, unknown>;
  message: string;
  ref?: string;
  authority?: string;
  /** false: no receipt number is issued for the returned form. Default true. */
  receipt: boolean;
}

export interface ResponseRule {
  id: string;
  text: string;
  when?: Record<string, unknown>;
}

export interface FormSpec {
  formNo: string;
  edition?: string;
  title: string;
  routing: string[];
  processing?: string;
  footer?: string;
  blocks: BlockSpec[];
  refusals: Refusal[];
  /** `instructions: null` in frontmatter: the form is issued without instructions. */
  noInstructions: boolean;
  /** Receipt-history panel, shown only when the session satisfies `requires` ("flag:<name>" or a release key). */
  history?: { requires: string; label: string };
  submit: {
    receiptPrefix: string;
    receiptFormat?: string;
    ack?: string;
    approvalNote?: string;
    responses: ResponseRule[];
    notes: string[];
  };
}

export type FieldValue = string | string[];
export type Values = Record<string, FieldValue>;

export interface Issue {
  field: string;
  /** Block reference as printed: "2" or "2b". */
  ref: string;
  level: 'error' | 'notice';
  message: string;
}

export interface ValidationContext {
  /** Release-key test (session clearance). */
  satisfies: (key: string) => boolean;
  /** Personnel number format; derived from canon by pnRegex(). */
  pnPattern: RegExp;
  /** Directory lookup: true when the PN is on the roster (or is the operator's own). */
  knownPn?: (pn: string) => boolean;
  /** Index lookup: true when a document number is on the MERIDIAN index. */
  knownDocNo?: (docNo: string) => boolean;
  /** Valid facility ids (canon). */
  facilities?: string[];
}

/* ------------------------------------------------------------ helpers */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : v instanceof Date ? v.toISOString().slice(0, 10) : undefined;
const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

/** Block letter for the i-th field of a multi-field block: a, b, ... z, aa. */
export function fieldLetter(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Printed reference of a field: "3" for a single-field block, "3b" otherwise. */
export function fieldRef(block: BlockSpec, index: number): string {
  return block.fields.length > 1 ? `${block.n}${fieldLetter(index)}` : block.n;
}

/** Personnel number regex from canon's pattern ("P-<T>-<YY>-<NNNN>"). */
export function pnRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = esc.replace(/<([A-Z]+)>/g, (_m, tok: string) => {
    if (tok === 'T') return '[1-4]';
    if (/^Y+$/.test(tok)) return `\\d{${tok.length}}`;
    if (/^N+$/.test(tok)) return `\\d{${tok.length}}`;
    return '[A-Z0-9]+';
  });
  return new RegExp(`^${body}$`);
}

/** Canon-style document or accession number (same rule as the content pipeline). */
export const DOCNO_TOKEN = /\b[A-Z0-9]+(?:[-/.][A-Z0-9]+)+\b/g;
const DOCNO_SHAPE = /[A-Z]/; // a token must carry at least one letter ("12-05" is not a number)

export function docNoTokens(s: string): string[] {
  return (s.toUpperCase().match(DOCNO_TOKEN) ?? []).filter((t) => DOCNO_SHAPE.test(t) && /\d/.test(t));
}

/** "1430", "14:30", "1430Z" -> "1430"; null when not a 24-hour time. */
export function parseTime(input: string): string | null {
  const m = /^\s*([01]?\d|2[0-3]):?([0-5]\d)\s*Z?\s*$/i.exec(input);
  if (!m) return null;
  return `${m[1]!.padStart(2, '0')}${m[2]}`;
}

/* ------------------------------------------------------- spec parsing */

function parseOptions(raw: unknown): FieldOption[] {
  if (!Array.isArray(raw)) return [];
  const out: FieldOption[] = [];
  for (const o of raw) {
    if (typeof o === 'string' || typeof o === 'number') {
      out.push({ value: String(o), label: String(o) });
    } else if (isObj(o)) {
      const value = str(o.value) ?? str(o.label);
      if (value === undefined) continue;
      const label = str(o.label) ?? value;
      const comp = str(o.compartment);
      const tier = num(o.tier);
      const key = str(o.key) ?? (comp && tier ? `${comp}+T${tier}` : comp ?? (tier ? `T${tier}` : undefined));
      out.push(key ? { value, label, key } : { value, label });
    }
  }
  return out;
}

const SPAN_WORDS: Record<string, number> = { full: 12, wide: 12, half: 6, third: 4, quarter: 3, twothirds: 8 };

function parseSpan(v: unknown): number | undefined {
  const n = num(v);
  if (n !== undefined) return Math.min(12, Math.max(1, Math.round(n)));
  const s = str(v)?.toLowerCase().replace(/[^a-z]/g, '');
  return s ? SPAN_WORDS[s] : undefined;
}

function parseField(raw: unknown): FieldSpec | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  const t = (str(raw.type) ?? 'text').toLowerCase();
  const type: FieldType = (FIELD_TYPES as readonly string[]).includes(t) ? (t as FieldType) : 'text';
  const options = parseOptions(raw.options);
  const f: FieldSpec = {
    name,
    label: str(raw.label) ?? name,
    type,
    required: raw.required === true,
    options,
    multi: type === 'checkbox' && options.length > 0,
  };
  const pattern = str(raw.pattern);
  if (pattern) f.pattern = pattern;
  const help = str(raw.help) ?? str(raw.hint);
  if (help) f.help = help;
  const span = parseSpan(raw.width ?? raw.span);
  if (span) f.span = span;
  const min = str(raw.min) ?? num(raw.min);
  const max = str(raw.max) ?? num(raw.max);
  if (min !== undefined) f.min = typeof raw.min === 'number' ? raw.min : min;
  if (max !== undefined) f.max = typeof raw.max === 'number' ? raw.max : max;
  const step = num(raw.step);
  if (step !== undefined && step > 0) f.step = step;
  const maxLength = num(raw.maxLength);
  if (maxLength !== undefined) f.maxLength = maxLength;
  const prefill = str(raw.prefill);
  if (prefill) f.prefill = prefill;
  return f;
}

function parseResponses(raw: unknown): ResponseRule[] {
  const out: ResponseRule[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((r, i) => {
      if (typeof r === 'string') out.push({ id: `r${i}`, text: r });
      else if (isObj(r)) {
        const text = str(r.text) ?? str(r.message) ?? str(r.note);
        if (text) out.push({ id: str(r.id) ?? `r${i}`, text, ...(isObj(r.when) ? { when: r.when } : {}) });
      }
    });
  } else if (isObj(raw)) {
    for (const [id, r] of Object.entries(raw)) {
      if (typeof r === 'string') out.push({ id, text: r });
      else if (isObj(r)) {
        const text = str(r.text) ?? str(r.message) ?? str(r.note);
        if (text) out.push({ id, text, ...(isObj(r.when) ? { when: r.when } : {}) });
      }
    }
  }
  return out;
}

function parseRefusals(raw: unknown): Refusal[] {
  if (!Array.isArray(raw)) return [];
  const out: Refusal[] = [];
  for (const r of raw) {
    if (!isObj(r)) continue;
    const message = str(r.message) ?? str(r.text);
    if (!message) continue;
    const ref: Refusal = { when: isObj(r.when) ? r.when : {}, message, receipt: r.receipt !== false };
    const rr = str(r.ref) ?? str(r.reference);
    if (rr) ref.ref = rr;
    const au = str(r.authority) ?? str(r.auth);
    if (au) ref.authority = au;
    out.push(ref);
  }
  return out;
}

/**
 * Read the `form:` block of a form page's frontmatter. Returns null when the page carries
 * no usable form (then the app shows the document only).
 */
export function parseFormSpec(frontmatter: Record<string, unknown>, fallback: { docNo: string; title: string }): FormSpec | null {
  const f = frontmatter.form;
  if (!isObj(f) || !Array.isArray(f.blocks)) return null;
  const blocks: BlockSpec[] = [];
  f.blocks.forEach((b, i) => {
    if (!isObj(b)) return;
    const fields = (Array.isArray(b.fields) ? b.fields : []).map(parseField).filter((x): x is FieldSpec => x !== null);
    if (!fields.length) return;
    const block: BlockSpec = { n: str(b.n) ?? String(i + 1), label: str(b.label) ?? '', fields };
    const note = str(b.note) ?? str(b.help);
    if (note) block.note = note;
    blocks.push(block);
  });
  if (!blocks.length) return null;
  const submit = isObj(f.submit) ? f.submit : {};
  const notes: string[] = [];
  const consequence = submit.consequence;
  if (typeof consequence === 'string') notes.push(consequence);
  else if (isObj(consequence)) {
    const t = str(consequence.note) ?? str(consequence.text) ?? str(consequence.message);
    if (t) notes.push(t);
  }
  for (const k of ['note', 'receiptNote']) {
    const t = str(submit[k]);
    if (t) notes.push(t);
  }
  const counter = submit.counterHours;
  if (typeof counter === 'string') notes.push(counter);
  else if (isObj(counter) && str(counter.text)) notes.push(str(counter.text)!);
  const formNo = str(f.formNo) ?? fallback.docNo;
  const spec: FormSpec = {
    formNo,
    title: str(f.formTitle) ?? str(f.title) ?? fallback.title,
    routing: Array.isArray(f.routing) ? f.routing.map(str).filter((s): s is string => !!s) : [],
    blocks,
    refusals: parseRefusals(f.refusals ?? submit.refusals),
    noInstructions: f.instructions === null,
    submit: {
      receiptPrefix: str(submit.receiptPrefix) ?? formNo,
      responses: parseResponses(submit.responses),
      notes,
    },
  };
  const edition = str(f.edition);
  if (edition) spec.edition = edition;
  if (isObj(f.history)) {
    const requires = str(f.history.requires);
    if (requires) spec.history = { requires, label: str(f.history.label) ?? 'History' };
  }
  const processing = str(f.processing);
  if (processing) spec.processing = processing;
  const footer = str(f.footer);
  if (footer) spec.footer = footer;
  const rf = str(submit.receiptFormat);
  if (rf) spec.submit.receiptFormat = rf;
  const ack = str(submit.ack);
  if (ack) spec.submit.ack = ack;
  const approval = str(submit.approvalNote);
  if (approval) spec.submit.approvalNote = approval;
  return spec;
}

export function allFields(spec: FormSpec): FieldSpec[] {
  return spec.blocks.flatMap((b) => b.fields);
}

/** Reference ("2b") of every field, keyed by name. */
export function fieldRefs(spec: FormSpec): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of spec.blocks) b.fields.forEach((f, i) => (out[f.name] = fieldRef(b, i)));
  return out;
}

/* -------------------------------------------------------------- layout */

/** Columns (of 12) a field box takes when the frontmatter gives no width. */
export function defaultSpan(f: FieldSpec): number {
  if (f.span) return f.span;
  switch (f.type) {
    case 'textarea':
    case 'signature':
    case 'radio':
      return 12;
    case 'checkbox':
      return f.multi ? 12 : 6;
    case 'text':
    case 'docno':
      return 6;
    default:
      return 4;
  }
}

/**
 * Spans for the field boxes of one block, packed into rows of 12 with the last box of each row
 * widened to the margin, so the ruled grid never shows a gap.
 */
export function layoutSpans(fields: FieldSpec[]): number[] {
  const spans = fields.map(defaultSpan);
  const out: number[] = [];
  let rowStart = 0;
  let used = 0;
  spans.forEach((s, i) => {
    if (used + s > 12) {
      out[i - 1] = out[i - 1]! + (12 - used);
      rowStart = i;
      used = 0;
    }
    out.push(s);
    used += s;
  });
  if (out.length > rowStart) out[out.length - 1] = out[out.length - 1]! + (12 - used);
  return out;
}

/* -------------------------------------------------------------- values */

/** Empty entries, with `prefill` keys resolved from the supplied particulars. */
export function initialValues(spec: FormSpec, particulars: Record<string, string>): Values {
  const v: Values = {};
  for (const f of allFields(spec)) {
    if (f.multi) {
      v[f.name] = [];
      continue;
    }
    const pre = f.prefill ? particulars[f.prefill] : undefined;
    if (pre !== undefined && (!f.options.length || f.options.some((o) => o.value === pre))) {
      v[f.name] = f.type === 'date' ? formatOscDate(pre) : pre;
    } else {
      v[f.name] = '';
    }
  }
  return v;
}

export function isEmpty(v: FieldValue | undefined): boolean {
  if (v === undefined) return true;
  return Array.isArray(v) ? v.length === 0 : v.trim() === '';
}

/** Mark for a ticked single checkbox in flattened entries. */
export const CHECKED = 'YES';

/** Every field's value as one string, keyed by field name (arrays joined with "; "). */
export function flattenValues(spec: FormSpec, values: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of allFields(spec)) {
    const v = values[f.name];
    out[f.name] = Array.isArray(v) ? v.join('; ') : (v ?? '').trim();
  }
  return out;
}

/* ---------------------------------------------------------- validation */

/** Latest date any field of the form accepts by default: the in-world ceiling, or a later explicit max. */
export function dateHorizon(spec: FormSpec): string {
  let h = DATE_CEILING;
  for (const f of allFields(spec)) {
    if (f.type === 'date' && typeof f.max === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.max) && f.max > h) h = f.max;
  }
  return h;
}

/** Ordered field pairs checked against each other when both are present. */
export const ORDERED_PAIRS: ReadonlyArray<readonly [string, string, string]> = [
  ['firstDay', 'lastDay', 'date'],
  ['startDate', 'endDate', 'date'],
  ['fromDate', 'toDate', 'date'],
  ['travelDate', 'returnDate', 'date'],
  ['arrival', 'departure', 'time'],
  ['startTime', 'endTime', 'time'],
];

/** In-world checks for one field. `form` lets date fields see the form's date horizon. */
export function validateField(f: FieldSpec, value: FieldValue | undefined, ctx: ValidationContext, ref: string, horizon = DATE_CEILING): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ field: f.name, ref, level: 'error', message: `Block ${ref}. ${message}` });
  const note = (message: string) => issues.push({ field: f.name, ref, level: 'notice', message: `Block ${ref}. ${message}` });
  const label = f.label.replace(/\s*\(.*\)\s*$/, '');

  if (isEmpty(value)) {
    if (f.required) {
      if (f.type === 'signature') err('Not signed. The form is not accepted without the signature in this block.');
      else if (f.type === 'checkbox' && !f.multi) err(`${label} must be marked.`);
      else if (f.multi || f.type === 'radio' || f.type === 'select' || f.type === 'facility') err(`${label}: no entry marked. Mark one${f.multi ? ' or more' : ''}.`);
      else err(`${label} is a required block and was left blank.`);
    }
    return issues;
  }

  if (Array.isArray(value)) {
    const allowed = new Set(f.options.map((o) => o.value));
    if (value.some((v) => !allowed.has(v))) err(`${label}: an entry marked is not on the printed list.`);
    for (const v of value) {
      const o = f.options.find((x) => x.value === v);
      if (o?.key && !ctx.satisfies(o.key)) err(`${label}: an entry marked is not open to this operator.`);
    }
    return issues;
  }

  const v = (value ?? '').trim();
  if (f.maxLength !== undefined && v.length > f.maxLength) err(`${label} exceeds ${f.maxLength} characters.`);

  switch (f.type) {
    case 'pn': {
      const re = f.pattern ? safeRegex(f.pattern, '') ?? ctx.pnPattern : ctx.pnPattern;
      if (!re.test(v.toUpperCase())) {
        err(`${label}: "${v}" is not a personnel number. Enter it as printed on the token card, for example ${pnExample(ctx.pnPattern)}.`);
      } else if (ctx.knownPn && !ctx.knownPn(v.toUpperCase())) {
        note(`${v.toUpperCase()} is not in the MERIDIAN directory. It is entered as given and will be checked by the receiving office.`);
      }
      return issues;
    }
    case 'date': {
      const iso = parseOscDate(v);
      if (!iso) {
        err(`${label}: date not recognised. Enter as DD MMM YYYY, for example 12 MAY 2008.`);
        return issues;
      }
      const max = typeof f.max === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.max) ? f.max : horizon;
      const min = typeof f.min === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.min) ? f.min : undefined;
      if (iso > max) err(`${label} may not be later than ${formatOscDate(max)}.`);
      if (min && iso < min) err(`${label} may not be earlier than ${formatOscDate(min)}.`);
      return issues;
    }
    case 'time':
      if (!parseTime(v)) err(`${label}: enter a 24-hour time as HHMM, for example 1430.`);
      return issues;
    case 'number': {
      const n = Number(v.replace(/,/g, ''));
      if (!/^-?\d[\d,]*(\.\d+)?$/.test(v) || !Number.isFinite(n)) {
        err(`${label}: enter figures only.`);
        return issues;
      }
      const min = num(f.min);
      const max = num(f.max);
      if (min !== undefined && n < min) err(`${label} may not be less than ${min}.`);
      if (max !== undefined && n > max) err(`${label} may not be more than ${max}.`);
      if (f.step) {
        const q = (n - (min ?? 0)) / f.step;
        if (Math.abs(q - Math.round(q)) > 1e-9) err(`${label} is entered in steps of ${f.step}.`);
      }
      return issues;
    }
    case 'select':
    case 'radio':
    case 'facility': {
      if (f.options.length) {
        const o = f.options.find((x) => x.value === v);
        if (!o) err(`${label}: "${v}" is not on the printed list.`);
        else if (o.key && !ctx.satisfies(o.key)) err(`${label}: this entry is not open to this operator.`);
      } else if (f.type === 'facility' && ctx.facilities && !ctx.facilities.includes(v.toUpperCase())) {
        err(`${label}: "${v}" is not a facility designation.`);
      }
      return issues;
    }
    case 'docno': {
      const toks = docNoTokens(v);
      if (!toks.length) {
        err(`${label}: give the record by its document or accession number, for example OSC-DIR-0412.`);
      } else if (ctx.knownDocNo) {
        const unknown = toks.filter((t) => !ctx.knownDocNo!(t));
        if (unknown.length) note(`${unknown.join(', ')} not found on the MERIDIAN index. Entered as given.`);
      }
      break;
    }
    default:
      break;
  }
  if (f.pattern) {
    const re = safeRegex(f.pattern, 'i');
    if (re && !re.test(v)) err(`${label}: entry is not in the form required for this block.`);
  }
  return issues;
}

function pnExample(re: RegExp): string {
  return re.source.startsWith('^P-') ? 'P-3-06-0001' : 'as printed';
}

export function safeRegex(src: string, flags: string): RegExp | null {
  try {
    return new RegExp(src, flags);
  } catch {
    return null;
  }
}

/** Validate a whole form: field checks, then ordered pairs. Errors first, in block order. */
export function validateForm(spec: FormSpec, values: Values, ctx: ValidationContext): Issue[] {
  const horizon = dateHorizon(spec);
  const refs = fieldRefs(spec);
  const issues: Issue[] = [];
  for (const b of spec.blocks) b.fields.forEach((f, i) => issues.push(...validateField(f, values[f.name], ctx, fieldRef(b, i), horizon)));
  const byName = new Map(allFields(spec).map((f) => [f.name, f]));
  for (const [a, b, kind] of ORDERED_PAIRS) {
    const fa = byName.get(a);
    const fb = byName.get(b);
    if (!fa || !fb || fa.type !== kind || fb.type !== kind) continue;
    const va = values[a];
    const vb = values[b];
    if (typeof va !== 'string' || typeof vb !== 'string' || !va.trim() || !vb.trim()) continue;
    const pa = kind === 'date' ? parseOscDate(va) : parseTime(va);
    const pb = kind === 'date' ? parseOscDate(vb) : parseTime(vb);
    if (pa && pb && pb < pa) {
      issues.push({
        field: b,
        ref: refs[b] ?? '',
        level: 'error',
        message: `Block ${refs[b]}. ${fb.label.replace(/\s*\(.*\)\s*$/, '')} is earlier than block ${refs[a]}.`,
      });
    }
  }
  return issues;
}

/** Normalised display form of an entry after the operator leaves the box (dates, times, codes). */
export function normalizeEntry(f: FieldSpec, raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (f.type === 'date') {
    const iso = parseOscDate(v);
    return iso ? formatOscDate(iso) : raw;
  }
  if (f.type === 'time') return parseTime(v) ?? raw;
  if (f.type === 'pn' || f.type === 'docno') return v.toUpperCase();
  return raw;
}

/* ----------------------------------------------------------- disposition */

export interface ConditionContext {
  /** Session particulars by key ("operator.onProbation" -> "YES", "session.probationer" -> "YES"). */
  particulars: Record<string, string>;
  /** Marking of an indexed document, for `{ field: { marking: "UMBRA-EO" } }` conditions. */
  docMarking?: (docNo: string) => string | undefined;
}

/**
 * True when every key of `when` holds. A key that names a field tests its value against the
 * regex (case-insensitive); a key found in the particulars does the same against that value;
 * `anyField` tests every field. An empty `when` always holds. An unknown key never holds.
 */
export function conditionHolds(when: Record<string, unknown>, flat: Record<string, string>, ctx: ConditionContext): boolean {
  return Object.entries(when).every(([k, pat]) => {
    if (k === 'session') {
      // { session: probationer } -> particulars["session.probationer"]
      return ctx.particulars[`session.${String(pat)}`] === CHECKED;
    }
    if (isObj(pat)) {
      // { document: { marking: "UMBRA-EO" } }: any record cited in the field carries that marking.
      const want = str(pat.marking);
      const v = flat[k];
      if (!want || v === undefined || !ctx.docMarking) return false;
      return docNoTokens(v).some((t) => ctx.docMarking!(t) === want);
    }
    const test = (s: string): boolean => {
      if (typeof pat === 'boolean') return pat ? s !== '' && s !== 'NO' : s === '' || s === 'NO';
      const re = safeRegex(String(pat), 'i');
      return re ? re.test(s) : false;
    };
    if (k === 'anyField') return Object.values(flat).some(test);
    if (k in flat) return test(flat[k]!);
    const p = ctx.particulars[k] ?? ctx.particulars[`operator.${k}`];
    return p !== undefined ? test(p) : false;
  });
}

export function matchRefusal(spec: FormSpec, flat: Record<string, string>, ctx: ConditionContext): Refusal | null {
  return spec.refusals.find((r) => conditionHolds(r.when, flat, ctx)) ?? null;
}

export type NamedResponses = Record<string, (flat: Record<string, string>, spec: FormSpec) => boolean>;

/** True when a date field equals `iso`, or an ordered date pair spans it. */
export function spansDate(flat: Record<string, string>, spec: FormSpec, iso: string): boolean {
  const dates = allFields(spec)
    .filter((f) => f.type === 'date')
    .map((f) => ({ name: f.name, iso: parseOscDate(flat[f.name] ?? '') }))
    .filter((d): d is { name: string; iso: string } => !!d.iso);
  if (!dates.length) return false;
  if (dates.some((d) => d.iso === iso)) return true;
  for (const [a, b, kind] of ORDERED_PAIRS) {
    if (kind !== 'date') continue;
    const da = dates.find((d) => d.name === a)?.iso;
    const db = dates.find((d) => d.name === b)?.iso;
    if (da && db && da <= iso && iso <= db) return true;
  }
  return false;
}

/** Response notes that apply to these entries. */
export function matchResponses(spec: FormSpec, flat: Record<string, string>, ctx: ConditionContext, named: NamedResponses = {}): ResponseRule[] {
  return spec.submit.responses.filter((r) => {
    if (r.when) return conditionHolds(r.when, flat, ctx);
    const test = named[r.id];
    return test ? test(flat, spec) : false;
  });
}

/* ------------------------------------------- compartment access (OSC-F-126) */

/** Personnel numbers whose directory notes record that they hold `comp` ("Holds KESTREL and TALLOW."). */
export function holdersOf(roster: ReadonlyArray<{ pn: string; notes: string }>, comp: string): string[] {
  return roster
    .filter((p) => {
      const m = /\bHolds ([A-Z][A-Z0-9-]*(?:(?:, | and )[A-Z][A-Z0-9-]*)*)/.exec(p.notes);
      return !!m && m[1]!.split(/, | and /).includes(comp);
    })
    .map((p) => p.pn);
}

/** Records within a compartment's scope, by document number, for block 4 citations. */
export const COMPARTMENT_SCOPE: Record<string, RegExp> = {
  KESTREL: /^(OSC-TRN-(ENG|RS|SEG-\d{2}|INC-\d{2}-\d{3}|POS-\d{2}-\d{3})|OSC-MEM-07-0944)$/,
  SEXTANT: /^(OSC-TRN-(NET-[A-Z]+|SEG-\d{2})|OSC-FAC-[A-Z]+-\d{2}|OSC-ASR-COV)$/,
};

export interface AccessRequestFacts {
  compartment: string;
  sponsorPn: string;
  justification: string;
  /** The compartment (or ACTING-T2) is already held. */
  held: boolean;
  /** Holders of the compartment, from the directory. */
  holders: string[];
  /** The operator's supervisor of record. */
  supervisorPn: string;
  /** The interim review has been held (narrative flag interimReview). */
  interimReview: boolean;
}

/**
 * Checks the OIA registry makes on receipt of OSC-F-126, before any decision. Returns the id of
 * the `submit.responses` text that returns the request, or null when it goes forward for
 * decision. Compartments refused outright are `refusals` in the form's own frontmatter.
 */
export function precheckAccessRequest(f: AccessRequestFacts): string | null {
  const comp = f.compartment.trim().toUpperCase();
  const sponsor = f.sponsorPn.trim().toUpperCase();
  if (f.held) return 'alreadyHeld';
  if (comp === 'ACTING-T2') {
    if (sponsor !== f.supervisorPn.toUpperCase()) return 'actingSponsor';
    if (!f.interimReview) return 'actingIneligible';
    return null;
  }
  if (!f.holders.includes(sponsor)) return 'sponsorNotHolder';
  const scope = COMPARTMENT_SCOPE[comp];
  if (scope && !docNoTokens(f.justification).some((t) => scope.test(t))) return 'outOfScope';
  return null;
}

/* --------------------------------------------------------------- receipt */

/** Small stable hash for per-form serial bases. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Serial for the n-th receipt (0-based) this profile has drawn on a form. Starts from a
 * per-form base so that receipts read as part of a series other offices also draw on.
 */
export function receiptSerial(formNo: string, n: number): number {
  return 120 + (hashString(formNo) % 600) + n * 3 + 1;
}

/**
 * Receipt number. Canon scheme: OSC-F-NNN/YY-NNNNN. `format` (e.g. "OSC-F-114/08-NNNNN") wins
 * when it has a run of N; otherwise the prefix gets "/YY-" (or "-" if it already carries the year).
 */
export function receiptNumber(prefix: string, serial: number, format?: string, yy = '08'): string {
  if (format && /N{3,}/.test(format)) {
    return format.replace(/N{3,}/, (run) => String(serial).padStart(run.length, '0').slice(-run.length));
  }
  const s = String(serial).padStart(5, '0');
  if (/[/-]$/.test(prefix)) return `${prefix}${/\/$/.test(prefix) ? `${yy}-` : ''}${s}`;
  if (/\/\d{2}$/.test(prefix)) return `${prefix}-${s}`;
  return `${prefix}/${yy}-${s}`;
}

/* ---------------------------------------------------------- audit detail */

export type Disposition = 'ACCEPTED' | 'RETURNED';

export interface SubmitRecord {
  formNo: string;
  title: string;
  /** null when the form is returned without a receipt number. */
  receiptNo: string | null;
  disposition: Disposition;
  operatorId: string;
  /** Number of blocks completed (for the audit sentence). */
  entries: number;
  reason?: string;
}

/** Security-office sentence for the `form.submit` audit entry (subject = formNo). */
export function formatSubmitDetail(r: SubmitRecord): string {
  const rc = r.receiptNo ? `Receipt ${r.receiptNo}.` : 'No receipt issued.';
  return r.disposition === 'ACCEPTED'
    ? `Operator ${r.operatorId} submitted ${r.formNo} (${r.title}) for routing, ${r.entries} entries. ${rc} Accepted for routing.`
    : `Operator ${r.operatorId} submitted ${r.formNo} (${r.title}), ${r.entries} entries. ${rc} Returned without action: ${r.reason ?? 'see form.'}`;
}

/**
 * Structured payload for the narrative engine (docs/CONTRACTS.md "Narrative engine"):
 * `{ form: <formNo>, <fieldName>: value, ... }`, every field present, all strings.
 */
export function submitData(formNo: string, fields: Record<string, string>): Record<string, string> {
  return { ...fields, form: formNo };
}
