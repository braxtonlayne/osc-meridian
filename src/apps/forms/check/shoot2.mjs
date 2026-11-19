// Second pass: handheld width, F-109 options, F-142 EYES ONLY refusal, draft save, keyboard submit.
//   node src/apps/forms/check/shoot2.mjs   (dev server on 5209)
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5209'].join('/');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const errors = [];

async function session(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return page;
}
async function login(page, path) {
  await page.goto(BASE + path);
  await wait(400);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lock-signin input', { timeout: 20000 });
  const inputs = page.locator('.lock-signin input');
  await inputs.nth(0).fill('OPR-A03-1147');
  await inputs.nth(1).fill('ballast pewter orchard ninety');
  await page.locator('.lock-signin button[type=submit]').click();
  await wait(3000);
}
const open = (page, r) => page.evaluate((r) => import('/src/core/services.ts').then((m) => m.services.openRoute(r)), r);

// Desktop: F-109 options, F-142 refusal, draft save, Ctrl+Enter
const page = await session(1400, 900);
await login(page, '/forms/f-109');
const fx = () => page.locator('.fx-root').last();
const field = (n) => fx().locator(`[id$="-${n}"]`).first();
console.log('F-109 destinations:', (await field('destination').locator('option').allTextContents()).join(' | '));
await field('route').fill('SEG 04');
await field('route').focus();
await field('travelDate').fill('28 may 2008');
await field('travelDate').blur();
await field('route').focus();
await page.keyboard.press('Control+s');
await wait(300);
await page.screenshot({ path: join(here, '18-f109-draft-saved.png') });

await page.goto(BASE + '/forms/f-142');
await wait(400);
await page.keyboard.press('Escape');
await page.waitForSelector('.lock-signin input', { timeout: 20000 });
await page.locator('.lock-signin input').nth(0).fill('OPR-A03-1147');
await page.locator('.lock-signin input').nth(1).fill('x');
await page.locator('.lock-signin button[type=submit]').click();
await wait(3000);
await field('document').fill('OSC-2008-Q2');
await field('pages').fill('All');
await field('copies').fill('1');
await fx().getByLabel('Paper copy from the print release device').check();
await field('purpose').fill('Working copy for accession review.');
await field('recipients').fill('P-3-06-1147');
await field('undertaking').check().catch(() => fx().getByLabel(/Copies will be numbered/).check());
await fx().getByRole('button', { name: /Apply signature/ }).click();
await field('purpose').focus();
await page.keyboard.press('Control+Enter');
await wait(400);
await page.keyboard.press('Enter');
await wait(1800);
await page.screenshot({ path: join(here, '19-f142-refused.png') });
const sub = await page.evaluate(async () => {
  const m = await import('/src/core/services.ts');
  return m.services.audit.entries.value.filter((e) => e.kind === 'form.submit').map((e) => [e.subject, e.detail, e.data?.document]);
});
console.log(JSON.stringify(sub));
await page.close();

// Handheld
const small = await session(760, 900);
await login(small, '/forms/f-104');
await small.screenshot({ path: join(small === null ? '' : here, '20-handheld-f104.png') });
await small.locator('.fx-root').last().locator('.fx-scroll').evaluate((el) => (el.scrollTop = 700));
await wait(200);
await small.screenshot({ path: join(here, '21-handheld-f104-lower.png') });
await open(small, '/forms');
await wait(1500);
await small.screenshot({ path: join(here, '22-handheld-catalogue.png') });

console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
