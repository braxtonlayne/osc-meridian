---
id: fac-alpha-05
route: /registry/facility/alpha-05
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-05
title: "Facility Dossier: ALPHA-05 \"SENTINEL DEEP\""
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 9
date: 2008-04-30
facility: ALPHA-05
summary: "SENTINEL DEEP under the FEMA Regional Coordination Complex."
distribution:
  - Facility Commander, ALPHA-05
  - Director, Logistics & Reserves (LR/ALPHA-05)
  - Director, Medical Services (MS/ALPHA-05)
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Director, Transit Operations (TO/ALPHA-01)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-04
  - OSC-TRN-SEG-05
  - OSC-TRN-SEG-06
  - OSC-TRN-NET-SOU
  - OSC-RSV-RX-A05
  - OSC-TRN-POS-08-044
dossierType: &dtype "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity: &ident
  - { label: Designation, value: ALPHA-05, mono: true }
  - { label: Codename, value: SENTINEL DEEP }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: "Southern Network (hub)" }
  - { label: Cover identity, value: FEMA Regional Coordination Complex }
  - { label: Reactor installation, value: RX-A05, mono: true }
  - { label: Facility Commander, value: "E. Villalobos, Col (Ret.)" }
  - { label: Resident divisions, value: "LR (headquarters), MS (headquarters)" }
  - { label: Local time zone, value: "Central (CDT, Z-5)" }
  - { label: Register section, value: FE/ALPHA-02 Facilities Register }
  - { label: Dossier custodian, value: "Plant Records Section, FE/ALPHA-02" }
dossier:
  facility: ALPHA-05
  dossierType: *dtype
  identity: *ident
revisions:
  - { rev: "9", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Stores bay table re-issued by Stores Control.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2007-03-30, change: "Platform 7 entered in Level 11 index.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2007-02-28, change: "Segment 06 entered on completion.", by: FE/ALPHA-02 }
  - { rev: "6", date: 2006-09-29, change: "Segment 05 entered on completion.", by: FE/ALPHA-02 }
---

## 1. Location and terrain

| Field | Entry |
|---|---|
| Location (Facility Inventory) | :r[:c[facilities.ALPHA-05.locationText]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| Terrain | :r[:c[facilities.ALPHA-05.terrain]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"} |
| Entry | Lift heads in the basement warehouse of the coordination complex |
| Depth to terminal level | :c[facilities.ALPHA-05.depthFt] ft |
| Completed | :c[facilities.ALPHA-05.completed] |

## 2. Cover identity

2.1. Cover identity as carried in the Facility Inventory: **:c[facilities.ALPHA-05.coverIdentity]**. The complex is a working building. Exercises are held in it, response equipment is stored in it, and the generator and communications tests heard from the road are genuine tests.

2.2. Prepared public statement:

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
> :c[facilities.ALPHA-05.coverStory]
:::

2.3. Members of the public do come to the gate seeking assistance after storms. Gate staff give them the published disaster assistance number on a printed card and a bottle of water. Below-grade personnel who are at the gate when this happens do the same and nothing more.

## 3. Function

:r[:c[facilities.ALPHA-05.function]]{compartment=SEXTANT auth="CVO" ref="CVO-07-113"}

Logistics & Reserves and Medical Services are headquartered here. Reserve positions for the network are compiled on Level 6 and published from this site.

## 4. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-05.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-05.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-05.sustainedMonths] months |

::canon-table{source="facilities.ALPHA-05.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-05 posted staff by heading, pay run 30 APR 2008"}

4.1. Return accepted as submitted.

4.2. Resident officers: Director, Logistics & Reserves (G. Pratt); Director, Medical Services (S. Mallory, MD); Senior Reactor Operator, RX-A05 (V. Haldane).

## 5. Connections

5.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-05.connectionsText]

5.2. Detail:

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
| Platform | Service | Reference | Engineering length (mi) | Running time (h) | Status |
|---|---|---|---|---|---|
| 1 | Segment 06 to ALPHA-01 | :x[OSC-TRN-SEG-06] | :c[railSegments.06.miles] | :c[railSegments.06.hours] | :c[railSegments.06.status] |
| 2 | Segment 05 to ALPHA-03 | :x[OSC-TRN-SEG-05] | :c[railSegments.05.miles] | :c[railSegments.05.hours] | :c[railSegments.05.status] |

::canon-table{source="tramLinks" filter="from=ALPHA-05" cols="to:To,label:Area,miles:Miles,hours:Hours" caption="Southern Network tram links from ALPHA-05 (platforms 3 to 6)"}

Network sheet: :x[OSC-TRN-NET-SOU].
:::

## 6. Level index

| Level | Designation | Top (ft) | Access | Notes |
|---|---|---|---|---|
| 0 | Surface: Regional Coordination Complex | :c[facilities.ALPHA-05.levels.0.topFt] | T4 | :c[facilities.ALPHA-05.levels.0.notes] |
| 1 | Basement Warehouse and Shaft Head | :c[facilities.ALPHA-05.levels.1.topFt] | T4 | :c[facilities.ALPHA-05.levels.1.notes] |
| 2 | Mechanical / Air Handling | :c[facilities.ALPHA-05.levels.2.topFt] | T4 | :c[facilities.ALPHA-05.levels.2.notes] |
| 3 | Berthing A-G | :c[facilities.ALPHA-05.levels.3.topFt] | T4 | A to C occupied. |
| 4 | Dining and Personnel Services | :c[facilities.ALPHA-05.levels.4.topFt] | T4 | Dining hall, laundry, post room. |
| 5 | Clinic and Medical Services Directorate | :c[facilities.ALPHA-05.levels.5.topFt] | T3 | :c[facilities.ALPHA-05.levels.5.notes] |
| 6 | Logistics & Reserves Offices and Stores Control | :c[facilities.ALPHA-05.levels.6.topFt] | T3 | :c[facilities.ALPHA-05.levels.6.notes] |
| 7 | Reserves Stacks | :c[facilities.ALPHA-05.levels.7.topFt] | T3 | :c[facilities.ALPHA-05.levels.7.notes] |
| 8 | :r[Conference Suite S]{tier=1 auth="COUNCIL" ref="CC-ART-VI"} | :c[facilities.ALPHA-05.levels.8.topFt] | T1 | :r[Maintained to standing readiness.]{tier=1 auth="COUNCIL" ref="CC-ART-VI"} |
| 9 | :r[Operations Floor]{tier=2 auth="IAD" ref="IAD-07-0033"} | :c[facilities.ALPHA-05.levels.9.topFt] | T2 | :r[Southern operations and energy infrastructure watch.]{tier=2 auth="IAD" ref="IAD-07-0033"} |
| 10 | :r[Power Plant]{tier=2 auth="FE" ref="FE-07-0388"} | :c[facilities.ALPHA-05.levels.10.topFt] | T2 | :r[RX-A05, switchgear, diesel generator hall.]{tier=2 auth="FE" ref="FE-07-0388"} |
| 11 | Rail and Tram Terminal | :c[facilities.ALPHA-05.levels.11.topFt] | T3 | :c[facilities.ALPHA-05.levels.11.notes] |

6.1. Level 8 is cleaned, aired and its equipment checked to a schedule held by the Council Secretariat. The cleaning contract for Level 8 is separate from the site cleaning contract. Site cleaners do not go to Level 8.

## 7. Level 11 platform index

| Platform | Use | State |
|---|---|---|
| 1 | Inter-hub rail | In service |
| 2 | Inter-hub rail | In service |
| 3 to 6 | Southern Network tram | In service |
| 7 | Inter-hub rail (Segment 04) | Not in revenue service |

## 8. Stores (Levels 6 and 7)

8.1. Stores Control on Level 6 compiles reserve positions for the network and publishes them monthly. The bays on Level 7 are the site's own stocks and the Southern Network distribution stock.

| Bay | Contents | Control |
|---|---|---|
| 7-A1 to 7-A8 | Subsistence, long-term storage rations | Stores Control; first in, first out by lot date |
| 7-B1 to 7-B4 | Water treatment consumables, filter media | Stores Control |
| 7-C1 to 7-C6 | Pharmaceuticals and surgical consumables | Medical Services; controlled drugs in 7-C6 under two signatures |
| 7-D1 to 7-D3 | Response equipment for the surface complex (cover stock) | Cover Operations account, held here |
| 7-E1 to 7-E4 | :r[Armament bays]{compartment=TALLOW auth="LR" ref="LR-07-0314"} | Two-person rule |

8.2. Stock movements by tram are booked through Stores Control and carried on the tram manifest. Stock is not moved off the site in personal baggage under any circumstances, including stock the bearer has signed for.

8.3. The annual stock take is in September. Bays are sealed with numbered tags after each count; a broken tag is reported to Stores Control on the day it is found.

## 9. Power

9.1. Reactor installation **RX-A05**, :c[reactors.RX-A05.designation]: :c[reactors.RX-A05.type]. Commissioned :c[reactors.RX-A05.commissioned]. Rated :c[reactors.RX-A05.thermalMWt] MWt / :c[reactors.RX-A05.electricMWe] MWe. Status page :x[OSC-RSV-RX-A05].

9.2. Status as carried: **:c[reactors.RX-A05.status]**. :c[reactors.RX-A05.statusNote]

## 10. Telemetry (live tab; not part of the revision)

| Channel | Reading at revision | State |
|---|---|---|
| Station electrical load | 10.2 MWe | NOMINAL |
| Chiller plant | Chillers 1 and 2 in service, 3 standby | NOMINAL |
| Air handling | AHU-1 to AHU-8 in service | NOMINAL |
| Supply air, berthing | 21.0 C, 46% RH | NOMINAL |
| Level 7 stores | 17.5 C, 38% RH | NOMINAL |
| Pharmacy cold store (Level 5) | 4.1 C | NOMINAL |
| Water treatment | Both trains in service | NOMINAL |
| Seal state | OPEN. Seal-capable zones at CONDITIONED. | NOMINAL |

## 11. Calendar, ALPHA-05, MAY 2008

| Date | Time | Item | Reference |
|---|---|---|---|
| :c[calendar.CAL-0805-06.dateText] | :c[calendar.CAL-0805-06.timeText] | :c[calendar.CAL-0805-06.title] | :c[calendar.CAL-0805-06.originator] |
| :c[calendar.CAL-0805-14.dateText] | :c[calendar.CAL-0805-14.timeText] | :c[calendar.CAL-0805-14.title] | :x[OSC-TRN-POS-08-044] |
| :c[calendar.CAL-0805-31.dateText] | :c[calendar.CAL-0805-31.timeText] | :c[calendar.CAL-0805-31.title] | :c[calendar.CAL-0805-31.originator] |

## 12. Local administration

12.1. **Parking.** Surface lots A and B belong to the coordination complex. Below-grade personnel park in them as complex staff. The number of vehicles in the lots on a working day is visible from the road and is expected to match the published staffing of the complex. The allocation review of :c[calendar.CAL-0805-06.dateText] will bring it into line. :c[calendar.CAL-0805-06.note]

12.2. Personnel who cannot be allocated a space in lots A or B will be carried to the complex from the county park-and-ride by the complex shuttle at 0610, 0640 and 0710 CDT. The shuttle is a complex vehicle and is driven by complex staff. Personnel do not discuss their work on the shuttle.

12.3. No vehicles are taken below grade. The basement warehouse loading dock is for stores receiving only.

12.4. **Air filters.** Gas-phase beds in the seal-capable zones: :c[calendar.CAL-0805-31.dateText], :c[calendar.CAL-0805-31.timeText]. :c[calendar.CAL-0805-31.note]

12.5. **Clinic.** Level 5 clinic hours 0700 to 1900 CDT; surgical cover continuous. Medical readiness certifications for the site are reviewed here under :x[OSC-DIR-0204].

12.6. **Dining.** Level 4. Cafeteria rotation per :x[OSC-DIR-0141]. The menu for the week is posted at the lift lobby on Level 4 and is not mailed.

## 13. Documents

| Document | Title |
|---|---|
| :x[OSC-FAC-CLS-ALPHA] | Facility Class Standard: ALPHA |
| :x[OSC-RSV-RX-A05] | Reactor Status: RX-A05 |
| :x[OSC-TRN-NET-SOU] | Network Sheet: Southern Network |
| :x[OSC-TRN-SEG-04] | Segment Engineering Sheet: Segment 04 |
| :x[OSC-TRN-SEG-05] | Segment Engineering Sheet: Segment 05 |
| :x[OSC-TRN-SEG-06] | Segment Engineering Sheet: Segment 06 |
| :x[OSC-TRN-POS-08-044] | Possession 08-044: Segment 04 |
| :x[OSC-RSV-IDX] | Strategic Reserves Position, MAY 2008 |
