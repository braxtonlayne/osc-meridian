// Cross-account integration scenario (wave 2C, I1). Needs the dev server: npx vite --port 5321 --strictPort
// Usage (repo root): node src/shell/check/integration/scenario.mjs
//   1. The deputy orders a seal drill, closes the coordinator and leaves no window open. The shell's
//      headless reconcilers keep the plant moving: doors close, PA logs automatic broadcasts, muster
//      runs, environ goes on recirculation. Each app is then opened to check.
//   2. The analyst initiates isolation (level 1). Taskbar, banner, transit and patch react; the
//      isolation clears on time with the isolate panel closed (clearsAt brought forward).
//   3. Every account receives its login mail.
// One browser context: the accounts are tabs sharing storage and the BroadcastChannel, as on one PC.
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = ['http:', '', 'localhost:5321'].join('/'); // local dev server only
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};
const LOGIN_MAIL = {
  lifesupport: ['msg-08-04446', 'msg-08-04423', 'msg-08-04404', 'msg-08-04371'],
  deputy: ['msg-08-04463', 'msg-08-04427', 'msg-08-04466', 'msg-08-04398', 'msg-08-04341'],
  auditor: ['msg-08-04468', 'msg-08-04401', 'msg-08-04411', 'msg-08-04356', 'msg-08-04477'],
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.routeWebSocket(/.*/, () => undefined); // no HMR reloads while content agents rebuild
const errors = [];
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`);
};
const wait = (p, ms) => p.waitForTimeout(ms);

async function tab(acct, path) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${acct}: ${String(e)}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${acct}: ${m.text()}`));
  const svc = (fn, arg) => page.evaluate(([f, a]) => import('/src/core/services.ts').then((m) => new Function('s', 'a', `return (${f})(s, a)`)(m.services, a)), [fn.toString(), arg]);
  const shot = (name) => page.screenshot({ path: join(here, `${name}.png`) });
  const login = async (p = path) => {
    await page.goto(BASE + p);
    await wait(page, 500);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.lock-signin input', { timeout: 30000 });
    const opt = page.locator(`.lock-cardopt[data-account="${acct}"]`);
    if (await opt.count()) await opt.click();
    await wait(page, 200);
    const inputs = page.locator('.lock-signin input');
    await inputs.nth(0).fill(CARDS[acct][0]);
    await inputs.nth(1).fill(CARDS[acct][1]);
    await page.locator('.lock-signin button[type=submit]').click();
    await page.waitForSelector('.taskbar, [role="toolbar"]', { timeout: 30000 }).catch(() => undefined);
    await wait(page, 2500);
  };
  const open = async (route) => {
    await svc((s, r) => s.openRoute(r), route);
    await wait(page, 2000);
  };
  const closeAll = async () => {
    for (let i = 0; i < 10 && (await page.locator('.win-btn-close').count()); i++) {
      await page.locator('.win-btn-close').last().click();
      await wait(page, 300);
    }
  };
  const shared = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(`meridian:shared:${k}`) ?? 'null'), key);
  await page.goto(BASE + '/');
  await svc((s, a) => s.account.switchTo(a), acct).catch(() => undefined);
  await wait(page, 1500);
  await login();
  return { page, svc, shot, login, open, closeAll, shared };
}

/* ------------------------------------------------ clean shared plant state */
{
  const p = await ctx.newPage();
  await p.goto(BASE + '/');
  await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('meridian:')).forEach((k) => localStorage.removeItem(k)));
  await p.close();
}

/* ------------------------------------------------ 1. deputy orders a drill, then no windows */
const D = await tab('deputy', '/drill');
await D.page.waitForSelector('.sd-root', { timeout: 30000 });
await D.page.locator('.win-title').last().dblclick().catch(() => undefined);
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
const title = await D.page.locator('.dlg').first().innerText();
const drillId = /SD-\d{2}-\d{4}-\d{2}/.exec(title)?.[0];
await D.page.locator('.dlg select').selectOption({ index: 1 });
await D.page.locator('.dlg input[type="text"]').fill(drillId ?? '');
await D.page.locator('.dlg input[type="checkbox"]').check();
await D.page.locator('.dlg button', { hasText: 'Issue order' }).click();
await wait(D.page, 1500);
await D.closeAll();
const openWins = await D.page.locator('.win-btn-close').count();
check('deputy: drill ordered, no windows open', drillId && openWins === 0, `${drillId}, windows ${openWins}`);
await D.shot('01-deputy-desktop-no-windows');

// Let the drill run headlessly (2 s per drill minute) until GAMMA-08 has sealed.
let drill = null;
for (let i = 0; i < 90; i++) {
  await wait(D.page, 1000);
  drill = await D.shared('drill');
  if (drill?.sites?.['GAMMA-08']?.status === 'sealed' && drill?.phase === 'sealed') break;
}
const tickAge = Date.now() - (drill?.tickedAt ?? 0);
check('drill ticks with the coordinator closed', drill && tickAge < 5000, `phase ${drill?.phase}, G08 ${drill?.sites?.['GAMMA-08']?.status}, tickedAt ${tickAge} ms ago`);
const doors = await D.shared('doors');
const drillLines = (doors?.log ?? []).filter((l) => l.by === 'drill');
check('doors: drill close schedule written headlessly', drillLines.length > 0, `${drillLines.length} drill log lines`);
const pa = await D.shared('pa');
const autos = (pa?.requests ?? []).filter((r) => r.autoKey);
check('pa: automatic broadcasts logged headlessly', autos.length > 0, autos.map((r) => r.autoKey).join(', '));
const muster = await D.shared('muster');
check('muster: drill musters started headlessly', (muster?.runs ?? []).some((r) => r.by === 'drill'), `${(muster?.runs ?? []).length} runs`);
await D.shot('02-deputy-desktop-drill-running');

for (const [route, name] of [['/doors', '03-doors'], ['/pa', '04-pa'], ['/muster', '05-muster']]) {
  await D.open(route);
  await D.page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(D.page, 800);
  await D.shot(`${name}-after-headless-drill`);
  await D.closeAll();
}

// Life support (GAMMA-08 operator): environ on recirculation from the drill seal.
const L = await tab('lifesupport', '/environ');
await L.page.locator('.win-title').last().dblclick().catch(() => undefined);
await wait(L.page, 2500);
const envText = (await L.page.locator('.win').last().innerText()).replace(/\s+/g, ' ');
check('environ: recirculation (makeup air closed by the seal)', /recirc|SEAL CLOSED|seal/i.test(envText), envText.match(/.{0,40}(RECIRC|SEAL CLOSED).{0,40}/i)?.[0] ?? '');
await L.shot('06-environ-lifesupport-recirculation');
await L.closeAll();
await wait(L.page, 5000);
const env = await L.shared('environ');
check('environ: headless checkpoint state written for the operator', env && typeof env.rev === 'number', `rev ${env?.rev}`);

/* ------------------------------------------------ 2. analyst initiates isolation */
const A = await tab('analyst', '/isolate');
const app = () => A.page.locator('.iso-app').last();
await A.page.waitForSelector('.iso-app', { timeout: 15000 }).catch(() => undefined);
if (!(await A.page.locator('.iso-app').count())) await A.open('/isolate');
await app().locator('.pk-guard__coverbtn').click({ timeout: 6000 });
await wait(A.page, 250);
const box = await app().locator('.pk-guard__act').boundingBox();
await A.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await A.page.mouse.down();
await wait(A.page, 3300);
await A.page.mouse.up();
await wait(A.page, 800);
await A.page.keyboard.press('F9');
const iso = await A.shared('isolation');
check('analyst: isolation initiated', iso?.active === true && iso?.initiations?.length === 1, iso?.initiations?.[0]?.ref);
await A.shot('07-isolate-actuated');
await A.closeAll();
await wait(A.page, 1500);
const notice = await A.page.locator('.iso-notice').count();
const links = (await A.page.locator('.tray-links').getAttribute('aria-label')) ?? '';
check('shell: isolation banner notice', notice > 0);
check('taskbar: hub links DOWN', /DOWN/.test(links), links);
await A.shot('08-desktop-isolated-banner-taskbar');
await A.open('/transit');
await A.page.locator('.win-title').last().dblclick().catch(() => undefined);
await wait(A.page, 1500);
await A.shot('09-transit-isolated');
await A.closeAll();
await A.open('/patch');
await A.page.locator('.win-title').last().dblclick().catch(() => undefined);
await wait(A.page, 1500);
const patchText = (await A.page.locator('.win').last().innerText()).replace(/\s+/g, ' ');
check('patch: isolation shown', /isolat/i.test(patchText), patchText.match(/.{0,40}isolat.{0,40}/i)?.[0] ?? '');
await A.shot('10-patch-isolated');
await A.closeAll();

// Clear on time with no isolate window open: bring the line checks forward to 15 s from now.
const clearsAt = Date.now() + 15000;
await A.svc((s, t) => {
  const v = s.shared.get('isolation', null).peek();
  s.shared.set('isolation', { ...v, clearsAt: t });
}, clearsAt);
for (let i = 0; i < 40; i++) {
  await wait(A.page, 1000);
  const v = await A.shared('isolation');
  if (v && !v.active) break;
}
const after = await A.shared('isolation');
const autoR = (after?.restorations ?? []).find((r) => r.status === 'automatic');
check('isolation clears on time headlessly', after && after.active === false && autoR && after.initiations?.[0]?.clearedMs === clearsAt, `active ${after?.active}, clearedMs ${after?.initiations?.[0]?.clearedMs}`);
await wait(A.page, 1500);
const links2 = (await A.page.locator('.tray-links').getAttribute('aria-label')) ?? '';
check('taskbar: hub links back after clear', !/DOWN/.test(links2) && (await A.page.locator('.iso-notice').count()) === 0, links2);
await A.shot('11-desktop-cleared');
const paAfter = await A.shared('pa');
check('pa: all-clear broadcast logged at the clear', (paAfter?.requests ?? []).some((r) => /36|clear/i.test(`${r.autoKey} ${r.msg}`) && r.autoKey?.includes('iso')), (paAfter?.requests ?? []).map((r) => r.autoKey).filter(Boolean).join(', '));

/* ------------------------------------------------ 3. login mail per account */
const Au = await tab('auditor', '/mail');
for (const [acct, t] of [['lifesupport', L], ['deputy', D], ['auditor', Au]]) {
  const delivered = await t.svc((s) => s.mail.delivered.peek());
  const missing = LOGIN_MAIL[acct].filter((id) => !delivered.includes(id));
  check(`${acct}: login mail delivered`, missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : `${LOGIN_MAIL[acct].length} messages`);
  await t.open('/mail');
  await t.page.locator('.win-title').last().dblclick().catch(() => undefined);
  await wait(t.page, 1000);
  await t.shot(`12-mail-${acct}`);
}
const anDelivered = await A.svc((s) => s.mail.delivered.peek());
check('analyst: pass-one login mail delivered', anDelivered.length > 0, `${anDelivered.length} messages`);

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
if (errors.length) console.log('console/page errors:\n' + [...new Set(errors)].slice(0, 20).join('\n'));
await browser.close();
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
