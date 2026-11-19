---
id: transit-seg-03
route: /transit/segment/03
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-03
title: "Segment Engineering Sheet: Segment 03, ALPHA-02 to ALPHA-04"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-02-15
facility: ALPHA-04
summary: Engineering sheet for rail Segment 03, ALPHA-02 to ALPHA-04. Length, running time, 11 block sections, fault crossings, commissioning record and possessions; seismic isolation detail is compartmented.
xrefs: [OSC-TRN-ENG, OSC-TRN-TT-08-02, OSC-FAC-ALPHA-02, OSC-FAC-ALPHA-04]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-02
  - Tunnel maintenance depots, ALPHA-02 and ALPHA-04
  - Facilities Engineering file FE/TS/03
recordType: SEGMENT ENGINEERING SHEET
fields:
  - { label: Segment, value: "03", mono: true }
  - { label: Termini, value: "ALPHA-02 (Level 11, platform 2) to ALPHA-04 (Level 10, platform 1)" }
  - { label: System, value: "Modified maglev, double guideway" }
  - { label: Status, value: "IN REVENUE SERVICE" }
  - { label: Seismic zone, value: "High. Isolated guideway over 4 fault crossings" }
  - { label: File, value: "FE/TS/03", mono: true }
revisions:
  - { rev: "1", date: "2006-08-28", change: "Issued at commissioning.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2006-12-11", change: "Bearing inspection interval reduced from 6 to 3 months at SJ03-2.", by: "FE/ALPHA-02" }
  - { rev: "3", date: "2007-07-02", change: "Post-event inspection after minor regional earthquake of 26 APR 2007 (no damage).", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2008-02-15", change: "Annual review.", by: "FE/ALPHA-02" }
---

**Segment 03. ALPHA-02 to ALPHA-04. :c[railSegments.03.routeNote].**

Engineering length :c[railSegments.03.miles] mi. Published running time :c[railSegments.03.hours] h on a line speed basis of :c[transitTech.railSpeed]. Completed :c[railSegments.03.completed]. Status :c[railSegments.03.status]. Hardening: :c[transitTech.hardening].

## 1. Alignment

The segment leaves ALPHA-02 westward under the Front Range, crosses beneath the Colorado Plateau at its greatest cover, and enters the Basin and Range province in western Utah. From there to ALPHA-04 it crosses alternating ranges and basins and four mapped active faults. Single bore, 31 ft internal diameter, double guideway. Ruling grade 1 in 90.

## 2. Block sections

| Block | Extent | Remarks |
|---|---|---|
| 03-01 | ALPHA-02 platform 2 to shaft 03-V1 | Shared depot connection to Level 10 (ALPHA-02 heavy maintenance road) |
| 03-02 | 03-V1 to 03-V2 | |
| 03-03 | 03-V2 to crossover X03-1 | |
| 03-04 | X03-1 to plateau summit | Deepest point of segment |
| 03-05 | Summit to 03-V3 | |
| 03-06 | 03-V3 to SJ03-1 | Fault crossing 1 |
| 03-07 | SJ03-1 to SJ03-2 | Fault crossing 2; 3-monthly bearing inspection |
| 03-08 | SJ03-2 to crossover X03-2 | |
| 03-09 | X03-2 to SJ03-3 | Fault crossing 3 |
| 03-10 | SJ03-3 to SJ03-4 | Fault crossing 4 |
| 03-11 | SJ03-4 to ALPHA-04 platform 1 | Stabling siding for one consist |

## 3. Commissioning

| Stage | Date |
|---|---|
| TBM drives complete (three machines) | 30 NOV 2005 |
| Isolation bearings installed and load-tested | JAN to APR 2006 |
| Witnessed acceptance run, consist R03-050 | 15 AUG 2006 |
| Entered revenue service | 28 AUG 2006 |

## 4. Seismic isolation

General: guideway over each fault crossing is carried on isolation bearings with sliding joints at each end. Trains are stopped automatically on a ground acceleration trip at any of the segment's accelerometers.

:::redact{compartment=KESTREL auth="FE" ref="OSC-CB-011"}
| Crossing | Joint | Design offset (in) | Bearings | Trip setting | Last inspection | Finding |
|---|---|---|---|---|---|---|
| Fault 1 | SJ03-1 | 18 | 24 lead-rubber | 0.05 g | 14 JAN 2008 | No defect |
| Fault 2 | SJ03-2 | 26 | 32 friction pendulum | 0.04 g | 09 FEB 2008 | Bearing B14 slider wear at 62% of limit; next inspection brought forward to 09 MAY 2008 |
| Fault 3 | SJ03-3 | 16 | 20 lead-rubber | 0.05 g | 14 JAN 2008 | No defect |
| Fault 4 | SJ03-4 | 20 | 24 lead-rubber | 0.05 g | 14 JAN 2008 | Drainage at north abutment cleared |

After the minor regional earthquake of 26 APR 2007 the segment was stopped by accelerometer trip for 3 h 40 min. Walk-down of all four crossings found no displacement. Bearing displacement records are kept on file FE/TS/03/SI and are not reproduced here.
:::

## 5. Possessions (12 months to JAN 2008)

Nine possessions: four quarterly bearing inspections, two additional inspections at SJ03-2, the post-event walk-down of 26 APR 2007 (emergency possession, granted by Transit Control at 1912Z (1312 MDT) and surrendered 2252Z (1652 MDT)), one guideway coil replacement in block 03-08 and one stabling siding repaint at ALPHA-04. No paths were lost other than on 26 APR 2007.

## 6. Open defects

D03-09: Accelerometer A03-7 intermittent communications fault; reading duplicated from A03-8 meanwhile. Category B.
D03-10: Stabling siding lighting, ALPHA-04, two fittings out. Category C.

Signed I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 15 FEB 2008.
