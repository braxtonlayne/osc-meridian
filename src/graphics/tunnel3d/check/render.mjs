// Rendered check for @graphics/tunnel3d: screenshots at 1200x760 into this folder.
// Usage (from the repo root): node src/graphics/tunnel3d/check/render.mjs [--size]
//   --size  also runs a throwaway production build of the preview page and prints chunk sizes.
// Dev-only. Chromium falls back to SwiftShader where there is no GPU.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { build, createServer } from 'vite';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const configFile = path.join(root, 'vite.config.ts');

const server = await createServer({ root, configFile, logLevel: 'error', server: { port: 5397, strictPort: false, open: false } });
await server.listen();
const addr = server.httpServer?.address();
const port = typeof addr === 'object' && addr ? addr.port : 5397;
const base = `${'http'}://localhost:${port}/src/graphics/tunnel3d/preview.html`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const shot = async (name) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(here, `${name}.png`) });
  };
  const open = async (query) => {
    await page.goto(`${base}?static=1${query}`);
    await page.waitForSelector('.t3d__canvas', { timeout: 30000 });
    await page.waitForTimeout(600);
  };

  await open('');
  await shot('01-oblique');

  await page.getByRole('button', { name: 'Plan' }).click();
  await shot('02-plan');

  await page.getByRole('button', { name: 'Section' }).click();
  await shot('03-section');

  // Keyboard: focus the canvas, restore the view, rotate, step the selection to segment 04.
  await page.locator('.t3d__canvas').focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 4; i++) await page.keyboard.press('PageDown');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
  await shot('04-keyboard-segment-04-selected');

  // Pointer: click the ALPHA-03 shaft collar label position, then magnify.
  await page.keyboard.press('Home');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const box = await page.locator('.t3d__label--site', { hasText: 'ALPHA-03' }).boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height + 8);
  for (let i = 0; i < 5; i++) await page.keyboard.press('+');
  await shot('05-click-site-magnified');
  const picked = await page.evaluate(() => document.body.dataset.selected);
  console.log('pointer selection:', picked);

  await open('&projection=perspective');
  await shot('06-perspective');

  // Frame pacing with trains moving (headless software rendering understates a real GPU).
  await page.goto(base);
  await page.waitForSelector('.t3d__canvas');
  await page.waitForTimeout(800);
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else resolve(Math.round((n * 1000) / (performance.now() - t0)));
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log('rAF rate with trains moving:', fps, 'fps (software GL)');
} finally {
  await browser.close();
  await server.close();
}

if (process.argv.includes('--size')) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), 't3d-size-'));
  await build({
    root,
    configFile,
    logLevel: 'error',
    build: { outDir, emptyOutDir: true, rollupOptions: { input: path.join(here, '..', 'preview.html') } },
  });
  const dir = path.join(outDir, 'assets');
  for (const f of (await readdir(dir)).filter((n) => n.endsWith('.js')).sort()) {
    const buf = await readFile(path.join(dir, f));
    console.log(`${f.padEnd(34)} ${(buf.length / 1024).toFixed(1).padStart(8)} kB   gzip ${(gzipSync(buf).length / 1024).toFixed(1).padStart(7)} kB`);
  }
  await rm(outDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('tunnel3d check images written to', here);
}
