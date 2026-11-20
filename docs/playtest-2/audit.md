# MERIDIAN pass two: audit V2

Auditor: agent V2. Run date: 19 NOV 2026. Commit `e4dd898` (branch `build/meridian-2`), checked out in a separate worktree. The main checkout was not touched. Everything below was rebuilt and served from that worktree with the Pages base `/osc-meridian/`, using Chromium (Playwright) on Windows 11.

## Defects, ranked by severity

| # | Severity | Area | Defect | Evidence |
|---|---|---|---|---|
| 1 | **High** | Leak (Tier 1 in bundle) | Tier 1 text ships in clear in the client JS. The client canon (`canon.client-*.js`, also bundled into `transit.worker-*.js`) contains: (a) `budget.auditNote`, "Audit Exposure Risk: MINIMAL ... Congressional oversight committees possess no awareness of program existence.", which `content/ledger/overview.md` redacts at `tier=1`; (b) the ALPHA-02 `function`, including "Weapons research oversight.", which `content/registry/fac-alpha-02.md` redacts at `tier=1` inside a SEXTANT redaction (the SEXTANT part also ships in clear); (c) Tier 1 roster `pn` and `role` ("P-1-01-0004", "Member, Core Council (Seat 10)"; same for Seat 11), which `personnel/directory.md` redacts at `tier=1`. All three were already present in pass one (`c6ceb55`), but they break CONTRACTS "Tier 1 ... never ships" and DECISIONS "Redacted text must never be recoverable from the bundle". `verify-dist` does not catch them. The sanitiser only strips values that content reaches through `:c[]`; these are literals duplicated in the Markdown. | `audit-tmp/leaks.ts` (see Method) |
| 2 | **High** | Budget | The initial shell JS is **206.8 KB gz** as loaded in the browser (211.6 KB with `gzip -9` over the 9 entry files), against a budget of < 180 KB. The biggest items are `canon.client` at 85 KB gz, which is preloaded eagerly (raw client canon grew from 313 KB in pass one to 666 KB), and `index` at 103 KB gz. No gate checks the budget. | `dist/index.html` modulepreloads; perf run |
| 3 | **Medium** | Accessibility / keyboard | The Door and Airlock board cannot be used without a mouse. Door and airlock items in `src/graphics/doors/LevelMimic.tsx` are `<g role="button" tabIndex={0}>`. On SVG elements Preact writes a camelCase `tabIndex` attribute, so the effective tabIndex is -1 and the items are never focusable (13 of 13 on the analyst's ALPHA-03 board). Every Door menu command (Open, Close, Cycle, overrides) needs a selected door, so all of them stay disabled. Fix: use `tabindex` (lower case) on SVG, as `graphics/patch/JackField.tsx` does. | Tab sweep: 21 stops in the window, no door items; DOM attribute `tabIndex=0`, property -1 |
| 4 | **Medium** | Fiction frame | The colophon is now untrue. `content/system/colophon.md` says "Every person named in it is invented. Any resemblance to a real person is coincidental." The `Lock.tsx` fallback says "No real agency, programme or person is depicted." Pass two names George W. Bush (public acts), Rep. Ike Skelton, Sen. Carl Levin, Sen. Daniel K. Inouye and Rep. John P. Murtha, and real laws and events. SPEC §2.6 says it must never pretend otherwise outside the frame. | files cited |
| 5 | Medium | Accessibility (axe) | axe finds **serious** violations in 6 of the 8 new apps tested: `color-contrast` on unlit annunciator tiles (#808387 on #C1BFB7, 2.06:1, 10px) in isolate, plant, drill and doors; drill's amber warning plate (#15181C on #A86A00, 4.0:1 at 11px); `label-content-name-mismatch` on tiles and pushbuttons (13, 26, 12, 12 and 40 in dispatch, on `g[data-link]`; 2 in cctv); `aria-prohibited-attr` in environ (`div[aria-label="Site CO2"]` has no role). The `/system/colophon` window has `scrollable-region-focusable`. Mostly the shared panel kit, so one fix covers several apps. | `audit-tmp/a11y.json` |
| 6 | Low | Content judgement (SPEC-2 §5) | Council seat dates can identify real office-holders. Seat 06 (agency director) was "admitted 24 SEP 2001" and was present at Session 6 of 2001, where the Secretary reported the delegation's Phase 1 objectives "met or in hand". The FBI director took office 04 SEP 2001. The seat is unnamed, no particulars are laid, and members' copies omit the item, so this is within the rule, but it is the closest any inferable real person comes to the decision. Seat 04 (Dec 2006) and Seat 08 (Oct 2007) track later appointments; they are outside 2001. The lore label "Agency directors (CIA/FBI/NSA)" ships in client canon. It is not a CIA-did-it trope (the Council is kept out of the decision), but a reviewer should know it is there. | `content/council/seat-06.md`, `minutes-01-06.md` |
| 7 | Low | "Everything is built" | Some menu commands do nothing visible in the default state, with no in-world response: Acknowledge with nothing to acknowledge (muster, hoist); Reset cleared alarms (environ); PA Refresh, Clear zone selection and Site all-call (no visible change on the console); strike Clear point and the list/filter toggles before an estimate exists. All have real handlers; none is a dead stub. | menu run, below |
| 8 | Low | Art direction | Status colours appear outside the square + word pattern: the doors mimic fills open leaves with nominal green and draws alarm tags in fault red (`graphics/doors/doors.css`); muster bars and the cctv timeline use status fills. Panel lamps are coloured hardware with word legends (acceptable as hardware). | CSS cited |

No other defects found in items 1, 2, 5, 6 and 8 of the brief.

## 1. Gates: PASS

| Gate | Result |
|---|---|
| `npm run build` | exit 0; verify-dist "all checks passed", 372 routes prerendered, 19 app homes |
| `npm run test` | exit 0; 60 files, **743 tests passed**; test:dist passed |
| `npm run build:pages` + `npm run rehearse` | exit 0; base `/osc-meridian/`; 5/5 Playwright smoke tests under the subpath |
| `npm run test:e2e` | exit 0; 5 passed |
| `npx eslint src scripts` | exit 0, no output |

Note: the e2e smoke suite covers only the 12 pass-one apps. Nothing end-to-end exercises accounts or the 12 set pieces.

## 2. Zero cross-origin requests: PASS

For each account (`analyst`, `lifesupport`, `deputy`, `auditor`) I opened 40 routes: all 24 app home routes (the 19 prerendered homes plus the rest), one document from each of the 12 new apps, and 4 variant routes (`fac-gamma-08`-family T4 variant, `/transit/segment/04` deputy variant, `/council/minutes/07-03` auditor variant, `/directives/dir-0233` deputy variant). Hosts seen:

| Account | Requests | Hosts |
|---|---|---|
| analyst | 373 | `127.0.0.1:47811` only |
| lifesupport | 331 | `127.0.0.1:47811` only |
| deputy | 394 | `127.0.0.1:47811` only |
| auditor | 390 | `127.0.0.1:47811` only |

There were 0 page errors and 0 console errors. Every route opened a window. For lifesupport, documents outside the Tier 4 world opened as the in-world refusal "Requires Tier 3 access determination", and PM-3 refused at application level ("not available on Tier 4 workstation profiles"), as designed.

## 3. Budgets: FAIL (initial shell)

- **Initial shell JS: 206.8 KB gz, budget < 180 KB: FAIL** (defect 2). Before sign-in the page loads index, runtime, preact, hooks, canon.client, session, search, jsxRuntime and banners. Sign-in adds 40.1 KB gz lazily (the reconcilers chunk and plant models). That part is correctly lazy, but the core of pass two's shell additions does not fit, because the client canon doubled.
- **Each new app its own lazy chunk: PASS.** There are 24 `App-*.js` chunks, and opening each new app loaded exactly one new `App-*` chunk plus its graphics (strike: map/d3; isolate: panel/gauges; plant: reactor/OneLine; hoist: depth3d 2D).
- **Three, uPlot and xterm lazily: PASS.** None is in the shell chunk graph. Three did not load when any of the 12 apps opened (hoist uses the 2D depth section). uPlot and xterm load only with their views.
- **First interactive, mid-laptop profile (4x CPU throttle, 1366x768): PASS.** First UI 0.3–0.4 s; lock screen usable with the self-test skipped at **1.09–1.26 s** (2 runs). With the self-test left to run it is 3.2 s, by design (SPEC: self-test < 2 s, skippable). At 6x throttle: 2.1–2.6 s. Sign-in to desktop: 0.5–0.65 s.

## 4. Leak checks: FAIL (pass-one carry-over)

- **Tier 1 strings in dist: FAIL.** I extracted 226 `tier=1` redactions (inline and block, including variants) into 94 distinctive fragments and searched every text file in `dist` plus all 12 release files, decoded. There were 6 hits: 3 are real (defect 1), 3 are false positives (shared prefixes or a regex span).
- **Tier 2 names: PASS.** I checked all 58 T1/T2 roster names and emails, including the deputy (P-2-04-0139) and the handler (Carrow). None is in any JS bundle or in `canon.client.json`. Client canon carries `[[RX:T2:n]]` stubs, and the deputy card shows "DEPUTY COMMANDER 2-0139". "D. H. Carrow" appears only in the two document JSONs he signs (`council-mem-01-0391.json`, `council-mem-08-0241.json`), which DECISIONS permits. Tier 1 names appear nowhere in dist.
- **DELTA location detail: PASS.** No `locationText`, `terrain`, cover identity, cover story or "N miles DIR of CITY" anchor for any of the 12 DELTA sites appears in dist, in client canon or in the decoded releases.
- **Release files encoded: PASS.** All 12 files in `dist/data/releases` are `{v:1,d}` and map to known keys (T2, compartments, compartment+T2, CANON-T2).

## 5. Guardrails: PASS, with the colophon exception

- Placeholder, TODO, lorem, coming soon, TBD and FIXME: none in shipped content or dist. The source hits are code comments and a variable name.
- `.gov` mimicry or USWDS text: none in dist.
- Login: two fields (operator ID, passphrase) with `autocomplete="off"`, in-world cards printed on screen, any input accepted. Nothing real is asked for.
- Colophon link is in the lock footer ("Colophon: a work of fiction"). It is **present but now inaccurate** (defect 4).
- Emoji: none in src or content (UTF-8 scan of the emoji and dingbat ranges).
- Scanline, glow and flicker: no matches in the 12 new apps or new graphics. `cctv/render.ts` explicitly avoids noise, flicker and scan lines.
- Status colours: spot-checked environ, pa, muster, cctv, doors and dispatch. environ and pa use the `--status-sq` 10px square plus a word. Exceptions are listed in defect 8.
- Tokens only: no hex colours in new src outside `tokens.css`. The exceptions are a comment in `shell.css` and a `var(--x, #hex)` fallback in the unshipped `graphics/cctv/preview.html`. cctv draws computed greyscale `rgb()` pixels for its picture, which is acceptable.

## 6. SPEC-2 §5 content audit: PASS

Search terms: about 90 real-person, company and trope terms (presidents, cabinet, Congress leadership, 9/11-era officials, contractors, "CIA", "Jew/Jewish/Zionist", "Rothschild", "lizard/reptil", "Illuminati", "Muslim/Islam/Arab/Saudi", "thermite", "controlled demolition", "Building 7", "hijack", "conspiracy/theorist/truther", "inside job"), plus a title-plus-name pattern (Sen./Rep./President/General ...) over `content/**` and canon.

| Real person | Where | Shown doing | Verdict |
|---|---|---|---|
| George W. Bush | canon `realEvents` RE-01, RE-08, RE-11 `publicEvent`; referred to only as "the principal" in handler notes `mem-01-0391`, `mem-08-0241` | Signing EO 13201, NSPD-51/HSPD-20 and the PATRIOT Act on the public dates; "not briefed on programme", unwitting | **Pass.** Public record only; never a member; the handler (fictional D. H. Carrow) does the steering |
| Rep. Ike Skelton | `council/minutes-08-02.md` readers' extract | Continuity reader, no seat, receives items 3 and 5 only (2008) | **Pass.** Light compartmented reader role, nowhere near 2001 |
| Sen. Carl Levin | same | same | **Pass** |
| Sen. Daniel K. Inouye | `ledger/fy-08.md` distribution | Line totals only | **Pass** |
| Rep. John P. Murtha | `ledger/src-dod.md` distribution | FY totals only | **Pass** |
| Barack Obama | not named ("primary campaigns are followed from the public record") | none | **Pass** (allowed, not required) |

- **9/11 decision:** sits with an unrecorded delegated meeting (`del-01-04`: five seats, no names). The Council receives "met or in hand ... No particulars were laid. None were requested." No identifiable person is in it. The one Low advisory is the inferable Seat 06 (defect 6).
- **Tropes:** no CIA-did-it, lizard-men or ethnic/religious material. "Graham", "Gates", "Ridge" and "Edwards" hits are an invented staffer, hoist gates, the Blue Ridge Mountains and the Edwards Plateau.
- **Operational detail:** none. The only attack description is the RE-10 public-record sentence. The CP-08 title, issue date and activation are Tier 1 and never ship.
- **Victims:** no jokes. `mem-06-0417` excludes public observances; its laughter is a dry margin note aimed at theorists ("we should encourage these guys"), with a routing note disowning it. That matches §5.

## 7. Accessibility: PARTIAL

axe (wcag2a/aa, 2.1a/aa) on 15 routes as the analyst:

| Route | Result |
|---|---|
| lock screen, desktop + taskbar | no violations |
| `/strike`, `/directives/dir-0412`, `/mail`, `/registry`, `/forms` | no violations |
| `/isolate` | color-contrast (22), label-content-name-mismatch (13) |
| `/plant` | color-contrast (27), label-content-name-mismatch (26) |
| `/drill` | color-contrast (17), label-content-name-mismatch (12) |
| `/doors` | color-contrast (16), label-content-name-mismatch (12) |
| `/cctv` | label-content-name-mismatch (2: zoom buttons) |
| `/environ` | aria-prohibited-attr (1) |
| `/dispatch` | label-content-name-mismatch (40, schematic links) |
| `/system/colophon` | scrollable-region-focusable (1) |

Keyboard only:

- **Guarded isolation control: PASS.** I opened Run (Alt+R), typed `/isolate` and pressed Enter. 6 Tabs reach "Lift guard cover: NETWORK ISOLATION MANUAL INITIATE" (dotted focus ring). Enter lifts the cover, and Tab reaches "Press and hold 3.0 seconds". Holding Space for 3.6 s initiates: the shell notice "Network isolated by manual initiate ..." appeared under the banner.
- **Panel app, plant training simulator: PASS.** 37 tab stops, all with a visible dotted outline. The Simulator tab works with Enter, and Enter on "PUMP A STOP" stopped the pump: the annunciator raised COOLANT FLOW LOW, unacknowledged, and the event log line "Coolant pump A stop." appeared.
- **Panel app, doors: FAIL** (defect 3).
- Menus by keyboard: F10 focuses File, and ArrowDown opens the menu with the first item focused (doors). PASS.

## 8. Menus of the 12 new apps, as the deputy: no dead items

I opened every menu item in every app (334 items). For each one I recorded window and dialog count, URL, localStorage (audit trail and plant state), window text and ARIA state, with background noise subtracted.

| App | Items | Visible effect | Disabled (state-dependent) | No visible effect |
|---|---|---|---|---|
| strike | 37 | 26 | 0 | Clear point; Show sites not evaluated; Show DELTA; List within 10/25/50/100/250/500 mi (all filter an estimate, and none existed); Type a point and 1 Estimate (focus only) |
| isolate | 17 | 17 | 0 | none |
| drill | 18 | 18 | 0 | none |
| cctv | 66 | 51 | 14 (PTZ on a fixed camera; playback controls in live view) | Cameras by site and level (already selected) |
| plant | 30 | 29 | 0 | Lamp test (code toggles `is-test`; the live sim's DOM churn hid the change from the harness) |
| doors | 34 | 26 | 8 (Door menu, no door selected; see defect 3) | none |
| dispatch | 24 | 21 | 3 (Hold, Release, Cancel with no train) | none |
| hoist | 29 | 27 | 0 | Acknowledge alarms (none unacknowledged); Lamp test (as plant) |
| environ | 21 | 17 | 1 (Reset seal closure, no seal latched) | Reset cleared alarms (none); Lamp test (as plant); Air handling panel (already shown) |
| pa | 18 | 15 | 0 | Refresh; Site all-call (toggle, no visible change); Clear zone selection (nothing selected) |
| muster | 15 | 14 | 0 | Acknowledge annunciator (nothing to acknowledge) |
| patch | 25 | 18 | 4 (no cord or circuit selected) | Connect monitor, Loopback, Line quality run (handlers post a status-line instruction when the test set is not patched; the harness did not register it) |

Every item has a real handler (checked in source). The harness found no stub or dead item. The items that did nothing in the default state are listed as defect 7. There were 0 page errors during the run.

Observation, not a defect: the deputy, who commands ALPHA-02, gets "REJECTED: the position of ALPHA-02 is not held in the site table ... released under SEXTANT" when plotting their own site in PM-3, because the deputy holds no compartments. This is consistent with SPEC-2 §1, but playtesters may report it.

## Method

All of this was throwaway tooling in the removed worktree (`audit-tmp/`):

- `leaks.ts`: Tier 1 fragments, roster names, DELTA fields and release decoding over `dist`.
- `net.mjs`: 40 routes × 4 accounts, logging request hosts.
- `perf.mjs` and `perf2.mjs`: CDP CPU throttle, chunk loading per app, gzip sizes.
- `a11y.mjs`: @axe-core/playwright, scoped to each window.
- `kbd*.mjs`: keyboard sequences.
- `menus.mjs`: every menu item, with state diffs.

The server was `scripts/rehearse-pages.ts --serve` on 127.0.0.1.

## Fixes (F2)

Agent F2, 19 NOV 2026, main checkout (`build/meridian-2`), not committed. Items 1–6 of the F2 brief are fixed below; the leak, budget and keyboard fixes each have a gate.

### 1. Tier 1 leak: fixed; gate: verify-dist rule 11

- **Corpus.** New `scripts/content/redaction-corpus.ts` reads every content Markdown file, base and variants, at build time. It collects (a) each text fragment that a document withholds at tier 1 or behind a compartment (whole pieces of 16 characters or more, sentences of 40 or more cut from long passages, and tier-1 personnel numbers), leaving out fragments some document prints in clear; and (b) each canon path that documents print only inside such a redaction (`:r[:c[path]]`). Current corpus: 842 fragments and 211 paths. Nothing from the corpus is written to disk or shipped.
- **Sanitiser** (`buildClientCanon` in `scripts/canon-merge.ts`, also used by the content pipeline, so documents and the bundle agree):
  - Free-text canon values on corpus paths become sentinels under the document's key, or `T1` when the value contains a tier-1 fragment. This covers ALPHA-01, 02, 04 and 05 `function`, cover stories, terrain and level notes. ALPHA-02's function is now T1 as a whole, so no release, document or canon, carries "Weapons research oversight." The class-alpha table and the registry index had been releasing it under SEXTANT, which rule 7 caught once the corpus existed.
  - Literal tier-1 or compartment fragments are scrubbed wherever they appear (`budget.auditNote` is now `[[RX:T1:194]]`).
  - Tier-1 roster rows now have `role` withheld, and `shipClientCanon` drops both rows (Seats 10 and 11) from the shipped file.
  - Tram link labels that name a withheld site's city are SEXTANT (net-*.md redacts them). The schematic, tunnel map, tunnel view and transit panes now leave a withheld label out.
- **Gate:** verify-dist rule 11 scans every dist `.js`/`.mjs` chunk (workers included) and `content/canon/canon.client.json`. It looks for every T1 and compartment value withheld from the full canon (rule 7's corpus) plus the content corpus, in clear, JSON, `\'` and `\uXXXX` forms. Run against the pre-fix dist it reported **104 hits** (canon.client and transit.worker: audit note, ALPHA-02/04/01/05 functions, Seat 10/11 roles, tram labels). Now: `[bundle-leak] 1858 tier-1/compartment needles (842 from content) over 73 JS/worker chunks + client canon: 0 hit(s)`. Unit gate: `tests/unit/bundle-leak.test.ts`.
- **Tier 2 names:** rule 7 still holds every T2 roster name and address strictly against JS and CSS. It passes, and the client canon carries only `[[RX:T2:n]]` stubs.

### 2. Shell budget: fixed; gate: verify-dist rule 12

- `src/core/session.ts`, `src/core/accounts.ts` and `src/sim/time.ts` imported named parts of `@canon`, which still preloaded the whole client canon. They now import `content/canon/canon.shell.json` (3.6 KB: `meta` and `accounts`), which canon-merge writes from the shipped client canon. Apps keep `@canon` in their own chunks.
- Initial shell (entry script plus modulepreloads, gzip -9 per file): **before 206.8 KB gz** over 9 files (`canon.client` 83.1); **after 124.7 KB gz** over 8 files (index 100.9, session 6.2, search 6.3, preact 4.9, banners 4.7, hooks 1.3, jsxRuntime 0.3, runtime 0.2).
- **Gate:** rule 12 fails the build at 180 KB or more: `[shell-budget] initial shell 124.7 KB gz over 8 files (budget < 180 KB)`.

### 3. Doors keyboard: fixed; gate: unit test

- `tabindex` is now lowercase in `graphics/doors/LevelMimic.tsx` (doors and airlocks), `graphics/drill/Gantt.tsx`, `graphics/tunnelmap/index.tsx` (link hit paths) and `graphics/ledger/index.tsx` (three SVG node prop objects). A grep of all of `src` found no other camelCase `tabIndex` on SVG.
- Keyboard check on ALPHA-03 (analyst): all 12 door items have tabIndex 0. The first is reached in 8 Tabs. Enter selects it (`aria-pressed=true`), and F10 then Door shows Open, Close and Hold-open override enabled (the airlock-only items are disabled for a door).
- **Gate:** `bundle-leak.test.ts` "uses lowercase tabindex on SVG elements" scans `src/**/*.tsx`.

### 4. Colophon: fixed

`content/system/colophon.md` (and its manifest synopsis) and the `Lock.tsx` fallback now say that the OSC, its staff and documents are invented. They say some real public figures, agencies, companies, laws and events are named, and appear only as the public record has them or in invented background roles, and that nothing here is a claim about real people.

### 5. Accessibility: fixed

- Panel kit: unlit annunciator windows now use a lighter window with a `--text-2` legend (about 5:1). The warning lamp and warning plate amber is lightened (`color-mix` 70% with surface, about 6.6:1 with black). Annunciator legend lines and pushbutton cap lines carry a space, so the visible text matches the name. A pushbutton `ariaLabel` override that lacks the engraved legend as whole words is prefixed with it ("ACK: Acknowledge 0 alarms").
- Schematic links and nodes, and door and airlock glyphs: the lettering sits in an aria-hidden sibling layer, so the button's own text never contradicts its name. Node labels stay clickable.
- `StatusBar` panes no longer put `aria-label` on a plain div; the pane name is a `sr-only` prefix (environ "Site CO2"). The cctv zoom buttons are named "Wide (zoom out)" and "Tele (zoom in)". `/system/colophon`'s scrolling `main` is focusable. Patch hint text was raised to `--text-2` (3.64:1, newly seen).
- **axe re-run** (same tags; analyst; Pages base): `/isolate /plant /drill /doors /cctv /environ /dispatch /system/colophon /muster /hoist /pa /strike /transit /registry /patch /mail /forms /directives/dir-0412`: **0 serious or critical violations** on every route. That run came before the patch contrast fix, which was patch's only finding.

### 6. Low items: fixed

- Silent commands now answer on the status bar: muster, hoist and environ Acknowledge with nothing flashing ("No ... window is flashing. Nothing to acknowledge."); environ Reset cleared alarms with nothing to reset; PA Refresh, Site all-call and Clear zone selection; strike Clear point and the listing filters before an estimate ("Listing setting kept. It applies once an estimate is run (F5)."). Helper: `src/apps/shared/flash.ts`.
- Doors mimic: open gaps and leaves in travel are neutral (paper, dashed), override and drill-hold marks are neutral, and an alarm is the 10px fault square plus the word ALM. Muster bars are neutral, and an over-count shows `StatusLight` DEGRADED "OVER". The cctv timeline's event marks and recording gaps are neutral.

### Gates run

| Gate | Result |
|---|---|
| `npm run build` | exit 0; verify-dist all checks passed (rules 11 and 12 above) |
| `npm run test` | exit 0; 61 files, **750 tests** passed; test:dist passed. One run before the final one timed out on "--dry-run writes nothing" (a 5 s spawn under load); it passes alone and in the final run. |
| `npm run rehearse` | exit 0; Pages build verify-dist passed; 5/5 smoke tests passed (12.0 s). Leaves `dist/` built with base `/osc-meridian/`. |
| `npx eslint src scripts tests` | exit 0 |

Test changes: `client-canon.test.ts` (the derived canon uses the content corpus and `shipClientCanon`; tier-1 rows are absent; `auditNote` is T1) and `pipeline.test.ts` (one more T1 cell from the tier-1 role shifts a T2 id from `-8` to `-9`).
