// Rendered check for @graphics/forms.
// Usage (from the repo root):  node src/graphics/forms/check/render.mjs
//
// Serves preview.html through Vite (the project's own config, so aliases,
// fonts and tokens are the real ones), opens it in headless Chromium
// (Playwright), writes PNG snapshots next to this file, and then reads every
// rendered barcode back out of the DOM: the bar rectangles are measured in
// screen pixels and decoded with a decoder written here, independent of the
// encoder in ../code39.ts. Exits non-zero if any symbol fails to decode.
// Dev-only: not imported by the application.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');

// Code 39 by construction: ten two-of-five bar patterns x four wide-space positions.
const BAR = ['10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010', '00110'];
const ROWS = [
  ['1234567890', '0100'],
  ['ABCDEFGHIJ', '0010'],
  ['KLMNOPQRST', '0001'],
  ['UVWXYZ-. *', '1000'],
];
const table = new Map();
const weave = (b, s) => [0, 1, 2, 3, 4].map((i) => b[i] + (s[i] ?? '')).join('');
for (const [chars, space] of ROWS) [...chars].forEach((ch, i) => table.set(weave(BAR[i], space), ch));
for (const [ch, s] of [['$', '1110'], ['/', '1101'], ['+', '1011'], ['%', '0111']]) table.set(weave('00000', s), ch);

function decode(rects) {
  const runs = [];
  rects.forEach((r, i) => {
    if (i > 0) runs.push(r.x - (rects[i - 1].x + rects[i - 1].w));
    runs.push(r.w);
  });
  const mid = (Math.min(...runs) + Math.max(...runs)) / 2;
  let text = '';
  for (let i = 0; i < runs.length; i += 10) {
    const pattern = runs.slice(i, i + 9).map((w) => (w > mid ? '1' : '0')).join('');
    const ch = table.get(pattern);
    if (!ch) throw new Error(`unknown pattern ${pattern}`);
    if (runs[i + 9] !== undefined && runs[i + 9] > mid) throw new Error('wide inter-character gap');
    text += ch;
  }
  if (!/^\*[^*]*\*$/.test(text)) throw new Error(`no start/stop in "${text}"`);
  return text.slice(1, -1);
}

const server = await createServer({
  root,
  configFile: join(root, 'vite.config.ts'),
  cacheDir: join(tmpdir(), 'osc-forms-check-vite'),
  logLevel: 'warn',
  server: { port: 5714, strictPort: false, host: '127.0.0.1' },
});
await server.listen();
const address = server.httpServer.address();
const url = `http://127.0.0.1:${address.port}/src/graphics/forms/preview.html`;

let failed = false;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 860, height: 1200 }, deviceScaleFactor: 2 });
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.oscf-sheet');
  await page.evaluate(() => document.fonts.ready);

  await page.locator('.pv-page').screenshot({ path: join(here, 'forms-preview.png') });
  await page.locator('#form').screenshot({ path: join(here, 'form-114.png') });
  await page.locator('#receipt').screenshot({ path: join(here, 'receipt.png') });
  await page.locator('#specimens').screenshot({ path: join(here, 'specimens.png') });

  // 1x pass: what an operator's 96-dpi panel shows.
  const page1 = await browser.newPage({ viewport: { width: 860, height: 1200 }, deviceScaleFactor: 1 });
  await page1.goto(url, { waitUntil: 'networkidle' });
  await page1.evaluate(() => document.fonts.ready);
  await page1.locator('.pv-page').screenshot({ path: join(here, 'forms-preview-1x.png') });

  const symbols = await page.evaluate(() =>
    [...document.querySelectorAll('svg.oscf-barcode__bars')].map((svg) => ({
      expected: svg.getAttribute('data-code39'),
      text: svg.parentElement?.querySelector('.oscf-barcode__text')?.textContent ?? null,
      rects: [...svg.querySelectorAll('rect')]
        .map((r) => r.getBoundingClientRect())
        .map((b) => ({ x: b.left, w: b.width }))
        .sort((a, b) => a.x - b.x),
    })),
  );
  const lines = [`Barcode read-back, ${symbols.length} symbols on ${url.replace(/:\d+/, '')}`];
  for (const s of symbols) {
    let got;
    try {
      got = decode(s.rects);
    } catch (e) {
      got = `ERROR ${e.message}`;
    }
    const ok = got === s.expected;
    if (!ok) failed = true;
    lines.push(`${ok ? 'PASS' : 'FAIL'}  bars=${s.rects.length}  decoded="${got}"  encoded="${s.expected}"  printed="${s.text}"`);
  }
  if (symbols.length === 0) {
    failed = true;
    lines.push('FAIL  no barcodes found');
  }
  if (problems.length > 0) {
    failed = true;
    lines.push('PAGE ERRORS:', ...problems);
  }
  await writeFile(join(here, 'barcode-readback.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
