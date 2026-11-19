// Rendered check for @graphics/depth3d.
// Usage (from the repo root):  node src/graphics/depth3d/check/render.mjs
// Bundles check/harness.tsx with esbuild (ESM, code-split, minified) into a temp folder,
// serves it on 127.0.0.1, screenshots it with Playwright Chromium (WebGL through
// SwiftShader) and writes PNGs next to this file. Also prints the size of the lazy chunk.
// Nothing is fetched from the network.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../../..');
const out = join(tmpdir(), 'meridian-depth3d-check');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: { harness: join(here, 'harness.tsx') },
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  metafile: true,
  outdir: out,
  chunkNames: 'chunk-[name]-[hash]',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: {
    '@canon': join(repo, 'content/canon/canon.json'),
    '@core': join(repo, 'src/core'),
  },
  loader: { '.woff': 'file', '.woff2': 'file' },
  absWorkingDir: repo,
  logLevel: 'warning',
});

// ---- lazy chunk report: the output that contains three ----
for (const [file, meta] of Object.entries(result.metafile.outputs)) {
  if (!file.endsWith('.js')) continue;
  const inputs = Object.keys(meta.inputs);
  const hasThree = inputs.some((i) => i.includes('node_modules/three/'));
  const hasCanon = inputs.some((i) => i.endsWith('canon.json'));
  const bytes = readFileSync(join(repo, file));
  const kind = hasThree ? 'LAZY (three + scene.ts)' : hasCanon ? 'eager (viewer frame, 2D elevation, harness; includes canon.json in this check build)' : 'shared';
  console.log(`${file.split(/[\\/]/).pop()}  ${(bytes.length / 1024).toFixed(1)} kB  gzip ${(gzipSync(bytes).length / 1024).toFixed(1)} kB  ${kind}`);
  if (hasCanon) {
    const own = inputs.filter((i) => i.includes('graphics/depth3d/') && !i.includes('/check/'));
    const ownBytes = own.reduce((n, i) => n + meta.inputs[i].bytesInOutput, 0);
    console.log(`  of which @graphics/depth3d eager code: ${(ownBytes / 1024).toFixed(1)} kB minified`);
  }
}

const tokens = readFileSync(join(repo, 'src/design/tokens.css'), 'utf8');
const css = existsSync(join(out, 'harness.css')) ? '<link rel="stylesheet" href="./harness.css" />' : '';
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>depth3d check</title>
<style>${tokens}</style>${css}
<style>html,body{margin:0;height:100%;background:var(--ws-bg)}#app{width:100vw;height:100vh}</style>
</head><body><div id="app"></div><script type="module" src="./harness.js"></script></body></html>`,
);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = normalize(join(out, decodeURIComponent(String(req.url).split('?')[0])));
  const file = path.endsWith('\\') || path.endsWith('/') ? join(path, 'index.html') : path;
  if (!file.startsWith(out) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
// Loopback only: the check serves its own temp folder to headless Chromium.
// eslint-disable-next-line no-restricted-syntax
const ORIGIN = 'http://127.0.0.1';
const base = `${ORIGIN}:${server.address().port}/index.html`;

const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150)))));
};

const shots = [
  { name: 'alpha-01.png', q: 'site=ALPHA-01', is3d: true },
  { name: 'alpha-03.png', q: 'site=ALPHA-03', is3d: true },
  { name: 'alpha-01-lower-selected.png', q: 'site=ALPHA-01', is3d: true, act: async (p) => {
    await p.getByRole('button', { name: 'Lower levels' }).click();
    await p.getByRole('option', { name: /^Level 6,/ }).click();
  } },
  { name: "alpha-02-perspective-tier2.png", q: "site=ALPHA-02&tier=2", is3d: true, act: async (p) => {
    await p.getByRole('button', { name: 'Perspective' }).click();
    await p.locator('.d3v-view').focus();
    for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowDown');
  } },
  { name: 'fallback-2d-alpha-01.png', q: 'site=ALPHA-01&mode=2d' },
  { name: 'fallback-2d-alpha-03.png', q: 'site=ALPHA-03&mode=2d', act: async (p) => {
    await p.getByRole('option', { name: /^Level 12,/ }).click();
  } },
];

const DETAIL = { name: 'detail-index-2x.png', q: 'site=ALPHA-01' };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = false;
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error(`[page ${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => {
    failed = true;
    console.error('[pageerror]', e.message);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) console.error('[network]', r.url());
  });
  await page.goto(`${base}?${s.q}`);
  if (s.is3d) {
    await page.waitForSelector('.d3v-canvas', { timeout: 15000 });
  } else {
    await page.waitForSelector('.d3v2');
  }
  await settle(page);
  if (s.act) {
    await s.act(page);
    await settle(page);
  }
  const mode = await page.locator('.d3v-st-mode').textContent();
  const picks = await page.evaluate(() => window.picks);
  await page.screenshot({ path: join(here, s.name) });
  console.log('wrote', s.name, `[${mode}]`, picks.length ? `onSelectLevel: ${picks.join(',')}` : '');
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
  await page.goto(`${base}?${DETAIL.q}`);
  await page.waitForSelector('.d3v-canvas');
  await settle(page);
  await page.screenshot({ path: join(here, DETAIL.name), clip: { x: 0, y: 380, width: 720, height: 300 } });
  console.log('wrote', DETAIL.name);
  await page.close();
}
// dispose check: mount, dispose, confirm the element is empty again
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(`${base}?site=ALPHA-02`);
  await page.waitForSelector('.d3v-canvas');
  await settle(page);
  const left = await page.evaluate(() => {
    window.viewer.dispose();
    return document.getElementById('app').childElementCount;
  });
  console.log('dispose: children left in host =', left);
  if (left !== 0) failed = true;
  await page.close();
}
// the Preact wrapper mounts and goes live
{
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(`${base}?site=ALPHA-05&mode=wrapper`);
  await page.waitForSelector('.d3v-wrap.is-live .d3v-canvas');
  console.log('wrapper: live');
  await page.close();
}
await browser.close();
server.close();
if (failed) process.exit(1);
