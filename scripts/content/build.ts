/**
 * MERIDIAN content pipeline core. CLI wrapper: scripts/build-content.ts.
 *
 * content/<family>/<slug>.md  ->  .generated/routes.json            RouteEntry[] sorted by route
 *                                 .generated/canon-figures.json     drift rules (figures.ts)
 *                                 public/data/docs/<id>.json        DocJson (baseline-redacted)
 *                                 public/data/releases/<hash>.json  encoded { rxId: html } (never tier 1;
 *                                                                   src/core/release-codec.ts)
 *                                 public/data/search.json           MiniSearch (baseline text only)
 *
 * content/variants/<account>/<id>.md (pass two account variants; replaces doc <id> for that account)
 *                             ->  public/data/docs/@<account>/<id>.json  DocJson (same id/route/docNo)
 *                                 public/data/search@<account>.json      base index with that account's
 *                                                                        variants substituted
 *                                 RouteEntry.variants on the base entry; variant releases join the same
 *                                 per-key release files (rx ids "<account>-<id>-<n>").
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import MiniSearch from 'minisearch';
import { unified, type Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import type { DocJson, RedactionInfo, RouteEntry } from '../../src/core/contracts';
import { SEARCH_OPTIONS, type SearchDoc } from '../../src/core/search';
import { encodeRelease, releaseFileName } from '../../src/core/release-codec';
import { CORE_KEYS, PLANNING_KEYS, FrontmatterSchema, type Frontmatter } from './schema.ts';
import { loadCanon, type CanonData } from './canon.ts';
import { deriveRestrictions, type Restrictions } from './client-canon.ts';
import { figureRules, type FigureRule } from './figures.ts';
import { ACCOUNT_IDS, CANON_RELEASE_KEYS, COMPARTMENT_IDS, ContentBuildError, VARIANTS_DIR, isTier1Key, normalizeBase, type AccountIdLit, type Problem } from './util.ts';
import type { CompileContext } from './plugins/context.ts';
import { remarkMeridianDirectives } from './plugins/directives.ts';
import { remarkRedaction } from './plugins/redaction.ts';
import { rehypeHeadingIds } from './plugins/heading-ids.ts';

export interface BuildOptions {
  /** Directory scanned for <family>/<slug>.md. content/canon is always skipped. */
  contentDir: string;
  /** canon.json path; may be missing (then :c and ::canon-table are build errors). */
  canonPath: string;
  /** Root that receives .generated/ and public/data/. Omit to build in memory only. */
  outDir?: string;
  /** Public base path ("/" or "/osc-meridian/"), baked into cross-reference hrefs. */
  base?: string;
  /** Root used to print file paths in messages. */
  displayRoot?: string;
  /**
   * Document numbers planned in content/manifest.json. An :x[] (or frontmatter xref) to one of
   * these whose page does not exist yet is a warning when pendingXrefsAreWarnings (dry run),
   * otherwise an error that says the page is planned but missing.
   */
  manifestDocNos?: Set<string>;
  pendingXrefsAreWarnings?: boolean;
  /** Real build that skips files failing validation/compile (as warnings) and writes the rest. */
  lenient?: boolean;
  /** Report problems/warnings only for files under this directory; all content is still loaded. */
  onlyDir?: string;
  /** Account variants root (<account>/<id>.md). Default <contentDir>/variants. */
  variantsDir?: string;
}

/** One account variant of a base document (content/variants/<account>/<id>.md). */
export interface VariantDoc {
  account: AccountIdLit;
  doc: DocJson;
}

export interface BuildResult {
  routes: RouteEntry[];
  docs: DocJson[];
  releases: Record<string, Record<string, string>>;
  search: SearchDoc[];
  searchJson: string;
  /** Account variants, sorted by account then id. Never in `docs`, `routes` or the base index. */
  variants: VariantDoc[];
  /** Serialized MiniSearch per account that has at least one variant (search@<account>.json). */
  accountSearch: Record<string, string>;
  figures: FigureRule[];
  canon: CanonData | null;
  warnings: Problem[];
  /** Problems in files outside onlyDir that were not reported. */
  suppressed: number;
}

interface Parsed {
  file: string; // display path
  fm: Frontmatter;
  body: string;
  raw: string;
  lineOffset: number;
  extras: Record<string, unknown>;
  /** Set for content/variants/<account>/<id>.md. */
  account?: AccountIdLit;
}

function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    for (const ent of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) {
        if (depth === 0 && (ent.name === 'canon' || ent.name === VARIANTS_DIR)) continue;
        if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
        walk(p, depth + 1);
      } else if (ent.isFile() && ent.name.endsWith('.md') && !/^readme\.md$/i.test(ent.name)) {
        out.push(p);
      }
    }
  };
  walk(dir, 0);
  return out;
}

const DOCNO_RE = /^[A-Z0-9]+(?:[-/.][A-Z0-9]+)+$/;

/**
 * Planned document numbers from a manifest file. Accepted shapes: an array of docNo strings,
 * any nesting of objects/arrays whose records carry a `docNo` field, or an object keyed by docNo.
 */
export function loadManifestDocNos(path: string): Set<string> {
  const out = new Set<string>();
  const json = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  const addStrings = (arr: unknown[]) => {
    for (const s of arr) if (typeof s === 'string' && DOCNO_RE.test(s)) out.add(s);
  };
  const walk = (v: unknown) => {
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (DOCNO_RE.test(k) && k.includes('-')) out.add(k); // keyed by docNo
        if (k === 'docNo' && typeof x === 'string') out.add(x);
        else if ((k === 'docNos' || k === 'aliases') && Array.isArray(x)) addStrings(x);
        else if (x && typeof x === 'object') walk(x);
      }
    }
  };
  if (Array.isArray(json)) addStrings(json);
  walk(json);
  return out;
}

/** YAML Dates -> "YYYY-MM-DD" (midnight UTC) or full ISO strings, recursively. */
function plainData(v: unknown): unknown {
  if (v instanceof Date) {
    const iso = v.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  }
  if (Array.isArray(v)) return v.map(plainData);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plainData(x)]));
  return v;
}

function lineOfKey(raw: string, key: string): number | undefined {
  const lines = raw.split(/\r?\n/);
  const i = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  return i >= 0 ? i + 1 : undefined;
}

function parseFiles(files: string[], contentDir: string, displayRoot: string, problems: Problem[], variants = false): Parsed[] {
  const parsed: Parsed[] = [];
  for (const abs of files) {
    const file = relative(displayRoot, abs).split(sep).join('/');
    const raw = readFileSync(abs, 'utf8');
    let gm: matter.GrayMatterFile<string>;
    try {
      gm = matter(raw);
    } catch (e) {
      const mark = (e as { mark?: { line?: number } }).mark;
      problems.push({ file, line: mark?.line !== undefined ? mark.line + 2 : 1, message: `frontmatter YAML: ${(e as Error).message.split('\n')[0]}` });
      continue;
    }
    if (!raw.trimStart().startsWith('---')) {
      problems.push({ file, line: 1, message: 'missing YAML frontmatter (--- ... ---)' });
      continue;
    }
    const res = FrontmatterSchema.safeParse(gm.data);
    if (!res.success) {
      for (const issue of res.error.issues) {
        const key = String(issue.path[0] ?? '');
        problems.push({
          file,
          line: key ? lineOfKey(raw, key) : 1,
          message: `frontmatter ${issue.path.join('.') || '(root)'}: ${issue.message}`,
        });
      }
      continue;
    }
    const fm = res.data;
    const relParts = relative(contentDir, abs).split(sep);
    let account: AccountIdLit | undefined;
    if (variants) {
      if (relParts.length !== 2 || !(ACCOUNT_IDS as readonly string[]).includes(relParts[0]!)) {
        problems.push({ file, line: 1, message: `variants must live in content/${VARIANTS_DIR}/<account>/<id>.md (account: ${ACCOUNT_IDS.join(', ')})` });
        continue;
      }
      if (relParts[1] !== `${fm.id}.md`) {
        problems.push({ file, line: lineOfKey(raw, 'id'), message: `variant file name must be its id ("${fm.id}.md")` });
        continue;
      }
      account = relParts[0] as AccountIdLit;
    } else if (relParts.length < 2) {
      problems.push({ file, line: 1, message: 'content files must live in content/<family>/<slug>.md' });
      continue;
    } else if (relParts[0] !== fm.family) {
      problems.push({ file, line: lineOfKey(raw, 'family'), message: `family "${fm.family}" must match its folder "${relParts[0]}"` });
      continue;
    }
    const bodyStart = raw.length - gm.content.length;
    const lineOffset = raw.slice(0, bodyStart).split('\n').length - 1;
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fm)) if (!CORE_KEYS.has(k) && !PLANNING_KEYS.has(k)) extras[k] = plainData(v);
    parsed.push({ file, fm, raw, body: gm.content, lineOffset, extras, ...(account ? { account } : {}) });
  }
  return parsed;
}

/** Duplicate id/route/docNo/alias: report, and return the files that keep their claim (first wins). */
function checkUnique(parsed: Parsed[], problems: Problem[]): Parsed[] {
  const losers = new Set<Parsed>();
  for (const key of ['id', 'route'] as const) {
    const seen = new Map<string, string>();
    for (const p of parsed) {
      const v = p.fm[key];
      const prev = seen.get(v);
      if (prev) {
        problems.push({ file: p.file, line: lineOfKey(p.raw, key), message: `duplicate ${key} "${v}" (also in ${prev})` });
        losers.add(p);
      } else seen.set(v, p.file);
    }
  }
  // docNo and aliases share one namespace
  const numbers = new Map<string, string>();
  for (const p of parsed) {
    for (const [no, key] of [[p.fm.docNo, 'docNo'], ...(p.fm.aliases ?? []).map((a) => [a, 'aliases'])] as [string, string][]) {
      const prev = numbers.get(no);
      if (prev && prev !== p.file) {
        problems.push({ file: p.file, line: lineOfKey(p.raw, key), message: `duplicate document number "${no}" (${key}; also in ${prev})` });
        losers.add(p);
      } else numbers.set(no, p.file);
    }
  }
  return parsed.filter((p) => !losers.has(p));
}

interface Shared {
  base: string;
  canon: CanonData | null;
  docsByNo: Map<string, { route: string; title: string }>;
  compartments: Set<string>;
  manifest: Set<string>;
  pendingXrefsAreWarnings: boolean;
  lenient: boolean;
  restrictions: Restrictions | null;
}

interface Compiled {
  p: Parsed;
  problems: Problem[];
  warnings: Problem[];
  doc?: DocJson;
  sd?: SearchDoc;
  releases?: Map<string, Map<string, string>>;
}

function compileBody(p: Parsed, ctx: CompileContext): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMeridianDirectives as unknown as Plugin<[CompileContext]>, ctx)
    .use(remarkRedaction as unknown as Plugin<[CompileContext]>, ctx)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHeadingIds, ctx)
    .use(rehypeStringify);
  const tree = processor.parse(p.body);
  const hast = processor.runSync(tree);
  return String(processor.stringify(hast as never)).trim();
}

function compileOne(p: Parsed, sh: Shared): Compiled {
  const out: Compiled = { p, problems: [], warnings: [] };
  const ctx: CompileContext = {
    file: p.file,
    lineOffset: p.lineOffset,
    docId: p.fm.id,
    // Variant redaction ids never collide with the base document's ids.
    rxPrefix: p.account ? `${p.account}-${p.fm.id}` : p.fm.id,
    docNo: p.fm.docNo,
    base: sh.base,
    canon: sh.canon,
    restrictions: sh.restrictions,
    rxDepth: 0,
    xrefsHidden: [],
    docsByNo: sh.docsByNo,
    compartments: sh.compartments,
    manifest: sh.manifest,
    pendingXrefsAreWarnings: sh.pendingXrefsAreWarnings,
    lenient: sh.lenient,
    problems: out.problems,
    warnings: out.warnings,
    xrefsUsed: [],
    redactions: [],
    releases: new Map(),
    headings: [],
    plainText: '',
  };
  let html: string;
  try {
    html = compileBody(p, ctx);
  } catch (e) {
    out.problems.push({ file: p.file, message: `compile failed: ${(e as Error).message}` });
    return out;
  }
  if (p.fm.access?.compartment && !sh.compartments.has(p.fm.access.compartment)) {
    out.problems.push({ file: p.file, line: lineOfKey(p.raw, 'access'), message: `access compartment "${p.fm.access.compartment}" is not a canon compartment` });
  }
  // frontmatter xrefs must resolve too (against docNos and aliases)
  const xrefNos: string[] = [];
  for (const no of p.fm.xrefs ?? []) {
    if (sh.docsByNo.has(no)) {
      xrefNos.push(no);
      continue;
    }
    const line = lineOfKey(p.raw, 'xrefs');
    const planned = sh.manifest.has(no);
    if ((planned && sh.pendingXrefsAreWarnings) || sh.lenient) {
      out.warnings.push({ file: p.file, line, message: planned ? `xrefs: "${no}" is in the manifest but has no page yet` : `xrefs: unknown document number "${no}" (dropped)` });
    } else {
      out.problems.push({
        file: p.file,
        line,
        message: planned ? `xrefs: "${no}" is planned in the manifest but its page does not exist` : `xrefs: unknown document number "${no}"`,
      });
    }
  }
  // A docNo linked only from inside redactions is withheld: it must not appear in the baseline
  // list even if the author also listed it in frontmatter `xrefs`. The client re-adds it from
  // the release HTML once the redaction is released (src/core/docs.ts).
  const hiddenOnly = ctx.xrefsHidden.filter((no) => !ctx.xrefsUsed.includes(no));
  for (const no of hiddenOnly) {
    const i = xrefNos.indexOf(no);
    if (i >= 0) {
      xrefNos.splice(i, 1);
      out.warnings.push({ file: p.file, line: lineOfKey(p.raw, 'xrefs'), message: `xrefs: "${no}" is linked only inside a redaction; withheld from the baseline xref list` });
    }
  }
  for (const no of ctx.xrefsUsed) if (!xrefNos.includes(no)) xrefNos.push(no);
  if (out.problems.length) return out;

  const redactions: RedactionInfo[] = ctx.redactions
    .filter((r) => r.shipped)
    .map(({ id, key, len, auth, ref }) => ({ id, key, len, auth, ref }));
  const doc: DocJson = {
    ...routeEntry(p.fm),
    html,
    redactions,
    xrefs: xrefNos.map((no) => ({ docNo: no, ...sh.docsByNo.get(no)! })),
    headings: ctx.headings,
    frontmatter: p.extras,
  };
  if (p.fm.distribution) doc.distribution = p.fm.distribution;
  if (p.fm.supersedes) doc.supersedes = p.fm.supersedes;
  const sd: SearchDoc = {
    id: p.fm.id,
    route: p.fm.route,
    title: p.fm.title,
    docNo: p.fm.docNo,
    summary: p.fm.summary,
    text: ctx.plainText,
    marking: p.fm.marking,
    app: p.fm.app,
  };
  if (p.fm.aliases?.length) sd.aliases = p.fm.aliases.join(' ');
  if (p.fm.access?.tier) sd.tier = p.fm.access.tier;
  if (p.fm.access?.compartment) sd.compartment = p.fm.access.compartment;
  return { ...out, doc, sd, releases: ctx.releases };
}

function routeEntry(fm: Frontmatter): RouteEntry {
  const e: RouteEntry & { aliases?: string[] } = {
    id: fm.id,
    route: fm.route,
    app: fm.app,
    family: fm.family,
    template: fm.template,
    docNo: fm.docNo,
    title: fm.title,
    marking: fm.marking,
    originator: fm.originator,
    revision: fm.revision,
    date: fm.date,
    summary: fm.summary,
  };
  if (fm.access) e.access = fm.access as RouteEntry['access'];
  if (fm.facility) e.facility = fm.facility as RouteEntry['facility'];
  if (fm.aliases?.length) e.aliases = fm.aliases;
  if (fm.t4 === true) e.t4 = true;
  return e;
}

/** Variant fields that must equal the base document (build error otherwise). */
export const VARIANT_LOCKED_KEYS = ['route', 'docNo', 'app', 'family'] as const;

/** Problems for a variant whose locked fields or aliases differ from its base. */
function checkVariantAgainstBase(v: Parsed, base: Parsed | undefined): Problem[] {
  if (!base) {
    return [{ file: v.file, line: lineOfKey(v.raw, 'id'), message: `variant of "${v.fm.id}": no base document with that id` }];
  }
  const out: Problem[] = [];
  for (const k of VARIANT_LOCKED_KEYS) {
    if (v.fm[k] !== base.fm[k]) {
      out.push({ file: v.file, line: lineOfKey(v.raw, k), message: `variant ${k} "${v.fm[k]}" must equal the base (${base.file}: "${base.fm[k]}")` });
    }
  }
  if (v.fm.aliases && JSON.stringify(v.fm.aliases) !== JSON.stringify(base.fm.aliases ?? [])) {
    out.push({ file: v.file, line: lineOfKey(v.raw, 'aliases'), message: 'variant aliases must be omitted or equal the base (a variant cannot claim new document numbers)' });
  }
  return out;
}

export function buildContent(opts: BuildOptions): BuildResult {
  const contentDir = resolve(opts.contentDir);
  const displayRoot = resolve(opts.displayRoot ?? process.cwd());
  const base = normalizeBase(opts.base);
  const canon = loadCanon(resolve(opts.canonPath));
  if (opts.onlyDir && opts.outDir) throw new Error('onlyDir is a validation mode: it cannot be combined with outDir');
  const lenient = !!opts.lenient;
  const problems: Problem[] = [];
  const warnings: Problem[] = [];
  const manifest = opts.manifestDocNos ?? new Set<string>();
  const onlyPrefix = opts.onlyDir
    ? `${relative(displayRoot, resolve(opts.onlyDir)).split(sep).join('/').replace(/\/+$/, '')}/`
    : null;
  const inScope = (p: Problem) => !onlyPrefix || p.file.startsWith(onlyPrefix);
  const check = () => {
    const reported = problems.filter(inScope);
    if (reported.length && !lenient) throw new ContentBuildError(reported);
  };

  let candidates = checkUnique(parseFiles(listMarkdown(contentDir), contentDir, displayRoot, problems), problems);
  const variantsRoot = resolve(opts.variantsDir ?? join(contentDir, VARIANTS_DIR));
  const variantParsed = parseFiles(listMarkdown(variantsRoot), variantsRoot, displayRoot, problems, true);
  check();

  let restrictions: Restrictions | null;
  try {
    restrictions = deriveRestrictions(canon);
  } catch (e) {
    throw new ContentBuildError([{ file: relative(displayRoot, resolve(opts.canonPath)).split(sep).join("/"), message: `cannot derive client canon restrictions: ${(e as Error).message}` }]);
  }
  const compartments = new Set<string>(
    canon && Array.isArray(canon.compartments)
      ? (canon.compartments as { id: string }[]).map((c) => c.id)
      : COMPARTMENT_IDS,
  );

  // Lenient: drop failing files and recompile until stable, so nobody links to a skipped page.
  let results: Compiled[] = [];
  let sh!: Shared;
  for (let round = 0; round < 10; round++) {
    const docsByNo = new Map<string, { route: string; title: string }>();
    for (const p of candidates) {
      for (const no of [p.fm.docNo, ...(p.fm.aliases ?? [])]) docsByNo.set(no, { route: p.fm.route, title: p.fm.title });
    }
    sh = { base, canon, restrictions, docsByNo, compartments, manifest, pendingXrefsAreWarnings: !!opts.pendingXrefsAreWarnings, lenient };
    results = candidates.map((p) => compileOne(p, sh));
    const failed = results.filter((r) => r.problems.length);
    if (!lenient || !failed.length) break;
    for (const r of failed) problems.push(...r.problems);
    candidates = candidates.filter((p) => !failed.some((r) => r.p === p));
  }
  for (const r of results) {
    if (!lenient) problems.push(...r.problems);
    warnings.push(...r.warnings);
  }

  // Account variants: compiled against the final base set (same xref table), checked against their base.
  const baseById = new Map(candidates.map((p) => [p.fm.id, p]));
  const variantResults: Compiled[] = variantParsed.map((v) => {
    const mismatch = checkVariantAgainstBase(v, baseById.get(v.fm.id));
    return mismatch.length ? { p: v, problems: mismatch, warnings: [] } : compileOne(v, sh);
  });
  // Release files are shared by key across every document and variant: rx ids must be unique.
  const rxOwner = new Map<string, string>();
  for (const r of [...results, ...variantResults]) {
    if (!r.doc || r.problems.length) continue;
    for (const x of r.doc.redactions) {
      const prev = rxOwner.get(x.id);
      if (prev) r.problems.push({ file: r.p.file, message: `redaction id "${x.id}" collides with ${prev}` });
      else rxOwner.set(x.id, r.p.file);
    }
  }
  for (const r of variantResults) {
    problems.push(...r.problems);
    warnings.push(...r.warnings);
  }
  check();
  if (lenient) {
    const skipped = new Set(problems.map((p) => p.file));
    for (const p of problems) warnings.push({ ...p, message: `skipped: ${p.message}` });
    if (skipped.size) warnings.push({ file: '(lenient)', message: `${skipped.size} file(s) skipped: ${[...skipped].join(', ')}` });
  }

  const docs: DocJson[] = [];
  const releases = new Map<string, Map<string, string>>();
  const search: SearchDoc[] = [];
  const addReleases = (r: Compiled) => {
    for (const [key, m] of r.releases ?? []) {
      if (isTier1Key(key)) continue; // belt and braces; redaction.ts never adds them
      let all = releases.get(key);
      if (!all) releases.set(key, (all = new Map()));
      for (const [id, h] of m) all.set(id, h);
    }
  };
  for (const r of results) {
    if (!r.doc || !r.sd || r.problems.length) continue;
    docs.push(r.doc);
    search.push(r.sd);
    addReleases(r);
  }
  const parsed = candidates;
  const suppressed = lenient ? 0 : problems.length;

  // Variants that compiled cleanly, in account order then id.
  const variantOk = variantResults
    .filter((r) => r.doc && r.sd && !r.problems.length)
    .sort((a, b) => ACCOUNT_IDS.indexOf(a.p.account!) - ACCOUNT_IDS.indexOf(b.p.account!) || a.p.fm.id.localeCompare(b.p.fm.id));
  const variantsOf = new Map<string, AccountIdLit[]>();
  for (const r of variantOk) {
    const list = variantsOf.get(r.p.fm.id) ?? [];
    list.push(r.p.account!);
    variantsOf.set(r.p.fm.id, list);
  }

  docs.sort((a, b) => a.route.localeCompare(b.route));
  const fmById = new Map(parsed.map((p) => [p.fm.id, p.fm]));
  const routes = docs.map((d) => {
    const e = routeEntry(fmById.get(d.id)!);
    const vs = variantsOf.get(d.id);
    if (vs) {
      e.variants = [...vs];
      d.variants = [...vs];
    }
    return e;
  });

  const variants: VariantDoc[] = [];
  const searchByAccount = new Map<AccountIdLit, Map<string, SearchDoc>>();
  for (const r of variantOk) {
    const account = r.p.account!;
    const baseFm = fmById.get(r.p.fm.id)!;
    const doc = r.doc!;
    // Locked to the base: numbers it answers for, Tier 4 flag, the account list.
    if (baseFm.aliases?.length) doc.aliases = baseFm.aliases;
    else delete doc.aliases;
    if (baseFm.t4 === true) doc.t4 = true;
    else delete doc.t4;
    doc.variants = [...variantsOf.get(doc.id)!];
    doc.frontmatter = { ...doc.frontmatter, variant: account };
    variants.push({ account, doc });
    addReleases(r);
    const sd: SearchDoc = { ...r.sd! };
    if (baseFm.aliases?.length) sd.aliases = baseFm.aliases.join(' ');
    else delete sd.aliases;
    let m = searchByAccount.get(account);
    if (!m) searchByAccount.set(account, (m = new Map()));
    m.set(doc.id, sd);
  }

  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(search);
  const searchJson = JSON.stringify(ms);
  const accountSearch: Record<string, string> = {};
  for (const account of ACCOUNT_IDS) {
    const subs = searchByAccount.get(account);
    if (!subs) continue;
    const am = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
    am.addAll(search.map((s) => subs.get(s.id) ?? s));
    accountSearch[account] = JSON.stringify(am);
  }

  const releasesObj: Record<string, Record<string, string>> = {};
  for (const key of [...releases.keys()].sort()) {
    releasesObj[key] = Object.fromEntries([...releases.get(key)!].sort(([a], [b]) => a.localeCompare(b)));
  }
  const figures = figureRules(canon);

  const result: BuildResult = {
    routes,
    docs,
    releases: releasesObj,
    search,
    searchJson,
    variants,
    accountSearch,
    figures,
    canon,
    warnings: warnings.filter(inScope),
    suppressed,
  };
  if (opts.outDir) writeOutputs(resolve(opts.outDir), result);
  return result;
}

/** Remove everything this pipeline owns, then write fresh outputs. */
export function writeOutputs(outDir: string, r: BuildResult): void {
  const gen = join(outDir, '.generated');
  const data = join(outDir, 'public', 'data');
  for (const p of [
    join(gen, 'routes.json'),
    join(gen, 'canon-figures.json'),
    join(data, 'docs'),
    // every release file except canon-merge's own (CANON-T2), which is written before this step
    ...(existsSync(join(data, 'releases'))
      ? readdirSync(join(data, 'releases'))
          .filter((n) => !CANON_RELEASE_KEYS.some((k) => n === `${releaseFileName(k)}.json`))
          .map((n) => join(data, 'releases', n))
      : []),
    join(data, 'search.json'),
    ...(existsSync(data) ? readdirSync(data).filter((n) => /^search@.+\.json$/.test(n)).map((n) => join(data, n)) : []),
  ]) {
    rmSync(p, { recursive: true, force: true });
  }
  mkdirSync(gen, { recursive: true });
  mkdirSync(join(data, 'docs'), { recursive: true });
  mkdirSync(join(data, 'releases'), { recursive: true });

  writeFileSync(join(gen, 'routes.json'), `${JSON.stringify(r.routes, null, 2)}\n`);
  writeFileSync(join(gen, 'canon-figures.json'), `${JSON.stringify(r.figures, null, 2)}\n`);
  for (const d of r.docs) writeFileSync(join(data, 'docs', `${d.id}.json`), JSON.stringify(d));
  for (const [key, m] of Object.entries(r.releases)) {
    if (isTier1Key(key)) throw new Error(`refusing to write tier-1 release ${key}`);
    // Obfuscated, not secret: hashed file name, XOR-keystream + base64 body (src/core/release-codec.ts).
    writeFileSync(join(data, 'releases', `${releaseFileName(key)}.json`), JSON.stringify(encodeRelease(key, m)));
  }
  writeFileSync(join(data, 'search.json'), r.searchJson);
  for (const { account, doc } of r.variants) {
    const dir = join(data, 'docs', `@${account}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${doc.id}.json`), JSON.stringify(doc));
  }
  for (const [account, json] of Object.entries(r.accountSearch)) writeFileSync(join(data, `search@${account}.json`), json);
}
