# MERIDIAN pass two: accounts and set pieces (owner's brief + orchestrator design)

Pass one (`docs/SPEC.md`) still applies in full: art direction, canon, fiction guardrails, voice, "everything is built", zero third-party requests, budgets. This file adds to it. Interfaces are in `src/core/contracts.ts` (section "Pass two") and `docs/CONTRACTS.md`; this file says what to build and why.

## Owner's brief (verbatim intent)
> A second pass focused on interactivity and spectacle, keeping the same art direction, canon, fiction guardrails and "everything is built" rule.
> **Multiple accounts.** The lock screen offers several issued credentials (the Tier 3 Records analyst, a Tier 4 life-support technician at a GAMMA site, a Tier 2 deputy commander at ALPHA-02, an Internal Assurance auditor). Each account opens the same route tree in its own namespace: same document numbers and URLs, but a different desktop, mail, redactions, revisions and audit trail, so the same file can read differently or contradict itself depending on who opens it. Actions in one account leave traces visible in another (a form filed as the analyst shows up in the commander's queue; the auditor can read the analyst's audit log). Each account persists separately.
> **Set pieces, each a full application:** a strike-effects planner (pick a point and yield on the map; shows which facilities survive by depth and hardening class; clearly a simplified in-world model); a covered, two-step "do not press" control with real, escalating, persistent consequences across the whole OS; a network-wide seal drill you trigger and watch propagate site by site; procedurally drawn CCTV feeds per facility; an operable reactor panel; a door and airlock control board; a train you can dispatch yourself; plus at least five more in the same spirit. **Each needs sound cues, audit entries, mail consequences, and at least one secret.**
> Graphics: reuse existing `src/graphics/*` modules wherever possible; new graphics are drawn by **Opus** subagents; Fable only where an Opus result does not pass review.

## 1. Accounts

| Account id | Who | Tier | Site | Notes |
|---|---|---|---|---|
| `analyst` | OPR-A03-1147, Records Division probationer (pass one's visitor) | 3 | ALPHA-03 | Default card. Existing state migrates into this namespace. Holds LANTERN. |
| `lifesupport` | Life-support technician, environmental systems shift | 4 | one GAMMA site (canon agent picks and justifies) | Small, closed world: sees only documents marked for Tier 4 (`t4: true`) or written for it (variant). A Tier 4 notice never mentions other facilities. |
| `deputy` | Deputy Commander, ALPHA-02 | 2 | ALPHA-02 | Satisfies `T2` releases; holds no compartments at start (so compartment material stays black). ALPHA-02 is one end of segment 04. Has an approvals queue. Their name is Tier 2 restricted: never in the JS bundle; shown from the T2 canon release once signed in. |
| `auditor` | Office of Internal Assurance auditor | 3 | ALPHA-01 (OIA) | Holds BRIAR. Can read every other account's audit trail (read-only) and files findings that reach other accounts. |

Credentials are in-world and printed on each card, as in pass one. Any input is accepted. Nothing real is asked for.

**Namespaces.** Every persisted key except `settings` and the shared store is per account (`meridian:acct:<id>:<key>`). Switching account = Log off → lock screen → choose a card → sign in. The page reloads into the chosen namespace (no state bleed between accounts); the boot self-test is skipped on an account switch. Pass-one keys found unprefixed are migrated into `analyst` once.

**Same file, different reading.** Three mechanisms, all build time except the first:
1. *Redaction by clearance* (existing): each account's tier/compartments decide which releases load. Tier 4 adds one rule: a base document opens for Tier 4 only if its frontmatter has `t4: true` or a `lifesupport` variant exists; otherwise the in-world refusal "Requires Tier 3 access determination".
2. *Account variants*: `content/variants/<accountId>/<id>.md` replaces document `<id>` for that account: same id, route and docNo; its own revision, date, body, redactions, distribution. Use it to make documents disagree: a later revision the analyst never received, a deputy's annotated copy, a Tier 4 extract that omits a paragraph, an auditor's copy stamped REVIEWED-OIA with a finding. Prerendered HTML and the default search index stay the base (analyst) version; each account gets its own search index.
3. *Mail*: each account has its own login mail and scripted queue (message routes under `/mail/…`; undelivered ones stay hidden by `isHeld`, as now).

**Cross-account traces** (`services.traces`, shared store, synced live across tabs with BroadcastChannel):
- Forms routed to an approver appear in that account's queue (analyst F-126 compartment request → deputy approvals queue; approve/deny returns a mail to the analyst at next sign-in and can grant the compartment as an alternative unlock path). The queue lives in Forms ("Action queue" view, shown only to accounts with approval authority).
- `mail.send` to an address that belongs to another account delivers a real message into that account (rendered from the trace, numbered in-world).
- The auditor reads any account's audit trail (Assurance → "Audit review"), can open a finding that arrives in the audited account's mail.
- Set-piece actions are global plant state (below), so the analyst sees on CCTV the door the technician opened.

## 2. Shared plant state
Physical plant is one world for all accounts. Global keys live in the shared store (`services.shared`, not namespaced, BroadcastChannel-synced). Typed keys in `contracts.ts`: `isolation`, `drill`, `dispatch`. Every other key is owned by one app and typed in that app's `README.md`/`types.ts`; other apps may read it, only the owner writes it. Registry of keys: `docs/CONTRACTS.md` "Shared plant state".

## 3. Set pieces (new applications)
Each is a full app per `docs/BRIEF-APPS.md` (menus, toolbar, status bar, keyboard, handheld mode, title/marking, refusals in-world) plus, for pass two: **sound cues** (`services.sound.play`, new cues listed in contracts), **audit entries** (`control` kind with `data`), **mail consequences** (messages it writes under `content/mail/<appId>/`, delivered via `services.mail.deliver` or to another account via `services.traces`), **at least one secret** (recorded in `docs/narrative-2/<appId>.md`, spoiler, never shipped), **a document route** (`content/<appId>/*.md`: the operating procedure or reference sheet the panel is built to, 1–3 pages, prerendered), and **every number from canon** (`content/canon/extended-c.json`).

| AppId | In-world title | Core |
|---|---|---|
| `strike` | Hardened Site Survivability Estimator (planning model PM-3) | Pick a point on the US map and a yield; concentric rings by cube-root scaling; table of facilities with depth band, hardening class, estimated condition. Labelled throughout as a simplified planning model, not for engineering use. DELTA sites "not modelled". No real weapon names; yields are generic. |
| `isolate` | Network Isolation, Manual Initiate | Guarded cover (lift) + press-and-hold. Each initiation escalates a global, persistent level with consequences across the OS (shell banner notice, taskbar link states, transit holds, mail to every account, OIA findings, eventually a review notice on the lock screen). Reset only through an in-world procedure. |
| `drill` | Seal Drill Coordinator | Order a network seal drill; watch propagation site by site on map + schematic + timeline from canon seal times; acknowledgements, stragglers, abort. Drives doors, CCTV, PA, muster, transit holds via plant state. |
| `cctv` | Facility Video (DVR client) | Procedurally drawn camera views per facility (Canvas, grayscale, low frame rate, timestamp/camera-ID overlay as a 2008 DVR client, no noise/flicker/scanline theatrics); grid layouts, PTZ presets, playback of the last hour. Reflects plant state (doors, drill, trains, hoists). |
| `plant` | Reactor Plant Panel | Operable panel for the eight installations: rod banks, coolant pumps, turbine, scram; simplified point-kinetics toy model; annunciator tiles; trend plots (uPlot). Live mode is display-only unless qualified; the training simulator is fully operable for every account. |
| `doors` | Door and Airlock Control | Per-facility door board: blast doors, airlocks with interlocks, pressure differentials, decon cycles, override with reason, alarms. Seal drill drives it. |
| `dispatch` | Dispatcher Workstation | Set a route, choose a consist, clear signals, dispatch a train that then runs in the transit sim (visible in Transit Control and on CCTV). Conflicts, possessions and isolation holds are enforced. |
| `hoist` | Shaft Hoist Control | Surface-to-depth personnel/freight hoists at ALPHA sites: call, load, run the cage to a level at canon depths and speeds, interlocks, emergency stop. |
| `environ` | Environmental Control (air revitalization) | Air handling trains, CO2 scrubbers, filtration (CBRN mode), fan speeds; CO2/O2 respond over time to population and plant; the technician's home app. |
| `pa` | Emergency Broadcast / Public Address | Zone selection, pre-recorded message library (text + synthesized tone sequences, no speech), live tone tests, broadcast log; seal drill and isolation drive it. |
| `muster` | Muster Board | Badge-reader muster by site/level/assembly point; trigger a muster; totals reconcile (or don't) against posted staff and DETACHED / UNPOSTED. |
| `patch` | Hub Circuit Patch Panel | Inter-site voice/data circuits: patch, test, loopback, line quality; hub link states feed the taskbar notification area. |

The twelve are the owner's seven plus five proposed by the orchestrator (hoist, environ, pa, muster, patch). They share the panel hardware kit `@graphics/panel` (guarded covers, pushbuttons, key switches, selector switches, annunciator tiles, lamps, meters, segment displays) drawn by one graphics agent, so the panels look like one contractor's hardware.

## 4. Order of work
- **Wave 2A (foundations, parallel):** core/shell accounts + shared store + new contracts; pipeline (variants, `t4`, T2 canon release, per-account search, new app home routes); canon `extended-c.json`; `@graphics/panel` kit; icons for 12 apps + 4 account badges.
- **Wave 2B (parallel):** twelve app agents; one agent wiring accounts into existing apps (Forms action queue, Assurance audit review, Mail account addresses, Terminal, System); content agents for variants, Tier 4 flags and per-account mail.
- **Wave 2C:** integration (per-account narrative specs, isolation consequences across apps, cross-account delivery), playtest each account, audits, build, commit.

## 5. Owner's correction: real people, companies and events (supersedes SPEC §3 first bullet where they conflict)
> Real companies and people can be named, but don't invent actions or things they did. You're just inventing narrative around the public knowledge of what has already occurred. For 9/11, lean into the conspiracy angle, but the CIA weren't the ones who pulled the strings, nor was it lizard men or Jews: it was the OSC, who wanted the Patriot Act and similar laws to pass and to justify the war on terror. Maybe in some internal docs they laugh or joke about the conspiracy theories, maybe even mention "we should encourage these guys".

> Follow-up from the owner: I didn't say drop them. Real people can be members or implied to be members too, just don't focus too heavily on them. Also alt history, not Obama or Bush in office.

> Second follow-up: That's fine, the OSC planned and plotted the whole thing at some hidden high table that had no names recorded. Or could use Bush and Obama as the presidents; I'd rather keep it as close to reality as possible.

Rules that follow from it (final):
- **Real history.** No alternate history. George W. Bush is president 2001–2009 and Barack Obama is a candidate in the 2008 primaries, each shown only doing what the public record says (signing, speaking publicly, campaigning). Real laws, votes, agencies, companies and events happen as recorded.
- **Real people are background.** Real people and companies may appear, and real public figures may be members or implied members of the OSC, but only lightly: a name on a distribution list, a seat in the minutes, a nod in a memo. Never a protagonist. Real private individuals are never members. Third follow-up from the owner: "Congress and others could be members, but they'd have been kept in the dark; it's need-to-know." So real members of Congress and other public figures may hold OSC seats or roles, compartmented away from the 9/11 decision: cleared for continuity, sites and budget, never read in, never shown with foreknowledge. Their votes and statements appear only as the public record has them. Documents make the gap visible (a Council minute item marked "members' copy omits item 4", a distribution list that stops short). The president is not a member (see the handler below).
- **The president's handler.** Bush has an OSC handler: a fictional OSC officer in a plausible White House-adjacent liaison post, never a real staffer. The handler shapes what reaches the president and when, and reports back to the OSC. Bush is unwitting throughout: he never knows the OSC exists. His only actions are on the public record, and the handler's paperwork shows the steering ("principal's attention directed to…", "principal not briefed on programme", "signing scheduled for 26 OCT").
- **9/11 was decided at an unrecorded high table.** The OSC planned the September 11 attacks to secure the USA PATRIOT Act, the continuity build and the war-on-terror authorities. The decision sits with a body whose attendance was never recorded: minutes with no names, a seat count and nothing else. No real, identifiable person, living or dead, is placed in or near that decision or shown with foreknowledge of it. It is written the house way: menace through euphemism, omission and redaction. There is never operational detail of how the attacks were done, and never a joke at the victims' expense.
- No CIA-did-it, no lizard men, no antisemitic or other ethnic or religious conspiracy tropes, anywhere.
- The internal register may show contempt or amusement toward the public conspiracy theorists. The house voice still never winks at the reader. Laughter goes in handwritten marginalia, informal routing notes or asides in minutes ("we should encourage these guys"), and stays dry: their noise discredits the question.
