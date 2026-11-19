---
id: reserves-medical
route: /reserves/medical
app: reserves
family: reserves
template: record
docNo: OSC-RSV-MED
title: "Medical Reserves: Pharmaceuticals, Surgical Capability and Blood Products"
marking: TSSCI-OSC
originator: MS/ALPHA-05
revision: 6
date: 2008-04-22
xrefs: [OSC-RSV-GENE, OSC-DIR-0204, OSC-F-152, OSC-RSV-IDX]
summary: Pharmaceutical supply at capacity, network operating rooms, blood and plasma storage, and the rotation and expiry procedure for medical stock.
recordType: RESERVE RECORD
fields:
  - { label: Record, value: OSC-RSV-MED, mono: true }
  - { label: Category, value: MEDICAL }
  - { label: Scale, value: "Sustained figure (OSC-MEM-07-0612)" }
  - { label: Custodian, value: "Medical Services Directorate, ALPHA-05 Level 5" }
  - { label: Stock reporting, value: "Logistics & Reserves, Stores Control" }
  - { label: Controlled drugs register, value: "MS-CDR, two-signature" }
revisions:
  - { rev: "6", date: "2008-04-22", change: "Expiry write-off for Q1 2008; readiness notice added.", by: "MS Pharmacy Section" }
  - { rev: "5", date: "2008-01-21", change: "Frozen red cell storage at BETA sites restated as issued-unit equivalent.", by: "MS Pharmacy Section" }
---

## Holdings

| Item | Holding | Basis |
|---|---|---|
| Pharmaceutical stockpiles | :c[reserves.items.MED-PHARMA.text] | Formulary items at the full-scale consumption table |
| Surgical facilities | :c[reserves.items.MED-SURGICAL.value] operating rooms | :c[reserves.items.MED-SURGICAL.text] |
| Blood and plasma storage | :c[reserves.items.MED-BLOOD.value] units | Issued-unit equivalent |

Pharmaceutical supply is the period for which formulary stock meets the consumption table at full scale. The consumption table is set by the Director, Medical Services, and was last revised in October 2007. Items held below their table line are listed in the shortfall annex, issued separately to site medical officers.

Operating rooms are counted where a room is fitted, equipped and maintained to the theatre standard. The count does not depend on whether a surgical team is posted to the site. Theatre staffing is set by each clinic's establishment and is reported on the medical readiness return, not on this record.

Blood products are held as frozen red cells (glycerolised, stored at -65 C or colder) and fresh frozen plasma (-18 C or colder). Frozen red cells are counted in issued units after deglycerolisation losses. Liquid red cells drawn for routine clinical use are not reserve stock.

## Rotation and expiry

1. Formulary stock is rotated to site clinics for routine use not later than 12 months before expiry. The clinic draws rotated stock before stock from routine supply.
2. Items within 6 months of expiry that cannot be rotated are submitted for the shelf-life extension programme. Lots accepted for extension are relabelled with the extended date and the extension reference; lots rejected are written off.
3. Write-offs are destroyed at the site of holding, witnessed by the site medical officer and one other, and entered on the destruction record. Controlled drugs are destroyed only in the presence of the Resident Assurance Officer or a nominee.
4. Frozen red cells are held to a ten-year storage limit. Fresh frozen plasma is held to its labelled date.
5. Cold chain items (2 to 8 C) are logged twice daily. Any excursion is reported to the Pharmacy Section, ALPHA-05, before the end of the watch, and the affected stock is quarantined pending a decision.

| Quarter | Lots rotated to clinics | Submitted for extension | Extended | Written off |
|---|---|---|---|---|
| Q2 2007 | 212 | 38 | 31 | 7 |
| Q3 2007 | 198 | 44 | 40 | 4 |
| Q4 2007 | 240 | 51 | 43 | 8 |
| Q1 2008 | 226 | 47 | 41 | 6 |

The Q1 2008 write-off includes two lots of an oral antibiotic quarantined after a refrigerator door alarm at a GAMMA site clinic was found disconnected. The alarm has been reconnected and the clinic's log reviewed.

> **MEDICAL READINESS CERTIFICATIONS EXPIRING 31 MAY 2008.** Annual readiness certifications under :x[OSC-DIR-0204] that expire on 31 MAY 2008 are to be renewed before that date. At ALPHA-03, appointments are offered on 21 MAY 2008 from 1300Z (0900 EDT) to 2000Z (1600 EDT); request a slot on :x[OSC-F-152]. Personnel with lapsed medical readiness are removed from the seal roster on 01 JUN 2008. Pharmacy Section staff are reminded that their own certifications are included.

## Biological samples

The biological sample collection at ALPHA-03 is a Records Division holding. It is not medical stock, is not drawn on for clinical use, and is not reported on this record. See :x[OSC-RSV-GENE].

## Site stocks

:::redact{compartment=TALLOW auth="MS" ref="OSC-CB-014"}
| Site or class | Formulary at table line | Frozen red cells | FFP | Shortfall items |
|---|---|---|---|---|
| ALPHA-01 | 100% | Held | Held | 0 |
| ALPHA-02 | 100% | Held | Held | 1 |
| ALPHA-03 | 100% | Held | Held | 0 |
| ALPHA-04 | 98% | Held | Held | 2 |
| ALPHA-05 | 100% | Central holding | Central holding | 0 |
| BETA class | 82% | Held at 4 sites | Held at 12 sites | 19 |
| GAMMA class | 61% | Not held | Held at 9 sites | 44 |
| DELTA caches | Medical cache only | Not held | Not held | Not reported |

Shortfall items are formulary lines held below the consumption table. GAMMA shortfalls are concentrated at the sites completed in 2007 and are programmed for the FY2009 procurement.
:::

Point of contact: Pharmacy Section, Medical Services Directorate, ALPHA-05, extension 5-1140. Reserve totals are reported to Logistics & Reserves for :x[OSC-RSV-IDX].
