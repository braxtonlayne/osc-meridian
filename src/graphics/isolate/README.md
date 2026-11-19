# @graphics/isolate

Graphics for the Network Isolation panel (isolate app). Drawn by an Opus agent (pass two). Tokens only, no motion.

| Export | Props | Notes |
|---|---|---|
| `TamperSeal` | `no`, `broken`, `width?`, `height?` | Wire-and-tag seal drawn in the GuardedSwitch unit's 150 x 160 frame, to be absolutely positioned over `.pk-guard__unit` while the cover is closed. Intact: taut wire tab -> crimp -> eye, tag on the crimp. Broken: cut ends hang, tag dropped, "SEAL BROKEN". `role=img` with the seal number and state. |
| `HubMimic` | `nodes: HubNode[]`, `links: HubLink[]`, `width`, `height`, `label` | Hub circuits as a panel-kit mimic (`MimicSvg`, `MimicLine`, `MimicBox`). Hubs placed by rank of longitude (across) and latitude (down), so a schematic, not a map. Live circuit solid, dropped dashed. |

Rendered check: `src/apps/isolate/check/12b-seal-intact-zoom.png`, `16b-seal-broken-zoom.png`, `07-links-isolated.png` (from `node src/apps/isolate/check/shoot.mjs` with a dev server on 5302).
