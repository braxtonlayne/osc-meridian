---
id: reserves-food
route: /reserves/food
app: reserves
family: reserves
template: record
docNo: OSC-RSV-FOOD
title: "Subsistence Reserves: Food and Water"
marking: TSSCI-OSC
originator: LR/ALPHA-05
revision: 9
date: 2008-05-01
xrefs: [OSC-RSV-IDX, OSC-DIR-0141, OSC-MEM-07-0612]
summary: Network meal stocks and water purification capacity, stock rotation through the cafeteria cycle, and MRE lot inspection results for April 2008.
recordType: RESERVE RECORD
fields:
  - { label: Record, value: OSC-RSV-FOOD, mono: true }
  - { label: Categories, value: "FOOD (subsistence), WATER (treatment)" }
  - { label: Scale, value: "Sustained figure (OSC-MEM-07-0612)" }
  - { label: Ration basis, value: "As determined." }
  - { label: Custodian, value: "Stores Control, Logistics & Reserves, ALPHA-05 Level 6" }
  - { label: Rotation authority, value: "OSC-DIR-0141 para 6" }
  - { label: Next revision, value: "With the JUN 2008 reserve position" }
revisions:
  - { rev: "9", date: "2008-05-01", change: "April lot inspection results; cycle 4 rotation issue; water test schedule moved to para 5.", by: "LR Stores Control" }
  - { rev: "8", date: "2008-02-01", change: "Lot series 05-K entered; condemned lot 04-H-0217 removed from stock.", by: "LR Stores Control" }
  - { rev: "7", date: "2007-11-01", change: "Water purification moved to this record from the former water record.", by: "LR Stores Control" }
---

## Holdings

| Item | Holding | Stated sufficiency |
|---|---|---|
| MRE / long-term storage | :c[reserves.items.FOOD-MRE.value] meals | :c[reserves.items.FOOD-MRE.text] |
| Water purification | :c[reserves.items.WATER-PURIFICATION.value] gallons/day | :c[reserves.items.WATER-PURIFICATION.text] |

Meal holdings are counted in complete meals as packed. Bulk dry stores (flour, rice, sugar, powdered milk) are converted to meals at the pack-equivalent rates in Stores Control Instruction 12 and are included in the meal figure. Fresh and chilled food drawn for the cafeterias is not reserve stock and is not counted.

Water purification is stated as treatment capacity across all staffed facilities. Stored potable water is not a reserve item; it is carried on each site's life support return.

## Stock rotation

Reserve meal stock is rotated first in, first out by lot. A lot is released to the cafeterias when it reaches 48 months from pack date, or earlier if inspection finds it within 12 months of its condition limit. Released stock is replaced from the annual procurement under cover line LI-061 (Emergency Food and Shelter Stocks) before the release is entered, so the holding above does not fall when stock is issued.

| Lot series | Pack period | Lots in series | Release to cafeterias | Status |
|---|---|---|---|---|
| 04-F | JAN to MAR 2004 | 41 | MAY to JUL 2008 | Releasing (cycle 4) |
| 04-G | APR to JUN 2004 | 38 | AUG to OCT 2008 | Held |
| 04-H | JUL to SEP 2004 | 44 | NOV 2008 to JAN 2009 | Held; one lot condemned (rev 8) |
| 05-J | OCT to DEC 2004 | 52 | FEB to APR 2009 | Held |
| 05-K | JAN to MAR 2005 | 57 | MAY to JUL 2009 | Held |

## Cafeteria cycle

Rotated stock is issued through the six-week cafeteria menu cycle under :x[OSC-DIR-0141]. **Cycle 4 of 6 began at 0900Z (0500 EDT) 01 MAY 2008.** Cycle 4 carries the lot 04-F release at two reserve-stock meals per week per diner: the Tuesday midday entree and the Saturday evening meal. Site food service officers record the lot numbers issued on the weekly ration return.

Thursday fish is replaced by baked chicken for cycle 4 owing to a supplier substitution. The substitution does not affect reserve stock.

Diners on special diets authorised by the site medical officer are not issued reserve-stock meals and are not counted in the issue return.

## MRE lot inspection, April 2008

Each lot is sampled at 24, 36 and 42 months from pack date: twelve cases per lot opened, three meals per case examined for pouch integrity, odour, colour and texture, and one meal per case heated and tasted by the inspecting officer.

| Lots inspected | Cases opened | Passed | Passed with remarks | Condemned |
|---|---|---|---|---|
| 19 | 228 | 17 | 2 | 0 |

Remarks: lot 04-G-0104, four cases with crushed corners, contents sound, cases re-banded; lot 05-J-0331, case labels faded, re-labelled from the receipt record. Inspections were carried out at ALPHA-05 Reserves Stacks (Level 7) and at ALPHA-01 and ALPHA-02 site stores.

Inspecting officers are reminded that tasting is recorded on the inspection sheet with the meal menu number. Meals opened for inspection are not returned to stock and are not to be removed from the inspection room.

## Water treatment

Each staffed facility runs a treatment train sized to its berthing: sediment and cartridge filtration, activated carbon, reverse osmosis on the primary train, and ultraviolet disinfection with chlorine residual on distribution. Media and membranes are held at two full changes per train.

| Test | Frequency | Limit | Recorded by |
|---|---|---|---|
| Free chlorine residual, distribution | Each watch | 0.2 to 1.0 mg/L | Life support technician |
| Turbidity, post-filtration | Daily | Below 0.3 NTU | Life support technician |
| Total coliform | Weekly | Absent | Site medical officer |
| Membrane differential pressure | Weekly | Per train data sheet | Facilities Engineering |
| Full chemical panel | Quarterly | Per OSC drinking water table | Medical Services |

April results: all sites within limits. ALPHA-04 filter train 2 ran on reduced media from 14 APR to 22 APR 2008 pending delivery; treatment capacity was not affected.

## Site stocks

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
| Site or class | Meals held | Share of network meal holding | Days at site share of the sustained figure, 3 meals per day | Next delivery |
|---|---|---|---|---|
| ALPHA-05 Reserves Stacks | Central reserve | 31% | Held for redistribution | |
| ALPHA-01 | Site store | 15% | :c[anomalies.MEALS_RATION.figures.daysAtThreeMealsPerDay] | |
| ALPHA-02 | Site store | 11% | :c[anomalies.MEALS_RATION.figures.daysAtThreeMealsPerDay] | |
| ALPHA-03 | Site store | 9% | 630 | JUN 2008 (LR-08-0144) |
| ALPHA-04 | Site store | 8% | :c[anomalies.MEALS_RATION.figures.daysAtThreeMealsPerDay] | |
| BETA class | Site stores | 17% | 540 (class mean) | |
| GAMMA class | Site stores | 9% | 410 (class mean) | |

Site shares follow the allocation table in OSC-MEM-07-0612 Attachment 1. Shares are computed against designated persons for each site, not against site berthing.
:::

## References

:x[OSC-RSV-IDX] Strategic Reserves Position. :x[OSC-DIR-0141] Food Service: Cafeteria Rotation, Dining Hours and Special Diets. :x[OSC-MEM-07-0612] Basis of Reserve Figures.
