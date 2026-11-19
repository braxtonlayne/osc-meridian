/**
 * End-to-end tests (tests/e2e/*.spec.ts), chromium only.
 *
 * - `npm run rehearse` builds with base /osc-meridian/, serves the copy itself and passes
 *   BASE_URL; no webServer is started here.
 * - `npm run test:e2e` serves the existing dist/ (or $MERIDIAN_DIST) through the Pages
 *   rehearsal server (scripts/rehearse-pages.ts --serve) on a free local port, mounted at the
 *   base the dist was built with (/osc-meridian/ after build:pages).
 */
import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();

function freePort(): string {
  return execFileSync(process.execPath, [
    '-e',
    "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})",
  ])
    .toString()
    .trim();
}

function distBase(): string {
  const index = join(resolve(root, process.env.MERIDIAN_DIST ?? 'dist'), 'index.html');
  if (!existsSync(index)) return '/osc-meridian/';
  const m = /(?:src|href)="(\/[^"]*?)assets\//.exec(readFileSync(index, 'utf8'));
  const b = m?.[1] ?? '/';
  return b.endsWith('/') ? b : `${b}/`;
}

const external = process.env.BASE_URL;
// Workers re-evaluate this file; the port chosen by the runner is handed down through env.
if (!external && !process.env.MERIDIAN_E2E_PORT) process.env.MERIDIAN_E2E_PORT = freePort();
const port = process.env.MERIDIAN_E2E_PORT!;
const baseURL = external ?? `http://127.0.0.1:${port}${distBase()}`;
process.env.MERIDIAN_E2E_BASE_URL = baseURL;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: external
    ? undefined
    : {
        command: `npx tsx scripts/rehearse-pages.ts --serve --port ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
