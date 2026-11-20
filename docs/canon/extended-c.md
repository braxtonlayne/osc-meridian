## Extended (C): accounts and shared plant data (pass two)

Owner: canon agent C2. Data file: `content/canon/extended-c.json`, merged by `scripts/canon-merge.ts`. Types in `src/core/canon-types.ts`, Zod schemas and cross-checks in `src/core/canon-schema.ts` (`extendedCShape`, `extendedCChecks`), tests in `tests/unit/canon-extended-c.test.ts`. Everything here is **extended** canon: invented to serve the pass-two set pieces (docs/SPEC-2.md), built to reconcile with every source and extended A/B figure. No figure here changes an existing one.

### Keys

| Key | Shape | Count | Where it comes from |
|---|---|---|---|
| `roster` (additions) | `Person[]`, merged by `pn` | 4 (Ashcombe, Vance, Voss; Carrow added by CT2 for the Principal Desk) | extended-c.json |
| `accounts` | `AccountDef[]` (contracts.ts) | 4 | extended-c.json |
| `survivability` | `Survivability` | 4 hardening classes, 7 contours, 7 yields, 35 sites | extended-c.json |
| `sealDrill` | `SealDrill` | 3 class timings, 35-step `sequence` | timings in extended-c.json; `sequence` computed |
| `templateLevels` | `{ BETA, GAMMA }: { n, name }[]` | 5 / 4 levels | extended-c.json |
| `doors` | `SiteDoors[]` | 35 sites, 296 doors | ALPHA listed; BETA/GAMMA generated from templates |
| `cameras` | `SiteCameras[]` | 35 sites, 372 cameras | ALPHA listed; BETA/GAMMA generated |
| `hoists` | `Hoist[]` | 15 (3 per ALPHA) | listed; `stops`/`travelFt` computed |
| `musterPoints` | `SiteMuster[]` | 35 sites | ALPHA listed; BETA/GAMMA generated |
| `apps` | `Record<AppId, unknown>` | one per `content/canon/apps/<appId>.json` | app agents (see `src/core/canon-apps/README.md`) |

DELTA sites carry no plant records and are not in the seal drill or the survivability model: they are not on the plant network, their per-site figures are withheld in the client canon, and the model says so in `notModelled`.

Generation is deterministic (template order, facility order, no randomness). Record ids: `<class letter><site no>-<kind><n>`, e.g. `A02-BD4`, `G08-AL1-O`, `B03-C06`, `A05-H2`, `G08-MP1`. A template item with `when: tram` is generated only at a site with a tram link; `dual-portal` only at hardening class H1 to H3; `single-portal` only at H4.

### Accounts

| Id | Operator id | Passphrase | pn | Site | Tier | Compartments | Supervisor |
|---|---|---|---|---|---|---|---|
| `analyst` | OPR-A03-1147 | ballast pewter orchard ninety | P-3-06-1147 | ALPHA-03 | 3 | LANTERN | P-2-04-0218 |
| `lifesupport` | OPR-G08-0611 | damper cistern pallid forty | P-4-07-0611 | GAMMA-08 | 4 | none | P-2-06-0343 |
| `deputy` | OPR-A02-0139 | granite halyard sorrel eleven | P-2-04-0139 | ALPHA-02 | 2 | none | P-2-03-0039 |
| `auditor` | OPR-A01-0948 | ferrule quarto hemlock sixty | P-3-07-0948 | ALPHA-01 | 3 | BRIAR | P-2-01-0047 |

Operator id format (from the analyst card): `OPR-<class letter><site no>-<last four of pn>`. Passphrases are four lowercase words. `analyst` mirrors `canon.operator` field for field (a cross-check enforces it); its pn stays out of the roster.

- **analyst.** Pass one's visitor. Desktop = the twelve pass-one apps in pass-one order, so migrated state looks as it did.
- **lifesupport: GAMMA-08 (Dallas-Fort Worth).** Chosen because (1) it is one of only two GAMMA sites with a tram link straight from an ALPHA hub (ALPHA-05; the other is GAMMA-12), so seal drills, transit holds and trains reach it in the second relay wave and a technician sees network effects without knowing the network; (2) its Life Support & Maintenance line is 11 of 38 posted staff, enough for an environmental watch on three shifts (3 to 4 per watch), where most GAMMA sites carry 2 to 6; (3) it has no reactor (environ and the panel stay simple) and is hardening class H3 (dual portal: two portal doors and two blast doors to operate); (4) ALPHA-05 is the far end of segment 04, so the technician's one visible link runs toward the anomaly without ever naming it. Holder: Darlene M. Voss, Life Support Technician (Environmental Systems), Facilities Engineering, like L. Carranza at ALPHA-03. Supervisor: the GAMMA-08 site superintendent. Desktop: environ, doors, cctv, muster, pa, drill (watch only, the app decides), forms, mail, directives, system. No hoist (GAMMA has no hoists).
- **deputy: ALPHA-02.** No deputy commander existed at ALPHA-02, although content/personnel/org.md says every ALPHA command has one. Added Leland R. Ashcombe (P-2-04-0139, intake 2004 beside the ALPHA-03 command staff serials, no rank: a civilian deputy to a retired brigadier general). The name and personal address are Tier 2 like every Tier 2 roster entry: the client canon carries sentinels, and the account itself uses only role strings: displayName `DEPUTY COMMANDER 2-0139`, roleTitle `Deputy Commander, ALPHA-02`, email the command mailbox `deputy.cmdr@a02.cmd.mer` (a functional address, so mail routing works without the name). The roster entry has divisionId null, like every facility command post; the account carries `CMD` (`COMMAND_DIVISION_ID`), which the Lock and Taskbar show as the id because no division has that id. Approves: OSC-F-126 Compartment Access Request (DIR-0395 para 3(b) and personnel/transfer.md 6.3 make the deputy commander of the gaining facility the certifying officer), OSC-F-122 Facility Transfer Request (the deputy commander countersigns probation reviews, transfer.md 5.2), OSC-F-118 Visitor Escort Request and OSC-F-109 Travel Authorization (facility business at the hub). Compartments none, per SPEC-2.
- **auditor: ALPHA-01.** OIA is a division at ALPHA-01 (divisions[] `OIA`, director P-2-01-0047), so the auditor sits there. Added Harriet L. Vance (P-3-07-0948), Assurance Auditor, holds BRIAR (the OIA contingency compartment), `auditReader: true`, approves nothing.

Mail addresses: `lifesupport` and `auditor` use their roster addresses; `deputy` uses the command mailbox (its roster address `l.ashcombe@a02.cmd.mer` is Tier 2 and only in the CANON-T2 release).

### Survivability (planning model PM-3)

A plainly simplified planning model. Generic yield steps (10, 20, 50, 100, 200, 500, 1000 kt) and rounded, notional range coefficients; no weapon names, no effects other than surface peak overpressure. Model id PM-3, revision 2, 12 MAR 2007, originator OCP/ALPHA-01 (Operations and Continuity Planning), marking UMBRA-C. The `method` strings are the rules the strike app implements.

| Class | Name | Rated psi | Depth coupling | Sites |
|---|---|---|---|---|
| H1 | Deep mined hub | 1000 | 0.5 | ALPHA (5) |
| H2 | Deep mined regional centre | 500 | 0.6 | BETA (12) |
| H3 | Mined shelter, dual portal | 200 | 0.8 | GAMMA with 15 or more posted staff (10) |
| H4 | Mined shelter, single portal | 100 | 0.8 | GAMMA with fewer than 15 (8: GAMMA-04, 06, 10, 13, 14, 15, 16, 17) |

Effective rating = rated psi x (1 + coupling x depth/1000 ft). The GAMMA split uses posted staff (public), not depth, so the class does not leak the Tier 2 GAMMA depths. GAMMA depth of record is null in the client canon; the model then uses `gammaPlanningDepthFt` 150 (the class minimum, the conservative choice). A session holding T2 can read the real depth from the CANON-T2 release (`facilities.GAMMA-nn.depthFt`).

Contours, range (mi) = coefficient x kt^(1/3): 2 psi 0.75, 5 psi 0.45, 20 psi 0.22, 100 psi 0.11, 300 psi 0.07, 1000 psi 0.045, 3000 psi 0.03. Log-log interpolation between contours; beyond 2 psi unaffected; inside 3000 psi above the model's range. Conditions by ratio of site psi to effective rating: up to 0.5 OPERATIONAL, up to 1 DEGRADED, up to 2 ISOLATED, otherwise NOT ASSURED.

### Seal drill

| Class | Acknowledge | Door cycle | Report sealed (min from receipt) |
|---|---|---|---|
| ALPHA | 2 | 4 | 9 |
| BETA | 3 | 3 | 8 |
| GAMMA | 4 | 2 | 7 |

`timeScale` 30: drill minutes run 30 times faster than wall time (an ALPHA seal of 9 min shows in 18 s). Relay: 1 min per inter-hub rail hop, 1 min per tram link, 3 min per voice-circuit call. Origin: Network Control, ALPHA-01. `sequence` is computed by `sealDrillSequence` from rail segments in revenue service (segment 04 does not carry the order), then tram links (shortest relay time; BETA before GAMMA on ties), then the four GAMMA sites with no tram link (GAMMA-01, 02, 15, 18) by voice at 7, 10, 13 and 16 min. GAMMA-08 receives the order from ALPHA-05 at minute 2. A site not sealed by twice its class seal time is NO REPORT (rule text; the drill app applies it). Each class door cycle covers the slowest drill door at its sites (a cross-check: ALPHA adit blast doors 75 s, all within 4 min).

### Doors

ALPHA (listed level by level): portal doors at the lift heads (ALPHA-02: the adit portal and blast doors 1 and 2 in series, as the level 1 note in extended A says); a collar blast door; personnel airlock AL1 at the portal level (decon 300 s); a blast door at each level 2 shaft station; vault doors on the stores, records and cold-storage levels; plant isolation doors on the power plant levels; depot road doors (ALPHA-02, ALPHA-04); lift lobby doors on Tier 1 levels; one portal door per rail segment bore and one per tram bore on the rail terminal level, and tunnel airlock AL2. The segment 04 portal doors at ALPHA-02 and ALPHA-05 are normally closed (not in revenue service). Each door's `tier` is its level's tier. Locations name a level only by number where the level designation is restricted.

Figures: blast door cycle 60 s (adit doors 75 s, vault 40 s, plant 45 s), portal doors 20 to 30 s, airlock leaves 8 s, airlock cycle 90 s, decon 300 s (GAMMA 240 s). Blast door ratings: portal level = class rating (1000 psi at ALPHA), tunnel portals 300 psi, interior doors 50 psi. BETA template: vehicle portal, portal blast door (class rating), tram tunnel portal door, plant level isolation door, personnel airlock (decon), tram platform airlock. GAMMA template: entry portal and blast door; second portal and blast door at H1-H3 sites; tram tunnel portal door where linked; plant room door; personnel airlock.

### Cameras

ALPHA: surface gate, portal cameras, the three hoist collar landings, a lift-lobby camera on every level from 2 down, the level 2 air handling hall, the dining hall, vault doors, generator halls, depot roads and one camera per platform (ALPHA-01 5, ALPHA-02 6 including platform 3 on segment 04, ALPHA-03 3, ALPHA-04 4, ALPHA-05 7 including platform 7 on segment 04, from the level notes). Each camera's `tier` is its level's tier. PTZ on gates, portals, assembly and platform cameras. BETA template: 9 cameras (8 without a tram link); GAMMA template: 8 (single-portal and unlinked sites lose the second-portal and platform cameras).

### Hoists (ALPHA only)

Three per hub: personnel hoist H1 (1,600 fpm, 60 persons, 12,000 lb, every level but the Tier 1 levels, which are reached by an escorted lift that is not listed), vehicle lift or freight hoist H2 (600 fpm, 30 persons, 40,000 lb, portal, mechanical, dining/stores, power plant, depot and rail levels) and emergency egress winder H3 (400 fpm, 8 persons, collar to level 2). Acceleration 10/15/6 s. Landing depth = level `topFt + heightFt` (the level floor); `travelFt` = deepest landing minus collar landing. The personnel hoist's bottom landing equals the facility depth at every hub (ALPHA-01 2,100, ALPHA-02 1,850, ALPHA-03 1,200, ALPHA-04 1,650, ALPHA-05 1,400 ft); travel 2,030, 1,790, 1,130, 1,590 and 1,334 ft.

### Muster points

Each site's points have an `assigned` count (posted staff assigned to that point; they sum exactly to the facility's staff) and a `capacity` (sum always above staff). ALPHA: dining hall 40%, berthing lobby 25%, platforms 20%, collar or adit station 10%, surface cover staff 5%; capacity 2.5 x assigned rounded up to 10. BETA template: dining room 50%, operations level 30%, portal level 20%; capacity 2 x assigned rounded up to 5 (minimum 20/15/10). GAMMA: shelter hall 75%, entry level 25%; capacity 3 x, minimum 10/5. Assignment uses largest remainder. Network total assigned 3,036 = staffPosted 3,057 less the 21 DELTA staff.

### Restricted values (CANON-T2)

The client canon sanitiser covers everything new: the three roster additions go through the existing roster rules (the deputy's name and address become `T2` sentinels); accounts and plant data contain no restricted value (a test checks they reach the client unchanged and sentinel-free; a cross-check fails the merge if an account string contains a Tier 1 or 2 name or surname).

canon-merge writes `public/data/releases/<releaseFileName('CANON-T2')>.json` (currently `50210e11796867ab.json`), the encoded `{ "<dot path>": "<value>" }` of every value the client canon withholds under `T2` (roster names and addresses, Tier 2 level names and notes, GAMMA cover stories outside the home network, Tier 2 reserve labels, texts and values), plus GAMMA depths of record and `accounts.deputy.name` / `accounts.deputy.rosterEmail`. Tier 1 and compartment-keyed values are never written. `src/core/canon-release.ts` `loadCanonT2()` fetches and decodes it; call it only when the session satisfies T2. Like the document releases it is obfuscated, not secret.

### App fragments (`canon.apps`, wave 2B)

Each set-piece app keeps its own numbers in `content/canon/apps/<appId>.json` (schema `src/core/canon-apps/<appId>.ts`), merged into `canon.apps[<appId>]` and read by the app as `canon.apps.<appId>`. Fragments may only add app-local figures; anything that touches the shared world (facilities, doors, cameras, hoists, muster points, seal timings, accounts) comes from the keys above. Document numbers below follow the scheme in `docs/canon/extended-a.md` (audited and renumbered in wave 2C by I2; see the numbering notes there).

| App | Fragment keys (summary) | Documents (content/<appId>/) | Mail (MSG-08-, content/mail/<appId>/) |
|---|---|---|---|
| strike | `caveat`, yield and listing ranges, register prefix and show limit, DELTA and position withholding, refusals, messages, gazetteer | OSC-MEM-07-0312 (PM-3 method), OSC-MEM-08-0166 (planning register) | 05961 to 05964 |
| isolate | `panel` (cover, hold), `levels` (escalation 1 to 5), `seals`, `outcomeMail`, `archived`, `counter` | OSC-DIR-0507 (procedure), OSC-MEM-07-0233 (escalation schedule) | 05201 to 05214 |
| drill | drill id prefix, tick, hold, register cap, order position, completion rule, drilled sites, calendar holds, order wire, history, mail | OSC-DIR-0433 (procedure), OSC-DIR-0434 (site card, t4) | 05301 to 05306 |
| cctv | DVR client, recorder, activity profiles, train and platform cameras, PTZ presets, segment 04, unassigned cameras, muster camera, still prefix | OSC-DIR-0474 (procedure), KB-0216 (t4) | 05881 to 05886 |
| plant | panel, point-kinetics model, rods, trips, alarms, electrical, limits, meters, initial conditions, trainer, history, live link, qualification, events | OSC-RSV-SIM-01 (procedure), OSC-RSV-SIM-02 (card, t4) | 05731 to 05736 |
| doors | motion, airlock, pressure, shift change, local zones, log cap and retention, bypass key prefix, history | OSC-MEM-08-0146 (procedure, t4), OSC-MEM-08-0147 (airlock card, t4) | 04651 to 04656 |
| dispatch | desk, working and training modes, stock, possessions, segment 04, platform site and service | OSC-TRN-DSP-01 (procedure), OSC-TRN-DSP-02 (reference), OSC-TRN-DSP-03 (GAMMA-08 platform notice, t4) | 04761 to 04765 |
| hoist | model, landing compartments, sump vanes | OSC-DIR-0466 (procedure), OSC-MEM-07-0851 (shaft data) | 06231 to 06238 |
| environ | GAMMA-08 panel: volume, zones, AHUs, fan speeds, make-up, metabolic load, occupancy by local hour, scrubbers, CBRN filtration, thermal, limits, model, calibration, watches | OSC-MEM-07-0262 (SOP, t4), OSC-MEM-08-0171 (plant data, t4); cites OSC-DIR-0128 (t4, lifesupport variant) | 05611 to 05614 |
| pa | system, priorities, tone sequences, message library, withheld messages, test window, speakers, zones, division zones, network key, history | OSC-DIR-0458 (procedure), KB-0057 (t4) | 05741 to 05746 |
| muster | system, badge, classes, no-badge rate, roster accounted, readers, unknown badges, site accounts | OSC-DIR-0461 (procedure), KB-0316 (t4) | 04771 to 04774 |
| patch | panel, limits, jitter, monitor, tests, traffic, calls, exchanges, ringdowns, pencil, messages, circuits | OSC-MEM-07-1186 (operating instructions), OSC-MEM-06-0291 (circuit register), OSC-MEM-08-0152 (GAMMA-08 maintenance circuit, t4) | 04931 to 04936 |

Per-account mail (content/mail/accounts/, CT1): login mail sits in the pass-one delivery run (04341 to 04477, dated 06 to 17 MAY); triggered mail keeps 06105 to 06106 (lifesupport), 06206 to 06209 (deputy) and 06306 to 06308 (auditor). Mapping in `docs/narrative-2/accounts.md`.

Tier 4 rule for the fragments' citations: every document a set-piece app cites in a refusal or action card that a Tier 4 session can reach is `t4: true` or has a lifesupport variant. Wave 2C added `t4` to OSC-DIR-0319 (printing and reproduction, cited by print and export refusals in six apps) and OSC-DIR-0412 (compartment handling, the general refusal reference) and a lifesupport extract of KB-0031 (cited by the plant work-order refusal). Procedures cited only from Tier 3 views (DIR-0433, 0458, 0461, 0466, 0474, 0507, MEM-07-0233, 07-1186, 06-0291, 07-0851, RSV-SIM-01, TRN-DSP-01/02, OSC-ASR-CG) stay Tier 3: a Tier 4 session reaches them only as the standard refusal (DIR-0301), and the apps it can operate point it at the t4 cards above.
