---
id: fac-gamma-17
route: /registry/facility/gamma-17
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-17
title: "Facility Dossier: GAMMA-17"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-17
summary: Personnel Shelter, Indianapolis Perimeter. Heartland manufacturing.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-CEN]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-17, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: Indianapolis Perimeter }
    - { label: Function, value: Heartland manufacturing }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2006-02-13, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-03-28, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-04-11, change: Staffing posted, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-17.capacity] |
| Posted staff | :c[facilities.GAMMA-17.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-17.depthFt]{auth="TO" ref="TO-07-313"} ft]{tier=2 auth="FE" ref="FE-07-0388"} |
| Surface cover | :r[None. No surface cover facility.]{tier=2 auth="CVO" ref="CVO-07-027"} |
| Site superintendent | :r[:c[roster.P-2-06-0383.name]{auth="PV" ref="PV-07-212"} (P-2-06-0383)]{compartment=SEXTANT auth="PV" ref="PV-07-113"} |
| Tram connection | :r[BETA-09 (Central Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

Last inspection: 31 MAR 2008, completion acceptance survey, FE/ALPHA-02. Accepted without exceptions.
