// Visual check for the Forms Center. Run with the dev server on 5209:
//   node src/apps/forms/check/shoot.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5209'].join('/');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name, el) => (el ? el.screenshot({ path: join(here, `${name}.png`) }) : page.screenshot({ path: join(here, `${name}.png`) }));
const fx = () => page.locator('.fx-root').last();
const field = (name) => fx().locator(`[id$="-${name}"]`).first();

async function login(path) {
  await page.goto(BASE + path);
  await wait(400);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lock-signin input', { timeout: 20000 });
  const inputs = page.locator('.lock-signin input');
  await inputs.nth(0).fill('OPR-A03-1147');
  await inputs.nth(1).fill('ballast pewter orchard ninety');
  await page.locator('.lock-signin button[type=submit]').click();
  await wait(2500);
}
const maximise = async () => {
  await page.locator('.win-title').last().dblclick().catch(() => {});
  await wait(400);
};
const svc = () => page.evaluate(async () => {
  const m = await import('/src/core/services.ts');
  return m.services.audit.entries.value.filter((e) => e.kind === 'form.submit').map((e) => ({ subject: e.subject, detail: e.detail, data: e.data }));
});
const submitAndConfirm = async () => {
  await fx().locator('.toolbar').getByText('Submit', { exact: true }).click();
  await wait(300);
  await page.locator('.dlg button', { hasText: 'Submit' }).first().click().catch(async () => page.keyboard.press('Enter'));
  await wait(1800);
};

// 1. Catalogue
await login('/forms');
await page.waitForSelector('.fx-root', { timeout: 20000 });
await maximise();
await wait(600);
await shot('01-catalogue');

// 2. Open F-114 from the catalogue
await fx().locator('[role=row]', { hasText: 'OSC-F-114' }).first().dblclick();
await wait(1800);
await shot('02-f114-blank');

// 3. Submit empty: rejected summary
await fx().locator('.toolbar').getByText('Submit', { exact: true }).click();
await wait(500);
await shot('03-f114-rejected');

// 4. Fill in
await field('date').fill('19may08');
await field('time').fill('1432');
await field('location').fill('Transit Control board, schematic view: SEG 04 BLK 04-07');
await fx().getByLabel('Observed on a MERIDIAN display').check();
await field('description').fill('Blocks on segment 04 shown occupied in sequence for about two minutes. No consist booked.');
await field('documents').fill('OSC-2008-Q2 copy 07');
await field('equipment').fill('R04-***');
await field('time').focus();
await fx().getByRole('button', { name: /Apply signature/ }).click();
await wait(300);
await fx().locator('.fx-scroll').evaluate((el) => (el.scrollTop = 600));
await wait(300);
await shot('04-f114-filled');
await fx().locator('.fx-scroll').evaluate((el) => (el.scrollTop = 99999));
await wait(300);
await shot('05-f114-signed');

// 5. Submit with confirmation
await fx().locator('.toolbar').getByText('Submit', { exact: true }).click();
await wait(400);
await shot('06-f114-confirm');
await page.keyboard.press('Enter');
await wait(1800);
await shot('07-f114-receipt');
await fx().locator('.fx-scroll').evaluate((el) => (el.scrollTop = 99999));
await wait(200);
await shot('08-f114-receipt-entries');

// 6. Instructions tab
await fx().getByRole('tab', { name: 'Instructions' }).click();
await wait(800);
await shot('09-f114-instructions');

// 7. F-122 refusal (probationer, no receipt)
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.openRoute('/forms/f-122')));
await wait(1800);
await field('requestedSite').selectOption('ALPHA-01');
await field('earliestDate').fill('30 MAY 2008');
await field('reasonCategory').selectOption({ index: 1 });
await field('reason').fill('Joint posting.');
await field('briefingUnderstood').check().catch(() => fx().getByLabel(/I understand that a transfer/).check());
await fx().getByRole('button', { name: /Apply signature/ }).click();
await field('currentPost').fill('RD Accessions & Review');
await submitAndConfirm();
await shot('10-f122-returned');

// 8. F-109: SEXTANT destinations hidden; segment 04 routing returned
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.openRoute('/forms/f-109')));
await wait(1800);
const dests = await field('destination').locator('option').allTextContents();
console.log('F-109 destinations:', dests.join(' | '));
await shot('11-f109');

// 9. F-131 with the receipt history (flag queryRead)
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.session.setFlag('queryRead')));
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.openRoute('/forms/f-131')));
await wait(1800);
await shot('12-f131-history');
await field('declarantPn').fill('P-3-06-1147');
await field('personsDeclared').fill('790');
await field('effectiveDate').fill('31 MAY 2008');
await field('lastPosting').fill('Not stated');
await fx().getByRole('button', { name: /Apply signature/ }).click();
await submitAndConfirm();
await shot('13-f131-receipt');

// 10. F-126 KESTREL request
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.openRoute('/forms/f-126')));
await wait(1800);
await field('post').fill('RD Accessions & Review, ALPHA-03');
await field('compartment').selectOption('KESTREL');
await fx().getByLabel('For the duration of the present post').check();
await field('sponsorPn').fill('P-3-05-0288');
await field('sponsorPn').blur();
await field('sponsorConsulted').check().catch(() => fx().getByLabel(/sponsor has agreed/).check());
await field('justification').fill('Mileage query OSC-MEM-07-0944 refers to OSC-TRN-ENG.');
await field('undertaking').check().catch(() => fx().getByLabel(/I will not disclose/).check());
await fx().getByRole('button', { name: /Apply signature/ }).click();
await wait(200);
await shot('14-f126-filled');
await submitAndConfirm();
await shot('15-f126-receipt');

// 11. Receipts list in the catalogue
await page.evaluate(() => import('/src/core/services.ts').then((m) => m.services.openRoute('/forms')));
await wait(1500);
await fx().getByRole('tab', { name: /Receipts/ }).click();
await wait(300);
await fx().locator('[role=row]').nth(1).click();
await wait(400);
await shot('16-receipts');

const submits = await svc();
console.log(JSON.stringify(submits, null, 1));

// 12. Handheld width
const small = await ctx.newPage();
await small.setViewportSize({ width: 760, height: 900 });
page.close();
await small.goto(BASE + '/forms/f-104');
await wait(4000);
await small.screenshot({ path: join(here, '17-handheld-f104.png') });

console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
