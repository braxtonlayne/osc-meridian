// Visual check for the Directives library. Run with the dev server on 5208:
//   node src/apps/directives/check/shoot.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5208'].join('/');
const only = process.argv[2];
const shot = (page, name) => (!only || name.startsWith(only) ? page.screenshot({ path: join(here, `${name}.png`) }) : null);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function login(path) {
  await page.goto(BASE + path);
  await wait(400);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lock-signin input', { timeout: 15000 });
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

// 1. Deep link to a paragraph.
await login('/directives/dir-0233#para-6');
await page.waitForSelector('.dv', { timeout: 15000 });
await maximise();
await wait(1500);
await shot(page, '01-deeplink-para-6');
console.log('url after deep link:', page.url());

// 2. Library index
await page.locator('.dv .toolbar').getByText('Library', { exact: true }).click();
await wait(1500);
await shot(page, '02-index');

// Sort by OPR via header, then effective via menu
await page.locator('.dv [role=columnheader]', { hasText: 'OPR' }).click().catch(() => {});
await wait(300);
await shot(page, '03-index-sort-opr');
await page.locator('.dv .menubar__item', { hasText: 'View' }).click();
await wait(200);
await shot(page, '04-menu-view');
await page.getByRole('menuitemradio', { name: /effective date/i }).click();
await wait(300);

// Filter
await page.locator('#dv-find').fill('records');
await wait(300);
await page.locator('.dv [role=row]').nth(1).click();
await wait(300);
await shot(page, '05-index-filter-selected');
await page.locator('#dv-find').fill('');

// Supersession register
await page.locator('.dv [role=tab]', { hasText: 'Supersession' }).click();
await wait(400);
await page.locator('.dv [role=row]', { hasText: 'DIR-0412' }).first().click();
await wait(300);
await shot(page, '06-supersession-0412');
await page.locator('.dv [role=row]', { hasText: 'DIR-0107' }).first().click();
await wait(300);
await shot(page, '07-supersession-0107');

// Open DIR-0412 and acknowledge
await page.locator('.dv [role=row]', { hasText: 'DIR-0412' }).first().dblclick();
await wait(1500);
await shot(page, '08-reader-0412');
await page.locator('.dv .toolbar').getByText('Acknowledge', { exact: true }).click();
await wait(400);
await page.locator('.dv-ack').getByRole('button', { name: /Record acknowledgement/ }).click();
await wait(300);
await shot(page, '09-ack-rejected');
await page.locator('.dv-ack input[type=checkbox]').check();
await page.locator('.dv-ack').getByRole('button', { name: /Record acknowledgement/ }).click();
await wait(500);
await shot(page, '10-ack-recorded');

// Go to paragraph via Ctrl+G
await page.keyboard.press('Control+g');
await page.keyboard.type('4');
await page.keyboard.press('Enter');
await wait(300);
await shot(page, '11-goto-para-4');
console.log('url after goto:', page.url());
await page.locator('#dv-goto').fill('14');
await page.keyboard.press('Enter');
await wait(200);
await shot(page, '12-goto-rejected');

// Reader supersession tab
await page.locator('.dv [role=tab]', { hasText: 'Supersession' }).click();
await wait(300);
await shot(page, '13-reader-chain');

// Superseded issue not held: refusal
await page.locator('.dv .menubar__item', { hasText: 'Directive' }).click();
await wait(200);
await page.getByRole('menuitem', { name: /superseded issue/i }).click();
await wait(300);
await shot(page, '14-refusal-not-held');
await page.keyboard.press('Enter');

// Acknowledgements view
await page.locator('.dv .toolbar').getByText('Library', { exact: true }).click();
await wait(600);
await page.locator('.dv [role=tab]', { hasText: 'Acknowledgements' }).click();
await wait(300);
await shot(page, '15-acks');

// Hover a redaction (in a directive with withheld text)
await page.evaluate(() => history.pushState({}, '', '/'));
await page.locator('.dv [role=tab]', { hasText: 'Index' }).click();
await page.locator('.dv [role=row]', { hasText: 'DIR-0163' }).first().dblclick();
await wait(1500);
const bar = page.locator('.dv .doc-body .rx').first();
if (await bar.count()) {
  await bar.scrollIntoViewIfNeeded();
  await bar.hover();
  await wait(400);
}
await shot(page, '16-reader-0163-redaction');

// Print (intercept window.print)
await page.evaluate(() => {
  window.print = () => {
    window.__printed = (window.__printed ?? 0) + 1;
  };
});
await page.locator('.dv-doc').click({ position: { x: 20, y: 20 } });
await page.keyboard.press('Control+p');
await wait(1500);
console.log('printed:', await page.evaluate(() => window.__printed ?? 0));

// Audit
const audit = await page.evaluate(async () => {
  const m = await import('/src/core/audit.ts');
  return m.entries.value.map((e) => `${e.kind} | ${e.subject} | ${e.detail.slice(0, 110)}`);
});
console.log(audit.join('\n'));

// Handheld
await page.setViewportSize({ width: 420, height: 860 });
await wait(900);
await shot(page, '17-handheld-reader');
await page.locator('.dv .toolbar').getByText('Library', { exact: true }).click().catch(() => {});
await wait(900);
await shot(page, '18-handheld-index');

console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
