// Rendered check for the System Tools app. Needs the dev server: npx vite --port 5211 --strictPort
// Usage (repo root): node src/apps/system/check/shoot.mjs [mobile]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line no-restricted-syntax -- the local dev server this check drives, not a runtime URL
const BASE = 'http://localhost:5211';
const mobile = process.argv.includes('mobile');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 780 } : { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const shot = (name) => page.screenshot({ path: join(here, `${mobile ? 'm-' : ''}${name}.png`) });

async function signIn(path) {
  await page.goto(BASE + path);
  await page.waitForSelector('#lock-op', { timeout: 20000 });
  await page.fill('#lock-op', 'OPR-A03-1147');
  await page.fill('#lock-pass', 'ballast pewter orchard ninety');
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.sys-app', { timeout: 20000 });
  await page.waitForTimeout(800);
}

async function maximize() {
  if (mobile) return;
  const t = page.locator('.win-title').last();
  await t.dblclick().catch(() => undefined);
  await page.waitForTimeout(300);
}

const tree = (label) => page.locator('.sys-nav').getByText(label).first();
const nav = async (label) => {
  if (mobile) {
    await page.locator('.sys-app .menubar__item', { hasText: label.menu }).click();
    await page.locator('.menu [role^="menuitem"]', { hasText: label.item }).first().click();
  } else await tree(label.item).click();
  await page.waitForTimeout(900);
};

await signIn('/system');
await maximize();
await shot('home');
await page.locator('#sys-help-q').focus();
await page.keyboard.press('Control+p');
await page.waitForTimeout(300);
await shot('home-print-refusal');
await page.keyboard.press('Enter');
await page.fill('#sys-help-q', 'print');
await page.press('#sys-help-q', 'Enter');
await page.waitForTimeout(900);
await shot('home-search');
await page.fill('#sys-help-q', '');

await nav({ menu: 'Go', item: 'KB-0012' });
await shot('kb');
await nav({ menu: 'View', item: 'Glossary' });
await shot('glossary');
await page.fill('#sys-gloss-q', 'capacity');
await page.waitForTimeout(300);
await page.locator('.sys-gloss__list tr', { hasText: 'SUSTAINED CAPACITY' }).first().click();
await page.waitForTimeout(300);
await shot('glossary-term');
await page.locator('[role="tab"]', { hasText: 'Record copy' }).click();
await page.waitForTimeout(1200);
await shot('glossary-record');

await nav({ menu: 'View', item: 'Calendar' });
await shot('calendar');
await page.locator('[data-day="2008-05-15"]').click();
await page.waitForTimeout(300);
await shot('calendar-day15');
await page.locator('.sys-cal__detail .redaction').first().hover();
await page.waitForTimeout(700);
await shot('calendar-rx-hover');
await page.locator('.sys-cal .toolbar__btn', { hasText: 'List' }).click();
await page.waitForTimeout(300);
await shot('calendar-list');

await nav({ menu: 'View', item: 'Monitor' });
await shot('monitor-links');
for (const t of ['Services', 'Session and clearance', 'Print queue']) {
  await page.locator('.sys-monitor [role="tab"]', { hasText: t }).click();
  await page.waitForTimeout(300);
  await shot(`monitor-${t.split(' ')[0].toLowerCase()}`);
}

await nav({ menu: 'View', item: 'Settings' });
await shot('settings');
await page.locator('label', { hasText: 'Compact' }).click();
await page.waitForTimeout(300);
await shot('settings-compact');
await page.locator('button', { hasText: 'Change interval' }).click();
await page.waitForTimeout(300);
await shot('settings-interval');
await page.keyboard.press('Enter');
await page.locator('label', { hasText: 'Standard' }).click();

await nav({ menu: 'Help', item: 'About' });
await shot('about');
await nav({ menu: 'Help', item: 'Colophon' });
await shot('colophon');
await page.locator('.sys-app').press('Alt+ArrowLeft');
await page.waitForTimeout(900);
await shot('back');
await page.locator('.sys-app').press('Control+f');
await page.waitForTimeout(900);
await shot('find');

const audit = await page.evaluate(async () => {
  const m = await import('/src/core/services.ts');
  return m.services.audit.entries.value.slice(-40).map((e) => `${e.kind} ${e.subject}`);
});
console.log(audit.join('\n'));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
