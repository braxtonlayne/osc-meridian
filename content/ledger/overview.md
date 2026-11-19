---
id: ledger-overview
route: /ledger
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-IDX
title: Programme Accounts Summary, FY2001 to FY2008
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 8
date: 2008-04-15
summary: Programme accounts by category, fiscal year, funding source and appropriating department, with the source-to-category flow through the cover line items. Comptroller, ALPHA-01.
xrefs: [OSC-LDG-REG, OSC-LDG-CAT-FACILITY, OSC-LDG-CAT-TRANSIT, OSC-LDG-SRC-BLACK, OSC-MEM-07-0944]
distribution:
  - Council Secretariat, ALPHA-01 (cost return file)
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Directors of Divisions, ALPHA-01
  - Comptroller file (CMP/ALPHA-01)
fields:
  Account: OSC programme accounts, consolidated
  Period: 01 JAN 2001 to 31 MAR 2008 (FY2008 to first quarter close)
  Basis: Obligations, all four appropriating departments
  Prepared by: Comptroller, Accounts Branch, ALPHA-01
  Cost return: FY2008 first quarter return to the Council
  Next revision: After FY2008 Q3 close (30 JUN 2008)
certification: Certified by B. Achterberg, Comptroller. Figures agree with the line-item register (OSC-LDG-REG, Rev 11) and with the FY2008 first quarter cost return to the Council.
revisions:
  - { rev: "8", date: "15 APR 2008", change: "FY2008 first quarter obligations posted; Table 6 flow figures restated to register Rev 11.", by: "CMP Accounts Branch" }
  - { rev: "7", date: "14 JAN 2008", change: "FY2007 closed. Department column added to Table 4.", by: "CMP Accounts Branch" }
  - { rev: "6", date: "12 OCT 2007", change: "FY2007 third quarter posted.", by: "CMP Accounts Branch" }
---

The table below states programme accounts from the start of construction in January 2001 to the close of the first quarter of FY2008 (31 MAR 2008). The total programme cost to that date is $:c[headline.programCostB] billion, obligated across :c[budget.lineItemCount] line items in the appropriations of four departments. The summary is prepared for the quarterly cost return to the Council and for facility commanders. It is not a payroll statement, and it does not state programme cost by facility.

Figures are in billions of dollars ($B) where a category or source is shown whole, and in millions ($M) where they are distributed. Percentages are the shares adopted for the programme at establishment. Where a computed share differs from the adopted share in the first decimal place, the adopted share is shown. Programme years are calendar years, the Council's reporting year, and are designated FY to match the cost return. Department obligations are restated from the federal fiscal year to the programme year by the Accounts Branch.

## Table 1. Programme cost by category

::canon-table{source="budget.categories" cols="id:Code,name:Programme category,amountB:Obligated ($B),pct:Share (%)"}

| Line | Categories | Obligated ($B) | Share (%) |
|---|---|---:|---:|
| Total programme cost | All five | :c[budget.totalB] | 100 |

Category statements: :x[OSC-LDG-CAT-FACILITY], :x[OSC-LDG-CAT-TRANSIT], :x[OSC-LDG-CAT-EQUIPMENT], :x[OSC-LDG-CAT-PERSONNEL], :x[OSC-LDG-CAT-RESERVES].

## Table 2. Programme cost by fiscal year

::canon-table{source="budget.fiscalYears" cols="fy:Fiscal year,totalM:Obligated ($M)"}

Fiscal-year statements: :x[OSC-LDG-FY01] (FY2001 and FY2002 on one sheet), :x[OSC-LDG-FY03], :x[OSC-LDG-FY04], :x[OSC-LDG-FY05], :x[OSC-LDG-FY06], :x[OSC-LDG-FY07], :x[OSC-LDG-FY08].

The profile follows the construction schedule. Obligations rise through ALPHA construction, reach their highest point in FY2006 as the last ALPHA builds close out and rail segments 02, 03 and 05 complete, and fall from FY2007 as tunnelling and tram works finish. FY2008 is stated as obligations to 31 MAR 2008 plus the apportioned balance of the year.

## Table 3. Programme cost by funding source

::canon-table{source="budget.sources" cols="id:Code,name:Funding source,pct:Share (%),amountB:Amount ($B)"}

Source amounts are the adopted share applied to the total and are carried to two decimal places. Source statements: :x[OSC-LDG-SRC-BLACK], :x[OSC-LDG-SRC-DOD], :x[OSC-LDG-SRC-FEMA], :x[OSC-LDG-SRC-DOE], :x[OSC-LDG-SRC-MISC].

## Table 4. Programme cost by appropriating department

| Department | Account prefix | Line items | Obligated ($M) |
|---|---|---:|---:|
| Department of Defense | 97 | 65 | 161,523 |
| Department of Energy | 89 | 22 | 50,931 |
| Department of Homeland Security | 70 | 17 | 39,190 |
| Federal Emergency Management Agency | 58 | 23 | 35,356 |
| Total, four departments | | :c[budget.lineItemCount] | 287,000 |

There are four departments and five funding sources, and the two do not map one to one. A department is the appropriation in which a line item is obligated and audited. A funding source is the programme's own classification of where the money originates. Three of the five sources reach more than one department; two departments receive money from three sources.

## Table 5. Allocation matrix, category by funding source ($M)

| Category | BLACK | DOD | FEMA | DOE | MISC | Total |
|---|---:|---:|---:|---:|---:|---:|
| Facility Construction | 52,000 | 38,000 | 26,000 | 17,000 | 9,000 | 142,000 |
| Transit Network | 44,000 | 26,000 | 9,000 | 6,000 | 4,000 | 89,000 |
| Equipment & Systems | 14,670 | 11,360 | 5,790 | 1,830 | 350 | 34,000 |
| Personnel Costs | 5,000 | 3,000 | 4,000 | 1,000 | 1,000 | 14,000 |
| Strategic Reserves | 2,000 | 2,000 | 4,000 | 0 | 0 | 8,000 |
| Total | 117,670 | 80,360 | 48,790 | 25,830 | 14,350 | 287,000 |

Both margins of the matrix agree with Tables 1 and 3. The matrix is the reference for every distributed figure in the category and source statements.

## Table 6. Flow, funding source to department to category ($M)

The Ledger application draws this table as a flow chart from source appropriation, through the cover line items of each department, to programme category. Stage A gives what each source places in each department. Stage B gives what each department's lines carry for each category.

**Stage A. Source to department**

| Funding source | DOD | DOE | DHS | FEMA | Lines |
|---|---:|---:|---:|---:|---:|
| BLACK | 73,266 | 22,045 | 22,359 | 0 | 40 |
| DOD | 80,360 | 0 | 0 | 0 | 34 |
| FEMA | 0 | 0 | 13,434 | 35,356 | 31 |
| DOE | 0 | 25,830 | 0 | 0 | 13 |
| MISC | 7,897 | 3,056 | 3,397 | 0 | 9 |
| Total | 161,523 | 50,931 | 39,190 | 35,356 | 127 |

**Stage B. Department to category**

| Department | Facility | Transit | Equipment | Personnel | Reserves | Total |
|---|---:|---:|---:|---:|---:|---:|
| DOD | 72,863 | 58,150 | 20,874 | 6,277 | 3,359 | 161,523 |
| DOE | 32,667 | 11,018 | 4,340 | 2,265 | 641 | 50,931 |
| DHS | 17,779 | 13,816 | 3,769 | 2,701 | 1,125 | 39,190 |
| FEMA | 18,691 | 6,016 | 5,017 | 2,757 | 2,875 | 35,356 |
| Total | 142,000 | 89,000 | 34,000 | 14,000 | 8,000 | 287,000 |

## Notes to the accounts

1. **Distribution across line items.** Programme cost is carried in :c[budget.lineItemCount] line items, each of a size and title consistent with the ordinary business of the department that appropriates it. No line item exceeds the threshold at which its parent account would be reported separately in the department's budget justification. This is the established appropriations practice for the programme and is referred to in the classification guide (:x[OSC-ASR-CG]) as audit camouflage. It requires no action by account holders other than accurate posting to the line number given.

2. **Line item numbering.** Lines are numbered LI-001 to LI-127 in order of first obligation year, then department, then title. A line keeps its number for life. Closed lines are not renumbered and their numbers are not reissued. The full register is :x[OSC-LDG-REG].

3. **Account codes.** Account codes use the published two-digit agency prefix of the parent department (97 Defense-wide, 89 Energy, 70 Homeland Security, 58 FEMA), followed by a four-digit account and a three-digit sub-account. Sub-account numbers are assigned by the Comptroller and do not appear in the departments' public justification material.

4. **Predecessor accounts.** The Department of Homeland Security began operations on 24 JAN 2003; its first full appropriation was for federal fiscal year 2004. Programme FY2003 amounts on DHS lines were obligated under transfer authority from predecessor accounts. FEMA was an independent agency until 01 MAR 2003. FEMA lines established in FY2001 and FY2002 continued under the same accounts after the transfer and keep the FEMA department label, consistent with the account structure of the parent appropriation. There is accordingly no DHS funding source, although DHS carries line items.

5. **Authority.** Construction was initiated in January 2001 under Executive Order 13201 of 17 FEB 2001. The order's published text concerns notification of employee rights by federal contractors. The provisions relied on for programme obligations are in the order's annex, which was not published. Prime contracts cite the published text as the basis of their contractor-relations clauses.

6. **Personnel Costs.** Personnel Costs ($:c[budget.categories.PERSONNEL.amountB]B) is a programme category and not a payroll total. Payroll for personnel in categories other than POSTED is carried within it and is not separately identified.

7. **Facility attribution.** Programme cost is not stated by facility in any table issued by the Comptroller. Requests for cost by site are referred to the Council Secretariat.

8. **Transit mileage.** Transit cost per mile is stated in :x[OSC-LDG-CAT-TRANSIT] on the certified mileage (:c[headline.tunnelCertifiedMi] miles) and on the engineering lengths supplied for the FY2008 tables (:x[OSC-MEM-07-0944]).

## Audit exposure

The Facility Inventory carries an assessment of the programme's audit exposure. The rating is reproduced for account holders at Tier 2 and above. The assessment text is not reproduced.

:::redact{tier=2 auth="CS" ref="CS-07-012"}
Audit exposure rating (Facility Inventory, Revision 2008-Q2, budget section): MINIMAL. No change since the previous revision.
:::

:::redact{tier=1 auth="CS" ref="CS-07-012"}
Audit Exposure Risk: MINIMAL. Network cost distribution and classification protocols prevent single-point discovery. Congressional oversight committees possess no awareness of program existence.
:::

Queries on this summary are to be addressed to the Comptroller, Accounts Branch, ALPHA-01 (b.achterberg@a01.cmp.mer), quoting the table and line number. Queries on cost per mile go to Transit Accounts (p.ramanathan@a01.cmp.mer).
