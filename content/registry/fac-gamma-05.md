---
id: fac-gamma-05
route: /registry/facility/gamma-05
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-05
title: "Facility Dossier: GAMMA-05"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-05
summary: Personnel Shelter, Charlotte Region. Banking infrastructure.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-SOU]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-05, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Charlotte Region }
    - { label: Function, value: Banking infrastructure }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-09-19, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-10-26, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-01-08, change: Seal state field added to identity block (all GAMMA dossiers), by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-05.capacity] |
| Posted staff | :c[facilities.GAMMA-05.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-05.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-05.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0329.name] (P-2-06-0329)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-03 (Southern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-05.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Last inspection: 11 MAR 2008, fire detection and suppression test, FE/ALPHA-02. Passed.
