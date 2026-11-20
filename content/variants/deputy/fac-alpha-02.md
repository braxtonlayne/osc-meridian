---
id: fac-alpha-02
route: /registry/facility/alpha-02
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-02
title: "Facility Dossier: ALPHA-02 \"OLYMPUS STATION\" (Command Copy, Revision 10)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 10
date: 2008-05-15
facility: ALPHA-02
summary: "Command Section copy of the ALPHA-02 dossier at revision 10: platform 3 lighting changed to normal, connection paragraph 5.3 added. Revision 10 has not been sent to the registry file copy."
distribution:
  - Facility Commander, ALPHA-02
  - Deputy Commander, ALPHA-02 (this copy)
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Commandant, Security Forces Command (SFC/ALPHA-02)
  - "Registry file copy (RD/ALPHA-03): revision 10 held at origin"
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-02
  - OSC-TRN-SEG-03
  - OSC-TRN-SEG-04
  - OSC-TRN-NET-MTW
  - OSC-RSV-RX-A02
dossierType: "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity:
  - { label: Designation, value: ALPHA-02, mono: true }
  - { label: Codename, value: OLYMPUS STATION }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: "Mountain/Western Network (hub)" }
  - { label: Cover identity, value: "Concealed within \"expanded\" NORAD infrastructure" }
  - { label: Cover facility type, value: Front Range Communications Annex }
  - { label: Reactor installation, value: RX-A02, mono: true }
  - { label: Facility Commander, value: "S. D. Varga, Brig Gen (Ret.)" }
  - { label: Deputy Commander, value: "Post 2-0139 (Tier 2 entry)" }
  - { label: Resident divisions, value: "FE, CMS, SFC" }
  - { label: Entry, value: Horizontal adit }
  - { label: Dossier custodian, value: "Plant Records Section, FE/ALPHA-02" }
dossier:
  facility: ALPHA-02
  dossierType: "FACILITY DOSSIER: COMMAND & CONTROL HUB"
  identity:
    - { label: Designation, value: ALPHA-02, mono: true }
    - { label: Codename, value: OLYMPUS STATION }
    - { label: Class, value: "ALPHA (Command & Control Hub)" }
    - { label: Network, value: "Mountain/Western Network (hub)" }
    - { label: Reactor installation, value: RX-A02, mono: true }
    - { label: Facility Commander, value: "S. D. Varga, Brig Gen (Ret.)" }
    - { label: Deputy Commander, value: "Post 2-0139 (Tier 2 entry)" }
    - { label: Dossier custodian, value: "Plant Records Section, FE/ALPHA-02" }
revisions:
  - { rev: "10", date: 2008-05-15, change: "Platform 3 lighting entered as normal. Para 5.3 added. Registry copy held at origin.", by: FE/ALPHA-02 }
  - { rev: "9", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Shop hours in para 9.3 corrected.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2007-11-30, change: "Level 10 depot road lengths re-measured. Platform index re-issued.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2007-03-30, change: "Level 11 platform index amended on completion of works at platform 3.", by: FE/ALPHA-02 }
---

::stamp{kind="DISTRIBUTION-LIMITED" seed=3}

This is the command copy. The engineering particulars are taken from FE plant records. Paragraphs not shown here are unchanged from revision 9 and are held in the registry file copy.

## 4. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-02.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-02.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-02.sustainedMonths] months |

::canon-table{source="facilities.ALPHA-02.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-02 posted staff by heading, pay run 30 APR 2008"}

4.1. Return accepted as submitted. Seven headings.

:::margin{hand="DC" seed=7 mark=none}
Return signed by this office. One FE post carried vacant since APR 07; not on the return as vacant, not on it at all.
:::

## 5. Connections

5.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-02.connectionsText]{auth="TO" ref="TO-07-313"}

5.2. Inter-hub rail: Segment 02 (:x[OSC-TRN-SEG-02]) and Segment 03 (:x[OSC-TRN-SEG-03]), booked paths per working timetable. Tram: Mountain/Western Network, :x[OSC-TRN-NET-MTW].

5.3. Platform 3 connects to the adjacent hub by Segment 04 (:x[OSC-TRN-SEG-04]). Not in revenue service. Not entered in 5.1, which quotes the Facility Inventory as issued.

## 7. Level 11 platform index

| Platform | Use | Lighting | Remarks |
|---|---|---|---|
| 1 | Inter-hub rail, ALPHA-01 | Normal | Segment 02. Booked paths per working timetable. |
| 2 | Inter-hub rail, ALPHA-04 | Normal | Segment 03. Booked paths per working timetable. |
| 3 | Inter-hub rail, the adjacent hub | Normal | Not in revenue service. Segment 04, commissioned :c[railSegments.04.completed], no booked paths. |
| 4 | Mountain/Western tram | Normal | |
| 5 | Mountain/Western tram | Normal | |
| 6 | Mountain/Western tram | Normal | |

7.1. Platform edge doors on platforms 1 to 6 are tested weekly by the depot. Platform 3 is included in the weekly test.

7.2. Platform 3 lighting is raised to normal from 13 MAY 2008 on the request of Transit Control, for the escort detail.

:::margin{hand="DC" seed=12 mark=arrow}
Escort detail is once a month for two hours. Lighting stays up all month? Query to FE 15/5. No answer yet.
:::

## 10. Telemetry (live tab; not part of the revision)

| Channel | Reading at revision | State |
|---|---|---|
| Station electrical load | 10.4 MWe | NOMINAL |
| Diesel generator hall | 3 sets on standby | NOMINAL |
| Air handling | AHU-1 to AHU-10 in service; Level 8 separate system in service | NOMINAL |
| Pre-filter differential pressure, AHU-3 | 0.71 in. w.g. (change at 0.80) | NOMINAL |
| Supply air, berthing levels | 20.1 C, 31% RH | NOMINAL |
| Seal state | OPEN. Blast doors 1 and 2 open on hooks. | NOMINAL |
| Platform 3 portal seal PD04-2 | Closed and held | NOMINAL |

## 11. Local administration

11.1. **Air filters.** Pre-filters on AHU-1 to AHU-10 are changed fortnightly from April. The HVAC shop issues the schedule on Fridays for the following week.

11.2. **Parking.** Personal vehicles are parked in the annex lot outside the shared gate under the parent installation's permit. Quarter 3 annex permits are issued by the annex pass office from 02 JUN 2008. The Level 1 vehicle inspection hall keeps 12 bays for the command section.

11.3. **Dining.** Two dining rooms on Level 4 serve by watch. Hood suppression inspection: :c[calendar.CAL-0805-21.dateText], :c[calendar.CAL-0805-21.timeText]. :c[calendar.CAL-0805-21.note]
