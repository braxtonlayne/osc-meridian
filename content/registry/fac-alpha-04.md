---
id: fac-alpha-04
route: /registry/facility/alpha-04
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-04
title: "Facility Dossier: ALPHA-04 \"WESTERN CONTINUITY STATION\""
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 9
date: 2008-04-30
facility: ALPHA-04
summary: "WESTERN CONTINUITY STATION under the BLM surveying station cover."
distribution:
  - Facility Commander, ALPHA-04
  - Director, Cover Operations (CVO/ALPHA-04)
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Director, Transit Operations (TO/ALPHA-01)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-03
  - OSC-TRN-NET-MTW
  - OSC-RSV-RX-A04
  - OSC-ASR-COV
dossierType: &dtype "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity: &ident
  - { label: Designation, value: ALPHA-04, mono: true }
  - { label: Codename, value: WESTERN CONTINUITY STATION }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: Mountain/Western Network (terminal hub) }
  - { label: Cover identity, value: Bureau of Land Management Surveying Station }
  - { label: Reactor installation, value: RX-A04, mono: true }
  - { label: Facility Commander, value: C. Wendt }
  - { label: Resident divisions, value: CVO (headquarters) }
  - { label: Cover liaison, value: N. Buckmaster (CVO) }
  - { label: Register section, value: FE/ALPHA-02 Facilities Register }
  - { label: Dossier custodian, value: Plant Records Section, FE/ALPHA-02 }
dossier:
  facility: ALPHA-04
  dossierType: *dtype
  identity: *ident
revisions:
  - { rev: "9", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Cover review date updated.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2007-08-31, change: "Evaporative pre-cooling entered for Level 2.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2006-08-31, change: "Segment 03 entered on completion. Platform 1 brought into use.", by: FE/ALPHA-02 }
  - { rev: "6", date: 2006-01-31, change: "Completion entered.", by: FE/ALPHA-02 }
---

## 1. Location and terrain

| Field | Entry |
|---|---|
| Location (Facility Inventory) | :r[:c[facilities.ALPHA-04.locationText]]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"} |
| Terrain | :r[:c[facilities.ALPHA-04.terrain]]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"} |
| Entry | Drill shaft head inside the core shed; personnel and vehicle lifts |
| Depth to terminal level | :c[facilities.ALPHA-04.depthFt] ft |
| Completed | :c[facilities.ALPHA-04.completed] |

## 2. Cover identity

2.1. Cover identity as carried in the Facility Inventory: **:c[facilities.ALPHA-04.coverIdentity]**.

2.2. Prepared public statement:

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
> :c[facilities.ALPHA-04.coverStory]
:::

::canon-table{source="coverCatalogue" facility="ALPHA-04" cols="coverAgency:Cover agency,coverFacilityType:Cover facility type,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover catalogue entry, ALPHA-04"}

2.3. Cover Operations is headquartered at this site, and the surface station is maintained as the reference example of a working cover. The survey work is real. Core is drilled, logged, boxed and racked, and survey parties go out in marked vehicles on published dates. Below-grade personnel do not handle core, do not enter the core shed racks, and do not ride in survey vehicles.

2.4. Surface staff are not read in. They know the station has a deep service level for "instrument vaults" and that it is not their concern. Questions from surface staff are referred to the Cover Liaison Officer and are not answered by anyone else.

## 3. Function

:r[West Coast regional command. Pacific theater monitoring. Port security continuity. :r[Resource extraction oversight post-event.]{tier=2 auth="CVO" ref="OSC-ASR-CG"}]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"}

Cover Operations maintains the cover-identity catalogue (:x[OSC-ASR-COV]) and the prepared statements for every facility type from Level 5.

## 4. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-04.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-04.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-04.sustainedMonths] months |

::canon-table{source="facilities.ALPHA-04.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-04 posted staff by heading, pay run 30 APR 2008"}

4.1. Cover Operations personnel at this site are returned under Command Staff and Intelligence/Analysis. Surface station staff are employees of the cover agency and are not returned.

## 5. Connections

5.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-04.connectionsText]

5.2. Detail:

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
| Platform | Service | Reference | Engineering length (mi) | Running time (h) | Status |
|---|---|---|---|---|---|
| 1 | Segment 03 to ALPHA-02 | :x[OSC-TRN-SEG-03] | :c[railSegments.03.miles] | :c[railSegments.03.hours] | :c[railSegments.03.status] |

::canon-table{source="tramLinks" filter="from=ALPHA-04" cols="to:To,label:Area,miles:Miles,hours:Hours" caption="Western tram links from ALPHA-04 (platforms 2 to 4)"}

Network sheet: :x[OSC-TRN-NET-MTW]. ALPHA-04 is the end of the inter-hub line. Consists terminating here are turned on the Level 9 depot loop.
:::

## 6. Level index

| Level | Designation | Top (ft) | Access | Notes |
|---|---|---|---|---|
| 0 | Surface: Surveying Station Office and Core Shed | :c[facilities.ALPHA-04.levels.0.topFt] | T4 | :c[facilities.ALPHA-04.levels.0.notes] |
| 1 | Drill Shaft Head and Portal Security | :c[facilities.ALPHA-04.levels.1.topFt] | T4 | :c[facilities.ALPHA-04.levels.1.notes] |
| 2 | Mechanical / Air Handling | :c[facilities.ALPHA-04.levels.2.topFt] | T4 | :c[facilities.ALPHA-04.levels.2.notes] |
| 3 | Berthing A-E | :c[facilities.ALPHA-04.levels.3.topFt] | T4 | A and B occupied. C to E closed. |
| 4 | Dining, Personnel Services and Clinic | :c[facilities.ALPHA-04.levels.4.topFt] | T4 | One dining room. Clinic without theatre; surgical cases by consist to ALPHA-02. |
| 5 | Administration and Liaison Offices | :c[facilities.ALPHA-04.levels.5.topFt] | T3 | :c[facilities.ALPHA-04.levels.5.notes] |
| 6 | :r[Monitoring Floor]{tier=2 auth="IAD" ref="OSC-ASR-CG"} | :c[facilities.ALPHA-04.levels.6.topFt] | T2 | :r[Pacific monitoring and port security watch.]{tier=2 auth="IAD" ref="OSC-ASR-CG"} |
| 7 | :r[Plans Library]{tier=2 auth="CVO" ref="OSC-ASR-CG"} | :c[facilities.ALPHA-04.levels.7.topFt] | T2 | :r[Post-event resource planning holdings.]{tier=2 auth="CVO" ref="OSC-ASR-CG"} |
| 8 | :r[Power Plant]{tier=2 auth="FE" ref="OSC-ASR-CG"} | :c[facilities.ALPHA-04.levels.8.topFt] | T2 | :r[RX-A04, switchgear, diesel generator hall.]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| 9 | Tunnel Maintenance Depot | :c[facilities.ALPHA-04.levels.9.topFt] | T3 | :c[facilities.ALPHA-04.levels.9.notes] |
| 10 | Rail Terminal: Inter-Hub Platform and Western Tram | :c[facilities.ALPHA-04.levels.10.topFt] | T3 | :r[:c[facilities.ALPHA-04.levels.10.notes]]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

## 7. Power

7.1. Reactor installation **RX-A04**, :c[reactors.RX-A04.designation]: :c[reactors.RX-A04.type]. Commissioned :c[reactors.RX-A04.commissioned]. Rated :c[reactors.RX-A04.thermalMWt] MWt / :c[reactors.RX-A04.electricMWe] MWe. Status page :x[OSC-RSV-RX-A04].

7.2. Status as carried: **:c[reactors.RX-A04.status]**. :c[reactors.RX-A04.statusNote]

7.3. Heat rejection is by air-cooled condenser; the site has no surface water for cooling. Fan 3 remains on the watch list until the bearing is changed at the next planned outage. Vibration readings are taken daily and sent to FE/ALPHA-02 weekly.

7.4. Monthly reactor surveillance test: :c[calendar.CAL-0805-24.dateText], :c[calendar.CAL-0805-24.timeText].

## 8. Telemetry (live tab; not part of the revision)

| Channel | Reading at revision | State |
|---|---|---|
| Station electrical load | 6.8 MWe | NOMINAL |
| Condenser fan 3 | In service; vibration 0.31 in/s (alert 0.40) | DEGRADED |
| Air handling | AHU-1 to AHU-6 in service; evaporative pre-cooling off | NOMINAL |
| Dust curtain, lift doors | In service | NOMINAL |
| Supply air, berthing | 21.2 C, 22% RH | NOMINAL |
| Water purification | Trains 1 and 2 in service | NOMINAL |
| Potable storage | 79% of usable volume | NOMINAL |
| Seal state | OPEN | NOMINAL |

## 9. Local administration

9.1. **Water.** Water purification train 2: backwash and media change, :c[calendar.CAL-0805-13.dateText], :c[calendar.CAL-0805-13.timeText]. :c[calendar.CAL-0805-13.note] Showers are limited to four minutes during the work period.

9.2. **Dust.** Personnel coming down from the surface stand at the Level 1 dust curtain for the full air cycle. Boots are wiped at the mat. Level 2 pre-filters are changed every second week from May to October under :x[OSC-DIR-0128].

9.3. **Parking.** All vehicles park in the station yard as station vehicles or visitors. Below-grade personnel use the 12 yard spaces marked for "instrument maintenance". Private vehicles carry no OSC material and no OSC badge on display. The yard is graded by the station; ruts are reported to the Cover Liaison Officer, not to the station foreman.

9.4. **Dining.** One dining room on Level 4, one sitting per meal. Cafeteria rotation per :x[OSC-DIR-0141].

9.5. **Communications.** QKD link maintenance, :c[calendar.CAL-0805-34.dateText], :c[calendar.CAL-0805-34.timeText]. :c[calendar.CAL-0805-34.note]

## 10. Documents

| Document | Title |
|---|---|
| :x[OSC-FAC-CLS-ALPHA] | Facility Class Standard: ALPHA |
| :x[OSC-RSV-RX-A04] | Reactor Status: RX-A04 |
| :x[OSC-ASR-COV] | Cover Identity Catalogue (ALPHA and BETA) |
| :x[OSC-TRN-SEG-03] | Segment Engineering Sheet: Segment 03 |
| :x[OSC-TRN-NET-MTW] | Network Sheet: Mountain/Western Network |
