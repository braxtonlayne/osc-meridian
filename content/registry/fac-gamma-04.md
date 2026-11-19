---
id: fac-gamma-04
route: /registry/facility/gamma-04
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-04
title: "Facility Dossier: GAMMA-04"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-04
summary: Personnel Shelter, Philadelphia Suburbs. Northeast industrial base.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-EAS]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-04, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: Philadelphia Suburbs }
    - { label: Function, value: Northeast industrial base }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2005-11-07, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2007-08-24, change: Completion entered, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-08-31, change: Typographical correction to area field, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-04.capacity] |
| Posted staff | :c[facilities.GAMMA-04.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Surface cover | :r[:c[facilities.GAMMA-04.coverStory]{auth="CVO" ref="CVO-07-113"}]{tier=2 auth="CVO" ref="CVO-07-027"} |
| Site superintendent | :r[:c[roster.P-2-06-0325.name]{auth="PV" ref="PV-07-212"} (P-2-06-0325)]{compartment=SEXTANT auth="PV" ref="PV-07-113"} |
| Tram connection | :r[BETA-02 (Eastern Network)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

Class standard: :x[OSC-FAC-CLS-GAMMA]. Network sheet: :x[OSC-TRN-NET-EAS].

Last inspection: 02 APR 2008, potable water sampling, FE/ALPHA-02. Results within limits.
