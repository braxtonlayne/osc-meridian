// Runs the map module's own tests:  npx vitest run --config src/graphics/map/check/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from '../../../../vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/graphics/map/**/*.test.ts', 'src/graphics/map/**/*.test.tsx'],
      environment: 'happy-dom',
    },
  }),
);
