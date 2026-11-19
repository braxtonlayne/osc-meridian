// Plant-state check: a seal drill drives musters; network isolation blanks remote boards.
// Usage (repo root, dev server on 5311): node src/apps/muster/check/plant.mjs
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = `http://localhost:${5311}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: join(here, `plant-${n}.png`) });

await page.goto(BASE + '/muster');
await page.evaluate(() => {
  const now = Date.now();
  const sites = {};
  const ack = { 'ALPHA-01': 0, 'ALPHA-02': 2, 'ALPHA-03': 2, 'ALPHA-05': 2, 'BETA-03': 6, 'GAMMA-08': 8 };
  for (const [s, m] of Object.entries(ack)) {
    const at = now - 40000 + m * 2000;
    sites[s] = { ordered: at - 2000, acknowledged: at, sealed: null, status: 'acknowledged' };
  }
  const drill = { id: 'SD-08-0519-01', orderedAt: now - 42000, by: 'deputy', phase: 'propagating', sites, endedAt: null };
  localStorage.setItem('meridian:shared:drill', JSON.stringify(drill));
  localStorage.removeItem('meridian:shared:muster');
  localStorage.removeItem('meridian:shared:isolation');
});
await page.reload();
for (let attempt = 0; attempt < 3; attempt++) {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click('.lock-cardopt[data-account="analyst"]');
  await wait(800);
  await page.fill('#lock-op', 'OPR-A03-1147');
  await page.fill('#lock-pass', 'ballast pewter orchard ninety');
  await page.press('#lock-pass', 'Enter');
  await wait(3000);
  if (await page.locator('.mus-app').count()) break;
}
await page.waitForSelector('.mus-app', { timeout: 60000 });
await page.locator('.win-title').last().dblclick().catch(() => undefined);
await wait(1500);
await shot('drill-network');
await page.locator('.mus-pick select').first().selectOption('ALPHA-03');
await wait(800);
await shot('drill-a03');
// Isolation: remote boards go dark.
await page.evaluate(() => {
  const iso = { level: 1, initiations: [{ at: '2008-05-19T20:00:00Z', by: 'analyst', ref: 'NI-08-0519-01' }], active: true, clearsAt: null };
  localStorage.setItem('meridian:shared:isolation', JSON.stringify(iso));
});
await page.reload();
for (let attempt = 0; attempt < 3; attempt++) {
  if (await page.locator('.mus-app').count()) break;
  if (await page.locator('.lock-cardopt').count()) {
    await page.fill('#lock-op', 'OPR-A03-1147');
    await page.fill('#lock-pass', 'ballast pewter orchard ninety');
    await page.press('#lock-pass', 'Enter');
  }
  await wait(3000);
}
await page.waitForSelector('.mus-app', { timeout: 60000 });
await wait(1200);
await shot('isolated-network');
const rows = await page.locator('.mus-app tbody tr').allInnerTexts();
console.log(JSON.stringify({ errors, a02: rows.find((r) => r.startsWith('ALPHA-02')), a03: rows.find((r) => r.startsWith('ALPHA-03')) }, null, 1));
await browser.close();
