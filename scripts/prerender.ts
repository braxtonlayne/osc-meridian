/**
 * Run after `vite build`: writes <dist>/<route>/index.html for every route in .generated/routes.json,
 * a static page for each app home route that has no document of its own (/records, /mail, ...),
 * plus <dist>/404.html (SPA fallback for GitHub Pages) and <dist>/.nojekyll.
 *
 * Each page is dist/index.html with:
 *   - <title> "<docNo> · <title> · MERIDIAN" and <meta name="description"> from the summary
 *   - the static document (header strip + baseline HTML) injected at <!--MERIDIAN:STATIC-->
 * so deep links render without JavaScript. Links inside the baseline already carry the base
 * path (cross-references are built with $MERIDIAN_BASE).
 *
 * Message slots (frontmatter `message.slots: [auditRef, ...]`) are filled by the shell at
 * delivery; in the static rendering each `{slot}` token becomes an in-world blank.
 *
 * dist directory: $MERIDIAN_DIST or --dist <dir> (default dist/).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocJson, RouteEntry } from '../src/core/contracts';
import { escapeHtml, formatDate, joinBase, normalizeBase } from './content/util.ts';

export const STATIC_MARKER = '<!--MERIDIAN:STATIC-->';
/** What an unfilled message slot prints as in static HTML. */
export const SLOT_BLANK = '<span class="slot-blank">________</span>';
export const SLOT_BLANK_TEXT = '________';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function distDir(argv = process.argv): string {
  const i = argv.indexOf('--dist');
  const v = i >= 0 ? argv[i + 1] : process.env.MERIDIAN_DIST;
  return resolve(root, v ?? 'dist');
}

export function markingLabels(canonPath: string): Map<string, string> {
  const m = new Map<string, string>();
  if (existsSync(canonPath)) {
    const canon = JSON.parse(readFileSync(canonPath, 'utf8')) as { markings?: { id: string; label: string }[] };
    for (const mk of canon.markings ?? []) m.set(mk.id, mk.label);
  }
  return m;
}

/** Declared slot names of a message document (frontmatter.message.slots). */
export function slotNames(doc: DocJson): string[] {
  const msg = doc.frontmatter?.message as { slots?: unknown } | undefined;
  return Array.isArray(msg?.slots) ? msg.slots.filter((s): s is string => typeof s === 'string') : [];
}

/** Replace each declared `{slot}` token: blank markup in HTML, blank text elsewhere. */
export function blankSlots(s: string, slots: string[], replacement: string): string {
  if (!slots.length) return s;
  const re = new RegExp(`\\{(?:${slots.map((x) => x.replace(/[^\w]/g, '')).join('|')})\\}`, 'g');
  return s.replace(re, () => replacement);
}

export function staticDocument(doc: DocJson, markingLabel: string): string {
  const slots = slotNames(doc);
  const t = (s: string) => blankSlots(escapeHtml(s), slots, SLOT_BLANK_TEXT);
  const field = (k: string, v: string) => `<div class="static-doc-field"><dt>${k}</dt><dd>${t(v)}</dd></div>`;
  return [
    `<article class="static-doc" data-doc-id="${escapeHtml(doc.id)}" data-template="${doc.template}" data-marking="${doc.marking}">`,
    `<header class="static-doc-header">`,
    `<p class="static-doc-marking">${escapeHtml(markingLabel)}</p>`,
    `<h1 class="static-doc-title">${t(doc.title)}</h1>`,
    `<dl class="static-doc-strip">`,
    field('Document', doc.docNo),
    field('Marking', markingLabel),
    field('Originator', doc.originator),
    field('Revision', String(doc.revision)),
    field('Date', formatDate(doc.date)),
    `</dl>`,
    `</header>`,
    `<div class="static-doc-body">${blankSlots(doc.html, slots, SLOT_BLANK)}</div>`,
    `</article>`,
  ].join('\n');
}

function setHead(html: string, title: string, description: string): string {
  let out = html;
  const t = `<title>${escapeHtml(title)}</title>`;
  out = /<title>[\s\S]*?<\/title>/.test(out) ? out.replace(/<title>[\s\S]*?<\/title>/, () => t) : out.replace('</head>', () => `${t}\n</head>`);
  const meta = `<meta name="description" content="${escapeHtml(description)}">`;
  out = /<meta\s+name="description"[^>]*>/i.test(out)
    ? out.replace(/<meta\s+name="description"[^>]*>/i, () => meta)
    : out.replace('</head>', () => `${meta}\n</head>`);
  return out;
}

export function renderPage(template: string, doc: DocJson, markingLabel: string): string {
  if (!template.includes(STATIC_MARKER)) throw new Error(`index.html has no ${STATIC_MARKER} marker`);
  const slots = slotNames(doc);
  const withHead = setHead(
    template,
    blankSlots(`${doc.docNo} · ${doc.title} · MERIDIAN`, slots, SLOT_BLANK_TEXT),
    blankSlots(doc.summary, slots, SLOT_BLANK_TEXT),
  );
  return withHead.replace(STATIC_MARKER, () => staticDocument(doc, markingLabel));
}

export interface AppHome {
  id: string;
  title: string;
  homeRoute: string;
}

/** App ids, titles and home routes, read from the app registry source (src/apps/index.ts). */
export function readAppHomes(src = join(root, 'src', 'apps', 'index.ts')): AppHome[] {
  const text = readFileSync(src, 'utf8');
  const out: AppHome[] = [];
  for (const m of text.matchAll(/\{\s*id:\s*'([a-z]+)',\s*title:\s*'([^']+)',[^}]*?homeRoute:\s*'([^']+)'/g)) {
    out.push({ id: m[1]!, title: m[2]!, homeRoute: m[3]! });
  }
  if (!out.length) throw new Error(`no app definitions found in ${src}`);
  return out;
}

/**
 * Static landing page for an app home route with no document of its own: the app's index
 * document when one exists (template "index"), then a register of the app's documents.
 */
export function appHomeHtml(app: AppHome, routes: RouteEntry[], base: string, indexDoc?: { doc: DocJson; label: string }): string {
  const docs = routes.filter((r) => r.app === app.id).sort((a, b) => a.docNo.localeCompare(b.docNo));
  const parts = [`<article class="static-doc static-app-home" data-app="${app.id}">`];
  parts.push(`<header class="static-doc-header"><h1 class="static-doc-title">${escapeHtml(app.title)}</h1></header>`);
  parts.push('<div class="static-doc-body">');
  if (indexDoc) parts.push(staticDocument(indexDoc.doc, indexDoc.label));
  if (docs.length) {
    parts.push(`<p>${docs.length} document${docs.length === 1 ? '' : 's'} held in ${escapeHtml(app.title)}.</p>`);
    parts.push('<table class="static-app-register"><thead><tr><th scope="col">Document</th><th scope="col">Title</th><th scope="col">Date</th></tr></thead><tbody>');
    for (const d of docs) {
      parts.push(
        `<tr><td><a href="${escapeHtml(joinBase(base, d.route))}">${escapeHtml(d.docNo)}</a></td><td>${escapeHtml(d.title)}</td><td>${formatDate(d.date)}</td></tr>`,
      );
    }
    parts.push('</tbody></table>');
  } else {
    parts.push(`<p>${escapeHtml(app.title)} runs only inside a signed-in workstation session. It holds no filed documents.</p>`);
  }
  parts.push('</div></article>');
  return parts.join('\n');
}

export const NOT_FOUND_NOTE =
  '<article class="static-doc static-doc-notfound"><header class="static-doc-header"><h1 class="static-doc-title">No document at this address</h1></header>' +
  '<div class="static-doc-body"><p>No document is filed under this address in the MERIDIAN library. ' +
  'The workstation will open the desktop; use Directory or the library search to locate the record.</p></div></article>';

function inferBase(template: string): string {
  if (process.env.MERIDIAN_BASE) return normalizeBase(process.env.MERIDIAN_BASE);
  const m = /(?:src|href)="(\/[^"]*?)assets\//.exec(template);
  return normalizeBase(m?.[1] ?? '/');
}

function main(): void {
  const dist = distDir();
  const indexPath = join(dist, 'index.html');
  if (!existsSync(indexPath)) throw new Error(`${indexPath} not found: run vite build first`);
  const template = readFileSync(indexPath, 'utf8');
  if (!template.includes(STATIC_MARKER)) throw new Error(`dist/index.html has no ${STATIC_MARKER} marker`);
  const base = inferBase(template);

  const routes = JSON.parse(readFileSync(join(root, '.generated', 'routes.json'), 'utf8')) as RouteEntry[];
  const labels = markingLabels(join(root, 'content', 'canon', 'canon.json'));
  const docsDir = existsSync(join(dist, 'data', 'docs')) ? join(dist, 'data', 'docs') : join(root, 'public', 'data', 'docs');
  const loadDoc = (id: string) => JSON.parse(readFileSync(join(docsDir, `${id}.json`), 'utf8')) as DocJson;

  for (const r of routes) {
    const doc = loadDoc(r.id);
    const outDir = join(dist, ...r.route.split('/').filter(Boolean));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), renderPage(template, doc, labels.get(doc.marking) ?? doc.marking));
  }

  // App homes without a document at their route.
  const taken = new Set(routes.map((r) => r.route));
  let homes = 0;
  for (const app of readAppHomes()) {
    if (taken.has(app.homeRoute)) continue;
    const idx = routes.find((r) => r.app === app.id && r.template === 'index');
    const indexDoc = idx ? { doc: loadDoc(idx.id), label: labels.get(idx.marking) ?? idx.marking } : undefined;
    const count = routes.filter((r) => r.app === app.id).length;
    const page = setHead(
      template,
      `${app.title} · MERIDIAN`,
      count ? `${app.title}: register of ${count} documents.` : `${app.title}: workstation application.`,
    ).replace(STATIC_MARKER, () => appHomeHtml(app, routes, base, indexDoc));
    const outDir = join(dist, ...app.homeRoute.split('/').filter(Boolean));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), page);
    homes++;
  }

  const notFound = setHead(template, 'Not filed · MERIDIAN', 'No document is filed at this address.').replace(
    STATIC_MARKER,
    () => NOT_FOUND_NOTE,
  );
  writeFileSync(join(dist, '404.html'), notFound);
  writeFileSync(join(dist, '.nojekyll'), '');
  console.log(`[prerender] ${routes.length} routes, ${homes} app homes, 404.html, .nojekyll -> ${dist}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`[prerender] ${(e as Error).message}`);
    process.exit(1);
  }
}
