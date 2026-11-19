---
id: fac-gamma-06
route: /registry/facility/gamma-06
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-06
title: "Facility Dossier: GAMMA-06"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-06
summary: Personnel Shelter, Miami Outskirts. Latin America operations personnel. Completion acceptance items open.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-SOU]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-06, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Miami Outskirts }
    - { label: Function, value: Latin America operations personnel }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2006-01-30, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-06-11, change: Dewatering works entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-02-28, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-06.capacity] |
| Posted staff | :c[facilities.GAMMA-06.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-06.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[None. No surface cover facility.]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0334.name] (P-2-06-0334)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-03 (Southern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

Last inspection: 25 FEB 2008, completion acceptance survey, FE/ALPHA-02. Two items open: berth curtain rails, bay 3; refuge chamber 1 signage.
