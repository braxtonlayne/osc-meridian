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
 *  6. any release file is keyed to tier 1, or contains an rx id whose redaction key is tier 1.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocJson, RouteEntry } from '../src/core/contracts';
import { checkDrift, type FigureRule } from './content/figures.ts';
import { isTier1Key, normalizeBase } from './content/util.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

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
  for (const f of distFiles.filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    const pageUrl = `/${rel(f).replace(/^dist\//, '')}`;
    for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
      const raw = m[1]!.replace(/&amp;/g, '&');
      if (!raw || /^(#|mailto:|data:|javascript:|blob:|https?:)/i.test(raw)) continue;
      let path = raw.split('#')[0]!.split('?')[0]!;
      if (!path) continue;
      try {
        path = decodeURIComponent(path);
      } catch {
        fail('links', `${rel(f)}:${lineAt(html, m.index ?? 0)} undecodable href ${raw}`);
        continue;
      }
      let distPath: string;
      if (path.startsWith('/')) {
        if (!path.startsWith(base) && `${path}/` !== base) {
          fail('links', `${rel(f)}:${lineAt(html, m.index ?? 0)} ${raw} is outside base ${base}`);
          continue;
        }
        distPath = path.slice(base.length - 1) || '/';
      } else {
        distPath = posix.join(posix.dirname(pageUrl), path);
      }
      if (!resolves(distPath)) fail('links', `${rel(f)}:${lineAt(html, m.index ?? 0)} ${raw} does not resolve in dist/`);
    }
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
  const docsDir = join(dist, 'data', 'docs');
  for (const f of walk(docsDir).filter((x) => x.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(f, 'utf8')) as DocJson;
    for (const rx of d.redactions ?? []) if (isTier1Key(rx.key)) t1Ids.add(rx.id);
  }
  for (const dir of [join(dist, 'data', 'releases'), join(root, 'public', 'data', 'releases')]) {
    for (const f of walk(dir)) {
      const key = decodeURIComponent(f.split(sep).pop()!.replace(/\.json$/, ''));
      if (isTier1Key(key)) fail('tier1', `${rel(f)} is a tier-1 release file`);
      const body = JSON.parse(readFileSync(f, 'utf8')) as Record<string, string>;
      for (const id of Object.keys(body)) if (t1Ids.has(id)) fail('tier1', `${rel(f)} contains tier-1 redaction ${id}`);
    }
  }

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
