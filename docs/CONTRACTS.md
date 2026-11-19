# MERIDIAN build contracts (read before touching code)

The full product spec is `docs/SPEC.md`. This file fixes the interfaces so parallel agents can work without colliding.
If a contract is wrong, do not silently change it: build to it, and put the proposed change in your final report.

## Ground rules for every agent
- **File ownership is exclusive.** Only write inside the paths your brief assigns you. Never edit `package.json`, `tsconfig.json`, `vite.config.ts`, or another agent's folder. Need a dependency? Say so in your report.
- **Do not commit.** The orchestrator commits.
- **No external URLs at runtime**, no CDN, no fonts from the web. Every runtime URL goes through `asset(path)` from `src/core/base.ts` (respects the Pages subpath).
- **No hard-coded colours** outside `src/design/tokens.css` (and the marking colours in canon). Use `var(--token)`.
- **No emoji, no Unicode warning symbols as icons**, no scanlines/glow/CRT/typewriter effects. Status = 10px square + word.
- **No placeholder text** ("TODO", "lorem", "coming soon", "placeholder", "TBD") in anything that ships.
- **Every number comes from canon** (`import canon from '@canon'`, typed by `src/core/canon-types.ts`). Never type a headline figure by hand.
- **Fiction guardrails:** no real person named as an OSC member; no `.gov` strings presented as this site's address; no US Web Design System; no copied federal banner/privacy text; the login never asks for real credentials. Real agencies appear only as cover identities and funding lines.
- **Voice:** bureaucratic, specific, unexcited, never winks. Dates `12 MAY 2008`. Times Zulu with local in brackets: `1430Z (1030 EDT)`. In-world date never passes 31 MAY 2008.
- Stack: Vite 8, TypeScript strict, Preact 11 + @preact/signals, hand-written CSS (cascade layers, container queries, custom properties). Path aliases: `@core @design @shell @apps @graphics @sim @narrative @canon @generated`.

## Directory ownership
| Path | Owner |
|---|---|
| `content/canon/source.json`, `scripts/canon-merge.ts`, `src/core/canon-schema.ts`, `tests/unit/canon*.test.ts` | canon extractor |
| `content/canon/extended-a.json` | canon extender A |
| `content/canon/extended-b.json` | canon extender B |
| `docs/CANON.md` | extractor writes "From source"; extenders append their own `## Extended (A)` / `## Extended (B)` sections in separate files `docs/canon/extended-a.md`, `docs/canon/extended-b.md` which the orchestrator merges |
| `src/design/**`, `docs/STYLE.md` | design system agent |
| `src/shell/**`, `src/core/services.ts`, `src/core/router.ts`, `src/core/session.ts`, `src/core/audit.ts`, `src/core/persist.ts`, `src/main.tsx`, `index.html` | shell agent |
| `scripts/build-content.ts`, `scripts/content/**`, `scripts/prerender.ts`, `scripts/verify-dist.ts`, `src/core/docs.ts`, `src/core/search.ts`, `src/core/base.ts`, `tests/unit/pipeline*.test.ts` | pipeline agent |
| `src/apps/<app>/**` | that app's agent |
| `content/<family>/**` | that family's content agent |
| `src/graphics/<family>/**` | that graphics (Fable) agent |
| `src/sim/**` | transit app agent (transit worker) / reserves+registry (telemetry worker) as briefed |
| `src/narrative/**` | integration phase |

## Core types (src/core/contracts.ts, orchestrator-owned)
See the file. Key shapes: `AppId`, `RouteEntry`, `DocJson`, `AppDefinition`, `AppProps`, `WindowHandle`, `Services`.

## Content format
One Markdown file per route under `content/<family>/<slug>.md`, YAML frontmatter validated by Zod (pipeline):
```yaml
id: dir-0412                 # unique, kebab
route: /directives/dir-0412  # unique; no base, no trailing slash
app: directives              # AppId that opens it
family: directives
template: directive          # memo|directive|cable|minutes|dossier|ledger|form|message|help|record|charter|scan|index
docNo: OSC-DIR-0412          # canon numbering scheme (docs/CANON.md)
title: Handling of Compartmented Records in Shared Workspaces
marking: UMBRA-C             # MarkingId
originator: RD/ALPHA-03      # division code / site
revision: 3
date: 2008-04-22             # ISO; must be <= 2008-05-31
access: { tier: 3 }          # optional: below this the window opens as an in-world refusal; compartment optional
distribution: [ ... ]        # optional list
supersedes: OSC-DIR-0398     # optional
xrefs: [OSC-DIR-0398, OSC-MEM-08-0211]  # docNos referenced
facility: ALPHA-03           # optional (dossiers, reactor pages)
summary: one line for search results
```
Body Markdown (GFM) plus directives (remark-directive):
- `:r[hidden text]{tier=2 auth="OIA" ref="OIA-08-114"}` inline redaction; `compartment=KESTREL` optional. Requirement key = `T<tier>` or `<COMPARTMENT>` or `<COMPARTMENT>+T<tier>`.
- `:::redact{tier=2 auth="CSO" ref="..."}` … `:::` block redaction.
- `:c[headline.staffTotal]` inline canon value (formatted, e.g. 3,847). Paths are dot paths into canon; arrays by id: `:c[facilities.ALPHA-03.depthFt]`.
- `:x[OSC-DIR-0398]` cross-reference link (resolved to that doc's route; build fails on unknown docNo).
- `::canon-table{source="facilities" class="BETA" cols="id,anchor,coverIdentity,capacity,staff"}` static table rendered from canon.
- `:::margin{hand="RT" seed=3}` handwritten marginal note (rendered by scan kit); `::stamp{kind="RECEIVED" date="2008-05-02"}`; `::routing{initials="JH,MKB"}`.
- `:::scan{seed=7 rotate=-0.6}` wrap content as a scanned page.

**Additions (as implemented by the pipeline, Wave A):**
- `:ink[847]{mark=circle|underline}` → `<span data-ink="circle">` (scan kit draws the pen mark).
- `:::margin{hand seed mark}` (mark = arrow|underline|circle|none); `::routing{initials="JH 5/2,MKB 5/5"}`; `::stamp{kind date text seed of ink}` (kinds: RECEIVED, COPY-NO, FILE-COPY, SUPERSEDED, CANCELLED, ACTION, INFO, DISTRIBUTION-LIMITED, REPRODUCTION-PROHIBITED, NO-ELECTRONIC-COPY, REVIEWED-OIA, DESTROY-BY, VOID, and the five marking ids).
- `:c[path]{raw}` prints unformatted. `::canon-table{source cols="key:Label,…" filter="a=b,c!=d" caption limit}`; any extra attribute also filters.
- **Tier 1 rule:** any key ending in `T1` never ships, compartment or not; anything nested in a T1 block is dropped.
- Released block content arrives as `<div class="rx-released rx-block">`.
- **Drift trigger phrases** (exact wording; see `scripts/content/figures.ts`): "certified mileage", "sustained capacity", "total surge berthing", "total personnel", "total posted staff", "DETACHED / UNPOSTED", "total programme cost". Any page using a phrase must show the canon figure next to it (use `:c[...]`).
- Unknown bare `:word` stays plain text; any other unknown directive fails the build.

Redaction is resolved **at build time**: baseline HTML contains only `<span class="rx" data-rx="<id>" data-len="<chars>" data-auth=".." data-ref="..">` with no hidden text; hidden HTML goes to `public/data/releases/<releaseFileName(KEY)>.json`, encoded (never emitted for tier 1; obfuscated, not secret: see `src/core/release-codec.ts`). The client fetches a release file only once the session satisfies its key.

## Generated outputs (pipeline)
- `.generated/routes.json` — `RouteEntry[]` (imported by the shell at build time)
- `public/data/docs/<id>.json` — `DocJson`
- `public/data/releases/<16-hex hash of KEY>.json` — `{ v: 1, d: base64 }`, which decodes (`decodeRelease(KEY, …)`) to `{ [rxId]: html }`
- `public/data/search.json` — MiniSearch index over baseline (already-redacted) text
- `dist/<route>/index.html` for every route (prerender), plus `dist/404.html`, `dist/.nojekyll`

## Apps
`src/apps/index.ts` (orchestrator) registers 12 apps; each app's entry is `src/apps/<id>/App.tsx` with `export default function App(props: AppProps)`. Each app is its own lazy chunk. An app receives the route it was opened for (or null for its home), renders its own menu bar and status bar using design primitives, and calls `props.win.setTitle(...)` / `setMarking(...)`.
App ids: `registry transit personnel records mail ledger reserves assurance directives forms terminal system`.

## Services (src/core/services.ts, shell agent implements, apps consume)
`openRoute(path)`, `openApp(id)`, `audit.log(kind, detail)`, `session` (signals: operator, tier, compartments, probationDay, actingTier2), `clearance.grant(key, reason)`, `clearance.satisfies(key)`, `docs.load(id)` (pipeline: fetch DocJson + applicable releases), `search(q)`, `mail.deliver(msgId)`, `sound.play(cue)`, `settings` (signals), `notify(text)`, `print(docId)`.
Audit `kind` values: `window.open window.close doc.read search redaction.hover print form.submit mail.read mail.send terminal.cmd transit.watch clearance.grant login logout timeout`.

## Graphics export points (each owned by one Fable agent)
| Module | Exports |
|---|---|
| `@graphics/seal` | `Seal({size, variant:'full'|'mono'|'tiny'})`, `DivisionMark({division, size})` |
| `@graphics/icons` | `Icon({id, size:16|32})`, `type IconId` |
| `@graphics/scan` | `ScanPage({seed, rotate, children})`, `MarginNote({hand, seed, children})`, `RoutingInitials({initials, seed})`, `PunchHoles()`, `Stain/Toner` helpers |
| `@graphics/banners` | `ClassificationBanner({marking, position})`, `MarkingStrip({marking})`, `CoverSheet({...})`, `Stamp({kind, date?})` |
| `@graphics/lock` | `AccessCard({operatorId, passphrase, ...})`, `SmartToken({inserted})`, `DesktopWatermark()` |
| `@graphics/forms` | `CheckboxMark`, `SignatureBlock`, `Barcode({value})`, `FormNumberMark` |
| `@graphics/states` | `EmptyState`, `ErrorState`, `RefusalState({authority, reference, reason})` |
| `@graphics/map` | `UsMap(...)`, facility marker system |
| `@graphics/schematic` | rail/tram line diagram |
| `@graphics/tunnelmap` | geographic tunnel map, certified + engineering layers |
| `@graphics/depth3d` | `mountDepthViewer(el, facilityId, opts) => { dispose, selectLevel, setTier }`, `DepthViewer`, `DepthSection2D` (Three.js, lazy) |
| `@graphics/tunnel3d` | `mountTunnelView(el, opts) => { dispose, update(trains), select(key) }` and `TunnelView` (Three.js, lazy) |
| `@graphics/ledger` | Sankey + ledger charts |
| `@graphics/org` | org chart + tier pyramid |
| `@graphics/reactor` | reactor one-line diagrams + telemetry gauges |
Each module has an `index.ts(x)` and a `README.md` with a rendered check (an SVG/PNG snapshot or a test page under `src/graphics/<family>/preview.html`).

## Narrative engine
Owner: integration (`src/narrative/**`). Started once from `src/main.tsx` after session, audit and mail stores are initialised (`startNarrative()` from `@narrative/engine`). Rules are a pure reducer (`src/narrative/rules.ts`) over audit entries and 5 s clock ticks; state persists under persist key `narrative`. `plan.json` is spoiler material and is never imported by shipped code; the runtime uses the projection in `src/narrative/spec.ts` (a test fails if it drifts).

**Contract additions (src/core):**
- `AuditEntry.data?: Record<string, string>` and `services.audit.log(kind, subject, detail?, data?)`: structured payload for the engine, never displayed.
- `AuditKind` gains `'system'`: lines the system writes itself (segment 04 record withdrawal, repeated-refusal note, F-122 return). Audit viewers need a label for it.
- `services.mail.deliver(msgId, opts?)` with `MailDeliverOptions { slots?, read?, silent?, repeat? }`; `repeat` re-delivers an already delivered message as unread with new slots (non-delivery notice, every time).
- `services.mail.meta`: `Record<msgId, { at, slots? }>`; `at` is the in-world ISO delivery time (use it for `dateMode: delivery`); the mail app replaces `{token}` in the body/slotTemplate with `slots[token]`.
- `services.mail.delivered` / `services.mail.read`: `ReadonlySignal<string[]>` of message ids (delivery order; read set kept from `mail.read` audit entries). Apps read mailbox state only through these, never from shell internals.
- `services.mail.isHeld(docNoOrRoute)`: `false` only for a message document (family `mail`) the narrative has not yet delivered; `true` for everything else, including unknown numbers. Accepts a docNo, alias or route path. `services.search` / `searchAll` drop undelivered messages (they are not counted as withheld), and `services.openRoute` (and in-window navigation) to one opens an in-world "Message not held" refusal from the MERIDIAN Message Centre that does not show the subject. Apps that list documents from `services.docs.all()` (terminal completion and listings, records browse) must filter with `isHeld`.

**What apps must log for the engine to see:**
| Kind | subject | data |
|---|---|---|
| `doc.read` | docNo, when a document body is displayed (a non-refused `window.open` of a docNo also counts) | none |
| `search` | the query (shell already does this) | none |
| `form.submit` | the form docNo, e.g. `OSC-F-160` | `{ form: 'OSC-F-160', <fieldName>: value, ... }` using the field `name`s in `content/forms/*.md` |
| `terminal.cmd` | the command line as typed | none |
| `transit.watch` | `SEG04` | `seg04WatchData(view, fromMs, toMs)`; detail `seg04WatchDetail(...)`. Log once per movement, if the board (any view) was visible, not minimised, at any moment of it |
| `mail.send` | message subject | `{ to, cc?, subject, body }` (comma-separated addresses) |
| `print`, `redaction.hover` | docNo (shell already does this) | optional `pq` on print |

**What the engine exposes:**
- Flags via `services.session.flags` (set with `setFlag`): `oriented`, `accessionHeld`, `scanRead`, `queryRead` (F-131 receipt history), `mileageQuery`, `seg04Witnessed`, `strengthRun`, `interimReview`, `oiaReviewedPrints` (stamp later print cover sheets REVIEWED-OIA). A page/form gated on `flag:<name>` checks `services.session.flags.value[name]`.
- Compartments and ACTING-T2 via `services.clearance.grant` (so `session.compartments` / `actingTier2` / `satisfies` update as usual).
- `@narrative/engine`: `seg04` signal (`{ start, end } | null`, wall-clock ms, held 60 s after `end` for the incident log), `seg04Blocks(now, w)` (lit blocks 1..12 from the ALPHA-05 end), `seg04LogLine(now, block)`, `seg04LogVisible(now, w)`, `SEG04_CONSIST_LABEL`; `formRefusal(formNo, fields)` returns the in-world refusal text for F-122 (probationer) and F-126 non-approvable compartments, or null.
- `reportTransitBoard(visible: boolean)` (from `@narrative/engine`): Transit Control calls it whenever its board becomes visible or hidden (open, minimise, restore, close); `transitBoardVisible` is the read-only signal. Without these calls the engine falls back to Transit Control `window.open` / `window.close` audit lines.
- **Segment 04 scheduling:** each sign-in (not unlock) draws a due time 6–25 min after login. Once due, the movement starts at once if the session is unlocked and the board is shown (the engine ticks as soon as the board is reported visible). If it is locked when due, it starts within 60 s of unlock with the board shown (in practice on the next 5 s tick). If the board is never shown, it runs unwatched 20 min after it fell due (unlocked), so the withdrawal line still reaches audit tail. Never while locked; once per sign-in.
- **`{date}` slot:** every triggered (non-login) delivery carries `slots.date` = the in-world date at the moment of delivery (`19 MAY 2008`, same clock as the taskbar); rule slots override it. Content that says "today" should use `{date}`, not a literal date. Login mail carries no slots.
- Terminal: `clearance request acting` before the interim review should print "Not eligible: probationary (DIR-0247)"; check `services.session.flags.value.interimReview`.
