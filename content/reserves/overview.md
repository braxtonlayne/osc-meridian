---
id: reserves-overview
route: /reserves
app: reserves
family: reserves
template: index
docNo: OSC-RSV-IDX
title: Strategic Reserves Position, MAY 2008
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 17
date: 2008-05-01
xrefs: [OSC-MEM-07-0612, OSC-RSV-FOOD, OSC-RSV-MED, OSC-RSV-ENERGY, OSC-RSV-ARMS, OSC-RSV-SEED, OSC-RSV-GENE]
summary: Network reserves by category at the sustained-capacity scale, with burn-down calculators for meals, pharmaceutical years and generator runtime.
distribution:
  - Director, Logistics & Reserves (ALPHA-05)
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Chief Engineer, Facilities Engineering (ALPHA-02)
  - Director, Medical Services (ALPHA-05)
  - Commandant, Security Forces Command (ALPHA-02)
  - Chief, Records Division (ALPHA-03)
  - Comptroller (ALPHA-01)
  - File
entries:
  - { docNo: OSC-MEM-07-0612, title: "Basis of Reserve Figures: Sustained Capacity and Surge Berthing", route: /reserves/memo/mem-07-0612, date: 2007-06-18, marking: "TOP SECRET//SCI//OSC", note: "Definitions used on every reserve page." }
  - { docNo: OSC-RSV-FOOD, title: "Subsistence Reserves: Food and Water", route: /reserves/food, date: 2008-05-01, marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-RSV-MED, title: "Medical Reserves: Pharmaceuticals, Surgical Capability and Blood Products", route: /reserves/medical, date: 2008-04-22, marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-RSV-ENERGY, title: "Energy Reserves: Reactor Plant, Diesel Backup and Surface Renewables", route: /reserves/energy, date: 2008-05-05, marking: "UMBRA//OSC COMPARTMENTED", note: "Reactor status pages are listed on this record." }
  - { docNo: OSC-RSV-ARMS, title: "Armaments Reserve", route: /reserves/arms, date: 2008-03-03, marking: "UMBRA//OSC COMPARTMENTED", note: "Tier 2." }
  - { docNo: OSC-RSV-SEED, title: "Agricultural Seed Collection, ALPHA-03 (Catalogue)", route: /reserves/seed-vault, date: 2008-05-09, marking: "TOP SECRET//SCI//OSC", note: "Records Division custody." }
  - { docNo: OSC-RSV-GENE, title: "Biological Sample Collection, ALPHA-03 (Catalogue)", route: /reserves/genetic-vault, date: 2008-05-09, marking: "UMBRA//OSC COMPARTMENTED", note: "Records Division custody." }
---

**Position as at 0001Z 01 MAY 2008.** Issued on the first working day of each month by the Logistics & Reserves Division, Stores Control, ALPHA-05 Level 6. This revision supersedes the position of 01 APR 2008 (revision 16), which is to be destroyed on receipt of this revision. Action officer: Reserve Position Clerk, Stores Control, extension 5-2210.

Quantities are stated at full network scale against a sustained capacity of :c[headline.capacitySustained] persons, as defined in :x[OSC-MEM-07-0612]. Facility berthing figures are not used in this position. Where a holding is a rate (water treatment) or a duration (pharmaceutical supply, generator runtime), the duration is the period the holding supports at that scale.

## Network position by category

| Category | Item | Holding | Stated basis | Record |
|---|---|---|---|---|
| FOOD | MRE / long-term storage | :c[reserves.items.FOOD-MRE.value] meals | :c[reserves.items.FOOD-MRE.text] | :x[OSC-RSV-FOOD] |
| FOOD | Agricultural seed collection | :c[reserves.items.FOOD-SEED.value] samples | Held at ALPHA-03, Level 8 | :x[OSC-RSV-SEED] |
| WATER | Water purification | :c[reserves.items.WATER-PURIFICATION.value] gallons/day | Treatment capacity, network-wide | :x[OSC-RSV-FOOD] |
| MEDICAL | Pharmaceutical stockpiles | :c[reserves.items.MED-PHARMA.value] years | Supply at capacity | :x[OSC-RSV-MED] |
| MEDICAL | Surgical facilities | :c[reserves.items.MED-SURGICAL.value] operating rooms | Network-wide | :x[OSC-RSV-MED] |
| MEDICAL | Blood and plasma storage | :c[reserves.items.MED-BLOOD.value] units | Issued-unit equivalent | :x[OSC-RSV-MED] |
| MEDICAL | Biological sample collection | :r[:c[reserves.items.MED-GENETIC.value]{auth="RD" ref="RD-07-0231"} samples]{compartment=LANTERN auth="RD" ref="RD-07-0110"} | Held at ALPHA-03, Level 9 | :x[OSC-RSV-GENE] |
| ENERGY | Nuclear reactor plant | :c[reserves.items.ENERGY-NUCLEAR.value]{auth="LR" ref="LR-07-0314"} installations | Station load at host sites | :x[OSC-RSV-ENERGY] |
| ENERGY | Diesel generator backup | :c[reserves.items.ENERGY-DIESEL.value] days runtime | All facilities | :x[OSC-RSV-ENERGY] |
| ENERGY | Renewable integration | Not stated as a quantity | :c[reserves.items.ENERGY-RENEWABLE.text] | :x[OSC-RSV-ENERGY] |
| ARMAMENTS | Small arms | :r[:c[reserves.items.ARMS-SMALL.value]{auth="SFC" ref="SFC-07-0068"} weapons]{tier=2 auth="SFC" ref="SFC-07-0068"} | :r[Full capacity plus reserve, five per armed position]{tier=2 auth="SFC" ref="SFC-07-0068"} | :x[OSC-RSV-ARMS] |
| ARMAMENTS | Ammunition | :r[:c[reserves.items.ARMS-AMMUNITION.value]{auth="SFC" ref="SFC-07-0068"} rounds]{tier=2 auth="SFC" ref="SFC-07-0068"} | :r[All calibres on issue]{tier=2 auth="SFC" ref="SFC-07-0068"} | :x[OSC-RSV-ARMS] |
| ARMAMENTS | :r[Heavy weapon systems]{tier=1 auth="CS" ref="CS-07-012"} | :r[Holdings by system and bay, ALPHA-02 and ALPHA-05]{tier=1 auth="CS" ref="CS-07-012"} | :r[Council schedule]{tier=1 auth="CS" ref="CS-07-012"} | :r[Not indexed]{tier=1 auth="CS" ref="CS-07-012"} |

Holdings are reported from the site returns of 25 APR 2008. All five ALPHA returns and all BETA returns were received by the closing date. Two GAMMA returns were received after the closing date and are included at their March figures; the April figures will be carried in revision 18. No DELTA cache return is required for this position.

## Planning calculators

The Reserves application provides three burn-down calculators. The figures below are each calculator's default case, reproduced so that this record is complete when printed. A calculator result is a planning figure, not a reserve position, and is not to be quoted in correspondence without its inputs.

**Meals against population and time**

| Input or result | Default |
|---|---|
| Meal stock | :c[reserves.items.FOOD-MRE.value] meals |
| Population | :c[headline.capacitySustained] persons |
| Meals per person per day | 3 |
| Result: days of supply | :c[anomalies.MEALS_RATION.figures.daysAtThreeMealsPerDay] days |

**Pharmaceutical years**

| Input or result | Default |
|---|---|
| Stated supply | :c[reserves.items.MED-PHARMA.value] years at capacity |
| Population | :c[headline.capacitySustained] persons |
| Result: years of supply | :c[reserves.items.MED-PHARMA.value] years |

**Generator runtime**

| Input or result | Default |
|---|---|
| Stated runtime | :c[reserves.items.ENERGY-DIESEL.value] days, all facilities |
| Reactor plant available | No |
| Surface renewable supply credited | No |
| Result: days of runtime | :c[reserves.items.ENERGY-DIESEL.value] days |

Calculator inputs may be changed by any user. Changed inputs are not saved with the record and are not reported to Logistics & Reserves.

## Positions by site

Site positions are held under compartment TALLOW and are released to holders only.

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Site or class | Food | Water treatment | Medical | Diesel fuel | Return received |
|---|---|---|---|---|---|
| ALPHA-01 | 100% of allocation | 100% | 98% | 100% | 24 APR 2008 |
| ALPHA-02 | 100% | 100% | 100% | 97% | 23 APR 2008 |
| ALPHA-03 | 94% | 100% | 100% | 100% | 25 APR 2008 |
| ALPHA-04 | 100% | 92% (filter train 2 media) | 100% | 100% | 24 APR 2008 |
| ALPHA-05 (incl. Reserves Stacks) | 100% | 100% | 100% | 100% | 25 APR 2008 |
| BETA class (12 returns) | 81% | 100% | 76% | 88% | 25 APR 2008 |
| GAMMA class (18 returns) | 64% | 100% | 58% | 71% | 29 APR 2008 (2 late) |
| DELTA caches | Not reported | Not reported | Not reported | Not reported | |

Allocations are sized to the sustained figure, distributed by the site share table of OSC-MEM-07-0612 Attachment 1. Berths above the sustained figure carry no allocation. ALPHA-03 food is below allocation pending the June tram movement from the Reserves Stacks (movement order LR-08-0144).
:::

## Notes

1. Armaments lines are shown to Tier 2 and above. Heavy weapon systems are not reported in this position at any tier below the Council and are carried here as a line only.
2. The biological sample collection is a Records Division holding and is reported here for completeness. It is not a medical stock and is not drawn on.
3. Corrections to this position are made by the next monthly revision, not by amendment. Queries to the action officer, Stores Control, before 1800Z (1300 CDT) on working days.
