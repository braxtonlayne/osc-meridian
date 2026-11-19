# @graphics/depth3d

Depth cross-section viewer for the five ALPHA sites. One parametric model, read from canon
(`facilities[].levels`, `depthFt`, `railSegments`, `tramNetworks`), drawn two ways: a Three.js
cutaway (lazy) and an SVG elevation (no WebGL, print, prerender).

## Use

```ts
// Registry app: the module itself is small; three arrives with the first mount.
const { mountDepthViewer } = await import('@graphics/depth3d');
const viewer = mountDepthViewer(el, 'ALPHA-03', {
  tier: session.tier.value,          // 3, or 2 when acting
  onSelectLevel: (n) => { /* user picked level n */ },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
});
viewer.selectLevel(6);   // programmatic; does not call onSelectLevel
viewer.setTier(2);
viewer.dispose();        // frees every GPU resource and empties el
```

```tsx
import { DepthViewer, DepthSection2D } from '@graphics/depth3d';
<DepthViewer facilityId="ALPHA-01" tier={3} onSelectLevel={fn} />   // fills its parent (min-height 420px)
<DepthSection2D facilityId="ALPHA-01" tier={3} />                    // static SVG, 760 x 640 viewBox
```

`el` needs a size (the viewer fills it). `DepthViewer` renders the SVG first, mounts the
interactive viewer over it, and prints the SVG only.

Extra option, not in the contract: `renderer: '2d'` forces the SVG elevation.
An unknown site, or one with no level record, shows "No depth section is held for <id>."

## What is drawn

| Element | Source |
|---|---|
| Level slabs: top, height, floor | `levels[].topFt`, `heightFt` |
| Depth scale: tick every 100 ft, heavy tick and bold figure at the terminal floor | `depthFt` |
| Level names, or a black bar when `level.tier < session tier` | `levels[].name`, `tier` |
| Surface boxes, one per building named in level 0 | level 0 name (split on "and") |
| Maglev bores, one per rail segment at the site, alternating sides | `railSegments` |
| Tram bore, on the side with fewer rail bores | `tramNetworks[].hubs` |
| Lift shaft: upper works floor to terminal top. Decline: grade to terminal top | derived from levels |

The unit test (`model.test.ts`) asserts for all five sites that the terminal floor equals
`depthFt` and that every slab sits at its canon depth.

**Not canon:** plan widths, the 1 in 6 decline grade, and surface building heights
(`PLAN` in `model.ts`). The title block states "Horizontal extents schematic."

**Redaction:** a withheld name is never written to the DOM, only a bar sized from its
length. The slab, its number, tier and depths remain. Note that the names themselves are
in `canon.json`, which the application bundles; see "Open points".

## Controls

- Drag: orbit, limited to 65 degrees either side and 52 to 90 degrees elevation. Shift-drag or right-drag: pan. Wheel: zoom about the pointer.
- Toolbar: Orthographic (default) / Perspective, Whole section / Lower levels, Zoom in / Zoom out.
- Click a slab, a label or an index row to select. Arrow up / arrow down, Home, End change level; `+` and `-` zoom.
- `reducedMotion: true` removes the 200 ms camera move.

## Look

Flat per-face shades baked into vertex colours with `MeshBasicMaterial`: no lights, shadows,
fog or post-processing. Black `EdgesGeometry` lines. Section hatch drawn on a canvas and
applied to cut rock faces in world units. All colours are read from the design tokens at
mount. Scale, leaders and labels are an SVG/HTML overlay projected from the model.

## Budget

- Lazy chunk (three, tree-shaken, plus `scene.ts`): **538 kB minified, 137 kB gzip** (esbuild; Vite will be close).
- Eager part of this module (frame, model, 2D elevation, wrapper): 9 kB minified, plus `canon.json`, which the shell already loads.
- About 22 draw calls and under 1,500 triangles per site. Rendering is on demand: nothing is drawn while the view is at rest. Pixel ratio capped at 2.
- Frame rate was not measured on hardware: the check runs on SwiftShader (software).

## Rendered check

`node src/graphics/depth3d/check/render.mjs` bundles `check/harness.tsx`, serves it on
loopback, and writes these at 1000 x 700 (Chromium, WebGL through SwiftShader):

| File | Shows |
|---|---|
| `check/alpha-01.png` | ALPHA-01, 2,100 ft, orthographic, tier 3 |
| `check/alpha-03.png` | ALPHA-03, 1,200 ft, orthographic, tier 3 |
| `check/alpha-01-lower-selected.png` | "Lower levels" framing, level 6 selected from the index |
| `check/alpha-02-perspective-tier2.png` | Perspective, tier 2 (tier 2 names released), keyboard selection, Segment 04 bore |
| `check/fallback-2d-alpha-01.png`, `check/fallback-2d-alpha-03.png` | SVG elevation in the same frame; 3D buttons disabled |
| `check/detail-index-2x.png` | Index and scale at 2x |

The script also confirms that `dispose()` leaves the host element empty and that the Preact
wrapper goes live.

## Open points

- CONTRACTS.md lists `mountDepthViewer(...) => dispose`; this returns `{ dispose, selectLevel, setTier }` as briefed.
- Tier 1 level names (for example ALPHA-01 levels 11 and 12) are present in `canon.json`. The viewer does not display them, but the "Tier 1 never ships" rule is not met by the data file.
- Sides of the bores are assigned by segment order, not by compass bearing.
