---
id: fac-gamma-02
route: /registry/facility/gamma-02
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-02
title: "Facility Dossier: GAMMA-02"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-02
summary: Personnel Shelter, New York City Perimeter. Financial sector continuity. Diesel plant carried full load in the August 2003 outage.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-RSV-ENERGY]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-02, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: New York City Perimeter }
    - { label: Function, value: Financial sector continuity }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2002-10-21, change: Site designated; construction record opened, by: FE/ALPHA-02 }
  - { rev: "2", date: 2003-09-08, change: Note added on diesel plant performance, by: FE/ALPHA-02 }
  - { rev: "3", date: 2006-09-29, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-02.capacity] |
| Posted staff | :c[facilities.GAMMA-02.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-02.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-02.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0316.name] (P-2-06-0316)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-02.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Note. Construction-phase diesel plant at this site ran for the whole of the 14 AUG 2003 northeastern power outage without load-shedding. The run is recorded as the first network test of the diesel backup requirement and is the basis of the monthly generator run test. See :x[OSC-RSV-ENERGY].

Last inspection: 26 MAR 2008, generator and fuel system survey, FE/ALPHA-02. Day tank level switch replaced. Satisfactory.
