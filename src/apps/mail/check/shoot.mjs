// Rendered check for Message Traffic. Needs the dev server: npx vite --port 5204 --strictPort
// Usage (repo root): node src/apps/mail/check/shoot.mjs [mobile]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.MT_BASE ?? ['http:', '', 'localhost:5204'].join('/');
const mobile = process.argv.includes('mobile');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 780 } : { width: 1366, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: join(here, `${mobile ? 'm-' : ''}${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);

async function signIn(path) {
  await page.goto(BASE + path);
  await page.waitForSelector('#lock-op', { timeout: 30000 });
  await page.fill('#lock-op', 'OPR-A03-1147');
  await page.fill('#lock-pass', 'ballast pewter orchard ninety');
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.mt-root', { timeout: 30000 });
  await wait(1500);
}
async function maximize() {
  if (mobile) return;
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(300);
}
const row = (text) => page.locator('.mt-list tr', { hasText: text }).first();

await signIn('/mail');
await maximize();
await shot('01-inbox');

// preview a message
await row('Welcome to Accessions').click();
await wait(1200);
await shot('02-preview');

// open via Enter -> route
await page.keyboard.press('Enter');
await wait(1200);
console.log('url after open', page.url());

// cable
await row('OSC-CBL-08-01173').click().catch(() => console.log('no cable row yet'));
await wait(1000);
await shot('03-cable');

// conversation + bottom pane
await page.locator('.menubar__item', { hasText: 'View' }).click();
await page.locator('.menu [role^="menuitem"]', { hasText: 'Reading Pane Bottom' }).click();
await wait(500);
await shot('04-bottom');
await page.locator('.menubar__item', { hasText: 'View' }).click();
await page.locator('.menu [role^="menuitem"]', { hasText: 'Reading Pane Right' }).click();

// reply
await row('Welcome to Accessions').click();
await wait(600);
await page.keyboard.press('Control+r');
await wait(600);
await shot('05-reply');
// external address -> rejected
await page.fill('.mt-compose input[name="to"]', 'someone@example.com');
await page.locator('.mt-compose .tb-btn, .mt-compose button', { hasText: 'Send' }).first().click();
await wait(400);
await shot('06-reject');
await page.fill('.mt-compose input[name="to"]', 'okafor; c.dimmick@a03.rd.mer');
await page.locator('.mt-compose button', { hasText: 'Send' }).first().click();
await wait(600);
await shot('07-sent-status');
await wait(5500);
await shot('08-delivery-report');
await row('Delivery report').click().catch(() => console.log('no delivery report'));
await wait(800);
await shot('09-report');

// sent items
await page.locator('.mt-folders [role="treeitem"][aria-level="2"]', { hasText: 'Sent Items' }).click();
await wait(600);
await row('RE:').click().catch(() => undefined);
await wait(600);
await shot('10-sent');

// forward refusal on compartmented
await page.locator('.mt-folders [role="treeitem"][aria-level="2"]', { hasText: 'Inbox' }).first().click();
await wait(400);
await page.keyboard.press('Delete');
await wait(400);
await shot('11-delete-refusal');
await page.keyboard.press('Enter');

// address book
await page.keyboard.press('Control+Shift+B');
await wait(600);
await shot('12-addressbook');
await page.keyboard.press('Escape');

// deep link to an undelivered message
await page.goto(BASE + '/mail/msg-08-04490');
await page.waitForSelector('#lock-op, .mt-root', { timeout: 30000 });
if (await page.locator('#lock-op').count()) {
  await page.fill('#lock-op', 'OPR-A03-1147');
  await page.fill('#lock-pass', 'ballast pewter orchard ninety');
  await page.press('#lock-pass', 'Enter');
}
await page.waitForSelector('.mt-root', { timeout: 30000 });
await wait(1800);
await maximize();
await shot('13-deeplink-slots');

const audit = await page.evaluate(async () => {
  const m = await import('/src/core/audit.ts');
  return m.entries.peek().filter((e) => /^(mail|doc)\./.test(e.kind)).map((e) => `${e.kind} ${e.subject} ${e.data ? JSON.stringify(e.data) : ''}`);
});
console.log(audit.join('\n'));
console.log('errors:', errors.join('\n') || 'none');
await browser.close();
