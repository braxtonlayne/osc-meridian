// Rendered check for the Muster Board. Needs the dev server: npx vite --port 5311 --strictPort
// Usage (repo root): node src/apps/muster/check/shoot.mjs <account> [mobile] [fresh]
//   deputy: initiate at ALPHA-02, sweeps, close-out, badge lookup, print
//   lifesupport: own-site board, refusal of the network board
//   analyst / auditor: network board, read-only refusals, close-out review
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = `http://localhost:${5311}`;
const acct = process.argv[2] ?? 'deputy';
const mobile = process.argv.includes('mobile');
const fresh = process.argv.includes('fresh');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1360, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${mobile ? 'm-' : ''}${acct}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const dismiss = async () => {
  const ok = page.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /^(OK|Close)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const toolbar = (label) => page.locator('.mus-app [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();

await page.goto(BASE + '/muster');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:muster')) localStorage.removeItem(k);
  });
}
await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
for (let attempt = 0; attempt < 3; attempt++) {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await wait(800);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await wait(3000);
  if (await page.locator('.mus-app').count()) break;
  if (!(await page.locator('.lock-cardopt').count())) {
    await page.goto(BASE + '/muster');
    await wait(3000);
    if (await page.locator('.mus-app').count()) break;
  }
}
await page.waitForSelector('.mus-app', { timeout: 60000 });
await wait(1500);
if (!mobile) {
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(400);
}
await shot('home');

const hold = async (sel, ms) => {
  const b = page.locator(sel).first();
  await b.focus();
  await page.keyboard.down('Space');
  await wait(ms);
  await page.keyboard.up('Space');
};

if (acct === 'deputy' || acct === 'lifesupport') {
  if (acct === 'deputy') {
    await toolbar('Site').click();
    await wait(400);
  }
  await shot('site-idle');
  // Lift the cover and hold the actuator.
  const guardBtns = page.locator('.mus-app .pk-guard button');
  await guardBtns.nth(0).focus();
  await page.keyboard.press('Space');
  await wait(300);
  await shot('guard-lifted');
  await hold('.mus-app .pk-guard button >> nth=1', 2400);
  await wait(4000);
  await shot('muster-early');
  // Dispatch sweeps to every point (teams permitting).
  const dispatch = page.getByRole('button', { name: 'Dispatch sweep team' }).first();
  for (let i = 0; i < 6; i++) {
    await dispatch.click();
    await wait(300);
    await dismiss();
    const slider = page.locator('.mus-app [role="slider"]').first();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await wait(200);
  }
  await shot('sweeps');
  await wait(acct === 'deputy' ? 28000 : 14000);
  await shot('report-due');
  await toolbar('Point').click();
  await wait(500);
  if (acct === 'deputy') {
    const sel = page.locator('.mus-pick select').nth(1);
    await sel.selectOption({ label: /A02-MP3/ }).catch(async () => sel.selectOption({ index: 2 }));
    await wait(500);
  }
  await shot('point');
  // Look up the first not-on-strength read, if any.
  const unk = page.locator('.mus-app tr.mus-row--unk').first();
  if (await unk.count()) {
    await unk.click();
    await page.locator('.mus-app button', { hasText: 'Look up badge' }).click();
    await wait(500);
    await shot('lookup');
    await dismiss();
  }
  // Remaining sweeps for any point not yet tasked.
  await toolbar('Site').click();
  await wait(400);
  for (let i = 0; i < 6; i++) {
    const slider = page.locator('.mus-app [role="slider"]').first();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await dispatch.click();
    await wait(250);
    await dismiss();
  }
  await wait(13000);
  await toolbar('Close-out').click();
  await wait(500);
  await shot('closeout-draft');
  await page.locator('.mus-app button', { hasText: /^Sign close-out/ }).click();
  await wait(800);
  await shot('closeout-signed');
  await toolbar('Site').click();
  await wait(400);
  await shot('site-closed');
  if (acct === 'lifesupport') {
    await toolbar('Network').click().catch(() => undefined);
    await page.locator('.mus-app [role="menubar"] >> text=View').click();
    await page.locator('[role="menuitemradio"]', { hasText: 'Network board' }).click();
    await wait(400);
    await shot('network-refused');
    await dismiss();
  }
} else {
  await shot('network');
  await page.locator('.mus-pick select').first().selectOption('ALPHA-02');
  await wait(600);
  await shot('site-a02');
  const guardBtns = page.locator('.mus-app .pk-guard button');
  await guardBtns.nth(0).click();
  await wait(400);
  await shot('initiate-refused');
  await dismiss();
  await toolbar('Close-out').click();
  await wait(500);
  await shot('closeout');
  await toolbar('Point').click();
  await wait(500);
  await shot('point');
}

// Documents
await toolbar('DIR-0461').click().catch(() => undefined);
await wait(1500);
await shot('doc-procedure');
await toolbar('KB-0316').click().catch(() => undefined);
await wait(1500);
await shot('doc-kb');

console.log(JSON.stringify({ acct, errors }, null, 1));
await browser.close();
