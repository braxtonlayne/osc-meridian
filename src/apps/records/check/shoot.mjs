// Visual check for the Records Library. Run with the dev server on 5203:
//   node src/apps/records/check/shoot.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5203'].join('/'); // local dev server only
const shot = (page, name) => page.screenshot({ path: join(here, `${name}.png`) });
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

await login('/records');
await page.waitForSelector('.rec', { timeout: 15000 });
// Maximise the records window for clarity.
await page
  .locator('.rec')
  .first()
  .click({ position: { x: 5, y: 60 } })
  .catch(() => {});
await wait(600);
await shot(page, '01-library');

// Select a row to show the detail pane.
await page
  .locator('.rec [role=grid] [role=row]')
  .nth(2)
  .click()
  .catch(() => {});
await wait(300);
await shot(page, '02-library-selected');

// Search for the accession reference.
await page.locator('.rec .toolbar').getByText('Search', { exact: true }).click();
await wait(300);
await page.locator('.rec-search__q input').fill('RD-ACC-08-00412');
await page.keyboard.press('Enter');
await wait(2500);
await shot(page, '03-search-accession');

// Facet: tick first marking checkbox.
await page
  .locator('.rec-facet input[type=checkbox]')
  .first()
  .check()
  .catch(() => {});
await wait(800);
await shot(page, '04-search-facet');
await page
  .locator('.rec')
  .getByText('Clear filters')
  .click()
  .catch(() => {});

// Hover a redaction bar in a snippet.
const bar = page.locator('.rec-hit__snip .redaction').first();
if (await bar.count()) {
  await bar.hover();
  await wait(300);
}

// Save the query.
await page.locator('.rec .rec__head-title').first().click();
await page.keyboard.press('Control+s');
await wait(300);
await page.keyboard.press('Enter');
await wait(500);
await shot(page, '05-search-saved');

// Open the OIA ticket from results.
await page
  .locator('.rec-hit__title', { hasText: 'OIA-08-031' })
  .first()
  .click()
  .catch(async () => {
    await page.locator('.rec-hit__title').first().click();
  });
await wait(2500);
await shot(page, '06-doc-oia');

// Scan of the inventory.
await page.evaluate(() => history.pushState({}, '', '/'));
await page.keyboard.press('Control+o');
await wait(300);
await page.keyboard.type('OSC-2008-Q2');
await page.keyboard.press('Enter');
await wait(3000);
await shot(page, '07-doc-scan');

// Minutes and charter
for (const [no, name] of [
  ['OSC-CNL-MIN-08-02', '08-minutes'],
  ['OSC-CNL-CHR-I', '09-charter'],
  ['OSC-MEM-07-0944', '10-memo-scan'],
  ['OSC-CNL-SEAT-07', '11-seat'],
]) {
  await page
    .locator('.rec')
    .first()
    .click({ position: { x: 300, y: 70 } })
    .catch(() => {});
  await page.keyboard.press('Control+o');
  await wait(300);
  await page.keyboard.type(no);
  await page.keyboard.press('Enter');
  await wait(2500);
  await shot(page, name);
}

// Bad number
await page.keyboard.press('Control+o');
await wait(300);
await page.keyboard.type('RD-ACC-08-00412');
await page.keyboard.press('Enter');
await wait(400);
await shot(page, '12-open-accession-rejected');
await page.keyboard.press('Escape');

// Menu
await page
  .locator('.rec .menubar [data-top="2"], .rec [role=menubar] >> text=View')
  .first()
  .click()
  .catch(() => {});
await wait(300);
await shot(page, '13-menu-view');
await page.keyboard.press('Escape');

// Refused route inside the app: Charter III via Open by Number.
await page.keyboard.press('Control+o');
await wait(300);
await page.keyboard.type('OSC-CNL-CHR-III');
await page.keyboard.press('Enter');
await wait(1500);
await shot(page, '14-refusal');

// Audit
const audit = await page.evaluate(async () => {
  const m = await import('/src/core/audit.ts');
  return m.entries.value.map((e) => `${e.kind} | ${e.subject}`);
});
console.log(audit.join('\n'));

// Handheld
await page.setViewportSize({ width: 760, height: 900 });
await wait(800);
await shot(page, '15-handheld');
await page.locator('.rec .toolbar').getByText('Library', { exact: true }).click();
await wait(800);
await shot(page, '16-handheld-library');
await page.locator('.rec .toolbar').getByText('Search', { exact: true }).click();
await wait(800);
await shot(page, '17-handheld-search');

console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
