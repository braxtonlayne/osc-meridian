/**
 * Restricted-text corpus (F2, playtest-2 defect 1). Every piece of text that content Markdown
 * withholds at Tier 1 or behind a compartment (`:r[...]{tier=1}`, `:::redact{compartment=SEXTANT}`,
 * ...), read straight from the Markdown sources. Two consumers:
 *  - scripts/canon-merge.ts (buildClientCanon) replaces any of these fragments found in a client
 *    canon string with a sentinel, so canon text that a document redacts can never ship in the
 *    JS bundle as a literal (budget.auditNote, a facility `function`, a Tier 1 roster role...);
 *  - scripts/verify-dist.ts (rule 11) fails the build if any of them appears in a JS/worker chunk
 *    or in content/canon/canon.client.json.
 * Build-time only: nothing here is imported by shipped code, and the corpus is never written to disk.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';

export interface RestrictedText {
  /** Effective key: T1 (anything at or inside a tier-1 redaction) or the compartment key. */
  key: string;
  /** One distinctive fragment of the withheld text. */
  text: string;
  /** Source file (relative to the content directory). */
  file: string;
}

interface MdNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MdNode[];
}

/** Fragments shorter than this are too generic to be evidence of a leak ("ALPHA-01", "Seat 10"). */
export const CORPUS_MIN = 16;
/** Sentences cut from a long withheld passage must be longer: short clauses ("contractor compartment
 *  summary.") repeat in open prose by coincidence. */
const SENTENCE_MIN = 40;
/** Separator between pieces of text that are not contiguous in the rendered output. */
const SEP = '\u0000';
const FACILITY_ID_RE = /^(?:ALPHA|BETA|GAMMA|DELTA)-\d{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}(?:-\d{2})?$/;

function walkMd(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkMd(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Tier 1 (with or without a compartment) or any compartment key: never in the client canon. */
export function isRestrictedKey(key: string): boolean {
  return /(^|\+)T1$/.test(key) || /^[A-Z]{3,}(\+T\d)?$/.test(key);
}

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

const isRx = (n: MdNode): boolean =>
  (n.type === 'textDirective' && n.name === 'r') || (n.type === 'containerDirective' && n.name === 'redact');

/**
 * Visible text of a subtree as the reader would see it, with a separator wherever the output is
 * not contiguous (block boundaries, table cells, and directives such as :c[path] whose label is a
 * path, not text). Nested redactions contribute their text: an outer release carries them.
 */
function textOf(n: MdNode): string {
  if (n.type === 'text' || n.type === 'inlineCode') return n.value ?? '';
  if (n.type === 'break') return ' ';
  if ((n.type === 'textDirective' || n.type === 'leafDirective' || n.type === 'containerDirective') && !isRx(n) && n.name !== 'ink' && n.name !== 'margin') return SEP;
  const inner = (n.children ?? []).map(textOf);
  const block = /^(paragraph|heading|tableCell|tableRow|table|listItem|list|blockquote|code|containerDirective|root)$/.test(n.type);
  return block ? `${SEP}${inner.join(SEP)}${SEP}` : inner.join('');
}

/** Split withheld text into distinctive fragments: separator pieces, then sentences of long pieces. */
export function fragments(text: string, min = CORPUS_MIN): string[] {
  const out = new Set<string>();
  for (const piece of text.split(SEP)) {
    const p = piece.replace(/\s+/g, ' ').trim();
    if (p.length < min) continue;
    out.add(p);
    if (p.length > 80) for (const s of p.split(/(?<=[.;:])\s+/)) if (s.trim().length >= Math.max(min, SENTENCE_MIN)) out.add(s.trim());
  }
  return [...out].filter((f) => !FACILITY_ID_RE.test(f) && !ISO_DATE_RE.test(f));
}

/** Personnel numbers are distinctive at any length (P-1-01-0004). */
const PN_RE = /^P-\d-\d{2}-\d{4}$/;
function pnFragments(text: string): string[] {
  return text.split(SEP).map((p) => p.trim()).filter((p) => PN_RE.test(p));
}

interface FileScan {
  restricted: { key: string; text: string }[];
  /** Canon paths printed with :c[] inside a tier-1 or compartment redaction. */
  paths: { key: string; path: string }[];
  /** Canon paths printed with :c[] outside every redaction. */
  openPaths: string[];
  /** Text outside every redaction (what baseline HTML shows). */
  open: string;
}

function scanFile(raw: string): FileScan {
  const body = matter(raw).content;
  const tree = parser.parse(body) as unknown as MdNode;
  const restricted: FileScan['restricted'] = [];
  const paths: FileScan['paths'] = [];
  const openPaths: string[] = [];
  const openParts: string[] = [];
  const visit = (n: MdNode, keyAbove: string | null): void => {
    let key = keyAbove;
    if (isRx(n)) {
      const a = n.attributes ?? {};
      const tier = Number((a.tier ?? '').trim()) || undefined;
      const comp = (a.compartment ?? '').trim().toUpperCase() || undefined;
      // Effective key: tier 1 anywhere above or here wins; otherwise the innermost compartment.
      if (keyAbove === 'T1' || tier === 1) key = 'T1';
      else if (comp) key = tier ? `${comp}+T${tier}` : comp;
      else if (keyAbove) key = keyAbove;
      else key = tier ? `T${tier}` : 'T1';
      if (isRestrictedKey(key)) {
        if (keyAbove !== key) restricted.push({ key, text: (n.children ?? []).map(textOf).join('') });
      }
      for (const c of n.children ?? []) visit(c, key);
      return;
    }
    if (n.type === 'textDirective' && n.name === 'c') {
      const path = (n.children ?? []).map((c) => c.value ?? '').join('').trim();
      if (path) {
        if (keyAbove === null) openPaths.push(path);
        else if (isRestrictedKey(keyAbove)) paths.push({ key: keyAbove, path });
      }
    }
    if (keyAbove === null && (n.type === 'text' || n.type === 'inlineCode')) openParts.push(n.value ?? '');
    if (keyAbove === null && n.type !== 'text' && (n.children ?? []).length === 0) openParts.push(SEP);
    for (const c of n.children ?? []) visit(c, key);
    if (keyAbove === null && /^(paragraph|heading|tableCell|listItem)$/.test(n.type)) openParts.push(SEP);
  };
  visit(tree, null);
  return { restricted, paths, openPaths, open: openParts.join('') };
}

export interface RedactionCorpus {
  /** Distinctive restricted fragments (T1 or compartment), longest first, not public elsewhere. */
  restricted: RestrictedText[];
  /** Fragments dropped because the same text is printed in clear in some document. */
  publicElsewhere: number;
  /** Canon paths some document prints only inside a tier-1/compartment redaction, with that key. */
  paths: { key: string; path: string; file: string }[];
}

/**
 * Read every Markdown file under `contentDir` (base documents and account variants) and return
 * the tier-1 and compartment-withheld fragments. A fragment that some document prints outside any
 * redaction is public at baseline already and is not counted (the HTML gate covers documents).
 */
export function readRedactionCorpus(contentDir: string): RedactionCorpus {
  const byText = new Map<string, RestrictedText>();
  const openTexts: string[] = [];
  const pathKeys = new Map<string, { key: string; path: string; file: string }>();
  const openPaths = new Set<string>();
  for (const abs of walkMd(contentDir)) {
    const file = relative(contentDir, abs).split(sep).join('/');
    let scan: FileScan;
    try {
      scan = scanFile(readFileSync(abs, 'utf8'));
    } catch {
      continue; // the content build reports malformed files
    }
    for (const p of scan.openPaths) openPaths.add(p);
    for (const p of scan.paths) {
      const prev = pathKeys.get(p.path);
      if (!prev || (p.key === 'T1' && prev.key !== 'T1')) pathKeys.set(p.path, { ...p, file });
    }
    openTexts.push(scan.open.replace(/[ \t\r\n]+/g, ' '));
    for (const r of scan.restricted) {
      // Personnel numbers count only at tier 1: a compartment-withheld number may be printed in a
      // canon table elsewhere (the KESTREL sponsor), which this text scan does not see.
      for (const text of [...fragments(r.text), ...(r.key === 'T1' ? pnFragments(r.text) : [])]) {
        const prev = byText.get(text);
        // Same text withheld under several keys: tier 1 is the strictest.
        if (!prev || (r.key === 'T1' && prev.key !== 'T1')) byText.set(text, { key: r.key, text, file });
      }
    }
  }
  const open = openTexts.join(SEP);
  let publicElsewhere = 0;
  const restricted = [...byText.values()].filter((r) => {
    if (open.includes(r.text)) {
      publicElsewhere++;
      return false;
    }
    return true;
  });
  restricted.sort((a, b) => b.text.length - a.text.length || a.text.localeCompare(b.text));
  const paths = [...pathKeys.values()].filter((p) => !openPaths.has(p.path)).sort((a, b) => a.path.localeCompare(b.path));
  return { restricted, publicElsewhere, paths };
}
