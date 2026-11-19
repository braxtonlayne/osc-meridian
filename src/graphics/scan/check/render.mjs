// Renders the scan kit preview to PNGs in this folder.
// Usage (from the repo root): node src/graphics/scan/check/render.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  logLevel: 'error',
  server: { port: 5391, strictPort: false, open: false },
});
await server.listen();
const addr = server.httpServer?.address();
const port = typeof addr === 'object' && addr ? addr.port : 5391;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 980, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${port}/src/graphics/scan/preview.html`);
  await page.waitForSelector('body[data-ready]');
  await page.waitForTimeout(250);
  for (const id of ['memo', 'pipeline', 'slip', 'alphabet']) {
    await page.locator(`#${id}`).screenshot({ path: path.join(here, `${id}.png`) });
  }
  // Close-up of the anomaly: the note beside "847".
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await page.locator('#memo [data-ink="circle"]').boundingBox();
  if (box) {
    await page.screenshot({
      path: path.join(here, 'memo-847-detail.png'),
      fullPage: true,
      clip: { x: Math.max(0, box.x - 150), y: Math.max(0, box.y - 70), width: 560, height: 190 },
    });
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('scan kit check images written to', here);
  }
} finally {
  await browser.close();
  await server.close();
}
