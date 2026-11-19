---
id: fac-gamma-08
route: /registry/facility/gamma-08
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-08
title: "Facility Dossier: GAMMA-08"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-08
summary: Personnel Shelter, Dallas-Fort Worth. Energy sector personnel.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-SOU]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-08, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: Dallas-Fort Worth }
    - { label: Function, value: Energy sector personnel }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2004-08-16, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-02-26, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-01-08, change: "Seal state field added to identity block (all GAMMA dossiers)", by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-08.capacity] |
| Posted staff | :c[facilities.GAMMA-08.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-08.depthFt]{auth="TO" ref="TO-07-313"} ft]{tier=2 auth="FE" ref="FE-07-0388"} |
| Surface cover | :r[:c[facilities.GAMMA-08.coverStory]{auth="CVO" ref="CVO-07-113"}]{tier=2 auth="CVO" ref="CVO-07-027"} |
| Site superintendent | :r[:c[roster.P-2-06-0343.name]{auth="PV" ref="PV-07-212"} (P-2-06-0343)]{compartment=SEXTANT auth="PV" ref="PV-07-113"} |
| Tram connection | :r[ALPHA-05 (Southern Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

::canon-table{source="facilities.GAMMA-08.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Last inspection: 14 APR 2008, blast valve cycling, FE/ALPHA-02. All valves within closure time.
