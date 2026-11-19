// Rendered check for Environmental Control. Needs the dev server: npx vite --port 5309 --strictPort
// Usage (repo root): node src/apps/environ/check/shoot.mjs <account> [mobile] [fresh] [drill]
//   lifesupport: every view, controls, override with reason, filter change refusal, load balance, handover
//   deputy / auditor: remote monitor (display only), refusal of a control
//   analyst: in-world refusal
//   drill: writes a test seal drill into the shared store to watch the seal closure
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line no-restricted-syntax -- the local dev server this check drives, not a runtime URL
const BASE = 'http://localhost:5309';
const acct = process.argv[2] ?? 'lifesupport';
const mobile = process.argv.includes('mobile');
const fresh = process.argv.includes('fresh');
const drill = process.argv.includes('drill');
const iso = process.argv.includes('iso');
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
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
const tag = `${mobile ? 'm-' : ''}${acct}${drill ? '-drill' : ''}${iso ? '-iso' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const toolbar = (label) => page.locator('.env-app [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};

await page.goto(BASE + '/environ');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:environ') || k.startsWith('meridian:shared:drill')) localStorage.removeItem(k);
  });
}
await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
await page.click(`.lock-cardopt[data-account="${acct}"]`);
await page.fill('#lock-op', CARDS[acct][0]);
await page.fill('#lock-pass', CARDS[acct][1]);
await page.press('#lock-pass', 'Enter');
await page.waitForSelector('.env-app', { timeout: 60000 });
await wait(1500);
if (!mobile) {
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(400);
}
await shot('home');
if (iso) {
  await page.evaluate(() => {
    const raw = JSON.stringify({ level: 1, initiations: [{ at: new Date().toISOString(), by: 'analyst', ref: 'NI-08-0001' }], active: true, clearsAt: null });
    localStorage.setItem('meridian:shared:isolation', raw);
    window.dispatchEvent(new StorageEvent('storage', { key: 'meridian:shared:isolation', newValue: raw, storageArea: localStorage }));
  });
  await wait(2500);
  await shot('isolated');
}

if (acct === 'analyst') {
  console.log('refusal text:', (await page.locator('.env-app').innerText()).slice(0, 300));
} else {
  if (drill) {
    // Write a test seal drill into the shared store as another tab would (storage event).
    await page.evaluate(() => {
      const now = Date.now();
      const d = { id: 'SD-08-0519-T', orderedAt: now, by: 'deputy', phase: 'sealed', sites: { 'GAMMA-08': { ordered: now, acknowledged: now + 1000, sealed: now + 8000, status: 'sealed' } }, endedAt: null };
      const raw = JSON.stringify(d);
      localStorage.setItem('meridian:shared:drill', raw);
      window.dispatchEvent(new StorageEvent('storage', { key: 'meridian:shared:drill', newValue: raw, storageArea: localStorage }));
    });
    await wait(9000);
    await shot('drill-sealed');
  }
  for (const v of ['Scrubbers', 'Filtration', 'Zones', 'Handover', 'Balance']) {
    await toolbar(v).click();
    await wait(1200);
    await shot(`view-${v.toLowerCase()}`);
  }
  if (acct === 'lifesupport') {
    // Scrubbers to AUTO via keyboard on the selector.
    await toolbar('Scrubbers').click();
    await wait(300);
    const sel = page.locator('.env-app [role="slider"]');
    await sel.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await wait(300);
    await sel.nth(1).focus();
    await page.keyboard.press('ArrowRight');
    await wait(4000);
    await shot('scrubbers-auto');
    // Panel: AHU-2 to HIGH, override key.
    await toolbar('Panel').click();
    await wait(300);
    const sliders = page.locator('.env-app [role="slider"]');
    await sliders.nth(1).focus();
    await page.keyboard.press('ArrowRight');
    await wait(300);
    await sliders.nth(3).focus(); // key switch
    await page.keyboard.press('ArrowRight');
    await wait(400);
    await shot('override-dialog');
    await page.locator('.dlg input').first().fill('CO2 clearing, duty officer direction by phone');
    await page.locator('.dlg button', { hasText: 'Override' }).click();
    await wait(1500);
    await shot('override-on');
    await sliders.nth(3).focus();
    await page.keyboard.press('ArrowLeft');
    await wait(500);
    // Filtration: CBRN, then refusal of change on the on-line bank, then change the other bank.
    await toolbar('Filtration').click();
    await wait(300);
    const f = page.locator('.env-app [role="slider"]');
    await f.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await wait(3000);
    await shot('cbrn');
    await page.locator('.env-app button', { hasText: 'Record change on bank B' }).click();
    await wait(400);
    await shot('filter-refusal');
    await dismiss();
    await page.locator('.env-app button', { hasText: 'Record change on bank A' }).click();
    await wait(400);
    if (await page.locator('.dlg input').count()) {
      await page.locator('.dlg input').first().fill('GPB-0805-11');
      await shot('filter-dialog');
      await page.locator('.dlg button', { hasText: 'Record' }).click();
      await wait(800);
      await shot('filter-changed');
    } else {
      await shot('filter-seal-refusal');
      await dismiss();
    }
    // Load balance then sign handover with the result.
    await page.keyboard.press('Control+b');
    await toolbar('Balance').click();
    await page.locator('.env-app button', { hasText: 'Compute balance' }).click();
    await wait(600);
    await shot('balance');
    await toolbar('Handover').click();
    await wait(300);
    await page.locator('.env-app button', { hasText: 'Sign handover log' }).click();
    await wait(300);
    await page.locator('.dlg textarea').fill('Plant normal.');
    const ins = page.locator('.dlg button', { hasText: 'Insert load balance result' });
    if (await ins.count()) await ins.click();
    await shot('sign-dialog');
    await page.locator('.dlg button', { hasText: 'Sign' }).click();
    await wait(1500);
    await shot('handover-signed');
    // Ack alarms
    await page.keyboard.press('F8');
    await toolbar('Zones').click();
    await wait(1500);
    await shot('zones-after');
  } else {
    await toolbar('Panel').click();
    await wait(300);
    await page.locator('.env-app [role="slider"]').nth(3).focus();
    await page.keyboard.press('ArrowRight');
    await wait(400);
    await shot('monitor-refusal');
    await dismiss();
  }
}
// Open the procedure document.
await toolbar('Procedure').click();
await wait(2500);
await shot('procedure');
const mail = await page.evaluate(() => Object.keys(localStorage).filter((k) => /mail/.test(k)).map((k) => k + '=' + (localStorage.getItem(k) ?? '').match(/msg-08-056dd/g)?.join(',')));
console.log('mail keys:', mail.join('\n'));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
console.log('foreign requests:', foreign.length ? foreign.join('\n') : 'none');
await browser.close();
