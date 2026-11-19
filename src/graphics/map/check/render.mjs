// Rendered check for @graphics/map.
// Usage (from the repository root):  node src/graphics/map/check/render.mjs
// Bundles preview.tsx with esbuild into a temp directory, opens it in headless
// Chromium via Playwright, writes PNGs next to this file and prints the results
// of the behaviour checks (tooltip, keyboard cycling, label collisions).
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const out = mkdtempSync(join(tmpdir(), 'meridian-map-'));

await build({
  entryPoints: [join(here, 'preview.tsx')],
  bundle: true,
  outdir: out,
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@canon': join(root, 'content/canon/canon.json'), '@core': join(root, 'src/core') },
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  logLevel: 'warning',
});

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>map check</title>
<link rel="stylesheet" href="preview.css">
<style>
body{margin:0;background:var(--chrome-face);font:12px/16px var(--font-ui);color:var(--text-1)}
.ck-sheet{display:flex;flex-direction:column;align-items:flex-start;gap:24px;padding:24px}
.ck-frame{border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow)}
.ck-glyphs{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:12px;background:var(--surface)}
.ck-row{display:flex;gap:10px;align-items:center}
</style></head><body><div id="root"></div><script src="preview.js"></script></body></html>`;
writeFileSync(join(out, 'index.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(out, 'index.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('.ck-sheet', { timeout: 5000 }).catch(() => undefined);

const shot = (sel, file) => page.locator(sel).first().screenshot({ path: join(here, file) });
await shot('#map-1200 .um', 'map-1200x760.png');
await shot('#map-600 .um', 'map-600x380.png');
await shot('#map-selected .um', 'map-1200x760-alpha03-selected.png');
await shot('#map-plain .um', 'map-600x380-plain.png');
await shot('#glyphs', 'glyphs-legend.png');

// ---- label collisions: no designation label may overlap another label or the plate ----
const collisions = await page.evaluate(() => {
  const res = {};
  for (const frame of document.querySelectorAll('.ck-frame')) {
    const boxes = [...frame.querySelectorAll('.um-label text, .um-plate__box')].map((el) => {
      const r = el.getBoundingClientRect();
      return { t: el.textContent || 'plate', x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    });
    const bad = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) bad.push(a.t + ' x ' + b.t);
      }
    res[frame.id] = { labels: boxes.length, overlapping: bad };
  }
  return res;
});

// ---- marker counts and DELTA withholding ----
const counts = await page.evaluate(() =>
  Object.fromEntries(
    [...document.querySelectorAll('.ck-frame')].map((f) => [
      f.id,
      { markers: f.querySelectorAll('.um-marker').length, delta: f.querySelectorAll('.um-marker .um-glyph--delta').length },
    ]),
  ),
);

// ---- hover tooltip ----
const live = page.locator('#map-live');
await live.scrollIntoViewIfNeeded();
await live.locator('[data-id="ALPHA-03"]').hover();
await page.waitForTimeout(700);
const tip = await live.locator('.um-tip').innerText();
await live.locator('.um').screenshot({ path: join(here, 'map-900x570-hover-alpha03.png') });
await page.mouse.move(2, 2);

// ---- keyboard: one tab stop, arrows cycle, Enter selects ----
const tabStops = await live.locator('.um-marker[tabindex="0"]').count();
await live.locator('.um-marker[tabindex="0"]').focus();
const seq = [];
const active = () => page.evaluate(() => document.activeElement?.getAttribute('data-id'));
seq.push(await active());
const keys = ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'End', 'ArrowRight', 'ArrowDown', 'ArrowDown'];
for (const key of keys) {
  await page.keyboard.press(key);
  seq.push(`${key}:${await active()}`);
}
await page.keyboard.press('Enter');
const selected = await live.getAttribute('data-selected');
const aria = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
await live.locator('.um').screenshot({ path: join(here, 'map-900x570-keyboard.png') });

// ---- details at 3x for close inspection of line work and glyphs ----
const zoom = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 3 });
await zoom.goto(pathToFileURL(join(out, 'index.html')).href);
await zoom.evaluate(() => document.fonts.ready);
const detail = async (sel, x, y, w, h, file) => {
  const box = await zoom.locator(sel).first().boundingBox();
  await zoom.screenshot({ path: join(here, file), clip: { x: box.x + x, y: box.y + y, width: w, height: h }, fullPage: true });
};
await detail('#map-1200 .um', 0, 620, 380, 140, 'detail-furniture.png');
await detail('#map-1200 .um', 860, 220, 340, 220, 'detail-northeast.png');
await detail('#map-selected .um', 700, 240, 380, 240, 'detail-selected.png');

await browser.close();
rmSync(out, { recursive: true, force: true });

if (errors.length) console.error('page errors:\n' + errors.join('\n'));
console.log('markers:', JSON.stringify(counts));
console.log('label collisions:', JSON.stringify(collisions));
console.log('tooltip:', JSON.stringify(tip));
console.log('tab stops:', tabStops, '| keys:', seq.join(' '));
console.log('Enter selected:', selected, '| aria-label:', aria);
