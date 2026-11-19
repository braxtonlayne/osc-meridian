// Renders the @graphics/banners check images.
//   node src/graphics/banners/check/render.mjs
// Bundles entry.tsx with esbuild, loads it in headless Chromium (Playwright) and
// writes one PNG per section next to this file.
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const work = mkdtempSync(join(tmpdir(), 'banners-check-'));

await build({
  entryPoints: [join(here, 'entry.tsx')],
  bundle: true,
  format: 'iife',
  outfile: join(work, 'check.js'),
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@core': join(root, 'src/core') },
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  logLevel: 'warning',
});

let markings = null;
const canonPath = join(root, 'content/canon/canon.json');
if (existsSync(canonPath)) {
  try {
    const c = JSON.parse(readFileSync(canonPath, 'utf8'));
    if (Array.isArray(c.markings) && c.markings.length) markings = c.markings;
  } catch {
    markings = null;
  }
}
console.log(markings ? 'markings: canon.json' : 'markings: sample palette');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>banners check</title>
<link rel="stylesheet" href="check.css"></head><body><div id="root"></div>
<script>window.__MARKINGS__=${JSON.stringify(markings)};</script><script src="check.js"></script></body></html>`;
writeFileSync(join(work, 'index.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(pathToFileURL(join(work, 'index.html')).href);
await page.waitForSelector('html[data-ready]', { state: 'attached' });
await page.evaluate(() => document.fonts.ready);
for (const id of ['banners', 'strips', 'cover', 'cover-blank', 'stamps', 'pipeline', 'scan']) {
  await page.locator(`#${id}`).screenshot({ path: join(here, `${id}.png`) });
  console.log('wrote', `${id}.png`);
}
await browser.close();
