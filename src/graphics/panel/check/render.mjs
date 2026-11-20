// Rendered check for @graphics/panel.
// 1. Start the dev server from the repo root:  npx vite --port 5282 --strictPort
// 2. Run:                                       node src/graphics/panel/check/render.mjs
// Screenshots every [data-check] block of preview.html at 1x and 2x (light theme),
// then drives the live guarded switch and annunciator with mouse and keyboard and
// writes interaction shots. Fails on page errors and on any cross-origin request.
import { chromium } from 'playwright';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ORIGIN = process.env.PANEL_ORIGIN ?? ['http', '://localhost:5282'].join('');
const URL_ = `${ORIGIN}/src/graphics/panel/preview.html`;
const errors = [];
const results = [];

const browser = await chromium.launch();

async function open(scale) {
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 1000 }, deviceScaleFactor: scale, colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${scale}x pageerror] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${scale}x console] ${m.text()}`));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGIN) && !u.startsWith('data:')) errors.push(`[network] ${u}`);
  });
  await page.goto(URL_, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('[data-check]');
  return { ctx, page };
}

for (const scale of [1, 2]) {
  const { ctx, page } = await open(scale);
  const ids = await page.$$eval('[data-check]', (els) => els.map((e) => e.id));
  for (const id of ids) {
    await page.locator(`#${id}`).screenshot({ path: `${here}/${id}@${scale}x.png`, animations: 'allow' });
  }
  results.push(`${scale}x: ${ids.length} blocks`);
  await ctx.close();
}

// ---- interaction (1x)
{
  const { ctx, page } = await open(1);
  const live = page.locator('#live-guard');
  const status = () => live.locator('.rx-status__word').innerText();
  const log = () => page.locator('#live-guard-log').innerText();

  // mouse: lift, hold 1.5 s (armed mid-way), release early (abort), hold full (actuate), Escape closes
  await live.locator('.pk-guard__coverbtn').click();
  results.push(`after lift: ${await status()}`);
  const act = live.locator('.pk-guard__act');
  const box = await act.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await live.screenshot({ path: `${here}/interact-guard-holding@1x.png` });
  results.push(`holding 1.5 s: ${await status()}, segments lit ${await live.locator('.pk-hold__seg.is-on').count()}`);
  await page.mouse.up();
  results.push(`released early: ${await status()}`);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  results.push(`held 3.3 s: ${await status()}`);
  await live.screenshot({ path: `${here}/interact-guard-actuated@1x.png` });
  await act.focus().catch(() => undefined);
  await page.keyboard.press('Escape');
  results.push(`Escape: ${await status()}`);

  // keyboard: Tab to the cover, Space lifts, Tab to the actuator, hold Space
  await live.locator('.pk-guard__coverbtn').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await live.screenshot({ path: `${here}/interact-guard-focus-actuator@1x.png` });
  await page.keyboard.down('Space');
  await page.waitForTimeout(3200);
  await page.keyboard.up('Space');
  results.push(`keyboard hold: ${await status()}`);
  results.push(`events: ${await log()}`);

  // annunciator: ACK button acknowledges, RESET clears ringback
  const ann = page.locator('#annunciator-live');
  const seqs = () => ann.locator('.pk-tile').evaluateAll((ts) => ts.map((t) => t.dataset.seq).join(','));
  results.push(`annunciator before: ${await seqs()}`);
  await ann.getByRole('button', { name: /^Acknowledge/ }).click();
  results.push(`after ACK: ${await seqs()}`);
  await ann.getByRole('button', { name: /^Reset/ }).click();
  results.push(`after RESET: ${await seqs()}`);
  // keyboard into the grid: focus first window, arrows
  await ann.locator('.pk-tile').first().focus();
  await page.keyboard.press('ArrowRight');
  await ann.screenshot({ path: `${here}/interact-annunciator-focus@1x.png` });
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  results.push(`arrow focus: ${focused}`);

  // selector and key switch via keyboard, focus ring visible
  const sw = page.locator('#switches');
  const pumpMode = sw.getByRole('slider', { name: 'PUMP A MODE' });
  await pumpMode.focus();
  await page.keyboard.press('ArrowRight');
  results.push(`selector after ArrowRight: ${await pumpMode.getAttribute('aria-valuetext')}`);
  const sim = sw.getByRole('slider', { name: 'SIMULATOR' });
  await sim.focus();
  await page.keyboard.press('ArrowRight');
  results.push(`key switch after ArrowRight: ${await sim.getAttribute('aria-valuetext')}`);
  await sw.screenshot({ path: `${here}/interact-switches-focus@1x.png` });

  // reduced motion media query honoured without the prop
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const anim = await page.locator('#annunciator-reduced .pk-tile.is-unack').first().evaluate((t) => getComputedStyle(t).animationName);
  results.push(`reduced-motion unack animation: ${anim}`);
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
