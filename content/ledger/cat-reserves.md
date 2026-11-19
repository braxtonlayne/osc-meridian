---
id: ledger-cat-reserves
route: /ledger/category/reserves
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-CAT-RESERVES
title: "Programme Category: Strategic Reserves"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Strategic Reserves, the smallest programme category, by fiscal year, funding source and department, with its line items, the rotation charging rule and the cover-line basis.
xrefs: [OSC-LDG-REG, OSC-LDG-IDX, OSC-RSV-IDX, OSC-MEM-07-0612]
distribution:
  - Logistics & Reserves, ALPHA-05
  - Medical Services, ALPHA-05
  - Comptroller file (CMP/ALPHA-01)
fields:
  Category code: RESERVES
  Category: Strategic Reserves
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Scope: Food, water treatment, medical stocks, fuel, stores, rotation and disposal
  Line items: "20"
  Stock basis: Sustained capacity (OSC-MEM-07-0612)
certification: Certified by B. Achterberg, Comptroller. Stock values agree with the Logistics & Reserves position of 31 MAR 2008.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted. Rotation charging rule restated (Table 5).", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed.", by: "CMP Accounts Branch" }
---

Strategic Reserves carries the purchase, storage, rotation and disposal of stocks held for the sustainment period: food, water treatment consumables, pharmaceuticals and blood products, fuel, stores and specimen collections. Stocks are bought to the sustained capacity of :c[headline.capacitySustained] stated in :x[OSC-MEM-07-0612]. The physical position is reported by Logistics & Reserves in :x[OSC-RSV-IDX]; this statement reports cost only.

## Table 1. Category total

::canon-table{source="budget.categories" filter="id=RESERVES" cols="id:Code,name:Category,amountB:Obligated ($B),pct:Share of programme (%)"}

## Table 2. By fiscal year ($M)

| Fiscal year | Obligated | Lines obligating | Note |
|---|---:|---:|---|
| FY2001 | 0 | 0 | |
| FY2002 | 0 | 0 | |
| FY2003 | 290 | 6 | First reserves lines |
| FY2004 | 524 | 14 | |
| FY2005 | 908 | 20 | All twenty lines open |
| FY2006 | 1,372 | 20 | |
| FY2007 | 2,201 | 20 | |
| FY2008 | 2,705 | 20 | Obligated to 31 MAR 2008, with apportioned balance |
| Total | 8,000 | 20 | |

No stocks were bought before FY2003, when the first facilities could store them. No reserves line has closed. Obligations have risen in every year since FY2003.

## Table 3. By funding source ($M)

| Funding source | Amount | Lines | Share of category (%) |
|---|---:|---:|---:|
| FEMA | 4,000 | 11 | 50.0 |
| BLACK | 2,000 | 4 | 25.0 |
| DOD | 2,000 | 5 | 25.0 |
| DOE | 0 | 0 | 0 |
| MISC | 0 | 0 | 0 |
| Total | 8,000 | 20 | 100 |

Strategic Reserves is the only category in which FEMA is the largest source and the only category with no DOE or reclassified money. Stockpile and prepositioning lines sit within FEMA programmes of the same kind.

## Table 4. Allocation by department ($M)

| Department | Amount | Lines |
|---|---:|---:|
| DOD | 3,359 | 8 |
| FEMA | 2,875 | 8 |
| DHS | 1,125 | 3 |
| DOE | 641 | 1 |
| Total | 8,000 | 20 |

The single DOE line draws on BLACK money, not on the DOE source. See :x[OSC-LDG-IDX], Table 6.

## Table 5. Rotation charging rule

Stock rotated out before expiry is issued to site food service, medical services or surface cover operations, and the receiving account is charged at book value. The credit is applied to the reserves line that bought the stock. Stock that cannot be issued is disposed of through the commodity rotation and disposal line and is written off at book value. Rotation credits are shown net in Table 2.

| Stock class | Rotation route | Charged to |
|---|---|---|
| Long-term rations | Site food service, cover facility canteens | Site operating account |
| Pharmaceuticals within 12 months of expiry | Medical Services, then surface clinics | Medical readiness line |
| Blood products within 30 days of expiry | Medical Services | Medical readiness line |
| Diesel and fuel oil | Generator run tests, cover facility heating | Site operating account |
| Water treatment consumables | Site plant | Site operating account |
| Seed and specimen collections | Not rotated | |

## Table 6. Line items

Fiscal-year phasing for each line is in :x[OSC-LDG-REG], Table 2.

:::redact{tier=2 auth="CMP" ref="OSC-ASR-CG"}
::canon-table{source="budget.lineItems" filter="categoryId=RESERVES" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}
:::

## Cover line basis

:::redact{tier=2 auth="CVO" ref="OSC-ASR-COV"}
Reserves lines are titled as the federal stockpile, mass care and prepositioning programmes they sit beside. The medical countermeasures line (LI-064) has obligated since FY2003. When federal pandemic influenza funding increased in DEC 2005, the stockpile build was presented, where questioned, as part of the general growth in countermeasure procurement; the Ledger records no change to the line, and no question was received. Small arms replacement (LI-084) and ammunition storage maintenance (LI-122) are carried here at Tier 2 and are not shown in the Logistics & Reserves position at Tier 3. The seed collection line (LI-067) and the biological specimen repository line (LI-116) serve ALPHA-03.
:::

Queries on stock positions go to Logistics & Reserves. Queries on charging go to the Accounts Branch.
