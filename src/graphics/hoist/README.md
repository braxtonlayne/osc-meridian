# @graphics/hoist

Shaft hoist graphics used by Shaft Hoist Control (`src/apps/hoist`). Tokens only. Drawn by Claude (Opus).

## ShaftElevation

`<ShaftElevation facilityId tier cages selectedLevel onSelectLevel width height />` renders the depth3d `DepthSection2D` for a site with a second SVG laid exactly over it. The overlay draws:

- one lane per hoist across `PLAN.shaftX0..shaftX1`
- the rope from the head frame and the cage box at its live depth
- landing ticks and a short label for the selected hoist

The overlay does not take pointer events, so level selection still goes to the section.

`sectionTransform(model, width, height)` repeats DepthSection2D's margins and fit. `elevation.test.ts` pins it, so a change to DepthSection2D's layout will fail that test, not drift silently. If depth3d ever exports its transform, use that one instead.

## DepthIndicator

`<DepthIndicator marks limits posFt target calls zone height label />` is a vertical depth scale from the collar to the bottom limit:

- **marks:** landing-zone vanes. A mark with a level is numbered; one without (`level: null`) is a bare tick.
- **limits:** dashed final limits.
- **target:** highlight for the selected landing.
- **calls:** small squares for registered calls.
- **pointer:** the cage pointer, amber while in a landing zone.

## Motion

Nothing here animates on its own. The cage moves only because the app re-renders with a new depth, so reduced motion needs no special case.
