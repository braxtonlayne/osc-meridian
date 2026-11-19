---
id: ledger-cat-transit
route: /ledger/category/transit
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-CAT-TRANSIT
title: "Programme Category: Transit Network"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Transit Network by fiscal year, funding source and department, with its line items and the Transit Accounts cost-per-mile table on certified and engineering mileage.
xrefs: [OSC-LDG-REG, OSC-MEM-07-0944, OSC-TRN-ENG, OSC-LDG-IDX, OSC-CNL-MIN-07-06, OSC-TRN-TT-08-02]
distribution:
  - Director, Transit Operations, ALPHA-01
  - Chief Engineer, Facilities Engineering, ALPHA-02
  - Comptroller file (CMP/ALPHA-01)
fields:
  Category code: TRANSIT
  Category: Transit Network
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Scope: Rail segments, regional tram networks, portals, shafts, traction power, signalling, stock
  Line items: "26"
  Cost-per-mile table: P. Ramanathan, Transit Accounts
certification: Certified by B. Achterberg, Comptroller. Table 5 prepared by P. Ramanathan, Budget Analyst, Transit Accounts, and checked by the Accounts Branch.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted. Table 5 restated to first quarter obligations.", by: "CMP Transit Accounts" }
  - { rev: "3", date: "30 NOV 2007", change: "Table 5 added for the FY2008 cost tables.", by: "P. Ramanathan" }
---

Transit Network carries the inter-hub rail segments, the four regional tram networks, their portals, shafts, ventilation, traction power, signalling and train control, maintenance yards and rolling stock. Tunnel boring began in FY2002. The last rail segment was completed in MAR 2007; tram works are tapering in FY2008.

## Table 1. Category total

::canon-table{source="budget.categories" filter="id=TRANSIT" cols="id:Code,name:Category,amountB:Obligated ($B),pct:Share of programme (%)"}

## Table 2. By fiscal year ($M)

| Fiscal year | Obligated | Lines obligating | Works |
|---|---:|---:|---|
| FY2001 | 0 | 0 | No transit obligations |
| FY2002 | 2,242 | 7 | Survey, lining procurement, first conduit works |
| FY2003 | 8,775 | 17 | Boring machines in service; traction power begins |
| FY2004 | 11,946 | 26 | Segment 01 completed DEC 2004 |
| FY2005 | 15,089 | 26 | |
| FY2006 | 19,447 | 26 | Segments 03, 05 and 02 completed; seven lines close |
| FY2007 | 17,497 | 19 | Segments 06 and 04 completed; ten lines close |
| FY2008 | 14,004 | 9 | Obligated to 31 MAR 2008, with apportioned balance |
| Total | 89,000 | 26 | |

## Table 3. By funding source ($M)

| Funding source | Amount | Lines | Share of category (%) |
|---|---:|---:|---:|
| BLACK | 44,000 | 10 | 49.4 |
| DOD | 26,000 | 8 | 29.2 |
| FEMA | 9,000 | 3 | 10.1 |
| DOE | 6,000 | 3 | 6.7 |
| MISC | 4,000 | 2 | 4.5 |
| Total | 89,000 | 26 | 100 |

## Table 4. Allocation by department ($M)

| Department | Amount | Lines |
|---|---:|---:|
| DOD | 58,150 | 15 |
| DHS | 13,816 | 4 |
| DOE | 11,018 | 5 |
| FEMA | 6,016 | 2 |
| Total | 89,000 | 26 |

## Table 5. Cost per route-mile, FY2008 cost tables

Prepared by Transit Accounts for the FY2008 cost return. Column A divides category cost by the certified mileage, :c[headline.tunnelCertifiedMi] miles, as returned quarterly by Transit Operations and accepted by the Council (:x[OSC-CNL-MIN-07-06]). Column B divides the same cost by engineering length, rail :c[headline.railEngineeringMi] plus tram :c[headline.tramEngineeringMi] route-miles, as provided by Facilities Engineering (:x[OSC-MEM-07-0944], :x[OSC-TRN-ENG]).

| Item | A. Certified basis | B. Engineering basis |
|---|---:|---:|
| Route-miles | :c[headline.tunnelCertifiedMi] | 16,612 |
| Category cost to date ($M) | 89,000 | 89,000 |
| Cost per route-mile, to date ($M) | 105.08 | 5.36 |
| FY2008 obligations ($M) | 14,004 | 14,004 |
| Cost per route-mile, FY2008 ($M) | 16.53 | 0.84 |
| Ratio, A to B | 19.6 | 1.0 |

Notes to Table 5:

(a) The two mileage bases are those in use on the date of preparation. They are not reconciled in this table, and neither column is adjusted to the other. The question of which basis applies to the cost return was noted on the routed copy of OSC-MEM-07-0944. No ruling is on file, and the table is presented on both bases.

(b) Column B includes Segment 04 at its surveyed length (OSC-MEM-07-0944 para 2). The segment is completed and is not in revenue service; its cost is in the category whether or not it carries trains.

(c) Neither column is a construction cost per mile for any segment or network. Cost is not posted by segment.

## Table 6. Line items

Fiscal-year phasing for each line is in :x[OSC-LDG-REG], Table 2.

:::redact{tier=2 auth="CMP" ref="OSC-ASR-CG"}
::canon-table{source="budget.lineItems" filter="categoryId=TRANSIT" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}
:::

## Cover line basis

:::redact{tier=2 auth="CVO" ref="OSC-ASR-COV"}
Tunnel works are titled as utility, conduit, pipeline-easement and geological survey work, which is the surface explanation used at every portal and shaft. Boring is carried as technology demonstration and long-bore survey (LI-072, LI-093), lining and spoil as procurement and disposal (LI-031, LI-068). Traction power for the rail segments is carried on a DHS account as substation work (LI-056) under a mass-transit security heading, which was the largest DHS account of the right character open in FY2003. Rolling stock is special-purpose vehicle procurement (LI-098). Signalling and train control (LI-112) is on a FEMA account as a development line. No line title uses the words rail, tram, tunnel network or segment together.
:::

Queries on Table 5 go to P. Ramanathan, Transit Accounts (p.ramanathan@a01.cmp.mer). Queries on the mileage figures themselves go to the originating division.
