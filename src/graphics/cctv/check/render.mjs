// Renders the @graphics/cctv preview gallery to check/gallery.png. Run with the dev server up:
//   npx vite --port 5304 --strictPort
//   node src/graphics/cctv/check/render.mjs [port]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const port = process.argv[2] ?? '5304';
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1460, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1' && u.protocol.startsWith('http')) errors.push(`cross-origin request ${r.url()}`);
});
await page.goto(`http://localhost:${port}/src/graphics/cctv/preview.html`);
await page.waitForTimeout(1500);
await page.screenshot({ path: join(here, 'gallery.png'), fullPage: true });
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('wrote', join(here, 'gallery.png'));
