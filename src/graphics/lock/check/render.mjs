// Rendered check for @graphics/lock.
// Usage (from the repo root):  node src/graphics/lock/check/render.mjs
// Bundles preview.tsx with esbuild into a temp folder and screenshots it with
// Playwright Chromium. Writes PNGs next to this file. Nothing is fetched.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lockDir = resolve(here, '..');
const repo = resolve(lockDir, '../../..');
const out = join(tmpdir(), 'meridian-lock-preview');
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(lockDir, 'preview.tsx')],
  bundle: true,
  outfile: join(out, 'preview.js'),
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.woff': 'dataurl', '.woff2': 'dataurl' },
  absWorkingDir: repo,
  logLevel: 'warning',
});

let html = readFileSync(join(lockDir, 'preview.html'), 'utf8');
const tokens = join(repo, 'src/design/tokens.css');
const realTokens = existsSync(tokens) ? `<style id="design-tokens">${readFileSync(tokens, 'utf8')}</style>` : '';
html = html
  .replace('</head>', `${realTokens}<link rel="stylesheet" href="./preview.css" /></head>`)
  .replace('<script type="module" src="./preview.tsx"></script>', '<script src="./preview.js"></script>');
writeFileSync(join(out, 'index.html'), html);

const url = pathToFileURL(join(out, 'index.html')).href;
const shots = [
  { name: 'lock-1440x900.png', w: 1440, h: 900, hash: '', full: false },
  { name: 'lock-390x844.png', w: 390, h: 844, hash: '', full: false },
  { name: 'lock-390-full.png', w: 390, h: 844, hash: '', full: true },
  { name: 'components.png', w: 1000, h: 800, hash: '#sheet', full: true },
];

const browser = await chromium.launch();
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.w, height: s.h } });
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[page]', m.text());
  });
  page.on('request', (r) => {
    if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) console.error('[network]', r.url());
  });
  await page.goto(url + s.hash);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(here, s.name), fullPage: s.full });
  await page.close();
  console.log('wrote', s.name, realTokens ? '(design tokens)' : '(preview tokens)');
}
await browser.close();
