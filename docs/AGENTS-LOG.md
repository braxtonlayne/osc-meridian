# Agents log

Every subagent launched for this build, its brief (summarised; full briefs reference docs/SPEC.md and docs/CONTRACTS.md) and its result.
Orchestrator: Claude (Opus 5.5 / Fable 5.2 session). Graphics agents run with model **Fable** as required by SPEC §10.

## Wave A — 2026-11-19 (real time), Phase 0 + Phase 1 + non-data graphics, launched in parallel

| # | Agent | Model | Owns | Brief | Result |
|---|---|---|---|---|---|
| A1 | Canon extractor | inherit | content/canon/source.json, scripts/canon-merge.ts, src/core/canon-schema.ts, tests/unit/canon.test.ts, docs/CANON.md (source part), docs/canon/inconsistencies.md | Extract every lore fact to the Canon type; merge script with computed positions and derived figures; Zod validation; inconsistency report | pending |
| A2 | Canon extender A | inherit | content/canon/extended-a.json, docs/canon/extended-a.md | DELTA sites, BETA/GAMMA breakdowns, ALPHA levels, reactors (3 BETA chosen + justified), divisions, compartments, council seats, Charter II–VII, roster ~60, numbering scheme | pending |
| A3 | Canon extender B | inherit | content/canon/extended-b.json, docs/canon/extended-b.md | Glossary ≥130, 127 line items + FY split with exact sums, 47 contractors (≤3 sites, mean 8.3 subs), threat contingencies, cover catalogue, real-event footnotes, May 2008 calendar | pending |
| A4 | Design system | inherit | src/design/**, docs/STYLE.md | Tokens, fonts, primitives, DocumentView with distinct templates, print styles, gallery | pending |
| A5 | Shell | inherit | index.html, src/main.tsx, src/shell/**, src/core/{services,router,session,audit,persist}.ts, src/apps/index.ts | Boot, lock screen, window manager, taskbar, banners, router, services, audit, handheld mode | pending |
| A6 | Content pipeline | inherit | scripts/build-content.ts, scripts/content/**, scripts/{prerender,verify-dist,rehearse-pages}.ts, src/core/{docs,search,base}.ts | Markdown+directives → DocJson, build-time redaction + release files, route manifest, search index, prerender, dist verification | pending |
| G1 | OSC seal + 5 division marks | **Fable** | src/graphics/seal/** | Original seal full/mono/16px, division marks, rendered check | pending |
| G2 | Icon set 16/32 | **Fable** | src/graphics/icons/** | Pixel-hinted app/file-type/UI icons, one hand, contact sheets | pending |
| G11 | Scanned-document kit | **Fable** | src/graphics/scan/** | Paper/toner/punch holes, stroke-based handwriting generator, routing slip | pending |
| G12 | Banners, cover sheets, stamps | **Fable** | src/graphics/banners/** | Classification banners, marking strip, original cover sheet, stamp set | pending |
| G13 | Lock screen, access card, token, watermark | **Fable** | src/graphics/lock/** | Temporary access card, smart-token slot, watermark, backdrop | pending |
| G14 | Form furniture | **Fable** | src/graphics/forms/** | Checkboxes, signature generator, Code 39 barcode, form blocks, receipt | pending |
| G15 | Empty, error, refusal states | **Fable** | src/graphics/states/** | Refusal panel, empty/error states, withheld blocks | pending |
