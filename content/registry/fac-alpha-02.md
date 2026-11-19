---
id: fac-alpha-02
route: /registry/facility/alpha-02
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-02
title: "Facility Dossier: ALPHA-02 \"OLYMPUS STATION\""
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 9
date: 2008-04-30
facility: ALPHA-02
summary: "OLYMPUS STATION under the \"expanded NORAD infrastructure\" cover."
distribution:
  - Facility Commander, ALPHA-02
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Commandant, Security Forces Command (SFC/ALPHA-02)
  - Director, Communications Security (CMS/ALPHA-02)
  - Director, Transit Operations (TO/ALPHA-01)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-02
  - OSC-TRN-SEG-03
  - OSC-TRN-SEG-04
  - OSC-TRN-NET-MTW
  - OSC-RSV-RX-A02
dossierType: &dtype "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity: &ident
  - { label: Designation, value: ALPHA-02, mono: true }
  - { label: Codename, value: OLYMPUS STATION }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: "Mountain/Western Network (hub)" }
  - { label: Cover identity, value: "Concealed within \"expanded\" NORAD infrastructure" }
  - { label: Cover facility type, value: Front Range Communications Annex }
  - { label: Reactor installation, value: RX-A02, mono: true }
  - { label: Facility Commander, value: "S. D. Varga, Brig Gen (Ret.)" }
  - { label: Resident divisions, value: "FE, CMS, SFC" }
  - { label: Entry, value: Horizontal adit }
  - { label: Register section, value: FE/ALPHA-02 Facilities Register }
  - { label: Dossier custodian, value: "Plant Records Section, FE/ALPHA-02" }
dossier:
  facility: ALPHA-02
  dossierType: *dtype
  identity: *ident
revisions:
  - { rev: "9", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Shop hours in para 9.3 corrected.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2007-11-30, change: "Level 10 depot road lengths re-measured. Platform index re-issued.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2007-03-30, change: "Level 11 platform index amended on completion of works at platform 3.", by: FE/ALPHA-02 }
  - { rev: "6", date: 2006-11-30, change: "Segment 02 entered on completion.", by: FE/ALPHA-02 }
---

This dossier is maintained at the site that issues it. Facilities Engineering is resident on Levels 10 and 11, and the engineering particulars below are taken from FE plant records rather than from the site return.

## 1. Location and terrain

| Field | Entry |
|---|---|
| Location (Facility Inventory) | :r[:c[facilities.ALPHA-02.locationText]{auth="TO" ref="TO-07-313"}]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| Terrain | :r[:c[facilities.ALPHA-02.terrain]{auth="TO" ref="TO-07-313"}]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| Entry | Horizontal adit from the annex gate; blast doors 1 and 2 |
| Depth to terminal level | :c[facilities.ALPHA-02.depthFt] ft (vertical cover over the terminal level) |
| Completed | :c[facilities.ALPHA-02.completed] |

## 2. Cover identity

2.1. Cover identity as carried in the Facility Inventory: **:c[facilities.ALPHA-02.coverIdentity]**. Surface staff share the annex gate. Construction traffic is attributed to the parent installation.

2.2. Prepared public statement:

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
> :c[facilities.ALPHA-02.coverStory]{auth="CVO" ref="CVO-07-113"}
:::

2.3. Photography at the gate is refused under the cover statement. This applies to OSC personnel. Badge photographs are taken on Level 5.

## 3. Function

:r[Western Command Hub. Military operations coordination. Deep continuity for DoD/Joint Chiefs. Hardened communications array. :r[Weapons research oversight.]{tier=1 auth="SFC" ref="SFC-07-0033"}]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"}

Facilities Engineering, Communications Security and Security Forces Command are headquartered here. The tunnel maintenance depot for rail and tram rolling stock heavy maintenance is on Level 10.

## 4. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-02.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-02.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-02.sustainedMonths] months |

::canon-table{source="facilities.ALPHA-02.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-02 posted staff by heading, pay run 30 APR 2008"}

4.1. Return accepted as submitted. Seven headings.

## 5. Connections

5.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-02.connectionsText]{auth="TO" ref="TO-07-313"}

5.2. Inter-hub rail and regional tram detail:

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
| Segment | Between | Reference | Engineering length (mi) | Running time (h) | Completed | Status |
|---|---|---|---|---|---|---|
| 02 | ALPHA-01 to ALPHA-02 | :x[OSC-TRN-SEG-02] | :c[railSegments.02.miles] | :c[railSegments.02.hours] | :c[railSegments.02.completed] | :c[railSegments.02.status] |
| 03 | ALPHA-02 to ALPHA-04 | :x[OSC-TRN-SEG-03] | :c[railSegments.03.miles] | :c[railSegments.03.hours] | :c[railSegments.03.completed] | :c[railSegments.03.status] |

::canon-table{source="tramLinks" filter="from=ALPHA-02" cols="to:To,label:Area,miles:Miles,hours:Hours" caption="Mountain/Western Network tram links from ALPHA-02"}

Network sheet: :x[OSC-TRN-NET-MTW].
:::

## 6. Level index

Depths in feet below the gate datum. The adit runs from Level 1 to the Level 2 plant gallery; the interval is tunnel, not level.

| Level | Designation | Top (ft) | Access | Notes |
|---|---|---|---|---|
| 0 | Surface: Annex Administration and Gatehouse | :c[facilities.ALPHA-02.levels.0.topFt] | T4 | :c[facilities.ALPHA-02.levels.0.notes] |
| 1 | Adit Portal and Vehicle Inspection | :c[facilities.ALPHA-02.levels.1.topFt] | T4 | :c[facilities.ALPHA-02.levels.1.notes] |
| 2 | Mechanical / Air Handling | :c[facilities.ALPHA-02.levels.2.topFt] | T4 | :c[facilities.ALPHA-02.levels.2.notes] |
| 3 | Berthing A-H | :c[facilities.ALPHA-02.levels.3.topFt] | T4 | :c[facilities.ALPHA-02.levels.3.notes] |
| 4 | Dining, Personnel Services and Clinic | :c[facilities.ALPHA-02.levels.4.topFt] | T4 | :c[facilities.ALPHA-02.levels.4.notes] |
| 5 | Security Forces Command and Armory | :c[facilities.ALPHA-02.levels.5.topFt] | T3 | :c[facilities.ALPHA-02.levels.5.notes] |
| 6 | Communications Array Equipment Rooms | :c[facilities.ALPHA-02.levels.6.topFt] | T3 | :c[facilities.ALPHA-02.levels.6.notes] |
| 7 | :r[Military Operations Floor]{tier=2 auth="SFC" ref="SFC-07-0033"} | :c[facilities.ALPHA-02.levels.7.topFt] | T2 | :r[Joint operations coordination.]{tier=2 auth="SFC" ref="SFC-07-0033"} |
| 8 | :r[Laboratories]{tier=2 auth="FE" ref="FE-07-0388"} | :c[facilities.ALPHA-02.levels.8.topFt] | T2 | :r[Technical evaluation. Separate air handling.]{tier=2 auth="FE" ref="FE-07-0388"} |
| 9 | :r[Power Plant]{tier=2 auth="FE" ref="FE-07-0388"} | :c[facilities.ALPHA-02.levels.9.topFt] | T2 | :r[RX-A02, switchgear, diesel generator hall.]{tier=2 auth="FE" ref="FE-07-0388"} |
| 10 | Engineering Shops and Tunnel Maintenance Depot | :c[facilities.ALPHA-02.levels.10.topFt] | T3 | :c[facilities.ALPHA-02.levels.10.notes] |
| 11 | Rail Terminal: Inter-Hub Platforms | :c[facilities.ALPHA-02.levels.11.topFt] | T3 | :c[facilities.ALPHA-02.levels.11.notes] |

## 7. Level 11 platform index

| Platform | Use | Lighting | Remarks |
|---|---|---|---|
| 1 | Inter-hub rail, ALPHA-01 | Normal | :r[Segment 02. Booked paths per working timetable.]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| 2 | Inter-hub rail, ALPHA-04 | Normal | :r[Segment 03. Booked paths per working timetable.]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| 3 | Inter-hub rail | Standby | Not in revenue service. :r[Platform 3: Segment 04, commissioned :c[railSegments.04.completed], no booked paths.]{compartment=KESTREL auth="FE" ref="FE-07-0304"} |
| 4 | Mountain/Western tram | Normal | :r[BETA-04 services.]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| 5 | Mountain/Western tram | Normal | :r[BETA-11 services.]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| 6 | Mountain/Western tram | Normal | :r[BETA-06 services.]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

7.1. Platform edge doors on platforms 1 to 6 are tested weekly by the depot. Platform 3 is included in the weekly test. Segment engineering sheet: :x[OSC-TRN-SEG-04].

## 8. Power

8.1. Reactor installation **RX-A02**, :c[reactors.RX-A02.designation]: :c[reactors.RX-A02.type]. Commissioned :c[reactors.RX-A02.commissioned]. Rated :c[reactors.RX-A02.thermalMWt] MWt / :c[reactors.RX-A02.electricMWe] MWe. Status page :x[OSC-RSV-RX-A02].

8.2. Status as carried: **:c[reactors.RX-A02.status]**. :c[reactors.RX-A02.statusNote]

8.3. Dosimetry badge exchange: :c[calendar.CAL-0805-10.dateText], :c[calendar.CAL-0805-10.timeText]. :c[calendar.CAL-0805-10.note]

## 9. Engineering shops and depot (Level 10)

9.1. The Level 10 shops are the engineering authority's own shops and also serve the site. Site work is accepted at the shop window on the same basis as work from other facilities and is prioritised by the FE planner, not by the requesting level.

| Shop | Room | Hours (local) | Work order prefix |
|---|---|---|---|
| Machine shop | 10-102 | 0700-1530 MDT | FE- |
| Electrical and switchgear | 10-118 | 0700-1530 MDT; on call after hours | FE- |
| HVAC and filtration | 10-121 | 0600-1430 MDT | FE- |
| Seals and blast doors | 10-130 | 0700-1530 MDT | FE- |
| Rolling stock heavy maintenance road | 10-200 (depot) | Continuous, three shifts | FE- |
| Stores issue (depot spares) | 10-210 | 0700-1500 MDT | LR- |

9.2. The heavy maintenance road takes one rail consist or two tram consists at a time. Consists for heavy maintenance are worked in under a depot possession booked with Network Control at least 72 hours ahead. Consists stabled for heavy maintenance are recorded on the rolling stock register.

9.3. The shop window is closed between 1130 and 1215 MDT. Work orders left in the window tray during that period are logged on the following working day.

9.4. Tools are not loaned to other levels. Requests for loan are refused at the window under standing FE instruction and the requester is referred to their own level's toolboard.

## 10. Telemetry (live tab; not part of the revision)

| Channel | Reading at revision | State |
|---|---|---|
| Station electrical load | 9.9 MWe | NOMINAL |
| Diesel generator hall | 3 sets on standby | NOMINAL |
| Air handling | AHU-1 to AHU-10 in service; Level 8 separate system in service | NOMINAL |
| Pre-filter differential pressure, AHU-3 | 0.62 in. w.g. (change at 0.80) | NOMINAL |
| Supply air, berthing levels | 19.8 C, 33% RH | NOMINAL |
| Water treatment | Both trains in service | NOMINAL |
| Potable storage | 91% of usable volume | NOMINAL |
| Seal state | OPEN. Blast doors 1 and 2 open on hooks. | NOMINAL |
| QKD link to ALPHA-04 | In service | NOMINAL |

## 11. Local administration

11.1. **Air filters.** Pre-filters on AHU-1 to AHU-10 are changed weekly from November to March for the dust load at the adit, and fortnightly from April. Gas-phase beds follow :x[OSC-DIR-0128]. The HVAC shop issues the schedule on Fridays for the following week.

11.2. **Parking.** Vehicles enter by the adit. Below-grade parking is the Level 1 vehicle inspection hall, 42 bays, of which 30 are allocated to Security Forces and FE duty vehicles and 12 to the command section. Personal vehicles are parked in the annex lot outside the shared gate and are subject to the parent installation's lot rules, including its permit, which is issued by the annex and not by this facility. Vehicles without a valid annex permit are towed by the parent installation at the owner's expense.

11.3. **Dining.** Two dining rooms on Level 4 serve by watch. The kitchen hood suppression system inspection is on :c[calendar.CAL-0805-21.dateText], :c[calendar.CAL-0805-21.timeText]. :c[calendar.CAL-0805-21.note]

11.4. **Berthing.** Level 3 is the largest berthing level in the network. Berth checks are by section letter on the last working day of the month.

11.5. **Communications maintenance.** QKD link maintenance, :c[calendar.CAL-0805-34.dateText], :c[calendar.CAL-0805-34.timeText]. :c[calendar.CAL-0805-34.note]

## 12. Documents

| Document | Title |
|---|---|
| :x[OSC-FAC-CLS-ALPHA] | Facility Class Standard: ALPHA |
| :x[OSC-RSV-RX-A02] | Reactor Status: RX-A02 |
| :x[OSC-TRN-NET-MTW] | Network Sheet: Mountain/Western Network |
| :x[OSC-TRN-SEG-02] | Segment Engineering Sheet: Segment 02 |
| :x[OSC-TRN-SEG-03] | Segment Engineering Sheet: Segment 03 |
| :x[OSC-TRN-SEG-04] | Segment Engineering Sheet: Segment 04 |
| :x[OSC-TRN-RS] | Rolling Stock Register |
| :x[OSC-DIR-0216] | Dosimetry |
