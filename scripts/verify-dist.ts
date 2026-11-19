/**
 * npm run test:dist  (run after `npm run build` or `npm run build:pages`)
 *
 * Fails when:
 *  1. fewer than 100 routes (prints per-family counts against the SPEC §9 manifest of 240);
 *  2. any dist html/js/mjs/css/json/svg/xml/webmanifest file contains an absolute http(s) URL.
 *     Ignored, precisely: XML namespace URIs (svg, xlink, xhtml, MathML, xmlns, xml) and URLs
 *     inside third-party license comments in js/css (block comments opening with /*! or
 *     containing @license / @preserve / Copyright / "Licensed under").
 *  3. any shipped text file under dist/ or content/ contains TODO | lorem | coming soon |
 *     placeholder | TBD | SCAFFOLD STUB (case-insensitive, whole words). The HTML attribute /
 *     DOM property / CSS pseudo-class spellings of "placeholder" are code, not text, and are skipped.
 *  4. any internal href/src in prerendered HTML does not resolve to a file or route in dist/;
 *  5. headline-figure drift (rules in .generated/canon-figures.json, see scripts/content/figures.ts);
 *  6. any release file is not named by a key hash, matches no document's key, is keyed to
 *     tier 1, is not encoded / does not decode with its key, or contains a tier-1 rx id
 *     (see checkReleaseFiles and src/core/release-codec.ts).
 *  7. any string withheld by buildClientCanon (length >= 6; see withheldNeedles for the
 *     exemptions) appears in any dist file outside data/releases/ (baseline HTML, JS, docs JSON,
 *     search index); any withheld string appears in clear in a release file's raw bytes; or a
 *     tier-1 withheld string appears in a decoded release file. Exception: tier-2
 *     roster names and emails may appear in baseline document files (signatures, From/To
 *     lines); see isAuthoredName.
 *  8. any prerendered page prints a raw `{identifier}` message-slot token in its static text or
 *     <title> (prerender replaces declared slots with an in-world blank).
 *  9. account variants (data/docs/@<account>/<id>.json, pass two): known account; same route,
 *     docNo, app and family as the base route, which lists the account in `variants` (and every
 *     listed variant exists); headline drift on the variant text; only declared message slots;
 *     every href and xref resolves in dist/. search@<account>.json exists exactly for accounts
 *     with variants. Rules 2, 3, 6 and 7 already cover variant JSON and the account indexes
 *     (they scan every dist file; variant files count as baseline document files).
 * 10. every app in src/apps/index.ts (APPS) has a static home page, with no headline drift.
 * 11. (F2) no tier-1 or compartment-withheld text in any JS/worker chunk (dist .js/.mjs) or in
 *     content/canon/canon.client.json: the full-canon values buildClientCanon withholds under T1 or
 *     a compartment (rule 7's corpus), plus every fragment content Markdown withholds at tier 1 or
 *     behind a compartment (scripts/content/redaction-corpus.ts), in clear, JSON-, quote- and
 *     unicode-escaped forms.
 * 12. (F2) the initial shell (index.html entry script plus its modulepreloads) is < 180 KB gzip.
 * dist directory: $MERIDIAN_DIST or --dist <dir> (default dist/).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocJson, RouteEntry } from '../src/core/contracts';
import { checkDrift, type FigureRule } from './content/figures.ts';
import { APP_HOME_TEXT } from './content/app-homes.ts';
import { ACCOUNT_IDS, CANON_RELEASE_KEYS, escapeHtml, isTier1Key, normalizeBase, type AccountIdLit } from './content/util.ts';
import { readAppHomes } from './prerender.ts';
import { decodeRelease, isEncodedRelease, releaseFileName } from '../src/core/release-codec';
import { deriveRestrictions, type Withheld } from './content/client-canon.ts';
import { readRedactionCorpus, type RestrictedText } from './content/redaction-corpus.ts';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** $MERIDIAN_DIST or --dist <dir> (default dist/), so a scratch build can be checked. */
const distArg = process.argv.indexOf('--dist');
const dist = resolve(root, (distArg >= 0 ? process.argv[distArg + 1] : process.env.MERIDIAN_DIST) ?? 'dist');

/** `{identifier}` message-slot tokens that must never reach static text. */
export const SLOT_TOKEN_RE = /\{[A-Za-z_][A-Za-z0-9_]*\}/g;

/** Slot tokens in the visible text of every static article on a prerendered page. */
/**
 * Release files must be named by releaseFileName(key) for a key some document uses, never
 * tier 1, and hold an encoded body that decodes with that key. Returns, per file, the decoded
 * body or a problem message (messages about tier 1 start with "tier-1").
 */
export function checkReleaseFiles(
  files: string[],
  knownKeys: Iterable<string>,
): [string, { key: string; body: Record<string, string> } | string][] {
  const byName = new Map<string, string>();
  for (const k of knownKeys) byName.set(releaseFileName(k), k);
  return files.map((f) => {
    const name = f.split(/[\\/]/).pop()!;
    const m = /^([0-9a-f]{16})\.json$/.exec(name);
    if (!m) return [f, 'release file name must be a key hash (it may spell out a compartment)'];
    const key = byName.get(m[1]!);
    if (key === undefined) return [f, 'release file matches no redaction key in data/docs'];
    if (isTier1Key(key)) return [f, `tier-1 release file (${key})`];
    let payload: unknown;
    try {
      payload = JSON.parse(readFileSync(f, 'utf8'));
    } catch {
      return [f, 'release file is not JSON'];
    }
    if (!isEncodedRelease(payload)) return [f, 'release file body is not encoded'];
    try {
      return [f, { key, body: decodeRelease(key, payload) }];
    } catch (e) {
      return [f, `release file does not decode with its key: ${(e as Error).message}`];
    }
  });
}

export function findSlotTokens(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<article class="static-doc[\s\S]*?<\/article>/g)) {
    for (const t of htmlToText(m[0]).matchAll(SLOT_TOKEN_RE)) out.push(t[0]);
  }
  const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? '';
  for (const t of title.matchAll(SLOT_TOKEN_RE)) out.push(t[0]);
  return out;
}

export const MANIFEST: { family: string; aliases: string[]; target: number }[] = [
  { family: 'Facility Registry', aliases: ['registry', 'facilities'], target: 52 },
  { family: 'Transit', aliases: ['transit'], target: 15 },
  { family: 'Personnel', aliases: ['personnel'], target: 21 },
  { family: 'Council & governance', aliases: ['council', 'governance', 'charter'], target: 25 },
  { family: 'Reserves', aliases: ['reserves'], target: 16 },
  { family: 'Ledger', aliases: ['ledger'], target: 20 },
  { family: 'Assurance', aliases: ['assurance'], target: 13 },
  { family: 'Directives', aliases: ['directives'], target: 24 },
  { family: 'Forms', aliases: ['forms'], target: 12 },
  { family: 'Message Traffic', aliases: ['mail', 'messages', 'message-traffic'], target: 30 },
  { family: 'Help & system', aliases: ['help', 'system'], target: 12 },
];

export const NAMESPACE_URIS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1998/Math/MathML',
  'http://www.w3.org/2000/xmlns/',
  'http://www.w3.org/XML/1998/namespace',
]);

const URL_SCAN_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.webmanifest']);
const TEXT_EXT = new Set([...URL_SCAN_EXT, '.md', '.txt', '.map', '.yml', '.yaml', '.ts', '.tsx']);

export const BANNED_RE = /\b(?:TODO|lorem|coming soon|placeholder|TBD|SCAFFOLD STUB)\b/gi;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

const rel = (p: string) => relative(root, p).split(sep).join('/');

function lineAt(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** Blank out third-party license comments, preserving offsets/lines. */
export function stripLicenseComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (c) =>
    /^\/\*!|@license|@preserve|copyright|licensed under/i.test(c) ? c.replace(/[^\n]/g, ' ') : c,
  );
}

export function findExternalUrls(text: string, ext: string): { index: number; url: string }[] {
  const scan = ext === '.js' || ext === '.mjs' || ext === '.css' ? stripLicenseComments(text) : text;
  const out: { index: number; url: string }[] = [];
  for (const m of scan.matchAll(/https?:\/\/[^\s"'`<>()\\,;]+/g)) {
    const url = m[0];
    if (NAMESPACE_URIS.has(url) || NAMESPACE_URIS.has(url.replace(/\/$/, ''))) continue;
    out.push({ index: m.index ?? 0, url });
  }
  return out;
}

/** "placeholder" written as code (attribute, property, CSS pseudo-class), not prose. */
function isCodePlaceholder(text: string, index: number, word: string): boolean {
  if (word.toLowerCase() !== 'placeholder') return false;
  const before = text.slice(Math.max(0, index - 6), index);
  const after = text.slice(index + word.length, index + word.length + 8);
  if (/:$/.test(before) || /aria-$/i.test(before)) return true; // ::placeholder, :placeholder-shown, aria-placeholder
  if (/^-shown/.test(after)) return true;
  if (/\.$/.test(before)) return true; // el.placeholder
  if (/^\s*[=:]/.test(after)) return true; // placeholder="..." / {placeholder: ...}
  if (/["'`]$/.test(before) && /^["'`]/.test(after)) return true; // "placeholder" attribute name
  if (/\[$/.test(before)) return true; // [placeholder] selector
  return false;
}

export function findBannedWords(text: string): { index: number; word: string }[] {
  const out: { index: number; word: string }[] = [];
  for (const m of text.matchAll(BANNED_RE)) {
    const idx = m.index ?? 0;
    if (isCodePlaceholder(text, idx, m[0])) continue;
    out.push({ index: idx, word: m[0] });
  }
  return out;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface Needle {
  path: string;
  key: string;
  forms: string[];
}

const SENTINEL_RE = /\[\[RX:[A-Z0-9+]+:\d+\]\]/g;
const FACILITY_ID_RE = /^(?:ALPHA|BETA|GAMMA|DELTA)-\d{2}$/;

/**
 * Every string value the client canon still carries in clear, with sentinels cut out
 * (a sentinel splits the string; the clear parts on either side still count as clear).
 */
export function clearStrings(client: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') {
      for (const part of v.split(SENTINEL_RE)) if (part.trim()) out.push(part);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(client);
  return out;
}

/**
 * Withheld client-canon strings to search for: length >= 6, as written, HTML-escaped and
 * JSON-escaped. Tier-2 / compartment values are skipped when they are public anyway:
 *  - the same text also occurs in clear somewhere in the client canon (a facility id, city,
 *    `completed` date or cover string withheld in one field but printed in another), or
 *  - it is a bare ISO date (YYYY-MM or YYYY-MM-DD), or
 *  - it is a real agency name whose acronym is a canon funding department (budget.departments),
 *  - it is a generic reserve category label canon-merge itself does not scrub
 *    ("Small arms", "Ammunition": reserves.*.label with scrub=false).
 * Tier-1 values are always checked, except bare facility designations (ALPHA-01 .. DELTA-12),
 * which are public at every tier and skipped for all keys.
 * Sentinels (`[[RX:key:len]]`) in the client canon carry no withheld text, so the JS bundle that
 * embeds canon.client.json is scanned as-is: only its clear values can match.
 */
const ISO_DATE_RE = /^\d{4}-\d{2}(?:-\d{2})?$/;

/** Acronyms of a name, with and without short connecting words ("Department of Energy" -> DOE, DE). */
export function acronyms(name: string): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  const all = words.map((w) => w[0]!.toUpperCase()).join('');
  const caps = words.filter((w) => !/^(of|and|the|for)$/i.test(w)).map((w) => w[0]!.toUpperCase()).join('');
  return [...new Set([all, caps])];
}

/** Real agency names are public (cover identities and funding lines, SPEC §3): exempt when
 *  their acronym is one of the canon funding departments (budget.departments). */
export function isAgencyName(text: string, departments: string[]): boolean {
  if (!/^[A-Z][a-z]+(?:\s+(?:of|and|the|for|[A-Z][a-z]+))+$/.test(text)) return false;
  return acronyms(text).some((a) => departments.includes(a));
}

export function withheldNeedles(withheld: Withheld[], client?: unknown, departments: string[] = []): Needle[] {
  const clear = client === undefined ? [] : clearStrings(client);
  const haystack = clear.join('\u0000');
  const isClear = (t: string) => haystack.includes(t);
  const out: Needle[] = [];
  for (const w of withheld) {
    if (w.text.length < 6) continue;
    // A bare facility designation is public at every tier; what a field withholds is the
    // association (e.g. which sites a contractor serves), which the string alone cannot leak.
    if (FACILITY_ID_RE.test(w.text)) continue;
    if (!isTier1Key(w.key)) {
      if (ISO_DATE_RE.test(w.text)) continue; // bare dates collide by coincidence
      if (isAgencyName(w.text, departments)) continue;
      if (!w.scrub && w.path.startsWith('reserves.') && w.path.endsWith('.label')) continue;
      if (isClear(w.text)) continue;
    }
    const forms = new Set([w.text, escapeHtml(w.text), escapeHtml(w.text).replace(/'/g, '&#x27;'), JSON.stringify(w.text).slice(1, -1)]);
    out.push({ path: w.path, key: w.key, forms: [...forms] });
  }
  return out;
}

/**
 * Orchestrator decision: documents show who signed and sent them, so a tier-2 roster NAME or
 * EMAIL may appear in authored document text (signatures, From/To lines). Only the
 * directory/role assignment is withheld. Every other tier-2 value and every tier-1 value
 * (names and emails included) stay strict everywhere; JS/CSS bundles stay strict for all.
 */
export function isAuthoredName(n: { path: string; key: string }): boolean {
  return n.key === 'T2' && /^roster\.[^.]+\.(?:name|email)$/.test(n.path);
}

/** Baseline document files: docs JSON, prerendered pages, the search index (not JS/CSS bundles). */
export function isDocFile(f: string, distRoot: string = dist): boolean {
  const p = relative(distRoot, f).split(sep).join('/');
  if (p.startsWith('..')) return false;
  return /^data\/docs\/(?:@[a-z]+\/)?[^/]+\.json$/.test(p) || /^data\/search(?:@[a-z]+)?\.json$/.test(p) || /\.html$/.test(p);
}

/**
 * Account variant rules (pass two): a variant file data/docs/@<account>/<id>.json must belong to a
 * known account, replace an existing base route with the same route/docNo/app/family, and be
 * listed in that route's `variants`; every listed variant must exist. Returns problem messages.
 */
export function checkVariantDoc(account: string, doc: DocJson, base: RouteEntry | undefined): string[] {
  const out: string[] = [];
  if (!(ACCOUNT_IDS as readonly string[]).includes(account)) out.push(`unknown account "${account}"`);
  if (!base) return [...out, `no base route with id "${doc.id}"`];
  for (const k of ['route', 'docNo', 'app', 'family'] as const) {
    if (doc[k] !== base[k]) out.push(`${k} "${doc[k]}" differs from the base "${base[k]}"`);
  }
  if (!base.variants?.includes(account as AccountIdLit)) out.push(`base route ${base.route} does not list "${account}" in variants`);
  return out;
}

/** `{token}`s in a document's text that are not declared message slots. */
export function undeclaredSlotTokens(doc: DocJson): string[] {
  const msg = doc.frontmatter?.message as { slots?: unknown } | undefined;
  const declared = new Set(Array.isArray(msg?.slots) ? msg.slots.map((s) => `{${String(s)}}`) : []);
  const text = `${doc.title} ${doc.summary} ${htmlToText(doc.html)}`;
  return [...new Set([...text.matchAll(SLOT_TOKEN_RE)].map((m) => m[0]))].filter((t) => !declared.has(t));
}

export function findWithheld(text: string, needles: Needle[]): { index: number; path: string; key: string }[] {
  const out: { index: number; path: string; key: string }[] = [];
  for (const n of needles) {
    for (const f of n.forms) {
      const i = text.indexOf(f);
      if (i >= 0) {
        out.push({ index: i, path: n.path, key: n.key });
        break;
      }
    }
  }
  return out;
}

/** Forms a string can take inside a bundled JS chunk or a JSON file. */
export function bundleForms(text: string): string[] {
  const json = JSON.stringify(text).slice(1, -1);
  const uEsc = json.replace(/[\u0080-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const sq = (s: string) => s.replace(/'/g, "\\'");
  return [...new Set([text, json, sq(json), uEsc, sq(uEsc)])];
}

const isRestrictedBundleKey = (k: string): boolean => isTier1Key(k) || /^[A-Z]{3,}(\+T\d)?$/.test(k);

/**
 * Rule 11 needles: full-canon values withheld under tier 1 or a compartment (rule 7's corpus,
 * same exemptions) plus the content corpus fragments. Tier 2 values stay under rule 7.
 */
export function bundleNeedles(canonNeedles: Needle[], corpus: RestrictedText[]): Needle[] {
  const out: Needle[] = canonNeedles
    .filter((n) => isRestrictedBundleKey(n.key))
    .map((n) => ({ ...n, forms: [...new Set(n.forms.flatMap(bundleForms))] }));
  for (const r of corpus) out.push({ path: `content/${r.file}`, key: r.key, forms: bundleForms(r.text) });
  return out;
}

/** Initial shell budget (SPEC budgets), gzip -9 over the entry script and its modulepreloads. */
export const SHELL_BUDGET_GZ = 180 * 1024;

/** The entry script and every modulepreload that index.html loads before any interaction. */
export function shellFiles(indexHtml: string): string[] {
  const out: string[] = [];
  for (const m of indexHtml.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)) out.push(m[1]!);
  for (const m of indexHtml.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) out.push(m[1]!);
  return [...new Set(out)];
}

function inferBase(): string {
  if (process.env.MERIDIAN_BASE) return normalizeBase(process.env.MERIDIAN_BASE);
  const idx = join(dist, 'index.html');
  if (existsSync(idx)) {
    const m = /(?:src|href)="(\/[^"]*?)assets\//.exec(readFileSync(idx, 'utf8'));
    if (m) return normalizeBase(m[1]);
  }
  return '/';
}

function main(): number {
  const failures: string[] = [];
  const fail = (section: string, msg: string) => failures.push(`[${section}] ${msg}`);
  if (!existsSync(dist)) {
    console.error('[verify-dist] dist/ not found: run npm run build first');
    return 1;
  }
  const base = inferBase();
  console.log(`[verify-dist] base ${base}`);

  // 1. route count
  const routesPath = join(root, '.generated', 'routes.json');
  const routes: RouteEntry[] = existsSync(routesPath) ? JSON.parse(readFileSync(routesPath, 'utf8')) : [];
  const onDisk = routes.filter((r) => existsSync(join(dist, ...r.route.split('/').filter(Boolean), 'index.html')));
  const byFam = new Map<string, number>();
  for (const r of routes) byFam.set(r.family, (byFam.get(r.family) ?? 0) + 1);
  console.log(`[routes] ${routes.length} in manifest, ${onDisk.length} prerendered (floor 100, target 240)`);
  const claimed = new Set<string>();
  for (const m of MANIFEST) {
    const n = m.aliases.reduce((s, a) => s + (byFam.get(a) ?? 0), 0);
    m.aliases.forEach((a) => claimed.add(a));
    console.log(`  ${m.family.padEnd(22)} ${String(n).padStart(4)} / ${m.target}`);
  }
  for (const [f, n] of byFam) if (!claimed.has(f)) console.log(`  ${`(other) ${f}`.padEnd(22)} ${String(n).padStart(4)}`);
  if (onDisk.length < 100) fail('routes', `only ${onDisk.length} prerendered routes; at least 100 required`);
  for (const r of routes) if (!onDisk.includes(r)) fail('routes', `${r.route} has no dist${r.route}/index.html`);

  const distFiles = walk(dist);

  // 2. external URLs
  for (const f of distFiles) {
    const ext = extname(f).toLowerCase();
    if (!URL_SCAN_EXT.has(ext)) continue;
    const text = readFileSync(f, 'utf8');
    for (const hit of findExternalUrls(text, ext)) fail('external-url', `${rel(f)}:${lineAt(text, hit.index)} ${hit.url}`);
  }

  // 3. banned words
  const contentFiles = walk(join(root, 'content'));
  for (const f of [...distFiles, ...contentFiles]) {
    if (!TEXT_EXT.has(extname(f).toLowerCase())) continue;
    const text = readFileSync(f, 'utf8');
    for (const hit of findBannedWords(text)) fail('placeholder-text', `${rel(f)}:${lineAt(text, hit.index)} "${hit.word}"`);
  }

  // 4. internal links in prerendered HTML
  const exists = new Map<string, boolean>();
  const resolves = (p: string): boolean => {
    let v = exists.get(p);
    if (v === undefined) {
      const abs = join(dist, ...p.split('/').filter(Boolean));
      v =
        (existsSync(abs) && statSync(abs).isFile()) ||
        existsSync(join(abs, 'index.html'));
      exists.set(p, v);
    }
    return v;
  };
  /** Problem with one href/src, or null if it resolves (or is not an internal link). */
  const linkProblem = (rawAttr: string, pageUrl: string): string | null => {
    const raw = rawAttr.replace(/&amp;/g, '&');
    if (!raw || /^(#|mailto:|data:|javascript:|blob:|https?:)/i.test(raw)) return null;
    let path = raw.split('#')[0]!.split('?')[0]!;
    if (!path) return null;
    try {
      path = decodeURIComponent(path);
    } catch {
      return `undecodable href ${raw}`;
    }
    let distPath: string;
    if (path.startsWith('/')) {
      if (!path.startsWith(base) && `${path}/` !== base) return `${raw} is outside base ${base}`;
      distPath = path.slice(base.length - 1) || '/';
    } else {
      distPath = posix.join(posix.dirname(pageUrl), path);
    }
    return resolves(distPath) ? null : `${raw} does not resolve in dist/`;
  };
  for (const f of distFiles.filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    const pageUrl = `/${rel(f).replace(/^dist\//, '')}`;
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const p = linkProblem(m[1]!, pageUrl);
      if (p) fail('links', `${rel(f)}:${lineAt(html, m.index ?? 0)} ${p}`);
    }
  }

  // 9. account variants (pass two): same rules as base documents, plus base agreement
  const routeById = new Map(routes.map((r) => [r.id, r]));
  const variantDocs: { account: string; file: string; doc: DocJson }[] = [];
  const docsRoot = join(dist, 'data', 'docs');
  for (const ent of existsSync(docsRoot) ? readdirSync(docsRoot, { withFileTypes: true }) : []) {
    if (!ent.isDirectory()) continue;
    if (!ent.name.startsWith('@')) {
      fail('variants', `data/docs/${ent.name}/ is not an account variant folder (@<account>)`);
      continue;
    }
    for (const f of walk(join(docsRoot, ent.name)).filter((x) => x.endsWith('.json'))) {
      try {
        variantDocs.push({ account: ent.name.slice(1), file: f, doc: JSON.parse(readFileSync(f, 'utf8')) as DocJson });
      } catch {
        fail('variants', `${rel(f)} is not JSON`);
      }
    }
  }
  const variantRules: FigureRule[] = existsSync(join(root, '.generated', 'canon-figures.json'))
    ? JSON.parse(readFileSync(join(root, '.generated', 'canon-figures.json'), 'utf8'))
    : [];
  for (const { account, file, doc } of variantDocs) {
    const where = rel(file);
    if (`${doc.id}.json` !== file.split(/[\\/]/).pop()) fail('variants', `${where}: file name does not match id "${doc.id}"`);
    for (const p of checkVariantDoc(account, doc, routeById.get(doc.id))) fail('variants', `${where}: ${p}`);
    // drift with the canon figure, exactly as on prerendered pages
    for (const p of checkDrift(htmlToText(`${escapeHtml(doc.title)} ${doc.html}`), variantRules)) fail('drift', `${where}: ${p.message}`);
    // slots: only declared message slots may appear (the shell fills them at delivery)
    const tokens = undeclaredSlotTokens(doc);
    if (tokens.length) fail('slot-token', `${where} prints undeclared slot token(s) ${tokens.join(' ')}`);
    // links inside the variant body and its xref list resolve like the prerendered pages
    for (const m of doc.html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const p = linkProblem(m[1]!, doc.route);
      if (p) fail('links', `${where}: ${p}`);
    }
    for (const x of doc.xrefs ?? []) if (!resolves(x.route)) fail('links', `${where}: xref ${x.docNo} -> ${x.route} does not resolve in dist/`);
  }
  const variantAccounts = new Set(variantDocs.map((v) => v.account));
  for (const r of routes) {
    for (const a of r.variants ?? []) {
      if (!variantDocs.some((v) => v.account === a && v.doc.id === r.id)) fail('variants', `${r.route} lists variant "${a}" but data/docs/@${a}/${r.id}.json is missing`);
    }
  }
  const dataDir = join(dist, 'data');
  const accountIndexes = existsSync(dataDir) ? readdirSync(dataDir).filter((n) => /^search@.+\.json$/.test(n)) : [];
  for (const n of accountIndexes) {
    const a = n.slice('search@'.length, -'.json'.length);
    if (!variantAccounts.has(a)) fail('variants', `data/${n}: account "${a}" has no variants (it should use data/search.json)`);
  }
  for (const a of variantAccounts) if (!accountIndexes.includes(`search@${a}.json`)) fail('variants', `account "${a}" has variants but no data/search@${a}.json`);
  console.log(`[variants] ${variantDocs.length} variant document(s); account indexes ${accountIndexes.join(', ') || 'none'}`);

  // 10. every registered app has a static home page (its own document or the prerendered home)
  for (const app of readAppHomes()) {
    const home = join(dist, ...app.homeRoute.split('/').filter(Boolean), 'index.html');
    if (!existsSync(home)) {
      fail('app-home', `${app.id}: no dist${app.homeRoute}/index.html`);
      continue;
    }
    // Set-piece homes carry prose and full document text: check it (register rows are titles and
    // dates, not claims, so they are left out; the documents themselves are checked at their routes).
    if (!(app.id in APP_HOME_TEXT)) continue;
    const page = readFileSync(home, 'utf8').replace(/<table class="static-app-register">[\s\S]*?<\/table>/g, ' ');
    const text = [...page.matchAll(/<article class="static-doc[\s\S]*?<\/article>/g)].map((m) => htmlToText(m[0])).join(' ');
    for (const p of checkDrift(text, variantRules)) fail('drift', `${app.homeRoute} (app home): ${p.message}`);
  }

  // 8. unfilled message slots in static text
  for (const f of distFiles.filter((x) => x.endsWith('.html'))) {
    const tokens = findSlotTokens(readFileSync(f, 'utf8'));
    if (tokens.length) fail('slot-token', `${rel(f)} prints raw slot token(s) ${[...new Set(tokens)].join(' ')}`);
  }

  // 5. headline-figure drift
  const figPath = join(root, '.generated', 'canon-figures.json');
  const rules: FigureRule[] = existsSync(figPath) ? JSON.parse(readFileSync(figPath, 'utf8')) : [];
  if (!rules.length && routes.length) fail('drift', '.generated/canon-figures.json is missing or empty (canon not built?)');
  for (const r of onDisk) {
    const page = readFileSync(join(dist, ...r.route.split('/').filter(Boolean), 'index.html'), 'utf8');
    const art = /<article class="static-doc"[\s\S]*<\/article>/.exec(page);
    const text = htmlToText(art ? art[0] : page);
    for (const p of checkDrift(text, rules)) fail('drift', `${r.route}: ${p.message}`);
  }

  // 6. tier-1 never ships
  const t1Ids = new Set<string>();
  // canon-merge's encoded canon release (CANON-T2) shares the releases folder and codec
  const knownKeys = new Set<string>(CANON_RELEASE_KEYS);
  const docsDir = join(dist, 'data', 'docs');
  for (const f of walk(docsDir).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(f, 'utf8')) as DocJson;
    for (const rx of d.redactions ?? []) {
      knownKeys.add(rx.key);
      if (isTier1Key(rx.key)) t1Ids.add(rx.id);
    }
  }
  const decoded = new Map<string, Record<string, string>>();
  for (const dir of [join(dist, 'data', 'releases'), join(root, 'public', 'data', 'releases')]) {
    for (const [f, check] of checkReleaseFiles(walk(dir), knownKeys)) {
      if (typeof check === 'string') {
        fail(check.startsWith('tier-1') ? 'tier1' : 'releases', `${rel(f)}: ${check}`);
        continue;
      }
      decoded.set(f, check.body);
      for (const id of Object.keys(check.body)) if (t1Ids.has(id)) fail('tier1', `${rel(f)} contains tier-1 redaction ${id}`);
    }
  }

  // 7. values withheld from the client canon never reach baseline output
  const canonPath = join(root, 'content', 'canon', 'canon.json');
  const corpus = readRedactionCorpus(join(root, 'content'));
  if (existsSync(canonPath)) {
    const fullCanon = JSON.parse(readFileSync(canonPath, 'utf8')) as { budget?: { departments?: string[] } };
    const r = deriveRestrictions(fullCanon as Record<string, unknown>, corpus);
    const needles = withheldNeedles(r?.withheld ?? [], r?.client, fullCanon.budget?.departments ?? []);
    const releasesDir = join(dist, 'data', 'releases');
    for (const f of distFiles) {
      if (!TEXT_EXT.has(extname(f).toLowerCase())) continue;
      const isRelease = f.startsWith(releasesDir + sep);
      const text = readFileSync(f, 'utf8');
      // Release files are encoded: no withheld string may appear in their raw bytes at all.
      const list = isRelease ? needles : isDocFile(f) ? needles.filter((n) => !isAuthoredName(n)) : needles;
      for (const hit of findWithheld(text, list)) {
        fail('withheld', `${rel(f)}:${lineAt(text, hit.index)} contains ${hit.key} value ${hit.path}${isRelease ? ' in clear (release files must be encoded)' : ''}`);
      }
      // Decoded, a release may carry its own key's text but never a tier-1 value.
      const body = isRelease ? decoded.get(f) : undefined;
      if (body) {
        const clear = Object.values(body).join('\n');
        for (const hit of findWithheld(clear, needles.filter((n) => isTier1Key(n.key)))) {
          fail('withheld', `${rel(f)} (decoded) contains ${hit.key} value ${hit.path} (tier 1 in a release file)`);
        }
      }
    }
  }

  // 11. no tier-1 / compartment text in JS chunks, workers or the client canon
  if (existsSync(canonPath)) {
    const fullCanon = JSON.parse(readFileSync(canonPath, 'utf8')) as { budget?: { departments?: string[] } };
    const r = deriveRestrictions(fullCanon as Record<string, unknown>, corpus);
    const needles = bundleNeedles(withheldNeedles(r?.withheld ?? [], r?.client, fullCanon.budget?.departments ?? []), corpus.restricted);
    const clientPath = join(root, 'content', 'canon', 'canon.client.json');
    const targets = [...distFiles.filter((f) => /\.(?:js|mjs)$/i.test(f)), ...(existsSync(clientPath) ? [clientPath] : [])];
    let hits = 0;
    for (const f of targets) {
      const text = readFileSync(f, 'utf8');
      for (const hit of findWithheld(text, needles)) {
        hits++;
        fail('bundle-leak', `${rel(f)}:${lineAt(text, hit.index)} contains ${hit.key} text from ${hit.path}`);
      }
    }
    console.log(`[bundle-leak] ${needles.length} tier-1/compartment needles (${corpus.restricted.length} from content) over ${targets.length} JS/worker chunks + client canon: ${hits} hit(s)`);
  }

  // 12. initial shell budget
  const indexPath = join(dist, 'index.html');
  if (existsSync(indexPath)) {
    const files = shellFiles(readFileSync(indexPath, 'utf8'));
    let total = 0;
    const parts: string[] = [];
    for (const url of files) {
      const local = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\.?\//, '');
      const abs = join(dist, ...local.split('/'));
      if (!existsSync(abs)) {
        fail('shell-budget', `index.html loads ${url}, which is not in dist/`);
        continue;
      }
      const gz = gzipSync(readFileSync(abs), { level: 9 }).length;
      total += gz;
      parts.push(`${local.split('/').pop()} ${(gz / 1024).toFixed(1)}`);
    }
    console.log(`[shell-budget] initial shell ${(total / 1024).toFixed(1)} KB gz over ${files.length} files (budget < ${SHELL_BUDGET_GZ / 1024} KB): ${parts.join(', ')}`);
    if (!files.length) fail('shell-budget', 'dist/index.html loads no module script');
    if (total >= SHELL_BUDGET_GZ) fail('shell-budget', `initial shell is ${(total / 1024).toFixed(1)} KB gz; budget < ${SHELL_BUDGET_GZ / 1024} KB`);
  } else fail('shell-budget', 'dist/index.html not found');

  if (failures.length) {
    const shown = failures.slice(0, 400);
    console.error(`\n[verify-dist] FAILED (${failures.length}):\n${shown.join('\n')}`);
    if (failures.length > shown.length) console.error(`... and ${failures.length - shown.length} more`);
    return 1;
  }
  console.log('[verify-dist] all checks passed');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
