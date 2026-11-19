# MERIDIAN page manifest

Generated from `content/manifest.json` (372 pages: 240 from pass one, 132 from pass two). Spoiler-free: the unlock graph is in `docs/NARRATIVE.md` and `src/narrative/plan.json` only; pass-two secrets are in `docs/narrative-2/`.

## Counts per family

| Family | Pages |
|---|---|
| registry | 52 |
| transit | 15 |
| personnel | 21 |
| council | 30 |
| reserves | 16 |
| ledger | 21 |
| assurance | 15 |
| directives | 24 |
| forms | 12 |
| mail | 128 |
| system | 12 |
| strike | 2 |
| isolate | 2 |
| drill | 2 |
| cctv | 2 |
| plant | 2 |
| doors | 2 |
| dispatch | 3 |
| hoist | 2 |
| environ | 2 |
| pa | 2 |
| muster | 2 |
| patch | 3 |
| **Total** | **372** |

## Counts per owner

| Owner | Pages |
|---|---|
| facilities-beta | 14 |
| facilities-alpha | 6 |
| facilities-gamma-delta | 32 |
| transit | 15 |
| personnel | 21 |
| council | 25 |
| real-events | 8 |
| reserves | 16 |
| ledger | 20 |
| assurance | 13 |
| directives-1 | 12 |
| directives-2 | 12 |
| forms | 12 |
| mail-1 | 15 |
| mail-2 | 15 |
| accounts-mail | 23 |
| cctv | 8 |
| dispatch | 8 |
| doors | 8 |
| drill | 8 |
| environ | 6 |
| hoist | 10 |
| isolate | 16 |
| muster | 6 |
| pa | 8 |
| patch | 9 |
| plant | 8 |
| strike | 6 |
| help | 12 |
| **Total** | **372** |

Access column: `T<n> <COMPARTMENT>` page requirement; `t4` opens for Tier 4 (lifesupport account); `var:` accounts with their own variant copy (`content/variants/<account>/`, same id, route and docNo).

## Deviations from the SPEC section 9 sub-lists (family totals unchanged)

The SPEC sub-lists leave no room for the Records Library documents (memoranda, incident ticket, scan) and the transit sub-list sums to 16 against a family total of 15. Resolved as follows, each record page opening in the Records Library (app `records`):

- **Transit (15):** overview and working timetable are one page (OSC-TRN-TT-08-02, route /transit); the incident log and possession register are the reserved records OSC-TRN-INC-08-017 and OSC-TRN-POS-08-044, each carrying the surrounding May log/register extract.
- **Personnel (21):** four functional branches instead of six (OPS, SEC, TEC, SUP cover all ten ratio functions); the two freed slots hold OSC-MEM-08-0187 and OSC-MEM-08-0203.
- **Council (25):** five sets of minutes instead of six (the 15 MAY 2008 session's minutes are not yet issued in-world); the slot holds the scan OSC-2008-Q2.
- **Reserves (16):** food and water are one page (OSC-RSV-FOOD); the slot holds OSC-MEM-07-0612.
- **Ledger (20):** FY2001 and FY2002 share one page (OSC-LDG-FY01, route /ledger/fy/2001); the slot holds OSC-MEM-07-0944.
- **Assurance (13):** construction security is folded into the contractor register (OSC-ASR-CTR); the slot holds OIA-08-031.
- **Mail (30):** two cables (OSC-CBL-08-01173, OSC-CBL-08-01208) travel as mail with template `cable`; seven briefing messages answer for OSC-CB-010..016 via `aliases`.
- **Help/system (12):** glossary, settings, monitor, calendar, colophon, about, and six KB articles.

## Pages by owner

### facilities-beta (14)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| registry-index | /registry | OSC-FAC-IDX | Facility Registry: Index of Installations | UMBRA-C | registry |  |
| registry-class-beta | /registry/class/beta | OSC-FAC-CLS-BETA | Facility Class Standard: BETA (Regional Operations Centers) | UMBRA-C | registry |  |
| fac-beta-01 | /registry/facility/beta-01 | OSC-FAC-BETA-01 | Facility Dossier: BETA-01 (EPA Monitoring Station) | UMBRA-C | registry |  |
| fac-beta-02 | /registry/facility/beta-02 | OSC-FAC-BETA-02 | Facility Dossier: BETA-02 (Natural Gas Reserve Facility) | UMBRA-C | registry |  |
| fac-beta-03 | /registry/facility/beta-03 | OSC-FAC-BETA-03 | Facility Dossier: BETA-03 (CDC Secondary Research Complex) | UMBRA-C | registry |  |
| fac-beta-04 | /registry/facility/beta-04 | OSC-FAC-BETA-04 | Facility Dossier: BETA-04 (Agricultural Research Station) | UMBRA-C | registry |  |
| fac-beta-05 | /registry/facility/beta-05 | OSC-FAC-BETA-05 | Facility Dossier: BETA-05 (FAA Regional Training Center) | UMBRA-C | registry |  |
| fac-beta-06 | /registry/facility/beta-06 | OSC-FAC-BETA-06 | Facility Dossier: BETA-06 (DOE Solar Research Facility) | UMBRA-C | registry |  |
| fac-beta-07 | /registry/facility/beta-07 | OSC-FAC-BETA-07 | Facility Dossier: BETA-07 (USGS Seismology Center) | UMBRA-C | registry |  |
| fac-beta-08 | /registry/facility/beta-08 | OSC-FAC-BETA-08 | Facility Dossier: BETA-08 (Nuclear Test Site Support) | UMBRA-C | registry |  |
| fac-beta-09 | /registry/facility/beta-09 | OSC-FAC-BETA-09 | Facility Dossier: BETA-09 (STRATCOM Auxiliary Facility) | UMBRA-C | registry |  |
| fac-beta-10 | /registry/facility/beta-10 | OSC-FAC-BETA-10 | Facility Dossier: BETA-10 (DHS Regional Response Center) | UMBRA-C | registry |  |
| fac-beta-11 | /registry/facility/beta-11 | OSC-FAC-BETA-11 | Facility Dossier: BETA-11 (BLM Resource Management) | UMBRA-C | registry |  |
| fac-beta-12 | /registry/facility/beta-12 | OSC-FAC-BETA-12 | Facility Dossier: BETA-12 (FEMA Hurricane Continuity Site) | UMBRA-C | registry |  |

### facilities-alpha (6)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| registry-class-alpha | /registry/class/alpha | OSC-FAC-CLS-ALPHA | Facility Class Standard: ALPHA (Command & Control Hubs) | UMBRA-C | registry |  |
| fac-alpha-01 | /registry/facility/alpha-01 | OSC-FAC-ALPHA-01 | Facility Dossier: ALPHA-01 "RAVEN MOUNTAIN" | UMBRA-C | registry |  |
| fac-alpha-02 | /registry/facility/alpha-02 | OSC-FAC-ALPHA-02 | Facility Dossier: ALPHA-02 "OLYMPUS STATION" | UMBRA-C | registry | var: deputy |
| fac-alpha-03 | /registry/facility/alpha-03 | OSC-FAC-ALPHA-03 | Facility Dossier: ALPHA-03 "ARCHIVE SITE TANGO" | UMBRA-C | registry |  |
| fac-alpha-04 | /registry/facility/alpha-04 | OSC-FAC-ALPHA-04 | Facility Dossier: ALPHA-04 "WESTERN CONTINUITY STATION" | UMBRA-C | registry |  |
| fac-alpha-05 | /registry/facility/alpha-05 | OSC-FAC-ALPHA-05 | Facility Dossier: ALPHA-05 "SENTINEL DEEP" | UMBRA-C | registry |  |

### facilities-gamma-delta (32)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| registry-class-gamma | /registry/class/gamma | OSC-FAC-CLS-GAMMA | Facility Class Standard: GAMMA (Personnel Shelters) | UMBRA-C | registry | t4; var: lifesupport |
| registry-class-delta | /registry/class/delta | OSC-FAC-CLS-DELTA | Facility Class Standard: DELTA (Safe Houses & Caches) | UMBRA-U | registry |  |
| fac-gamma-01 | /registry/facility/gamma-01 | OSC-FAC-GAMMA-01 | Facility Dossier: GAMMA-01 | UMBRA-C | registry |  |
| fac-gamma-02 | /registry/facility/gamma-02 | OSC-FAC-GAMMA-02 | Facility Dossier: GAMMA-02 | UMBRA-C | registry |  |
| fac-gamma-03 | /registry/facility/gamma-03 | OSC-FAC-GAMMA-03 | Facility Dossier: GAMMA-03 | UMBRA-C | registry |  |
| fac-gamma-04 | /registry/facility/gamma-04 | OSC-FAC-GAMMA-04 | Facility Dossier: GAMMA-04 | UMBRA-C | registry |  |
| fac-gamma-05 | /registry/facility/gamma-05 | OSC-FAC-GAMMA-05 | Facility Dossier: GAMMA-05 | UMBRA-C | registry |  |
| fac-gamma-06 | /registry/facility/gamma-06 | OSC-FAC-GAMMA-06 | Facility Dossier: GAMMA-06 | UMBRA-C | registry |  |
| fac-gamma-07 | /registry/facility/gamma-07 | OSC-FAC-GAMMA-07 | Facility Dossier: GAMMA-07 | UMBRA-C | registry |  |
| fac-gamma-08 | /registry/facility/gamma-08 | OSC-FAC-GAMMA-08 | Facility Dossier: GAMMA-08 | UMBRA-C | registry | t4; var: lifesupport |
| fac-gamma-09 | /registry/facility/gamma-09 | OSC-FAC-GAMMA-09 | Facility Dossier: GAMMA-09 | UMBRA-C | registry |  |
| fac-gamma-10 | /registry/facility/gamma-10 | OSC-FAC-GAMMA-10 | Facility Dossier: GAMMA-10 | UMBRA-C | registry |  |
| fac-gamma-11 | /registry/facility/gamma-11 | OSC-FAC-GAMMA-11 | Facility Dossier: GAMMA-11 | UMBRA-C | registry |  |
| fac-gamma-12 | /registry/facility/gamma-12 | OSC-FAC-GAMMA-12 | Facility Dossier: GAMMA-12 | UMBRA-C | registry |  |
| fac-gamma-13 | /registry/facility/gamma-13 | OSC-FAC-GAMMA-13 | Facility Dossier: GAMMA-13 | UMBRA-C | registry |  |
| fac-gamma-14 | /registry/facility/gamma-14 | OSC-FAC-GAMMA-14 | Facility Dossier: GAMMA-14 | UMBRA-C | registry |  |
| fac-gamma-15 | /registry/facility/gamma-15 | OSC-FAC-GAMMA-15 | Facility Dossier: GAMMA-15 | UMBRA-C | registry |  |
| fac-gamma-16 | /registry/facility/gamma-16 | OSC-FAC-GAMMA-16 | Facility Dossier: GAMMA-16 | UMBRA-C | registry |  |
| fac-gamma-17 | /registry/facility/gamma-17 | OSC-FAC-GAMMA-17 | Facility Dossier: GAMMA-17 | UMBRA-C | registry |  |
| fac-gamma-18 | /registry/facility/gamma-18 | OSC-FAC-GAMMA-18 | Facility Dossier: GAMMA-18 | UMBRA-C | registry |  |
| fac-delta-01 | /registry/facility/delta-01 | OSC-FAC-DELTA-01 | Facility Dossier: DELTA-01 | UMBRA-U | registry |  |
| fac-delta-02 | /registry/facility/delta-02 | OSC-FAC-DELTA-02 | Facility Dossier: DELTA-02 | UMBRA-U | registry |  |
| fac-delta-03 | /registry/facility/delta-03 | OSC-FAC-DELTA-03 | Facility Dossier: DELTA-03 | UMBRA-U | registry |  |
| fac-delta-04 | /registry/facility/delta-04 | OSC-FAC-DELTA-04 | Facility Dossier: DELTA-04 | UMBRA-U | registry |  |
| fac-delta-05 | /registry/facility/delta-05 | OSC-FAC-DELTA-05 | Facility Dossier: DELTA-05 | UMBRA-U | registry |  |
| fac-delta-06 | /registry/facility/delta-06 | OSC-FAC-DELTA-06 | Facility Dossier: DELTA-06 | UMBRA-U | registry |  |
| fac-delta-07 | /registry/facility/delta-07 | OSC-FAC-DELTA-07 | Facility Dossier: DELTA-07 | UMBRA-U | registry |  |
| fac-delta-08 | /registry/facility/delta-08 | OSC-FAC-DELTA-08 | Facility Dossier: DELTA-08 | UMBRA-U | registry |  |
| fac-delta-09 | /registry/facility/delta-09 | OSC-FAC-DELTA-09 | Facility Dossier: DELTA-09 | UMBRA-U | registry |  |
| fac-delta-10 | /registry/facility/delta-10 | OSC-FAC-DELTA-10 | Facility Dossier: DELTA-10 | UMBRA-U | registry |  |
| fac-delta-11 | /registry/facility/delta-11 | OSC-FAC-DELTA-11 | Facility Dossier: DELTA-11 | UMBRA-U | registry |  |
| fac-delta-12 | /registry/facility/delta-12 | OSC-FAC-DELTA-12 | Facility Dossier: DELTA-12 | UMBRA-U | registry |  |

### transit (15)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| transit-overview | /transit | OSC-TRN-TT-08-02 | Network Control Overview and Working Timetable No. 2 of 2008 | UMBRA-C | transit |  |
| transit-rolling-stock | /transit/rolling-stock | OSC-TRN-RS | Rolling Stock Register (Rail and Tram) | UMBRA-C | transit | T3 KESTREL; var: deputy |
| transit-engineering | /transit/engineering | OSC-TRN-ENG | Tunnel Engineering Summary: Lengths, Depths and Environmental Data | UMBRA-C | transit |  |
| transit-seg-01 | /transit/segment/01 | OSC-TRN-SEG-01 | Segment Engineering Sheet: Segment 01, ALPHA-01 to ALPHA-03 | UMBRA-C | transit |  |
| transit-seg-02 | /transit/segment/02 | OSC-TRN-SEG-02 | Segment Engineering Sheet: Segment 02, ALPHA-01 to ALPHA-02 | UMBRA-C | transit |  |
| transit-seg-03 | /transit/segment/03 | OSC-TRN-SEG-03 | Segment Engineering Sheet: Segment 03, ALPHA-02 to ALPHA-04 | UMBRA-C | transit |  |
| transit-seg-04 | /transit/segment/04 | OSC-TRN-SEG-04 | Segment Engineering Sheet: Segment 04, ALPHA-02 to ALPHA-05 (Commissioning Sheet) | UMBRA-C | transit | var: deputy |
| transit-seg-05 | /transit/segment/05 | OSC-TRN-SEG-05 | Segment Engineering Sheet: Segment 05, ALPHA-03 to ALPHA-05 | UMBRA-C | transit |  |
| transit-seg-06 | /transit/segment/06 | OSC-TRN-SEG-06 | Segment Engineering Sheet: Segment 06, ALPHA-01 to ALPHA-05 | UMBRA-C | transit |  |
| transit-net-eas | /transit/network/eas | OSC-TRN-NET-EAS | Network Sheet: Eastern Network (hub ALPHA-01) | UMBRA-C | transit |  |
| transit-net-sou | /transit/network/sou | OSC-TRN-NET-SOU | Network Sheet: Southern Network (hub ALPHA-05) | UMBRA-C | transit |  |
| transit-net-mtw | /transit/network/mtw | OSC-TRN-NET-MTW | Network Sheet: Mountain/Western Network (hub ALPHA-02 and ALPHA-04) | UMBRA-C | transit |  |
| transit-net-cen | /transit/network/cen | OSC-TRN-NET-CEN | Network Sheet: Central Network (hub ALPHA-03) | UMBRA-C | transit |  |
| transit-incident-08-017 | /transit/incident/08-017 | OSC-TRN-INC-08-017 | Incident Log Entry 08-017: Track Circuit Occupancy, Segment 04, No Consist Booked | UMBRA-C | transit | var: auditor |
| transit-possession-08-044 | /transit/possession/08-044 | OSC-TRN-POS-08-044 | Possession 08-044: Segment 04, Portal Seal Walk-Down (with Possession Register, MAY 2008) | UMBRA-C | transit | var: auditor, deputy |

### personnel (21)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| personnel-overview | /personnel | OSC-PER-IDX | Personnel Strength Summary as at Pay Run 30 APR 2008 | UMBRA-C | personnel |  |
| personnel-tier-1 | /personnel/tier/1 | OSC-PER-T1 | Tier 1: Core Council | UMBRA-U | personnel |  |
| personnel-tier-2 | /personnel/tier/2 | OSC-PER-T2 | Tier 2: Facility Command Staff | UMBRA-C | personnel | var: deputy |
| personnel-tier-3 | /personnel/tier/3 | OSC-PER-T3 | Tier 3: Specialized Personnel | TSSCI-OSC | personnel |  |
| personnel-tier-4 | /personnel/tier/4 | OSC-PER-T4 | Tier 4: Essential Support | TSSCI-OSC | personnel | t4; var: lifesupport |
| personnel-ratio | /personnel/ratio | OSC-PER-RATIO | Standard Facility Personnel Ratios (ALPHA-01 Model, 4,500 Capacity) | TSSCI-OSC | personnel |  |
| personnel-directory | /personnel/directory | OSC-PER-DIR | Personnel Directory | UMBRA-C | personnel |  |
| personnel-phase-1 | /personnel/phase/1 | OSC-PER-PH1 | Recruitment Phase 1: Foundation (2001–2003) | TSSCI-OSC | personnel |  |
| personnel-phase-2 | /personnel/phase/2 | OSC-PER-PH2 | Recruitment Phase 2: Infrastructure Build (2004–2006) | TSSCI-OSC | personnel |  |
| personnel-phase-3 | /personnel/phase/3 | OSC-PER-PH3 | Recruitment Phase 3: Network Integration (2007–2008) | TSSCI-OSC | personnel |  |
| personnel-phase-4 | /personnel/phase/4 | OSC-PER-PH4 | Recruitment Phase 4: Full Operational Capability (2009–2012) | TSSCI-OSC | personnel |  |
| personnel-phase-5 | /personnel/phase/5 | OSC-PER-PH5 | Recruitment Phase 5: Strategic Depth (2013–2020) | TSSCI-OSC | personnel |  |
| personnel-vetting | /personnel/vetting | OSC-PER-VET | Vetting: OSC Supplement to the Enhanced SSBI | UMBRA-C | personnel |  |
| personnel-transfer | /personnel/transfer | OSC-PER-TRF | Facility Transfers and Probationary Periods | TSSCI-OSC | personnel |  |
| personnel-org | /personnel/org | OSC-PER-ORG | Organisation Chart: Council, Divisions and Facility Commands | UMBRA-C | personnel |  |
| personnel-branch-ops | /personnel/branch/ops | OSC-PER-BR-OPS | Functional Branch: Command, Intelligence and Military Operations | TSSCI-OSC | personnel |  |
| personnel-branch-sec | /personnel/branch/sec | OSC-PER-BR-SEC | Functional Branch: Security Forces | TSSCI-OSC | personnel |  |
| personnel-branch-tec | /personnel/branch/tec | OSC-PER-BR-TEC | Functional Branch: Technical, Engineering and Communications | TSSCI-OSC | personnel |  |
| personnel-branch-sup | /personnel/branch/sup | OSC-PER-BR-SUP | Functional Branch: Medical, Logistics and Facility Support | TSSCI-OSC | personnel |  |
| personnel-mem-08-0187 | /personnel/memo/mem-08-0187 | OSC-MEM-08-0187 | Reconciliation of April 2008 Pay Run to Facility Strength Returns (Query PV-Q-08-0031) | TSSCI-OSC | records | var: auditor |
| personnel-mem-08-0203 | /personnel/memo/mem-08-0203 | OSC-MEM-08-0203 | Query PV-Q-08-0031: Closure | TSSCI-OSC | records | var: deputy |

### council (25)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| council-charter-i | /council/charter/i | OSC-CNL-CHR-I | Council Charter, Article I: Purpose | UMBRA-R | records |  |
| council-charter-ii | /council/charter/ii | OSC-CNL-CHR-II | Council Charter, Article II: Membership and Succession | UMBRA-R | records |  |
| council-charter-iii | /council/charter/iii | OSC-CNL-CHR-III | Council Charter, Article III: Authority and Revision | UMBRA-C | records | T3 QUARRY |
| council-charter-iv | /council/charter/iv | OSC-CNL-CHR-IV | Council Charter, Article IV: Facilities and Custody | UMBRA-C | records | T3 QUARRY |
| council-charter-v | /council/charter/v | OSC-CNL-CHR-V | Council Charter, Article V: Personnel and Compartmentation | UMBRA-R | records |  |
| council-charter-vi | /council/charter/vi | OSC-CNL-CHR-VI | Council Charter, Article VI: Reconstitution | UMBRA-C | records | T3 QUARRY |
| council-charter-vii | /council/charter/vii | OSC-CNL-CHR-VII | Council Charter, Article VII: Secrecy and Records | UMBRA-R | records |  |
| council-composition | /council/composition | OSC-CNL-SEAT-00 | Council Composition and Register of Distribution Copies | UMBRA-R | records |  |
| council-seat-01 | /council/seat/01 | OSC-CNL-SEAT-01 | Council Seat 01: Cabinet-level | UMBRA-R | records |  |
| council-seat-02 | /council/seat/02 | OSC-CNL-SEAT-02 | Council Seat 02: Cabinet-level | UMBRA-R | records |  |
| council-seat-03 | /council/seat/03 | OSC-CNL-SEAT-03 | Council Seat 03: Cabinet-level | UMBRA-R | records |  |
| council-seat-04 | /council/seat/04 | OSC-CNL-SEAT-04 | Council Seat 04: Cabinet-level | UMBRA-R | records |  |
| council-seat-05 | /council/seat/05 | OSC-CNL-SEAT-05 | Council Seat 05: Agency director | UMBRA-R | records |  |
| council-seat-06 | /council/seat/06 | OSC-CNL-SEAT-06 | Council Seat 06: Agency director | UMBRA-R | records |  |
| council-seat-07 | /council/seat/07 | OSC-CNL-SEAT-07 | Council Seat 07: Agency director | UMBRA-R | records | var: auditor |
| council-seat-08 | /council/seat/08 | OSC-CNL-SEAT-08 | Council Seat 08: Senior military | UMBRA-R | records |  |
| council-seat-09 | /council/seat/09 | OSC-CNL-SEAT-09 | Council Seat 09: Senior military | UMBRA-R | records |  |
| council-seat-10 | /council/seat/10 | OSC-CNL-SEAT-10 | Council Seat 10: Defense industry | UMBRA-R | records |  |
| council-seat-11 | /council/seat/11 | OSC-CNL-SEAT-11 | Council Seat 11: Defense industry | UMBRA-R | records |  |
| council-minutes-06-04 | /council/minutes/06-04 | OSC-CNL-MIN-06-04 | Minutes of the Council, Session 4 of 2006 | UMBRA-C | records |  |
| council-minutes-07-03 | /council/minutes/07-03 | OSC-CNL-MIN-07-03 | Minutes of the Council, Session 3 of 2007 | UMBRA-C | records | var: auditor |
| council-minutes-07-06 | /council/minutes/07-06 | OSC-CNL-MIN-07-06 | Minutes of the Council, Session 6 of 2007 | UMBRA-C | records |  |
| council-minutes-08-01 | /council/minutes/08-01 | OSC-CNL-MIN-08-01 | Minutes of the Council, Session 1 of 2008 | UMBRA-C | records |  |
| council-minutes-08-02 | /council/minutes/08-02 | OSC-CNL-MIN-08-02 | Minutes of the Council, Session 2 of 2008 | UMBRA-C | records |  |
| council-inventory-scan | /council/records/osc-2008-q2 | OSC-2008-Q2 | Facility Inventory and Logistics Network, Revision 2008-Q2 (Scanned Image, Partial) | UMBRA-EO | records | var: auditor |

### real-events (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| council-del-01-04 | /council/delegated/01-04 | OSC-CNL-DEL-01-04 | Record of a Meeting Held Under Delegated Authority, No. 4 of 2001 | UMBRA-EO | records |  |
| council-mem-01-0388 | /council/memo/mem-01-0388 | OSC-MEM-01-0388 | Legislative Record: USA PATRIOT Act (Public Law 107-56) | UMBRA-C | records |  |
| council-mem-01-0391 | /council/memo/mem-01-0391 | OSC-MEM-01-0391 | Liaison Note 01/44: Principal Desk, Week Ending 26 OCT 2001 | UMBRA-C | records |  |
| council-mem-08-0241 | /council/memo/mem-08-0241 | OSC-MEM-08-0241 | Liaison Notes, Principal Desk: File Extract, 2006 to 2008 | UMBRA-C | records |  |
| council-minutes-01-06 | /council/minutes/01-06 | OSC-CNL-MIN-01-06 | Minutes of the Council, Session 6 of 2001 (Library Extract) | UMBRA-C | records |  |
| ledger-mem-02-0284 | /ledger/memo/mem-02-0284 | OSC-MEM-02-0284 | FY2002 Supplemental Appropriations: Placement of Programme Lines in the Parent Accounts | UMBRA-C | records |  |
| assurance-cp-08 | /assurance/contingency/cp-08 | OSC-ASR-CP-08 | Contingency Register Entry: OSC-CP-08 (Closed 2001) | UMBRA-C | assurance |  |
| assurance-mem-06-0417 | /assurance/memo/mem-06-0417 | OSC-MEM-06-0417 | Published Commentary on the Events of 11 SEP 2001: Recommendation (Routed Copy, Annotated) | UMBRA-C | records |  |

### reserves (16)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| reserves-overview | /reserves | OSC-RSV-IDX | Strategic Reserves Position, MAY 2008 | UMBRA-C | reserves |  |
| reserves-food | /reserves/food | OSC-RSV-FOOD | Subsistence Reserves: Food and Water | TSSCI-OSC | reserves |  |
| reserves-medical | /reserves/medical | OSC-RSV-MED | Medical Reserves: Pharmaceuticals, Surgical Capability and Blood Products | TSSCI-OSC | reserves |  |
| reserves-energy | /reserves/energy | OSC-RSV-ENERGY | Energy Reserves: Reactor Plant, Diesel Backup and Surface Renewables | UMBRA-C | reserves |  |
| reserves-arms | /reserves/arms | OSC-RSV-ARMS | Armaments Reserve | UMBRA-C | reserves | T2 |
| reserves-seed | /reserves/seed-vault | OSC-RSV-SEED | Agricultural Seed Collection, ALPHA-03 (Catalogue) | TSSCI-OSC | reserves |  |
| reserves-gene | /reserves/genetic-vault | OSC-RSV-GENE | Biological Sample Collection, ALPHA-03 (Catalogue) | UMBRA-C | reserves |  |
| reserves-rx-a01 | /reserves/reactor/rx-a01 | OSC-RSV-RX-A01 | Reactor Status: RX-A01, HCPU-60 Unit 1 | UMBRA-C | reserves |  |
| reserves-rx-a02 | /reserves/reactor/rx-a02 | OSC-RSV-RX-A02 | Reactor Status: RX-A02, HCPU-45 Unit 1 | UMBRA-C | reserves |  |
| reserves-rx-a03 | /reserves/reactor/rx-a03 | OSC-RSV-RX-A03 | Reactor Status: RX-A03, HCPU-36 Unit 1 | UMBRA-C | reserves |  |
| reserves-rx-a04 | /reserves/reactor/rx-a04 | OSC-RSV-RX-A04 | Reactor Status: RX-A04, HCPU-36 Unit 2 | UMBRA-C | reserves |  |
| reserves-rx-a05 | /reserves/reactor/rx-a05 | OSC-RSV-RX-A05 | Reactor Status: RX-A05, HCPU-45 Unit 2 | UMBRA-C | reserves |  |
| reserves-rx-b03 | /reserves/reactor/rx-b03 | OSC-RSV-RX-B03 | Reactor Status: RX-B03, RCPU-20 Unit 1 | UMBRA-C | reserves |  |
| reserves-rx-b08 | /reserves/reactor/rx-b08 | OSC-RSV-RX-B08 | Reactor Status: RX-B08, RCPU-16 Unit 1 | UMBRA-C | reserves |  |
| reserves-rx-b09 | /reserves/reactor/rx-b09 | OSC-RSV-RX-B09 | Reactor Status: RX-B09, RCPU-20 Unit 2 | UMBRA-C | reserves |  |
| reserves-mem-07-0612 | /reserves/memo/mem-07-0612 | OSC-MEM-07-0612 | Basis of Reserve Figures: Sustained Capacity and Surge Berthing | TSSCI-OSC | records |  |

### ledger (20)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| ledger-overview | /ledger | OSC-LDG-IDX | Programme Accounts Summary, FY2001 to FY2008 | UMBRA-C | ledger |  |
| ledger-cat-facility | /ledger/category/facility | OSC-LDG-CAT-FACILITY | Programme Category: Facility Construction | UMBRA-C | ledger |  |
| ledger-cat-transit | /ledger/category/transit | OSC-LDG-CAT-TRANSIT | Programme Category: Transit Network | UMBRA-C | ledger |  |
| ledger-cat-equipment | /ledger/category/equipment | OSC-LDG-CAT-EQUIPMENT | Programme Category: Equipment & Systems | UMBRA-C | ledger |  |
| ledger-cat-personnel | /ledger/category/personnel | OSC-LDG-CAT-PERSONNEL | Programme Category: Personnel Costs | UMBRA-C | ledger |  |
| ledger-cat-reserves | /ledger/category/reserves | OSC-LDG-CAT-RESERVES | Programme Category: Strategic Reserves | UMBRA-C | ledger |  |
| ledger-src-black | /ledger/source/black | OSC-LDG-SRC-BLACK | Funding Source: "Black budget" intelligence programs | UMBRA-C | ledger |  |
| ledger-src-dod | /ledger/source/dod | OSC-LDG-SRC-DOD | Funding Source: DOD infrastructure appropriations | UMBRA-C | ledger |  |
| ledger-src-fema | /ledger/source/fema | OSC-LDG-SRC-FEMA | Funding Source: FEMA emergency preparedness | UMBRA-C | ledger |  |
| ledger-src-doe | /ledger/source/doe | OSC-LDG-SRC-DOE | Funding Source: DOE site management | UMBRA-C | ledger |  |
| ledger-src-misc | /ledger/source/misc | OSC-LDG-SRC-MISC | Funding Source: Miscellaneous / reclassified | UMBRA-C | ledger |  |
| ledger-register | /ledger/register | OSC-LDG-REG | Register of Programme Line Items (LI-001 to LI-127) | UMBRA-C | ledger |  |
| ledger-fy-01 | /ledger/fy/2001 | OSC-LDG-FY01 | Programme Accounts: Fiscal Years 2001 and 2002 | UMBRA-C | ledger |  |
| ledger-fy-03 | /ledger/fy/2003 | OSC-LDG-FY03 | Programme Accounts: Fiscal Year 2003 | UMBRA-C | ledger |  |
| ledger-fy-04 | /ledger/fy/2004 | OSC-LDG-FY04 | Programme Accounts: Fiscal Year 2004 | UMBRA-C | ledger |  |
| ledger-fy-05 | /ledger/fy/2005 | OSC-LDG-FY05 | Programme Accounts: Fiscal Year 2005 | UMBRA-C | ledger |  |
| ledger-fy-06 | /ledger/fy/2006 | OSC-LDG-FY06 | Programme Accounts: Fiscal Year 2006 | UMBRA-C | ledger |  |
| ledger-fy-07 | /ledger/fy/2007 | OSC-LDG-FY07 | Programme Accounts: Fiscal Year 2007 | UMBRA-C | ledger |  |
| ledger-fy-08 | /ledger/fy/2008 | OSC-LDG-FY08 | Programme Accounts: Fiscal Year 2008 (to date) | UMBRA-C | ledger |  |
| ledger-mem-07-0944 | /ledger/memo/mem-07-0944 | OSC-MEM-07-0944 | Segment and Network Engineering Lengths for FY2008 Cost Tables (Routed Copy, Annotated) | UMBRA-C | records | var: deputy |

### assurance (13)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| assurance-threat-01 | /assurance/threat/01 | OSC-ASR-THR-01 | Threat Register Entry 01: Nuclear Exchange | UMBRA-C | assurance |  |
| assurance-threat-02 | /assurance/threat/02 | OSC-ASR-THR-02 | Threat Register Entry 02: Biological / Chemical | UMBRA-C | assurance |  |
| assurance-threat-03 | /assurance/threat/03 | OSC-ASR-THR-03 | Threat Register Entry 03: Conventional Military | UMBRA-C | assurance |  |
| assurance-threat-04 | /assurance/threat/04 | OSC-ASR-THR-04 | Threat Register Entry 04: Outside Agency Discovery | UMBRA-C | assurance | var: auditor |
| assurance-threat-05 | /assurance/threat/05 | OSC-ASR-THR-05 | Threat Register Entry 05: Congressional Investigation | UMBRA-C | assurance |  |
| assurance-threat-06 | /assurance/threat/06 | OSC-ASR-THR-06 | Threat Register Entry 06: Whistleblowers | UMBRA-C | assurance |  |
| assurance-threat-07 | /assurance/threat/07 | OSC-ASR-THR-07 | Threat Register Entry 07: Media Exposure | UMBRA-C | assurance |  |
| assurance-psec | /assurance/personnel-security | OSC-ASR-PSEC | Personnel Security Protocols | UMBRA-C | assurance |  |
| assurance-comm | /assurance/communications | OSC-ASR-COMM | Communications Security Protocols | UMBRA-C | assurance |  |
| assurance-cg | /assurance/classification-guide | OSC-ASR-CG | Classification Guide and Withholding Authorities | TSSCI-OSC | assurance |  |
| assurance-cov | /assurance/cover-catalogue | OSC-ASR-COV | Cover Identity Catalogue (ALPHA and BETA) | UMBRA-C | assurance |  |
| assurance-ctr | /assurance/contractor-register | OSC-ASR-CTR | Contractor Register and Construction Security Protocols | UMBRA-C | assurance |  |
| assurance-oia-08-031 | /assurance/incident/oia-08-031 | OIA-08-031 | Security Incident OIA-08-031: Electronic Image of Council Record Found on Accession RD-ACC-08-00412 | UMBRA-C | records | var: auditor |

### directives-1 (12)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| dir-0107 | /directives/dir-0107 | OSC-DIR-0107 | Space and Parking Allocation at ALPHA-Class Facilities | TSSCI-OSC | directives |  |
| dir-0115 | /directives/dir-0115 | OSC-DIR-0115 | Badges, Access Rosters and the Lost Badge Procedure | TSSCI-OSC | directives | t4 |
| dir-0128 | /directives/dir-0128 | OSC-DIR-0128 | Air Handling: Filter Change Cycles and Seal-Capable Zones | TSSCI-OSC | directives | t4; var: lifesupport |
| dir-0141 | /directives/dir-0141 | OSC-DIR-0141 | Food Service: Cafeteria Rotation, Dining Hours and Special Diets | TSSCI-OSC | directives | t4 |
| dir-0156 | /directives/dir-0156 | OSC-DIR-0156 | Fire Safety, Drills and Refuge Chambers | TSSCI-OSC | directives | t4; var: lifesupport |
| dir-0163 | /directives/dir-0163 | OSC-DIR-0163 | Visitor Control and Escort | TSSCI-OSC | directives | t4 |
| dir-0177 | /directives/dir-0177 | OSC-DIR-0177 | Clean Desk, Burn Bags and Classified Waste | TSSCI-OSC | directives | t4 |
| dir-0189 | /directives/dir-0189 | OSC-DIR-0189 | Leave, Federal Holidays and Minimum Manning | TSSCI-OSC | directives | t4; var: lifesupport |
| dir-0204 | /directives/dir-0204 | OSC-DIR-0204 | Medical Readiness Standard | TSSCI-OSC | directives | t4 |
| dir-0216 | /directives/dir-0216 | OSC-DIR-0216 | Dosimetry | TSSCI-OSC | directives |  |
| dir-0233 | /directives/dir-0233 | OSC-DIR-0233 | Personnel Strength Accounting and Pay Status | TSSCI-OSC | directives | var: deputy |
| dir-0247 | /directives/dir-0247 | OSC-DIR-0247 | Probationary Transfer and Interim Review | TSSCI-OSC | directives |  |

### directives-2 (12)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| dir-0262 | /directives/dir-0262 | OSC-DIR-0262 | Passenger Travel by Rail and Tram | TSSCI-OSC | directives | t4 |
| dir-0288 | /directives/dir-0288 | OSC-DIR-0288 | Training Compliance and the Annual Security Refresher | TSSCI-OSC | directives | t4 |
| dir-0301 | /directives/dir-0301 | OSC-DIR-0301 | MERIDIAN Workstation Use and Accreditation | TSSCI-OSC | directives | t4 |
| dir-0319 | /directives/dir-0319 | OSC-DIR-0319 | Print Release and Reproduction of Records | TSSCI-OSC | directives | t4 |
| dir-0336 | /directives/dir-0336 | OSC-DIR-0336 | Records Accession, Custody and Chain-of-Custody Tracing | TSSCI-OSC | directives |  |
| dir-0354 | /directives/dir-0354 | OSC-DIR-0354 | Records Retention and Destruction | TSSCI-OSC | directives |  |
| dir-0378 | /directives/dir-0378 | OSC-DIR-0378 | Security Incidents, Self-Reporting and Inquiries | TSSCI-OSC | directives | t4; var: auditor |
| dir-0395 | /directives/dir-0395 | OSC-DIR-0395 | Acting Credentials and Temporary Elevation | TSSCI-OSC | directives | var: deputy |
| dir-0412 | /directives/dir-0412 | OSC-DIR-0412 | Compartment Briefing Requirement and Handling of Compartmented Records | TSSCI-OSC | directives | t4 |
| dir-0447 | /directives/dir-0447 | OSC-DIR-0447 | Telephones, Mail Addressing and the Key Distribution Network | TSSCI-OSC | directives | t4 |
| dir-0480 | /directives/dir-0480 | OSC-DIR-0480 | Tobacco Use Below Grade | TSSCI-OSC | directives | t4 |
| dir-0519 | /directives/dir-0519 | OSC-DIR-0519 | Personal Notes, Notebooks and Private Records | TSSCI-OSC | directives | t4 |

### forms (12)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| f-104 | /forms/f-104 | OSC-F-104 | Leave Request | TSSCI-OSC | forms | t4; var: lifesupport |
| f-109 | /forms/f-109 | OSC-F-109 | Travel Authorization (Rail and Tram Passenger) | TSSCI-OSC | forms |  |
| f-114 | /forms/f-114 | OSC-F-114 | Security Incident Report | TSSCI-OSC | forms | t4; var: lifesupport |
| f-118 | /forms/f-118 | OSC-F-118 | Visitor Escort Request | TSSCI-OSC | forms | t4; var: deputy |
| f-122 | /forms/f-122 | OSC-F-122 | Facility Transfer Request | TSSCI-OSC | forms |  |
| f-126 | /forms/f-126 | OSC-F-126 | Compartment Access Request | TSSCI-OSC | forms | var: deputy |
| f-131 | /forms/f-131 | OSC-F-131 | Unposted Status Declaration | TSSCI-OSC | forms | var: deputy |
| f-137 | /forms/f-137 | OSC-F-137 | Records Destruction Certificate | TSSCI-OSC | forms |  |
| f-142 | /forms/f-142 | OSC-F-142 | Document Reproduction Request | TSSCI-OSC | forms |  |
| f-145 | /forms/f-145 | OSC-F-145 | Equipment Issue | TSSCI-OSC | forms | t4 |
| f-152 | /forms/f-152 | OSC-F-152 | Medical Readiness Certification | TSSCI-OSC | forms | t4 |
| f-160 | /forms/f-160 | OSC-F-160 | Security Violation Self-Report | TSSCI-OSC | forms | var: auditor |

### mail-1 (15)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04102 | /mail/msg-08-04102 | MSG-08-04102 | Welcome to Accessions and Review Branch | TSSCI-OSC | mail |  |
| msg-08-04106 | /mail/msg-08-04106 | MSG-08-04106 | MERIDIAN Account Issued: OPR-A03-1147 | TSSCI-OSC | mail |  |
| msg-08-04131 | /mail/msg-08-04131 | MSG-08-04131 | LANTERN Briefing (OSC-CB-010): Acknowledgement Recorded | TSSCI-OSC | mail |  |
| msg-08-04298 | /mail/msg-08-04298 | MSG-08-04298 | ALPHA-03 Parking Allocation, Quarter 3 | TSSCI-OSC | mail |  |
| msg-08-04305 | /mail/msg-08-04305 | MSG-08-04305 | Level 2 Filter Change, AHU-07 to AHU-12, 05 MAY | TSSCI-OSC | mail |  |
| msg-08-04362 | /mail/msg-08-04362 | MSG-08-04362 | Memorial Day Minimum Manning, 26 MAY | TSSCI-OSC | mail |  |
| msg-08-04417 | /mail/msg-08-04417 | MSG-08-04417 | Day-30 Probationary Report Signed | TSSCI-OSC | mail |  |
| msg-08-04433 | /mail/msg-08-04433 | MSG-08-04433 | Badge Photograph Retake and Locker Reassignment | TSSCI-OSC | mail |  |
| msg-08-04459 | /mail/msg-08-04459 | MSG-08-04459 | Print Server Maintenance 16 MAY; Print Release Reminder | TSSCI-OSC | mail |  |
| msg-08-04470 | /mail/msg-08-04470 | MSG-08-04470 | Tasking: Stacks C Accession Review | TSSCI-OSC | mail |  |
| msg-08-04471 | /mail/msg-08-04471 | MSG-08-04471 | Annual Security Refresher: Overdue | TSSCI-OSC | mail |  |
| msg-08-04472 | /mail/msg-08-04472 | MSG-08-04472 | Level 3 Dining: Cycle 4 of 6, Week 3 Menu | TSSCI-OSC | mail |  |
| msg-08-04473 | /mail/msg-08-04473 | OSC-CBL-08-01173 | File Copy for Accession: Cable OSC-CBL-08-01173 (Possession, Segment 04) | UMBRA-C | mail |  |
| msg-08-04474 | /mail/msg-08-04474 | OSC-CBL-08-01208 | File Copy for Accession: Cable OSC-CBL-08-01208 (RX-B08 Startup Testing) | UMBRA-C | mail |  |
| msg-08-04496 | /mail/msg-08-04496 | MSG-08-04496 | Re: Your Enquiry (Strength Accounting) | TSSCI-OSC | mail |  |

### mail-2 (15)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04480 | /mail/msg-08-04480 | MSG-08-04480 | BRIAR Briefing (OSC-CB-015) | UMBRA-C | mail |  |
| msg-08-04481 | /mail/msg-08-04481 | MSG-08-04481 | HOLLOW Briefing (OSC-CB-012) | UMBRA-C | mail |  |
| msg-08-04482 | /mail/msg-08-04482 | MSG-08-04482 | KESTREL Briefing (OSC-CB-011) | UMBRA-C | mail |  |
| msg-08-04483 | /mail/msg-08-04483 | MSG-08-04483 | SEXTANT Briefing (OSC-CB-013) | UMBRA-C | mail |  |
| msg-08-04484 | /mail/msg-08-04484 | MSG-08-04484 | TALLOW Briefing (OSC-CB-014) | UMBRA-C | mail |  |
| msg-08-04485 | /mail/msg-08-04485 | MSG-08-04485 | QUARRY Briefing (OSC-CB-016) | UMBRA-C | mail |  |
| msg-08-04486 | /mail/msg-08-04486 | MSG-08-04486 | Interim Review: Acting Designation | TSSCI-OSC | mail |  |
| msg-08-04487 | /mail/msg-08-04487 | MSG-08-04487 | Acting Designation: Tier 2 (Records), Effective on Receipt | UMBRA-C | mail |  |
| msg-08-04490 | /mail/msg-08-04490 | MSG-08-04490 | Record of Access: OSC-2008-Q2 | TSSCI-OSC | mail |  |
| msg-08-04491 | /mail/msg-08-04491 | MSG-08-04491 | Search Activity | TSSCI-OSC | mail |  |
| msg-08-04492 | /mail/msg-08-04492 | MSG-08-04492 | Pattern of Access to Withheld Material | TSSCI-OSC | mail |  |
| msg-08-04493 | /mail/msg-08-04493 | MSG-08-04493 | Display of Network Control Board | TSSCI-OSC | mail |  |
| msg-08-04494 | /mail/msg-08-04494 | MSG-08-04494 | Reproduction of Records | TSSCI-OSC | mail |  |
| msg-08-04495 | /mail/msg-08-04495 | MSG-08-04495 | Terminal Activity | TSSCI-OSC | mail |  |
| msg-08-04497 | /mail/msg-08-04497 | MSG-08-04497 | Non-Delivery Notice | TSSCI-OSC | mail |  |

### accounts-mail (23)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04341 | /mail/msg-08-04341 | MSG-08-04341 | Certifying Officer: ALPHA-03 Requests Routed to You | TSSCI-OSC | mail |  |
| msg-08-04356 | /mail/msg-08-04356 | MSG-08-04356 | Training: Interview Read-In Refresher, 23 MAY | TSSCI-OSC | mail |  |
| msg-08-04371 | /mail/msg-08-04371 | MSG-08-04371 | Medical Readiness Appointments, 21 MAY | TSSCI-OSC | mail | t4 |
| msg-08-04398 | /mail/msg-08-04398 | MSG-08-04398 | Possession 08-044: Escort Detail, 13 MAY | UMBRA-C | mail |  |
| msg-08-04401 | /mail/msg-08-04401 | MSG-08-04401 | Quarterly Register Return: Suspense 30 MAY | TSSCI-OSC | mail |  |
| msg-08-04404 | /mail/msg-08-04404 | MSG-08-04404 | Tram Portal Door G08-BD3: Closed and Held, 13 MAY | TSSCI-OSC | mail | t4 |
| msg-08-04411 | /mail/msg-08-04411 | MSG-08-04411 | Surface Lot B Resurfacing and Shuttle Times | TSSCI-OSC | mail |  |
| msg-08-04423 | /mail/msg-08-04423 | MSG-08-04423 | Filter Bank A Change Withdrawn; Bank B Sample 22 MAY | TSSCI-OSC | mail | t4 |
| msg-08-04427 | /mail/msg-08-04427 | MSG-08-04427 | Annex Lot Permits, Quarter 3 | TSSCI-OSC | mail |  |
| msg-08-04446 | /mail/msg-08-04446 | MSG-08-04446 | Environmental Watch Rota, Week of 19 MAY | TSSCI-OSC | mail | t4 |
| msg-08-04463 | /mail/msg-08-04463 | MSG-08-04463 | Command Section: Week of 19 MAY | TSSCI-OSC | mail |  |
| msg-08-04466 | /mail/msg-08-04466 | MSG-08-04466 | HVAC Shop Schedule, Week of 19 MAY | TSSCI-OSC | mail |  |
| msg-08-04468 | /mail/msg-08-04468 | MSG-08-04468 | Second Reviews Assigned | UMBRA-C | mail |  |
| msg-08-04477 | /mail/msg-08-04477 | MSG-08-04477 | OIA-08-031: For Your Second Review | UMBRA-C | mail |  |
| msg-08-06105 | /mail/msg-08-06105 | MSG-08-06105 | Seal Drill: Plant Room Posts | TSSCI-OSC | mail | t4 |
| msg-08-06106 | /mail/msg-08-06106 | MSG-08-06106 | Door Log Page 14: Countersignature Needed | TSSCI-OSC | mail | t4 |
| msg-08-06206 | /mail/msg-08-06206 | MSG-08-06206 | Request in Your Queue: OSC-F-126 from ALPHA-03 | TSSCI-OSC | mail |  |
| msg-08-06207 | /mail/msg-08-06207 | MSG-08-06207 | RE: Possession 08-044: Overrun | UMBRA-C | mail |  |
| msg-08-06208 | /mail/msg-08-06208 | MSG-08-06208 | OIA Request: ALPHA-02 Status Declarations, 2007 | TSSCI-OSC | mail |  |
| msg-08-06209 | /mail/msg-08-06209 | MSG-08-06209 | Memorial Day: Hub Deputies Net Call | TSSCI-OSC | mail |  |
| msg-08-06306 | /mail/msg-08-06306 | MSG-08-06306 | SD-08-1187: Archived Profile, A03-5-114 | TSSCI-OSC | mail |  |
| msg-08-06307 | /mail/msg-08-06307 | MSG-08-06307 | Your Request of 13 MAY: Register Comparison | UMBRA-C | mail |  |
| msg-08-06308 | /mail/msg-08-06308 | MSG-08-06308 | Declarations Held in Pay & Strength Accounting | TSSCI-OSC | mail |  |

### cctv (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05881 | /mail/msg-08-05881 | MSG-08-05881 | Video Still Printed at Workstation | TSSCI-OSC | mail |  |
| msg-08-05882 | /mail/msg-08-05882 | MSG-08-05882 | Refused Requests for Security Video | TSSCI-OSC | mail |  |
| msg-08-05883 | /mail/msg-08-05883 | MSG-08-05883 | Camera Moved from Workstation | TSSCI-OSC | mail |  |
| msg-08-05884 | /mail/msg-08-05884 | MSG-08-05884 | Camera Moved from Workstation | TSSCI-OSC | mail | t4 |
| msg-08-05885 | /mail/msg-08-05885 | MSG-08-05885 | Video Still Printed at Workstation | TSSCI-OSC | mail | t4 |
| msg-08-05886 | /mail/msg-08-05886 | MSG-08-05886 | Recording Suspended, Platform 3 and Platform 7 Cameras | TSSCI-OSC | mail |  |
| cctv-viewing-rules | /cctv/viewing-rules | OSC-DIR-0474 | Viewing of Facility Security Video at MERIDIAN Workstations | TSSCI-OSC | cctv |  |
| cctv-operating-instructions | /cctv/operating-instructions | KB-0216 | Using the Facility Video Client | TSSCI-OSC | cctv | t4 |

### dispatch (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04761 | /mail/msg-08-04761 | MSG-08-04761 | Dispatch Log Query | UMBRA-C | mail |  |
| msg-08-04762 | /mail/msg-08-04762 | MSG-08-04762 | Route Refused at Desk: Conflicting Movement | UMBRA-C | mail |  |
| msg-08-04763 | /mail/msg-08-04763 | MSG-08-04763 | Movement Held: Network Isolation | UMBRA-C | mail |  |
| msg-08-04764 | /mail/msg-08-04764 | MSG-08-04764 | Movement Under Instruction | UMBRA-C | mail |  |
| msg-08-04765 | /mail/msg-08-04765 | MSG-08-04765 | Dispatcher Qualification | UMBRA-R | mail |  |
| dispatch-platform-notice | /dispatch/platform-notice | OSC-TRN-DSP-03 | Tram Platform Indicator: Notice to Platform Users | UMBRA-R | dispatch | T4; t4 |
| dispatch-procedure | /dispatch/procedure | OSC-TRN-DSP-01 | Dispatcher Workstation, Transit Control Desks: Operating Procedure | UMBRA-C | dispatch | T3 |
| dispatch-reference | /dispatch/reference | OSC-TRN-DSP-02 | Route and Signal Reference Sheet, Transit Control Desk ALPHA-02 | UMBRA-C | dispatch | T3 |

### doors (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04651 | /mail/msg-08-04651 | MSG-08-04651 | Door Override Recorded | TSSCI-OSC | mail | t4 |
| msg-08-04652 | /mail/msg-08-04652 | MSG-08-04652 | Door Override Report | TSSCI-OSC | mail |  |
| msg-08-04653 | /mail/msg-08-04653 | MSG-08-04653 | Interlock Bypass Switch Operated Without Key | TSSCI-OSC | mail | t4 |
| msg-08-04654 | /mail/msg-08-04654 | MSG-08-04654 | Repeated Interlock Bypass Attempts | TSSCI-OSC | mail |  |
| msg-08-04655 | /mail/msg-08-04655 | MSG-08-04655 | Door Open at Watch Change | TSSCI-OSC | mail | t4 |
| msg-08-04656 | /mail/msg-08-04656 | MSG-08-04656 | Door Record Request | TSSCI-OSC | mail | t4 |
| doors-airlock-card | /doors/airlock-reference-card | OSC-MEM-08-0147 | Personnel Airlock Cycle and Decontamination: Reference Card | UMBRA-R | doors | t4 |
| doors-operating-procedure | /doors/operating-procedure | OSC-MEM-08-0146 | Door and Airlock Control Board: Operating Procedure | UMBRA-R | doors | t4 |

### drill (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05301 | /mail/msg-08-05301 | MSG-08-05301 | Seal Drill Report | UMBRA-R | mail |  |
| msg-08-05302 | /mail/msg-08-05302 | MSG-08-05302 | Seal Drill: Sites Carried as NO REPORT | UMBRA-R | mail |  |
| msg-08-05303 | /mail/msg-08-05303 | MSG-08-05303 | Query on Drill Relay Traffic: Acknowledgement Time | UMBRA-R | mail |  |
| msg-08-05304 | /mail/msg-08-05304 | MSG-08-05304 | Seal Drill Order Attempted from Your Workstation | UMBRA-R | mail |  |
| msg-08-05305 | /mail/msg-08-05305 | MSG-08-05305 | OIA Observation of Network Seal Drill | UMBRA-R | mail |  |
| msg-08-05306 | /mail/msg-08-05306 | MSG-08-05306 | Seal Drill Held Without an OIA Observer | UMBRA-R | mail |  |
| drill-procedure | /drill/procedure | OSC-DIR-0433 | Network Seal Drill: Order, Relay and Report | UMBRA-R | drill |  |
| drill-site-card | /drill/site-card | OSC-DIR-0434 | Annex B: Site Action Card, Seal Drill (Personnel Shelters) | UMBRA-U | drill | t4 |

### environ (6)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05611 | /mail/msg-08-05611 | MSG-08-05611 | CO2 Excursion Recorded | UMBRA-R | mail | t4 |
| msg-08-05612 | /mail/msg-08-05612 | MSG-08-05612 | Filter Change Overdue | UMBRA-R | mail | t4 |
| msg-08-05613 | /mail/msg-08-05613 | MSG-08-05613 | Seal Override on ECP-G08-1 | UMBRA-R | mail | t4 |
| msg-08-05614 | /mail/msg-08-05614 | MSG-08-05614 | Re: Handover Log, CO2 Load Balance | UMBRA-R | mail | t4 |
| env-g08-data | /environ/data-sheet | OSC-MEM-08-0171 | Air Revitalization Plant, GAMMA-08: Data Sheet | UMBRA-R | environ | t4 |
| env-g08-sop | /environ/procedure | OSC-MEM-07-0262 | Environmental Control Panel ECP-G08-1: Operating Procedure | UMBRA-R | environ | t4 |

### hoist (10)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-06231 | /mail/msg-08-06231 | MSG-08-06231 | Call to Restricted Landing Not Registered | TSSCI-OSC | mail |  |
| msg-08-06232 | /mail/msg-08-06232 | MSG-08-06232 | Call to Restricted Landing Not Registered | TSSCI-OSC | mail |  |
| msg-08-06233 | /mail/msg-08-06233 | MSG-08-06233 | Emergency Stop Applied from Your Workstation | TSSCI-OSC | mail |  |
| msg-08-06234 | /mail/msg-08-06234 | MSG-08-06234 | Emergency Stop Applied from Your Workstation | TSSCI-OSC | mail |  |
| msg-08-06235 | /mail/msg-08-06235 | MSG-08-06235 | Emergency Stop, Statement Required | TSSCI-OSC | mail |  |
| msg-08-06236 | /mail/msg-08-06236 | MSG-08-06236 | Overload Recorded at Landing | TSSCI-OSC | mail |  |
| msg-08-06237 | /mail/msg-08-06237 | MSG-08-06237 | Position Record Amended | TSSCI-OSC | mail |  |
| msg-08-06238 | /mail/msg-08-06238 | MSG-08-06238 | Remote Emergency Stop Notified | TSSCI-OSC | mail |  |
| hoist-procedure | /hoist/procedure | OSC-DIR-0466 | Operation of Shaft Hoists at ALPHA Sites | TSSCI-OSC | hoist |  |
| hoist-shaft-data | /hoist/shaft-data | OSC-MEM-07-0851 | Hoist and Shaft Data, ALPHA Sites | UMBRA-C | hoist | T3 |

### isolate (16)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05201 | /mail/msg-08-05201 | MSG-08-05201 | Manual Initiation at Your Workstation: Statement Required | UMBRA-C | mail |  |
| msg-08-05202 | /mail/msg-08-05202 | MSG-08-05202 | Network Notice: Hub Circuits Down | TSSCI-OSC | mail |  |
| msg-08-05203 | /mail/msg-08-05203 | MSG-08-05203 | Site External Circuits Out of Service | UMBRA-U | mail |  |
| msg-08-05204 | /mail/msg-08-05204 | MSG-08-05204 | Network Notice: Second Isolation, Restoration by Certificate | TSSCI-OSC | mail |  |
| msg-08-05205 | /mail/msg-08-05205 | MSG-08-05205 | Control HS-0001: Certifying Officer for Restoration | UMBRA-R | mail |  |
| msg-08-05206 | /mail/msg-08-05206 | MSG-08-05206 | Second Initiation: Interview | UMBRA-C | mail |  |
| msg-08-05207 | /mail/msg-08-05207 | MSG-08-05207 | Finding: Operation of Control HS-0001 | UMBRA-C | mail |  |
| msg-08-05208 | /mail/msg-08-05208 | MSG-08-05208 | Review Assigned: Workstation A03-5-114 | UMBRA-C | mail |  |
| msg-08-05209 | /mail/msg-08-05209 | MSG-08-05209 | Probation: Adverse Report Entered | TSSCI-OSC | mail |  |
| msg-08-05210 | /mail/msg-08-05210 | MSG-08-05210 | Tamper Seal Broken: Control HS-0001 | UMBRA-C | mail |  |
| msg-08-05211 | /mail/msg-08-05211 | MSG-08-05211 | Network Notice: Isolation Held | TSSCI-OSC | mail |  |
| msg-08-05212 | /mail/msg-08-05212 | MSG-08-05212 | Site External Circuits: No Restoration Date | UMBRA-U | mail |  |
| msg-08-05213 | /mail/msg-08-05213 | MSG-08-05213 | Circuit Restoration Certificate Approved | TSSCI-OSC | mail |  |
| msg-08-05214 | /mail/msg-08-05214 | MSG-08-05214 | Circuit Restoration Certificate Returned | TSSCI-OSC | mail |  |
| isolate-escalation | /isolate/escalation | OSC-MEM-07-0233 | Escalation Schedule, Control HS-0001 (Network Isolation, Manual Initiate) | UMBRA-R | isolate |  |
| isolate-procedure | /isolate/procedure | OSC-DIR-0507 | Network Isolation, Manual Initiate (Control HS-0001) | UMBRA-R | isolate |  |

### muster (6)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04771 | /mail/msg-08-04771 | MSG-08-04771 | Muster Report, Personnel Unaccounted | UMBRA-R | mail |  |
| msg-08-04772 | /mail/msg-08-04772 | MSG-08-04772 | Badge Reads Not on Posted Strength | UMBRA-R | mail |  |
| msg-08-04773 | /mail/msg-08-04773 | MSG-08-04773 | Muster Close-Out Received With Discrepancies | UMBRA-R | mail |  |
| msg-08-04774 | /mail/msg-08-04774 | MSG-08-04774 | Referral, Muster Close-Out With Discrepancies | UMBRA-R | mail |  |
| muster-dir-0461 | /muster/procedure | OSC-DIR-0461 | Personnel Accountability by Badge-Reader Muster | UMBRA-R | muster |  |
| muster-kb-0316 | /muster/operator-reference | KB-0316 | Muster Board Operator Reference | UMBRA-R | muster | t4 |

### pa (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05741 | /mail/msg-08-05741 | MSG-08-05741 | Public Address Console, Zone Selection Refused | TSSCI-OSC | mail |  |
| msg-08-05742 | /mail/msg-08-05742 | MSG-08-05742 | Public Address Call to Another Site Controller | TSSCI-OSC | mail |  |
| msg-08-05743 | /mail/msg-08-05743 | MSG-08-05743 | Selective Call to a Tier 2 Level | TSSCI-OSC | mail |  |
| msg-08-05744 | /mail/msg-08-05744 | MSG-08-05744 | Tone Test Outside the Test Window | TSSCI-OSC | mail |  |
| msg-08-05745 | /mail/msg-08-05745 | MSG-08-05745 | Tones Heard Outside the Test Time | TSSCI-OSC | mail | t4 |
| msg-08-05746 | /mail/msg-08-05746 | MSG-08-05746 | Life Safety Calls on the Public Address | TSSCI-OSC | mail | t4 |
| dir-0458 | /pa/dir-0458 | OSC-DIR-0458 | Public Address and Emergency Broadcast at Staffed Facilities | TSSCI-OSC | pa |  |
| kb-0057 | /pa/kb-0057 | KB-0057 | Public Address Console, Message Library and Tone Tests | TSSCI-OSC | pa | t4 |

### patch (9)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-04931 | /mail/msg-08-04931 | MSG-08-04931 | Repatch Without Circuit Order | UMBRA-C | mail |  |
| msg-08-04932 | /mail/msg-08-04932 | MSG-08-04932 | Circuit Test Failure Report | UMBRA-C | mail |  |
| msg-08-04933 | /mail/msg-08-04933 | MSG-08-04933 | Call Record Withdrawn | UMBRA-C | mail |  |
| msg-08-04934 | /mail/msg-08-04934 | MSG-08-04934 | Repatch Without Order Reported at a Hub Bay | UMBRA-C | mail |  |
| msg-08-04935 | /mail/msg-08-04935 | MSG-08-04935 | Referral: Exchange Record Withdrawn | UMBRA-C | mail |  |
| msg-08-04936 | /mail/msg-08-04936 | MSG-08-04936 | Maintenance Circuit M1: Fault Logged | TSSCI-OSC | mail | t4 |
| patch-circuit-register | /patch/circuit-register | OSC-MEM-06-0291 | Hub Circuit Designation Register: Trunk Circuits (Revision 5) | UMBRA-C | patch |  |
| patch-maintenance-circuit | /patch/maintenance-circuit | OSC-MEM-08-0152 | Site Maintenance Circuit: Weekly Line Check and Test | TSSCI-OSC | patch | t4 |
| patch-operating-instructions | /patch/operating-instructions | OSC-MEM-07-1186 | Hub Circuit Patch Bays: Patching, Testing and Line Check Calls (Operating Instructions) | UMBRA-C | patch |  |

### plant (8)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05731 | /mail/msg-08-05731 | MSG-08-05731 | Simulator Trip Recorded | UMBRA-C | mail |  |
| msg-08-05732 | /mail/msg-08-05732 | MSG-08-05732 | Simulator Run Outside Limits | UMBRA-R | mail | t4 |
| msg-08-05733 | /mail/msg-08-05733 | MSG-08-05733 | Live Plant Display: Control Attempt Recorded | UMBRA-C | mail |  |
| msg-08-05734 | /mail/msg-08-05734 | MSG-08-05734 | Attempted Operation of RX-A02 Controls | UMBRA-C | mail |  |
| msg-08-05735 | /mail/msg-08-05735 | MSG-08-05735 | Part-Task Trainer Trip Recorded | UMBRA-R | mail | t4 |
| msg-08-05736 | /mail/msg-08-05736 | MSG-08-05736 | Simulator Trips at Your Station | UMBRA-R | mail | t4 |
| plant-sim-card | /plant/sim-card | OSC-RSV-SIM-02 | Part-Task Trainer: Quick Reference | UMBRA-R | plant | t4 |
| plant-sim-procedure | /plant/sim-procedure | OSC-RSV-SIM-01 | Part-Task Training Simulator: Operating Procedure | UMBRA-C | plant |  |

### strike (6)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| msg-08-05961 | /mail/msg-08-05961 | MSG-08-05961 | Planning Register Entry: Own Installation | UMBRA-C | mail |  |
| msg-08-05962 | /mail/msg-08-05962 | MSG-08-05962 | Review Query Raised on a Planning Register Entry | UMBRA-C | mail |  |
| msg-08-05963 | /mail/msg-08-05963 | MSG-08-05963 | PM-3 Register: Entry by an Operator on Probation | UMBRA-C | mail |  |
| msg-08-05964 | /mail/msg-08-05964 | MSG-08-05964 | PM-3 Egress Basis | UMBRA-C | mail |  |
| strike-pm-3 | /strike/pm-3 | OSC-MEM-07-0312 | Planning Model PM-3: Method and Operating Notes | UMBRA-C | strike |  |
| strike-register | /strike/register | OSC-MEM-08-0166 | PM-3 Planning Register: Entry, Withdrawal and Review | UMBRA-C | strike |  |

### help (12)

| id | route | docNo | title | marking | app | access |
|---|---|---|---|---|---|---|
| system-glossary | /system/glossary | OSC-SYS-GLO | Glossary of Terms | TSSCI-OSC | system | t4; var: lifesupport |
| system-settings | /system/settings | OSC-SYS-SET | Workstation Settings | TSSCI-OSC | system | t4 |
| system-monitor | /system/monitor | OSC-SYS-MON | System Monitor: Link States and Services | TSSCI-OSC | system |  |
| system-calendar | /system/calendar | OSC-SYS-CAL | Facility Calendar, MAY 2008 | TSSCI-OSC | system | t4; var: auditor, deputy, lifesupport |
| system-colophon | /system/colophon | OSC-SYS-COL | Colophon | TSSCI-OSC | system | t4 |
| system-about | /system/about | OSC-SYS-ABT | About This Terminal | TSSCI-OSC | system | t4; var: auditor, deputy, lifesupport |
| kb-0001 | /system/kb/kb-0001 | KB-0001 | Getting Started with MERIDIAN 4.1.7 | TSSCI-OSC | system | t4 |
| kb-0012 | /system/kb/kb-0012 | KB-0012 | Redaction Marks and Withholding Authorities | TSSCI-OSC | system | t4 |
| kb-0019 | /system/kb/kb-0019 | KB-0019 | Printing, Cover Sheets and Print Release | TSSCI-OSC | system | t4 |
| kb-0026 | /system/kb/kb-0026 | KB-0026 | Terminal: Documented Commands | TSSCI-OSC | system |  |
| kb-0031 | /system/kb/kb-0031 | KB-0031 | Looking Up Work Orders from the Workstation | TSSCI-OSC | system | var: lifesupport |
| kb-0042 | /system/kb/kb-0042 | KB-0042 | Reading the Network Control Board | TSSCI-OSC | system |  |

## Account variants (38)

| Account | Variant ids |
|---|---|
| lifesupport | system-about, system-calendar, dir-0128, dir-0156, dir-0189, f-104, f-114, fac-gamma-08, kb-0031, personnel-tier-4, registry-class-gamma, system-glossary |
| deputy | system-about, system-calendar, transit-possession-08-044, dir-0233, dir-0395, f-118, f-126, f-131, fac-alpha-02, ledger-mem-07-0944, personnel-mem-08-0203, personnel-tier-2, transit-rolling-stock, transit-seg-04 |
| auditor | assurance-oia-08-031, assurance-threat-04, council-inventory-scan, council-minutes-07-03, council-seat-07, dir-0378, f-160, personnel-mem-08-0187, system-about, system-calendar, transit-incident-08-017, transit-possession-08-044 |

## Cross-reference graph summary (pass one, 240 pages)

476 required cross-references across 240 pages; every target is a manifest docNo (or alias). Most-cited documents:

| docNo | title | inbound |
|---|---|---|
| OSC-CNL-SEAT-00 | Council Composition and Register of Distribution Copies | 22 |
| OSC-FAC-CLS-GAMMA | Facility Class Standard: GAMMA (Personnel Shelters) | 19 |
| OSC-LDG-REG | Register of Programme Line Items (LI-001 to LI-127) | 19 |
| OSC-PER-IDX | Personnel Strength Summary as at Pay Run 30 APR 2008 | 15 |
| OSC-TRN-ENG | Tunnel Engineering Summary: Lengths, Depths and Environmental Data | 15 |
| OSC-FAC-CLS-DELTA | Facility Class Standard: DELTA (Safe Houses & Caches) | 14 |
| OSC-FAC-CLS-BETA | Facility Class Standard: BETA (Regional Operations Centers) | 13 |
| OSC-ASR-CTR | Contractor Register and Construction Security Protocols | 13 |
| OSC-LDG-IDX | Programme Accounts Summary, FY2001 to FY2008 | 13 |
| OSC-TRN-NET-MTW | Network Sheet: Mountain/Western Network (hub ALPHA-02 and ALPHA-04) | 12 |
| OSC-TRN-TT-08-02 | Network Control Overview and Working Timetable No. 2 of 2008 | 12 |
| OSC-RSV-ENERGY | Energy Reserves: Reactor Plant, Diesel Backup and Surface Renewables | 11 |
| OSC-DIR-0412 | Compartment Briefing Requirement and Handling of Compartmented Records | 11 |
| OSC-TRN-NET-SOU | Network Sheet: Southern Network (hub ALPHA-05) | 10 |
| OSC-TRN-SEG-04 | Segment Engineering Sheet: Segment 04, ALPHA-02 to ALPHA-05 (Commissioning Sheet) | 10 |

Edges between families:

| from -> to | edges |
|---|---|
| registry -> registry | 55 |
| registry -> transit | 50 |
| ledger -> ledger | 36 |
| transit -> transit | 33 |
| reserves -> reserves | 31 |
| council -> council | 26 |
| personnel -> personnel | 25 |
| mail -> directives | 23 |
| registry -> assurance | 15 |
| registry -> reserves | 13 |
| directives -> forms | 12 |
| forms -> directives | 11 |
| assurance -> assurance | 10 |
| personnel -> directives | 8 |
| assurance -> directives | 8 |
| directives -> directives | 8 |
| mail -> forms | 8 |
| system -> directives | 6 |
| mail -> assurance | 5 |
| mail -> transit | 5 |
| registry -> directives | 3 |
| transit -> system | 3 |
| transit -> directives | 3 |
| personnel -> forms | 3 |
| reserves -> registry | 3 |
| reserves -> system | 3 |
| ledger -> transit | 3 |
| directives -> assurance | 3 |
| mail -> system | 3 |
| mail -> reserves | 3 |
| system -> transit | 3 |
| system -> system | 3 |
| registry -> personnel | 2 |
| transit -> registry | 2 |
| personnel -> registry | 2 |
| council -> assurance | 2 |
| reserves -> directives | 2 |
| reserves -> personnel | 2 |
| assurance -> personnel | 2 |
| assurance -> council | 2 |
| assurance -> registry | 2 |
| directives -> personnel | 2 |
| directives -> system | 2 |
| mail -> personnel | 2 |
| mail -> council | 2 |
| system -> reserves | 2 |
| system -> assurance | 2 |
| registry -> system | 1 |
| registry -> council | 1 |
| transit -> ledger | 1 |
| personnel -> system | 1 |
| personnel -> assurance | 1 |
| personnel -> council | 1 |
| council -> transit | 1 |
| council -> reserves | 1 |
| council -> ledger | 1 |
| council -> personnel | 1 |
| council -> system | 1 |
| council -> directives | 1 |
| reserves -> forms | 1 |
| reserves -> mail | 1 |
| ledger -> council | 1 |
| assurance -> system | 1 |
| assurance -> ledger | 1 |
| directives -> reserves | 1 |
| directives -> transit | 1 |
| directives -> council | 1 |
| forms -> personnel | 1 |
| system -> forms | 1 |

Clusters: the 790 cluster (OSC-PER-IDX, OSC-DIR-0233, OSC-MEM-08-0187/0203, OSC-F-131, OSC-PER-DIR); the copy cluster (OSC-2008-Q2, OIA-08-031, OSC-ASR-COMM, OSC-CNL-SEAT-00/07, OSC-CNL-MIN-06-04); the segment 04 cluster (OSC-TRN-SEG-04, -INC-08-017, -POS-08-044, -TT-08-02, ALPHA-02/05 dossiers); the mileage cluster (OSC-MEM-07-0944, OSC-TRN-ENG, OSC-LDG-CAT-TRANSIT); the capacity cluster (OSC-MEM-07-0612, OSC-SYS-GLO, OSC-RSV-IDX). DIR-0412 is the hub every refusal points at.
