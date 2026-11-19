// Rendered check for @graphics/seal.
// Usage (from the repo root):  node src/graphics/seal/render-check.mjs
// Bundles index.tsx with esbuild, renders it with Preact in headless Chromium
// (Playwright) and writes PNG snapshots to src/graphics/seal/check/.
// Dev-only: not imported by the application.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = join(here, 'check');
await mkdir(out, { recursive: true });

const entry = `
import { render } from 'preact';
import { Seal, DivisionMark } from './index.tsx';
const SIZES = [512, 64, 32, 16];
const DIVS = ['RD', 'OIA', 'TO', 'FE', 'PV'];
function Cell({ id, bg, children }) {
  return <div id={id} class={'cell ' + bg}>{children}</div>;
}
function Sheet() {
  return (
    <div>
      {['full', 'mono', 'tiny'].map((v) => (
        <div class="row">
          {SIZES.map((s) => (
            <Cell id={'seal-' + v + '-' + s} bg={v === 'mono' ? 'paper' : v === 'tiny' ? 'face' : 'white'}>
              <Seal size={s} variant={v} title="Seal of the Office of Strategic Continuity" />
            </Cell>
          ))}
        </div>
      ))}
      <div class="row">
        <Cell id="seal-watermark" bg="workspace">
          <span class="wm"><Seal size={360} variant="mono" /></span>
        </Cell>
        <Cell id="seal-full-256-fallback-font" bg="white">
          <span class="nofont"><Seal size={256} variant="full" /></span>
        </Cell>
      </div>
      {[64, 32, 24].map((s) => (
        <div class="row" id={'marks-' + s}>
          {DIVS.map((d) => (
            <Cell id={'mark-' + d + '-' + s} bg="face"><DivisionMark division={d} size={s} /></Cell>
          ))}
        </div>
      ))}
      <div class="row" id="marks-192">
        {DIVS.map((d) => (
          <Cell id={'mark-' + d + '-192'} bg="white"><DivisionMark division={d} size={192} /></Cell>
        ))}
      </div>
    </div>
  );
}
render(<Sheet />, document.getElementById('app'));
`;

const bundle = await build({
  stdin: { contents: entry, resolveDir: here, loader: 'tsx' },
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  logLevel: 'warning',
});
const js = bundle.outputFiles[0].text;

const fontFace = async (weight) => {
  const file = join(root, `node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff2`);
  const b64 = (await readFile(file)).toString('base64');
  return `@font-face{font-family:"IBM Plex Sans";font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
};

// Token values copied from docs/SPEC.md section 4 for the check page only.
const html = `<!doctype html><meta charset="utf-8"><style>
${await fontFace(700)}
:root{--title-active-bg:#1F3552;--paper:#F3F1EA;--font-ui:"IBM Plex Sans";--text-primary:#15181C;}
body{margin:0;padding:16px;background:#FFFFFF;font:12px/16px "IBM Plex Sans",Arial,sans-serif;width:2400px}
.row{display:flex;width:max-content;align-items:flex-start;gap:12px;margin-bottom:12px}
.cell{padding:8px;line-height:0}
.white{background:#FFFFFF}.paper{background:#F3F1EA;color:#15181C}.face{background:#D6D3CB}
.workspace{background:#3A4652;color:#FFFFFF;padding:40px 120px}
.wm{display:inline-block;opacity:.04}
.nofont{--font-ui:initial;display:inline-block}
</style><div id="app"></div><script>${js.replace(/<\/script/g, '<\\/script')}</script>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const ids = await page.$$eval('.cell', (els) => els.map((e) => e.id));
for (const id of ids) {
  if (/^mark-/.test(id)) continue; // marks are captured per row
  await page.locator('#' + id).screenshot({ path: join(out, id + '.png') });
}
for (const s of [192, 64, 32, 24]) {
  await page.locator('#marks-' + s).screenshot({ path: join(out, `marks-${s}.png`) });
}
// 16 px and 32 px versions enlarged 8x with nearest-neighbour, to inspect the pixels.
await page.addStyleTag({ content: '.zoom{zoom:8;image-rendering:pixelated}' });
for (const id of ['seal-tiny-16', 'seal-tiny-32']) {
  const png = await page.locator('#' + id).screenshot();
  await page.evaluate(([src, zid]) => {
    const img = new Image();
    img.id = zid;
    img.src = src;
    img.style.cssText = 'image-rendering:pixelated;display:block;margin:8px 0';
    img.onload = () => { img.width = img.naturalWidth * 8; };
    document.body.appendChild(img);
    return new Promise((r) => { img.onload = () => { img.width = img.naturalWidth * 8; r(null); }; });
  }, ['data:image/png;base64,' + png.toString('base64'), id + '-x8']);
  await page.locator('#' + id + '-x8').screenshot({ path: join(out, id + '-x8.png') });
}
await browser.close();
console.log('wrote', out);
