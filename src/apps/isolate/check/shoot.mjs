// Rendered check for the isolate app. Dev server on 5302:
//   npx vite --port 5302 --strictPort   then   node src/apps/isolate/check/shoot.mjs
// Walks the escalation ladder across accounts (analyst presses, deputy certifies),
// screenshots each view, and prints mail and trace results.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? ['http:', '', 'localhost:5302'].join('/');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CARDS = {
  analyst: ['OPR-A03-1147', 'ballast pewter orchard ninety'],
  lifesupport: ['OPR-G08-0611', 'damper cistern pallid forty'],
  deputy: ['OPR-A02-0139', 'granite halyard sorrel eleven'],
  auditor: ['OPR-A01-0948', 'ferrule quarto hemlock sixty'],
};
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const svc = (fn, arg) => page.evaluate(([f, a]) => import('/src/core/services.ts').then((m) => new Function('s', 'a', `return (${f})(s, a)`)(m.services, a)), [fn.toString(), arg]);

async function login(acct, path = '/isolate') {
  await page.goto(BASE + path);
  await wait(500);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.lock-signin input', { timeout: 20000 });
  const opt = page.locator(`.lock-cardopt[data-account="${acct}"]`);
  if (await opt.count()) await opt.click();
  await wait(200);
  const inputs = page.locator('.lock-signin input');
  await inputs.nth(0).fill(CARDS[acct][0]);
  await inputs.nth(1).fill(CARDS[acct][1]);
  await page.locator('.lock-signin button[type=submit]').click();
  await wait(1500);
  await page.waitForSelector('.iso-app', { timeout: 8000 }).catch(() => undefined);
  if (!(await page.locator('.iso-app').count())) {
    await svc((s) => s.openRoute('/isolate'));
    await wait(1500);
  }
}
async function switchTo(acct, path) {
  await svc((s, a) => s.account.switchTo(a), acct).catch(() => undefined);
  await wait(1500);
  await login(acct, path);
}
const shot = (name) => page.screenshot({ path: join(here, `${name}.png`) });
const app = () => page.locator('.iso-app').last();
const view = async (label) => {
  await app().locator('.toolbar button', { hasText: label }).first().click().catch(async () => app().getByRole('button', { name: label }).first().click());
  await wait(300);
};
async function press(holdMs = 3300) {
  await app().locator('.pk-guard__coverbtn').click({ timeout: 4000 }).catch(async (e) => { await shot('zz-press-fail'); console.log('press fail', await app().locator('.pk-guard').getAttribute('class')); throw e; });
  await wait(250);
  const act = app().locator('.pk-guard__act');
  const box = await act.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await wait(holdMs);
  await page.mouse.up();
  await wait(500);
}
const iso = () => svc((s) => s.shared.get('isolation', null).peek());

// fresh shared state
await login('analyst');
await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('meridian:shared:')).forEach((k) => localStorage.removeItem(k)));
await page.reload();
await wait(800);
await login('analyst');
await shot('01-panel-analyst-level0');

await view('Register');
await shot('02-register-empty');
await app().getByText('Include entries archived').click();
await wait(300);
await shot('03-register-archived');
await view('Links');
await shot('04-links-normal');

await view('Panel');
await press();
await shot('05-actuated-level1');
await page.keyboard.press('F9');
await wait(300);
await shot('06-acked-level1');
console.log('L1', JSON.stringify(await iso()));
await view('Links');
await shot('07-links-isolated');

// fast-forward the line checks
await svc((s) => {
  const v = s.shared.get('isolation', null).peek();
  s.shared.set('isolation', { ...v, clearsAt: Date.now() - 1000 });
});
await wait(2500);
await shot('08a-after-clear');
console.log('errors so far', JSON.stringify(errors));
await view('Restoration');
await shot('08-restored-auto');

await view('Panel');
await press();
await page.keyboard.press('F9');
await view('Restoration');
await app().locator('textarea').fill('Control operated while confirming the guard cover was latched. Reported to the duty officer.');
await app().getByRole('button', { name: /Route to certifying officer/ }).click();
await wait(400);
await shot('09-cert-routed');
await page.keyboard.press('Enter');
console.log('mail analyst', JSON.stringify(await svc((s) => s.mail.delivered.peek().filter((m) => m.startsWith('msg-08-052')))));

await switchTo('deputy', '/isolate');
await view('Restoration');
await shot('10-deputy-pending');
await app().getByRole('button', { name: /Approve and restore/ }).click();
await wait(500);
await shot('11-deputy-approved');
console.log('mail deputy', JSON.stringify(await svc((s) => s.mail.delivered.peek())));

// deputy presses level 3
await view('Panel');
await press(5400);
await page.keyboard.press('F9');
await view('Restoration');
await app().locator('textarea').fill('Command officer operation under para 3.1 to confirm switch response. Duty officer informed.');
await app().getByRole('button', { name: /Route to certifying officer/ }).click();
await wait(300);
await page.keyboard.press('Enter');
await app().getByRole('button', { name: /Approve and restore/ }).click();
await wait(400);
await view('Panel');
await shot('12-sealed-level3');
await app().locator('.iso-guard').screenshot({ path: join(here, '12b-seal-intact-zoom.png') });

await switchTo('auditor', '/isolate');
await shot('13-auditor-panel');
await app().locator('.pk-guard__coverbtn').click();
await wait(300);
await shot('14-auditor-refused');
await page.keyboard.press('Enter');
console.log('mail auditor', JSON.stringify(await svc((s) => s.mail.delivered.peek().filter((m) => m.startsWith('msg-08-052')))));

await switchTo('analyst', '/isolate');
await app().getByRole('button', { name: /Break tamper seal/ }).click();
await wait(300);
await shot('15-break-seal-confirm');
await page.getByRole('button', { name: /Break seal/ }).click();
await wait(300);
await press(5400);
await page.keyboard.press('F9');
await wait(300);
await shot('16-level4');
console.log('L4', JSON.stringify(await iso()));
await app().locator('.pk-guard__coverbtn').click();
await wait(300);
await app().locator('.iso-guard').screenshot({ path: join(here, '16b-seal-broken-zoom.png') });
await view('Restoration');
await app().locator('textarea').fill('Fourth operation. Statement to follow through the Resident Assurance Officer.');
await app().getByRole('button', { name: /Route to certifying officer/ }).click();
await wait(300);
await page.keyboard.press('Enter');
await switchTo('deputy', '/isolate');
await view('Restoration');
await app().locator('input[type=text]').first().fill('Statement does not give the circumstances.');
await app().getByRole('button', { name: /Return without approval/ }).click();
await wait(400);
await shot('16c-deputy-returned');
await app().locator('textarea').fill('Raised by the certifying officer after interview of the operator by the RAO.');
await app().getByRole('button', { name: /Route to certifying officer/ }).click();
await wait(300);
await page.keyboard.press('Enter');
await app().getByRole('button', { name: /Approve and restore/ }).click();
await wait(400);
await view('Panel');
await app().getByRole('button', { name: /Break tamper seal/ }).click();
await wait(300);
await page.getByRole('button', { name: /Break seal/ }).click();
await wait(300);
await press(8400);
await page.keyboard.press('F9');
await wait(300);
await shot('16d-level5-withdrawn');
await view('Restoration');
await shot('16e-level5-restoration');
console.log('L5', JSON.stringify(await iso()).slice(0, 200));
await svc((s) => s.account.switchTo('analyst')).catch(() => undefined);
await wait(2000);
await page.keyboard.press('Escape');
await wait(800);
await shot('16f-lock-review');
console.log('mail analyst', JSON.stringify(await svc((s) => s.mail.delivered.peek().filter((m) => m.startsWith('msg-08-052')))));

await switchTo('lifesupport', '/isolate');
await shot('17-lifesupport-site');

await switchTo('analyst', '/isolate/procedure');
await wait(800);
await shot('18-procedure');

await page.setViewportSize({ width: 760, height: 900 });
await svc((s) => s.openRoute('/isolate'));
await wait(1000);
await shot('19-handheld');

const lock = await page.evaluate(() => document.body.innerText.includes('under Internal Assurance review'));
console.log('banner notice visible', await page.evaluate(() => !!document.querySelector('.iso-notice')), 'lock review text in DOM', lock);
console.log('traces', JSON.stringify(await svc((s) => s.traces.all.peek().map((t) => [t.id, t.from, t.to, t.kind, t.msgId ?? t.subject]))));
console.log('audit control', JSON.stringify(await svc((s) => s.audit.entries.peek().filter((e) => e.kind === 'control').map((e) => e.subject))));
console.log('errors', JSON.stringify(errors.slice(0, 10)));
await browser.close();
