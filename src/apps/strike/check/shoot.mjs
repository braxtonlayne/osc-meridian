// Rendered check for the Survivability Estimator. Needs: npx vite --port 5301 --strictPort
// Usage (repo root): node src/apps/strike/check/shoot.mjs <account> [mobile] [fresh] [isolated]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5301'].join('/'); // local dev server only
const accts = process.argv.slice(2).filter((a) => ['analyst', 'lifesupport', 'deputy', 'auditor'].includes(a));
let acct = accts[0] ?? 'analyst';
const mobile = process.argv.includes('mobile');
const fresh = process.argv.includes('fresh');
const isolated = process.argv.includes('isolated');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 820 } : { width: 1440, height: 940 } });
const page = await ctx.newPage();
const errors = [];
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
const shot = (name) => page.screenshot({ path: join(here, `${mobile ? 'm-' : ''}${acct}${isolated ? '-iso' : ''}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const dlgText = async () => ((await page.locator('.dlg').count()) ? await page.locator('.dlg').first().innerText() : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const login = async () => {
  for (let i = 0; i < 40 && !(await page.locator('.lock-cardopt').count()); i++) {
    await page.keyboard.press('Enter').catch(() => undefined);
    await wait(500);
  }
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.stk-app', { timeout: 60000 });
  await wait(1500);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(500);
  }
};
const tab = async (name) => {
  await page.locator('.stk-app [role="tab"]', { hasText: name }).first().click();
  await wait(400);
};
const setPoint = async (text) => {
  await page.fill('.stk-app input[name="anchor"]', text);
  await page.locator('.stk-app button', { hasText: 'Set point' }).click();
  await wait(200);
};
const run = async () => {
  await page.locator('.stk-app button', { hasText: 'Run estimate' }).click();
  await wait(600);
};
const register = async (remark) => {
  await page.locator('.stk-app button', { hasText: 'Enter in register' }).first().click();
  await wait(300);
  const t = await dlgText();
  if (await page.locator('.dlg textarea').count()) {
    if (remark) await page.fill('.dlg textarea', remark);
    await page.locator('.dlg button', { hasText: /^Enter$/ }).click();
    await wait(500);
    return 'entered';
  }
  return t;
};

await page.goto(BASE + '/strike');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:strike') || k.startsWith('meridian:shared:isolation')) localStorage.removeItem(k);
  });
}
if (isolated) {
  await page.evaluate(() => {
    localStorage.setItem('meridian:shared:isolation', JSON.stringify({ level: 1, initiations: [{ at: '2008-05-19T14:00:00Z', by: 'deputy', ref: 'NI-08-0001' }], active: true, clearsAt: null }));
  });
}
for (const a of accts.length ? accts : [acct]) {
acct = a;
await page.evaluate((id) => localStorage.setItem('meridian:activeAccount', id), acct);
await page.goto(BASE + '/strike');
await login();
await shot('home');

if (acct === 'lifesupport') {
  console.log('refusal text:', (await page.locator('.stk-app').innerText()).slice(0, 400));
} else {
  // Typed anchor on the analyst's own site.
  await setPoint('24 mi S of Lexington, KY');
  await page.selectOption('.stk-app select[name="yield"]', '1000');
  await run();
  await shot('run-lexington');
  console.log('status:', await page.locator('.statusbar, [role="status"]').last().innerText().catch(() => ''));
  console.log('register ->', await register('Exercise CONTINUITY 08, own-site case'));
  await shot('registered');
  await dismiss();

  // ALPHA-05: segment 04 in the egress basis.
  await setPoint('ALPHA-05');
  await run();
  await shot('run-alpha05');
  console.log('alpha05 row:', await page.locator('.stk-results tr', { hasText: 'ALPHA-05' }).first().innerText().catch(() => ''));
  console.log('register 2 ->', await register(''));
  await dismiss();

  // A withheld position.
  await setPoint('ALPHA-02');
  console.log('alpha02 ->', await page.locator('.stk-app .f-msg, .stk-app [role="alert"]').first().innerText().catch(() => '(no message)'));
  await shot('alpha02-refused');

  // Keyboard cursor on the map.
  await page.locator('.stk-mapframe').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');
  await wait(500);
  await shot('cursor');

  // Map click near Dallas (GAMMA-08).
  await setPoint('10 MI W OF DALLAS TX');
  await page.selectOption('.stk-app select[name="yield"]', '500');
  await run();
  await shot('run-dallas');

  await tab('Register');
  await shot('register');
  const rows = page.locator('.stk-reg tbody tr[aria-selected]');
  console.log('register rows:', await rows.count(), 'stored:', await page.evaluate(() => (localStorage.getItem('meridian:shared:strike') ?? 'none').slice(0, 120)));
  if ((await rows.count()) >= 2) {
    await rows.nth(0).click();
    await rows.nth(1).click({ modifiers: ['Control'] });
    await page.locator('.stk-reg [role="toolbar"] button', { hasText: 'Compare' }).click();
    await wait(600);
    await shot('compare');
    await tab('Register');
  }
  if (acct === 'auditor' && (await rows.count()) >= 1) {
    await rows.nth(0).click();
    await page.locator('.stk-reg [role="toolbar"] button', { hasText: 'Raise review query' }).click();
    await wait(300);
    console.log('query dlg:', await dlgText());
    await page.locator('.dlg button', { hasText: 'Raise query' }).click().catch(() => undefined);
    await wait(500);
    await shot('queried');
  }
  if (acct !== 'auditor' && (await rows.count()) >= 1) {
    await rows.nth(0).click();
    await page.locator('.stk-reg [role="toolbar"] button', { hasText: 'Withdraw' }).click();
    await wait(300);
    console.log('withdraw dlg:', await dlgText());
    await page.locator('.dlg button', { hasText: /^Withdraw$/ }).click().catch(() => undefined);
    await wait(400);
    await shot('withdrawn');
  }

  await tab('Model data');
  await shot('model');

  if (mobile) continue;
  await page.locator('.stk-app .menubar__item', { hasText: 'Help' }).first().click();
  await wait(200);
  await page.locator('.menu__item', { hasText: 'operating notes' }).first().click();
  await wait(2500);
  await shot('doc-pm3');
  if (mobile) continue;
  await page.locator('.stk-app .menubar__item', { hasText: 'Help' }).first().click();
  await wait(200);
  await page.locator('.menu__item', { hasText: 'register procedure' }).first().click();
  await wait(2500);
  await shot('doc-register');
}

}
console.log('errors:', errors.slice(0, 10));
console.log('foreign requests:', foreign.slice(0, 5));
await browser.close();
