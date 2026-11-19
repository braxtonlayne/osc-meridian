/**
 * Rendered check for @graphics/icons.
 *   npx tsx src/graphics/icons/check/render.ts
 * Writes contact sheets (HTML, and PNG via Playwright Chromium) beside this file.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  APP_ICON_IDS,
  BUTTON_ICON_IDS,
  FILE_ICON_IDS,
  ICON_IDS,
  MORE_ICON_IDS,
  UI_ICON_IDS,
  iconSvg,
  type IconId,
  type IconVariant,
} from '../pixels';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(here, { recursive: true });

const css = `
  html,body{margin:0;background:#D6D3CB;font:11px/14px "IBM Plex Sans",Tahoma,Arial,sans-serif;color:#15181C}
  body{padding:8px;width:max-content}
  h1{font-size:12px;margin:0 0 6px} h2{font-size:11px;margin:10px 0 4px;text-transform:uppercase}
  svg{display:block}
  .row{display:flex;flex-wrap:wrap;gap:0;max-width:1180px}
  .cell{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;width:var(--cw)}
  .cell span{font-size:9px;line-height:10px;color:#4B5158;white-space:nowrap}
  .pair{display:flex;align-items:flex-end;gap:6px}
  .strip{display:flex;gap:6px;padding:6px;align-items:center;flex-wrap:wrap;max-width:1180px}
  .face{background:#D6D3CB}.white{background:#FFFFFF}.desk{background:#3A4652}.bar{background:#1F3552}.inact{background:#7C8591}
`;

function cells(ids: readonly IconId[], scale: number, cw: number): string {
  return `<div class="row" style="--cw:${cw}px">${ids
    .map(
      (id) =>
        `<div class="cell"><div class="pair">${iconSvg(id, 16, scale)}${iconSvg(id, 32, scale)}</div><span>${id}</span></div>`,
    )
    .join('')}</div>`;
}

function strip(cls: string, size: 16 | 32): string {
  return `<div class="strip ${cls}">${ICON_IDS.map((id) => iconSvg(id, size, 1)).join('')}</div>`;
}

function sheet(title: string, scale: number, cw: number, groups: ReadonlyArray<[string, readonly IconId[]]>): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><style>${css}</style><h1>${title}</h1>${groups
    .map(([name, ids]) => `<h2>${name}</h2>${cells(ids, scale, cw)}`)
    .join('')}`;
}

function buttons(cls: string, size: 16 | 32, variant: IconVariant, scale = 1): string {
  return `<div class="strip ${cls}">${BUTTON_ICON_IDS.map((id) => iconSvg(id, size, scale, variant)).join('')}</div>`;
}

const grounds = ['bar', 'inact', 'face', 'white'] as const;
const buttonSheet = `<!doctype html><meta charset="utf-8"><title>buttons</title><style>${css}</style>
  <h1>Caption, sort, tree and toolbar glyphs on active bar / inactive bar / face / white</h1>
  <h2>variant=button, 16 at 1x</h2>${grounds.map((g) => buttons(g, 16, 'button')).join('')}
  <h2>variant=button, 32 at 1x</h2>${grounds.map((g) => buttons(g, 32, 'button')).join('')}
  <h2>variant=glyph, 16 at 1x</h2>${grounds.map((g) => buttons(g, 16, 'glyph')).join('')}
  <h2>variant=button, 16 at 4x</h2>${grounds.map((g) => buttons(g, 16, 'button', 4)).join('')}
  <h2>variant=button, 32 at 4x</h2>${buttons('bar', 32, 'button', 4)}${buttons('inact', 32, 'button', 4)}
  <h2>variant=glyph, 16 at 4x</h2>${buttons('face', 16, 'glyph', 4)}
  <h2>variant=glyph, 32 at 4x</h2>${buttons('face', 32, 'glyph', 4)}`;

const all: ReadonlyArray<[string, readonly IconId[]]> = [
  ['Applications', APP_ICON_IDS],
  ['File types', FILE_ICON_IDS],
  ['Shell', UI_ICON_IDS],
  ['Application detail', MORE_ICON_IDS],
];

const sheets: Record<string, string> = {
  'sheet-1x': `${sheet('MERIDIAN icons, 1x (16 and 32)', 1, 96, all)}
    <h2>16px on face / white / workspace / title bar</h2>${strip('face', 16)}${strip('white', 16)}${strip('desk', 16)}${strip('bar', 16)}
    <h2>32px on face / workspace</h2>${strip('face', 32)}${strip('desk', 32)}`,
  'sheet-4x-apps': sheet('MERIDIAN icons, 4x: applications', 4, 232, [all[0] ?? ['', []]]),
  'sheet-4x-files': sheet('MERIDIAN icons, 4x: file types', 4, 232, [all[1] ?? ['', []]]),
  'sheet-4x-ui': sheet('MERIDIAN icons, 4x: shell', 4, 232, [all[2] ?? ['', []]]),
  'sheet-4x-more': sheet('MERIDIAN icons, 4x: application detail', 4, 232, [all[3] ?? ['', []]]),
  'sheet-buttons': buttonSheet,
};

for (const [name, html] of Object.entries(sheets)) writeFileSync(join(here, `${name}.html`), html);

try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  for (const name of Object.keys(sheets)) {
    await page.goto(pathToFileURL(join(here, `${name}.html`)).href);
    await page.screenshot({ path: join(here, `${name}.png`), fullPage: true });
  }
  await browser.close();
  console.log(`icons: ${ICON_IDS.length} ids, ${Object.keys(sheets).length} sheets written to ${here}`);
} catch (err) {
  console.error('icons: HTML sheets written; PNG capture failed:', err);
  process.exitCode = 1;
}
