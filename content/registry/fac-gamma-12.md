---
id: fac-gamma-12
route: /registry/facility/gamma-12
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-12
title: "Facility Dossier: GAMMA-12"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-12
summary: Personnel Shelter, San Francisco Bay. Silicon Valley preservation.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-MTW]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-12, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: San Francisco Bay }
    - { label: Function, value: Silicon Valley preservation }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-03-14, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-07-27, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-10-09, change: Staffing posted, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-12.capacity] |
| Posted staff | :c[facilities.GAMMA-12.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-12.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-12.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0361.name] (P-2-06-0361)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[ALPHA-04 (Mountain/Western Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-12.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Last inspection: 18 APR 2008, ventilation smoke test, FE/ALPHA-02. No findings.
