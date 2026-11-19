---
id: transit-incident-08-017
route: /transit/incident/08-017
app: transit
family: transit
template: record
docNo: OSC-TRN-INC-08-017
title: "Incident Log Entry 08-017: Track Circuit Occupancy, Segment 04, No Consist Booked"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 1
date: 2008-05-14
facility: ALPHA-05
summary: Network Control incident log entry 08-017, 13 MAY 2008, Watch 2. Occupancy indicated on Segment 04 blocks 04-02 to 04-07 with no consist booked; closed 14 MAY 2008. Shown with the log extract for 01 to 19 MAY 2008.
xrefs: [OSC-TRN-POS-08-044, OSC-TRN-SEG-04, OSC-DIR-0519, OSC-DIR-0378, OSC-TRN-TT-08-02, KB-0042]
distribution:
  - Director, Transit Operations
  - Network Control supervisor, ALPHA-01
  - Transit Control desk, ALPHA-05
  - Transit Operations file TO/INC/08
recordType: INCIDENT LOG ENTRY
fields:
  - { label: Entry, value: "08-017", mono: true }
  - { label: Logged, value: "13 MAY 2008 2131Z (1631 CDT)", mono: true }
  - { label: Watch, value: "Watch 2, C. Albright, Network Control Dispatcher" }
  - { label: Location, value: "Segment 04, blocks 04-02 to 04-07" }
  - { label: Category, value: "Train detection: occupancy without booking" }
  - { label: Status, value: "CLOSED 14 MAY 2008" }
  - { label: Closed by, value: "D. Harker, Director, Transit Operations" }
---

## Entry 08-017

| Time | Indication or action | Init. |
|---|---|---|
| 2131Z (1631 CDT) | SEG 04 BLK 04-02 OCCUPIED. No consist booked. Segment 04 not in revenue service; no paths in working timetable (:x[OSC-TRN-TT-08-02]). | CA |
| 2133Z (1633 CDT) | Transit Control desk, ALPHA-05, telephoned. Desk states possession 08-044 in force for Segment 04. No consist ID given. | CA |
| 2156Z (1656 CDT) | BLK 04-03 OCCUPIED. 04-02 CLEAR. | CA |
| 2206Z (1706 CDT) | Watch 3 on the desk. Indications as at 2156Z. C. Albright remains to complete entry. | YRW |
| 2221Z (1721 CDT) | BLK 04-04 OCCUPIED. 04-03 CLEAR. | YRW |
| 2246Z (1746 CDT) | BLK 04-05 OCCUPIED. 04-04 CLEAR. | YRW |
| 2311Z (1811 CDT) | BLK 04-06 OCCUPIED. 04-05 CLEAR. | YRW |
| 2336Z (1836 CDT) | BLK 04-07 OCCUPIED. 04-06 CLEAR. | YRW |
| 2358Z (1858 CDT) | BLK 04-07 CLEAR. All Segment 04 blocks CLEAR. No further indications. Entry left open for the Director. | YRW |

Detection systems A and B agreed throughout. No alarms on traction power: Segment 04 traction is de-energised at standby. No other line affected. No booked path delayed.

## Dispatcher's supporting remarks

:::redact{compartment=KESTREL auth="TO" ref="TO-07-311"}
Board showed OCCUPIED, not POSSESSED, for each block in turn. Possession reports POSSESSED regardless of detection.

Second occasion. First 08 APR 2008 2210Z, Watch 2, not logged; see dispatcher notebook.

C.A.
:::

## Closure

14 MAY 2008 1520Z (1120 EDT). Attributable to possession 08-044, no further action. Not reportable under :x[OSC-DIR-0378]. Advised dispatcher of DIR-0519 (:x[OSC-DIR-0519]).

D. Harker, Director, Transit Operations.

Possession record: :x[OSC-TRN-POS-08-044]. Segment record: :x[OSC-TRN-SEG-04].

## Log extract, 01 MAY to 19 MAY 2008

Network Control incident log, all networks. Extract generated 19 MAY 2008 1030Z (0630 EDT). Times are Zulu with the local time at the location of the incident. Tram links are shown by network link code.

| Serial | Date | Time | Location | Entry | Watch | Status |
|---|---|---|---|---|---|---|
| 08-009 | 01 MAY | 1103Z (0703 EDT) | ALPHA-01 platform 1 | R01-214 door 3 failed to close on departure of path 1D01. Door isolated and locked out of use by platform staff. Departed 1109Z, 9 min late. | 1 | Closed |
| 08-010 | 02 MAY | 1538Z (1138 EDT) | ALPHA-01 Level 13 concourse | Escalator E2 stopped with passengers on; emergency stop pressed by a passenger after a bag strap caught at the comb plate. No injury. Out of use pending parts, FE-08-0391. | 2 | Closed (08-022) |
| 08-011 | 03 MAY | 0412Z (0012 EDT) | EA link L2 | TEA-022 loaded brake test after overhaul. Stopping distance within limit at second attempt; first attempt void (test weight incorrectly loaded). | 3 | Closed |
| 08-012 | 05 MAY | 1851Z (1451 EDT) | Segment 05, block 05-01 | Passenger on path 5U02 (R05-034) taken ill, fainting. Crew attended. Medical team met consist at ALPHA-03 platform 2 at 1906Z. Passenger walked to the clinic and was released the same day. | 2 | Closed |
| 08-013 | 07 MAY | 1610Z (0910 PDT) | ALPHA-04 crossover cavern | Contractor began cutting up retired TBM spoil conveyor structure under hot work permit. Debris netting fitted. Adjacent block 03-11 unaffected. Fire watch kept 1 hour after each cut. | 2 | Closed |
| 08-014 | 08 MAY | 2240Z (1740 CDT) | SO link S7 | TSO-030 door 2 interlock fault at far-end platform. Door isolated. Return path 12 min late. | 3 | Closed |
| 08-015 | 10 MAY | 0633Z (0233 EDT) | Segment 06, block 06-14 | Detection system B flickered OCCUPIED for 4 s; system A CLEAR throughout. No consist on segment. FE advised; system B card replaced 12 MAY. | 1 | Closed |
| 08-017 | 13 MAY | 2131Z (1631 CDT) | Segment 04, blocks 04-02 to 04-07 | Occupancy indicated, no consist booked. See entry. | 2 | Closed |
| 08-018 | 14 MAY | 1245Z (0845 EDT) | ALPHA-03 platform 2 | Passenger tripped on lifting tactile edge strip (defect D05-10). No injury. Strip taped and coned off. | 1 | Closed |
| 08-019 | 15 MAY | 1702Z (1202 CDT) | CE link C4 | TCE-019 failed daily brake test at the stabling point. Consist withdrawn. Path cancelled; no passengers booked. | 2 | Closed |
| 08-020 | 16 MAY | 1317Z (0717 MDT) | ALPHA-02 platform 1 | R02-111 door 5 slow to close; door adjusted by depot staff in the platform. Path 2U02 departed 1321Z, 21 min late. | 1 | Closed |
| 08-021 | 17 MAY | 1830Z (1430 EDT) | ALPHA-01 platform 4 | Unattended bag on platform. Owner traced through travel office within 15 min. Bag returned. | 2 | Closed |
| 08-022 | 19 MAY | 0901Z (0501 EDT) | ALPHA-01 Level 13 concourse | Escalator E2 returned to service after replacement of comb plate and step chain tensioner. Entry 08-010 closed. | 2 | Closed |

Unscheduled movements are entered in this log and not in the working timetable. Board conventions: :x[KB-0042].
