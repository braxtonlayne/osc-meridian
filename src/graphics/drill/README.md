# @graphics/drill

Seal drill graphics used by the Seal Drill Coordinator (`src/apps/drill`). Tokens only. Nothing animates beyond what the drill clock already moves, so reduced motion needs no special case.

## Gantt

`<Gantt rows width now span label words selected onSelect />` is an SVG timeline with one row per site and drill minutes across. Each row fills from the left up to `now`:

- receipt tick
- waiting for acknowledgement (outline)
- door cycle (grey), or held (dashed) when `doorsDone` is null
- checks to the seal report (dark)
- sealed square

A dashed stop marks `sealBy`, the class seal time. A no-report site gets a cross at its deadline. The SVG is a keyboard listbox: arrows, Home and End change the selection. Use `ganttHeight(n)` to size a scroll area.

An acknowledgement may come before the receipt (the order-wire site). The rows draw that case as it is and don't clamp it.

## PortalMarks / PortalGlyph

`<PortalMarks width height marks selected />` is an absolutely positioned overlay that sits on top of `@graphics/schematic`'s `LineDiagram`, at the same width and height. It draws a two-leaf portal beside each node, on the side away from the node's label:

- open
- closing (`closed` 0..1)
- closed and barred
- `?` for no report or order not passed

`boardTransform(width, height)` copies LineDiagram's fit transform. That includes the legend band added under the board at or below 640 px wide. If the schematic changes its geometry constants, update `LEGEND_BELOW_W` and `LEGEND_BAND_H` here to match. An export from the schematic module would remove this duplication.

`PortalGlyph` is the same symbol at legend size.

## DrillMapLayer / MapRingGlyph

`DrillMapLayer` is a child layer for `@graphics/map`'s `UsMap`. It draws:

- site rings by status: order received, acknowledged, sealing, sealed, no report, not passed
- relay lines (inter-hub, tram order wire, voice call)

`MapRingGlyph` draws one ring for a map key.
