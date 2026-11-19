// Rendered check for the Public Address console. Needs: npx vite --port 5310 --strictPort
// Usage (repo root): node src/apps/pa/check/shoot.mjs <account> [mobile] [fresh]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PA_BASE ?? ['http:', '', 'localhost:5310'].join('/');
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
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 820 } : { width: 1400, height: 940 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${mobile ? 'm-' : ''}${acct}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const app = () => page.locator('.pa-app').last();
const dialogText = async () => {
  const d = page.locator('.dlg').last();
  return (await d.count()) ? (await d.innerText()).replace(/\s+/g, ' ').slice(0, 300) : '';
};
const press = async (label) => {
  const b = app().locator(`button.pk-pb__btn[aria-label*="${label}"]`).first();
  await b.focus();
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await wait(350);
};
const dismiss = async (which = /^(OK|Cancel)$/) => {
  const b = page.locator('.dlg__buttons button').filter({ hasText: which });
  if (await b.count()) await b.first().click();
  await wait(250);
};
const toolbar = (label) => app().locator('[role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const helpItem = async (text) => {
  await app().locator('.menubar button, [role="menubar"] [role="menuitem"]', { hasText: 'Help' }).first().click();
  await wait(200);
  await page.locator('[role="menuitem"]', { hasText: text }).first().click();
};
const log = (...a) => console.log(`[${tag}]`, ...a);

await page.goto(BASE + '/pa');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:pa') || k.includes(':mail')) localStorage.removeItem(k);
  });
}
await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
await page.click(`.lock-cardopt[data-account="${acct}"]`);
await page.fill('#lock-op', CARDS[acct][0]);
await page.fill('#lock-pass', CARDS[acct][1]);
await page.press('#lock-pass', 'Enter');
await page.waitForSelector('.pa-app', { timeout: 60000 });
await wait(1500);
if (!mobile) {
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(400);
}
await shot('01-console');

const zone = async (text) => {
  const cb = app().locator('.pa-zone', { hasText: text }).first().locator('input[type="checkbox"]');
  await cb.check({ force: true }).catch(async () => cb.click({ force: true }));
  await wait(150);
};
const pickMsg = async (no) => {
  await app().locator('.pa-library tr', { has: page.locator(`td:text-is("${no}")`) }).first().click();
  await wait(150);
};

const plant = process.argv.includes('plant');
if (plant) {
  // Inject a seal drill and a network isolation into the shared store, as their owners would.
  await page.evaluate(() => {
    const now = Date.now();
    const put = (key, value) => {
      const raw = JSON.stringify(value);
      localStorage.setItem('meridian:shared:' + key, raw);
      new BroadcastChannel('meridian-shared').postMessage({ key, raw });
    };
    put('drill', {
      id: 'SD-08-0519-01', orderedAt: now - 20000, by: 'deputy', phase: 'propagating', endedAt: null,
      sites: {
        'ALPHA-01': { ordered: now - 20000, acknowledged: now - 16000, sealed: now - 2000, status: 'sealed' },
        'ALPHA-02': { ordered: now - 18000, acknowledged: now - 14000, sealed: null, status: 'sealing' },
        'GAMMA-08': { ordered: now - 16000, acknowledged: null, sealed: null, status: 'pending' },
      },
    });
    const z = new Date(now - 5000).toISOString().slice(10);
    put('isolation', { level: 1, initiations: [{ at: '2008-05-19' + z, by: 'analyst', ref: 'NI-08-0001' }], active: true, clearsAt: now + 600000 });
  });
  await wait(2500);
  await shot('20-plant-console');
  await zone('Z05');
  await pickMsg('16');
  await press('BROADCAST');
  log('routine in drill ->', await dialogText());
  await dismiss();
  await toolbar('Log').click();
  await wait(500);
  await shot('21-plant-log');
  await toolbar('Zones').click();
  await wait(300);
  await app().locator('select').first().selectOption('ALPHA-05');
  await wait(300);
  await shot('22-plant-zones-remote');
} else if (acct === 'deputy') {
  await zone('Z05');
  await pickMsg('16');
  await press('BROADCAST');
  log('broadcast 16 ->', await dialogText());
  await wait(1200);
  await shot('02-onair');
  // Life safety all-call pre-empts it.
  await press('ALL CALL');
  await pickMsg('01');
  await press('BROADCAST');
  log('confirm ->', await dialogText());
  await shot('03-confirm');
  await dismiss(/Broadcast/);
  await wait(1200);
  await shot('04-preempt');
  await press('ALL CALL');
  // Restricted level (T2) selective call.
  await zone('Z08');
  await pickMsg('22');
  await press('BROADCAST');
  log('restricted ->', await dialogText());
  await dismiss();
  // Zone 00.
  await app().locator('.pa-zone', { hasText: 'Z05' }).first().locator('input').uncheck({ force: true });
  await app().locator('.pa-zone', { hasText: 'Z08' }).first().locator('input').uncheck({ force: true });
  await zone('Z00');
  await press('BROADCAST');
  log('zone00 ->', await dialogText());
  await shot('05-zone00');
  await dismiss();
  // Network key.
  await app().locator('[role="slider"][aria-label*="NETWORK"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await wait(300);
  log('network ->', await dialogText());
  await dismiss();
  // Other site.
  await app().locator('.pa-zones select').first().selectOption('ALPHA-05');
  await wait(300);
  await zone('Z01');
  await pickMsg('16');
  await press('BROADCAST');
  log('other site ->', await dialogText());
  await dismiss();
  await app().locator('.pa-zones select').first().selectOption('ALPHA-02');
  await wait(200);
  // Zone tone test (outside window most of the time).
  await zone('Z03');
  await app().locator('[role="slider"][aria-label*="MODE"]').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await press('TEST');
  log('test ->', await dialogText());
  await shot('06-test-confirm');
  await dismiss(/Key test/);
  await wait(500);
  // Cancel the selected call.
  await press('CANCEL');
  log('cancel ->', await dialogText());
  await dismiss();
  await shot('07-after');
  await toolbar('Log').click();
  await wait(500);
  await app().locator('.pa-log tbody tr').first().click();
  await wait(300);
  await shot('08-log');
  await app().locator('select').nth(1).selectOption('record');
  await wait(300);
  await app().locator('.pa-log tbody tr', { hasText: 'PA-0513-0007' }).first().click();
  await wait(300);
  await shot('09-log-record40');
  await toolbar('Zones').click();
  await wait(400);
  await shot('10-zones');
}

if (acct === 'analyst') {
  await zone('A03-RD');
  await pickMsg('11');
  await press('BROADCAST');
  log('rd broadcast ->', await dialogText());
  await wait(800);
  await shot('02-rd');
  await zone('Z02');
  await press('BROADCAST');
  log('other zone ->', await dialogText());
  await shot('03-refused');
  await dismiss();
  await toolbar('Zones').click();
  await wait(300);
  await app().locator('select').first().selectOption('ALPHA-02');
  await wait(400);
  await shot('04-zones-a02');
  await toolbar('Log').click();
  await wait(400);
  await shot('05-log');
}

if (acct === 'lifesupport' && !mobile) {
  await zone('Z02');
  await pickMsg('01');
  await press('BROADCAST');
  log('life safety ->', await dialogText());
  await shot('02-refused');
  await dismiss();
  await pickMsg('03');
  await press('BROADCAST');
  log('filtered ->', await dialogText());
  await wait(800);
  await shot('03-onair');
  await toolbar('Log').click();
  await wait(400);
  await shot('04-log');
  await toolbar('Zones').click();
  await wait(400);
  await shot('05-zones');
  await helpItem('Operating procedure');
  await wait(2500);
  await shot('06-dir-refused');
  await helpItem('Message library');
  await wait(2500);
  await shot('07-kb');
}

if (acct === 'auditor' && !mobile) {
  await zone('A01-OIA');
  await press('BROADCAST');
  log('auditor ->', await dialogText());
  await shot('02-refused');
  await dismiss();
  await toolbar('Log').click();
  await wait(400);
  await shot('03-log');
  await helpItem('Operating procedure');
  await wait(2500);
  await shot('04-dir');
}

const mail = await page.evaluate(() => {
  const out = {};
  for (const k of Object.keys(localStorage)) if (k.includes('mail')) out[k] = localStorage.getItem(k)?.slice(0, 400);
  return out;
});
log('mail keys', JSON.stringify(mail).slice(0, 900));
log('errors', errors.length ? errors.join('\n') : 'none');
await browser.close();
