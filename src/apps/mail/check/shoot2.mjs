// Second rendered check: cable deep link, compartmented forward refusal, address book, handheld.
// Usage (repo root, dev server on 5204): node src/apps/mail/check/shoot2.mjs
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.MT_BASE ?? ['http:', '', 'localhost:5204'].join('/');
const browser = await chromium.launch();
const errors = [];

async function session(viewport, path) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + path);
  await page.waitForSelector('#lock-op', { timeout: 30000 });
  await page.fill('#lock-op', 'OPR-A03-1147');
  await page.fill('#lock-pass', 'ballast pewter orchard ninety');
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.mt-root', { timeout: 30000 });
  await page.waitForTimeout(1800);
  return page;
}
const shot = (page, n) => page.screenshot({ path: join(here, `${n}.png`) });

let page = await session({ width: 1366, height: 860 }, '/mail/msg-08-04473');
await page.locator('.win-title').last().dblclick().catch(() => undefined);
await page.waitForTimeout(500);
await shot(page, '20-cable-deeplink');
await page.locator('.mt-preview').evaluate((el) => (el.scrollTop = 300));
await shot(page, '21-cable-body');
// address book from toolbar
await page.locator('.mt-root button', { hasText: 'Address Book' }).first().click();
await page.waitForTimeout(600);
await shot(page, '22-addressbook');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
// compose: precedence + marking refusals
await page.keyboard.press('Control+Shift+M');
await page.waitForTimeout(400);
await page.fill('.mt-compose input[name="to"]', 'harrow');
await page.fill('.mt-compose input[name="subject"]', 'Stacks C queue');
await page.locator('.mt-compose select').first().selectOption('FLASH');
await page.fill('.mt-compose textarea', 'Query on the Stacks C queue.');
await page.locator('.mt-compose button', { hasText: 'Send' }).first().click();
await page.waitForTimeout(500);
await shot(page, '23-compose-flash');
await page.locator('.mt-compose button', { hasText: 'Discard' }).first().click();
await page.waitForTimeout(400);
await shot(page, '24-discard-confirm');
await page.keyboard.press('Alt+y');
await page.keyboard.press('Enter');
await page.close();

page = await session({ width: 390, height: 780 }, '/mail');
await shot(page, '30-handheld-list');
await page.locator('.mt-list tr', { hasText: 'Welcome to Accessions' }).last().click();
await page.waitForTimeout(1200);
await shot(page, '31-handheld-message');
await page.locator('.mt-crumbs button', { hasText: 'Folders' }).click();
await page.waitForTimeout(300);
await shot(page, '32-handheld-folders');
console.log('errors:', errors.join('\n') || 'none');
await browser.close();
