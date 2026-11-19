---
id: fac-gamma-14
route: /registry/facility/gamma-14
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-14
title: "Facility Dossier: GAMMA-14"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-14
summary: Personnel Shelter, Boise Area. Northwest agricultural. Completed APR 2008; seal acceptance outstanding.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-MTW]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-14, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Boise Area }
    - { label: Function, value: Northwest agricultural }
    - { label: Seal state, value: OPEN }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2006-05-08, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-11-19, change: Medical suite fit-out entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-04-18, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-14.capacity] |
| Posted staff | :c[facilities.GAMMA-14.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-14.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-14.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0370.name] (P-2-06-0370)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-11 (Mountain/Western Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-14.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Last inspection: 22 APR 2008, completion acceptance survey, FE/ALPHA-02. Accepted. Seal acceptance test to be scheduled.
