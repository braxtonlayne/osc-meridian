import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Runs only this folder's unit checks; the project config covers tests/unit. */
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  cacheDir: process.env.FORMS_CHECK_CACHE,
  test: {
    include: ['*.test.ts'],
    environment: 'node',
  },
});
