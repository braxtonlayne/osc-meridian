# @graphics/lock (asset family 13)

Lock-screen graphics for MERIDIAN. Presentational only: no state, no services, no network. Colour comes from design tokens; the only stylesheet is `lock.css` (class prefix `lk-`, unlayered).

## Exports (`index.tsx`)

| Export | Notes |
|---|---|
| `AccessCard({ operatorId, passphrase, displayName, tier, site, issued, expires, cardNo, formRef?, seal?, class? })` | The temporary access card issued at in-processing, as an on-screen panel. HTML, fluid up to 408px, holds together down to about 280px. Operator ID and passphrase sit in a boxed "ISSUED CREDENTIALS" block in `--font-mono` with `user-select: all`, so one click selects a value. `tier` takes a number (`3` prints "TIER 3") or a label. Dates are passed in house format (`05 MAY 2008`). `cardNo` drives a Code 39 strip. |
| `SmartToken({ inserted, model?, class? })` | Desktop token reader, front elevation, SVG 180 x 60, pixel-aligned. Status is a 10px square plus "TOKEN PRESENT" / "NO TOKEN". |
| `DesktopWatermark({ seal?, class? })` | `--ws-bg` fill with the mono seal centred at 4% opacity. Absolutely fills its positioned parent, sized `min(62cqmin, 560px)` of that parent, `pointer-events: none`, `aria-hidden`. |
| `LockBackdrop({ watermark?, seal?, class? })` | Flat `--ws-bg` with a 32px one-pixel grid (3%) and a heavier line every 128px. SVG `<pattern>`, so no gradients. `watermark` adds the 4% seal behind the grid. |
| `SelfTestRow({ label, status, word?, detail? })` | One pre-boot self-test line: mono label, dotted leader, optional detail, 10px square, word. `status`: `nominal` `degraded` `fault` `offline` `pending`. Wrap rows in an element with `role="list"`. |
| `code39Bars(value)` | Bar geometry used by the card strip. |

## Seal

`Seal` is imported from `../seal/index` (mono, `currentColor`). Every component that draws it also takes a `seal` slot to substitute another mark, for example `<AccessCard seal={<DivisionMark division="RD" size={34} />} … />`.

## Tokens used

`--ws-bg --chrome-face --chrome-hi --chrome-shadow --chrome-outer --paper --surface --text-1 --text-2 --text-3 --font-ui --font-mono --st-nominal --st-degraded --st-fault --st-offline`

## Wording

All card and notice text is original. The card asks for nothing and names no real agency. `displayName` should be an in-world designation, never a name the visitor typed. The default form reference (`SO FORM 22 (REV 02-08)`) is not from canon; pass `formRef` if canon defines a form numbering scheme for the Security Office.

## Rendered check

`preview.html` + `preview.tsx` compose a lock-screen mock with sample operator data (`preview.html#sheet` shows the components on their own). The window chrome, inputs, buttons and banner strip in the mock are preview-only stand-ins in `preview.css`; the shell and `@graphics/banners` own the real ones.

    node src/graphics/lock/check/render.mjs

bundles the preview with esbuild into the OS temp folder, loads it in Playwright Chromium from `file:` (it logs any non-file request) and writes:

- `check/lock-1440x900.png`: desktop lock screen
- `check/lock-390x844.png`, `check/lock-390-full.png`: handheld, first screen and full page
- `check/components.png`: token reader in both states at 1x and 2x, self-test rows, card at 408px and 300px, watermark and backdrop

The script uses `src/design/tokens.css` when it exists; `preview.html` carries a mirror of the SPEC section 4 values so the page also renders without it.
