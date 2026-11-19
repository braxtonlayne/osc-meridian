---
id: fac-gamma-03
route: /registry/facility/gamma-03
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-03
title: "Facility Dossier: GAMMA-03"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
audience: 2
facility: GAMMA-03
summary: Personnel Shelter, DC Metro Belt. Political/bureaucratic personnel. Door 2 seal inspection and tram link possession scheduled for May.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-TRN-NET-EAS]
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER"
  identity:
    - { label: Designation, value: GAMMA-03, mono: true }
    - { label: Class, value: GAMMA (Personnel Shelter) }
    - { label: Area, value: DC Metro Belt }
    - { label: Function, value: Political/bureaucratic personnel }
    - { label: Seal state, value: CONDITIONED }
    - { label: Register section, value: FE/ALPHA-02 Facilities Register }
revisions:
  - { rev: "1", date: 2003-04-14, change: Site designated, by: FE/ALPHA-02 }
  - { rev: "2", date: 2006-03-31, change: Completion entered; staffing posted, by: FE/ALPHA-02 }
  - { rev: "3", date: 2007-07-16, change: Medical posts added to staffing, by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: Annual register review; scheduled items for MAY 2008 entered, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-03.capacity] |
| Posted staff | :c[facilities.GAMMA-03.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Depth | :r[:c[facilities.GAMMA-03.depthFt] ft]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| Surface cover | :r[:c[facilities.GAMMA-03.coverStory]]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| Site superintendent | :r[:c[roster.P-2-06-0320.name] (P-2-06-0320)]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} |
| Tram connection | :r[BETA-02 (Eastern Network)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

::canon-table{source="facilities.GAMMA-03.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

Scheduled:

- Seal integrity inspection, personnel door 2, 05 MAY 2008, 1500Z (1100 EDT) to 1700Z (1300 EDT). Door 2 out of use for the inspection; door 1 for all entry and exit.
- Possession of the tram link :r[BETA-02 to GAMMA-03]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}, 22 MAY 2008, 0400Z (0000 EDT) to 0800Z (0400 EDT), track inspection. No movements on the link. See :x[OSC-TRN-NET-EAS].

Last inspection: 17 MAR 2008, annual life support survey, FE/ALPHA-02. No findings.
