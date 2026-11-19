---
id: ledger-cat-personnel
route: /ledger/category/personnel
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-CAT-PERSONNEL
title: "Programme Category: Personnel Costs"
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 4
date: 2008-04-15
summary: Personnel Costs by fiscal year, funding source and department, with its line items and the posting basis of each line type. A programme category, not a payroll total.
xrefs: [OSC-LDG-REG, OSC-LDG-IDX, OSC-DIR-0233, OSC-PER-IDX, OSC-LDG-FY08]
distribution:
  - Personnel & Vetting, ALPHA-01
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Comptroller file (CMP/ALPHA-01)
fields:
  Category code: PERSONNEL
  Category: Personnel Costs
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Scope: Pay, allowances, investigations, training, medical readiness, contract guards, food service
  Line items: "18"
  Pay runs: Last working day of each month
certification: Certified by B. Achterberg, Comptroller. Pay-related lines agree with disbursements to the March 2008 pay run.
revisions:
  - { rev: "4", date: "15 APR 2008", change: "FY2008 first quarter posted. Table 5 headings aligned with OSC-DIR-0233.", by: "CMP Accounts Branch" }
  - { rev: "3", date: "14 JAN 2008", change: "FY2007 closed.", by: "CMP Accounts Branch" }
---

Personnel Costs is a programme category and not a payroll total. It carries pay and allowances for programme personnel, background and supplemental investigations, training and readiness, medical readiness, occupational health, contract guard services and food service. Payroll for personnel in categories other than POSTED is carried within it and is not separately identified.

Pay is disbursed by the Comptroller on the last working day of each month against the strength return certified by Personnel & Vetting for that month (:x[OSC-PER-IDX]). Pay status and categories are governed by :x[OSC-DIR-0233]. The Comptroller does not determine pay status and does not hold strength records.

## Table 1. Category total

::canon-table{source="budget.categories" filter="id=PERSONNEL" cols="id:Code,name:Category,amountB:Obligated ($B),pct:Share of programme (%)"}

## Table 2. By fiscal year ($M)

| Fiscal year | Obligated | Lines obligating | Change on prior year (%) |
|---|---:|---:|---:|
| FY2001 | 141 | 3 | |
| FY2002 | 691 | 9 | 390.1 |
| FY2003 | 1,433 | 18 | 107.4 |
| FY2004 | 1,452 | 18 | 1.3 |
| FY2005 | 1,803 | 18 | 24.2 |
| FY2006 | 2,313 | 18 | 28.3 |
| FY2007 | 3,063 | 18 | 32.4 |
| FY2008 | 3,104 | 18 | 1.3 |
| Total | 14,000 | 18 | |

FY2008 is the highest year for the category. All eighteen lines have obligated in every year since FY2003. Lines for start-up recruitment and workforce transition have declined since FY2002; lines for pay, guards, medical readiness and health monitoring have risen with posted strength.

## Table 3. By funding source ($M)

| Funding source | Amount | Lines | Share of category (%) |
|---|---:|---:|---:|
| BLACK | 5,000 | 5 | 35.7 |
| FEMA | 4,000 | 5 | 28.6 |
| DOD | 3,000 | 4 | 21.4 |
| DOE | 1,000 | 2 | 7.1 |
| MISC | 1,000 | 2 | 7.1 |
| Total | 14,000 | 18 | 100 |

## Table 4. Allocation by department ($M)

| Department | Amount | Lines |
|---|---:|---:|
| DOD | 6,277 | 8 |
| FEMA | 2,757 | 4 |
| DHS | 2,701 | 3 |
| DOE | 2,265 | 3 |
| Total | 14,000 | 18 |

## Table 5. Posting basis by line type

Each personnel line posts against a stated basis. The basis determines what the line may be charged for and what document supports each charge.

| Line type | Posting basis | Supporting document |
|---|---|---|
| Pay and allowances | Strength return, by pay status | Monthly strength return (P&V) |
| Investigations and polygraph | Case count | Vetting case list (P&V) |
| Training and readiness | Course enrolment | Training compliance report |
| Medical readiness and occupational health | Examination and badge count | Medical readiness return (MS) |
| Contract guards | Contract post count | Prime contract task order |
| Food service | Meals served | Site food service return |
| Relocation and transition allowances | Individual entitlement | Transfer order |

Lines posting without a basis in this table are listed in the fiscal-year statement for the year concerned (:x[OSC-LDG-FY08]).

## Table 6. Line items

Fiscal-year phasing for each line is in :x[OSC-LDG-REG], Table 2.

::canon-table{source="budget.lineItems" filter="categoryId=PERSONNEL" cols="no:Line,title:Cover title,department:Dept,account:Account,amountM:Total ($M)"}

## Cover line basis

:::redact{tier=2 auth="CVO" ref="CVO-07-104"}
Personnel lines are titled as the departments' own workforce, training and health programmes. Pay for programme staff is not carried under any title that contains the word payroll. Civilian pay is carried as a special-programmes line (LI-015) and as facility operations staffing (LI-002); investigations as supplemental personnel security investigations (LI-004); classified relocation allowances on a DOE account (LI-078). Health and safety monitoring (LI-080) has grown by more, in amount, than any other personnel line since FY2006. From FY2007 it also carries pay and medical costs for personnel who are not on a site strength return, at a rate notified monthly by Personnel & Vetting.
:::

Queries on pay status go to Personnel & Vetting, not to the Comptroller.
