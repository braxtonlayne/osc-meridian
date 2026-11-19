// Dev-only rendered check for the Ledger app (not imported by the application).
// Usage: node src/apps/ledger/check/shots.mjs [step...]  (starts its own Vite dev server on port 5205).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

const OUT = dirname(fileURLToPath(import.meta.url));
const root = resolve(OUT, "../../../..");
const server = await createServer({
  root,
  configFile: join(root, "vite.config.ts"),
  logLevel: "warn",
  server: { port: 5205, strictPort: true, host: "127.0.0.1" },
});
await server.listen();
const BASE = `http://127.0.0.1:${server.httpServer.address().port}`;
const only = process.argv.slice(2);

const browser = await chromium.launch();

async function login(page) {
  await page.goto(BASE + "/");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.waitForSelector("#lock-op", { timeout: 15000 });
  await page.fill("#lock-op", "OPR-A03-1147");
  await page.fill("#lock-pass", "meridian");
  await page.click('.lock-signin button[type="submit"]');
  await page.waitForSelector('.taskbar, [class*="taskbar"]', {
    timeout: 15000,
  });
  await page.waitForTimeout(800);
  return page.evaluate(
    async () => (await import("/src/core/services.ts")).routes.peek().length,
  );
}

async function session(viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on(
    "console",
    (m) => m.type() === "error" && errors.push(`console: ${m.text()}`),
  );
  // The dev server occasionally serves an empty route list right after a content rebuild; retry.
  for (let i = 0; i < 4 && (await login(page)) === 0; i++)
    await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const wm = await import("/src/shell/wm.ts");
    for (const w of wm.windows.peek()) w.handle.close();
  });
  return { page, errors };
}

async function open(page, path) {
  await page.evaluate(async (p) => {
    const wm = await import("/src/shell/wm.ts");
    for (const w of wm.windows.peek()) w.handle.close();
    const m = await import("/src/core/services.ts");
    m.openRoute(p);
  }, path);
  await page.waitForSelector(".lga", { timeout: 15000 });
  await page.waitForTimeout(700);
}

async function maximize(page) {
  await page.evaluate(async () => {
    const wm = await import("/src/shell/wm.ts");
    const w = wm.activeWin.peek();
    if (w && !w.maximized?.peek?.()) wm.toggleMax(w.id);
  });
  await page.waitForTimeout(300);
}

const shot = (page, name) =>
  page.screenshot({ path: join(OUT, `${name}.png`) });
const steps = {
  async summary(ctx) {
    await open(ctx.page, "/ledger");
    await maximize(ctx.page);
    await shot(ctx.page, "summary");
    await ctx.page
      .locator(".lga-scroll")
      .evaluate((el) => (el.scrollTop = 900));
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "summary-scrolled");
    await ctx.page
      .locator(".lga-scroll")
      .evaluate((el) => (el.scrollTop = el.scrollHeight));
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "summary-bottom");
  },
  async register(ctx) {
    await open(ctx.page, "/ledger/register");
    await maximize(ctx.page);
    await shot(ctx.page, "register");
    const row = ctx.page.locator(".lga-grid tbody tr").nth(3);
    await row.click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "register-selected");
    await ctx.page.locator(".lga-filters select").nth(3).selectOption("FY2005");
    await ctx.page
      .locator(".lga-filters select")
      .nth(4)
      .selectOption("department");
    await ctx.page.waitForTimeout(300);
    await shot(ctx.page, "register-fy-dept");
    await row.click({ button: "right" });
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "register-context");
    await ctx.page.keyboard.press("Escape");
  },
  async columns(ctx) {
    await open(ctx.page, "/ledger/register");
    await maximize(ctx.page);
    await ctx.page.getByRole("button", { name: "Columns..." }).click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "columns-dialog");
    for (const label of ["FY2006 ($M)", "FY2007 ($M)", "Peak FY"])
      await ctx.page
        .locator(".lga-colpick")
        .getByLabel(label, { exact: true })
        .check();
    await ctx.page.getByRole("button", { name: "OK" }).click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "columns-applied");
  },
  async category(ctx) {
    await open(ctx.page, "/ledger/category/transit");
    await maximize(ctx.page);
    await shot(ctx.page, "category-transit");
    await ctx.page
      .locator(".lga-scroll")
      .evaluate((el) => (el.scrollTop = el.scrollHeight));
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "category-transit-bottom");
    await ctx.page.getByRole("tab", { name: /Line items/ }).click();
    await ctx.page.waitForTimeout(300);
    await shot(ctx.page, "category-transit-lines");
  },
  async source(ctx) {
    await open(ctx.page, "/ledger/source/black");
    await maximize(ctx.page);
    await shot(ctx.page, "source-black");
  },
  async fy(ctx) {
    await open(ctx.page, "/ledger/fy/2001");
    console.log(
      "fy routes",
      await ctx.page.evaluate(async () =>
        (await import("/src/core/services.ts")).routes
          .peek()
          .filter((r) => r.app === "ledger")
          .map((r) => r.route)
          .join(" "),
      ),
    );
    await maximize(ctx.page);
    await shot(ctx.page, "fy-2001");
    await ctx.page
      .getByRole("toolbar", { name: "Fiscal years on this sheet" })
      .getByRole("button", { name: "FY2002" })
      .click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "fy-2002");
  },
  async document(ctx) {
    await open(ctx.page, "/ledger/category/transit");
    await maximize(ctx.page);
    await ctx.page.getByRole("tab", { name: /Document/ }).click();
    await ctx.page.waitForTimeout(1200);
    await shot(ctx.page, "document-transit");
  },
  async menus(ctx) {
    await open(ctx.page, "/ledger");
    await maximize(ctx.page);
    await ctx.page
      .locator(".lga .menubar")
      .getByText("Go", { exact: true })
      .click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "menu-go");
    await ctx.page.keyboard.press("Escape");
    await ctx.page
      .locator(".lga .menubar")
      .getByText("Edit", { exact: true })
      .click();
    await ctx.page.getByText("Post adjustment...").click();
    await ctx.page.waitForTimeout(200);
    await shot(ctx.page, "refusal-dialog");
    await ctx.page.keyboard.press("Escape");
  },
  async print(ctx) {
    await open(ctx.page, "/ledger/register");
    await ctx.page.evaluate(() => {
      window.print = () => {};
    });
    await ctx.page.locator(".lga-grid tbody tr").nth(2).click();
    await ctx.page.keyboard.press("Control+Shift+P");
    await ctx.page.waitForSelector(".lga-print-root", { state: "attached" });
    await ctx.page.emulateMedia({ media: "print" });
    await ctx.page.screenshot({
      path: join(OUT, "print-extract.png"),
      fullPage: false,
    });
    await ctx.page.emulateMedia({ media: "screen" });
  },
  async refusal(ctx) {
    // Simulate a ledger route that carries an access requirement the session does not satisfy.
    await open(ctx.page, '/ledger/source/misc');
    await ctx.page.evaluate(async () => {
      const wm = await import('/src/shell/wm.ts');
      const w = wm.activeWin.peek();
      w.route.value = { ...w.route.peek(), access: { tier: 2 } };
    });
    await ctx.page.waitForTimeout(400);
    await shot(ctx.page, 'refusal-route');
  },
  async audit(ctx) {
    const entries = await ctx.page.evaluate(async () => {
      const m = await import("/src/core/services.ts");
      return m.services.audit.entries
        .peek()
        .map((e) => `${e.kind} | ${e.subject} | ${e.detail}`);
    });
    console.log(entries.join("\n"));
  },
};

const desktop = await session({ width: 1400, height: 900 });
for (const [name, fn] of Object.entries(steps)) {
  if (only.length && !only.includes(name)) continue;
  try {
    await fn(desktop);
    console.log(`ok ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    await shot(desktop.page, `fail-${name}`);
  }
}

if (!only.length || only.includes("handheld")) {
  const hh = await session({ width: 390, height: 800 });
  try {
    console.log(
      "handheld routes",
      await hh.page.evaluate(
        async () =>
          (await import("/src/core/services.ts")).routes.peek().length,
      ),
    );
    await open(hh.page, "/ledger/register");
    await shot(hh.page, "handheld-register");
    await open(hh.page, "/ledger");
    await shot(hh.page, "handheld-summary");
    console.log("ok handheld");
  } catch (e) {
    console.log(`FAIL handheld: ${e.message.split("\n")[0]}`);
    await shot(hh.page, "fail-handheld");
  }
  if (hh.errors.length) console.log(hh.errors.join("\n"));
}

if (desktop.errors.length) console.log("ERRORS\n" + desktop.errors.join("\n"));
await browser.close();
await server.close();
