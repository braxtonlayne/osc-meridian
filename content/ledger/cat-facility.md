---
id: ledger-cat-facility
route: /ledger/category/facility
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-CAT-FACILITY
title: "Programme Category: Facility Construction"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Facility Construction, the largest programme category, by fiscal year, funding source and appropriating department, with its line items and the cover-line basis.
xrefs: [OSC-LDG-REG, OSC-LDG-IDX, OSC-ASR-COV, OSC-ASR-CTR]
distribution:
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Facilities Engineering, ALPHA-02
  - Comptroller file (CMP/ALPHA-01)
fields:
  Category code: FACILITY
  Category: Facility Construction
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Scope: Excavation, structures, hardening, surface cover works, site remediation
  Line items: "43"
  Account holder: Comptroller, Accounts Branch
certification: Certified by B. Achterberg, Comptroller. Agrees with OSC-LDG-REG Rev 11 and OSC-LDG-IDX Rev 8.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted. Nine lines remain open.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "12 OCT 2007", change: "FY2007 closed. Twenty lines closed in FY2007 marked in Table 4.", by: "CMP Accounts Branch" }
---

Facility Construction carries the cost of excavating, building, hardening and fitting out the 47 facilities, and of the surface cover facilities that stand over the ALPHA and BETA sites. It does not carry tunnels, rail or tram works between sites (Transit Network), plant and systems installed after structural completion (Equipment & Systems), or stocks (Strategic Reserves).

## Table 1. Category total

::canon-table{source="budget.categories" filter="id=FACILITY" cols="id:Code,name:Category,amountB:Obligated ($B),pct:Share of programme (%)"}

## Table 2. By fiscal year ($M)

| Fiscal year | Obligated | Lines obligating | Note |
|---|---:|---:|---|
| FY2001 | 9,659 | 10 | Construction initiated JAN 2001 |
| FY2002 | 17,734 | 25 | |
| FY2003 | 19,812 | 33 | First DHS lines, under transfer authority |
| FY2004 | 24,450 | 43 | All 43 lines open |
| FY2005 | 27,615 | 43 | Category peak; twelve lines close |
| FY2006 | 21,839 | 31 | ALPHA builds close out; eleven lines close |
| FY2007 | 13,925 | 20 | Eleven lines close |
| FY2008 | 6,966 | 9 | Obligated to 31 MAR 2008, with apportioned balance |
| Total | 142,000 | 43 | |

Facility Construction was the whole of the programme in its first months and is the only category in which obligations have fallen in every year since FY2005. The nine lines open in FY2008 carry alteration, planning and continuity site works. No new excavation is carried in the year.

## Table 3. By funding source ($M)

| Funding source | Amount | Lines | Share of category (%) |
|---|---:|---:|---:|
| BLACK | 52,000 | 14 | 36.6 |
| DOD | 38,000 | 11 | 26.8 |
| FEMA | 26,000 | 8 | 18.3 |
| DOE | 17,000 | 6 | 12.0 |
| MISC | 9,000 | 4 | 6.3 |
| Total | 142,000 | 43 | 100 |

BLACK is the largest source in every category except Strategic Reserves. See :x[OSC-LDG-SRC-BLACK] and the allocation matrix at :x[OSC-LDG-IDX], Table 5.

## Table 4. Allocation by department ($M)

| Department | Amount | Lines |
|---|---:|---:|
| DOD | 72,863 | 22 |
| DOE | 32,667 | 10 |
| FEMA | 18,691 | 6 |
| DHS | 17,779 | 5 |
| Total | 142,000 | 43 |

DOD carries just over half the category. Allocation between departments follows the character of each line's cover title and the size of account available in the year of first obligation, and is not a statement of which department benefits.

## Table 5. Line items

The list below gives the Facility Construction lines from the register with their programme totals. Fiscal-year phasing for each line is in :x[OSC-LDG-REG], Table 2.

:::redact{tier=2 auth="CMP" ref="OSC-ASR-CG"}
::canon-table{source="budget.lineItems" filter="categoryId=FACILITY" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}
:::

## Cover line basis

:::redact{tier=2 auth="CVO" ref="OSC-ASR-COV"}
Cover titles in this category are chosen by Cover Operations to match the surface cover identity of the site served, and the line is placed in whichever of the four departments has an account of the right character and size. Where the agency named in the cover identity has no account available to the programme, the line goes to the nearest plausible department. LI-043 (Seismology Center Instrumentation Vaults) serves the BETA-07 seismology centre cover on a DOE account. LI-063 (Hurricane Continuity Site Development) serves BETA-12 on a DOD account, because the FEMA account of the right size was fully committed in FY2003. LI-006 (Regional Response Center Build-Out) serves BETA-10 and is older than the department whose cover it supports; it stays on its DOD account. LI-018 (Geotechnical Survey and Characterization) carried the BETA-11 site survey during the winter games security build-up of FEB 2002. Lines titled for relocation arrangements, recapitalisation and site remediation carry the ALPHA hubs. No line title names a facility, a corridor or a depth.
:::

## Notes

1. Contractors are paid against these lines through the 47 primes in :x[OSC-ASR-CTR]. A prime's invoices may post to more than one line and more than one department. No prime is told which department funds it.
2. Closed lines remain in the register at their final totals. Retentions on closed lines are released against the same line number.
3. Cost by facility is not stated. Requests are referred to the Council Secretariat.
