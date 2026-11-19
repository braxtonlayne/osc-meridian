// Rendered check for @graphics/schematic.
// Usage (from the repo root):  node src/graphics/schematic/check/render.mjs
// Bundles preview.tsx with esbuild into the OS temp folder and screenshots it
// with Playwright Chromium from file:. Writes PNGs next to this file and prints
// a 30-train update timing. Nothing is fetched.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '..');
const repo = resolve(dir, '../../..');
const out = join(tmpdir(), 'meridian-schematic-preview');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(dir, 'preview.tsx')],
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

const tokens = readFileSync(join(repo, 'src/design/tokens.css'), 'utf8');
const html = readFileSync(join(dir, 'preview.html'), 'utf8')
  .replace('</head>', `<style id="design-tokens">${tokens}</style><link rel="stylesheet" href="./preview.css" /></head>`)
  .replace('<script type="module" src="./preview.tsx"></script>', '<script src="./preview.js"></script>');
writeFileSync(join(out, 'index.html'), html);
const url = pathToFileURL(join(out, 'index.html')).href;

const shots = [
  { name: 'diagram-1400x800.png', w: 1400, h: 800, hash: '' },
  { name: 'diagram-700x500.png', w: 700, h: 500, hash: '' },
  { name: 'rail-only-1400x800.png', w: 1400, h: 800, hash: '#rail' },
  { name: 'eastern-700x500.png', w: 700, h: 500, hash: '#east' },
];

const browser = await chromium.launch();
const open = async (w, h, hash) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[page]', m.text());
    else if (m.text().startsWith('PERF')) console.log(m.text());
  });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) console.error('[network]', r.url());
  });
  await page.goto(url + hash);
  await page.evaluate(() => document.fonts.ready);
  return page;
};

for (const s of shots) {
  const page = await open(s.w, s.h, s.hash);
  await page.screenshot({ path: join(here, s.name) });
  await page.close();
  console.log('wrote', s.name);
}

// Keyboard: first Tab lands on a link and shows the dotted focus rectangle; Enter selects it.
{
  const page = await open(1400, 800, '');
  for (let i = 0; i < 30; i++) await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const info = await page.evaluate(() => ({
    focused: document.activeElement?.getAttribute('data-link') ?? document.activeElement?.getAttribute('data-node'),
    pressed: document.activeElement?.getAttribute('aria-pressed'),
    focusable: document.querySelectorAll('[tabindex="0"]').length,
  }));
  console.log('keyboard', JSON.stringify(info));
  await page.screenshot({ path: join(here, 'focus-selected-1400x800.png') });
  await page.close();
  console.log('wrote focus-selected-1400x800.png');
}

// Timing: 30 trains stepped at 4 Hz for 40 updates.
{
  const page = await open(1400, 800, '#perf');
  await page.waitForFunction(() => document.title === 'perf-done', null, { timeout: 30000 });
  await page.close();
}
await browser.close();
