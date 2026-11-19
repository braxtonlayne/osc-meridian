---
id: fac-gamma-18
route: /registry/facility/gamma-18
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-18
title: "Facility Dossier: GAMMA-18"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-18
summary: Personnel Shelter, Tampa Bay. Military retiree concentration. No tram connection.
xrefs: [OSC-FAC-CLS-GAMMA]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-18, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Tampa Bay }
    - { label: Function, value: Military retiree concentration }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-04-25, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-12-14, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-02-04, change: Fuel storage capacity corrected in plant list, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-18.capacity] |
| Posted staff | :c[facilities.GAMMA-18.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-18.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-18.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[CDR (Ret.) :c[roster.P-2-06-0386.name] (P-2-06-0386)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-18.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Last inspection: 07 APR 2008, annual life support survey, FE/ALPHA-02. Carbon dioxide scrubber media within date.
