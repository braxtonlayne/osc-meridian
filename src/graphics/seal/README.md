# @graphics/seal

The OSC seal and the five division marks. Original artwork, drawn entirely in code as inline SVG. Nothing is derived from a real seal, coat of arms or agency mark.

## Exports

```ts
Seal({ size, variant: 'full' | 'mono' | 'tiny', title?, legend?, founded?, marks?, class? })
DivisionMark({ division: 'RD' | 'OIA' | 'TO' | 'FE' | 'PV', size, title?, class? })
DIVISION_NAMES  // code -> full division name
type SealVariant, DivisionCode, SealProps, DivisionMarkProps
```

- `title` sets `role="img"` and `aria-label`. Without it the seal is `aria-hidden` (use that for the watermark). Division marks default to the division's full name.
- `marks` is the number of ticks in the inner band, one per registered facility. It defaults to 47; callers with canon loaded should pass `canon.headline.facilities`.
- `legend` and `founded` default to `OFFICE OF STRATEGIC CONTINUITY` and `ESTABLISHED MMI`. Canon carries no founding year, so `MMI` is this module's choice (the earliest year in the source inventory); override `founded` if canon later fixes one.

## Design

The brief was a seal that a contractor vectorised from printed letterhead around 2002: flat, two inks, slightly over-ruled.

- **Rings.** A heavy outer rule with a hairline inside it, the legend band, a hairline, a band of 47 short radial marks, then the rule around the device.
- **Legend.** Bold caps set on a circle with `<textPath>`, top legend reading clockwise, founding line reading left to right along the bottom, two lozenges between them. `textLength` fixes the arc each line occupies, so the fallback font fills the same space as IBM Plex Sans.
- **Device.** A three-peak mountain in solid ink in front of a plain graticule (two meridians, three parallels). The central meridian is drawn heavier, runs down to the summit, and continues below grade in reverse, through three strata lines to a small square terminal. A round-headed portal with a double door sits at the foot of the mountain. It reads as "survey line over a mountain" first and as a cross-section second.
- **Mono.** The same drawing in `currentColor` with no paper disc. The reversed lines are cut with an SVG mask, so they are truly transparent and the seal works as the 4% desktop watermark and in print.
- **Tiny.** Not a scaled copy. It is a 16 x 16 bitmap (ring, peak, portal, one stratum) emitted as merged pixel rows with `shape-rendering="crispEdges"`. It is exact at 16 px and at whole multiples (32, 48, 64).
- **Division marks.** One hand for all five: double-ruled roundel, a line device in the upper field, the code reversed out of a solid lower segment.

| Code | Division | Device |
|---|---|---|
| RD | Records Division | tabbed file folder, two ruled lines |
| OIA | Office of Internal Assurance | checked verification box |
| TO | Transit Operations | tunnel bore with track |
| FE | Facilities Engineering | eight-tooth gear |
| PV | Personnel & Vetting | identification photograph |

## Colour

No colour is hard-coded. Everything resolves through two custom properties:

| Property | Default | Used for |
|---|---|---|
| `--seal-ink` | `var(--title-active-bg)` | rules, legend, device, mark devices |
| `--seal-paper` | `var(--paper)` | seal disc, reversed code letters, roundel field |

`mono` ignores both and uses `currentColor`. For the watermark, set `color` and `opacity: 0.04` on a wrapper. The `#fff` and `#000` inside the `<mask>` are mask luminance values, not painted colours.

Type uses `var(--font-ui)` in the style and an `Arial, Helvetica, sans-serif` stack in the `font-family` attribute, so the legend renders with no web font loaded.

Ids for the text paths, mask and clip path come from `useId`, so any number of seals can share a page.

## Rendered check

`node src/graphics/seal/render-check.mjs` (from the repo root) bundles `index.tsx` with esbuild, renders it with Preact in headless Chromium through Playwright, and writes PNGs to `check/`. The check page sets the tokens from `docs/SPEC.md` section 4 and loads IBM Plex Sans 700 from `@fontsource`.

| File | Shows |
|---|---|
| `check/seal-full-{512,64,32,16}.png` | two-ink seal on white |
| `check/seal-mono-{512,64,32,16}.png` | one-ink seal on paper |
| `check/seal-tiny-{512,64,32,16}.png` | pixel seal on window face |
| `check/seal-tiny-{16,32}-x8.png` | the 16 and 32 px renders enlarged 8x, nearest neighbour |
| `check/seal-watermark.png` | `mono` at 4% opacity on the workspace colour |
| `check/seal-full-256-fallback-font.png` | `--font-ui` unset, legend in Arial |
| `check/marks-{192,64,32,24}.png` | the five division marks in a row |

![Seal, full, 512 px](check/seal-full-512.png)

![Division marks, 64 px](check/marks-64.png)

Findings from the last run:

- `full` and `mono` are legible down to 64 px. At 32 px and below the legend is a grey band, which is expected; use `tiny` at those sizes.
- Division codes are readable at 32 px and marginal at 24 px. Do not use the marks below 24 px.
- The fallback-font render keeps the same legend arc as the Plex render.
