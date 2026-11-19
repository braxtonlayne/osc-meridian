// Rendered check for @graphics/reactor.
// Usage (from the repository root):  node src/graphics/reactor/check/render.mjs
// Bundles preview.tsx with esbuild into a temp directory, opens it in headless
// Chromium via Playwright and writes PNGs next to this file.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const out = mkdtempSync(join(tmpdir(), 'meridian-reactor-'));

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

// Stand-in window frame only; every colour below is a token from src/design/tokens.css.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>reactor check</title>
<link rel="stylesheet" href="preview.css">
<style>
body{margin:0;background:var(--ws-bg);font:12px/16px var(--font-ui);color:var(--text-1)}
.ck-sheet{display:flex;flex-direction:column;gap:24px;padding:0;width:1400px}
.ck-contact{box-sizing:border-box;width:1400px;height:900px;padding:8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:6px;background:var(--ws-bg)}
.ck-cell{display:flex;flex-direction:column;min-height:0;min-width:0;background:var(--surface);border:1px solid var(--chrome-outer)}
.ck-celltitle{flex:none;height:16px;padding:0 6px;background:var(--title-active-bg);color:var(--title-active-fg);font:600 10px/16px var(--font-mono)}
.ck-fit{flex:1;min-height:0;overflow:hidden;display:flex;justify-content:center}
.ck-fit .rx-svg{min-width:0;width:100%;height:100%}
.ck-full{width:1160px;background:var(--surface)}
.ck-win{box-sizing:border-box;display:flex;flex-direction:column;background:var(--chrome-face);border:1px solid var(--chrome-outer);
  box-shadow:inset 1px 1px 0 var(--chrome-hi),inset -1px -1px 0 var(--chrome-shadow);padding:3px}
.ck-title{display:flex;justify-content:space-between;align-items:center;height:20px;padding:0 3px 0 6px;background:var(--title-active-bg);color:var(--title-active-fg);font-weight:600}
.ck-title__btns{display:flex;gap:2px}
.ck-title__btns i{display:block;width:16px;height:14px;background:var(--chrome-face);color:var(--text-1);font:normal 10px/12px var(--font-ui);text-align:center;
  box-shadow:inset 1px 1px 0 var(--chrome-hi),inset -1px -1px 0 var(--chrome-shadow)}
.ck-content{flex:1;min-height:0;margin-top:2px;border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow);overflow:hidden;background:var(--chrome-face)}
.ck-status{margin-top:2px;padding:1px 6px;border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow);color:var(--text-2);font:10px/14px var(--font-mono)}
.ck-panel{display:flex;gap:8px;height:100%;box-sizing:border-box;padding:8px}
.ck-col{display:flex;flex-direction:column;gap:8px;flex:none}
.ck-col--wide{flex:1;min-width:0;background:var(--surface);border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow)}
.ck-group{margin:0;padding:4px 8px 8px;border:1px solid var(--chrome-shadow);box-shadow:1px 1px 0 var(--chrome-hi)}
.ck-group legend{padding:0 4px}
.ck-gauges{display:flex;gap:6px;align-items:flex-start}
.ck-seals{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
.ck-th{display:grid;grid-template-columns:58px minmax(120px,1fr) 72px 44px 96px;column-gap:6px;padding:0 6px;height:20px;align-items:center;background:var(--th-bg);border-bottom:1px solid var(--chrome-shadow)}
.ck-charts{display:flex;flex-direction:column;gap:0;min-height:0}
.ck-chart{border-top:1px solid var(--chrome-shadow)}
.ck-cap{padding:1px 6px;background:var(--th-bg);font:600 10px/14px var(--font-mono);border-bottom:1px solid var(--row-rule)}
</style></head><body><div id="root"></div><script src="preview.js"></script></body></html>`;
writeFileSync(join(out, 'index.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(out, 'index.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForSelector('#gauges canvas', { timeout: 5000 }).catch(() => undefined);
await page.waitForTimeout(200);

const ids = await page.$$eval('.ck-sheet > [id]', (els) => els.map((el) => el.id));
for (const id of ids) await page.locator(`#${id}`).screenshot({ path: join(here, `${id}.png`) });

// Text must stay inside the sheet border on every full-size drawing.
const spill = await page.$$eval('.ck-full svg', (svgs) =>
  svgs.flatMap((svg) => {
    const box = svg.getBoundingClientRect();
    return [...svg.querySelectorAll('text')]
      .filter((t) => {
        const r = t.getBoundingClientRect();
        return r.left < box.left + 4 || r.right > box.right - 4 || r.bottom > box.bottom - 2;
      })
      .map((t) => `${svg.closest('[id]')?.id}: ${t.textContent}`);
  }),
);
const states = await page.$$eval('.ck-full svg', (svgs) => svgs.map((s) => s.getAttribute('aria-label')));

await browser.close();
rmSync(out, { recursive: true, force: true });
console.log(`wrote ${ids.length} PNG: ${ids.join(' ')}`);
console.log(`text outside sheet: ${spill.join(' | ') || 'none'}`);
console.log(states.join('\n'));
if (errors.length) {
  console.error('page errors:\n' + errors.join('\n'));
  process.exit(1);
}
