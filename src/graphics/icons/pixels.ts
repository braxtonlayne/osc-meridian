/** Icon registry and rasterisation. No JSX here, so build scripts and the render check can import it. */
import { APPS } from './apps';
import { Cv, toPaths, type IconDef, type InkPath } from './canvas';
import { CONTROLS } from './controls';
import { MORE } from './more';
import { FILES } from './files';
import { PLANT_APPS } from './plant';
import { UI } from './ui';

const DEFS = { ...APPS, ...PLANT_APPS, ...FILES, ...UI, ...MORE, ...CONTROLS } as const;

export type IconId = keyof typeof DEFS;
export type IconSize = 16 | 32;
/** `button` (default) draws caption, sort and toolbar glyphs on a raised face; `glyph` draws them bare. Other icons ignore it. */
export type IconVariant = 'button' | 'glyph';

/** The first twelve applications, then the twelve plant set pieces; each id equals its AppId. */
export const APP_ICON_IDS = [...Object.keys(APPS), ...Object.keys(PLANT_APPS)] as ReadonlyArray<
  keyof typeof APPS | keyof typeof PLANT_APPS
>;
export const FILE_ICON_IDS = Object.keys(FILES) as ReadonlyArray<keyof typeof FILES>;
export const UI_ICON_IDS = Object.keys(UI) as ReadonlyArray<keyof typeof UI>;
export const MORE_ICON_IDS = Object.keys(MORE) as ReadonlyArray<keyof typeof MORE>;
/** Plant toolbar and state icons (pass two). */
export const CONTROL_ICON_IDS = Object.keys(CONTROLS) as ReadonlyArray<keyof typeof CONTROLS>;
export const ICON_IDS: readonly IconId[] = [
  ...APP_ICON_IDS,
  ...FILE_ICON_IDS,
  ...UI_ICON_IDS,
  ...MORE_ICON_IDS,
  ...CONTROL_ICON_IDS,
];

/** Ids that have a separate bare-glyph drawing. */
export const BUTTON_ICON_IDS: readonly IconId[] = ICON_IDS.filter((id) => (DEFS[id] as IconDef).sg !== undefined);

export function isIconId(id: string): id is IconId {
  return Object.prototype.hasOwnProperty.call(DEFS, id);
}

const cache = new Map<string, readonly InkPath[]>();

/** The icon as one path per ink, in a `0 0 size size` user space. */
export function iconPaths(id: IconId, size: IconSize, variant: IconVariant = 'button'): readonly InkPath[] {
  const key = `${id}/${size}/${variant}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def: IconDef = DEFS[id];
  const c = new Cv(size);
  const bare = variant === 'glyph';
  const draw = size === 16 ? (bare && def.sg) || def.s : (bare && def.lg) || def.l;
  draw(c);
  const paths = toPaths(c);
  cache.set(key, paths);
  return paths;
}

/** Standalone SVG markup (prerender, favicons, the render check). `scale` must be an integer. */
export function iconSvg(id: IconId, size: IconSize, scale = 1, variant: IconVariant = 'button'): string {
  const body = iconPaths(id, size, variant)
    .map((p) => `<path fill="${p.fill}" d="${p.d}"/>`)
    .join('');
  const px = size * Math.max(1, Math.round(scale));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${body}</svg>`;
}
