---
id: ledger-src-fema
route: /ledger/source/fema
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-SRC-FEMA
title: "Funding Source: FEMA emergency preparedness"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Emergency preparedness appropriations on FEMA and DHS lines, distributed across categories per the allocation matrix, with the treatment of FEMA lines after March 2003 and the account codes reached.
xrefs: [OSC-LDG-IDX, OSC-LDG-REG, OSC-LDG-FY03]
distribution:
  - Comptroller file (CMP/ALPHA-01)
fields:
  Source code: FEMA
  Source: Emergency preparedness appropriations
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Receiving departments: FEMA, DHS
  Line items reached: "31"
  Account prefixes: 58 (FEMA), 70 (DHS)
certification: Certified by B. Achterberg, Comptroller. Agrees with the allocation matrix (OSC-LDG-IDX, Table 5).
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed. Note 2 restated.", by: "CMP Accounts Branch" }
---

This source comprises emergency preparedness, continuity and mass-care appropriations. Before 01 MAR 2003 it was obligated on lines of the Federal Emergency Management Agency as an independent agency. Since that date it has been obligated on the same FEMA lines, now within the Department of Homeland Security, and on DHS lines opened from FY2003.

## Table 1. Source total

::canon-table{source="budget.sources" filter="id=FEMA" cols="id:Code,name:Funding source,pct:Share of programme (%),amountB:Amount ($B)"}

## Table 2. Receiving department ($M)

| Department label in register | Account prefix | Lines | Amount |
|---|---|---:|---:|
| FEMA | 58 | 23 | 35,356 |
| DHS | 70 | 8 | 13,434 |
| Total | | 31 | 48,790 |

## Table 3. Distribution across categories ($M)

| Category | Amount | Lines |
|---|---:|---:|
| Facility Construction | 26,000 | 8 |
| Transit Network | 9,000 | 3 |
| Equipment & Systems | 5,790 | 4 |
| Personnel Costs | 4,000 | 5 |
| Strategic Reserves | 4,000 | 11 |
| Total | 48,790 | 31 |

Eleven of the source's 31 lines are reserves lines. It is the largest source of Strategic Reserves money.

## Table 4. By fiscal year ($M)

| Fiscal year | Amount | Of which on DHS lines |
|---|---:|---:|
| FY2001 | 2,338 | 0 |
| FY2002 | 2,291 | 0 |
| FY2003 | 3,442 | 1,063 |
| FY2004 | 7,829 | 2,189 |
| FY2005 | 11,057 | 3,159 |
| FY2006 | 11,695 | 3,927 |
| FY2007 | 5,767 | 1,938 |
| FY2008 | 4,371 | 1,158 |
| Total | 48,790 | 13,434 |

## Table 5. Account codes reached

::canon-table{source="budget.lineItems" filter="sourceId=FEMA" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}

## Notes

1. **FEMA label after March 2003.** FEMA was an independent agency until 01 MAR 2003, when it was transferred into the Department of Homeland Security. Lines established on FEMA accounts in FY2001 and FY2002, and FEMA lines opened after the transfer within the same parent appropriation, keep the FEMA department label. This follows the account structure of the parent appropriation, which kept its FEMA account numbers after the transfer. The label is not updated and no line has been renumbered.
2. **No DHS funding source.** The programme has no DHS funding source. DHS carries line items, but the money on them originates in this source, in BLACK and in MISC. A DHS department total therefore appears in :x[OSC-LDG-IDX] Table 4 with no matching row in Table 3.
3. **Predecessor accounts.** DHS began operations on 24 JAN 2003. Programme FY2003 amounts on DHS lines were obligated under transfer authority from predecessor accounts; see :x[OSC-LDG-FY03].
4. Reconciliation with the parent agency is quarterly. The agency's continuity office receives the sub-account totals only.
