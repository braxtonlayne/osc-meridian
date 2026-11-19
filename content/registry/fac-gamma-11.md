---
id: fac-gamma-11
route: /registry/facility/gamma-11
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-11
title: "Facility Dossier: GAMMA-11"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-11
summary: Personnel Shelter, Los Angeles Basin. West Coast tech/media. Fire drill 21 MAY 2008.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-MTW, OSC-DIR-0156]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-11, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Los Angeles Basin }
    - { label: Function, value: West Coast tech/media }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2004-11-01, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-03-30, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-12-03, change: Waterproofing remedial works closed out, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review; scheduled item for MAY 2008 entered, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-11.capacity] |
| Posted staff | :c[facilities.GAMMA-11.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-11.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-11.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0356.name] (P-2-06-0356)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-08 (Mountain/Western Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-11.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Scheduled: fire drill, 21 MAY 2008, 1730Z (1030 PDT) to 1800Z (1100 PDT), under :x[OSC-DIR-0156]. Muster at refuge chambers, not the surface.

Last inspection: 28 MAR 2008, berth count audit, FE/ALPHA-02. Count agrees with register.
