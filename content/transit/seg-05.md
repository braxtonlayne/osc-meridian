---
id: transit-seg-05
route: /transit/segment/05
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-05
title: "Segment Engineering Sheet: Segment 05, ALPHA-03 to ALPHA-05"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-02-15
facility: ALPHA-03
summary: Engineering sheet for rail Segment 05, ALPHA-03 to ALPHA-05. Length, running time, 15 block sections, Mississippi crossing, commissioning record, possessions, defects and the ALPHA-05 approach junction.
xrefs: [OSC-TRN-ENG, OSC-TRN-TT-08-02, OSC-FAC-ALPHA-03, OSC-FAC-ALPHA-05, OSC-TRN-SEG-04]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-05
  - Platform supervisors, ALPHA-03 and ALPHA-05
  - Facilities Engineering file FE/TS/05
recordType: SEGMENT ENGINEERING SHEET
fields:
  - { label: Segment, value: "05", mono: true }
  - { label: Termini, value: "ALPHA-03 (Level 12, platform 2) to ALPHA-05 (Level 11, platform 2)" }
  - { label: System, value: "Modified maglev, double guideway" }
  - { label: Status, value: "IN REVENUE SERVICE" }
  - { label: Junctions, value: "One, at ALPHA-05 approach (block 05-15)" }
  - { label: File, value: "FE/TS/05", mono: true }
revisions:
  - { rev: "1", date: "2006-09-25", change: "Issued at commissioning.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2007-03-30", change: "ALPHA-05 approach junction added (Segment 04 commissioning).", by: "FE/ALPHA-02" }
  - { rev: "3", date: "2007-10-08", change: "Mississippi crossing dewatering pump capacity increased.", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2008-02-15", change: "Annual review.", by: "FE/ALPHA-02" }
---

## Data

| Item | Entry | Item | Entry |
|---|---|---|---|
| Hubs | ALPHA-03 to ALPHA-05 | Route | :c[railSegments.05.routeNote] |
| Engineering length (mi) | :c[railSegments.05.miles] | Running time, published (h) | :c[railSegments.05.hours] |
| Completed (year-month) | :c[railSegments.05.completed] | Status | :c[railSegments.05.status] |
| Line speed basis | :c[transitTech.railSpeed] | Construction | :c[transitTech.construction] |

## Alignment and blocks

Leaves ALPHA-03 southwest beneath the Pennyroyal plateau, passes under the Mississippi embayment at its deepest point, and runs across the Ouachita and Texas uplands to the ALPHA-05 approach. Single bore, double guideway, ruling grade 1 in 85.

| Block | Location | Remarks |
|---|---|---|
| 05-01 | ALPHA-03 platform 2 to shaft 05-V1 | Approach shared with Central Network tram platform 3 ventilation |
| 05-02 to 05-04 | Pennyroyal section | |
| 05-05 | Crossover X05-1 | Refuge R05-1 |
| 05-06 to 05-08 | Mississippi embayment | Deepest point; groundwater control zone, pumps P05-1 to P05-6 |
| 05-09 | Crossover X05-2 | Refuge R05-2 |
| 05-10 to 05-12 | Ouachita section | |
| 05-13, 05-14 | Texas uplands | |
| 05-15 | ALPHA-05 approach and junction to platform 2 | See ALPHA-05 approach junction below |

## Commissioning

Witnessed acceptance run 12 SEP 2006, consist R05-030. Entered revenue service 25 SEP 2006. Booked paths in :x[OSC-TRN-TT-08-02].

## Possessions (12 months to JAN 2008)

| Possession | Date | Times | Blocks | Purpose |
|---|---|---|---|---|
| 07-018 | 03 MAR 2007 | 0600Z-1000Z (0000-0400 CST) | 05-15 | Junction turnout installation, Segment 04 approach |
| 07-024 | 21 APR 2007 | 0400Z-0800Z (2300-0300 CDT) | 05-06 to 05-08 | Pump P05-3 replacement |
| 07-047 | 14 JUL 2007 | 0400Z-0800Z (2300-0300 CDT) | 05-07 | Drainage channel desilting |
| 07-066 | 22 SEP 2007 | 0500Z-0900Z (0000-0400 CDT) | 05-12, 05-13 | Guideway coil inspection after detection fault |
| 07-080 | 03 NOV 2007 | 0400Z-0900Z (2300-0400 CDT) | 05-06 to 05-08 | Dewatering pump uprating (Revision 3) |
| 08-003 | 12 JAN 2008 | 0500Z-0900Z (0000-0400 EST) | 05-01 | Platform 2 edge strip survey, ALPHA-03 |

## Open defects

D05-08: Pump P05-5 vibration above alarm level on run-up; standby pump in duty. Category B.
D05-09: Refuge R05-2 telephone line noisy. Category C.
D05-10: Platform 2, ALPHA-03, tactile edge strip lifting at two locations. Category C. Replacement under night possessions, MAY 2008.

## ALPHA-05 approach junction

General: a junction in block 05-15 connects Segment 05 with the Segment 04 approach road at ALPHA-05. It was installed under possession 07-018 for the Segment 04 commissioning runs.

:::redact{compartment=KESTREL auth="FE" ref="OSC-CB-011"}
Turnout T05/04-1, trailing in the up direction, gives access from the Segment 05 up guideway to the platform 7 road. The turnout is clamped and padlocked normal. The clamp key is held by Transit Control, ALPHA-05, and is not issued to Network Control. With the clamp fitted, a route cannot be set across the junction from the board; detection on the platform 7 road continues to report to the board under Segment 04 block 04-01.

| Date | Clamp | Authority | Remarks |
|---|---|---|---|
| 03 MAR 2007 | Fitted | FE | On installation, possession 07-018 |
| 14 MAR 2007 to 23 MAR 2007 | Removed for commissioning runs | TO | Dynamic and acceptance runs, consists R04-001, R04-002 |
| 23 MAR 2007 | Refitted | TC | |

Later entries are kept in the clamp log at the Transit Control desk, ALPHA-05.
:::

Signed I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 15 FEB 2008.
