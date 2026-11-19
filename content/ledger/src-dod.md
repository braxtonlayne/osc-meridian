---
id: ledger-src-dod
route: /ledger/source/dod
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-SRC-DOD
title: "Funding Source: DOD infrastructure appropriations"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Defense-wide infrastructure appropriations, distributed across programme categories per the allocation matrix, with fiscal-year profile and the account codes reached.
xrefs: [OSC-LDG-IDX, OSC-LDG-REG]
distribution:
  - Comptroller file (CMP/ALPHA-01)
  - "Continuity reader, fiscal-year totals only (Secretariat courier): Rep. John P. Murtha, Chairman, Subcommittee on Defense, House Committee on Appropriations"
fields:
  Source code: DOD
  Source: Defense-wide infrastructure appropriations
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Receiving department: DOD only
  Line items reached: "34"
  Account prefix: "97"
certification: Certified by B. Achterberg, Comptroller. Agrees with the allocation matrix (OSC-LDG-IDX, Table 5).
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed.", by: "CMP Accounts Branch" }
---

This source comprises Defense-wide military construction, research and operation and maintenance appropriations obligated directly on DOD line items. Money from this source does not leave the department. It is the most straightforward of the five sources to account for and the one that requires the least correspondence.

## Table 1. Source total

::canon-table{source="budget.sources" filter="id=DOD" cols="id:Code,name:Funding source,pct:Share of programme (%),amountB:Amount ($B)"}

## Table 2. Distribution across categories ($M)

| Category | Amount | Lines |
|---|---:|---:|
| Facility Construction | 38,000 | 11 |
| Transit Network | 26,000 | 8 |
| Equipment & Systems | 11,360 | 6 |
| Personnel Costs | 3,000 | 4 |
| Strategic Reserves | 2,000 | 5 |
| Total | 80,360 | 34 |

## Table 3. By fiscal year ($M)

| Fiscal year | Amount |
|---|---:|
| FY2001 | 5,017 |
| FY2002 | 7,802 |
| FY2003 | 9,951 |
| FY2004 | 9,911 |
| FY2005 | 11,052 |
| FY2006 | 11,543 |
| FY2007 | 14,510 |
| FY2008 | 10,574 |
| Total | 80,360 |

## Table 4. Account codes reached

All 34 lines are on Defense-wide accounts. Thirteen carry a program element number in the title, in the form used in the department's research and development exhibits.

::canon-table{source="budget.lineItems" filter="sourceId=DOD" cols="no:Line,title:Cover title,account:Account,amountM:Total ($M)"}

## Notes

1. DOD lines are reconciled monthly with the department's Defense-wide accounting office. Differences under $50,000 per line are cleared at year end without correspondence.
2. The DOD department total in :x[OSC-LDG-IDX] Table 4 is larger than this source, because BLACK and MISC money is also obligated on DOD lines. Those lines are listed under their own sources.
