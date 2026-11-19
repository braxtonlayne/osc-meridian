---
id: transit-rolling-stock
route: /transit/rolling-stock
app: transit
family: transit
template: record
docNo: OSC-TRN-RS
title: Rolling Stock Register (Rail and Tram)
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 8
date: 2008-04-18
access: { tier: 3, compartment: KESTREL }
summary: Register of rail consists (R01- to R06- series) and tram consists (TEA, TSO, TMW, TCE) with type, delivery, allocation, home depot, last overhaul and open defects.
xrefs: [OSC-TRN-TT-08-02, OSC-TRN-SEG-04, OSC-DIR-0412, OSC-LDG-REG, KB-0042]
distribution:
  - Director, Transit Operations
  - Network Control supervisor, ALPHA-01
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Tunnel maintenance depots, ALPHA-02 and ALPHA-04
  - Transit Operations file TO/RS
recordType: ROLLING STOCK REGISTER
fields:
  - { label: Register, value: "Rail and tram consists, all networks" }
  - { label: Keeper, value: "Transit Operations, ALPHA-01" }
  - { label: Technical records, value: "Tunnel maintenance depot, ALPHA-02 Level 10" }
  - { label: Procurement line, value: "LI-098, Special Purpose Vehicle Procurement", mono: true }
  - { label: Revision, value: "8 (rail series R03 and R04 overhaul dates; tram TEA overhauls)" }
revisions:
  - { rev: "6", date: "2007-03-30", change: "R04-001 and R04-002 entered on commissioning of Segment 04.", by: "TO/ALPHA-01" }
  - { rev: "7", date: "2007-11-15", change: "TCE series added; R06-024 withdrawn for parts.", by: "TO/ALPHA-01" }
  - { rev: "8", date: "2008-04-18", change: "Overhaul dates brought forward; TEA overhaul programme recorded.", by: "TO/ALPHA-01" }
---

## 1. Numbering

Consist identifiers are not document numbers. They appear on the Network Control board and in the incident log.

| System | Format | Example | Rule |
|---|---|---|---|
| Rail | R&lt;seg&gt;-NNN | R01-214 | Segment number of the consist's first booked run, then a serial |
| Tram | T&lt;net&gt;-NNN | TEA-031 | Network letters EA, SO, MW or CE, then a serial |

A rail consist keeps its number if it is later worked on another segment. Numbers are not reused after withdrawal.

## 2. Rail consists

Type MV-4: four-car maglev consist, 96 seats or 40 seats and 2 freight modules. Builder's records held at the ALPHA-02 depot under the procurement line.

| Consist | Delivered | Allocated | Home depot | Last overhaul | Status | Defects / remarks |
|---|---|---|---|---|---|---|
| R01-201 | OCT 2004 | Segment 01 | ALPHA-02 | JUN 2007 | Spare | Acceptance consist, Segment 01. Seats reduced to 72 (fitted for records consignments). |
| R01-214 | NOV 2004 | Segment 01 | ALPHA-02 | SEP 2007 | In service | |
| R01-216 | NOV 2004 | Segment 01 | ALPHA-02 | JAN 2008 | In service | |
| R01-219 | MAR 2005 | Segment 01 | ALPHA-01 | NOV 2007 | Spare | Stabled ALPHA-01 platform 1 road |
| R02-101 | SEP 2006 | Segment 02 | ALPHA-02 | MAR 2008 | Spare | Acceptance consist, Segment 02 |
| R02-108 | OCT 2006 | Segment 02 | ALPHA-02 | DEC 2007 | In service | Galley water heater, Category C |
| R02-111 | OCT 2006 | Segment 02 | ALPHA-02 | FEB 2008 | In service | |
| R03-050 | JUL 2006 | Segment 03 | ALPHA-02 | APR 2008 | Spare | Acceptance consist, Segment 03 |
| R03-052 | JUL 2006 | Segment 03 | ALPHA-02 | APR 2008 | In service | |
| R03-055 | AUG 2006 | Segment 03 | ALPHA-02 | In works | Depot | Levitation magnet module replacement, return MAY 2008 |
| R04-001 | FEB 2007 | Segment 04 | ALPHA-05 | Not due | Not in service | Delivered FEB 2007. Allocated Segment 04. Stabled ALPHA-05 platform 7. Not in service. |
| R04-002 | FEB 2007 | Segment 04 | ALPHA-05 | Not due | Not in service | Delivered FEB 2007. Allocated Segment 04. Stabled ALPHA-05 platform 7. Not in service. |
| R05-030 | AUG 2006 | Segment 05 | ALPHA-02 | OCT 2007 | Spare | Acceptance consist, Segment 05 |
| R05-031 | AUG 2006 | Segment 05 | ALPHA-02 | JAN 2008 | In service | |
| R05-034 | SEP 2006 | Segment 05 | ALPHA-02 | MAR 2008 | In service | |
| R06-010 | JAN 2007 | Segment 06 | ALPHA-02 | Not due | Spare | Acceptance consist, Segment 06 |
| R06-019 | JAN 2007 | Segment 06 | ALPHA-02 | Not due | In service | |
| R06-022 | FEB 2007 | Segment 06 | ALPHA-02 | Not due | In service | |
| R06-024 | FEB 2007 | Segment 06 | ALPHA-02 | n/a | Withdrawn | Withdrawn for parts NOV 2007 after depot collision damage |

Overhaul interval: 12 months or 150,000 mi, whichever first. Consists not in service are inspected at their stabling point quarterly; R04-001 and R04-002 were last inspected 26 MAR 2008 by the ALPHA-05 platform staff, battery charge only.

## 3. Reserved series

| Series | Allocated to | Vehicles | Remarks |
|---|---|---|---|
| R04-900 to R04-999 | Transit Control | None | Not allocated to vehicles. Not shown in the working timetable (:x[OSC-TRN-TT-08-02]). |
| TEA-900 to TEA-999 | Network Control | None | Engineering trains, Eastern Network, when required |

:::redact{tier=2 auth="TO" ref="TO-07-041"}
Vehicle movements authority for R04-9xx: Transit Control, ALPHA-05 desk, on instruction only. Movements under these numbers are not booked against the working timetable, are not entered in the possession register, and are displayed on the Network Control board with the consist identity suppressed. Indication records for such movements are withdrawn from the board record by Transit Control after the movement. The clamp key for turnout T05/04-1 (:x[OSC-TRN-SEG-05]) is issued against the instruction number.
:::

## 4. Tram consists

Types: TT-2 (two-car, 64 seats) and TT-2F (two-car, 32 seats and freight van). All tram stock has a locked van compartment for consignments.

| Network | Consists in register | In service | Spare | In works | Remarks |
|---|---|---|---|---|---|
| Eastern (TEA) | TEA-022, -024, -031, -035, -040, -042, -046, -048 | 7 | 1 (TEA-048) | 0 | TEA-022 and TEA-024 overhauled MAR to APR 2008; loaded brake test before first path |
| Southern (TSO) | TSO-008, -012, -015, -021, -023, -027, -030, -033, -036 | 8 | 1 (TSO-036) | 0 | TSO-030 door 2 interlock, Category B |
| Mountain/Western (TMW) | TMW-004, -009, -011, -017, -020, -024, -026, -028, -031, -033 | 9 | 0 | 1 (TMW-033) | Sub-network W stock not to be used on sub-network M |
| Central (TCE) | TCE-011, -014, -016, -019, -020 | 4 | 1 (TCE-020) | 0 | TCE-019 provided from outside the Central Network |

Register by consist:

| Consist | Type | Delivered | Home depot | Last overhaul | Status | Defects / remarks |
|---|---|---|---|---|---|---|
| TEA-022 | TT-2 | JUN 2006 | ALPHA-01 | MAR 2008 | In service | Overhauled MAR 2008; loaded brake test before first path |
| TEA-024 | TT-2 | NOV 2005 | ALPHA-01 | APR 2008 | In service | Overhauled APR 2008; loaded brake test before first path |
| TEA-031 | TT-2F | APR 2006 | ALPHA-01 | OCT 2007 | In service |  |
| TEA-035 | TT-2 | SEP 2005 | ALPHA-01 | MAY 2007 | In service |  |
| TEA-040 | TT-2 | FEB 2006 | ALPHA-01 | DEC 2007 | In service |  |
| TEA-042 | TT-2F | JUL 2005 | ALPHA-01 | JUL 2007 | In service |  |
| TEA-046 | TT-2 | DEC 2006 | ALPHA-01 | FEB 2007 | In service |  |
| TEA-048 | TT-2 | MAY 2005 | ALPHA-01 | SEP 2007 | Spare |  |
| TSO-008 | TT-2F | OCT 2006 | ALPHA-05 | APR 2007 | In service |  |
| TSO-012 | TT-2 | MAR 2005 | ALPHA-05 | NOV 2007 | In service |  |
| TSO-015 | TT-2 | AUG 2006 | ALPHA-05 | JUN 2007 | In service |  |
| TSO-021 | TT-2F | JAN 2005 | ALPHA-05 | JAN 2008 | In service |  |
| TSO-023 | TT-2 | JUN 2006 | ALPHA-05 | AUG 2007 | In service |  |
| TSO-027 | TT-2 | NOV 2005 | ALPHA-05 | MAR 2008 | In service |  |
| TSO-030 | TT-2F | APR 2006 | ALPHA-05 | OCT 2007 | In service | Door 2 interlock, Category B |
| TSO-033 | TT-2 | SEP 2005 | ALPHA-05 | MAY 2007 | In service |  |
| TSO-036 | TT-2 | FEB 2006 | ALPHA-05 | DEC 2007 | Spare |  |
| TMW-004 | TT-2F | JUL 2005 | ALPHA-04 | JUL 2007 | In service | Sub-network W only |
| TMW-009 | TT-2 | DEC 2006 | ALPHA-04 | FEB 2007 | In service | Sub-network W only |
| TMW-011 | TT-2 | MAY 2005 | ALPHA-04 | SEP 2007 | In service | Sub-network W only |
| TMW-017 | TT-2F | OCT 2006 | ALPHA-04 | APR 2007 | In service | Sub-network W only |
| TMW-020 | TT-2 | MAR 2005 | ALPHA-04 | NOV 2007 | In service | Sub-network W only |
| TMW-024 | TT-2 | AUG 2006 | ALPHA-04 | JUN 2007 | In service |  |
| TMW-026 | TT-2F | JAN 2005 | ALPHA-04 | JAN 2008 | In service |  |
| TMW-028 | TT-2 | JUN 2006 | ALPHA-04 | AUG 2007 | In service |  |
| TMW-031 | TT-2 | NOV 2005 | ALPHA-04 | MAR 2008 | In service |  |
| TMW-033 | TT-2F | APR 2006 | ALPHA-04 | In works | In works | At ALPHA-02 depot, bogie overhaul |
| TCE-011 | TT-2 | SEP 2005 | ALPHA-03 | MAY 2007 | In service |  |
| TCE-014 | TT-2 | FEB 2006 | ALPHA-03 | DEC 2007 | In service |  |
| TCE-016 | TT-2F | JUL 2005 | ALPHA-03 | JUL 2007 | In service |  |
| TCE-019 | TT-2 | DEC 2006 | ALPHA-03 | FEB 2007 | In service | Transferred from the Southern Network |
| TCE-020 | TT-2 | MAY 2005 | ALPHA-03 | SEP 2007 | Spare |  |

Heavy maintenance for all tram stock is at the ALPHA-02 depot; stock moves there by rail flat consist.

Lookups from the workstation: `consist <id>` (see :x[KB-0042]). Access to this register is limited to holders of the transit engineering compartment under :x[OSC-DIR-0412].

Register kept by Transit Operations, ALPHA-01. Certified correct at Revision 8: D. Harker, Director, Transit Operations, 18 APR 2008.
