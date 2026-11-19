// Long check (about 11 minutes): seal the site with the scrubbers off and wait for the CO2 excursion
// notice. Needs the dev server on 5309. Usage: node src/apps/environ/check/excursion.mjs
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
await page.clock.install();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// eslint-disable-next-line no-restricted-syntax -- the local dev server this check drives, not a runtime URL
await page.goto('http://localhost:5309/environ');
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:environ') || k.startsWith('meridian:shared:drill')) localStorage.removeItem(k);
});
await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
await page.click('.lock-cardopt[data-account="lifesupport"]');
await page.fill('#lock-op', 'OPR-G08-0611');
await page.fill('#lock-pass', 'damper cistern pallid forty');
await page.press('#lock-pass', 'Enter');
await page.waitForSelector('.env-app', { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const now = Date.now();
  const raw = JSON.stringify({ id: 'SD-08-0519-T', orderedAt: now, by: 'deputy', phase: 'sealed', sites: { 'GAMMA-08': { ordered: now, acknowledged: now, sealed: now + 8000, status: 'sealed' } }, endedAt: null });
  localStorage.setItem('meridian:shared:drill', raw);
  window.dispatchEvent(new StorageEvent('storage', { key: 'meridian:shared:drill', newValue: raw, storageArea: localStorage }));
});
// Fast-forward the page clock a minute at a time and log the site CO2 from the status bar.
let got = false;
for (let m = 1; m <= 14 && !got; m++) {
  await page.clock.runFor(60000);
  const t = await page.evaluate(() => document.body.innerText);
  const ex = await page.evaluate(() => JSON.parse(localStorage.getItem('meridian:shared:environ') ?? '{}').excursion);
  got = Boolean(ex?.reported);
  console.log(m, 'min', t.match(/CO2 \d+ ppm/)?.[0], JSON.stringify(ex), t.match(/Mail\s*\d+/)?.[0]);
}
await page.screenshot({ path: join(here, 'lifesupport-excursion.png') });
await page.locator('.env-app [role="toolbar"] button', { hasText: /^Zones$/ }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: join(here, 'lifesupport-excursion-trend.png') });
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
