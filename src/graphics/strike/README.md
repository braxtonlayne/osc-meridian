# @graphics/strike

Local plot for the Hardened Site Survivability Estimator (planning model PM-3). Drawn by an Opus
agent in pass two.

| Export | Purpose |
|---|---|
| `LocalPlot(props)` | SVG plot around a point: azimuthal equidistant projection centred on it, land and state lines from the bundled `@graphics/map` outline, PM-3 contour rings (exact circles in this projection) labelled in psi, class markers (`MarkerShape` from `@graphics/map`), scale bar, north arrow. Optional `ghost` draws a second point and its outer ring dashed (scenario comparison). `onPick` reports the ground point under a click; `onSelectSite` a marker click. |
| `projectionAt(center, w, h, spanMi, radiusMi)` | The projection the plot uses (pixels per mile = shorter side / span). |
| `spanFor(outerMi, margin, minSpan)` | Span that shows the outermost ring with a margin. |

Register: a GIS client's "local plot" window. Rings are 1 px lines (outermost dashed), labels in
Plex Mono with a paper halo, the point is a plain cross and circle. Severity is never shown by
colour; the condition words are in the result table.

Rendered check: `src/apps/strike/check/*.png` (the app's Playwright screenshots) show the plot at
several spans.
