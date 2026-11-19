---
id: fac-gamma-08
route: /registry/facility/gamma-08
app: registry
family: registry
template: dossier
docNo: OSC-FAC-GAMMA-08
title: "Facility Dossier: GAMMA-08 (Site Extract, Tier 4)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-04-30
facility: GAMMA-08
summary: Site extract of the GAMMA-08 dossier for Tier 4 personnel posted to the site. Berthing, posted staff, doors, plant and assembly points. Connections are given as the adjacent hub.
xrefs: [OSC-FAC-CLS-GAMMA, OSC-DIR-0128, OSC-DIR-0156]
distribution:
  - Site Superintendent, GAMMA-08
  - "Posted on the command board, entry level (Tier 4 extract)"
dossier:
  dossierType: "FACILITY DOSSIER: PERSONNEL SHELTER (SITE EXTRACT)"
  identity:
    - { label: Designation, value: GAMMA-08, mono: true }
    - { label: Class, value: "GAMMA (Personnel Shelter)" }
    - { label: Area, value: Dallas-Fort Worth }
    - { label: Function, value: Energy sector personnel }
    - { label: Seal state, value: CONDITIONED }
    - { label: Extract for, value: Tier 4 personnel of this site }
revisions:
  - { rev: "3", date: 2008-01-08, change: "Seal state field added to identity block", by: FE/ALPHA-02 }
  - { rev: "4", date: 2008-04-30, change: "Annual register review", by: FE/ALPHA-02 }
---

This is the site extract of the dossier. It gives what you need to work at this site. It does not give the site's depth, its surface arrangements or its connections beyond the tram platform.

| Field | Entry |
|---|---|
| Berthing | :c[facilities.GAMMA-08.capacity] |
| Posted staff | :c[facilities.GAMMA-08.staff] |
| Sustainment window | :c[classes.GAMMA.sustainDaysMin] to :c[classes.GAMMA.sustainDaysMax] days |
| Site superintendent | Command board, entry level |
| Tram connection | The adjacent hub |
| Hardening | Mined shelter, dual portal |

::canon-table{source="facilities.GAMMA-08.staffBreakdown" cols="role:Post,count:Posted" caption="Posted staff by post"}

## Levels

| Level | Use |
|---|---|
| 0 | Surface access building (surface access door, camera G08-C01) |
| 1 | Entry level: entry portal, second portal, personnel airlock, tram platform, entry level assembly area |
| 2 | Shelter hall, bunk rooms, galley, clinic |
| 3 | Plant: air handling and scrubber room, generator room, water |

## Doors you will operate or log

| Door | Location | Normal state |
|---|---|---|
| G08-PD1 | Entry portal door | Closed |
| G08-BD1 | Entry blast door | Open on hooks |
| G08-PD2 | Second portal door | Closed |
| G08-BD2 | Second portal blast door | Open on hooks |
| G08-BD3 | Tram tunnel portal door | Open; closed on the instruction of Transit Control at the adjacent hub |
| G08-AL1 | Personnel airlock, outer and inner doors, decontamination cycle | Both closed |
| G08-BD4 | Plant room door | Closed |

Every door is logged when it changes state outside its normal state. The log is on the duty officer's desk, entry level.

## Assembly points

| Point | Location |
|---|---|
| G08-MP1 | Shelter hall, level 2 |
| G08-MP2 | Entry level assembly area |

Your assembly point is on your badge card. Muster totals are read by the badge readers at each point.

## Plant

Air handling: two units, AHU-1 and AHU-2, with CO2 scrubbers and gas-phase beds, in the level 3 plant room. Filter cycles are those in :x[OSC-DIR-0128]. Generator: one diesel set with a day tank, level 3, run tested monthly. No reactor.

Last inspection: 14 APR 2008, blast valve cycling, Facilities Engineering. All valves within closure time.
