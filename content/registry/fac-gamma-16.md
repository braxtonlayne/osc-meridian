---
id: fac-gamma-16
route: /registry/facility/gamma-16
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-16
title: "Facility Dossier: GAMMA-16"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-16
summary: Personnel Shelter, Nashville Area. Mid-South logistics.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-SOU]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-16, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: Nashville Area }
    - { label: Function, value: Mid-South logistics }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-10-03, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-09-28, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-01-08, change: Seal state field added to identity block (all GAMMA dossiers), by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-16.capacity] |
| Posted staff | :c[facilities.GAMMA-16.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Surface cover | :r[:c[facilities.GAMMA-16.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0379.name] (P-2-06-0379)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-12 (Southern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

Last inspection: 03 MAR 2008, emergency lighting duration test, FE/ALPHA-02. Satisfactory.
