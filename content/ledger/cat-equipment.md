---
id: ledger-cat-equipment
route: /ledger/category/equipment
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-CAT-EQUIPMENT
title: "Programme Category: Equipment & Systems"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Equipment & Systems by fiscal year, funding source and department, with its line items, the replacement schedule used for forward estimates and the cover-line basis.
xrefs: [OSC-LDG-REG, OSC-LDG-IDX, OSC-RSV-ENERGY, OSC-ASR-COMM]
distribution:
  - Facilities Engineering, ALPHA-02
  - Communications Security, ALPHA-02
  - Comptroller file (CMP/ALPHA-01)
fields:
  Category code: EQUIPMENT
  Category: Equipment & Systems
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Scope: Life support, power plant, communications, security systems, data systems, medical equipment
  Line items: "20"
  Forward estimates: Replacement schedule, Table 5
certification: Certified by B. Achterberg, Comptroller. Agrees with OSC-LDG-REG Rev 11.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted. Replacement schedule reviewed with FE; no change.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed. Eight lines closed.", by: "CMP Accounts Branch" }
---

Equipment & Systems carries plant and systems installed in a facility after structural completion: air filtration and CBRN protection, water purification, power generation, fire suppression, access control, communications, data archive and workstation systems, and medical equipment. Reactor plant development is carried here; reactor fuel is not (:x[OSC-RSV-ENERGY]). Communications equipment is bought to the standards in :x[OSC-ASR-COMM].

## Table 1. Category total

::canon-table{source="budget.categories" filter="id=EQUIPMENT" cols="id:Code,name:Category,amountB:Obligated ($B),pct:Share of programme (%)"}

## Table 2. By fiscal year ($M)

| Fiscal year | Obligated | Lines obligating |
|---|---:|---:|
| FY2001 | 0 | 0 |
| FY2002 | 833 | 5 |
| FY2003 | 1,390 | 6 |
| FY2004 | 2,828 | 13 |
| FY2005 | 5,185 | 20 |
| FY2006 | 7,329 | 20 |
| FY2007 | 10,214 | 20 |
| FY2008 | 6,221 | 12 |
| Total | 34,000 | 20 |

Equipment obligations follow structural completion by about two years and reached their highest point in FY2007, two years after Facility Construction and a year after the programme as a whole. Eight lines closed at the end of FY2007 on completion of initial fit-out. The twelve open lines are second-tranche and replacement buys.

## Table 3. By funding source ($M)

| Funding source | Amount | Lines | Share of category (%) |
|---|---:|---:|---:|
| BLACK | 14,670 | 7 | 43.1 |
| DOD | 11,360 | 6 | 33.4 |
| FEMA | 5,790 | 4 | 17.0 |
| DOE | 1,830 | 2 | 5.4 |
| MISC | 350 | 1 | 1.0 |
| Total | 34,000 | 20 | 100 |

## Table 4. Allocation by department ($M)

| Department | Amount | Lines |
|---|---:|---:|
| DOD | 20,874 | 12 |
| FEMA | 5,017 | 3 |
| DOE | 4,340 | 3 |
| DHS | 3,769 | 2 |
| Total | 34,000 | 20 |

## Table 5. Replacement schedule for forward estimates

Used by the Accounts Branch to project equipment obligations beyond FY2008. Service lives are those advised by Facilities Engineering and Communications Security and are planning figures only. They do not authorise replacement.

| Equipment class | Planning service life (years) | First replacement due | Lead division |
|---|---:|---|---|
| Workstations and terminal equipment | 5 | FY2009 | CMS |
| Biometric readers and access control panels | 7 | FY2010 | SFC |
| Secure network switching, closed enclave | 8 | FY2010 | CMS |
| Fire detection and suppression panels | 12 | FY2017 | FE |
| Water purification membranes and pumps | 10 | FY2014 | FE |
| Air handling units and filter housings | 20 | FY2023 | FE |
| Diesel generator sets | 25 | FY2030 | FE |
| Medical imaging and theatre equipment | 8 | FY2012 | MS |

Filter media, membranes, lamps and consumables are not equipment and are charged to the site operating account.

## Table 6. Line items

Fiscal-year phasing for each line is in :x[OSC-LDG-REG], Table 2.

::canon-table{source="budget.lineItems" filter="categoryId=EQUIPMENT" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}

## Cover line basis

:::redact{tier=2 auth="CVO" ref="CVO-07-104"}
Equipment lines are titled as the departments' ordinary continuity, research and information-assurance buys, which they resemble closely. The diesel plant line (LI-123) was justified in FY2005 on the experience of the 14 AUG 2003 northeastern outage, during which construction-phase diesel plant at two shelter sites ran without load-shedding for the duration. The quantum key distribution line (LI-118) carries the network described in :x[OSC-ASR-COMM] as a research programme. The compact reactor line (LI-117) carries reactor plant development for the eight installations and is described in :x[OSC-RSV-ENERGY] only by reference. The workstation environment line (LI-121) carries MERIDIAN development, including the present release, on a DOE account as materiel and information systems work.
:::

Queries on Table 5 go to the Accounts Branch. Requests to replace equipment before its planning life go to Facilities Engineering on a work order, not to the Comptroller.
