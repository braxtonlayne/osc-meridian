/**
 * Run after `vite build`: writes dist/<route>/index.html for every route in .generated/routes.json,
 * plus dist/404.html (SPA fallback for GitHub Pages) and dist/.nojekyll.
 *
 * Each page is dist/index.html with:
 *   - <title> "<docNo> · <title> · MERIDIAN" and <meta name="description"> from the summary
 *   - the static document (header strip + baseline HTML) injected at <!--MERIDIAN:STATIC-->
 * so deep links render without JavaScript. Links inside the baseline already carry the base
 * path (cross-references are built with $MERIDIAN_BASE).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocJson, RouteEntry } from '../src/core/contracts';
import { escapeHtml, formatDate } from './content/util.ts';

export const STATIC_MARKER = '<!--MERIDIAN:STATIC-->';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function markingLabels(canonPath: string): Map<string, string> {
  const m = new Map<string, string>();
  if (existsSync(canonPath)) {
    const canon = JSON.parse(readFileSync(canonPath, 'utf8')) as { markings?: { id: string; label: string }[] };
    for (const mk of canon.markings ?? []) m.set(mk.id, mk.label);
  }
  return m;
}

export function staticDocument(doc: DocJson, markingLabel: string): string {
  const field = (k: string, v: string) => `<div class="static-doc-field"><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`;
  return [
    `<article class="static-doc" data-doc-id="${escapeHtml(doc.id)}" data-template="${doc.template}" data-marking="${doc.marking}">`,
    `<header class="static-doc-header">`,
    `<p class="static-doc-marking">${escapeHtml(markingLabel)}</p>`,
    `<h1 class="static-doc-title">${escapeHtml(doc.title)}</h1>`,
    `<dl class="static-doc-strip">`,
    field('Document', doc.docNo),
    field('Marking', markingLabel),
    field('Originator', doc.originator),
    field('Revision', String(doc.revision)),
    field('Date', formatDate(doc.date)),
    `</dl>`,
    `</header>`,
    `<div class="static-doc-body">${doc.html}</div>`,
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
  const withHead = setHead(template, `${doc.docNo} · ${doc.title} · MERIDIAN`, doc.summary);
  return withHead.replace(STATIC_MARKER, () => staticDocument(doc, markingLabel));
}

export const NOT_FOUND_NOTE =
  '<article class="static-doc static-doc-notfound"><header class="static-doc-header"><h1 class="static-doc-title">No document at this address</h1></header>' +
  '<div class="static-doc-body"><p>No document is filed under this address in the MERIDIAN library. ' +
  'The workstation will open the desktop; use Directory or the library search to locate the record.</p></div></article>';

function main(): void {
  const dist = join(root, 'dist');
  const indexPath = join(dist, 'index.html');
  if (!existsSync(indexPath)) throw new Error('dist/index.html not found: run vite build first');
  const template = readFileSync(indexPath, 'utf8');
  if (!template.includes(STATIC_MARKER)) throw new Error(`dist/index.html has no ${STATIC_MARKER} marker`);

  const routes = JSON.parse(readFileSync(join(root, '.generated', 'routes.json'), 'utf8')) as RouteEntry[];
  const labels = markingLabels(join(root, 'content', 'canon', 'canon.json'));
  const docsDir = existsSync(join(dist, 'data', 'docs')) ? join(dist, 'data', 'docs') : join(root, 'public', 'data', 'docs');

  for (const r of routes) {
    const doc = JSON.parse(readFileSync(join(docsDir, `${r.id}.json`), 'utf8')) as DocJson;
    const outDir = join(dist, ...r.route.split('/').filter(Boolean));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), renderPage(template, doc, labels.get(doc.marking) ?? doc.marking));
  }

  const notFound = setHead(template, 'Not filed · MERIDIAN', 'No document is filed at this address.').replace(
    STATIC_MARKER,
    () => NOT_FOUND_NOTE,
  );
  writeFileSync(join(dist, '404.html'), notFound);
  writeFileSync(join(dist, '.nojekyll'), '');
  console.log(`[prerender] ${routes.length} routes, 404.html, .nojekyll`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(`[prerender] ${(e as Error).message}`);
    process.exit(1);
  }
}
