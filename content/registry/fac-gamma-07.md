---
id: fac-gamma-07
route: /registry/facility/gamma-07
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-07
title: "Facility Dossier: GAMMA-07"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-07
summary: Personnel Shelter, Detroit Area. Manufacturing continuity. Diesel backup tested in the August 2003 outage.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-EAS, OSC-RSV-ENERGY]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-07, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Detroit Area }
    - { label: Function, value: Manufacturing continuity }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2003-02-24, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2003-09-08, change: Note added on diesel plant performance, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-05-25, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-07.capacity] |
| Posted staff | :c[facilities.GAMMA-07.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-07.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-07.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0338.name] (P-2-06-0338)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-10 (Eastern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-07.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Note. The construction-phase diesel plant carried the site through the 14 AUG 2003 outage without load-shedding. Logged with the same event at one other site as the first test of the diesel backup requirement (:x[OSC-RSV-ENERGY]).

Last inspection: 20 FEB 2008, generator run test, loaded, FE/ALPHA-02. Satisfactory.
