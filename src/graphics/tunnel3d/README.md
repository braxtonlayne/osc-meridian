# @graphics/tunnel3d

Three-dimensional tunnel network view for Transit Control (SPEC 8.2). An engineering depth model:
a flat plate of the lower 48 with each facility as a shaft to its recorded depth and each rail
segment and tram link as a tube at tunnel depth. Flat shading, thin edges, greys and navy from the
design tokens. Orthographic by default.

## Use

```tsx
import { TunnelView } from '@graphics/tunnel3d';

<TunnelView trains={trains} selected={key} onSelect={setKey} />   // parent needs a height
```

```ts
import { mountTunnelView } from '@graphics/tunnel3d';

const view = mountTunnelView(el, { trains, selected: '03', onSelect, reducedMotion });
view.update(trains);      // every simulation tick; boxes are moved, not recreated
view.select('ALPHA-03');  // link key or facility id; '' or null clears
view.dispose();
```

| Option | |
|---|---|
| `trains` | `{ id, kind: 'rail' or 'tram', link, pos, label, suppressed? }[]`. `link` is a segment number `"01".."06"` or a tram key `"FROM>TO"` (the reverse order is accepted; `pos` is then measured from the first-named end). `pos` is 0..1. A train whose link is unknown is not drawn. |
| `suppressed` | Plain grey box, no label. Nothing in the legend or read-out refers to it. |
| `selected` | Link key or facility id. |
| `onSelect(key)` | User selection (click, or Page Up / Page Down). Called with `''` when the selection is cleared. |
| `reducedMotion` | Trains jump instead of gliding. Defaults to the `prefers-reduced-motion` query. The scene has no other motion. |
| `projection` | `'orthographic'` (default) or `'perspective'`; also a toolbar toggle. |

Importing the module does not load three.js. `mountTunnelView` dynamically imports `scene.ts`, the
only file that imports `three`, so three stays in one lazy chunk. Calls made before it arrives are
queued. If no WebGL context is available the container shows a plain in-world notice.

## What is drawn, and from what

- **Plate.** State outlines from us-atlas `states-albers-10m`, lower 48 only, simplified and written
  to `plate-data.ts` by `check/gen-plate.mjs` (36 kB source; us-atlas itself is not bundled).
  Facilities are projected at runtime with `d3.geoAlbersUsa().scale(1300).translate([487.5, 305])`,
  the frame those files use, from canon `lat` / `lon`.
- **Shafts.** Surface collar plus a square shaft to canon `depthFt`, width by class. Sites with no
  recorded depth (some DELTA) get the collar only.
- **Vertical exaggeration x800**, stated in the legend. One plate unit is about 3.05 miles, so at
  true scale the deepest shaft would be about a tenth of a pixel. The constant is
  `VERTICAL_EXAGGERATION` in `scene.ts`; the legend reads it.
- **Depth band.** Parsed from canon `transitTech.averageDepth` (600 to 1,200 ft) and drawn as two
  rectangles round the frame. Rail runs in the lower third of the band, tram in the upper third.
  Each link's running depth is a fixed hash of its key, so crossing tunnels do not coincide and the
  drawing is identical on every load. Rail terminates at the bottom of each ALPHA shaft; trams
  terminate at station depth at BETA and GAMMA sites and join ALPHA shafts at running depth.
  Per-link running depths are a drawing convention, not canon, and are never printed.
- **Paths** follow the great circle between sites (`d3.geoInterpolate`), 64 samples.
- **Segment 04** (any segment whose canon status is not IN REVENUE SERVICE) is a dashed grey tube
  with a dashed tag. Nothing is special-cased by number.
- **Reference frame** to the deepest class limit in canon (2,400 ft), with a depth scale.

`model.ts` is pure (no three, no DOM): `buildTunnelModel()`, `resolveLink()`, `pointOnLink()`.

## Interaction

Drag to orbit (azimuth within 80 degrees of north-up, elevation 4 to 89.5 degrees); Shift-drag or
right-drag to pan; wheel to magnify. Click a shaft or tunnel to select; picking is done in screen
space with a 7 px tolerance so thin tubes are easy to hit. The selection gets a dark outline and
its particulars appear in the read-out strip (a polite live region).

The canvas is focusable: arrow keys rotate, Shift+arrows pan, `+` / `-` magnify, Page Up / Page
Down step through the 33 links then the 47 sites, Home restores the oblique view, Escape clears.
Toolbar: Oblique, Plan, Section, Orthographic toggle, magnification.

Labels are DOM elements positioned over the canvas (token fonts, crisp at any scale). ALPHA labels
and rail segment numbers always show; BETA, GAMMA and DELTA labels appear as the view is magnified.

## Performance and disposal

Rendering is on demand: a frame is drawn when the camera, selection or trains change, and
`requestAnimationFrame` runs only while a train is gliding to a new position. `dispose()` cancels
the frame, disconnects the ResizeObserver, removes listeners and DOM, disposes every geometry and
material, disposes the renderer and forces the GL context to be released.

## Rendered check

```
node src/graphics/tunnel3d/check/render.mjs          # screenshots, 1200x760, headless Chromium
node src/graphics/tunnel3d/check/render.mjs --size   # also prints production chunk sizes
node src/graphics/tunnel3d/check/gen-plate.mjs       # regenerate plate-data.ts
```

| File | Shows |
|---|---|
| `check/01-oblique.png` | Standard view, nine sample consists and one suppressed box on segment 04 |
| `check/02-plan.png` | Plan |
| `check/03-section.png` | Section from the south: rail below tram inside the band |
| `check/04-keyboard-segment-04-selected.png` | Keyboard only: Page Down to segment 04, arrow-key rotation |
| `check/05-click-site-magnified.png` | Pointer selection of ALPHA-03, magnified, BETA labels on |
| `check/06-perspective.png` | Perspective projection |

The sample consists live in `preview.tsx` and are for the check only. Preview page on the dev
server: `/src/graphics/tunnel3d/preview.html` (`?static=1` freezes the trains).

Chunk sizes (isolated production build of the preview page): the lazy scene chunk is 837 kB,
228 kB gzip. That figure includes canon.json (61 kB gzip) and d3-geo, which the application ships
in shared chunks anyway; three.js is most of the rest. The entry (`mount.ts`, wrapper, CSS) is
about 2 kB.
