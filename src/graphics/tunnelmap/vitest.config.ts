// Local config so the folder's own check can run without touching the root include list:
//   npx vitest run -c src/graphics/tunnelmap/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../../vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/graphics/tunnelmap/**/*.test.ts'],
      environment: 'node',
    },
  }),
);
