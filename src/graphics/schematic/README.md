# @graphics/schematic (asset family 4)

Dispatcher's line diagram of the six maglev rail segments and the four tram networks, drawn as a 2008 control-room mimic panel: orthogonal and 45 degree runs on a fixed board, no anti-aliased geometry (`shape-rendering: crispEdges`), status in words. SVG, Preact, no d3 at runtime. Colour comes from design tokens through `schematic.css` (class prefix `sc-`, unlayered).

## Exports (`index.tsx`)

| Export | Notes |
|---|---|
| `LineDiagram(props)` | The diagram. Also the default export. |
| `SCHEMATIC_LAYOUT` | `{ width: 1400, height: 800, grid, nodes, links, nodeById, linkByKey, networkNames }`. Hand-placed logical coordinates; identical on every render. |
| `linkKey(segmentOrTramLink)` | `"02"` for a canon rail segment, `"ALPHA-01>BETA-02"` for a canon tram link. |
| `railKey(no)`, `tramKey(from, to)`, `blockKey(link, n)`, `isRailKey(key)`, `resolveLink(ref)` | Key helpers. `resolveLink` also accepts `"4"` and a tram key written B>A. |
| types | `LineDiagramProps`, `SchematicTrain`, `Occupancy`, `DiagramNetwork`, `SchematicLink`, `SchematicNode` |

### Props

- `width`, `height`: pixel size. The board scales uniformly (45 degree runs stay 45 degrees) and is centred; type stays 8 to 10px. Below 0.8 scale (roughly under 1120 x 640) it switches to a compact form: short ids (`A-01`, `B-07`), no place names, no block numbers, no tram mileage, shorter legend.
- `network`: `'ALL'` (default), `'RAIL'` (tram hidden), or a `NetworkId` (that network's tram links, with rail kept as context). Node positions do not move between views.
- `trains`: `{ id, kind, link, pos, dir, label, suppressed? }[]`. `pos` 0 is the link's A end (canon `a` / `from`), 1 its B end; `dir` 1 heads toward B. `suppressed` prints the label as `#` characters (same length, minimum four). Trains on a hidden link are not drawn.
- `occupancy`: `Record<key, 'CLEAR' | 'OCCUPIED' | 'POSSESSION' | 'DARK'>`. A key is a link key (whole link) or `blockKey(link, n)` for one block section, 1-based from the A end; a block entry wins. The diagram does not derive occupancy from trains; the sim supplies both.
- `selected`: a link key or facility id. `onSelectLink(key)`, `onSelectNode(id)`: click, Enter or Space.

### What is drawn

- ALPHA: station box with the id and the tram network it is hub of. BETA: small open box. GAMMA: small solid square. Place names are the tram table labels from canon.
- Rail: hollow double-line track with block joints and block numbers (`0203` = segment 02, block 3). Tram: single thin line.
- Each rail segment carries a tag: boxed segment number, mileage in mono, a status square and the status word (the worst state among its blocks). Tram links show mileage only, plus a square when not clear.
- CLEAR is the plain track, OCCUPIED a solid dark block, POSSESSION a hatched block with a `P` box, DARK a grey dashed line. Colour appears only in the status squares.
- Segment 04 is dashed and labelled NOT IN REVENUE SERVICE whenever canon gives it that status. Pass `'04': 'DARK'` for the normal dark state.

Mileage, link membership, hub assignment and segment status are read from canon (`railSegments`, `tramNetworks`). Block counts (one per about 200 rail miles, 300 tram miles) are a drafting convention of this diagram and are not canon figures; the sim should take `SCHEMATIC_LAYOUT.links[n].blocks` if it wants to match.

## Performance

Geometry is built once per size (`useMemo`). The track, nodes, tags and legend are one memoised layer that re-renders only when size, network, selection or occupancy values change (occupancy is compared by value, so a fresh object each tick is fine; callbacks are read through a ref). Trains are a separate layer: one memoised `<g transform>` each, positioned from precomputed polyline lengths with no DOM measurement, so a tick rewrites transform attributes only. Measured in the check: 30 trains at 4 updates a second, about 5 ms per update in headless Chromium.

## Accessibility

Every link and node is a `role="button"` with `tabindex="0"`, an `aria-label` (segment, ends, miles, state) and `aria-pressed`. Focus shows as a dotted 1px rectangle. The train layer is `aria-hidden`; the app's timetable and occupancy tables carry that information as text.

## Tokens used

`--paper --surface --th-bg --chrome-shadow --text-1 --text-2 --text-3 --st-nominal --st-degraded --st-offline --select-bg --select-fg --select-inactive-bg --focus-ring --font-ui --font-mono`. The board background is `--sc-bg` (defaults to `--paper`); override it on `.sc-root` if the host panel is a different surface.

## Rendered check

    node src/graphics/schematic/check/render.mjs

bundles `preview.tsx` with esbuild into the OS temp folder, loads it in Playwright Chromium from `file:` with the real `tokens.css`, and writes:

- `check/diagram-1400x800.png`, `check/diagram-700x500.png`: all networks, sample traffic, a block possession on segment 05, a link possession on a tram link, a suppressed consist on segment 04
- `check/rail-only-1400x800.png`, `check/eastern-700x500.png`: network filter
- `check/focus-selected-1400x800.png`: keyboard focus and selection (the script tabs to a link and presses Enter)

It also prints the 30-train timing. Consist identities in `preview.tsx` are sample data, not canon.
