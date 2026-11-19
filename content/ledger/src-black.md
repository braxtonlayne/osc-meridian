---
id: ledger-src-black
route: /ledger/source/black
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-SRC-BLACK
title: "Funding Source: \"Black budget\" intelligence programs"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: The largest funding source, distributed across programme categories per the allocation matrix, with its receiving departments, fiscal-year profile and the account codes it reaches.
xrefs: [OSC-LDG-IDX, OSC-LDG-REG, OSC-ASR-CG]
distribution:
  - Council Secretariat, ALPHA-01 (cost return file)
  - Comptroller file (CMP/ALPHA-01)
fields:
  Source code: BLACK
  Source: Classified intelligence appropriations
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Receiving departments: DOD, DOE, DHS
  Line items reached: "40"
  Parent appropriation titles: Withheld (Tier 1)
certification: Certified by B. Achterberg, Comptroller. Amounts agree with the allocation matrix (OSC-LDG-IDX, Table 5) and with OSC-LDG-REG Rev 11.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed. Table 2 restated by receiving department.", by: "CMP Accounts Branch" }
---

This source comprises programme money appropriated within classified intelligence accounts and transferred to line items in three departments for obligation. It is the largest of the five sources and the only one whose parent appropriations are not named in programme accounts at any tier below the Council. Amounts are shown in full.

## Table 1. Source total

::canon-table{source="budget.sources" filter="id=BLACK" cols="id:Code,name:Funding source,pct:Share of programme (%),amountB:Amount ($B)"}

## Table 2. Parent appropriations by receiving department ($M)

| Parent appropriation | Receiving department | Lines | Amount |
|---|---|---:|---:|
| :r[Classified Program 0417, Continuity Infrastructure Annex]{tier=1 auth="CMP" ref="CMP-07-0019"} | DOD | 26 | 73,266 |
| :r[Classified Program 0522, Special Facilities Account]{tier=1 auth="CMP" ref="CMP-07-0019"} | DHS | 6 | 22,359 |
| :r[Classified Program 0386, Site Support Account]{tier=1 auth="CMP" ref="CMP-07-0019"} | DOE | 8 | 22,045 |
| Total | | 40 | 117,670 |

Transfers are made quarterly to the receiving department's account at the sub-account given in the register. The receiving department records the transfer as a reimbursable obligation from a classified customer, which is its normal practice for such work, and audits the line in its own accounts.

## Table 3. Distribution across categories ($M)

| Category | Amount | Lines | Share of source (%) |
|---|---:|---:|---:|
| Facility Construction | 52,000 | 14 | 44.2 |
| Transit Network | 44,000 | 10 | 37.4 |
| Equipment & Systems | 14,670 | 7 | 12.5 |
| Personnel Costs | 5,000 | 5 | 4.2 |
| Strategic Reserves | 2,000 | 4 | 1.7 |
| Total | 117,670 | 40 | 100 |

The source carries just under half of Transit Network and more than a third of Facility Construction. It is the largest source in four of the five categories.

## Table 4. By fiscal year ($M)

| Fiscal year | Amount | Share of year (%) |
|---|---:|---:|
| FY2001 | 2,445 | 24.9 |
| FY2002 | 5,698 | 26.5 |
| FY2003 | 11,922 | 37.6 |
| FY2004 | 16,389 | 39.8 |
| FY2005 | 20,711 | 40.9 |
| FY2006 | 22,000 | 42.1 |
| FY2007 | 22,586 | 48.2 |
| FY2008 | 15,919 | 48.2 |
| Total | 117,670 | 41.0 |

The source's share has not fallen in any year. As the open departmental lines close, the remaining classified lines carry a larger part of each year's obligations.

## Table 5. Account codes reached

Cover titles for these lines are in :x[OSC-LDG-REG]. The table below gives the receiving account only.

::canon-table{source="budget.lineItems" filter="sourceId=BLACK" cols="no:Line,department:Dept,account:Account,amountM:Total ($M)"}

## Notes

1. The withholding of parent appropriation titles is directed in :x[OSC-ASR-CG]. Withheld titles are not to be reconstructed from account prefixes or from the receiving department.
2. Correspondence with receiving departments on these lines is by the Comptroller only, through the department's classified-customer office, and quotes the sub-account, never the line number.
