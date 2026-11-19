---
id: fac-gamma-01
route: /registry/facility/gamma-01
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-01
title: "Facility Dossier: GAMMA-01"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-01
summary: Personnel Shelter, Greater Boston Metro. Academic/scientific personnel focus. No tram connection.
xrefs: [OSC-FAC-CLS-GAMMA]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-01, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Greater Boston Metro }
    - { label: Function, value: Academic/scientific personnel focus }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-06-03, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-04-27, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-09-12, change: Posted staff corrected after first strength return, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-01.capacity] |
| Posted staff | :c[facilities.GAMMA-01.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Surface cover | :r[:c[facilities.GAMMA-01.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0311.name] (P-2-06-0311)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

Class standard: :x[OSC-FAC-CLS-GAMMA].

Last inspection: 08 APR 2008, annual life support survey, FE/ALPHA-02. Belt tension on air handling unit 1 adjusted on site. No other findings.
