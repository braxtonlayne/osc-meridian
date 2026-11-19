/**
 * MERIDIAN content pipeline core. CLI wrapper: scripts/build-content.ts.
 *
 * content/<family>/<slug>.md  ->  .generated/routes.json            RouteEntry[] sorted by route
 *                                 .generated/canon-figures.json     drift rules (figures.ts)
 *                                 public/data/docs/<id>.json        DocJson (baseline-redacted)
 *                                 public/data/releases/<KEY>.json   { rxId: html } (never tier 1)
 *                                 public/data/search.json           MiniSearch (baseline text only)
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
import { CORE_KEYS, FrontmatterSchema, type Frontmatter } from './schema.ts';
import { loadCanon, type CanonData } from './canon.ts';
import { figureRules, type FigureRule } from './figures.ts';
import { COMPARTMENT_IDS, ContentBuildError, isTier1Key, normalizeBase, type Problem } from './util.ts';
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
}

export interface BuildResult {
  routes: RouteEntry[];
  docs: DocJson[];
  releases: Record<string, Record<string, string>>;
  search: SearchDoc[];
  searchJson: string;
  figures: FigureRule[];
  canon: CanonData | null;
}

interface Parsed {
  file: string; // display path
  fm: Frontmatter;
  body: string;
  raw: string;
  lineOffset: number;
  extras: Record<string, unknown>;
}

function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    for (const ent of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, ent.name);
      if (ent.isDirectory()) {
        if (depth === 0 && ent.name === 'canon') continue;
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

function lineOfKey(raw: string, key: string): number | undefined {
  const lines = raw.split(/\r?\n/);
  const i = lines.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  return i >= 0 ? i + 1 : undefined;
}

function parseFiles(files: string[], contentDir: string, displayRoot: string, problems: Problem[]): Parsed[] {
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
    if (relParts.length < 2) {
      problems.push({ file, line: 1, message: 'content files must live in content/<family>/<slug>.md' });
      continue;
    }
    if (relParts[0] !== fm.family) {
      problems.push({ file, line: lineOfKey(raw, 'family'), message: `family "${fm.family}" must match its folder "${relParts[0]}"` });
    }
    const bodyStart = raw.length - gm.content.length;
    const lineOffset = raw.slice(0, bodyStart).split('\n').length - 1;
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fm)) if (!CORE_KEYS.has(k)) extras[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
    parsed.push({ file, fm, raw, body: gm.content, lineOffset, extras });
  }
  return parsed;
}

function checkUnique(parsed: Parsed[], problems: Problem[]): void {
  for (const key of ['id', 'route', 'docNo'] as const) {
    const seen = new Map<string, string>();
    for (const p of parsed) {
      const v = p.fm[key];
      const prev = seen.get(v);
      if (prev) problems.push({ file: p.file, line: undefined, message: `duplicate ${key} "${v}" (also in ${prev})` });
      else seen.set(v, p.file);
    }
  }
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

function routeEntry(fm: Frontmatter): RouteEntry {
  const e: RouteEntry = {
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
  return e;
}

export function buildContent(opts: BuildOptions): BuildResult {
  const contentDir = resolve(opts.contentDir);
  const displayRoot = resolve(opts.displayRoot ?? process.cwd());
  const base = normalizeBase(opts.base);
  const canon = loadCanon(resolve(opts.canonPath));
  const problems: Problem[] = [];

  const parsed = parseFiles(listMarkdown(contentDir), contentDir, displayRoot, problems);
  checkUnique(parsed, problems);
  if (problems.length) throw new ContentBuildError(problems);

  const docsByNo = new Map(parsed.map((p) => [p.fm.docNo, { route: p.fm.route, title: p.fm.title }]));
  const compartments = new Set<string>(
    canon && Array.isArray(canon.compartments)
      ? (canon.compartments as { id: string }[]).map((c) => c.id)
      : COMPARTMENT_IDS,
  );

  const docs: DocJson[] = [];
  const releases = new Map<string, Map<string, string>>();
  const search: SearchDoc[] = [];

  for (const p of parsed) {
    const ctx: CompileContext = {
      file: p.file,
      lineOffset: p.lineOffset,
      docId: p.fm.id,
      docNo: p.fm.docNo,
      base,
      canon,
      docsByNo,
      compartments,
      problems,
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
      problems.push({ file: p.file, message: `compile failed: ${(e as Error).message}` });
      continue;
    }
    if (p.fm.access?.compartment && !compartments.has(p.fm.access.compartment)) {
      problems.push({ file: p.file, line: lineOfKey(p.raw, 'access'), message: `access compartment "${p.fm.access.compartment}" is not a canon compartment` });
    }
    // frontmatter xrefs must resolve too
    const xrefNos = [...(p.fm.xrefs ?? [])];
    for (const no of xrefNos) {
      if (!docsByNo.has(no)) problems.push({ file: p.file, line: lineOfKey(p.raw, 'xrefs'), message: `xrefs: unknown document number "${no}"` });
    }
    for (const no of ctx.xrefsUsed) if (!xrefNos.includes(no)) xrefNos.push(no);

    for (const [key, m] of ctx.releases) {
      if (isTier1Key(key)) continue; // belt and braces; redaction.ts never adds them
      let all = releases.get(key);
      if (!all) releases.set(key, (all = new Map()));
      for (const [id, h] of m) all.set(id, h);
    }
    const redactions: RedactionInfo[] = ctx.redactions
      .filter((r) => r.shipped)
      .map(({ id, key, len, auth, ref }) => ({ id, key, len, auth, ref }));

    const entry = routeEntry(p.fm);
    const doc: DocJson = {
      ...entry,
      html,
      redactions,
      xrefs: xrefNos.filter((no) => docsByNo.has(no)).map((no) => ({ docNo: no, ...docsByNo.get(no)! })),
      headings: ctx.headings,
      frontmatter: p.extras,
    };
    if (p.fm.distribution) doc.distribution = p.fm.distribution;
    if (p.fm.supersedes) doc.supersedes = p.fm.supersedes;
    docs.push(doc);

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
    if (p.fm.access?.tier) sd.tier = p.fm.access.tier;
    if (p.fm.access?.compartment) sd.compartment = p.fm.access.compartment;
    search.push(sd);
  }
  if (problems.length) throw new ContentBuildError(problems);

  docs.sort((a, b) => a.route.localeCompare(b.route));
  const fmById = new Map(parsed.map((p) => [p.fm.id, p.fm]));
  const routes = docs.map((d) => routeEntry(fmById.get(d.id)!));

  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(search);
  const searchJson = JSON.stringify(ms);

  const releasesObj: Record<string, Record<string, string>> = {};
  for (const key of [...releases.keys()].sort()) {
    releasesObj[key] = Object.fromEntries([...releases.get(key)!].sort(([a], [b]) => a.localeCompare(b)));
  }
  const figures = figureRules(canon);

  const result: BuildResult = { routes, docs, releases: releasesObj, search, searchJson, figures, canon };
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
    join(data, 'releases'),
    join(data, 'search.json'),
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
    writeFileSync(join(data, 'releases', `${key}.json`), JSON.stringify(m));
  }
  writeFileSync(join(data, 'search.json'), r.searchJson);
}
