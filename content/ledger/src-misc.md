---
id: ledger-src-misc
route: /ledger/source/misc
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-SRC-MISC
title: "Funding Source: Miscellaneous / reclassified"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: The smallest funding source, made up of reclassified balances and miscellaneous receipts, distributed across categories per the allocation matrix, with the account codes reached.
xrefs: [OSC-LDG-IDX, OSC-LDG-REG]
distribution:
  - Comptroller file (CMP/ALPHA-01)
fields:
  Source code: MISC
  Source: Miscellaneous receipts and reclassified balances
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Receiving departments: DOD, DOE, DHS
  Line items reached: "9"
  Reclassification authority: Comptroller, with Council Secretariat concurrence
certification: Certified by B. Achterberg, Comptroller. Agrees with the allocation matrix (OSC-LDG-IDX, Table 5).
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed. Two reclassifications recorded in Table 4.", by: "CMP Accounts Branch" }
---

This source holds money that reached the programme other than by a direct appropriation to it: unobligated balances reclassified from expiring departmental accounts, recoveries from closed contracts, and miscellaneous receipts such as salvage and disposal proceeds. It is the smallest of the five sources. Each amount is recorded here once and is then obligated on an ordinary line item.

## Table 1. Source total

::canon-table{source="budget.sources" filter="id=MISC" cols="id:Code,name:Funding source,pct:Share of programme (%),amountB:Amount ($B)"}

## Table 2. Distribution across categories and departments ($M)

| Category | DOD | DOE | DHS | Total | Lines |
|---|---:|---:|---:|---:|---:|
| Facility Construction | 4,895 | 3,056 | 1,049 | 9,000 | 4 |
| Transit Network | 2,052 | 0 | 1,948 | 4,000 | 2 |
| Equipment & Systems | 350 | 0 | 0 | 350 | 1 |
| Personnel Costs | 600 | 0 | 400 | 1,000 | 2 |
| Strategic Reserves | 0 | 0 | 0 | 0 | 0 |
| Total | 7,897 | 3,056 | 3,397 | 14,350 | 9 |

## Table 3. By fiscal year ($M)

| Fiscal year | Amount | Lines obligating |
|---|---:|---:|
| FY2001 | 0 | 0 |
| FY2002 | 696 | 3 |
| FY2003 | 1,682 | 7 |
| FY2004 | 2,673 | 9 |
| FY2005 | 3,054 | 9 |
| FY2006 | 3,375 | 9 |
| FY2007 | 1,528 | 6 |
| FY2008 | 1,342 | 6 |
| Total | 14,350 | 9 |

## Table 4. Origin of amounts, by kind

| Kind | Recorded by | Supporting document |
|---|---|---|
| Expiring balance, reclassified | Accounts Branch | Reclassification memorandum, CS concurrence |
| Contract recovery | Accounts Branch | Contract closeout statement from the prime |
| Disposal and salvage proceeds | Logistics & Reserves | Disposal certificate |
| Refund of overpayment | Accounts Branch | Department credit advice |

Reclassified balances are taken only from accounts in which the programme already holds a line. A balance is not reclassified into a department in which the programme has no line.

## Table 5. Account codes reached

::canon-table{source="budget.lineItems" filter="sourceId=MISC" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}

## Notes

1. The facility closeout and site restoration line is funded wholly from this source, in keeping with its character. Restoration of a surface site after construction is a normal use of recovered balances.
2. No MISC money is used for Strategic Reserves. Disposal proceeds from reserve stocks are credited to the line that bought them (:x[OSC-LDG-CAT-RESERVES], Table 5) and are not recorded here.
