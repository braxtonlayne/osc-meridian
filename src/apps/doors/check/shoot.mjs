// Rendered check for Door and Airlock Control. Needs: npx vite --port 5306 --strictPort
// Usage (repo root): node src/apps/doors/check/shoot.mjs <account> [mobile] [fresh] [drill]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', 'localhost:5306'].join('/'); // dev server only
const acct = process.argv[2] ?? 'lifesupport';
const mobile = process.argv.includes('mobile');
const fresh = process.argv.includes('fresh');
const drill = process.argv.includes('drill');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1400, height: 920 } });
// Hold the HMR socket open without a server so content rebuilds by other agents do not reload the page.
await ctx.routeWebSocket(/.*/, () => undefined);
const page = await ctx.newPage();
const errors = [];
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
const tag = `${mobile ? 'm-' : ''}${acct}${drill ? '-drill' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const tb = (label) => page.locator('.dr-app [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const dlgText = async () => ((await page.locator('.dlg').count()) ? await page.locator('.dlg').first().innerText() : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const login = async () => {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.dr-app', { timeout: 60000 });
  await wait(1200);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(400);
  }
};
const pick = async (id) => {
  await page.locator(`.dm-item[aria-label^="${id},"]`).first().click();
  await wait(300);
};
const press = async (aria) => {
  await page.locator(`.dr-detail button[aria-label="${aria}"]`).first().click();
  await wait(300);
};

await page.goto(BASE + '/doors');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:doors') || k.startsWith('meridian:shared:drill')) localStorage.removeItem(k);
  });
}
await login();
await shot('board');

if (drill) {
  await page.evaluate(() => {
    const now = Date.now();
    const d = { id: 'SD-08-0519-T', orderedAt: now, by: 'deputy', phase: 'sealed', sites: { 'GAMMA-08': { ordered: now, acknowledged: now + 500, sealed: now + 8000, status: 'sealed' }, 'ALPHA-02': { ordered: now, acknowledged: now + 500, sealed: now + 8000, status: 'sealed' } }, endedAt: null };
    localStorage.setItem('meridian:shared:drill', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('.lock-cardopt, .dr-app', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(1500);
  await shot('drill-closing');
  await wait(4000);
  await shot('drill-sealed');
  const site = acct === 'deputy' ? 'A02-BD1' : 'G08-BD1';
  await pick(site);
  await press(`Open ${site}`);
  console.log('drill open ->', await dlgText());
  await shot('drill-override-ask');
  if (await page.locator('.dlg textarea').count()) {
    await page.fill('.dlg textarea', 'Fuel delivery escort at the entry portal, two guards attending');
    await page.locator('.dlg button', { hasText: 'Enter override' }).click();
    await wait(1500);
  }
  await shot('drill-override');
  // stand down
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('meridian:shared:drill'));
    d.phase = 'stand-down';
    d.endedAt = Date.now();
    localStorage.setItem('meridian:shared:drill', JSON.stringify(d));
  });
  await page.reload();
  await page.waitForSelector('.lock-cardopt, .dr-app', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(5000);
  await shot('drill-standdown');
} else if (acct === 'lifesupport') {
  await pick('G08-PD1');
  await shot('door-selected');
  await press('Open G08-PD1');
  await wait(1500);
  await shot('door-travel');
  await press('Close G08-PD1'); // in travel -> refusal
  console.log('in travel ->', await dlgText());
  await dismiss();
  await pick('G08-AL1');
  await shot('airlock-selected');
  // decon mode on, cycle in
  await page.locator('.dr-detail [role="slider"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await wait(200);
  await press('Cycle G08-AL1 inbound');
  await wait(20000);
  await shot('airlock-outer');
  await wait(30000);
  await shot('airlock-decon');
  // decon bypass refused for technician
  await press('Decon bypass G08-AL1');
  console.log('decon bypass ->', await dlgText());
  await dismiss();
  // interlock bypass key
  const key = page.locator('.dr-detail [role="slider"]').nth(1);
  await key.focus();
  await page.keyboard.press('ArrowRight');
  await wait(300);
  console.log('interlock bypass ->', await dlgText());
  await shot('interlock-bypass');
  await dismiss();
  await key.focus();
  await page.keyboard.press('ArrowRight');
  await wait(300);
  await dismiss();
  // hold-open override on portal door
  await pick('G08-PD1');
  await press('Hold-open override on G08-PD1');
  await page.fill('.dlg textarea', 'Generator fuel delivery, door attended by D. Voss');
  await page.locator('.dlg button', { hasText: 'Enter override' }).click();
  await wait(800);
  await shot('override');
  await page.keyboard.press('Control+Shift+A');
  await wait(300);
  await tb('Cycle log').click();
  await wait(600);
  await shot('log');
  await tb('Overrides').click();
  await wait(600);
  await shot('overrides');
  // handover
  await page.locator('.menubar button', { hasText: 'Board' }).first().click();
  await page.locator('[role="menuitem"]', { hasText: 'Watch handover' }).click();
  await wait(400);
  await shot('handover');
  await page.locator('.dlg button', { hasText: 'Sign handover' }).click();
  await wait(500);
  await page.goto(BASE + '/doors/operating-procedure');
  await page.waitForSelector('.dr-app, .lock-cardopt', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(2000);
  await shot('procedure');
} else if (acct === 'auditor' || acct === 'deputy') {
  if (acct === 'deputy') {
    await pick('A02-BD9');
    await shot('seg04-portal');
    await press('Open A02-BD9');
    await wait(800);
    await shot('own-door-open');
    await page.locator('.dr-app [role="toolbar"] select').first().selectOption('ALPHA-05');
    await wait(600);
    await shot('remote-board');
    await pick('A05-PD1');
    await press('Open A05-PD1');
    console.log('remote open ->', await dlgText());
    await dismiss();
  } else {
    await pick('A01-PD1');
    await press('Open A01-PD1');
    console.log('auditor open ->', await dlgText());
    await dismiss();
  }
  await tb('Cycle log').click();
  await wait(500);
  await page.locator('.dr-log select').first().selectOption('ALPHA-05');
  await wait(600);
  await shot('log-a05');
  const row = page.locator('.dr-log tr', { hasText: 'A05-AL3' }).first();
  await row.click();
  await wait(400);
  await shot('log-al3');
  await page.locator('.dr-log__detail button').first().click();
  await wait(800);
  console.log('status ->', await page.locator('.dr-app .statusbar, .dr-app [role="status"]').first().innerText().catch(() => ''));
} else {
  // analyst
  await pick('A03-BD3');
  await press('Open A03-BD3');
  await wait(800);
  await shot('vault-open');
  await pick('A03-PD1');
  await press('Open A03-PD1');
  console.log('analyst portal ->', await dlgText());
  await dismiss();
  await tb('Cycle log').click();
  await wait(500);
  await shot('log');
}

console.log('errors:', errors.slice(0, 10));
console.log('foreign:', foreign.slice(0, 5));
await browser.close();
