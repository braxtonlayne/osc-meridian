---
id: registry-class-alpha
route: /registry/class/alpha
app: registry
family: registry
template: index
docNo: OSC-FAC-CLS-ALPHA
title: "Facility Class Standard: ALPHA (Command & Control Hubs)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 7
date: 2008-04-30
summary: "Class standard for the five Command & Control Hubs: 800 to 2,400 ft, full life support and independent power, rail terminals and inter-hub connections."
distribution:
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Director, Transit Operations (TO/ALPHA-01)
  - Director, Logistics & Reserves (LR/ALPHA-05)
  - Director, Personnel & Vetting (PV/ALPHA-01)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-IDX
  - OSC-TRN-ENG
  - OSC-RSV-ENERGY
  - OSC-PER-RATIO
entries:
  - { docNo: OSC-FAC-ALPHA-01, title: "Facility Dossier: ALPHA-01 \"RAVEN MOUNTAIN\"", route: /registry/facility/alpha-01, date: 2008-04-30, marking: UMBRA-C, note: Rev 9 }
  - { docNo: OSC-FAC-ALPHA-02, title: "Facility Dossier: ALPHA-02 \"OLYMPUS STATION\"", route: /registry/facility/alpha-02, date: 2008-04-30, marking: UMBRA-C, note: Rev 9 }
  - { docNo: OSC-FAC-ALPHA-03, title: "Facility Dossier: ALPHA-03 \"ARCHIVE SITE TANGO\"", route: /registry/facility/alpha-03, date: 2008-04-30, marking: UMBRA-C, note: Rev 11 }
  - { docNo: OSC-FAC-ALPHA-04, title: "Facility Dossier: ALPHA-04 \"WESTERN CONTINUITY STATION\"", route: /registry/facility/alpha-04, date: 2008-04-30, marking: UMBRA-C, note: Rev 9 }
  - { docNo: OSC-FAC-ALPHA-05, title: "Facility Dossier: ALPHA-05 \"SENTINEL DEEP\"", route: /registry/facility/alpha-05, date: 2008-04-30, marking: UMBRA-C, note: Rev 9 }
revisions:
  - { rev: 7, date: 2008-04-30, change: "Site returns for pay run 30 APR 2008 entered. Class posted strength restated from returns. Para 6 reworded.", by: FE/ALPHA-02 }
  - { rev: 6, date: 2007-10-31, change: "Segment table brought into line with OSC-TRN-ENG. Para 4.3 (filter cycles) moved to OSC-DIR-0128.", by: FE/ALPHA-02 }
  - { rev: 5, date: 2007-03-30, change: "Inter-hub segments completed to MAR 2007 entered.", by: FE/ALPHA-02 }
---

This standard defines the ALPHA facility class and lists the installations carried in it. It is maintained by Facilities Engineering as the engineering authority for all facilities (OSC-DIR-0128 para 2 refers). Individual site particulars are held in the facility dossiers listed below; where this standard and a dossier differ, the dossier governs for that site and the difference is reported to FE/ALPHA-02 on the next site return.

## 1. Class definition

ALPHA installations are designated **:c[classes.ALPHA.name]**. A facility is carried in the class when it meets all four of the following criteria, which are taken from the Facility Inventory without amendment:

| Criterion | Inventory wording | Engineering reference |
|---|---|---|
| Depth | :c[classes.ALPHA.depthText] | Depth band :c[classes.ALPHA.depthMinFt] to :c[classes.ALPHA.depthMaxFt] ft to the terminal level; :x[OSC-TRN-ENG] |
| Life support and power | :c[classes.ALPHA.sustainabilityText] | Reactor plant at every site; :x[OSC-RSV-ENERGY] |
| Transit | :c[classes.ALPHA.transitEntitlement] | Inter-hub rail platforms plus regional tram platforms; :x[OSC-TRN-ENG] |
| Function | :r[Government reconstitution capability]{tier=2 auth="COUNCIL" ref="CC-ART-VI"} | See para 6 |

The class is closed at :c[classes.ALPHA.count] installations. No sixth site is programmed. Requests to reclassify a BETA installation upward are not entertained under this standard.

## 2. Installations carried

Figures are drawn from the site returns for the pay run of 30 APR 2008. Depth is to the top of the rail terminal level, not to the invert of the running tunnel.

::canon-table{source="facilities" auth="CVO" class="ALPHA" cols="id:Site,codename:Codename,depthFt:Depth (ft),completed:Completed,capacity:Berthing,staff:Posted staff,sustainedMonths:Window (months)" caption="ALPHA installations as at 30 APR 2008"}

**Class berthing** (the sum of the five site figures) is :c[classes.ALPHA.statedCapacity]. This is the surge figure for the class. It is not the class share of the network basis used for reserve planning, which is set by Logistics & Reserves and is not restated here.

**Class posted strength** is :c[classes.ALPHA.statedStaff]. The figure is not stated in the inventory; summed from returns. It counts personnel posted to the five sites on the date of the return. It does not count personnel carried in categories other than POSTED, who are not attributed to a site in the returns.

## 3. Staffing model

3.1. The class staffing model is the ratio model at :x[OSC-PER-RATIO]. It is based on ALPHA-01 at full berthing: :c[ratioModel.basis]. The model complement at that basis is :c[ratioModel.capacity] across ten functions.

3.2. No ALPHA site is staffed to the model in present conditions. The model note reads as follows and is reproduced verbatim:

> :c[ratioModel.note]

3.3. Sites report against their own breakdown headings, which do not in every case match the ten model functions. Returns are accepted under the headings submitted. A site that wishes to adopt the model headings does so at the start of a quarter and notifies PV/ALPHA-01.

## 4. Engineering standard (summary)

4.1. **Shafts and portals.** Each site has a surface cover facility, a portal security level, and a lift or adit connection to the first plant level. The interval between the portal level and the first plant level is shaft only and is not counted as a level.

4.2. **Air.** Each site has a mechanical level carrying the air handling units, NBC filtration and the seal-capable zone controls. Filter change cycles are set by :x[OSC-DIR-0128] and published locally.

4.3. **Power.** Each site carries one Hardened Continuity Power Unit, a diesel generator hall and switchgear on a single plant level. Unit ratings and status are reported on the reactor status pages listed at :x[OSC-RSV-ENERGY]. Reactor spaces are restricted to plant personnel and escorted test parties.

4.4. **Terminal.** The rail terminal is the lowest level at every site. Inter-hub platforms are numbered from 1; regional tram platforms follow. Platform numbering is not reused when a platform is out of service.

4.5. **Levels.** Level numbering runs from Level 0 at the surface. Level designations and access tiers are given in each dossier's level index. Level designations above the reader's tier are shown withheld at their true length.

## 5. Inter-hub segments

Segment lengths, running times and status are carried on :x[OSC-TRN-ENG] and the segment engineering sheets. They are not restated in this standard, so that one table governs. Engineering lengths are used for all FE purposes.

## 6. Hub functions

6.1. Each ALPHA site carries a function line in the Facility Inventory. Function lines for sites other than the reader's own are released under the network geography compartment.

| Site | Function (Facility Inventory) |
|---|---|
| ALPHA-01 | :r[:c[facilities.ALPHA-01.function]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| ALPHA-02 | :r[:c[facilities.ALPHA-02.function]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| ALPHA-03 | :c[facilities.ALPHA-03.function] |
| ALPHA-04 | :r[:c[facilities.ALPHA-04.function]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| ALPHA-05 | :r[:c[facilities.ALPHA-05.function]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |

6.2. Government reconstitution.

:::redact{tier=2 auth="COUNCIL" ref="CC-ART-VI"}
The class as a whole carries the reconstitution capability described in Article VI of the Charter. ALPHA-01 is the primary reconstitution site. ALPHA-05 is the secondary reconstitution site and is maintained to the same standing readiness for its conference suite. The remaining three sites provide continuity of function only and are not fitted for reconstitution. Rail paths between the primary and secondary sites are held in the working timetable by Transit Operations on instruction and are not offered for booking.
:::

## 7. Returns

7.1. Each site submits its strength and berthing return to FE/ALPHA-02 and PV/ALPHA-01 within five working days of the month-end pay run. Late returns are carried at the previous month's figure and marked as such.

7.2. Action officer for this standard: Plant Records Section, FE/ALPHA-02. Next scheduled review: 31 OCT 2008.

## 8. Class index

The five facility dossiers are listed below. Class standards for the other classes are held in the registry index at :x[OSC-FAC-IDX].
