---
id: fac-gamma-10
route: /registry/facility/gamma-10
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-10
title: "Facility Dossier: GAMMA-10"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-10
summary: Personnel Shelter, St. Louis Region. Mississippi logistics. Berthing, posted staff, seal state and tram feeds.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-CEN]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-10, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: St. Louis Region }
    - { label: Function, value: Mississippi logistics }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-02-14, change: Site designated; construction record opened, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-11-30, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-01-22, change: Second tram feed added to connection field, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review; no change to identity block, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-10.capacity] |
| Posted staff | :c[facilities.GAMMA-10.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-10.depthFt]{auth="TO" ref="TO-07-313"} ft]{tier=2 auth="FE" ref="FE-07-0388"} |
| Surface cover | :r[:c[facilities.GAMMA-10.coverStory]{auth="CVO" ref="CVO-07-113"}]{tier=2 auth="CVO" ref="CVO-07-027"} |
| Site superintendent | :r[:c[roster.P-2-06-0352.name]{auth="PV" ref="PV-07-212"} (P-2-06-0352)]{compartment=SEXTANT auth="PV" ref="PV-07-113"} |
| Tram connection | :r[BETA-09 (Central Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| Tram connection | :r[BETA-05 (Central Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

::canon-table{source="facilities.GAMMA-10.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Class standard: :x[OSC-FAC-CLS-GAMMA]. Network sheet: :x[OSC-TRN-NET-CEN].

Last inspection: 19 FEB 2008, life support survey, FE/ALPHA-02. No findings.
