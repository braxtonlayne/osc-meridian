---
id: ledger-register
route: /ledger/register
app: ledger
family: ledger
template: ledger
docNo: OSC-LDG-REG
title: Register of Programme Line Items (LI-001 to LI-127)
marking: UMBRA-C
originator: CMP/ALPHA-01
revision: 11
date: 2008-04-15
summary: Register of all programme line items across DOD, DOE, DHS and FEMA appropriations, with cover title, department, account code, programme totals and fiscal-year phasing.
xrefs: [OSC-LDG-IDX, OSC-ASR-CG]
distribution:
  - Comptroller, Accounts Branch, ALPHA-01
  - Department liaison copies (Tables 1 and 2 only), by hand of the Comptroller
  - Council Secretariat, ALPHA-01 (cost return file)
fields:
  Register: Programme line items
  Range: LI-001 to LI-127
  Period: FY2001 to FY2008 (to first quarter close, 31 MAR 2008)
  Departments: DOD, DOE, DHS, FEMA
  Keeper: Comptroller, Accounts Branch
  Liaison extract: Tables 1 and 2, without Table 3
certification: Certified by B. Achterberg, Comptroller. Register totals agree with the departments' sub-account statements at 31 MAR 2008.
revisions:
  - { rev: "11", date: "15 APR 2008", change: "FY2008 first quarter posted to all open lines.", by: "CMP Accounts Branch" }
  - { rev: "10", date: "14 JAN 2008", change: "FY2007 closed. Twenty-nine lines recorded as closed.", by: "CMP Accounts Branch" }
  - { rev: "9", date: "12 OCT 2007", change: "Account code for LI-088 corrected (transposed digits).", by: "CMP Accounts Branch" }
---

This register lists every line item through which programme cost is obligated. There are :c[budget.lineItemCount] lines, numbered in order of first obligation year, then department, then title. A line keeps its number for life; closed lines stay in the register at their final amounts and their numbers are not reissued. No line has been opened since FY2005.

Account codes give the published two-digit agency prefix of the parent department (97 Defense-wide, 89 Energy, 70 Homeland Security, 58 FEMA), a four-digit account and a three-digit sub-account. Sub-accounts are assigned by the Comptroller. The department column gives the department in whose appropriation the line is obligated and audited. FEMA lines keep the FEMA label after 01 MAR 2003. DHS lines carry obligations from FY2003 only; FY2003 amounts on DHS lines were obligated under transfer authority from predecessor accounts.

Tables 1 and 2 form the liaison extract given to department offices. Table 3 is not included in the extract.

## Table 1. Line items

::canon-table{source="budget.lineItems" cols="no:Line,title:Cover title,department:Dept,account:Account,sourceId:Source,amountM:Total ($M)"}

## Table 2. Fiscal-year phasing ($M)

A dash means no obligation in the year.

::canon-table{source="budget.lineItems" cols="no:Line,fy.FY2001:FY01,fy.FY2002:FY02,fy.FY2003:FY03,fy.FY2004:FY04,fy.FY2005:FY05,fy.FY2006:FY06,fy.FY2007:FY07,fy.FY2008:FY08,amountM:Total"}

| Line | FY01 | FY02 | FY03 | FY04 | FY05 | FY06 | FY07 | FY08 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Total, all lines | :c[budget.fiscalYears.FY2001.totalM] | :c[budget.fiscalYears.FY2002.totalM] | :c[budget.fiscalYears.FY2003.totalM] | :c[budget.fiscalYears.FY2004.totalM] | :c[budget.fiscalYears.FY2005.totalM] | :c[budget.fiscalYears.FY2006.totalM] | :c[budget.fiscalYears.FY2007.totalM] | :c[budget.fiscalYears.FY2008.totalM] |

Register total, all years: $:c[budget.totalB] billion.

## Table 3. Programme category by line

::canon-table{source="budget.lineItems" cols="no:Line,categoryId:Programme category,sourceId:Source"}

## Keeping the register

1. A line is opened by the Comptroller on a line-opening memorandum that gives the cover title, department, account and sub-account. The cover title is supplied by Cover Operations and is not altered after opening.
2. A line is closed when its final obligation is posted and the department confirms no open commitments. Retentions released after closure post to the same line.
3. Amendments to the register are made only by the Accounts Branch and are recorded in the revision history above.
4. Requests for the register in machine-readable form are refused. The register is held on paper and on MERIDIAN only.
