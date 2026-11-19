/**
 * Smoke tests against a Pages-style server (see playwright.config.ts).
 * Every test also asserts that the page made no request to a non-local origin.
 */
import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Route {
  id: string;
  route: string;
  app: string;
  docNo: string;
  access?: { tier: number; compartment?: string };
}

const root = process.cwd();
const routes = JSON.parse(readFileSync(join(root, '.generated', 'routes.json'), 'utf8')) as Route[];
const canon = JSON.parse(readFileSync(join(root, 'content', 'canon', 'canon.json'), 'utf8')) as {
  operator: { operatorId: string; passphrase: string };
};
const APPS = ['registry', 'transit', 'personnel', 'records', 'mail', 'ledger', 'reserves', 'assurance', 'directives', 'forms', 'terminal', 'system'];

/** A document the Tier 3 visitor can open (no compartment, tier 3 or 4). */
function openDocFor(app: string): Route | undefined {
  return routes.find((r) => r.app === app && (!r.access || (!r.access.compartment && r.access.tier >= 3)));
}

const test = base.extend<{ foreign: string[] }>({
  foreign: async ({ page, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    const seen: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/^(data|blob|about):/.test(url)) return;
      if (new URL(url).origin !== origin) seen.push(url);
    });
    await use(seen);
    expect(seen, 'requests to non-local origins').toEqual([]);
  },
});

function url(baseURL: string | undefined, route: string): string {
  return new URL(route.replace(/^\/+/, ''), baseURL).toString();
}

async function signIn(page: Page): Promise<void> {
  const op = page.locator('#lock-op');
  // The pre-boot self-test is skippable by any key; keep nudging until the lock screen is up.
  await expect(async () => {
    if (!(await op.isVisible())) await page.keyboard.press('Space');
    await expect(op).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await op.fill(canon.operator.operatorId);
  await page.locator('#lock-pass').fill(canon.operator.passphrase);
  await page.locator('.lock-form button[type="submit"]').click();
  await expect(op).toBeHidden({ timeout: 15_000 });
}

function docWindow(page: Page, r: Route) {
  return page.locator(`.win[data-app="${r.app}"][aria-label*="${r.docNo}"]`).first();
}

test('base URL loads and the issued credentials sign in', async ({ page, baseURL, foreign }) => {
  void foreign;
  const res = await page.goto(baseURL!);
  expect(res?.status()).toBe(200);
  await signIn(page);
  await expect(page.getByRole('toolbar', { name: 'Open windows' })).toBeVisible();
});

test('a deep link opens its document and survives a reload', async ({ page, baseURL, foreign }) => {
  void foreign;
  const r = openDocFor('directives')!;
  const res = await page.goto(url(baseURL, r.route));
  expect(res?.status()).toBe(200);
  await signIn(page);
  await expect(docWindow(page, r)).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await signIn(page);
  await expect(docWindow(page, r)).toBeVisible({ timeout: 15_000 });
});

test('a nonexistent route answers with the in-world PathNotFound', async ({ page, baseURL, foreign }) => {
  void foreign;
  const res = await page.goto(url(baseURL, '/directives/dir-9999/annex-z'));
  expect(res?.status()).toBe(404); // Pages serves 404.html; the shell takes over
  await signIn(page);
  await expect(page.getByText('The address does not correspond to a record or view')).toBeVisible({ timeout: 15_000 });
});

test('one document per app opens in its window', async ({ page, baseURL, foreign }) => {
  void foreign;
  await page.goto(baseURL!);
  await signIn(page);
  for (const app of APPS) {
    const r = openDocFor(app);
    const path = new URL(url(baseURL, r?.route ?? `/${app}`)).pathname;
    await page.evaluate((p) => {
      history.pushState({}, '', p);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    const win = r ? docWindow(page, r) : page.locator(`.win[data-app="${app}"]`).first();
    await expect(win, `${app}: ${r?.docNo ?? 'home'}`).toBeVisible({ timeout: 15_000 });
  }
});

test('app home routes are prerendered for readers without JavaScript', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const app of APPS) {
    const res = await page.goto(url(baseURL, `/${app}/`));
    expect(res?.status(), app).toBe(200);
    await expect(page.locator('article.static-doc').first(), app).toBeVisible();
  }
  await ctx.close();
});
