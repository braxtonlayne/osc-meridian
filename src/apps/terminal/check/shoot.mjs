// Rendered check for the Terminal app. Needs the dev server: npx vite --port 5210 --strictPort
// Usage (repo root): node src/apps/terminal/check/shoot.mjs [mobile]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = `http://localhost:${5210}`;
const mobile = process.argv.includes('mobile');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 780 } : { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: join(here, `${mobile ? 'm-' : ''}${name}.png`) });

await page.goto(BASE + '/terminal');
await page.waitForSelector('#lock-op', { timeout: 20000 });
await page.fill('#lock-op', 'OPR-A03-1147');
await page.fill('#lock-pass', 'ballast pewter orchard ninety');
await page.press('#lock-pass', 'Enter');
await page.waitForSelector('.term-host .xterm', { timeout: 60000 });
await page.waitForTimeout(1200);
if (!mobile) {
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await page.waitForTimeout(400);
}
await page.locator('.term-host').click();

const type = async (cmd, wait = 500) => {
  await page.keyboard.type(cmd, { delay: 5 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(wait);
};
const screen = () =>
  page.evaluate(() => Array.from(document.querySelectorAll('.term-host .xterm-rows > div')).map((d) => d.textContent).join('\n'));

await shot('connect');
await type('help');
await shot('help');
await type('clear');
await type('whoami');
await type('rail status');
await shot('whoami-rail');
await type('clear');
await type('sites', 800);
await shot('sites-more');
await page.keyboard.press('q');
await page.waitForTimeout(300);
await type('clear');
await type('site alpha-03');
await shot('site-a03');
await type('clear');
await type('site beta-08');
await type('find unposted', 2500);
await shot('site-find');
await type('clear');
await type('wo FE-08-0417');
await type('trace 00412');
await shot('wo-trace');
await type('clear');
await type('strength unposted');
await type('consist R04-***');
await type('copies OSC-2008-Q2');
await type('clearance request acting');
await shot('undocumented');
await type('clear');
await type('man wo');
await type('lookup dir-0412');
await page.keyboard.type('rail s');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
await shot('lookup-tab');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await type('clear');
await type('audit tail 8', 600);
await shot('audit');
await type('open dir-0412', 1500);
await shot('open');
// back to the terminal window
await page.locator('.term-host').first().click().catch(() => undefined);
await page.locator('.term-app .menubar__item', { hasText: 'View' }).click();
await page.waitForTimeout(200);
await shot('menu-view');
await page.keyboard.press('Escape');
await page.locator('.term-app .menubar__item', { hasText: 'Session' }).click();
await page.locator('.menu [role^="menuitem"]', { hasText: 'Disconnect' }).first().click();
await page.waitForTimeout(600);
await shot('disconnected');

const text = await screen();
console.log(text.split('\n').filter((l) => l.trim()).slice(-12).join('\n'));
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close();
