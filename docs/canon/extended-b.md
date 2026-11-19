## Extended (B)

Owner: canon extender B. Data file: `content/canon/extended-b.json`. Everything in this section is **extended** canon: invented to fill what the lore implies but does not give. Nothing here contradicts a figure in `lore/source-facility-inventory.html`; where the lore gives a figure, the extended material is built to reconcile to it exactly.

Top-level keys in `extended-b.json`:

| Key | Shape | Count |
|---|---|---|
| `glossary` | `GlossaryTerm[]` (canon-types.ts) | 153 terms, alphabetical |
| `budget` | `{ fiscalYears: {fy,totalM}[], lineItems: LineItem[] }` | 8 FYs, 127 line items |
| `budgetNotes` | `string[]` | 5 ledger notes (predecessor accounts, numbering, account codes) |
| `contractors` | `{ register: Contractor[] }` | 47 primes, PC-01 to PC-47 |
| `threatDetail` | `{ id, group, label, ownerDivision, contingency: string[], protocol }[]` | 7 threats |
| `coverCatalogue` | `{ facility, coverAgency, coverFacilityType, visibleSurfaceStaff, publicRecordsPosture, lastCoverReview }[]` | 17 (all ALPHA and BETA) |
| `realEvents` | `{ id, date, dateText, publicEvent, oscExplanation, citedIn }[]` | 9 |
| `calendar` | `{ id, date, dateText, startZ, endZ, timeText, facility, title, category, originator, tier, note }[]` | 40 events, 01 to 31 MAY 2008 |

`threatDetail`, `coverCatalogue`, `realEvents`, `calendar` and `budgetNotes` are not in the current `Canon` interface; the merge script will need to carry them (proposed additions below).

### Glossary (153 terms)

Bureaucratic definitions with `seeAlso` arrays; every `seeAlso` target resolves to another term in the glossary. The fixed definitions that other content must use consistently:

- **SUSTAINED CAPACITY**: 23,400. Personnel supportable for the planned sustainment period at full reserves; the denominator of utilisation (3,847 / 23,400 = 16.4%) and the scale at which reserves are stated.
- **SURGE BERTHING**: 34,700. Physical count of berths across all 47 facilities (ALPHA 16,000 + BETA 10,780 + GAMMA 6,940 + DELTA 980). Not supported by reserves at full occupancy. The `Facility.capacity` field is surge berthing.
- **CERTIFIED MILEAGE**: 847. The only tunnel figure used in Council reporting and Tier 1 summaries; "not derived from, and not reconciled with, engineering mileage".
- **ENGINEERING MILEAGE**: rail 6,074 (six segments) and tram 10,538 (four network totals). Used by Transit engineering and the dispatcher board.
- **DETACHED / UNPOSTED**: defined only as "Payroll category; see personnel accounting." Its one `seeAlso`, PERSONNEL ACCOUNTING, says categories other than POSTED "are defined in the governing payroll issuance", which no directive is. The loop is deliberate.
- **REVENUE SERVICE / POSSESSION / BLOCK / BLOCK OCCUPANCY / CONSIST / CONSIST ID / HEADWAY**: transit vocabulary. Possession reports POSSESSED regardless of detection; a consist ID "may be suppressed on the board by Transit Control on instruction" (supports the segment 04 movement).
- **TIER / COMPARTMENT / BRIEFING / READ-IN / DEBRIEFING / PROBATIONARY TRANSFER / ACTING CREDENTIAL / WITHHOLDING AUTHORITY / NEED-TO-KNOW**: clearance-engine vocabulary. An acting credential "does not confer the briefings associated with the higher tier"; a probationer may not hold one.
- **SEAL STATE** (OPEN, CONDITIONED, SEALED, SEALED (DRILL)), **NBC SEAL** (180-day), **SUSTAINMENT WINDOW** (ALPHA 12 to 18 months by site; GAMMA 90 to 180 days; DELTA 72 hours; BETA limited).
- Markings, as terms: UMBRA//OSC EYES ONLY, UMBRA//OSC UNRESTRICTED, UMBRA//OSC COMPARTMENTED, UMBRA//OSC RESTRICTED, TOP SECRET/SCI WITH OSC COMPARTMENT, plus UMBRA, MARKING, MARKING STRIP. Each notes the single-slash source spelling.
- Also MERIDIAN, QKD, LINK STATE, ROUTING SLIP, SUSPENSE DATE, ACTION OFFICER, TASKING, ESSENTIAL PERSONNEL, RECONSTITUTION, COVER IDENTITY, COVER INFRASTRUCTURE, COVER REVIEW, COVER STORY, and the dull majority: BADGE, LOST BADGE PROCEDURE, ESCORT, VISITOR LOG, HVAC FILTER CYCLE (90-day particulate, 180-day gas-phase), AIR HANDLING UNIT, PRINT RELEASE (unreleased jobs purged after four hours), CLEAN DESK CHECK, BURN BAG, PARKING ALLOCATION, SPACE ALLOCATION, CAFETERIA ROTATION (six-week cycle), GENERATOR RUN TEST, DOSIMETRY BADGE, HELP DESK TICKET, TRAINING COMPLIANCE, and so on.

### Budget

**Fiscal years ($M), sum 287,000.** Shaped to the phase history: small Phase 1 start, rising through ALPHA construction, peaking FY2006 as ALPHA builds close out and rail segments 02/03/05 complete, tapering as tram works finish in Phase 3.

| FY2001 | FY2002 | FY2003 | FY2004 | FY2005 | FY2006 | FY2007 | FY2008 |
|---|---|---|---|---|---|---|---|
| 9,800 | 21,500 | 31,700 | 41,200 | 50,600 | 52,300 | 46,900 | 33,000 |

**Ids.** Line items use the ids that `source.json` actually emits: categories `FACILITY TRANSIT EQUIPMENT PERSONNEL RESERVES`; sources `BLACK DOD FEMA DOE MISC`. (The brief proposed lower-case `black/dod/...` and `construction/...`; the extractor shipped upper case, so B follows source.json to keep references valid.)

**Category x source allocation ($M)**, both marginals exact:

| | BLACK | DOD | FEMA | DOE | MISC | Total |
|---|---|---|---|---|---|---|
| FACILITY | 52,000 | 38,000 | 26,000 | 17,000 | 9,000 | 142,000 |
| TRANSIT | 44,000 | 26,000 | 9,000 | 6,000 | 4,000 | 89,000 |
| EQUIPMENT | 14,670 | 11,360 | 5,790 | 1,830 | 350 | 34,000 |
| PERSONNEL | 5,000 | 3,000 | 4,000 | 1,000 | 1,000 | 14,000 |
| RESERVES | 2,000 | 2,000 | 4,000 | 0 | 0 | 8,000 |
| Total | 117,670 | 80,360 | 48,790 | 25,830 | 14,350 | 287,000 |

Item counts per row: FACILITY 43, TRANSIT 26, EQUIPMENT 20, PERSONNEL 18, RESERVES 20 = 127.

**By category and FY ($M):**

| Category | FY01 | FY02 | FY03 | FY04 | FY05 | FY06 | FY07 | FY08 |
|---|---|---|---|---|---|---|---|---|
| FACILITY | 9,659 | 17,734 | 19,812 | 24,450 | 27,615 | 21,839 | 13,925 | 6,966 |
| TRANSIT | 0 | 2,242 | 8,775 | 11,946 | 15,089 | 19,447 | 17,497 | 14,004 |
| EQUIPMENT | 0 | 833 | 1,390 | 2,828 | 5,185 | 7,329 | 10,214 | 6,221 |
| PERSONNEL | 141 | 691 | 1,433 | 1,452 | 1,803 | 2,313 | 3,063 | 3,104 |
| RESERVES | 0 | 0 | 290 | 524 | 908 | 1,372 | 2,201 | 2,705 |

**By department ($M, items):** DOD 161,523 (65 items), DOE 50,931 (22), DHS 39,190 (17), FEMA 35,356 (23). DHS has no obligation before FY2003.

**Rules the generator enforces.** Transit lines start no earlier than FY2002 (TBM works 2002 to 2007). Reserves lines start no earlier than FY2003. DHS lines start no earlier than FY2003: DHS began operations 24 JAN 2003 and its first full appropriation was FY2004, so FY2003 DHS amounts are recorded as obligated under transfer authority. Earlier homeland-security-type spending sits on FEMA lines (FEMA was independent until 01 MAR 2003 and keeps its FEMA label afterwards) and DOD lines. `fy` maps list only years with a non-zero amount. Titles are bland cover lines; about half the DOD construction, transit and equipment lines carry an invented `Program Element 0603nnnD8Z`. Account codes use the real two-digit agency prefixes (97 Defense-wide, 89 Energy, 70 DHS, 58 FEMA) with invented account and sub-account numbers, all unique. Line items are numbered LI-001 to LI-127 by first obligation year, then department, then title. Some titles sit in departments that do not obviously own them (a DOD "Hurricane Continuity Site Development" line, DHS traction-power lines). That is the audit camouflage working, not an error.

### Contractors (47 primes)

Invented company names (regional, bland, none modelled on a real firm), trade, subcontractor count, 1 to 3 sites each, and a compartment note (Title 50 contract, site known to the firm only by a project number, drawings issued without title blocks, and so on). Trades fit the sites: tunnelling, traction and trackwork primes are on ALPHA/BETA sites only; DELTA sites go to security hardware, paving, modular buildings, logistics, fuel and reclamation trades. Sites per prime: 15 primes hold 1 site, 19 hold 2, 13 hold 3. Every facility ALPHA-01 to ALPHA-05, BETA-01 to BETA-12, GAMMA-01 to GAMMA-18 and DELTA-01 to DELTA-12 is covered by at least one prime.

**Subcontractors total 390 across 47 primes: mean 8.298, which rounds to the source's 8.3.** No integer total gives exactly 8.300; 390 is the nearest.

### Threat detail

One entry per source threat, keyed to the source ids (`EXT-NUCLEAR EXT-NBC EXT-CONVENTIONAL INT-AGENCY INT-CONGRESS INT-WHISTLEBLOWER INT-MEDIA`). Each has 2 to 3 contingency paragraphs that restate and extend the source response without contradicting it, an owning division, and a contingency protocol whose `title` is `null` (`titleWithheld: true`) while `pageCount` and `revision` are stated:

| Threat | Protocol | Pages | Owner |
|---|---|---|---|
| Nuclear Exchange | OSC-CP-01 | 318 | Operations and Continuity Planning |
| Biological / Chemical | OSC-CP-02 | 146 | Facility Engineering |
| Conventional Military | OSC-CP-03 | 97 | Security Forces Command |
| Outside Agency Discovery | OSC-CP-04 | 64 | Office of Internal Assurance |
| Congressional Investigation | OSC-CP-05 | 121 | Office of General Counsel |
| Whistleblowers | OSC-CP-06 | 41 | Office of Internal Assurance |
| Media Exposure | OSC-CP-07 | 212 | Cover Programs Office |

The whistleblower entry's second paragraph is only "Contingency protocols exist." The source's [REDACTED] is carried by the protocol, not explained.

### Cover catalogue

All 17 ALPHA and BETA sites: cover agency, cover facility type, visible surface staff (9 to 72), public-records posture, and last cover review (all between JUN 2007 and 20 MAY 2008, inside the 18-month review interval in the glossary). Source cover identities are used as written. **ALPHA-01 has no cover identity in the source** (only "hidden beneath defunct quarry site"); B catalogues it as a Department of the Interior former-quarry reclamation and groundwater monitoring station. If extender A gives ALPHA-01 a different `coverIdentity`, A's wins and this entry should be changed to match.

### Real events (9)

Public, documented 2001 to 2008 events, each with a deadpan OSC explanation and the documents that would cite it. No private individual is named or implicated.

1. 17 FEB 2001: Executive Order 13201 (published text: notification of employee rights about union dues). The lore says construction began under EO 13201; the operative annex was "not published".
2. FEB 2002: Salt Lake City Winter Olympics (a National Special Security Event). Covered the BETA-11 site survey.
3. 24 JAN / 01 MAR 2003: DHS begins operations; FEMA transferred in. Explains why DHS lines start in FY2003.
4. 12 to 16 MAY 2003: TOPOFF 2 (Seattle, Chicago). Long-lead equipment moved to BETA-07 and BETA-10.
5. 14 AUG 2003: Northeast blackout. First network test of the diesel backup at GAMMA-02 and GAMMA-07.
6. 29 AUG 2005: Hurricane Katrina and the supplementals. BETA-12's visibility and line growth.
7. DEC 2005: pandemic influenza emergency funding. Cover for the pharmaceutical stockpile and the BETA-03 medical fit-out.
8. 09 MAY 2007: NSPD-51/HSPD-20, National Continuity Policy. Council minutes record it as "noted".
9. 15 to 19 OCT 2007: TOPOFF 4 (Portland, Phoenix, Guam). Seal drills at BETA-06 and GAMMA-13.

`citedIn` references real line-item numbers in the generated register where relevant.

### Calendar, MAY 2008 (40 events)

Times are Zulu, with site-local in brackets (EDT/CDT/MDT/PDT; MST for BETA-06 in Arizona). DELTA sites show "(site-local withheld)" because DELTA locations are Tier 1. Each event has a minimum `tier` to see it. Mundane: cafeteria rotation, access roster reissue, generator run tests, HVAC filter cycles, fire drills, dosimetry exchange, training compliance and refresher suspenses, the ALPHA-05 parking allocation review, quarterly and monthly reactor surveillance tests at ALPHA-01 and ALPHA-04 (only ALPHA sites, so A's choice of BETA reactor sites is not presumed), a seed vault compressor job, Memorial Day minimum manning on 26 MAY, QKD link maintenance, a normal tram possession with times. Odd, in the same format:

- 13 MAY, ALPHA-05: "Possession, segment 04". No times entered, no note.
- 15 MAY, ALPHA-01: "Council session". No times; "Attendance by Council instruction." (Tier 2)
- 27 MAY, ALPHA-03: "Unposted status declarations: collection closes". No note.
- 31 MAY, ALPHA-01: "Payroll category change effective". "Count withheld." (Tier 2)

### Verification

Generated by a deterministic Node script (seeded PRNG; iterative proportional fitting for the item x FY matrix, then integer balancing that preserves the row and column sums), kept outside the repo. Output of the final run:

```
PASS  glossary count >= 130  (153)
PASS  glossary alphabetical
PASS  glossary seeAlso all resolve
PASS  glossary required terms present
PASS  DETACHED / UNPOSTED def exact
PASS  fiscalYears FY2001..FY2008 sum = 287000  (287000)
PASS  lineItems count = 127  (127)
PASS  line item numbers unique LI-001..LI-127
PASS  titles unique
PASS  accounts unique
PASS  departments only DOD/DOE/DHS/FEMA (all four used)
PASS  category ids/sums match source.json categories (amountB x 1000)  {"FACILITY":142000,"PERSONNEL":14000,"EQUIPMENT":34000,"TRANSIT":89000,"RESERVES":8000}
PASS  source ids/sums match source.json sources (pct x 287000)  {"DOD":80360,"BLACK":117670,"FEMA":48790,"MISC":14350,"DOE":25830}
PASS  threat ids match source.json threats
PASS  item fy maps sum to amountM
PASS  item fy values positive integers
PASS  per-FY sums equal fiscalYears totals
PASS  DHS lines start >= FY2003  (17 DHS lines)
PASS  transit lines start >= FY2002
PASS  reserves lines start >= FY2003
PASS  amountM integers
PASS  contractors = 47, PC-01..PC-47
PASS  subcontractors total 390, mean rounds to 8.3  (total 390, mean 8.298)
PASS  each contractor 1..3 sites  (max 3)
PASS  all 47 facilities covered  (47)
PASS  contractor names unique
PASS  threatDetail 7 entries (3 external, 4 internal)
PASS  every protocol title withheld with page count
PASS  cover catalogue covers ALPHA+BETA (17)
PASS  cover reviews <= 2008-05-31
PASS  realEvents 6..10  (9)
PASS  calendar 30..45 events, all MAY 2008  (40)
PASS  calendar facilities valid
PASS  calendar has segment 04 possession with no times
```

### Proposed contract additions

- `Canon` should gain `threatDetail`, `coverCatalogue`, `realEvents`, `calendar` and `budgetNotes` with the shapes in the table above.
- `threatDetail[].ownerDivision` is a division **name**, because extended-a's division ids were not available while B was written. The merge should map it to A's `Division.id`, or A's names should be adopted. Names used: Operations and Continuity Planning, Facility Engineering, Security Forces Command, Office of Internal Assurance, Office of General Counsel, Cover Programs Office.
- Calendar `originator` uses `CODE/SITE` with provisional division codes (RD, SEC, ENG, LOG, ADM, MED, SAF, TRG, IS, TC, CPO, CC, PER). These should be reconciled with A's division codes.
