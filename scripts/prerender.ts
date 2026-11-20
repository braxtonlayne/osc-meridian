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
import type { AppId, DocJson, RouteEntry } from '../src/core/contracts';
import { escapeHtml, formatDate, joinBase, normalizeBase } from './content/util.ts';
import { APP_HOME_TEXT } from './content/app-homes.ts';

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

/**
 * App ids, titles and home routes, read from the app registry source (src/apps/index.ts, APPS).
 * Each `{ id: '...', ... load: ... }` entry is read field by field, so key order and quoting
 * style do not matter.
 */
export function readAppHomes(src = join(root, 'src', 'apps', 'index.ts')): AppHome[] {
  const text = readFileSync(src, 'utf8');
  const out: AppHome[] = [];
  const field = (chunk: string, k: string) => new RegExp(`\\b${k}:\\s*(['"\`])((?:(?!\\1).)+)\\1`).exec(chunk)?.[2];
  for (const m of text.matchAll(/\{\s*id:\s*(['"])([a-z0-9-]+)\1([\s\S]*?)\bload\s*:/g)) {
    const chunk = m[3]!;
    const title = field(chunk, 'title');
    const homeRoute = field(chunk, 'homeRoute');
    if (title && homeRoute && !out.some((a) => a.id === m[2])) out.push({ id: m[2]!, title, homeRoute });
  }
  if (!out.length) throw new Error(`no app definitions found in ${src}`);
  return out;
}

/** A document rendered in full on an app home page. */
export interface HomeDoc {
  doc: DocJson;
  label: string;
}

/**
 * Static landing page for an app home route with no document of its own: the app's index
 * document when one exists (template "index"), then a register of the app's documents.
 * Pass-two set pieces (APP_HOME_TEXT) also get their in-world description up front and the full
 * static text of their own document routes (`fullDocs`) after the register, so the no-JS page
 * says what the panel is and the procedure it is built to.
 */
export function appHomeHtml(
  app: AppHome,
  routes: RouteEntry[],
  base: string,
  indexDoc?: HomeDoc,
  extra?: { description?: string[]; fullDocs?: HomeDoc[] },
): string {
  const docs = routes.filter((r) => r.app === app.id).sort((a, b) => a.docNo.localeCompare(b.docNo));
  const parts = [`<article class="static-doc static-app-home" data-app="${app.id}">`];
  parts.push(`<header class="static-doc-header"><h1 class="static-doc-title">${escapeHtml(app.title)}</h1></header>`);
  parts.push('<div class="static-doc-body">');
  for (const p of extra?.description ?? []) parts.push(`<p class="static-app-description">${escapeHtml(p)}</p>`);
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
  // Full documents follow as sibling articles (static-doc articles never nest).
  for (const d of extra?.fullDocs ?? []) parts.push(staticDocument(d.doc, d.label));
  return parts.join('\n');
}

/** Documents of an app shown in full on its static home page (its own routes, not messages). */
export function homeDocs(appId: string, routes: RouteEntry[], limit = 6): RouteEntry[] {
  return routes
    .filter((r) => r.app === appId && r.family !== 'mail' && r.template !== 'index')
    .sort((a, b) => a.docNo.localeCompare(b.docNo))
    .slice(0, limit);
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
  const apps = readAppHomes();
  const missing = Object.keys(APP_HOME_TEXT).filter((id) => !apps.some((a) => a.id === id));
  if (missing.length) console.warn(`[prerender] not in src/apps/index.ts APPS, so no home page: ${missing.join(', ')}`);
  const homeDoc = (r: RouteEntry): HomeDoc => ({ doc: loadDoc(r.id), label: labels.get(r.marking) ?? r.marking });
  for (const app of apps) {
    if (taken.has(app.homeRoute)) continue;
    const idx = routes.find((r) => r.app === app.id && r.template === 'index');
    const indexDoc = idx ? homeDoc(idx) : undefined;
    const count = routes.filter((r) => r.app === app.id).length;
    const text = APP_HOME_TEXT[app.id as AppId];
    const extra = text ? { description: text.description, fullDocs: homeDocs(app.id, routes).map(homeDoc) } : undefined;
    const description = count
      ? `${app.title}: register of ${count} document${count === 1 ? '' : 's'}.`
      : text
        ? `${app.title}: ${text.description[0]!}`
        : `${app.title}: workstation application.`;
    const page = setHead(template, `${app.title} · MERIDIAN`, description).replace(STATIC_MARKER, () =>
      appHomeHtml(app, routes, base, indexDoc, extra),
    );
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
