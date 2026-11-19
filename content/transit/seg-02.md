---
id: transit-seg-02
route: /transit/segment/02
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-02
title: "Segment Engineering Sheet: Segment 02, ALPHA-01 to ALPHA-02"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-02-15
facility: ALPHA-02
summary: Engineering sheet for rail Segment 02, ALPHA-01 to ALPHA-02, the longest inter-hub segment. Length and running time, 22 block sections, mid-segment station M02, traction power, structures and portal data.
xrefs: [OSC-TRN-ENG, OSC-TRN-TT-08-02, OSC-FAC-ALPHA-01, OSC-FAC-ALPHA-02, OSC-TRN-SEG-03]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-02
  - Tunnel maintenance depot, ALPHA-02
  - Traction power section, FE
  - Facilities Engineering file FE/TS/02
recordType: SEGMENT ENGINEERING SHEET
fields:
  - { label: Segment, value: "02", mono: true }
  - { label: Termini, value: "ALPHA-01 (Level 13, platform 2) to ALPHA-02 (Level 11, platform 1)" }
  - { label: System, value: "Modified maglev, double guideway, twin bore" }
  - { label: Status, value: "IN REVENUE SERVICE" }
  - { label: Intermediate station, value: "M02 (crew relief and refuge; no passenger access)" }
  - { label: Engineering authority, value: "Facilities Engineering, ALPHA-02" }
  - { label: File, value: "FE/TS/02", mono: true }
revisions:
  - { rev: "1", date: "2006-11-27", change: "Issued at commissioning.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2007-03-05", change: "M02 crew relief arrangements; traction substations 02-TP9 to 02-TP12 re-rated.", by: "FE/ALPHA-02" }
  - { rev: "3", date: "2007-08-20", change: "Groundwater inflow figures at shafts 02-V5 and 02-V6 revised after dewatering.", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2008-02-15", change: "Annual review.", by: "FE/ALPHA-02" }
---

## Part A. Segment data

| Item | Entry |
|---|---|
| Hubs | ALPHA-01 to ALPHA-02 |
| Route | :c[railSegments.02.routeNote] |
| Engineering length (mi) | :c[railSegments.02.miles] |
| Running time, published (h) | :c[railSegments.02.hours] |
| Line speed basis | :c[transitTech.railSpeed] |
| Average depth, network | :c[transitTech.averageDepth] |
| Completed (year-month) | :c[railSegments.02.completed] |
| Status | :c[railSegments.02.status] |

Segment 02 is the longest of the six inter-hub segments. It is driven as twin single-guideway bores with cross passages at 1,000 ft centres, not as the single large bore used on Segments 01 and 05. Running time exceeds the eight-hour crew limit in :x[OSC-TRN-TT-08-02], and crews are relieved at station M02.

## Part B. Block sections

Twenty-two block sections, 02-01 at the ALPHA-01 end to 02-22 at the ALPHA-02 end. Blocks 02-11 and 02-12 are the M02 station roads and are worked as station limits.

| Blocks | Section | Grade | Remarks |
|---|---|---|---|
| 02-01 to 02-03 | ALPHA-01 descent | 1 in 70 falling | Shared approach cavern with Segment 06 to block 02-01 only |
| 02-04 to 02-07 | Ohio valley section | Level to 1 in 900 | Groundwater control zone 1 |
| 02-08 to 02-10 | Central lowlands | Level | |
| 02-11, 02-12 | M02 station limits | Level | Crew relief; refuge for 120 persons, 7 days |
| 02-13 to 02-17 | Plains section | 1 in 1,200 rising | Longest unbroken run on the network |
| 02-18 to 02-20 | High plains | 1 in 400 rising | Groundwater control zone 2 |
| 02-21, 02-22 | Front Range ascent to ALPHA-02 | 1 in 55 rising | Steepest ruling grade on the inter-hub network |

## Part C. Traction power

Twelve traction power substations, 02-TP1 to 02-TP12, each feeding two block sections, fed from hub plant at the ends and from the surface grid through shaft cables elsewhere. Substations 02-TP9 to 02-TP12 were re-rated at Revision 2 for the Front Range ascent. Loss of any one substation is covered by its neighbours at reduced speed (120 mph through the affected sections).

## Part D. Structures

The positions of shafts and M02 are recorded by engineering chainage. Surface locations are held on the network geography register.

| Structure | Function | Surface location |
|---|---|---|
| 02-V1 | Ventilation | :r[Loudoun County, VA; utility substation compound]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V2 | Ventilation, egress | :r[Garrett County, MD; gas storage wellsite]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V3 | Ventilation, traction feed | :r[Muskingum County, OH; pipeline compressor station]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V4 | Ventilation, egress | :r[Vigo County, IN; well field pumping house]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| M02 | Crew relief station, refuge | :r[Macoupin County, IL; geological survey core store]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V5 | Ventilation, dewatering | :r[Audrain County, MO; water district booster station]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V6 | Ventilation, dewatering | :r[Saline County, KS; utility substation compound]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V7 | Ventilation, egress | :r[Kit Carson County, CO; seismic survey station]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |
| 02-V8 | Ventilation | :r[Adams County, CO; communications relay compound]{compartment=SEXTANT auth="FE" ref="OSC-CB-013"} |

Cross passages: 1,000 ft centres throughout, fire doors normally closed, door state on the board as a block attribute.

## Part E. Portals and seal doors

:::redact{compartment=KESTREL auth="FE" ref="OSC-CB-011"}
| Portal | Seal doors | Rating | Last walk-down | Condition |
|---|---|---|---|---|
| ALPHA-01 (west portal, Level 13) | PD02-1A, PD02-1B, double leaf, hydraulic | Blast and NBC | 11 JAN 2008 | Seals serviceable. Leaf B hydraulic accumulator recharged. |
| M02 north and south | PD02-M1, PD02-M2 | NBC | 25 JAN 2008 | Serviceable |
| ALPHA-02 (east portal, Level 11) | PD02-2A, PD02-2B | Blast and NBC | 08 FEB 2008 | Seal gasket PD02-2A lower edge compression set; replacement scheduled under FE-08-0133 |

Portal seal doors close automatically on a facility SEALED state and are interlocked with the block signals either side. A closed seal door shows the adjacent block POSSESSED on the board.
:::

## Part F. Commissioning

TBM drives: four machines, two from each end, 2002 to 2006, with the M02 station cavern excavated from shaft 02-V4 and the two bores met at blocks 02-11 and 02-12. Witnessed acceptance run 14 NOV 2006, consist R02-101. Entered revenue service 27 NOV 2006.

## Part G. Possessions and defects

Possessions in the 12 months to JAN 2008: eleven, all at night and all surrendered on time. Six were for groundwater control works at 02-V5 and 02-V6. Open defects: D02-11 (cross passage door CP-417 slow to close, Category C); D02-14 (02-V6 inflow above design, pumps running continuously, Category B, monitored weekly).

Signed I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 15 FEB 2008.
