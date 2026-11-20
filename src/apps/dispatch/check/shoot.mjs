// Rendered check for the Dispatcher Workstation. Needs: npx vite --port 5307 --strictPort
// Usage (repo root): node src/apps/dispatch/check/shoot.mjs <account> [mobile] [fresh] [iso] [seg04]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = `http${'://'}localhost:${process.env.PORT ?? 5307}`;
const acct = process.argv[2] ?? 'deputy';
const has = (f) => process.argv.includes(f);
const mobile = has('mobile');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1500, height: 960 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${mobile ? 'm-' : ''}${acct}${has('iso') ? '-iso' : ''}${has('seg04') ? '-seg04' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const dlgText = async () => ((await page.locator('.dlg').count()) ? await page.locator('.dlg').first().innerText() : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const tb = (label) => page.locator('.dsp-root [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const login = async () => {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.dsp-root', { timeout: 60000 });
  await wait(1500);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(400);
  }
};
const status = async () => page.locator('.dsp-root .statusbar, .dsp-root [role="status"]').first().innerText().catch(() => '');
const selectBy = async (label, value) => {
  await page.getByLabel(label, { exact: true }).first().selectOption(value, { timeout: 4000 }).catch((e) => console.log('select', label, 'failed:', String(e).split(String.fromCharCode(10))[0].slice(0, 100)));
  await wait(400);
};
const key = async (k, ms = 300) => {
  await page.locator('.dsp-root').first().focus().catch(() => undefined);
  await page.keyboard.press(k);
  await wait(ms);
};

await page.goto(BASE + '/dispatch');
if (has('fresh')) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:dispatch') || k.startsWith('meridian:shared:isolation') || k.startsWith('meridian:shared:drill')) localStorage.removeItem(k);
  });
}
await login();
await shot('01-open');

if (acct === 'lifesupport') {
  await tb('Desk').click().catch(() => undefined);
  await wait(400);
  console.log('desk ->', await dlgText());
  await shot('02-desk-refused');
  await dismiss();
  await page.goto(BASE + '/dispatch/platform-notice');
  await page.waitForSelector('.dsp-root, .lock-cardopt', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(1500);
  await shot('03-notice');
} else {
  // route by origin/destination
  await selectBy('Origin', 'ALPHA-02');
  await selectBy('Destination', 'ALPHA-03');
  await shot('02-route-entered');
  await key('F5', 3500);
  console.log('set route ->', await dlgText(), '|', await status());
  await shot('03-route-set');
  await dismiss();
  await selectBy('Consist', 'R02-101').catch((e) => console.log('consist select failed', String(e).slice(0, 120)));
  await key('F6', 4000);
  console.log('clear ->', await dlgText(), '|', await status());
  await dismiss();
  await key('F7', 800);
  console.log('dispatch ->', await dlgText(), '|', await status());
  await shot('04-dispatched');
  await dismiss();
  // seg 04 refused in NORMAL
  await selectBy('Origin', 'ALPHA-02');
  await selectBy('Destination', 'ALPHA-05');
  console.log('seg04 normal ->', await dlgText());
  await shot('05-seg04-refused');
  await dismiss();
  if (acct === 'deputy' && has('seg04')) {
    const k = page.locator('.dsp-root [role="slider"]').nth(2);
    await k.focus();
    await page.keyboard.press('ArrowRight');
    await wait(300);
    console.log('engrg ->', await dlgText());
    await dismiss();
    await k.focus();
    await page.keyboard.press('ArrowRight');
    await wait(300);
    await dismiss();
    await selectBy('Origin', 'ALPHA-02');
    await selectBy('Destination', 'ALPHA-05');
    await key('F5', 3500);
    console.log('seg04 pos3 set ->', await dlgText(), '|', await status());
    await dismiss();
    await selectBy('Consist', 'R05-030').catch(() => undefined);
    await key('F6', 1500);
    await shot('06-awaiting-release');
    await wait(26000);
    console.log('release ->', await dlgText(), '|', await status());
    await dismiss();
    await shot('07-released');
    await key('F7', 800);
    await dismiss();
    await wait(1500);
    await shot('08-instruction-dispatched');
  }
  if (has('iso')) {
    await page.evaluate(() => {
      const t = new Date().toISOString().slice(11);
      localStorage.setItem('meridian:shared:isolation', JSON.stringify({ level: 1, initiations: [{ at: `2008-05-19T${t}`, by: 'auditor', ref: 'NI-08-T01' }], active: true, clearsAt: null }));
    });
    await page.reload();
    await page.waitForSelector('.lock-cardopt, .dsp-root', { timeout: 30000 });
    if (await page.locator('.lock-cardopt').count()) await login();
    await wait(2500);
    await shot('09-isolation');
    await selectBy('Origin', 'ALPHA-01');
    await selectBy('Destination', 'ALPHA-03');
    await key('F5', 800);
    console.log('iso route ->', await dlgText());
    await dismiss();
  }
  await key('Control+2', 600);
  await shot('10-log');
  await key('Control+3', 600);
  await shot('11-platform');
  await page.locator('.menubar button', { hasText: 'Desk' }).first().click().catch(() => undefined);
  await wait(300);
  await shot('12-menu-desk');
  await page.keyboard.press('Escape');
  if (acct !== 'deputy') {
    await key('Control+1', 600);
    const k = page.locator('.dsp-root [role="slider"]').nth(1);
    await k.focus();
    await page.keyboard.press('ArrowLeft');
    await wait(400);
    console.log('live ->', await dlgText());
    await shot('13-live-refused');
    await dismiss();
  }
  await page.goto(BASE + '/dispatch/procedure');
  await page.waitForSelector('.dsp-root, .lock-cardopt', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(1500);
  await shot('14-procedure');
}

console.log('errors:', errors.slice(0, 10));
await browser.close();
