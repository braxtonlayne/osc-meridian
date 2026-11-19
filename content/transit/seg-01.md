---
id: transit-seg-01
route: /transit/segment/01
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-01
title: "Segment Engineering Sheet: Segment 01, ALPHA-01 to ALPHA-03"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-02-15
facility: ALPHA-03
summary: Engineering sheet for rail Segment 01, ALPHA-01 to ALPHA-03. Alignment, block sections, length and running time, commissioning record, structures, possessions history and open defects.
xrefs: [OSC-TRN-ENG, OSC-TRN-TT-08-02, OSC-FAC-ALPHA-01, OSC-FAC-ALPHA-03, OSC-DIR-0262]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Tunnel maintenance depot, ALPHA-02
  - Platform supervisors, ALPHA-01 and ALPHA-03
  - Facilities Engineering file FE/TS/01
recordType: SEGMENT ENGINEERING SHEET
fields:
  - { label: Segment, value: "01", mono: true }
  - { label: Termini, value: "ALPHA-01 (Level 13, platform 1) to ALPHA-03 (Level 12, platform 1)" }
  - { label: System, value: "Modified maglev, double guideway" }
  - { label: Status, value: "IN REVENUE SERVICE" }
  - { label: Engineering authority, value: "Facilities Engineering, ALPHA-02" }
  - { label: Operating authority, value: "Transit Operations, Network Control, ALPHA-01" }
  - { label: File, value: "FE/TS/01", mono: true }
revisions:
  - { rev: "1", date: "2004-12-20", change: "Issued at commissioning.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2005-09-12", change: "Block 01-04 signal section split; speed restriction at the Pine Mountain fault crossing lifted.", by: "FE/ALPHA-02" }
  - { rev: "3", date: "2006-11-30", change: "Ventilation shaft 01-V2 fan replacement recorded.", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2008-02-15", change: "Annual review. Possession history brought forward to JAN 2008. Defect D01-07 added.", by: "FE/ALPHA-02" }
---

## 1. Identification

| Item | Entry |
|---|---|
| Segment | 01 |
| Hubs | ALPHA-01 to ALPHA-03 |
| Route | :c[railSegments.01.routeNote] |
| Engineering length (mi) | :c[railSegments.01.miles] |
| Running time, published (h) | :c[railSegments.01.hours] |
| Line speed basis | :c[transitTech.railSpeed] |
| Completed (year-month) | :c[railSegments.01.completed] |
| Status | :c[railSegments.01.status] |
| Hardening | :c[transitTech.hardening] |

Lengths on this sheet are engineering lengths from alignment survey. They are the figures used for maintenance, possession planning and the dispatcher board. They are not reporting figures. See :x[OSC-TRN-ENG].

## 2. Alignment

Single bored tunnel, 31 ft finished internal diameter, carrying two guideways with a central walkway and fire separation wall. The alignment leaves the ALPHA-01 terminal cavern westbound on a falling grade, passes under the Shenandoah valley and the Allegheny front at its deepest point, and rises on a long eastbound grade into the ALPHA-03 terminal cavern.

| Section | Description | Ruling grade | Cover (ft, approx.) |
|---|---|---|---|
| A | ALPHA-01 terminal cavern to shaft 01-V1 | 1 in 60 falling | 2,050 to 1,600 |
| B | Shaft 01-V1 to valley crossing | 1 in 400 falling | 1,600 to 900 |
| C | Allegheny front, crossover cavern X01-1 | Level | 900 to 1,400 |
| D | Plateau section to shaft 01-V2 | 1 in 500 rising | 1,400 to 800 |
| E | Pine Mountain fault crossing, seismic joint SJ01-3 | Level | 800 |
| F | Shaft 01-V3 to ALPHA-03 terminal cavern | 1 in 80 rising | 800 to 1,150 |

Minimum curve radius 5.2 mi (sections A and F only). The Pine Mountain fault crossing carries a sliding seismic joint with 14 in of design offset; inspection is quarterly under possession.

## 3. Block sections

Six block sections, numbered from the ALPHA-01 end. Board designation is segment and serial (01-01 to 01-06). Detection is by guideway section occupancy, duplicated.

| Block | Extent | Signals | Notes |
|---|---|---|---|
| 01-01 | ALPHA-01 platform 1 throat to shaft 01-V1 | S1/1, S1/2 | Platform starter interlocked with crew change board |
| 01-02 | Shaft 01-V1 to valley crossing | S1/3 | |
| 01-03 | Valley crossing to crossover X01-1 | S1/4 | Crossover normally locked |
| 01-04 | X01-1 to shaft 01-V2 | S1/5, S1/5A | Split at Revision 2 |
| 01-05 | Shaft 01-V2 to shaft 01-V3 | S1/6 | Includes SJ01-3 |
| 01-06 | Shaft 01-V3 to ALPHA-03 platform 1 | S1/7 | Approach release at 1.5 mi |

## 4. Commissioning

| Stage | Date | Remarks |
|---|---|---|
| TBM breakthrough, ALPHA-03 drive | 14 MAR 2004 | Drive from ALPHA-01 met at chainage of crossover X01-1 |
| Guideway energised | 22 SEP 2004 | Traction power substations 01-TP1 to 01-TP4 |
| Dynamic testing | OCT to NOV 2004 | 41 test runs, unloaded and loaded |
| Witnessed acceptance run | 09 DEC 2004 | Consist R01-201, full length, both directions |
| Entered revenue service | 20 DEC 2004 | First booked path 1D01 |

First segment of the inter-hub network to enter revenue service.

## 5. Structures and services

| Structure | Function | Surface expression |
|---|---|---|
| Shaft 01-V1 | Ventilation, emergency egress | Utility substation compound |
| Shaft 01-V2 | Ventilation, traction power feed | Pumping station building |
| Shaft 01-V3 | Ventilation, emergency egress | Geological survey borehole site |
| Crossover X01-1 | Single-lead crossover, refuge chamber R01-1 (40 persons, 72 h) | None |
| Seismic joint SJ01-3 | Fault crossing | None |

Refuge chambers are stocked under the facility schedule of the nearer hub. Shaft headworks are maintained under the cover arrangements of the agency named on the gate.

## 6. Emergency movement priorities

:::redact{tier=2 auth="TO" ref="TO-07-041"}
On declaration of a continuity condition, Segment 01 is worked as a priority corridor from ALPHA-01 to ALPHA-03 for the first 36 hours. Booked paths are cancelled. Movements are released by Network Control in the order: (1) Records Division reception party and continuity-of-knowledge holdings consigned under the standing list; (2) personnel on the ALPHA-03 seal roster not on site; (3) materiel for the seed and biological collections. Return paths run empty unless Transit Control directs otherwise. Platform 1 at ALPHA-01 and platform 1 at ALPHA-03 are held clear for Segment 01 throughout.
:::

## 7. Possessions history (12 months to JAN 2008)

| Possession | Date | Times | Blocks | Purpose | Engineer in charge |
|---|---|---|---|---|---|
| 07-011 | 24 FEB 2007 | 0400Z-0800Z (2300-0300 EST) | 01-05 | Seismic joint inspection, quarterly | T. Aske |
| 07-029 | 19 MAY 2007 | 0400Z-0900Z (0000-0500 EDT) | 01-05 | Seismic joint inspection, quarterly | T. Aske |
| 07-036 | 16 JUN 2007 | 0300Z-0800Z (2300-0400 EDT) | 01-02 | Shaft 01-V1 fan bearing change | L. Fairweather |
| 07-058 | 18 AUG 2007 | 0400Z-0800Z (0000-0400 EDT) | 01-05 | Seismic joint inspection, quarterly | T. Aske |
| 07-071 | 06 OCT 2007 | 0200Z-0900Z (2200-0500 EDT) | 01-03, 01-04 | Crossover X01-1 point machine overhaul | L. Fairweather |
| 07-089 | 17 NOV 2007 | 0500Z-0900Z (0000-0400 EST) | 01-05 | Seismic joint inspection, quarterly | T. Aske |
| 08-006 | 19 JAN 2008 | 0500Z-1000Z (0000-0500 EST) | 01-01 | Platform 1 throat guideway gap survey | M. Quarles |

All possessions surrendered to Network Control on time. No booked path cancelled.

## 8. Open defects

| Defect | Location | Description | Category | Action |
|---|---|---|---|---|
| D01-04 | Block 01-03 | Drainage channel silt at low point, recurring | C | Clean at each possession of 01-03 |
| D01-06 | Refuge chamber R01-1 | Door closer slow to latch | C | Replacement closer on order, LR stores |
| D01-07 | Block 01-06 | Guideway gap 0.6 mm over tolerance, approach to ALPHA-03 platform 1 | B | Speed restriction 60 mph over 0.3 mi until shimmed. Next possession of 01-06 |

Signed for Facilities Engineering:

I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 15 FEB 2008.
