import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Runs only this folder's unit checks; the project config covers tests/unit. */
export default defineConfig({
  root: r('..'),
  cacheDir: process.env.LEDGER_CHECK_CACHE,
  resolve: {
    alias: {
      '@canon': r('../../../../content/canon/canon.json'),
      '@core': r('../../../core'),
    },
  },
  test: {
    include: ['*.test.ts'],
    environment: 'node',
  },
});
