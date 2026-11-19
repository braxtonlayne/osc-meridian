// Rendered check for the Hub Circuit Patch Panel. Needs: npx vite --port 5312 --strictPort
// Usage (repo root): node src/apps/patch/check/shoot.mjs <account> [mobile] [iso]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', 'localhost:5312'].join('/'); // dev server only
const acct = process.argv[2] ?? 'analyst';
const mobile = process.argv.includes('mobile');
const iso = process.argv.includes('iso');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1400, height: 940 } });
const page = await ctx.newPage();
const errors = [];
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
const tag = `${mobile ? 'm-' : ''}${acct}${iso ? '-iso' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const tb = (label) => page.locator('.pt-app [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const dlgText = async () => ((await page.locator('.dlg').count()) ? await page.locator('.dlg').first().innerText() : '');
const dlgBtn = async (re) => {
  const b = page.locator('.dlg button').filter({ hasText: re });
  if (await b.count()) await b.first().click();
  await wait(250);
};
const jack = async (id) => {
  await page.locator(`[data-jack="${id}"]`).first().click();
  await wait(200);
};
const patch = async (a, b) => {
  await jack(a);
  await jack(b);
  await wait(400);
};
const btn = (re) => page.locator('.pt-app').getByRole('button', { name: re }).first();
const status = async () => (await page.locator('.pt-app .statusbar, .pt-app [role="status"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
const login = async () => {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.pt-app', { timeout: 60000 });
  await wait(1200);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(400);
  }
};

await page.goto(BASE + '/patch');
await page.evaluate((iso) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:patch')) localStorage.removeItem(k);
  if (iso) localStorage.setItem('meridian:shared:isolation', JSON.stringify({ active: true, since: Date.now(), by: 'deputy', reason: 'check' }));
}, iso);
await page.reload();
await login();
await shot('bay');

if (acct === 'analyst') {
  // test the noisy trunk
  await patch('A03/TST', 'T05-V2/L');
  await shot('test-set');
  console.log('dialog after TST ->', await dlgText());
  await dlgBtn(/^(OK|Close)$/);
  // quality run
  await page.locator('.pt-app [role="radiogroup"], .pt-app [role="slider"]').first().focus().catch(() => undefined);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await wait(200);
  await btn(/START/).click().catch((e) => console.log('start fail', String(e).slice(0, 120)));
  await wait(3000);
  await shot('quality-running');
  await wait(30000);
  await shot('quality-done');
  console.log('status ->', await status());
  // remove the test cord
  await jack('A03/TST');
  await page.keyboard.press('Delete');
  await wait(400);
  // repatch without order
  await patch('T05-V2/E', 'T05-SP1/L');
  console.log('repatch ask ->', await dlgText());
  await shot('repatch-ask');
  await dlgBtn(/Patch without order/);
  await wait(600);
  await shot('repatch');
  // call 7411 on T05-V1
  await patch('A03/OPR', 'T05-V1/L');
  await wait(800);
  for (const d of '7411') {
    await page.keyboard.press(d);
    await wait(250);
  }
  await wait(4000);
  await shot('call-ringing');
  await wait(26000);
  await shot('call-answered');
  await wait(8000);
  // remote bay refused
  await page.locator('.pt-bay-select select').first().selectOption('ALPHA-05');
  await wait(600);
  await shot('remote-a05');
  await patch('A05/TST', 'T05-V2/L');
  console.log('remote ->', await dlgText());
  await dlgBtn(/^(OK|Close)$/);
  await tb('Circuits').click();
  await wait(500);
  await shot('circuits');
  await tb('Line quality').click();
  await wait(500);
  await shot('quality');
  await tb('Bay log').click();
  await wait(500);
  await shot('log');
  await page.goto(BASE + '/patch/operating-instructions');
  await page.waitForSelector('.pt-app, .lock-cardopt', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(1500);
  await shot('doc');
  await page.goto(BASE + '/mail');
  await wait(1500);
  if (await page.locator('.lock-cardopt').count()) { await page.click('.lock-cardopt[data-account="' + acct + '"]'); await page.fill('#lock-op', CARDS[acct][0]); await page.fill('#lock-pass', CARDS[acct][1]); await page.press('#lock-pass', 'Enter'); }
  await wait(3000);
  await shot('mail');
} else if (acct === 'deputy') {
  await patch('T03-V1/E', 'T03-SP1/L');
  console.log('deputy repatch dialog ->', await dlgText());
  await shot('repatch');
  await patch('A02/TST', 'T04-SP1/L');
  await btn(/START/).click().catch(() => undefined);
  await wait(6000);
  await shot('sp1-test');
  await jack('A02/TST');
  await page.keyboard.press('Delete');
  await wait(300);
  await patch('A02/OPR', 'T04-SP1/L');
  await wait(20000);
  await shot('sp1-ringdown');
  await wait(8000);
  console.log('dlg ->', await dlgText(), 'selects', await page.locator('.pt-app select').count(), await page.locator('.pt-bay-select').count());
  await shot('sp1-after');
  await page.locator('.pt-bay-select select').first().selectOption('ALPHA-05');
  await wait(600);
  await shot('remote-a05');
  await tb('Circuits').click();
  await wait(400);
  await shot('circuits');
} else if (acct === 'auditor') {
  await patch('A01/TST', 'T02-V1/L');
  console.log('auditor test ->', await dlgText());
  await shot('refused');
  await dlgBtn(/^(OK|Close)$/);
  await page.locator('.pt-bay-select select').first().selectOption('ALPHA-02');
  await wait(600);
  await patch('A02/MON', 'T04-SP1/L');
  console.log('auditor monitor ->', await dlgText());
  await wait(800);
  await shot('monitor');
} else {
  // lifesupport
  await patch('G08/OPR', 'G08-M1/L');
  await wait(10000);
  await shot('m1-call');
  await wait(10000);
  await shot('m1-answered');
  await page.keyboard.press('Control+r');
  await wait(400);
  const other = await page.locator('[data-jack$="/L"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-jack')));
  console.log('t4 jacks ->', other);
  const notM1 = other.find((j) => j && !j.startsWith('G08-M1'));
  if (notM1) {
    await patch('G08/TST', notM1);
    console.log('t4 other ->', await dlgText());
    await shot('refused');
    await dlgBtn(/^(OK|Close)$/);
  }
  await tb('Circuits').click();
  await wait(400);
  await shot('circuits');
  await page.goto(BASE + '/patch/maintenance-circuit');
  await page.waitForSelector('.pt-app, .lock-cardopt', { timeout: 30000 });
  if (await page.locator('.lock-cardopt').count()) await login();
  await wait(1500);
  await shot('doc');
}

console.log('status final ->', await status());
console.log('errors:', errors.slice(0, 10));
console.log('foreign:', foreign.slice(0, 5));
await browser.close();
