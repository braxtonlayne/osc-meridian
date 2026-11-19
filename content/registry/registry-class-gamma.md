---
id: registry-class-gamma
route: /registry/class/gamma
app: registry
family: registry
template: index
docNo: OSC-FAC-CLS-GAMMA
title: "Facility Class Standard: GAMMA (Personnel Shelters)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 7
date: 2008-04-30
audience: 2
summary: Class standard for the eighteen Personnel Shelters. Depth band, life support window, transit entitlement, and a table of sites by area and function.
xrefs: [OSC-FAC-IDX, OSC-TRN-NET-EAS, OSC-TRN-NET-SOU, OSC-TRN-NET-MTW, OSC-TRN-NET-CEN]
revisions:
  - { rev: "1", date: 2002-03-11, change: Class standard issued, by: FE/ALPHA-02 }
  - { rev: "2", date: 2003-09-08, change: Diesel backup requirement restated after the August 2003 outage, by: FE/ALPHA-02 }
  - { rev: "3", date: 2004-06-21, change: Site list extended to eighteen, by: FE/ALPHA-02 }
  - { rev: "4", date: 2006-04-03, change: First completions entered, by: FE/ALPHA-02 }
  - { rev: "5", date: 2007-05-14, change: Superintendent column withheld below compartment read-in, by: FE/ALPHA-02 }
  - { rev: "6", date: 2008-01-08, change: Seal state added to GAMMA dossier identity blocks, by: FE/ALPHA-02 }
  - { rev: "7", date: 2008-04-30, change: Annual register review; staffing and berthing refreshed from returns, by: FE/ALPHA-02 }
entries:
  - { docNo: OSC-FAC-GAMMA-01, title: "Facility Dossier: GAMMA-01", route: /registry/facility/gamma-01, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-02, title: "Facility Dossier: GAMMA-02", route: /registry/facility/gamma-02, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-03, title: "Facility Dossier: GAMMA-03", route: /registry/facility/gamma-03, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-04, title: "Facility Dossier: GAMMA-04", route: /registry/facility/gamma-04, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-05, title: "Facility Dossier: GAMMA-05", route: /registry/facility/gamma-05, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-06, title: "Facility Dossier: GAMMA-06", route: /registry/facility/gamma-06, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-07, title: "Facility Dossier: GAMMA-07", route: /registry/facility/gamma-07, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-08, title: "Facility Dossier: GAMMA-08", route: /registry/facility/gamma-08, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-09, title: "Facility Dossier: GAMMA-09", route: /registry/facility/gamma-09, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-10, title: "Facility Dossier: GAMMA-10", route: /registry/facility/gamma-10, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-11, title: "Facility Dossier: GAMMA-11", route: /registry/facility/gamma-11, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-12, title: "Facility Dossier: GAMMA-12", route: /registry/facility/gamma-12, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-13, title: "Facility Dossier: GAMMA-13", route: /registry/facility/gamma-13, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-14, title: "Facility Dossier: GAMMA-14", route: /registry/facility/gamma-14, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-15, title: "Facility Dossier: GAMMA-15", route: /registry/facility/gamma-15, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-16, title: "Facility Dossier: GAMMA-16", route: /registry/facility/gamma-16, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-17, title: "Facility Dossier: GAMMA-17", route: /registry/facility/gamma-17, date: 2008-04-30, marking: UMBRA-C }
  - { docNo: OSC-FAC-GAMMA-18, title: "Facility Dossier: GAMMA-18", route: /registry/facility/gamma-18, date: 2008-04-30, marking: UMBRA-C }
---

This standard governs the GAMMA class of installation. It is maintained by the Facilities Register Section, FE/ALPHA-02, and is reissued after each annual register review. Individual site records are listed at the foot of this page; the network register is :x[OSC-FAC-IDX].

## Standard

| Item | Standard |
|---|---|
| Class | Personnel Shelters |
| Depth band | :c[classes.GAMMA.depthText] |
| Purpose | Personnel preservation focus: essential staff only |
| Life support | :c[classes.GAMMA.sustainabilityText] |
| Transit | :c[classes.GAMMA.transitEntitlement] |
| Installations | :c[classes.GAMMA.count] |
| Berthing, class aggregate | :c[classes.GAMMA.statedCapacity] |
| Posted staff, class aggregate | :c[classes.GAMMA.statedStaff] |

Selection of essential personnel for GAMMA berthing is not set by this standard. Seal state for each site is reported as a word (OPEN, CONDITIONED, SEALED, SEALED (DRILL)) on the site dossier. Normal operating state is CONDITIONED.

## Sites

| Site | Area | Function | Berthing | Staff | Superintendent | Tram feed |
|---|---|---|---|---|---|---|
| :x[OSC-FAC-GAMMA-01] | :c[facilities.GAMMA-01.locationText] | :c[facilities.GAMMA-01.function] | :c[facilities.GAMMA-01.capacity] | :c[facilities.GAMMA-01.staff] | :r[:c[roster.P-2-06-0311.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-02] | :c[facilities.GAMMA-02.locationText] | :c[facilities.GAMMA-02.function] | :c[facilities.GAMMA-02.capacity] | :c[facilities.GAMMA-02.staff] | :r[:c[roster.P-2-06-0316.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-03] | :c[facilities.GAMMA-03.locationText] | :c[facilities.GAMMA-03.function] | :c[facilities.GAMMA-03.capacity] | :c[facilities.GAMMA-03.staff] | :r[:c[roster.P-2-06-0320.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-02]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-04] | :c[facilities.GAMMA-04.locationText] | :c[facilities.GAMMA-04.function] | :c[facilities.GAMMA-04.capacity] | :c[facilities.GAMMA-04.staff] | :r[:c[roster.P-2-06-0325.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-02]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-05] | :c[facilities.GAMMA-05.locationText] | :c[facilities.GAMMA-05.function] | :c[facilities.GAMMA-05.capacity] | :c[facilities.GAMMA-05.staff] | :r[:c[roster.P-2-06-0329.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-03]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-06] | :c[facilities.GAMMA-06.locationText] | :c[facilities.GAMMA-06.function] | :c[facilities.GAMMA-06.capacity] | :c[facilities.GAMMA-06.staff] | :r[:c[roster.P-2-06-0334.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-03]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-07] | :c[facilities.GAMMA-07.locationText] | :c[facilities.GAMMA-07.function] | :c[facilities.GAMMA-07.capacity] | :c[facilities.GAMMA-07.staff] | :r[:c[roster.P-2-06-0338.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-10]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-08] | :c[facilities.GAMMA-08.locationText] | :c[facilities.GAMMA-08.function] | :c[facilities.GAMMA-08.capacity] | :c[facilities.GAMMA-08.staff] | :r[:c[roster.P-2-06-0343.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[ALPHA-05]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-09] | :c[facilities.GAMMA-09.locationText] | :c[facilities.GAMMA-09.function] | :c[facilities.GAMMA-09.capacity] | :c[facilities.GAMMA-09.staff] | :r[:c[roster.P-2-06-0347.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[ALPHA-05]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-10] | :c[facilities.GAMMA-10.locationText] | :c[facilities.GAMMA-10.function] | :c[facilities.GAMMA-10.capacity] | :c[facilities.GAMMA-10.staff] | :r[:c[roster.P-2-06-0352.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-09; BETA-05]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-11] | :c[facilities.GAMMA-11.locationText] | :c[facilities.GAMMA-11.function] | :c[facilities.GAMMA-11.capacity] | :c[facilities.GAMMA-11.staff] | :r[:c[roster.P-2-06-0356.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-08]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-12] | :c[facilities.GAMMA-12.locationText] | :c[facilities.GAMMA-12.function] | :c[facilities.GAMMA-12.capacity] | :c[facilities.GAMMA-12.staff] | :r[:c[roster.P-2-06-0361.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[ALPHA-04]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-13] | :c[facilities.GAMMA-13.locationText] | :c[facilities.GAMMA-13.function] | :c[facilities.GAMMA-13.capacity] | :c[facilities.GAMMA-13.staff] | :r[:c[roster.P-2-06-0365.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-07]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-14] | :c[facilities.GAMMA-14.locationText] | :c[facilities.GAMMA-14.function] | :c[facilities.GAMMA-14.capacity] | :c[facilities.GAMMA-14.staff] | :r[:c[roster.P-2-06-0370.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-11]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-15] | :c[facilities.GAMMA-15.locationText] | :r[:c[facilities.GAMMA-15.function]]{tier=2 auth="PV" ref="OSC-ASR-CG"} | :c[facilities.GAMMA-15.capacity] | :c[facilities.GAMMA-15.staff] | :r[:c[roster.P-2-06-0374.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-16] | :c[facilities.GAMMA-16.locationText] | :c[facilities.GAMMA-16.function] | :c[facilities.GAMMA-16.capacity] | :c[facilities.GAMMA-16.staff] | :r[:c[roster.P-2-06-0379.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-12]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-17] | :c[facilities.GAMMA-17.locationText] | :c[facilities.GAMMA-17.function] | :c[facilities.GAMMA-17.capacity] | :c[facilities.GAMMA-17.staff] | :r[:c[roster.P-2-06-0383.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[BETA-09]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| :x[OSC-FAC-GAMMA-18] | :c[facilities.GAMMA-18.locationText] | :c[facilities.GAMMA-18.function] | :c[facilities.GAMMA-18.capacity] | :c[facilities.GAMMA-18.staff] | :r[:c[roster.P-2-06-0386.name]]{compartment=SEXTANT auth="PV" ref="OSC-CB-013"} | :r[None]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

Superintendent and tram feed columns are network geography and are withheld below compartment read-in (:x[OSC-DIR-0412]). Network sheets: :x[OSC-TRN-NET-EAS], :x[OSC-TRN-NET-SOU], :x[OSC-TRN-NET-MTW], :x[OSC-TRN-NET-CEN].

Action officer: Facilities Register Section, FE/ALPHA-02. Next review: APR 2009.
