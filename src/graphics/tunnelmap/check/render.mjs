// Rendered check for @graphics/tunnelmap.
// Usage (from the repo root):  node src/graphics/tunnelmap/check/render.mjs
// Bundles index.tsx with esbuild, renders each layer in headless Chromium (Playwright)
// at 1400x860 and writes PNG snapshots beside this file. Dev-only; not imported by the app.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');

const entry = `
import { render } from 'preact';
import { TunnelMap } from '../index.tsx';
const q = new URLSearchParams(location.hash.slice(1));
const W = Number(q.get('w') || 1400), H = Number(q.get('h') || 860);
render(
  <TunnelMap width={W} height={H} layer={q.get('layer') || 'engineering'} highlight={q.get('hl')}
    onSelect={(id) => { document.body.dataset.selected = String(id); }} />,
  document.getElementById('app'),
);
`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: here, loader: 'tsx' },
  bundle: true,
  write: false,
  outdir: 'out',
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: {
    '@canon': join(root, 'content/canon/canon.json'),
    '@core': join(root, 'src/core'),
  },
  logLevel: 'warning',
});
const js = bundle.outputFiles.find((f) => f.path.endsWith('.js')).text;
const css = bundle.outputFiles.find((f) => f.path.endsWith('.css')).text;
const tokens = await readFile(join(root, 'src/design/tokens.css'), 'utf8');

const face = async (pkg, family, weight) => {
  const file = join(root, `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff2`);
  const b64 = (await readFile(file)).toString('base64');
  return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
};
const fonts = (
  await Promise.all([
    face('ibm-plex-sans', 'IBM Plex Sans', 400),
    face('ibm-plex-sans', 'IBM Plex Sans', 600),
    face('ibm-plex-mono', 'IBM Plex Mono', 400),
    face('ibm-plex-mono', 'IBM Plex Mono', 600),
  ])
).join('\n');

const html = `<!doctype html><meta charset="utf-8"><style>${fonts}\n${tokens}\nhtml,body{margin:0}\n${css}</style><div id="app"></div><script>${js.split('</scr' + 'ipt').join('<\\/script')}</script>`;

const browser = await chromium.launch();
async function shot(name, hash, w, h, act) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('about:blank#' + hash);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  if (act) await act(page);
  await page.screenshot({ path: join(here, name + '.png') });
  if (errors.length) console.log(name, 'ERRORS', errors);
  await page.close();
}
const hoverLink = (id) => async (page) => {
  const box = await page.locator(`[data-hit="${id}"]`).evaluate((el) => {
    const p = el.getPointAtLength(el.getTotalLength() * 0.5);
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(box.x, box.y);
  await page.waitForSelector('.tm-tip');
};
await shot('engineering', 'layer=engineering', 1400, 860);
await shot('certified', 'layer=certified', 1400, 860);
await shot('both', 'layer=both', 1400, 860);
await shot('engineering-hover-segment-04', 'layer=engineering', 1400, 860, hoverLink('RAIL-04'));
await shot('both-hover-certified', 'layer=both', 1400, 860, hoverLink('TRAM-BETA-10:GAMMA-07'));
await shot('certified-hover', 'layer=certified', 1400, 860, hoverLink('TRAM-ALPHA-05:GAMMA-09'));
await shot('engineering-highlight-alpha-05', 'layer=engineering&hl=ALPHA-05', 1400, 860);
await shot('both-small-900x560', 'layer=both&w=900&h=560', 900, 560);
await browser.close();
console.log('wrote', here);
