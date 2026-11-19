---
id: transit-seg-04
route: /transit/segment/04
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-04
title: "Segment Engineering Sheet: Segment 04, ALPHA-02 to ALPHA-05 (Commissioning Sheet)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 2
date: 2007-03-30
facility: ALPHA-05
summary: Commissioning sheet for rail Segment 04, ALPHA-02 to ALPHA-05. Length and running time, 12 block sections, commissioning tests, status NOT IN REVENUE SERVICE, crew and portal seal walk-down arrangements.
xrefs: [OSC-TRN-POS-08-044, OSC-TRN-INC-08-017, OSC-FAC-ALPHA-02, OSC-FAC-ALPHA-05, OSC-TRN-ENG, OSC-TRN-TT-08-02]
distribution:
  - Chief Engineer, Facilities Engineering
  - Director, Transit Operations
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Facilities Engineering file FE/TS/04
recordType: SEGMENT COMMISSIONING SHEET
fields:
  - { label: Segment, value: "04", mono: true }
  - { label: Termini, value: "ALPHA-02 (Level 11, platform 3) to ALPHA-05 (Level 11, platform 7)" }
  - { label: System, value: "Modified maglev, double guideway" }
  - { label: Sheet type, value: "Commissioning (replaces engineering sheet until entry into revenue service)" }
  - { label: File, value: "FE/TS/04", mono: true }
revisions:
  - { rev: "1", date: "2007-03-16", change: "Issued on completion of works.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2007-03-30", change: "Commissioning tests recorded. Status entered.", by: "FE/ALPHA-02" }
---

## Block 1. Segment

| | |
|---|---|
| Segment number | 04 |
| From | ALPHA-02 |
| To | ALPHA-05 |
| Route | :c[railSegments.04.routeNote] |
| Engineering length (mi) | :c[railSegments.04.miles] |
| Design running time (h) | :c[railSegments.04.hours] |
| Line speed basis | :c[transitTech.railSpeed] |
| Works completed (year-month) | :c[railSegments.04.completed] |

## Block 2. Status

| | |
|---|---|
| Status | NOT IN REVENUE SERVICE |
| Reason: | |
| Status entered by | O. Garrity, 30 MAR 2007 |

## Block 3. Block sections

Twelve block sections, numbered from the ALPHA-05 end: 04-01 (ALPHA-05 platform 7 throat) to 04-12 (ALPHA-02 platform 3 throat). Detection by guideway section occupancy, duplicated, reported to the Network Control board. Board line style for a segment not in revenue service: dashed.

| Blocks | Section | Grade |
|---|---|---|
| 04-01, 04-02 | ALPHA-05 ascent, Edwards Plateau | 1 in 75 rising |
| 04-03 to 04-06 | Llano Estacado | Level to 1 in 1,000 |
| 04-07 to 04-09 | Raton section, crossover X04-1 at 04-08 | 1 in 300 rising |
| 04-10 to 04-12 | Front Range approach to ALPHA-02 | 1 in 60 rising |

## Block 4. Commissioning tests

| Test | Date | Result | Witness |
|---|---|---|---|
| Guideway alignment survey, full length | 05 MAR 2007 | Within tolerance | FE |
| Traction power energisation, 04-TP1 to 04-TP7 | 07 MAR 2007 | Passed | FE |
| Train detection, all 12 blocks, both systems | 09 MAR 2007 | Passed | FE, TO |
| Portal seal doors PD04-1A/B, PD04-2A/B, close and hold | 12 MAR 2007 | Passed | FE, SFC |
| Ventilation, all shafts, normal and smoke modes | 13 MAR 2007 | Passed | FE |
| Dynamic test runs (18), consists R04-001, R04-002 | 14 to 21 MAR 2007 | Passed | FE, TO |
| Witnessed acceptance run, consist R04-001 | 23 MAR 2007 | Passed | FE, TO |
| Refuge chambers R04-1, R04-2 stocked | 26 MAR 2007 | Passed | LR |

Works complete and tests passed. Segment handed to Transit Operations for control 30 MAR 2007.

## Block 5. Commissioning crew

:::redact{compartment=KESTREL auth="FE" ref="OSC-CB-011"}
| Name | Personnel no. | Post | Remarks |
|---|---|---|---|
| O. Garrity | P-3-05-0288 | Tunnel Structures Engineer | Engineer in charge |
| A. Delacroix | P-3-04-0371 | Traction Power Engineer | |
| M. Quarles | P-4-05-0912 | Guideway Technician | |
| R. Tobin | P-3-05-0142 | Tunnel Survey Technician | Alignment survey, 05 MAR 2007. :r[Status changed 19 APR 2007.]{compartment=HOLLOW auth="PV" ref="OSC-CB-012"} |
| F. Nakashima | P-4-06-0458 | Ventilation Technician | |
| J. Beaudry | P-3-03-0219 | Signal and Detection Engineer (TO) | Detection tests |
:::

## Block 6. Maintenance after commissioning

:::redact{compartment=KESTREL auth="FE" ref="OSC-CB-011"}
Walk-down: Monthly, portal seals, both ends. Possession booked by FE; times by arrangement with Transit Control.

Guideway, detection and traction power: no routine maintenance while the segment is not in revenue service. Ventilation in standby mode; shafts run 2 hours weekly. Refuge chambers rotated with ALPHA-05 stocks.
:::

## Block 7. Signature

Commissioning sheet signed:

O. Garrity, Tunnel Structures Engineer, Facilities Engineering, ALPHA-02. 30 MAR 2007.

## Register notes (Transit Operations)

Entered by the possession register; not part of the sheet as signed. Possessions against Segment 04 are recorded in the possession register, current entry :x[OSC-TRN-POS-08-044]. Incident log references: :x[OSC-TRN-INC-08-017].
