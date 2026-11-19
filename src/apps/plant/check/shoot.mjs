// Rendered check for the Reactor Plant Panel. Needs: npx vite --port 5305 --strictPort
// Usage (repo root): node src/apps/plant/check/shoot.mjs <account> [mobile] [fresh] [isolate]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', 'localhost:5305'].join('/'); // dev server only
const acct = process.argv[2] ?? 'analyst';
const mobile = process.argv.includes('mobile');
const fresh = process.argv.includes('fresh');
const isolate = process.argv.includes('isolate');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1400, height: 920 } });
const page = await ctx.newPage();
const errors = [];
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:') && foreign.push(r.url()));
const tag = `${mobile ? 'm-' : ''}${acct}${isolate ? '-iso' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const tb = (label) => page.locator('.plt [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const dlgText = async () => ((await page.locator('.dlg').count()) ? (await page.locator('.dlg').first().innerText()).replace(/\s+/g, ' ') : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const status = async () => (await page.locator('.plt .statusbar, .plt [role="status"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
const login = async () => {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await wait(500);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.lock-cardopt', { state: 'detached', timeout: 60000 });
  await page.waitForSelector('.plt', { state: 'visible', timeout: 60000 });
  await wait(1500);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(400);
  }
};
const btn = (...parts) => page.locator(`.plt button${parts.map((p) => `[aria-label*="${p}"]`).join('')}`).first();

await page.goto(BASE + '/plant');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:plant') || k.startsWith('meridian:shared:isolation')) localStorage.removeItem(k);
  });
}
if (isolate) {
  await page.evaluate(() => localStorage.setItem('meridian:shared:isolation', JSON.stringify({ level: 2, initiations: [], active: true, clearsAt: null })));
}
await login();
await wait(2500);
await shot('panel');
console.log('status:', await status());

if (acct === 'lifesupport') {
  await tb('Live').click();
  await wait(300);
  console.log('live ->', await dlgText());
  await dismiss();
  await tb('Event log').click();
  await wait(300);
  console.log('log ->', await dlgText());
  await dismiss();
}

// Trip the simulator: stop both coolant pumps.
await btn('PUMP A', 'STOP').click();
await btn('PUMP B', 'STOP').click();
await wait(6000);
await shot('tripped');
console.log('after pump stop:', await status());
await page.locator('.plt').first().press('F7');
await wait(400);
await shot('acked');

if (!mobile) {
  await tb('Trends').click();
  await wait(1500);
  await shot('trends');
  await tb('Trips').click();
  await wait(500);
  await shot('trips');
  if (acct !== 'lifesupport') {
    await tb('One-line').click();
    await wait(800);
    await shot('oneline');
    await tb('Event log').click();
    await wait(600);
    await shot('log');
    const ref = page.locator('.plt .plt-link', { hasText: 'FE-07-0233' }).first();
    if (await ref.count()) {
      await ref.click();
      await wait(300);
      console.log('ref ->', await dlgText());
      await dismiss();
    }
  }
}

if (acct !== 'lifesupport') {
  await tb('Panel').click();
  await tb('Live').click();
  await wait(3500);
  await shot('live');
  console.log('live status:', await status());
  await btn('TRIP', 'RESET').click();
  await wait(300);
  console.log('live control ->', await dlgText());
  await shot('live-refused');
  await dismiss();
  if (acct === 'analyst' && !mobile) {
    // RX-A02 attempt traces to the deputy
    await page.locator('.plt [role="toolbar"] select').first().selectOption('RX-A02');
    await wait(2500);
    await btn('PUMP A', 'STOP').click();
    await wait(300);
    await dismiss();
    await shot('live-a02');
  }
}

await page.goto(BASE + (acct === 'lifesupport' ? '/plant/sim-card' : '/plant/sim-procedure'));
await page.waitForSelector('.plt, .lock-cardopt', { timeout: 30000 });
if (await page.locator('.lock-cardopt').count()) await login();
await wait(2000);
await shot('doc');

// Mail delivered
const mail = await page.evaluate(() => Object.keys(localStorage).map((k) => [k, (localStorage.getItem(k) ?? "").match(/msg-08-057[0-9][0-9]/g)]).filter((x) => x[1]));
console.log('mail keys:', JSON.stringify(mail));
console.log('errors:', errors.slice(0, 10));
console.log('foreign:', foreign.slice(0, 5));
await browser.close();
