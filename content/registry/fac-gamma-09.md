---
id: fac-gamma-09
route: /registry/facility/gamma-09
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-09
title: "Facility Dossier: GAMMA-09"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-09
summary: Personnel Shelter, Houston Corridor. Oil/gas expertise preservation. Loaded generator run test 15 MAY 2008.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-SOU]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-09, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Houston Corridor }
    - { label: Function, value: Oil/gas expertise preservation }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2004-03-22, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2006-12-15, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-08-06, change: Cold store added to plant list, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review; scheduled item for MAY 2008 entered, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-09.capacity] |
| Posted staff | :c[facilities.GAMMA-09.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-09.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-09.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0347.name] (P-2-06-0347)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[ALPHA-05 (Southern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-09.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Scheduled: generator run test, loaded, 15 MAY 2008, 1600Z (1100 CDT) to 1800Z (1300 CDT).

Last inspection: 09 APR 2008, sump and dewatering pumps, FE/ALPHA-02. Pump 2 impeller replaced; returned to service the same day.
