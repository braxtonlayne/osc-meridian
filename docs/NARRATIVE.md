# MERIDIAN narrative plan (SPOILERS)

Machine-readable twin: `src/narrative/plan.json`. Page list: `content/manifest.json` / `docs/MANIFEST.md`. **Nothing in this file may appear in `content/`, in search, or anywhere in the site.** Content agents plant the clues listed per page in the manifest `plants` field; the integration phase wires the triggers below.

## 0. Premise

The visitor is OPR-A03-1147, Tier 3, LANTERN, on a 90-day probationary transfer to ALPHA-03 Records Division since 14 APR 2008, supervisor M. Okafor. Their workstation is **A03-5-114**, which belonged to Carol Ann Dimmick (records technician, carried DETACHED / UNPOSTED from 28 MAR 2008), the last person to open the scanned Facility Inventory before Theo Barraclough found it. The site never says this. The visitor can assemble it from three releases (Service Desk mail, HOLLOW in the directory, BRIAR in OIA-08-031).

Release keys: `T<tier>`, `<COMPARTMENT>`, `<COMPARTMENT>+T<tier>`. `T2` is satisfied only by ACTING-T2. Tier 1 keys never ship: they stay black forever, bars at true length.

## 1. Clearance progression (15 steps)

Baseline: Tier 3 + LANTERN. Middle: Tier 3 + up to six compartments (BRIAR, HOLLOW, KESTREL, SEXTANT, TALLOW, QUARRY). Top: Tier 2 ACTING.

```
S01 read DIR-0412 ──> (tasking mail) ──> S02 accession held ──> S03 open scan ──> S04 F-160 self-report [BRIAR] ──> S12 F-114 "copy 07" [QUARRY]
S05 read 790 memos ·····> S06 F-131 "790" [HOLLOW] ──> S13 strength unposted
S07 read MEM-07-0944 ──> S08 F-126 sponsored [KESTREL] ──┐
S09 watch segment 04 event ──────────────────────────────┴─> S10 F-114 "segment 04" [SEXTANT]
S01 ──> S11 wo FE-08-0417 [TALLOW]
any 4 of the six compartments ──> S14 interim review mail ──> S15 F-126 ACTING-T2 / clearance request acting [ACTING-T2]
(····> = recommended, not required)
```

| Step | Trigger | Requires | Grant | Mail | Releases | Breadcrumb (where the site hints at it) |
|---|---|---|---|---|---|---|
| S01 Orientation | doc.read OSC-DIR-0412 | none | flag oriented | msg-08-04470 (tasking) | none | Welcome mail msg-08-04102; every refusal cites DIR-0412; KB-0001 |
| S02 Held accession | doc.read OIA-08-031 **or** search `RD-ACC-08-00412` / `00412` / `OIA-08-031` | none | flag accessionHeld | none | OIA-08-031 access log starts listing the visitor | Tasking mail lists 00412 "HELD (OIA-08-031)" |
| S03 Open the scan | doc.read OSC-2008-Q2 | none | flag scanRead | msg-08-04490 (OIA) | none | OIA-08-031 xref; copy register page |
| S04 BRIAR | form.submit OSC-F-160, documentInvolved ~ `OSC-2008-Q2` or `RD-ACC-08-00412` | S03 | BRIAR | msg-08-04480 | OIA-08-031 inquiry log (custody from a Secretariat registry; first opened from A03-5-114 on 27 MAR 2008; copy number 07); scan copy digit; THR-04/06 later paragraphs (THR-06: dispositions "recorded in personnel accounting as a change of category"); PSEC, VET, DIR-0378 | OIA access mail says self-reports under DIR-0378 count in mitigation; DIR-0378 names F-160 |
| S05 The 790 query | doc.read OSC-MEM-08-0187 **and** OSC-MEM-08-0203 | none | flag queryRead | none | F-131 shows a receipt-history line | OSC-PER-IDX row with no drill-down and footnote to DIR-0233; DIR-0233 para 6 "[Reserved.]"; glossary loop |
| S06 HOLLOW | form.submit OSC-F-131 with any field `790` or a PN P-3-06-0977 / P-4-07-0219 / P-3-05-0142 | none | HOLLOW | msg-08-04481 | Directory fields of the three (Dimmick: "Workstation A03-5-114 reassigned 14 APR 2008"); MEM-08-0187 Attachment A (3 lines, 787 Tier 1); MEM-08-0203 cc to RAO; OSC-PER-IDX declarations footnote; BETA-08 vacated post; HOLLOW+KESTREL on SEG-04 (Tobin "status changed 19 APR 2007") | Kessler memo mentions F-131 without instructions; calendar 27 MAY "collection closes"; the form itself |
| S07 Mileage | doc.read OSC-MEM-07-0944 | none | flag mileageQuery | none | none | Ledger TRANSIT cost-per-mile footnote; OSC-TRN-ENG note; glossary CERTIFIED MILEAGE |
| S08 KESTREL | form.submit OSC-F-126: compartment KESTREL, sponsor PN a KESTREL holder (P-2-02-0091, P-3-05-0288, P-3-06-0866, P-3-07-0901), justification cites a KESTREL-scope docNo | S07 | KESTREL | msg-08-04482 | SEG-04 crew and walk-downs; ENG environmental table (occupancy 13 MAY 2100Z-2300Z labelled "possession"); INC-08-017 remarks (first occasion 08 APR not logged); POS-08-044 party (FE 2, SFC escort 4); OSC-TRN-RS opens; R04-900..999 reserved to Transit Control | F-126 instructions; directory "Holds" column; MEM-07-0944 distribution |
| S09 Witness | transit.watch SEG04 event (board visible at any moment of it) | none | flag seg04Witnessed | msg-08-04493 (OIA, 8-12 min later) | none | TT-08-02 "No paths"; KB-0042 suppressed IDs; calendar 13 MAY possession, no times |
| S10 SEXTANT | form.submit OSC-F-114, location ~ `segment 04` / `seg 4` / `04-nn` / `R04` | S09 or S08 | SEXTANT | msg-08-04483 | Registry, cover catalogue, contractor matrix site columns; NET-EAS/SOU/MTW endpoints; all non-adjacent dossiers' location/connection blocks; BETA reactor identities; cable 01208 origin | OIA board mail: irregular indications go on F-114; DIR-0378 "an indication observed on a MERIDIAN display"; DIR-0412 para 4(c) |
| S11 TALLOW | terminal `wo FE-08-0417` | S01 | TALLOW | msg-08-04484 | All RX pages' fuel, refuelling, burn-down; ENERGY BETA sites; reserve site stocks; MEM-07-0612 "berths above the sustained figure are not provisioned" | RX-A03 "(lookup: wo FE-08-0417)"; seed vault page; KB-0031 ("viewing may add you to its distribution"); DIR-0301 para 7 |
| S12 QUARRY | form.submit OSC-F-114, documents ~ `OSC-2008-Q2` and any field ~ `copy 07` / `copy no. 7` | S04 | QUARRY | msg-08-04485 | Charter III, IV, VI open; copy register columns; seat 07 "to follow (Secretariat)"; all five minutes' QUARRY items | BRIAR briefing asks for provenance information on F-114; seat 07 empty certificate field; Charter II destruction-before-issue rule |
| S13 Strength | terminal `strength unposted` | S06 | flag strengthRun | msg-08-04495 (OIA) | Terminal prints 790, three released lines, 787 "[NOT RELEASED]", "Category change effective 31 MAY 2008: count withheld" | Kessler memo names the STRENGTH utility; DIR-0301 para 7 |
| S14 Interim review | state: holds 4 or more of the six | none | flag interimReview | msg-08-04486 | none | Day-30 report mail; OSC-PER-TRF exception clause |
| S15 ACTING-T2 | form.submit OSC-F-126 compartment ACTING-T2 sponsor P-2-04-0218, **or** terminal `clearance request acting` | S14 | ACTING-T2 | msg-08-04487 | Every T2 block; arms page opens; COMP+T2 keys for held compartments. Tier 1 stays black | Okafor's interim review mail; DIR-0395 para 7 |

Playtest path without hints: login mail -> DIR-0412 -> tasking -> OIA-08-031 -> scan -> OIA mail -> F-160 -> BRIAR shows copy 07 -> seat 07 -> F-114 -> QUARRY. Separately: Personnel overview 790 -> DIR-0233 -> search "unposted" -> memos -> F-131. Ledger or Transit -> MEM-07-0944 -> F-126 with a sponsor from the directory. RX-A03 -> `wo`. Board -> event -> F-114. Four compartments -> Okafor -> F-126 acting.

Refusal behaviour of OSC-F-126 for compartments it cannot grant (HOLLOW, TALLOW, BRIAR, QUARRY): "Not approvable on request. Read-in under DIR-0412 para 4(c)-(e) only." SEXTANT via F-126 is approvable with a SEXTANT-holder sponsor, but no SEXTANT holder appears in the directory's visible "Holds" column at Tier 3, so in practice S10 is the route.

## 2. Mail queue (30)

| id | from | rule | notes |
|---|---|---|---|
| msg-08-04102 | M. Okafor | login | Welcome; read DIR-0412 |
| msg-08-04106 | K. Dwyer | login | Account issued; workstation A03-5-114; "previous user profile archived" |
| msg-08-04131 | J. Harrow | login (read) | LANTERN briefing OSC-CB-010 acknowledged |
| msg-08-04298 | R. Teague | login | Parking allocation (last own-hand Teague signature, 02 MAY) |
| msg-08-04305 | L. Carranza | login | Filter change AHU-07 to -12 |
| msg-08-04362 | G. Imrie for R. Teague | login | Memorial Day manning (first "for" signature, 08 MAY) |
| msg-08-04417 | M. Okafor | login | Day-30 report; refresher overdue; medical expires 31 MAY |
| msg-08-04433 | B. Shoal | login | Locker 5-114; previous holder's items boxed, "do not open" |
| msg-08-04459 | K. Dwyer | login | Print server maintenance |
| msg-08-04470 | M. Okafor | S01 or 6 min | Tasking: Stacks C, 00412 HELD |
| msg-08-04471 | Training | 12 min | Refresher overdue |
| msg-08-04472 | Food Service | 20 min | Menu (with an uncorrected copy-paste from ALPHA-02) |
| msg-08-04473 | Registry | 30 min | Cable OSC-CBL-08-01173, segment 04 possession |
| msg-08-04474 | Registry | 45 min | Cable OSC-CBL-08-01208, RX-B08 startup |
| msg-08-04480..04485 | briefing officers | S04, S06, S08, S10, S11, S12 | BRIAR, HOLLOW, KESTREL, SEXTANT, TALLOW, QUARRY (aliases OSC-CB-015, -012, -011, -013, -014, -016) |
| msg-08-04486 | M. Okafor | S14 | Interim review: acting designation |
| msg-08-04487 | G. Imrie for R. Teague | S15 | Acting T2 issued |
| msg-08-04490..04495 | D. Prewitt (OIA) | audit A1..A6 | Consequence messages, below |
| msg-08-04496 | H. Lindqvist | audit A8 | Strength enquiries not by correspondence; cc RAO |
| msg-08-04497 | Message transfer system | audit A7 | Non-delivery to the three carried centrally |

All triggered mail is `dateMode: delivery` (stamped with the session date, never later than 31 MAY 2008).

### OIA consequence templates (slots filled from the audit entry)

1. **04490 Record of Access**: "Your workstation ({workstation}) opened {docNo} at {time}. Access is recorded under OIA-08-031. No action is required of you at this time. Self-reports under DIR-0378 are considered in mitigation." Ref {auditRef}.
2. **04491 Search Activity**: "On {date} at {time} your workstation queried "{query}" ({count} queries of this kind this session). Queries are retained with the audit trail."
3. **04492 Pattern of Access to Withheld Material**: "Between {firstTime} and {time} your workstation examined {count} withheld items, including items in {docNo}. Examining withholding marks is not itself a violation."
4. **04493 Display of Network Control Board**: "At {time} your workstation displayed the Network Control board ({view}) for {duration}. Any irregular indication observed on a MERIDIAN display is to be reported on OSC-F-114 (DIR-0378 para 4)."
5. **04494 Reproduction of Records**: "Print job {pq} of {docNo} was released at {time}. See DIR-0319. The cover sheet copy is to be returned to the Records Division counter."
6. **04495 Terminal Activity**: "At {time} your workstation ran "{command}" against an item under inquiry or a centrally carried category. The command is available; its use is recorded."

Each is signed D. Prewitt, Resident Assurance Officer ALPHA-03, cc M. Okafor, and quotes the AUD reference.

## 3. Audit consequences

| Rule | Kind | Condition | Effect |
|---|---|---|---|
| A1 | doc.read | OSC-2008-Q2, first time | mail 04490; access line in OIA-08-031; S03 |
| A2 | search | second matching query in a session (`unposted`, `790`, `detached`, `segment 04`, `electronic cop`, `inventory scan`, the three names, `copy 07`) | mail 04491 once, quoting the query |
| A3 | redaction.hover | 25 or more in a session | mail 04492 once |
| A4 | transit.watch | board visible during SEG04 event | two audit lines; S09; mail 04493 |
| A5 | print / form.submit F-142 | print of UMBRA-C or higher, or reproduction request for an EYES ONLY doc | mail 04494 once; later cover sheets stamped REVIEWED-OIA |
| A6 | terminal.cmd | `trace RD-ACC-08-00412` or `strength unposted` | mail 04495 once |
| A7 | mail.send | to l.ackroyd@b08.iad.mer, c.dimmick@a03.rd.mer, r.tobin@a02.fe.mer | non-delivery 04497 every time |
| A8 | mail.send | to `*@a01.pv.mer` mentioning 790 / unposted / PV-Q-08-0031 | 04496 once |
| A9 | window.open | fifth refusal in a session | notify "Repeated refusals are recorded (DIR-0412 para 8)." |
| A10 | form.submit | F-122 by a probationer | refusal citing DIR-0247; audit line |
| A11 | timeout | inactivity | lock; state kept; SEG04 never fires while locked |

Audit line format: `AUD-{yymmdd}-{serial6} {hhmm}Z ({local}) {KIND} OPR-A03-1147 WS A03-5-114 {detail}`. Written like a security office: "Opened OSC-2008-Q2 (UMBRA//OSC EYES ONLY) in Records Library. Access recorded under OIA-08-031."

## 4. Segment 04 event

- **Timing:** once per session (per login). At login draw a uniform delay of 6 to 25 minutes; fire then, or at unlock if locked. It runs whether or not anyone is watching.
- **Board:** segment 04 is always dashed. For 150 s, blocks 04-01 to 04-12 light solid in sequence from the ALPHA-05 end (platform 7) toward ALPHA-02, two at a time. Consist label `R04-***` (real series R04-900..999, never displayed); headway and speed `--`; timetable column `UNBOOKED`. ALPHA-05 link state shows BUSY in the notification area and system monitor.
- **Log:** the live incident log shows `{hhmm}Z ({local}) SEG 04 BLK 04-{nn} OCCUPIED CONSIST R04-*** NO BOOKING`. 60 s after clearing, the entry is deleted and the next serial skips one (the same gap as 08-016 in the INC-08-017 extract).
- **Audit:** if watched, `TRANSIT.WATCH ... Network Control board displayed ({view}) {start}Z to {end}Z. Indications displayed: SEG 04 BLK 04-01 to 04-12.` Always: `SYSTEM Board indication record for interval {start}Z to {end}Z withdrawn by Transit Control on instruction.`
- **Follow-up:** if watched, S09 and OIA mail 04493 after 8 to 12 minutes. The mail says "the Network Control board", never "segment 04". `rail status` never changes; `consist R04-***` returns NO RECORD.

## 5. Undocumented terminal commands

| Command | Does | Mentioned in |
|---|---|---|
| `wo <number>` | Work order lookup; FE-08-0417 adds the workstation to its distribution (S11, TALLOW) | KB-0031, OSC-RSV-RX-A03, OSC-RSV-SEED, OSC-DIR-0301 para 7 |
| `trace <accession>` | Chain of custody; 00412 shows received 24 MAR 2008 with superseded registry media, origin hop withheld, HELD (A6) | OSC-DIR-0336 para 9, tasking mail 04470 |
| `strength <site\|unposted>` | Strength from returns; `unposted` prints 790 with no breakdown (S13, A6) | OSC-MEM-08-0187, OSC-DIR-0301 |
| `consist <id>` | Rolling stock lookup; R04-*** returns NO RECORD | KB-0042, OSC-TRN-RS |
| `copies <docNo>` | Council copy register (QUARRY): seat 07 predecessor destruction TO FOLLOW | OSC-CNL-SEAT-00, OSC-DIR-0354 |
| `clearance request acting` | Undocumented subcommand; refused until S14, then S15 | OSC-DIR-0395 para 7 |

DIR-0301 para 7 ("Lookup utilities provided by divisions remain available at the command line and are not listed in help") and KB-0026's last line are the master hints.

## 6. The five anomaly paper trails

- **UNPOSTED_790:** personnel-overview (row, no drill-down) -> system-glossary (loop) -> dir-0233 (para 6 reserved) -> personnel-mem-08-0187 (Kessler) -> personnel-mem-08-0203 (closure) -> f-131 (no instructions) -> personnel-directory (three entries, HOLLOW) -> system-calendar (27 MAY collection, 31 MAY category change) -> council-minutes-08-02 (category change, count withheld) -> assurance-threat-06 (BRIAR disposition line) -> council-charter-v ("however carried"). Personal thread: msg-08-04106 / msg-08-04433 / assurance-oia-08-031 (A03-5-114 was Dimmick's). Mail: 04481, 04496, 04497.
- **TUNNEL_847:** ledger-mem-07-0944 ("which is it?") <- ledger-cat-transit (cost per mile both ways) <- transit-engineering (not derived from this table) <- system-glossary; council-minutes-07-06 accepts 847; council-inventory-scan prints 847; transit-seg-02 alone is longer.
- **CAPACITY_23400:** reserves-mem-07-0612 defines both; system-glossary; reserves-overview; registry-index footnote; personnel-phase-4/5 targets on the sustained basis. TALLOW adds the line about unprovisioned berths.
- **SEGMENT_04:** transit-seg-04 (blank reason, Tobin) / fac-alpha-02 and fac-alpha-05 (connection lists omit it; platform 7) / transit-overview (no paths) / transit-possession-08-044 (no times, four escorts for two walkers) / transit-incident-08-017 (occupancy, serial gap) / transit-rolling-stock (R04 stabled, R04-9xx) / msg-08-04473 cable / system-calendar / kb-0042 / council-minutes-07-03 (acceptance deferred) / transit-engineering (environmental readings) / the live event.
- **ELECTRONIC_COPY:** council-inventory-scan (an electronic copy that says no electronic copies) / assurance-oia-08-031 (OPEN; kept on index to record access) / assurance-comm and council-charter-vii (paper only) / dir-0319 / assurance-cg / msg-08-04470 / msg-08-04490 / council-seat-07 and council-minutes-06-04 (the copy that was never certified destroyed).

## 7. People, signatures, suspenses, calendar

- **Supervisor:** M. Okafor (P-2-04-0218): welcome, day-30 report, tasking, interim review.
- **Signature drift:** R. Teague (P-2-04-0061) signs ALPHA-03 routine notices up to and including 05 MAY 2008. From 06 MAY 2008 every ALPHA-03 command notice is signed "G. IMRIE / for R. TEAGUE, Deputy Commander" (P-2-04-0133). No document explains, including the acting designation he issues. Content agents: any ALPHA-03 command item dated 2008-05-06 or later uses the "for" block.
- **OIA:** C. Brandauer signs BRIAR; D. Prewitt signs every consequence message and owns OIA-08-031 (suspense 30 MAY 2008).
- **790:** R. A. Kessler raised it (17 APR); H. Lindqvist closed it (24 APR) and later answers enquiries.
- **Segment 04:** O. Garrity signed commissioning (MAR 2007) and books walk-downs; C. Albright logged the occupancy; D. Harker closed it; R. Tobin was on the crew and has been unposted since 19 APR 2007.
- **Mileage:** I. Lockhart's memo; P. Ramanathan's margin; D. Harker signs the certified return.
- **Council:** A. Penhallow signs minutes; N. Fenwick prepares them; seats by role only.
- **Suspenses:** 07 MAY refresher (visitor overdue); 12 MAY training compliance report; 14 MAY day-30 report and destruction witnessing; 27 MAY unposted declarations close; 30 MAY OIA-08-031 suspense and month-end personnel accounting; 31 MAY medical readiness expiry, payroll category change, probation interim reviews.
- **Calendar:** the 40 canon events in OSC-SYS-CAL, tier-filtered. The four odd ones sit among the dull ones in identical format: 13 MAY possession segment 04 (no times), 15 MAY Council session (T2), 27 MAY unposted declarations close, 31 MAY payroll category change (T2, count withheld).

## 8. Notes for other agents

- Drift phrases ("certified mileage", "sustained capacity", "total surge berthing", "total personnel", "total posted staff", "DETACHED / UNPOSTED", "total programme cost") must carry their `:c[...]` value. Mail and directives that should not show the figure avoid the phrase (DIR-0233 and the non-delivery notice say "categories other than POSTED" and "not accepting mail").
- Briefing numbers OSC-CB-010..016 resolve through `aliases` on the briefing mail pages. Proposed contract addition: the pipeline resolves `:x[...]` against `aliases` too.
- The session panel should show workstation A03-5-114 (proposed shell addition; canon operator has no workstation field).
