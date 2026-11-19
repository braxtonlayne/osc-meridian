# BUILD SPEC: OSC "MERIDIAN" (owner's brief, verbatim intent)

> This is the project owner's build prompt, preserved for every agent. Interfaces are fixed in `docs/CONTRACTS.md`.

## 1. What this is

A static website, deployable to GitHub Pages, that presents itself as the internal workstation environment of a fictional US government body: the **Office of Strategic Continuity (OSC)**. The visitor "logs in" to a hardened terminal and gets a full desktop: windows, taskbar, applications, a document library, internal mail, a live transit control board, a facility registry, forms, directives, and a terminal.

It is a toy and a piece of worldbuilding. Nothing in it is real, nothing in it talks to a server, and nothing in it does anything. But every screen must hold up to the question "would a real agency have shipped this?" The effect is the specific unease of opening a mundane internal system that was never meant to be seen. The horror is in the boredom: revision numbers, distribution lists, a leave-request form that sits two clicks from a reactor status page.

**The in-world name of the environment is MERIDIAN** (full title: *MERIDIAN Workstation Environment, release 4.1.7*, the OSC's closed internal network). The in-world date is **May 2008** and never advances past 31 May 2008. Clock time of day follows the visitor's real clock; the date is pinned.

### The lore source
`lore/source-facility-inventory.html` is canon. **Take every fact from it. Take nothing visual from it.** No green-on-black, no Share Tech Mono, no typewriter boot text, no warning-triangle emoji, no "ACCESS GRANTED."

## 2. Non-negotiable constraints
1. **Static only.** Runs from GitHub Pages under a project subpath. All asset URLs respect a configurable base. No server, no analytics.
2. **Zero runtime network requests to third parties.** Fonts, map geometry, libraries, sounds: all bundled and self-hosted. A test fails the build if any page makes a cross-origin request.
3. **At least 100 addressable pages; target 240.** A "page" is a unique deep-linkable route with its own substantial, hand-shaped content, openable in a window. A test counts routes and fails under 100.
4. **Everything is built.** No "coming soon," lorem ipsum, placeholder panels, dead buttons. If a control exists it does something, even if that is an in-world refusal ("Requires Tier 2 compartment briefing. Reference DIR-0412.").
5. **All graphics are original and drawn in code** (SVG, Canvas, WebGL). No stock images, no AI-image files, no emoji as iconography. Every graphic asset is produced by a subagent running the Fable model.
6. **It is fiction and never pretends otherwise outside the frame.**

## 3. Fiction guardrails
- Real agencies appear only as the lore uses them: cover identities and funding lines in fictional documents. Use them comedically and in canon: if something that really occurred can be explained by OSC involvement, make it so (without naming real private individuals as OSC members).
- **The login is theater.** It never asks for an email, real name, or anything resembling a real credential. The visitor is handed in-world credentials on screen (issued operator ID and passphrase printed on a "temporary access card" panel) and types those. Any input is accepted. Nothing typed is transmitted or stored beyond localStorage.
- **No `.gov` mimicry.** No fake government domain as the site's address, no US Web Design System components, no copied federal privacy/warning text. Write original notices in the same register.
- A colophon link in the lock-screen footer states plainly that this is a work of fiction.

## 4. Art direction: boring, heavy, exact
Reference: the software cleared people actually used in 2008: a locked-down enterprise desktop, records-management client, logistics ERP, thick-client mail, a portal with a classification banner bolted on. Dense, grey, competent, a little ugly, built by a contractor to a requirements document.
**Commit to institutional weight.** Flat panels with 1px bevels. Small type. Lots of tables. Status in words, not colours. Chrome that has not been redesigned since 2003.

### Tokens (CSS custom properties; no hard-coded colours anywhere else)
- Workspace `#3A4652` with a faint original OSC seal watermark at 4% opacity.
- Window chrome: face `#D6D3CB`, highlight `#F4F2EC`, shadow `#8C8A84`, outer line `#5B5A56`. Active title bar `#1F3552` / `#FFFFFF`; inactive `#7C8591`.
- Content: `#FFFFFF`, paper `#F3F1EA`. Table header `#E4E1D8`. Row rule `#C9C6BC`. Zebra `#FAF9F5`.
- Text: `#15181C` primary, `#4B5158` secondary, `#7A8088` tertiary. Links `#1B3F7A`, visited `#4A2F6B`, always underlined.
- Classification banner colours belong to the fictional marking system, used only on banners and stamps.
- Status colours only as a 10px square beside a word: nominal `#2E6B3F`, degraded `#A86A00`, fault `#9B1C1C`, offline `#5B5A56`.

### Typography (self-hosted via @fontsource)
- UI/body: IBM Plex Sans 12px/16px. Dense is the point.
- Documents: Source Serif 4 for memoranda and directives; Courier Prime for anything "typed" (cables, older scanned forms).
- Data/IDs/coordinates: IBM Plex Mono, tabular numerals.
- No display faces. Hierarchy from weight, caps, rules, position.

### Texture and motion
- No scanlines, glitch, flicker, glow, CRT curvature, Matrix anything.
- Motion functional and slightly cheap: windows open with a 90ms outline-zoom, progress bars are segmented blocks, an hourglass cursor during "operations". Respect prefers-reduced-motion.
- Scanned documents get real treatment: slight rotation, uneven toner, punch-hole shadow, handwritten routing initial as SVG path.
- Sound off by default; setting to enable. Synthesized WebAudio cues only (window open, error chord, mail arrival, relay click on login).

**Honesty test:** if a screen looks like a movie prop it is wrong. If it looks like something an admin would screenshot for a help-desk ticket, it is right.

## 5. Technical architecture
- Vite + TypeScript strict, Preact + @preact/signals.
- Content pipeline: Markdown + YAML frontmatter + JSON under `content/`, Zod-validated, remark/rehype with plugins for redaction, stamps, cross-references, marginalia; emits typed route manifest + prebuilt search index.
- Routing: hash-free paths with `404.html` SPA fallback plus prerendered HTML for every route (deep links work without JS; page count real on disk). Each route = "open application X at document Y"; any URL restores as a window on the desktop.
- Libraries: D3 (d3-geo, d3-scale, d3-shape, d3-hierarchy, d3-sankey) + bundled us-atlas TopoJSON for maps/diagrams; Three.js for exactly two things (facility depth cross-section, tunnel network 3D), lazy-loaded; xterm.js for terminal; MiniSearch with compile-time index; uPlot for dense time series; idb-keyval for persistence; Web Workers for transit and facility telemetry sims. No CSS framework; hand-written CSS with cascade layers, container queries, custom properties.
- Quality gates: ESLint, tsc --noEmit, Vitest, Playwright e2e, link checker over prerendered output, axe on 25 routes.
- Deploy: GitHub Actions builds, runs gates, publishes to Pages. `.nojekyll`.
- Budgets: initial shell < 180KB gz JS; each app its own lazy chunk; Three only when a 3D view opens; interactive < 2s on a mid laptop; 60fps dragging with 12 windows.

## 6. Canon (built first)
`content/canon/canon.json` + `docs/CANON.md` are the single source of truth. Every number on every page comes from canon. A test greps built pages for headline figures and fails on drift.

Extract exactly: 47 facilities (5 ALPHA, 12 BETA, 18 GAMMA, 12 DELTA) with every field given; four classes with depth bands, sustainability windows, transit entitlements; six ALPHA rail segments; four tram networks with every link; four tiers (11/247/1,891/1,698 = 3,847) with compositions, clearances, scope; ten-function ratio table; five phases 2001–2020 with recruitment; security protocols; strategic reserves; $287B budget with five categories and five funding sources; 127 line items; 47 primes averaging 8.3 subs; expansion priorities; threat categories; classification control; Council Charter Article I text; the markings UMBRA/OSC EYES ONLY, UMBRA/OSC UNRESTRICTED, UMBRA/OSC COMPARTMENTED, UMBRA/OSC RESTRICTED, TS/SCI with OSC compartment.

### Discrepancies: keep them; they are the story
1. **The missing 790.** Tier totals 3,847; facility staff sum 3,057. 790 carried as "DETACHED / UNPOSTED", a payroll category no directive defines. Paper trail: a reconciliation memo that notices, a reply that closes the query without answering, an "unposted status" form with no instructions.
2. **847 miles vs thousands.** 847 is the *certified* figure reported to the Council; engineering tables show rail 6,074 and tram 10,538. Transit app shows engineering; Tier 1 summary shows 847. One annotated document has a handwritten "which is it?" in the margin.
3. **Capacity.** 23,400 = *sustained* capacity at full reserves; 34,700 = surge berthing (sum of class capacities). Define both in the glossary; use consistently.
4. **ALPHA-02 ↔ ALPHA-05 (segment 04)** is in the segment table but in neither facility's connection list. Completed March 2007, "NOT IN REVENUE SERVICE", no reason. Dashed on the engineering map; never carries a train in the sim except once (see Transit).
5. **"No electronic copies permitted."** Yet a partially redacted scan of the Facility Inventory exists in the library. Records Division has an open security incident about exactly this; the visitor can read the ticket.

Also write in the same voice what the lore implies but does not give: the 12 DELTA sites (designations, corridor descriptions, mostly redacted), the eight reactor installations (5 ALPHA, 3 BETA; pick and justify the three BETA), division names, a document numbering scheme, a glossary of ≥120 terms, a roster of ~60 invented staff (role, tier, site, consistent personnel number format). CANON.md separates "from source" and "extended."

## 7. The shell: MERIDIAN as an operating system
- **Power-on and lock screen.** Plain grey pre-boot panel with a hardware self-test list (< 2 s, skippable), then lock screen: OSC seal, classification banner, original consent-to-monitoring notice, temporary access card panel with issued operator ID and passphrase, two inputs, a "smart token" slot graphic that reads as inserted. Colophon link in the footer.
- **Session.** Visitor = **Tier 3 analyst on a 90-day probationary transfer to ALPHA-03 Records Division**. Session panel: operator ID, tier, compartments held, site, probation day count.
- **Classification banner** fixed top and bottom, colour/text = highest marking among open windows. Each window carries its own marking strip.
- **Windows:** drag, 8-direction resize, minimize, maximize, snap halves/quarters, z-order, cascade and tile, keyboard move/resize, per-app minimum sizes, remembered positions. Title bars carry document numbers.
- **Taskbar** with Start-style menu named **Directory**, running-window buttons, notification area (link state to each ALPHA hub, mail count, print queue, session timer), 24-hour clock with Zulu and site-local.
- **Desktop icons**, right-click context menus where sensible, a run dialog, global search (Ctrl+K) across pages, people, facilities, forms, filtered by tier.
- **Clearance engine.** Every content block has a required tier and optional compartment. Redaction at block, sentence and field level: black bars sized to hidden text; hover shows only withholding authority and reference. Done at build time so hidden text is not in the DOM.
- **Clearance progression.** Finding/reading specific documents, filing specific forms correctly, and noticing anomalies grants compartment briefings that un-redact more. Three levels: Tier 3 baseline, Tier 3 + compartments, Tier 2 "acting". Tier 1 stays mostly black forever. ≥12 unlock steps; graph documented in docs/DECISIONS.md only (not in the site).
- **Audit log.** Every window opened, search, redaction hovered, document printed is written to an in-world audit trail the visitor can read, phrased like a security office. After certain actions, a message arrives from the Office of Internal Assurance referring to that exact activity.
- **Session timeout** after inactivity → lock screen, state preserved. Print renders any document with a print stylesheet, cover sheet, distribution stamp.
- **Small screens (< 900px):** "field handheld" mode: one window at a time, bottom app switcher, same content, same banner.

## 8. Applications (each lazy, own chrome/menus/status bar, fully working)
1. **Facility Registry.** Sortable/filterable table of 47 sites; D3 US map with class-coded markers placed by computing "N miles DIRECTION of CITY"; dossier per facility (identity block, cover identity + cover-story text, staffing bars, breakdown, connections, sustainability window, telemetry tab (power, air, water, seal), document tab). ALPHA dossiers include the Three.js depth cross-section (surface cover facility → numbered levels → rail terminal; depth from canon; clickable level index).
2. **Transit Control.** Dispatcher board: schematic line diagram of rail + tram, geographic view, 3D tunnel view. Worker-driven sim runs trains to a timetable from canon distances and speeds (180 mph rail, 90 mph tram). Consist IDs, block occupancy, headway, tunnel environmental readings, maintenance possessions. Timetable, rolling stock register, segment engineering sheets, incident log. Segment 04 dark. Once per session at an unannounced time, an unscheduled movement transits segment 04 with a suppressed consist ID then vanishes from the log; the audit trail records the visitor was watching.
3. **Personnel System.** Tier structure, org chart (d3-hierarchy), ratio model as an interactive staffing calculator (any facility, any fill %), directory of roster with tier-based field redaction, recruitment phases with cumulative chart, vetting supplement, transfer and probation rules. "DETACHED / UNPOSTED" appears in totals with no drill-down.
4. **Records Library.** Folder tree by division, document list (number, title, marking, revision, originator, date), viewer rendering memoranda, directives, cables, minutes, scanned forms, tables in proper formats with cover sheets, distribution lists, routing slips, revision history, cross-reference links that open other windows. Includes the redacted scan of the Facility Inventory.
5. **Message Traffic.** Mail client: inbox, folders, threads, read receipts, precedence levels, compose that only sends to in-world addresses and always returns an in-world auto-response or refusal. New messages arrive over time from a scripted queue, some triggered by visitor actions.
6. **Ledger.** $287B by category and by FY2001–2008, five funding sources, Sankey from source appropriations through cover line items to programme categories, full register of 127 line items across the four departments.
7. **Reserves.** Reserves by category and site, burn-down calculators (meals vs population and time, pharmaceutical years, generator runtime), seed vault and genetic vault catalogues at ALPHA-03 as paged record browsers, reactor status pages for eight installations.
8. **Assurance.** Threat register, contingency summaries, construction and personnel security protocols, cover-identity catalogue, contractor register (47 primes, compartment matrix showing no contractor knows > 3 sites), classification guide.
9. **Directives.** Numbered policy library with a proper reader: purpose, applicability, policy, responsibilities, procedures, references, supersession.
10. **Forms.** Working forms with validation, in-world routing, "submitted" state producing a numbered receipt and sometimes a consequence (mail reply, compartment briefing, audit entry): leave request, compartment access request, facility transfer, visitor escort, records destruction certificate, incident report, unposted status declaration, travel authorization, medical readiness, equipment issue, security violation self-report, document reproduction request.
11. **Terminal.** xterm.js; commands `help whoami sites site ALPHA-03 "rail status" find <term> open <docno> mail "audit tail" clearance man <cmd>` plus undocumented commands discoverable from documents. History, tab completion, pagers. Every command logged to audit.
12. **System tools.** Help Desk KB, settings (sound, density, motion, handheld mode), system monitor with link states, print queue, calendar pinned to May 2008 with facility events, glossary, About this terminal.

## 9. Page manifest (all deep-linkable) — 240 total
| Family | Pages | Count |
|---|---|---|
| Facility Registry | index, 4 class pages, 47 dossiers | 52 |
| Transit | overview, 6 rail segments, 4 regional networks, timetable, rolling stock, tunnel engineering, incident log, possessions | 15 |
| Personnel | overview, 4 tiers, ratio model, directory, 5 phases, vetting supplement, transfer rules, org chart, 6 functional branches | 21 |
| Council & governance | Charter Articles I–VII, composition, 11 seat pages, 6 sets of minutes | 25 |
| Reserves | overview, food, water, medical, energy, armaments, seed vault, genetic vault, 8 reactor pages | 16 |
| Ledger | overview, 5 categories, 5 funding sources, line-item register, 8 fiscal years | 20 |
| Assurance | 7 threat pages, construction security, personnel security, communications, classification guide, cover catalogue, contractor register | 13 |
| Directives | numbered directives | 24 |
| Forms | individual forms | 12 |
| Message Traffic | individually addressable messages | 30 |
| Help & system | help articles, glossary, settings, monitor, calendar, colophon | 12 |
Every page has document number, marking, originator, revision, date. Templates differ by family (dossiers, directives, minutes, cables, ledgers); content within a family differs meaningfully. GAMMA dossier short and terse; ALPHA dossier long. Do not pad.

## 11. Writing voice
- Bureaucratic, specific, unexcited. Passive voice where a real memo would use it. Reference numbers, effective dates, supersession lines, action officers, suspense dates. People complain about parking allocations at a site 1,400 feet underground.
- Never wink. No conspiracy jokes, no self-aware lines, no ominous flourishes. The only rhetoric allowed is the Charter. Menace from euphemism and omission: "selective" cultural preservation; "essential personnel"; a contingency protocol whose title is redacted but whose page count is not.
- Mundane outnumbers sinister ten to one: cafeteria rotation, HVAC filter schedules, a lost badge, training compliance. Disturbing items sit among them with the same formatting.
- Consistency: use the glossary. Dates `12 MAY 2008`. Times Zulu with local in brackets. Document numbers per canon scheme. Names recur: the same deputy commander signs things for months, then one day someone else signs "for" them, unexplained.
- Redaction is authored, not random: decide what is hidden and why, so partial unredaction at a higher tier reveals something worth the effort.
- Each document knows its audience: a Tier 4 notice does not mention other facilities; a Tier 2 paper says "the adjacent hub" rather than naming the network.

## 12. Definition of done
- `npm run build` and `npm run test` pass; Pages workflow present and green in a local rehearsal under a subpath.
- 240 routes prerendered and open as windows from deep links; route-count floor 100 enforced.
- Zero cross-origin requests on any route.
- No placeholder text, dead control, unbuilt panel. Repo search for TODO/lorem/coming soon/placeholder returns nothing in shipped content.
- Every headline number resolves to canon; drift test passes.
- All five discrepancies findable in-world with supporting documents.
- All 12 clearance unlock steps reachable by a playtest agent unaided.
- Audit log records visitor actions; ≥ 6 scripted consequences fire from it.
- Every graphic in src/graphics traceable in AGENTS-LOG.md to a Fable subagent.
- Keyboard-only use works for login, window management, search, one form, one document; reduced motion honoured.
- README explains it is fiction, how to run, deploy to Pages, add a page.
