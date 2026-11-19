// Rendered check for @graphics/ledger.
// Usage (from the repo root):  node src/graphics/ledger/check/render.mjs
//
// Serves ../preview.html through Vite (the project's own config, so aliases,
// fonts and tokens are the real ones), opens it in headless Chromium
// (Playwright) at 1400x800 and 800x500, and writes PNG snapshots next to this
// file. Exits non-zero on any page error.
// Dev-only: not imported by the application.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');

const SIZES = [
  [1400, 800],
  [800, 500],
];
// name, query, optional interaction
const SHOTS = [
  ['sankey-department', 'view=sankey&mode=department'],
  ['sankey-expanded', 'view=sankey&mode=department&expanded=DOE&hl=source:BLACK'],
  ['sankey-item', 'view=sankey&mode=item'],
  [
    'sankey-item-hover',
    'view=sankey&mode=item',
    async (page) => {
      await page.locator('[aria-label^="LI-040,"]').hover({ force: true });
    },
  ],
  ['sankey-none', 'view=sankey&mode=none&hl=category:TRANSIT'],
  ['charts', 'view=charts'],
  ['charts-selected', 'view=charts&cat=TRANSIT'],
];

const server = await createServer({
  root,
  configFile: join(root, 'vite.config.ts'),
  cacheDir: join(tmpdir(), 'osc-ledger-check-vite'),
  logLevel: 'warn',
  server: { port: 5718, strictPort: false, host: '127.0.0.1' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/src/graphics/ledger/preview.html`;

const problems = [];
const browser = await chromium.launch();
try {
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => problems.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    for (const [name, query, act] of SHOTS) {
      await page.goto(`${base}?${query}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.lg svg');
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      if (act) await act(page);
      await page.screenshot({ path: join(here, `${name}-${w}x${h}.png`) });
      console.log(`wrote ${name}-${w}x${h}.png`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (problems.length > 0) {
  console.error('PAGE ERRORS:\n' + problems.join('\n'));
  process.exit(1);
}
