// Rendered check for @graphics/org.
// Usage (from the repo root):  node src/graphics/org/check/render.mjs
// Bundles preview.tsx with esbuild into a temp folder and screenshots it with
// Playwright Chromium at 1400x900. Writes PNGs next to this file. Nothing is fetched.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const orgDir = resolve(here, '..');
const repo = resolve(orgDir, '../../..');
const out = join(tmpdir(), 'meridian-org-preview');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(orgDir, 'preview.tsx')],
  bundle: true,
  outfile: join(out, 'preview.js'),
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@canon': join(repo, 'content/canon/canon.json') },
  loader: { '.woff': 'dataurl', '.woff2': 'dataurl' },
  absWorkingDir: repo,
  logLevel: 'warning',
});

const html = readFileSync(join(orgDir, 'preview.html'), 'utf8')
  .replace('</head>', '<link rel="stylesheet" href="./preview.css" /></head>')
  .replace('<script type="module" src="./preview.tsx"></script>', '<script src="./preview.js"></script>');
writeFileSync(join(out, 'index.html'), html);
const url = pathToFileURL(join(out, 'index.html')).href;

const shots = [
  { name: 'org-council-t3.png', hash: '#council&tier=3' },
  { name: 'org-council-t1.png', hash: '#council&tier=1' },
  { name: 'org-division-RD.png', hash: '#division=RD&tier=3' },
  { name: 'org-facility-ALPHA-01.png', hash: '#facility=ALPHA-01&tier=3' },
  { name: 'org-unposted-refusal.png', hash: '#division=PV&tier=3', act: 'refusal' },
  { name: 'org-council-expanded.png', hash: '#council&tier=3', act: 'expand' },
  { name: 'pyramid.png', hash: '#pyramid' },
  { name: 'pyramid-highlight-3.png', hash: '#pyramid=3' },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[page]', m.text());
  });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) console.error('[network]', r.url());
  });
  await page.goto(url + s.hash);
  await page.evaluate(() => document.fonts.ready);
  if (s.act === 'refusal') {
    await page.click('[data-node="acct:unposted"] .org-box__main');
    const expandable = await page.locator('[data-node="acct:unposted"] .org-box__tg').count();
    console.log('  unposted expandable controls:', expandable, '| note:', await page.locator('.org-refusal').innerText());
  }
  if (s.act === 'expand') {
    for (const id of ['d:RD', 'c:ALPHA', 'f:ALPHA-03']) {
      await page.click('[data-node="' + id + '"] .org-box__tg');
      await page.focus('.org');
      await page.keyboard.press('f');
    }
    await page.click('[data-node="d:RD"] .org-box__head');
    console.log('  after head click, title:', await page.title());
  }
  await page.screenshot({ path: join(here, s.name) });
  await page.close();
  console.log('wrote', s.name);
}
await browser.close();
