/**
 * @graphics/icons: MERIDIAN application, file-type and shell icon set.
 * 16px and 32px, drawn separately on the integer pixel grid. See README.md.
 */
import type { JSX } from 'preact';
import {
  APP_ICON_IDS,
  FILE_ICON_IDS,
  ICON_IDS,
  MORE_ICON_IDS,
  UI_ICON_IDS,
  iconPaths,
  type IconId,
  type IconSize,
  type IconVariant,
} from './pixels';

export {
  APP_ICON_IDS,
  BUTTON_ICON_IDS,
  FILE_ICON_IDS,
  ICON_IDS,
  MORE_ICON_IDS,
  UI_ICON_IDS,
  iconPaths,
  iconSvg,
  isIconId,
} from './pixels';
export type { IconId, IconSize, IconVariant } from './pixels';
export { PALETTE as ICON_PALETTE } from './canvas';

export interface IconProps {
  id: IconId;
  size: IconSize;
  /** Accessible name. Omit for decoration beside a visible label. */
  title?: string;
  /** Caption, sort, tree and toolbar glyphs only: raised button (default) or bare glyph. */
  variant?: IconVariant;
  class?: string;
}

export function Icon({ id, size, title, variant = 'button', class: cls }: IconProps): JSX.Element {
  const paths = iconPaths(id, size, variant);
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      shape-rendering="crispEdges"
      focusable="false"
      data-icon={id}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle' }}
    >
      {title ? <title>{title}</title> : null}
      {paths.map((p) => (
        <path key={p.fill} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}

const GROUPS: ReadonlyArray<{ name: string; ids: readonly IconId[] }> = [
  { name: 'Applications', ids: APP_ICON_IDS },
  { name: 'File types', ids: FILE_ICON_IDS },
  { name: 'Shell', ids: UI_ICON_IDS },
  { name: 'Application detail', ids: MORE_ICON_IDS },
];

/** Gallery of the whole set at both sizes, for the About panel and for review. */
export function IconSprite({ group }: { group?: 'apps' | 'files' | 'ui' | 'more' }): JSX.Element {
  const pick = group === 'apps' ? [GROUPS[0]] : group === 'files' ? [GROUPS[1]] : group === 'ui' ? [GROUPS[2]] : group === 'more' ? [GROUPS[3]] : GROUPS;
  return (
    <div data-icon-sprite={ICON_IDS.length}>
      {pick.map((g) =>
        g ? (
          <table key={g.name} style={{ borderCollapse: 'collapse', marginBottom: '8px' }}>
            <caption style={{ textAlign: 'left', fontWeight: 600 }}>{g.name}</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left', padding: '2px 8px 2px 0' }}>16</th>
                <th scope="col" style={{ textAlign: 'left', padding: '2px 8px 2px 0' }}>32</th>
                <th scope="col" style={{ textAlign: 'left', padding: '2px 0' }}>Identifier</th>
              </tr>
            </thead>
            <tbody>
              {g.ids.map((id) => (
                <tr key={id}>
                  <td style={{ padding: '2px 8px 2px 0' }}>
                    <Icon id={id} size={16} />
                  </td>
                  <td style={{ padding: '2px 8px 2px 0' }}>
                    <Icon id={id} size={32} />
                  </td>
                  <td style={{ padding: '2px 0' }}>
                    <code>{id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null,
      )}
    </div>
  );
}
