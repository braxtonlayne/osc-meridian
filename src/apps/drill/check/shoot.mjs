// Rendered check for the Seal Drill Coordinator. Needs a server on 5303: npx vite --port 5303 --strictPort,
// or (steadier while other agents rebuild content) npx vite build --outDir <dir> then npx vite preview --outDir <dir> --port 5303
// Usage (repo root): node src/apps/drill/check/shoot.mjs
// Runs a whole drill as the deputy, then looks at it as the technician, the auditor and the
// analyst (each in its own browser context seeded with the shared plant keys), then a handheld pass.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5303'].join('/'); // local dev or preview server only
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};
const only = process.argv[2];
const browser = await chromium.launch();
const errors = [];
const foreign = [];
const wait = (p, ms) => p.waitForTimeout(ms);

async function open(acct, { mobile = false, seed = null, restartIn = 0 } = {}) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 820 } : { width: 1440, height: 900 } });
  if (seed) {
    await ctx.addInitScript((s) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      for (const [k, v] of Object.entries(s.seed)) localStorage.setItem(k, v);
      // restartIn: replay the seeded drill from its order, starting that many ms from now
      if (s.restartIn) {
        const d = JSON.parse(localStorage.getItem('meridian:shared:drill') ?? 'null');
        if (d) localStorage.setItem('meridian:shared:drill', JSON.stringify({ ...d, orderedAt: Date.now() + s.restartIn, tickedAt: Date.now() }));
      }
    }, { seed, restartIn });
  }
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${acct}: ${String(e)}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${acct}: ${m.text()}`));
  page.on('request', (r) => !r.url().startsWith(BASE) && !r.url().startsWith('data:') && foreign.push(r.url()));
  await page.goto(BASE + '/drill');
  await page.waitForSelector('.lock-cardopt', { timeout: 30000 });
  await page.click(`.lock-cardopt[data-account="${acct}"]`);
  await page.fill('#lock-op', CARDS[acct][0]);
  await page.fill('#lock-pass', CARDS[acct][1]);
  await page.press('#lock-pass', 'Enter');
  await page.waitForSelector('.sd-root', { timeout: 60000 });
  await wait(page, 1200);
  if (!mobile) {
    await page.locator('.win-title').last().dblclick().catch(() => undefined);
    await wait(page, 400);
  }
  const tag = `${mobile ? 'm-' : ''}${acct}`;
  const shot = (name) => page.screenshot({ path: join(here, `${tag}-${name}.png`) });
  const tb = async (label) => {
    await page.locator('.sd-root [role="toolbar"] button', { hasText: new RegExp(`^${label}$`) }).first().click();
    await wait(page, 500);
  };
  const dlg = async () => ((await page.locator('.dlg').count()) ? (await page.locator('.dlg').first().innerText()).replace(/\s+/g, ' ') : '');
  const dismiss = async () => {
    const b = page.locator('.dlg button').filter({ hasText: /^(OK|Cancel)$/ });
    if (await b.count()) await b.first().click();
    await wait(page, 250);
  };
  const press = async (name) => {
    const b = page.locator(`.sd-root button[aria-label="${name}"]`).first();
    await b.click();
    await wait(page, 300);
  };
  const shared = () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('meridian:shared:')).map((k) => [k, localStorage.getItem(k)])));
  return { ctx, page, shot, tb, dlg, dismiss, press, shared };
}

const log = (...a) => console.log(...a);

/* ---------------- deputy: order and run a drill ---------------- */
const D = await open('deputy');
await D.shot('home-map');
await D.tb('Line diagram');
await D.shot('home-mimic');
await D.tb('Map');
// Order: key, cover, hold, dialog
const key = D.page.locator('.sd-root [role="slider"][aria-label^="ORDER AUTHORITY"]');
await key.focus();
await D.page.keyboard.press('ArrowRight');
await wait(D.page, 300);
await D.page.locator('.sd-root button[aria-label^="Lift guard cover"]').click();
await wait(D.page, 300);
const act = D.page.locator('.sd-root [aria-label^="Press and hold"]');
await act.focus();
await D.page.keyboard.down('Space');
await wait(D.page, 2400);
await D.page.keyboard.up('Space');
await wait(D.page, 400);
await D.shot('order-dialog');
const title = await D.page.locator('.dlg').first().innerText();
const id = /SD-\d{2}-\d{4}-\d{2}/.exec(title)?.[0];
log('dialog drill id', id);
// first try a wrong read-back
await D.page.locator('.dlg button', { hasText: 'Issue order' }).click();
await wait(D.page, 300);
await D.shot('order-dialog-errors');
await D.page.locator('.dlg select').selectOption({ index: 1 });
await D.page.locator('.dlg input[type="text"]').fill(id);
await D.page.locator('.dlg input[type="checkbox"]').check();
await D.page.locator('.dlg button', { hasText: 'Issue order' }).click();
const t0 = Date.now();
await wait(D.page, 5000);
await D.shot('drill-map-t2');
await D.tb('Timeline');
await wait(D.page, 3000);
await D.shot('drill-timeline-t4');
await D.tb('Line diagram');
await wait(D.page, 4000);
await D.shot('drill-mimic-t6');
await D.tb('Messages');
await wait(D.page, 500);
await D.shot('drill-log');
// query the ALPHA-05 acknowledgement
const row = D.page.locator('.sd-log tr', { hasText: 'ALPHA-05 SEALING' }).first();
await row.click();
await wait(D.page, 300);
await D.shot('drill-log-selected');
await D.page.locator('.sd-linebar button').click();
await wait(D.page, 400);
log('query:', await D.dlg());
await D.dismiss();
// Seed the other accounts mid-drill
const seedMid = await D.shared();

/* ---------------- technician (GAMMA-08) ---------------- */
if (!only || only === 'lifesupport') {
  const L = await open('lifesupport', { seed: seedMid, restartIn: 5000 });
  // wait until the order has reached GAMMA-08 but before it would acknowledge by itself
  const g08 = (key) => L.page.evaluate((k) => { const d = JSON.parse(localStorage.getItem('meridian:shared:drill')); const p = d.plan['GAMMA-08']; return { t: (Date.now() - d.orderedAt) / d.msPerMin, at: p[k], ack: p.ack, doorsDone: p.doorsDone, sealed: p.sealed }; }, key);
  const until = async (key, lead) => { for (let i = 0; i < 200; i++) { const g = await g08(key); if (g.at !== null && g.t >= g.at + lead) return g; await wait(L.page, 100); } return g08(key); };
  log('g08 before ack', JSON.stringify(await until('receipt', 0.2)));
  await L.shot('site');
  await L.press('ACKNOWLEDGE: ACK ORDER');
  log('t4 ack:', await L.dlg());
  await L.dismiss();
  log('g08 before report', JSON.stringify(await until('doorsDone', 0.2)));
  await L.shot('site-sealing');
  await L.press('REPORT: REPORT SEALED');
  log('t4 report:', await L.dlg());
  await L.dismiss();
  await L.tb('Messages');
  await L.shot('log');
  await L.tb('Timeline');
  await L.shot('timeline');
  await L.tb('Register');
  await L.shot('register');
  await L.tb('Action card');
  await wait(L.page, 800);
  await L.shot('card');
  await L.page.goto(BASE + '/drill/procedure');
  await wait(L.page, 2500);
  await L.shot('procedure-refused');
  await L.ctx.close();
}

/* ---------------- auditor ---------------- */
if (!only || only === 'auditor') {
  const A = await open('auditor', { seed: seedMid });
  await A.press('OIA OBSERVER');
  log('auditor observe:', await A.dlg());
  await A.dismiss();
  await A.shot('observing');
  const k = A.page.locator('.sd-root [role="slider"][aria-label^="ORDER AUTHORITY"]');
  await k.focus();
  await A.page.keyboard.press('ArrowRight');
  await wait(A.page, 300);
  log('auditor key:', await A.dlg());
  await A.shot('key-refused');
  await A.dismiss();
  await A.tb('Register');
  await A.shot('register');
  await A.ctx.close();
}

/* ---------------- analyst ---------------- */
if (!only || only === 'analyst') {
  const N = await open('analyst', { seed: seedMid });
  await N.shot('map');
  const k = N.page.locator('.sd-root [role="slider"][aria-label^="ORDER AUTHORITY"]');
  await k.focus();
  await N.page.keyboard.press('ArrowRight');
  await wait(N.page, 300);
  log('analyst key:', await N.dlg());
  await N.shot('key-refused');
  await N.dismiss();
  await wait(N.page, 600);
  const mail = await N.page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('mail')).map((k) => `${k}=${(localStorage.getItem(k) ?? '').slice(0, 300)}`));
  log('analyst mail keys:', mail.join('\n'));
  await N.ctx.close();
}

/* ---------------- deputy: hold, stand down ---------------- */
const remaining = 50_000 - (Date.now() - t0);
if (remaining > 0) await wait(D.page, remaining);
await D.tb('Timeline');
await D.shot('drill-timeline-sealed');
await D.tb('Map');
await D.shot('drill-map-sealed');
await D.press('STAND DOWN');
log('stand down:', await D.dlg());
await wait(D.page, 800);
await D.shot('stood-down');
await D.tb('Register');
await D.shot('register');
await D.tb('Messages');
await D.shot('log-end');
const state = await D.page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('meridian:shared:drill') ?? 'null');
  const r = JSON.parse(localStorage.getItem('meridian:shared:drill-register') ?? '[]');
  return { phase: d?.phase, endedBy: d?.endedBy, statuses: Object.fromEntries(Object.entries(d?.sites ?? {}).map(([k, v]) => [k, v.status])), reg: r.map((x) => ({ id: x.id, phase: x.phase, sealed: x.sealed, late: x.late, noReport: x.noReport, seq: x.outOfSequence, mailed: x.mailed })) };
});
log(JSON.stringify(state, null, 1));
const audit = await D.page.evaluate(() => Object.keys(localStorage).filter((k) => /deputy:(audit|mail)/.test(k)).map((k) => `${k}=${(localStorage.getItem(k) ?? '').slice(-900)}`));
log(audit.join('\n'));
await D.page.goto(BASE + '/drill/procedure');
await wait(D.page, 2500);
await D.shot('procedure');
await D.ctx.close();

/* ---------------- handheld ---------------- */
if (!only || only === 'mobile') {
  const M = await open('deputy', { mobile: true, seed: seedMid });
  await M.shot('map');
  await M.page.mouse.wheel(0, 900);
  await wait(M.page, 300);
  await M.shot('controls');
  await M.ctx.close();
}

log('errors:', errors.length ? errors.join('\n') : 'none');
log('cross-origin:', foreign.length ? foreign.join('\n') : 'none');
await browser.close();
