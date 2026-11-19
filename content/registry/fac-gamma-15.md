---
id: fac-gamma-15
route: /registry/facility/gamma-15
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-15
title: "Facility Dossier: GAMMA-15"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-15
summary: Personnel Shelter, Albuquerque Region. No tram connection. Seal integrity test (drill) 29 MAY 2008.
xrefs: [OSC-FAC-CLS-GAMMA]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-15, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Albuquerque Region }
    - { label: Function, value: Withheld (see table) }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2003-12-01, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2006-07-28, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-03-05, change: Function line withheld at Tier 2 on PV instruction, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review; scheduled item for MAY 2008 entered, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Function | :r[:c[facilities.GAMMA-15.function]]{tier=2 auth="PV" ref="OSC-ASR-CG"} |
| Berthing | :c[facilities.GAMMA-15.capacity] |
| Posted staff | :c[facilities.GAMMA-15.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-15.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-15.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0374.name], PhD (P-2-06-0374)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-15.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Scheduled: seal integrity test (drill), 29 MAY 2008, 1400Z (0800 MDT) to 2000Z (1400 MDT). Facility at SEALED (DRILL) for six hours. No entry or exit.

Last inspection: 15 APR 2008, ration stock rotation, FE/ALPHA-02. One pallet past rotation date withdrawn and replaced.
