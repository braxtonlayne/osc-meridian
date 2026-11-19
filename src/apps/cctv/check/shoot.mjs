// Rendered check for Facility Video. Needs: npx vite --port 5304 --strictPort
// Usage (repo root): node src/apps/cctv/check/shoot.mjs <account> [mobile] [plant]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', `localhost:${process.env.PORT ?? 5304}`].join('/');
const acct = process.argv[2] ?? 'analyst';
const mobile = process.argv.includes('mobile');
const plant = process.argv.includes('plant');
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};
const canon = JSON.parse(readFileSync(join(here, '../../../../content/canon/canon.json'), 'utf8'));
const h2 = canon.hoists.find((h) => h.id === 'A02-H2');
const vane = canon.apps.hoist.sumpVanes.find((v) => v.hoist === 'A02-H2');
const sumpFt = h2.stops[h2.stops.length - 1].depthFt + vane.belowBottomFt;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1400, height: 920 } });
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
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const tag = `${mobile ? 'm-' : ''}${acct}${plant ? '-plant' : ''}`;
const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
const wait = (ms) => page.waitForTimeout(ms);
const tb = (label) => page.locator('.cctv [role="toolbar"] button', { hasText: new RegExp(`^\\s*${label}\\s*$`) }).first();
const dlgText = async () => ((await page.locator('.dlg').count()) ? (await page.locator('.dlg').first().innerText()).replace(/\s+/g, ' ') : '');
const dismiss = async () => {
  const ok = page.locator('.dlg button').filter({ hasText: /^(OK|Close|Cancel)$/ });
  if (await ok.count()) await ok.first().click();
  await wait(200);
};
const status = async () => (await page.locator('.cctv .statusbar, .cctv [role="status"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
const treeItem = (text) => page.locator('.cctv-tree .tree__row', { hasText: text }).first();
const expand = async (text) => {
  const it = treeItem(text);
  await it.click();
  await page.keyboard.press('ArrowRight');
  await wait(150);
};
const activate = async (text) => {
  const it = treeItem(text);
  await it.scrollIntoViewIfNeeded();
  await it.click();
  await page.keyboard.press('Enter');
  await wait(700);
};
const menu = async (top, item) => {
  await page.locator('.cctv [role="menubar"] [role="menuitem"]', { hasText: new RegExp(`^${top}$`) }).first().click();
  await wait(150);
  await page.locator('[role="menu"] [role="menuitem"], [role="menu"] [role="menuitemradio"], [role="menu"] [role="menuitemcheckbox"]', { hasText: item }).first().click();
  await wait(500);
};

await page.goto(BASE + '/cctv');
await page.evaluate(
  ({ plant, sumpFt }) => {
    for (const k of Object.keys(localStorage)) if (/^meridian:shared:(cctv|muster|hoist|drill|isolation)/.test(k)) localStorage.removeItem(k);
    if (!plant) return;
    const now = Date.now();
    localStorage.setItem('meridian:shared:muster', JSON.stringify({ runs: [{ id: 'MU-T', site: 'ALPHA-02', startedAt: now - 30000, by: 'deputy', drillId: null, sweeps: [], closeout: null, notices: [] }], seq: 1 }));
    localStorage.setItem('meridian:shared:hoist', JSON.stringify({ v: 1, seq: 1, units: { 'A02-H2': { posFt: sumpFt, motion: null, gates: 'open', mode: 'manual', calls: [], persons: 0, freightLb: 0, trip: null } }, events: [] }));
    const s = { ordered: now - 60000, acknowledged: now - 50000, sealed: now - 20000, status: 'sealed' };
    localStorage.setItem('meridian:shared:drill', JSON.stringify({ id: 'SD-08-0519-T', orderedAt: now - 60000, by: 'deputy', phase: 'sealed', sites: { 'ALPHA-02': s, 'ALPHA-03': s, 'ALPHA-01': s }, endedAt: null }));
  },
  { plant, sumpFt },
);
await page.reload();
await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
await page.click(`.lock-cardopt[data-account="${acct}"]`);
await page.fill('#lock-op', CARDS[acct][0]);
await page.fill('#lock-pass', CARDS[acct][1]);
await page.press('#lock-pass', 'Enter');
await page.waitForSelector('.cctv', { timeout: 60000 });
await wait(1500);
if (!mobile) {
  await page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(800);
}
await shot('home');
console.log('status ->', await status());
console.log('sites ->', (await page.locator('.cctv-tree [role="treeitem"][aria-level="1"]').allInnerTexts()).join(' | ').replace(/\s+/g, ' '));

if (mobile) {
  await tb('Cameras').click();
  await wait(300);
  await shot('cameras');
  await tb('Cameras').click();
} else {
  // layouts
  await tb('9').click();
  await wait(1200);
  await shot('nine');
  await tb('16').click();
  await wait(1500);
  await shot('sixteen');
  await tb('4').click();
  await wait(600);

  if (acct === 'analyst' || acct === 'deputy' || acct === 'auditor') {
    // A02 platform 3 (seg04 platform; muster figures when the plant flag is on)
    for (const id of ['ALPHA-01', 'ALPHA-03']) {
      const li = page.locator('.cctv-tree [role="treeitem"][aria-level="1"][aria-expanded="true"]', { has: page.locator('.tree__row', { hasText: id }) });
      if (await li.count()) {
        await treeItem(id).click();
        await page.keyboard.press('ArrowLeft');
      }
    }
    await expand('ALPHA-02');
    await expand('Level 11');
    await activate('A02-C24');
    await tb('1').click();
    await wait(1200);
    await shot('a02-c24');
    console.log('a02-c24 status ->', await status());
    console.log('dialog ->', await dlgText());
    await dismiss();
    // recorder view: CH16
    await menu('View', 'by recorder');
    await expand('ALPHA-02');
    await expand('DVR-A02-2');
    await activate('CAM16');
    await wait(800);
    await shot('ch16');
    console.log('ch16 status ->', await status());
    await menu('View', 'by site and level');
    // refused: BETA-04 interior cameras (three times, for the OIA message)
    for (let k = 0; k < 3; k++) {
      await menu('Site', 'BETA-04');
      console.log('beta ->', await dlgText());
      if (k === 0) await shot('beta');
      await dismiss();
    }
  }
  // PTZ on own site: first PTZ camera with presets
  await menu('Site', 'own site');
  await tb('4').click();
  await page.locator('.cctv-tile').first().click();
  const preset2 = page.locator('.cctv-presets button').nth(1);
  if (!(await preset2.count())) {
    // pick a PTZ camera from the own site
    const ptz = page.locator('.cctv-tree .tree__row', { hasText: 'PTZ' }).first();
    if (await ptz.count()) {
      await ptz.click();
      await page.keyboard.press('Enter');
      await wait(500);
    }
  }
  if (await preset2.count()) {
    await preset2.click();
    await wait(2500);
    await shot('ptz');
    console.log('ptz ->', await status(), '|', await dlgText());
    await dismiss();
  }
  // playback
  await tb('Playback').click();
  await wait(2500);
  await shot('playback');
  console.log('playback ->', await status());
  const ev = page.locator('.cctv-ev').first();
  if (await ev.count()) {
    await ev.click();
    await wait(1200);
    await shot('playback-event');
  }
  await tb('Live').click();
  await wait(400);
  // still
  await page.locator('.cctv-wall').focus();
  await page.keyboard.press('Control+s');
  await wait(600);
  await shot('still');
  console.log('still ->', await dlgText());
  await page.locator('.dlg button', { hasText: 'Print' }).first().click().catch(() => undefined);
  await wait(2500);
  console.log('after print ->', await status());
}
// documents
await tb('Instructions').click();
await wait(1500);
await shot('instructions');
console.log('instructions ->', (await page.locator('.cctv-main').innerText()).replace(/\s+/g, ' ').slice(0, 160));
await tb('Rules').click();
await wait(1500);
await shot('rules');
console.log('rules ->', (await page.locator('.cctv-main').innerText()).replace(/\s+/g, ' ').slice(0, 160));

console.log('mail ->', (await page.locator('.taskbar, [class*="tray"]').first().innerText().catch(() => '')).replace(/s+/g, ' '));
console.log('audit ->', await page.evaluate(() => JSON.stringify(Object.keys(localStorage).filter((k) => /audit/.test(k)).length)));
console.log('errors ->', errors.slice(0, 8));
await browser.close();
