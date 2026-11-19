---
id: personnel-overview
route: /personnel
app: personnel
family: personnel
template: index
docNo: OSC-PER-IDX
title: Personnel Strength Summary as at Pay Run 30 APR 2008
marking: UMBRA-C
originator: PV/ALPHA-01
revision: 22
date: 2008-05-02
summary: Monthly strength summary by tier and by facility class after the 30 APR 2008 pay run, with the totals line used by every other personnel record.
supersedes: OSC-PER-IDX Rev 21 (as at pay run 31 MAR 2008)
distribution:
  - Director, Personnel & Vetting
  - Comptroller (Payroll Disbursement)
  - Facility commanders (via command sections)
  - Pay & Strength Accounting, PV (file)
xrefs: [OSC-DIR-0233, OSC-PER-DIR, OSC-SYS-GLO, OSC-FAC-IDX, OSC-FAC-CLS-ALPHA, OSC-FAC-CLS-BETA, OSC-FAC-CLS-GAMMA, OSC-FAC-CLS-DELTA, OSC-PER-T1, OSC-PER-T2, OSC-PER-T3, OSC-PER-T4]
revisions:
  - { rev: "22", date: "2008-05-02", change: "Figures as at pay run 30 APR 2008. Facility returns as at 30 APR 2008.", by: "PV Pay & Strength Accounting" }
  - { rev: "21", date: "2008-04-03", change: "Figures as at pay run 31 MAR 2008.", by: "PV Pay & Strength Accounting" }
  - { rev: "20", date: "2008-03-04", change: "Figures as at pay run 29 FEB 2008. Utilization basis restated (see para 4).", by: "PV Pay & Strength Accounting" }
entries:
  - { docNo: OSC-PER-T1, title: "Tier 1: Core Council", route: /personnel/tier/1, date: "2008-03-14", marking: "UMBRA//OSC UNRESTRICTED" }
  - { docNo: OSC-PER-T2, title: "Tier 2: Facility Command Staff", route: /personnel/tier/2, date: "2008-03-14", marking: "UMBRA//OSC COMPARTMENTED" }
  - { docNo: OSC-PER-T3, title: "Tier 3: Specialized Personnel", route: /personnel/tier/3, date: "2008-03-14", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-T4, title: "Tier 4: Essential Support", route: /personnel/tier/4, date: "2008-03-14", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-RATIO, title: "Standard Facility Personnel Ratios (ALPHA-01 Model)", route: /personnel/ratio, date: "2007-09-10", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-DIR, title: "Personnel Directory", route: /personnel/directory, date: "2008-05-16", marking: "UMBRA//OSC COMPARTMENTED" }
  - { docNo: OSC-PER-ORG, title: "Organisation Chart: Council, Divisions and Facility Commands", route: /personnel/org, date: "2008-04-01", marking: "UMBRA//OSC COMPARTMENTED" }
  - { docNo: OSC-PER-PH1, title: "Recruitment Phase 1: Foundation", route: /personnel/phase/1, date: "2007-01-15", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-PH2, title: "Recruitment Phase 2: Infrastructure Build", route: /personnel/phase/2, date: "2007-01-15", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-PH3, title: "Recruitment Phase 3: Network Integration", route: /personnel/phase/3, date: "2008-02-01", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-PH4, title: "Recruitment Phase 4: Full Operational Capability", route: /personnel/phase/4, date: "2008-02-01", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-PH5, title: "Recruitment Phase 5: Strategic Depth", route: /personnel/phase/5, date: "2008-02-01", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-VET, title: "Vetting: OSC Supplement to the Enhanced SSBI", route: /personnel/vetting, date: "2007-11-20", marking: "UMBRA//OSC COMPARTMENTED" }
  - { docNo: OSC-PER-TRF, title: "Facility Transfers and Probationary Periods", route: /personnel/transfer, date: "2008-01-10", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-BR-OPS, title: "Functional Branch: Command, Intelligence and Military Operations", route: /personnel/branch/ops, date: "2007-10-05", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-BR-SEC, title: "Functional Branch: Security Forces", route: /personnel/branch/sec, date: "2007-10-05", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-BR-TEC, title: "Functional Branch: Technical, Engineering and Communications", route: /personnel/branch/tec, date: "2007-10-05", marking: "TOP SECRET//SCI//OSC" }
  - { docNo: OSC-PER-BR-SUP, title: "Functional Branch: Medical, Logistics and Facility Support", route: /personnel/branch/sup, date: "2007-10-05", marking: "TOP SECRET//SCI//OSC" }
---

Produced by Pay & Strength Accounting, Personnel & Vetting, after the month-end pay run. Tier figures are taken from the pay run; facility figures are taken from the strength returns submitted by facility command sections under :x[OSC-DIR-0233]. Figures are persons, not posts. This revision supersedes Revision 21 (as at pay run 31 MAR 2008), which is to be destroyed on receipt of this revision under the records schedule of the holding division.

## 1. Strength by tier

::canon-table{source="tiers" cols="tier:Tier,name:Designation,count:Strength,clearance:Clearance,knowledgeScope:Knowledge scope"}

Total personnel :c[headline.staffTotal] (all tiers, pay run 30 APR 2008). Tier records: :x[OSC-PER-T1], :x[OSC-PER-T2], :x[OSC-PER-T3], :x[OSC-PER-T4].

Tier 1 composition is as stated in the Facility Inventory and is not repeated here. Tier 2 strength by installation is held as an annex:

:::redact{tier=2 auth="PV" ref="OSC-DIR-0233"}
**Annex T2 (Tier 2 by installation).** Tier 2 strength is reported by each facility command as the Command Staff line of its strength return and is not separately audited by this office. ALPHA commands report the commander, deputy commander, chief of staff, senior intelligence officer and resident division heads. BETA commands report the commander, deputy commander and senior intelligence officer only. GAMMA superintendents are reported by the parent BETA command. DELTA sites have no Tier 2 post. Tier 2 personnel serving at ALPHA-01 with the Council Secretariat, the Office of Internal Assurance and the network divisions are carried on the ALPHA-01 return irrespective of division. Acting Tier 2 credentials are not counted in Tier 2 strength (:x[OSC-DIR-0395]).
:::

## 2. Strength by facility class

| Category | Strength | Installations | Class record | Site |
|---|---|---|---|---|
| ALPHA (Command & Control Hubs) | :c[classes.ALPHA.statedStaff] | :c[classes.ALPHA.count] | :x[OSC-FAC-CLS-ALPHA] | Facility returns |
| BETA (Regional Operations Centers) | :c[classes.BETA.statedStaff] | :c[classes.BETA.count] | :x[OSC-FAC-CLS-BETA] | Facility returns |
| GAMMA (Personnel Shelters) | :c[classes.GAMMA.statedStaff] | :c[classes.GAMMA.count] | :x[OSC-FAC-CLS-GAMMA] | Parent BETA returns |
| DELTA (Safe Houses & Caches) | :c[classes.DELTA.statedStaff] | :c[classes.DELTA.count] | :x[OSC-FAC-CLS-DELTA] | SFC rotation return |
| Total posted staff | :c[headline.staffPosted] | :c[headline.facilities] | :x[OSC-FAC-IDX] | |
| DETACHED / UNPOSTED (a) | :c[headline.staffUnposted] | — | — | Carried centrally |
| Total personnel | :c[headline.staffTotal] | | | |

(a) Categories other than POSTED: see personnel accounting (:x[OSC-DIR-0233]).

:r[Declarations on OSC-F-131 received this period: four. Collection for the period closes 27 MAY 2008 at 2100Z (1700 EDT).]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"}

## 3. Movements in the period 01 APR to 30 APR 2008

| Movement | Persons | Remarks |
|---|---|---|
| New appointments | nil | Phase 3 intake is reported quarterly. Next report 01 JUL 2008. |
| Postings between facilities | 6 | All six on probationary transfer (:x[OSC-PER-TRF]). |
| Postings within a facility (division change) | 11 | Returned on the facility strength return only. |
| Separations | nil | |
| Changes of category | see personnel accounting | |

## 4. Utilization

Utilization is :c[headline.utilizationPct] per cent, stated as total personnel :c[headline.staffTotal] over sustained capacity of :c[headline.capacitySustained] persons. Facility and class percentages shown in the Facility Registry (:x[OSC-FAC-IDX]) are calculated on each site's berthing and are not comparable with the figure in this paragraph. The basis was restated at Revision 20 and is not to be altered without reference to the Director, Personnel & Vetting.

## 5. Use of this summary

Figures in this summary are the controlling figures for staffing calculations, the ratio model and recruitment planning. Named personnel are listed in the Personnel Directory (:x[OSC-PER-DIR]); terms are as defined in the Glossary (:x[OSC-SYS-GLO]). Queries on any figure are raised to Pay & Strength Accounting as a personnel query (PV-Q) and are not to be raised by mail.

The next revision will be issued after the pay run of 30 MAY 2008. Month-end personnel accounting returns are due 30 MAY 2008 at 2000Z (1600 EDT).
