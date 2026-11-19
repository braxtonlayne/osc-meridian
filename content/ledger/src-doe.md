---
id: ledger-src-doe
route: /ledger/source/doe
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-SRC-DOE
title: "Funding Source: DOE site management"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Energy site management appropriations on DOE lines, distributed across categories per the allocation matrix, with fiscal-year profile and the account codes reached.
xrefs: [OSC-LDG-IDX, OSC-LDG-REG]
distribution:
  - Comptroller file (CMP/ALPHA-01)
fields:
  Source code: DOE
  Source: Energy site management appropriations
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Receiving department: DOE only
  Line items reached: "13"
  Account prefix: "89"
certification: Certified by B. Achterberg, Comptroller. Agrees with the allocation matrix (OSC-LDG-IDX, Table 5).
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed.", by: "CMP Accounts Branch" }
---

This source comprises Department of Energy site management, safeguards and field station appropriations obligated directly on DOE line items. The source opened in FY2002 and has declined in every year since FY2005. No reserves are bought from it.

## Table 1. Source total

::canon-table{source="budget.sources" filter="id=DOE" cols="id:Code,name:Funding source,pct:Share of programme (%),amountB:Amount ($B)"}

## Table 2. Distribution across categories ($M)

| Category | Amount | Lines |
|---|---:|---:|
| Facility Construction | 17,000 | 6 |
| Transit Network | 6,000 | 3 |
| Equipment & Systems | 1,830 | 2 |
| Personnel Costs | 1,000 | 2 |
| Strategic Reserves | 0 | 0 |
| Total | 25,830 | 13 |

## Table 3. By fiscal year ($M)

| Fiscal year | Amount | Lines obligating |
|---|---:|---:|
| FY2001 | 0 | 0 |
| FY2002 | 5,013 | 8 |
| FY2003 | 4,703 | 10 |
| FY2004 | 4,398 | 11 |
| FY2005 | 4,726 | 13 |
| FY2006 | 3,687 | 10 |
| FY2007 | 2,509 | 7 |
| FY2008 | 794 | 3 |
| Total | 25,830 | 13 |

The early weight of the source reflects the field station, monitoring station and seismology vault works opened in FY2002, most of which closed in FY2005 and FY2006. The three lines still open in FY2008 are personnel accounting, food service and workstation environment development.

## Table 4. Account codes reached

::canon-table{source="budget.lineItems" filter="sourceId=DOE" cols="no:Line,title:Cover title,account:Account,amountM:Total ($M)"}

## Notes

1. The DOE department total in :x[OSC-LDG-IDX] Table 4 is about twice this source, because BLACK and MISC money is also obligated on DOE lines.
2. DOE lines are reconciled with the department's field financial office at each quarter close. The field office holds sub-account totals and the cover title only.
