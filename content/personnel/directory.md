---
id: personnel-directory
route: /personnel/directory
app: personnel
family: personnel
template: index
docNo: OSC-PER-DIR
title: Personnel Directory
marking: UMBRA-C
originator: PV/ALPHA-01
revision: 31
date: 2008-05-16
summary: Directory of named personnel by personnel number, with role, site, division and mail address; Tier 1 and Tier 2 names and addresses are withheld below their tier.
distribution:
  - All MERIDIAN workstations (read only)
xrefs: [OSC-PER-IDX, OSC-F-126, OSC-DIR-0412, OSC-DIR-0247, OSC-DIR-0447, OSC-PER-ORG]
revisions:
  - { rev: "31", date: "2008-05-16", change: "Pay run 30 APR 2008 changes. ALPHA-03 command section signature authorities noted.", by: "PV Personnel Number Register" }
  - { rev: "30", date: "2008-04-18", change: "Pay run 31 MAR 2008 changes. Two entries moved to the category list.", by: "PV Personnel Number Register" }
  - { rev: "29", date: "2008-03-14", change: "Pay run 29 FEB 2008 changes. One entry moved to the category list. Mail addresses rechecked against the key distribution network directory.", by: "PV Personnel Number Register" }
---

The directory is compiled by the Personnel Number Register, Personnel & Vetting, from the register and the facility strength returns, and is reissued after each month-end pay run. It lists personnel whose duties require them to be found by name across sites. It is not a complete list of personnel; strength figures are given only in :x[OSC-PER-IDX].

Names and mail addresses of Tier 1 and Tier 2 personnel are withheld below their tier. The personnel number, role and site remain shown so that a request requiring a named officer can be routed. Mail is addressed as described in :x[OSC-DIR-0447]; a withheld address may be reached through the command section of the site shown.

Remarks show the compartments a person holds where they may sponsor a request on OSC-F-126 (:x[OSC-F-126]; :x[OSC-DIR-0412] para 4(b)). A sponsor is identified on the form by personnel number. Personnel in the first 90 days of a probationary transfer are carried under their supervisor of record and are not entered separately until the final review (:x[OSC-DIR-0247]).

## Posted personnel

::canon-table{source="roster" filter="tier!=1,site!=DETACHED / UNPOSTED" cols="pn:Personnel no.,name:Name,rank:Rank,role:Role,site:Site,divisionId:Div.,email:Mail address,notes:Remarks" auth="PV"}

## Personnel carried centrally

Entries below are retained in the directory because the personnel number remains on the register.

| Personnel no. | Name | Role | Site | Div. | Mail address | Remarks |
|---|---|---|---|---|---|---|
| P-3-05-0142 | :r[Reginald Tobin]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Tunnel Survey Technician (former post)]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | DETACHED / UNPOSTED | :r[FE]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[r.tobin@a02.fe.mer]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Last posted ALPHA-02 FE, effective 19 APR 2007. Number not reissued.]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} |
| P-3-06-0977 | :r[Lewis Ackroyd]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Weapons Oversight Analyst (former post)]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | DETACHED / UNPOSTED | :r[IAD]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[l.ackroyd@b08.iad.mer]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Last posted BETA-08, effective 03 MAR 2008, mail account retained. Number not reissued.]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} |
| P-4-07-0219 | :r[Carol Ann Dimmick]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Records Technician (former post)]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | DETACHED / UNPOSTED | :r[RD]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[c.dimmick@a03.rd.mer]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} | :r[Last posted ALPHA-03, Records Division, effective 28 MAR 2008. Number not reissued. Workstation A03-5-114 reassigned 14 APR 2008.]{compartment=HOLLOW auth="PV" ref="PV-Q-08-0031"} |

## Entries withheld

| Personnel no. | Name | Role | Site | Div. | Mail address | Remarks |
|---|---|---|---|---|---|---|
| :r[P-1-01-0004]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Name withheld at origin]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Member, Core Council (Seat 10)]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[ALPHA-01]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | | :r[address withheld]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Holds distribution copy ten.]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} |
| :r[P-1-03-0009]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Name withheld at origin, two]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Member, Core Council (Seat 11)]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[ALPHA-01]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | | :r[address withheld]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} | :r[Holds distribution copy eleven.]{tier=1 auth="CS" ref="OSC-CNL-SEAT-00"} |

Category total, DETACHED / UNPOSTED :c[headline.staffUnposted]. Three entries are listed above; the category has no further directory entries. Enquiries about entries carried centrally are not dealt with by the directory office.

Terms used in Remarks. *Distribution copy*: a numbered physical copy of a Council record held by the person named (Council Secretariat register). *Certified mileage return*: the quarterly return to the Council of certified mileage, last certified at :c[headline.tunnelCertifiedMi] route miles. *Walk-down*: a scheduled inspection on foot under a possession. *Signature specimen*: a specimen held by Records Division against which signed records are checked.

Corrections to entries are reported to the Personnel Number Register, Level 6, ALPHA-01, through the command section of the site. Changes of role, site or mail address take effect at the next reissue.
