// Rendered check for @graphics/states.
// Usage (from the repository root):  node src/graphics/states/check/render.mjs
// Bundles preview.tsx with esbuild into a temp directory, opens it in headless
// Chromium via Playwright, and writes one PNG per state next to this file.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'meridian-states-'));

await build({
  entryPoints: [join(here, 'preview.tsx')],
  bundle: true,
  outdir: out,
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.woff2': 'dataurl', '.woff': 'dataurl' },
  logLevel: 'warning',
});

// Stand-in token values (docs/SPEC.md section 4) and a plain window frame.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>states check</title>
<link rel="stylesheet" href="preview.css">
<style>
:root{
  --chrome-face:#D6D3CB;--chrome-hi:#F4F2EC;--chrome-shadow:#8C8A84;--chrome-outer:#5B5A56;
  --surface:#FFFFFF;--paper:#F3F1EA;--text-1:#15181C;--text-2:#4B5158;--text-3:#7A8088;
  --font-ui:"IBM Plex Sans",sans-serif;--font-mono:"IBM Plex Mono",monospace;
  --redact:#111111;--st-fault:#9B1C1C;--st-offline:#5B5A56;
}
body{margin:0;background:#3A4652;font:12px/16px var(--font-ui);color:var(--text-1)}
.ck-sheet{display:flex;flex-wrap:wrap;gap:24px;padding:24px;width:1400px}
.ck-win{display:flex;flex-direction:column;background:var(--chrome-face);border:1px solid var(--chrome-outer);
  box-shadow:inset 1px 1px 0 var(--chrome-hi),inset -1px -1px 0 var(--chrome-shadow);padding:3px}
.ck-title{display:flex;justify-content:space-between;align-items:center;height:20px;padding:0 3px 0 6px;background:#1F3552;color:#fff;font-weight:600}
.ck-title__btns{display:flex;gap:2px}
.ck-title__btns i{display:block;width:16px;height:14px;background:var(--chrome-face);color:var(--text-1);font:normal 10px/12px var(--font-ui);text-align:center;
  box-shadow:inset 1px 1px 0 var(--chrome-hi),inset -1px -1px 0 var(--chrome-shadow)}
.ck-menu{display:flex;gap:12px;padding:2px 6px;border-bottom:1px solid var(--chrome-shadow)}
.ck-content{flex:1;min-height:0;margin-top:2px;border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow);overflow:hidden;background:var(--surface)}
.ck-status{margin-top:2px;padding:1px 6px;border:1px solid;border-color:var(--chrome-shadow) var(--chrome-hi) var(--chrome-hi) var(--chrome-shadow);color:var(--text-2)}
.ck-list table{width:100%;border-collapse:collapse}
.ck-list th{background:#E4E1D8;text-align:left;font-weight:400;padding:2px 8px;border-right:1px solid #C9C6BC;border-bottom:1px solid var(--chrome-shadow)}
.ck-list td{padding:3px 8px;border-bottom:1px solid #C9C6BC}.ck-list td:first-child{white-space:nowrap}
.ck-doc{height:100%;overflow:auto;padding:22px 44px;background:var(--paper);font:14px/21px "Source Serif 4",serif}
.ck-doc p{margin:0 0 10px}
.ck-doc__tbl{border-collapse:collapse;margin-top:12px;width:70%}
.ck-doc__tbl th,.ck-doc__tbl td{border:1px solid var(--chrome-shadow);padding:2px 8px;text-align:left;font-weight:400}
.ck-doc__tbl th{width:120px}
.ck-glyphs{display:flex;gap:18px;padding:16px;background:var(--chrome-face)}
.ck-glyph{display:flex;flex-direction:column;align-items:center;gap:8px}
</style></head><body><div id="root"></div><script src="preview.js"></script></body></html>`;
writeFileSync(join(out, 'index.html'), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1460, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(out, 'index.html')).href);
await page.evaluate(() => document.fonts.ready);

await page.waitForSelector('.ck-sheet', { timeout: 5000 }).catch(() => undefined);
if (errors.length) console.error('page errors:\n' + errors.join('\n'));
const ids = await page.$$eval('.ck-sheet > [id]', (els) => els.map((el) => el.id));
for (const id of ids) {
  await page.locator(`#${id}`).screenshot({ path: join(here, `${id}.png`) });
}

// Behaviour: the Details disclosure opens, and renders are deterministic.
const before = await page.locator('#error .st-trace').count();
await page.locator('#error .st-btn', { hasText: 'Details' }).click();
const after = await page.locator('#error .st-trace').count();
const bars = await page.$$eval('#withheld .st-withheld__line', (ls) => ls.map((l) => l.children.length).join(','));
const overflow = await page.$$eval('.ck-content', (els) =>
  els.filter((el) => (el.firstElementChild?.scrollHeight ?? 0) > el.clientHeight + 1).map((el) => el.parentElement?.id),
);

await browser.close();
rmSync(out, { recursive: true, force: true });

console.log(`wrote ${ids.length} PNG: ${ids.join(' ')}`);
console.log(`details disclosure: ${before} -> ${after}`);
console.log(`withheld bars per line: ${bars}`);
console.log(`frames whose content scrolls: ${overflow.join(' ') || 'none'}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
