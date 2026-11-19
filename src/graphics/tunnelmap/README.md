# @graphics/tunnelmap

Geographic tunnel map with certified and engineering layers (asset family 5). An engineering
GIS export of 2008: white sheet, pale land, hairlines, a drawing frame with graticule ticks and
a title block in the bottom-right corner. Inline SVG; colours and faces only from design tokens.

```tsx
import { TunnelMap } from '@graphics/tunnelmap';

<TunnelMap width={1400} height={860} layer="engineering" highlight="RAIL-04" onSelect={(id) => …} />
```

## Props

| Prop | Type | |
|---|---|---|
| `width`, `height` | `number` | Sheet size in px. Designed at 1400x860; below 1100 px wide the legend drops to the key alone and the title block scales down. |
| `layer` | `'certified' \| 'engineering' \| 'both'` | See below. |
| `highlight` | `string \| null` | A link id, or a facility id (every link at that site). Drawn with a flat grey casing; end labels go bold. |
| `onSelect` | `(id: LinkId \| null) => void` | Link clicked, or Enter/Space on a focused link; `null` for a click on the sheet. Links are focusable and carry an `aria-label` with both mileages. |

Link ids: `RAIL-01` … `RAIL-06`; `TRAM-<from>:<to>`, e.g. `TRAM-BETA-02:GAMMA-03`.

## Layers

- **engineering** (drawing `OSC-TRN-MAP-ENG`, Facilities Engineering). All six rail segments and
  all 27 tram links between the computed facility positions. Rail 2.6 px, tram 1.1 px; segment 04
  (NOT IN REVENUE SERVICE) dashed. The four GAMMA sites with no listed link are shown in grey.
  Hover or focus a link for its label: designation, stated miles, straight-line miles
  (`d3.geoDistance x 3958.8`, whole miles) and the ratio of the two.
- **certified** (drawing `OSC-TRN-MAP-CRT`, Transit Operations). Only the links in `certified.ts`,
  each flagged with its stated miles, a schedule in the legend, and the title block line
  `CERTIFIED ROUTE MILEAGE: 847` (value read from `canon.headline.tunnelCertifiedMi`).
- **both** (drawing `OSC-TRN-MAP-REC`, Comptroller, revision P1, CHECKED box empty). Engineering
  layer with the certified links overdrawn; legend carries both totals side by side. The hover
  label says whether a link is on the certified return.

## The certified 847 (`certified.ts`)

The source gives 847 miles with no list behind it. Exactly four subsets of the 33 listed links sum
to 847; this module uses the five-link one, all tram, no partial certification:

| Link | Miles | Rationale |
|---|---|---|
| ALPHA-01 to BETA-02 (Pittsburgh) | 218 | First link entered on the return; acceptance run witnessed by the Council Secretariat. |
| BETA-02 to GAMMA-03 (DC Metro) | 97 | Certified with the Pittsburgh link as one continuous route. |
| BETA-02 to GAMMA-04 (Philadelphia) | 156 | Same acceptance run as the DC Metro link. |
| BETA-10 to GAMMA-07 (Detroit) | 189 | Certified on the contractor completion certificate; the Chicago link that reaches it was not submitted. |
| ALPHA-05 to GAMMA-09 (Houston) | 187 | Only Southern Network link with a witnessed acceptance run on file at the cut-off. |
| | **847** | |

In-world reading: the return lists what had a witnessed acceptance run at its first cut-off and was
never amended. One of the five is an island the certified network cannot reach. This is an
extension to canon made here; if the canon owners prefer another subset, edit `CERTIFIED` only
(mileages are looked up, and `certified.test.ts` fails unless the sum equals canon).

The other exact subsets: Maine 527 + DC Metro 97 + Los Angeles 223; Minneapolis 713 + Portland 134;
and the set above with St. Louis (BETA-05, 189) in place of Detroit.

## Files

| File | |
|---|---|
| `index.tsx` | `TunnelMap`, layout, legend, title block, hover label. Re-exports the data helpers. |
| `links.ts` | `tunnelLinks` built from canon; `straightLineMiles`, `linkOf`, ids. |
| `certified.ts` | `CERTIFIED` (link + one-line rationale), `certifiedSumMi`, `isCertified`. |
| `geometry.ts` | `tunnelProjection(box)`, base map paths, link curves, label placement. |
| `tunnelmap.css` | All styling; selectors prefixed `.tm`. |
| `certified.test.ts`, `vitest.config.ts` | Folder check (the root Vitest include list covers only `tests/unit`). |
| `check/render.mjs`, `check/*.png` | Rendered check. |

## Geometry notes

- Base: `d3.geoAlbersUsa` fitted to the 48 states and DC from bundled `us-atlas/states-10m.json`
  (no network). Alaska and Hawaii are off the sheet. Same construction as `@graphics/map`
  `projectionFor`, but fitted to this sheet's own map box (the frame band and title block take
  room), so the two are not pixel-interchangeable; use `tunnelProjection(box)` to place anything
  on this sheet. Overlays get the box the map itself uses from `tunnelMapLayout(width, height).mapBox`
  (exported from the index), so `tunnelProjection(tunnelMapLayout(w, h).mapBox)` lines up exactly.
- Each link follows the great circle between its ends (28 samples) with a sideways sine bow of
  3.5 to 7 per cent of the chord (rail 5.5). The side comes from a hash of the link id; where two
  links leave a shared site within 25 degrees of each other they are set to bow apart.
  Fixed for a given size: nothing is random.
- Site labels and mileage flags are placed greedily against sites, links, flags, legend and
  title block, in a fixed order.

## Checks

```
node src/graphics/tunnelmap/check/render.mjs                    # PNGs at 1400x860 into check/
npx vitest run -c src/graphics/tunnelmap/vitest.config.ts      # certified links sum to canon 847
```

`check/engineering.png`, `check/certified.png`, `check/both.png`; hover labels in
`engineering-hover-segment-04.png`, `both-hover-certified.png`, `certified-hover.png`;
`engineering-highlight-alpha-05.png`; `both-small-900x560.png`.

## Tokens used

`--surface --paper --row-rule --chrome-shadow --text-1 --text-2 --text-3 --title-active-bg
--select-inactive-bg --tooltip-bg --tooltip-fg --tooltip-border --font-ui --font-mono`
