---
id: fac-gamma-13
route: /registry/facility/gamma-13
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-13
title: "Facility Dossier: GAMMA-13"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-13
summary: Personnel Shelter, Portland Metro. Pacific resource corridor. Seal drill held during the October 2007 exercise week.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-MTW, OSC-ASR-THR-02]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-13, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: Portland Metro }
    - { label: Function, value: Pacific resource corridor }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-08-22, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-10-22, change: "Seal drill entered (SEALED (DRILL), 15 to 19 OCT 2007)", by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-01-25, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-13.capacity] |
| Posted staff | :c[facilities.GAMMA-13.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Surface cover | :r[None. No surface cover facility.]{tier=2 auth="CVO" ref="CVO-07-027"} |
| Site superintendent | :r[:c[roster.P-2-06-0365.name]{auth="PV" ref="PV-07-212"} (P-2-06-0365)]{compartment=SEXTANT auth="PV" ref="PV-07-113"} |
| Tram connection | :r[BETA-07 (Mountain/Western Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

Note. Seal drill held 15 to 19 OCT 2007, during the national exercise week, so that any surface observation would be put down to the exercise. Recorded in telemetry history as SEALED (DRILL). The drill was held before completion was entered and counts toward seal acceptance. See :x[OSC-ASR-THR-02].

Last inspection: 30 JAN 2008, gas-phase filter change, seal-capable zones, FE/ALPHA-02. Completed on schedule.
