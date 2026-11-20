// Rendered check for Shaft Hoist Control. Needs: npx vite --port 5308 --strictPort
// Usage (repo root): node src/apps/hoist/check/shoot.mjs <account> [mobile] [fresh] [drill] [iso]
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', 'localhost:5308'].join('/');
const acct = process.argv[2] ?? 'analyst';
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
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1400, height: 920 } });
// Other agents rebuild content while this runs; keep Vite's HMR socket from reloading the page.
await ctx.addInitScript(() => {
  const Real = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    if (protocols === 'vite-hmr' || (Array.isArray(protocols) && protocols.includes('vite-hmr'))) {
      const fake = new EventTarget();
      fake.readyState = 0;
      fake.send = () => undefined;
      fake.close = () => undefined;
      return fake;
    }
    return new Real(url, protocols);
  };
  Object.assign(window.WebSocket, Real);
});
const page = await ctx.newPage();
const errors = [];
const foreign = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
const tag = `${mobile ? 'm-' : ''}${acct}${drill ? '-drill' : ''}${iso ? '-iso' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const tb = (label) => page.locator('.hst [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first();
const tab = (label) => page.locator('.hst [role="tab"]', { hasText: label }).first();
const openTab = async (label) => {
  await tab(label).evaluate((el) => el.click());
  await wait(200);
};
const dlgText = async () => ((await page.locator('.dlg').count()) ? (await page.locator('.dlg').first().innerText()).replace(/\s+/g, ' ') : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const status = async () => (await page.locator('.hst .statusbar, .hst [role="status"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
const login = async () => {
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.hst', { timeout: 60000 });
  await wait(1500);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(400);
  }
};
// Panel kit buttons capture the pointer, so drive them with the real mouse.
const hold = async (loc, ms = 80) => {
  await loc.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await loc.boundingBox();
  if (!box) return console.log('no box for', String(loc));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await wait(ms);
  await page.mouse.up();
};
const press = async (aria) => {
  await hold(page.locator(`.hst button[aria-label="${aria}"]`).first());
  await wait(300);
};
const pressLegend = async (text) => {
  await hold(page.locator('.hst button', { hasText: new RegExp(`^\\s*${text.replace(/ /g, '\\s*')}\\s*$`) }).first());
  await wait(300);
};
const estop = async () => {
  const unit = page.locator('.hst .pk-guard, .hst [class*="guard"]').first();
  const cover = unit.locator('button').first();
  await cover.click();
  await wait(300);
  await hold(unit.locator('button').nth(1), 900);
  await wait(600);
};

await page.goto(BASE + '/hoist');
if (fresh) {
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('meridian:shared:hoist') || k.startsWith('meridian:shared:drill') || k.startsWith('meridian:shared:isolation')) localStorage.removeItem(k);
  });
}
if (drill || iso) {
  await page.evaluate(
    ({ drill, iso }) => {
      const now = Date.now();
      if (drill) {
        const s = { ordered: now, acknowledged: now + 500, sealed: now + 2000, status: 'sealed' };
        const d = { id: 'SD-08-0519-T', orderedAt: now, by: 'deputy', phase: 'sealed', sites: { 'ALPHA-02': s, 'ALPHA-03': s, 'ALPHA-01': s }, endedAt: null };
        localStorage.setItem('meridian:shared:drill', JSON.stringify(d));
      }
      if (iso) localStorage.setItem('meridian:shared:isolation', JSON.stringify({ level: 1, initiations: [{ at: '2008-05-19T14:00:00Z', by: 'analyst', ref: 'HS-0001/08-001' }], active: true, clearsAt: now + 600000 }));
    },
    { drill, iso },
  );
}
// The shared store reads localStorage at boot; reload so injected or cleared state is seen.
if (fresh || drill || iso) await page.reload();
await login();
if (drill || iso) console.log('shared after login ->', await page.evaluate(() => [localStorage.getItem('meridian:shared:isolation'), localStorage.getItem('meridian:shared:drill')]));
await shot('home');

if (acct === 'lifesupport') {
  await tb('Procedure').click();
  await wait(1500);
  console.log('procedure ->', (await page.locator('.hst-main').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await shot('procedure-refused');
} else if (acct === 'analyst' || acct === 'auditor') {
  await openTab('Call stations');
  await wait(400);
  await shot('calls');
  // restricted landing (Tier 2) -> refusal + mail
  await press(`Call ${acct === 'analyst' ? 'A03' : 'A01'}-H1 to landing 9`);
  console.log('restricted call ->', await dlgText());
  await shot('restricted-refusal');
  await dismiss();
  // ordinary call -> cage moves in AUTO
  await press(`Call ${acct === 'analyst' ? 'A03' : 'A01'}-H1 to landing ${acct === 'analyst' ? 12 : 13}`);
  await wait(4000);
  await shot('auto-running');
  console.log('status ->', await status());
  // driver console refused
  await openTab("Driver's console");
  await wait(300);
  await pressLegend('RUN');
  console.log('run ->', await dlgText());
  await dismiss();
  await shot('console');
  // emergency stop at own site
  await estop();
  console.log('estop dialog ->', await dlgText());
  await wait(1500);
  await shot('estop');
  console.log('status ->', await status());
  // ALPHA-02 from here: display only
  await page.locator('.hst [role="toolbar"] select').first().selectOption('ALPHA-02');
  await wait(600);
  await openTab('Call stations');
  await wait(300);
  await press('Call A02-H1 to landing 3');
  console.log('remote call ->', await dlgText());
  await dismiss();
  await openTab('Event recorder');
  await page.locator('.hst-rec select').first().selectOption('all');
  await wait(500);
  await shot('recorder');
  await page.locator('.hst [role="toolbar"] select').first().selectOption(acct === 'analyst' ? 'ALPHA-03' : 'ALPHA-01');
  await wait(400);
  await openTab('Shaft data');
  await wait(500);
  await shot('shaft-data');
  await tb('Data sheet').click();
  await wait(2000);
  await shot('data-sheet');
} else if (acct === 'deputy') {
  await shot('console');
  await tb('H2').click();
  await wait(500);
  await shot('h2');
  // brake test at the bottom landing
  await pressLegend('BRAKE TEST');
  console.log('brake ->', await dlgText(), await status());
  await wait(13500);
  await shot('brake-done');
  // INSPECT mode, inch down to the sump vane
  const key = page.locator('.hst [role="slider"]').first();
  await key.focus();
  await page.keyboard.press('End');
  await wait(400);
  console.log('mode ->', await status());
  const inch = page.locator('.hst button', { hasText: /INCH\s*DOWN/ }).first();
  await hold(inch, 19500);
  await wait(4500);
  await shot('sump');
  console.log('sump ->', await status());
  await page.locator('.hst [role="switch"]').first().click();
  await wait(300);
  console.log('gates at sump ->', await dlgText());
  await dismiss();
  await key.focus();
  await page.keyboard.press('ArrowLeft');
  await wait(400);
  // run back to landing 9
  await press('Select landing 9');
  await pressLegend('RUN');
  console.log('run ->', await dlgText(), await status());
  await dismiss();
  await wait(4000);
  await shot('running');
  await wait(30000);
  console.log('at 9 ->', await status());
  // open gates, overload
  await page.locator('.hst [role="switch"]').first().click();
  await wait(300);
  for (let i = 0; i < 7; i++) await pressLegend('PERS \\+');
  for (let i = 0; i < 16; i++) await pressLegend('FRT \\+');
  await wait(600);
  await shot('overload');
  await page.locator('.hst [role="switch"]').first().click();
  await wait(300);
  await press('Select landing 2');
  await pressLegend('RUN');
  console.log('run overloaded ->', await dlgText());
  await dismiss();
  await page.locator('.hst [role="switch"]').first().click();
  await wait(300);
  for (let i = 0; i < 16; i++) await pressLegend('FRT -');
  for (let i = 0; i < 7; i++) await pressLegend('PERS -');
  await page.locator('.hst [role="switch"]').first().click();
  await wait(300);
  await pressLegend('RUN');
  await wait(5000);
  await pressLegend('STOP');
  await wait(5000);
  await shot('stopped');
  console.log('stopped ->', await status());
  await estop();
  await wait(1000);
  await shot('estop');
  await pressLegend('TRIP RESET');
  await wait(500);
  console.log('reset ->', await status());
  await openTab('Shaft data');
  await wait(400);
  await shot('shaft-data');
  await openTab('Event recorder');
  await wait(400);
  await shot('recorder');
  await tb('Procedure').click();
  await wait(2000);
  await shot('procedure');
}

console.log('errors:', errors.slice(0, 10));
console.log('foreign:', foreign.slice(0, 5));
await browser.close();
