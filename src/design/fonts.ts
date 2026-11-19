/**
 * Self-hosted faces, latin subset only. Import once from the app entry (or via
 * src/design/styles.ts). Each import is a CSS file with @font-face rules whose
 * woff2 URLs Vite rewrites and bundles; nothing is fetched cross-origin.
 */
// UI: IBM Plex Sans 400 / 500 / 600 / 700 + italic 400
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-400-italic.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
// Data, IDs, coordinates: IBM Plex Mono 400 / 600
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
// Memoranda, directives, charter: Source Serif 4 400 / 600 / italic 400
import '@fontsource/source-serif-4/latin-400.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
// Typed material (cables, older forms, scans): Courier Prime 400 / 700
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';

export const FONT_FAMILIES = {
  ui: 'IBM Plex Sans',
  doc: 'Source Serif 4',
  typed: 'Courier Prime',
  mono: 'IBM Plex Mono',
} as const;
