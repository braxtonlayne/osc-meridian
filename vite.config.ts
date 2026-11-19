import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';

/**
 * MERIDIAN_BASE controls the public base path. GitHub Pages project sites live
 * under /<repo>/, so `npm run build:pages` sets it to /osc-meridian/.
 * Every runtime URL must go through `import.meta.env.BASE_URL` (see src/core/base.ts).
 */
const base = process.env.MERIDIAN_BASE ?? '/';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base,
  plugins: [preact()],
  resolve: {
    alias: {
      '@core': r('./src/core'),
      '@design': r('./src/design'),
      '@shell': r('./src/shell'),
      '@apps': r('./src/apps'),
      '@graphics': r('./src/graphics'),
      '@sim': r('./src/sim'),
      '@narrative': r('./src/narrative'),
      '@canon': r('./content/canon/canon.client.json'),
      '@generated': r('./.generated'),
    },
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: { port: 5178, strictPort: true },
  preview: { port: 5179, strictPort: true },
});
