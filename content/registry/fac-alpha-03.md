---
id: fac-alpha-03
route: /registry/facility/alpha-03
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-03
title: "Facility Dossier: ALPHA-03 \"ARCHIVE SITE TANGO\""
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 11
date: 2008-04-30
facility: ALPHA-03
summary: "ARCHIVE SITE TANGO, the visitor's own site, under the Federal Reserve Gold Depository Secondary Site cover: the longest dossier in the registry."
distribution:
  - Facility Commander, ALPHA-03
  - Deputy Commander, ALPHA-03
  - Chief of Staff, ALPHA-03
  - Chief, Records Division (RD/ALPHA-03)
  - Resident Assurance Officer, ALPHA-03 (OIA)
  - Site Medical Officer, ALPHA-03
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Command Section notice board, Level 1
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-01
  - OSC-TRN-SEG-05
  - OSC-TRN-NET-CEN
  - OSC-RSV-RX-A03
  - OSC-RSV-SEED
  - OSC-RSV-GENE
  - OSC-DIR-0107
  - OSC-DIR-0128
dossierType: &dtype "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity: &ident
  - { label: Designation, value: ALPHA-03, mono: true }
  - { label: Codename, value: ARCHIVE SITE TANGO }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: "Central Network (secondary hub)" }
  - { label: Cover identity, value: Federal Reserve Gold Depository Secondary Site }
  - { label: Cover agency of record, value: Federal Reserve System }
  - { label: Reactor installation, value: RX-A03, mono: true }
  - { label: Facility Commander, value: E. Whitcombe }
  - { label: Deputy Commander, value: R. Teague }
  - { label: Chief of Staff, value: G. Imrie }
  - { label: Resident divisions, value: "RD (headquarters); OIA resident officer; MS site medical officer; FE life support section" }
  - { label: Local time zone, value: "Eastern (EDT, Z-4)" }
  - { label: Register section, value: FE/ALPHA-02 Facilities Register }
  - { label: Dossier custodian, value: "Plant Records Section, FE/ALPHA-02" }
dossier:
  facility: ALPHA-03
  dossierType: *dtype
  identity: *ident
revisions:
  - { rev: "11", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Para 12 (parking) and para 13 (filter schedule) re-issued from Command Section and FE life support section copy. Level 5 workstation range confirmed.", by: FE/ALPHA-02 }
  - { rev: "10", date: 2008-01-31, change: "Level 7 note amended: Stacks C now holds accessions 2006 onward. Cold room 2 transferred to the essential bus.", by: FE/ALPHA-02 }
  - { rev: "9", date: 2007-07-31, change: "Level 11 entry re-issued on instruction. No change to depth.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2006-09-29, change: "Segment 05 entered on completion. Platform 2 brought into use.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2005-01-31, change: "Segment 01 entered on completion.", by: FE/ALPHA-02 }
---

ALPHA-03 is the seat of the Records Division and holds the network's records stacks, the agricultural seed collection and the biological sample collection. It is the secondary hub of the Central Network. This dossier is the registry record for the site. The live tabs (telemetry, documents) are refreshed by the registry service and are not part of the revision.

## 1. Location and terrain

| Field | Entry |
|---|---|
| Location (Facility Inventory) | :c[facilities.ALPHA-03.locationText] |
| Anchor | :c[facilities.ALPHA-03.anchor.miles] mi :c[facilities.ALPHA-03.anchor.bearing] of :c[facilities.ALPHA-03.anchor.city], :c[facilities.ALPHA-03.anchor.state] |
| Terrain | :c[facilities.ALPHA-03.terrain] |
| Surface reference point | Depository Administration Building, ground floor datum |
| Depth to terminal level | :c[facilities.ALPHA-03.depthFt] ft |
| Completed | :c[facilities.ALPHA-03.completed] |
| Shaft | Single vertical shaft, vehicle lift and two personnel lifts (Lift 1, Lift 2), Level 1 to Level 2 |

1.1. The site lies under a wooded ridge in the Appalachian foothills. The surface compound is fenced and lit. The access road is maintained by the cover agency's contractor and is gritted from November to March; personnel who arrive before the gritting truck has passed are to use the lower gate.

## 2. Cover identity

2.1. Cover identity as carried in the Facility Inventory: **:c[facilities.ALPHA-03.coverIdentity]**.

::canon-table{source="coverCatalogue" auth="CVO" facility="ALPHA-03" cols="coverAgency:Cover agency,coverFacilityType:Cover facility type,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover catalogue entry, ALPHA-03"}

2.2. Prepared public statement (Cover Operations text; to be read as written):

> :c[facilities.ALPHA-03.coverStory]

2.3. The surface building contains the vault receipts office and the armored vehicle bay. Armored vehicles arrive on an irregular schedule set by Cover Operations so that the pattern of movements resembles that of a depository. The vehicles carry stores, mail and records consignments for the site. They do not carry bullion. Surface staff who are asked by members of the public about deposits, withdrawals, coin or tours are to refer to the last sentence of the prepared statement and to say nothing further.

2.4. Below-grade personnel do not use the vault receipts office telephone.

## 3. Function

3.1. Function as stated in the Facility Inventory, with the registry elaboration where released:

> Strategic data archive and intelligence repository.

The Records Division operates the stacks on Levels 6 and 7 and the reading room on Level 5. Records received from any division are accessioned here (:x[OSC-DIR-0336]).

> Genetic/biometric database for "essential personnel."

:::redact{tier=2 auth="RD" ref="RD-07-0231"}
The database holds reference samples, fingerprint sets and dental records for personnel designated essential under the Council's continuity list, and for the dependants designated with them. Designation is made by the Council Secretariat. The Records Division receives, holds and indexes; it does not select. A record is not removed when its subject is redesignated. Records of personnel carried in categories other than POSTED are held on the same basis as records of posted personnel.
:::

> Cultural/historical preservation (selective).

:::redact{tier=2 auth="COUNCIL" ref="CC-ART-VI"}
Selection is made against the continuity-of-knowledge schedule approved by the Council. Holdings on the schedule are preserved at this site in original or in certified copy. Holdings not on the schedule are not preserved, and no record is kept of what was considered and declined. The schedule is revised by the Council and not by the Records Division.
:::

> Continuity of knowledge infrastructure.

The continuity-of-knowledge holdings are maintained by the Records Division under its mandate. Catalogues for the two collections are at :x[OSC-RSV-SEED] and :x[OSC-RSV-GENE].

## 4. Command

| Post | Holder | Personnel number |
|---|---|---|
| Facility Commander | Eleanor Whitcombe (civilian appointment) | P-2-03-0044 |
| Deputy Commander | Raymond Teague | P-2-04-0061 |
| Chief of Staff | Gerald Imrie | P-2-04-0133 |
| Administrative Assistant, Command Section | Bettina Shoal | P-4-08-0377 |

4.1. The Commander has been in post since facility completion (:c[facilities.ALPHA-03.completed]). The Deputy Commander signs ALPHA-03 routine notices, parking allocations and probation reports. His signature specimen is on file with the Records Division. The Chief of Staff manages the Command Section on Level 5 (Rooms 5-010 to 5-018).

4.2. Command Section office hours are 0800 to 1630 EDT, Monday to Friday. Outside those hours the duty officer is reached through the operations desk on Level 1.

4.3. Command arrangements:

:::redact{tier=2 auth="SFC" ref="SFC-06-0170"}
Command succession at ALPHA-03 runs Commander, Deputy Commander, Chief of Staff, Chief Records Division. The order to seal the facility is given by the Commander or, in her absence, by the next officer in succession who is on site. When the seal order is given, personnel not on the seal roster at that time are not admitted below Level 1. The seal roster is the posted strength less those with lapsed medical readiness, less those named by the Commander. Personnel carried in categories other than POSTED are not on the seal roster. The roster is held by the Command Section and is not published to the site.
:::

4.4. Other resident officers:

| Post | Holder | Personnel number |
|---|---|---|
| Chief, Records Division | Julian Harrow | P-2-03-0097 |
| Chief, Accessions & Review Branch | Miriam Okafor | P-2-04-0218 |
| Vault Custodian, Biological Collections | Agnes Coyle | P-3-06-0655 |
| Resident Assurance Officer (OIA) | Daniel Prewitt | P-2-05-0148 |
| Site Medical Officer (MS) | Helen Asante, MD | P-3-06-0590 |
| Life Support Technician, Air Handling (FE) | Luis Carranza | P-4-06-1102 |

## 5. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-03.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-03.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-03.sustainedMonths] months |
| Reading room workstations | 40 (A03-5-101 to A03-5-140) |

::canon-table{source="facilities.ALPHA-03.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-03 posted staff by heading, pay run 30 APR 2008"}

5.1. The Data/Records Mgmt. heading is returned by this site only. It counts Records Division technicians, stack attendants and vault staff. Records Division analysts are returned under Intelligence/Analysis. Probationary transfers are returned under the heading of the post they fill and are shown separately on the training compliance report.

5.2. The site is staffed well below berthing, as are all ALPHA sites. Berthing sections A and B on Level 4 are occupied; C and D are made up and closed, and are aired monthly.

## 6. Connections

6.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-03.connectionsText]

6.2. Rail and tram services from the Level 12 terminal:

| Platform | Service | Reference | Engineering length (mi) | Running time (h) | Completed | Status |
|---|---|---|---|---|---|---|
| 1 | Segment 01 to ALPHA-01 | :x[OSC-TRN-SEG-01] | :c[railSegments.01.miles] | :c[railSegments.01.hours] | :c[railSegments.01.completed] | :c[railSegments.01.status] |
| 2 | Segment 05 to ALPHA-05 | :x[OSC-TRN-SEG-05] | :c[railSegments.05.miles] | :c[railSegments.05.hours] | :c[railSegments.05.completed] | :c[railSegments.05.status] |

::canon-table{source="tramLinks" filter="from=ALPHA-03" cols="to:To,label:Area,miles:Miles,hours:Hours" caption="Central Network tram link from ALPHA-03 (platform 3)"}

6.3. Network sheet: :x[OSC-TRN-NET-CEN]. Passenger travel is by travel authorization only (:x[OSC-F-109]). Records consignments travel in the records van of booked consists and are met at the platform by a stack attendant with a trolley and a receipt book.

## 7. Level index

Depths are to the top of each level, in feet below the surface reference point. The interval between Level 1 and Level 2 is shaft.

| Level | Designation | Top (ft) | Access | Notes |
|---|---|---|---|---|
| 0 | Surface: Depository Administration Building | :c[facilities.ALPHA-03.levels.0.topFt] | T4 | :c[facilities.ALPHA-03.levels.0.notes] |
| 1 | Vehicle Lift Head and Portal Security | :c[facilities.ALPHA-03.levels.1.topFt] | T4 | :c[facilities.ALPHA-03.levels.1.notes] |
| 2 | Mechanical / Air Handling | :c[facilities.ALPHA-03.levels.2.topFt] | T4 | :c[facilities.ALPHA-03.levels.2.notes] |
| 3 | Personnel Services, Dining and Clinic | :c[facilities.ALPHA-03.levels.3.topFt] | T4 | :c[facilities.ALPHA-03.levels.3.notes] |
| 4 | Berthing A-D | :c[facilities.ALPHA-03.levels.4.topFt] | T4 | :c[facilities.ALPHA-03.levels.4.notes] |
| 5 | Records Division Offices and Reading Room | :c[facilities.ALPHA-03.levels.5.topFt] | T3 | :c[facilities.ALPHA-03.levels.5.notes] |
| 6 | Records Stacks A-B | :c[facilities.ALPHA-03.levels.6.topFt] | T3 | :c[facilities.ALPHA-03.levels.6.notes] |
| 7 | Records Stacks C | :c[facilities.ALPHA-03.levels.7.topFt] | T3 | :c[facilities.ALPHA-03.levels.7.notes] |
| 8 | Cold Storage: Seed Collection | :c[facilities.ALPHA-03.levels.8.topFt] | T3 | :c[facilities.ALPHA-03.levels.8.notes] |
| 9 | :r[Cold Storage: Biological Sample Collection]{compartment=LANTERN auth="RD" ref="RD-07-0110"} | :c[facilities.ALPHA-03.levels.9.topFt] | T2 | :r[Genetic material vault, -80 C and vapour-phase nitrogen.]{compartment=LANTERN auth="RD" ref="RD-07-0110"} |
| 10 | :r[Power Plant]{tier=2 auth="FE" ref="FE-07-0388"} | :c[facilities.ALPHA-03.levels.10.topFt] | T2 | :r[RX-A03, switchgear, diesel generator hall.]{tier=2 auth="FE" ref="FE-07-0388"} |
| 11 | :r[Special Collections Annex]{tier=1 auth="COUNCIL" ref="CC-ART-VII"} | :c[facilities.ALPHA-03.levels.11.topFt] | T1 | :r[Access list held by the Chief, Records Division.]{tier=1 auth="COUNCIL" ref="CC-ART-VII"} |
| 12 | Rail Terminal: Inter-Hub Platforms and Central Network Tram | :c[facilities.ALPHA-03.levels.12.topFt] | T3 | :c[facilities.ALPHA-03.levels.12.notes] |

## 8. Level descriptions

8.1. **Level 0, surface.** Depository Administration Building: vault receipts office, armored vehicle bay, cover staff mess, surface generator. The building is staffed by cover personnel during cover business hours. Below-grade personnel pass through the bay to the lift head and do not enter the offices.

8.2. **Level 1, lift head and portal security.** Badge, token and parcel screening. All parcels are X-rayed; food parcels are opened. The parking allocation board, the Command Section notice board and the lost property cupboard are on the east wall facing the lifts. The operations desk is staffed continuously.

8.3. **Level 2, mechanical.** Central air handling units AHU-1 to AHU-6, NBC filtration, the humidity control plant for the stacks (stack conditioning units AHU-07 to AHU-12, east plant room), water treatment and the potable storage tanks. Filter schedule at para 13.

8.4. **Level 3, personnel services.** Dining hall (seats 140), servery, clinic (one treatment room, one ward of six beds, dispensary), post room, barber on Wednesdays, chaplain's office, laundry.

8.5. **Level 4, berthing.** Berthing A to D. Single berths for Tier 2 and Tier 3; double berths otherwise. Quiet hours 2200 to 0600 EDT. Linen exchange at the Level 4 linen room (see para 15).

8.6. **Level 5, Records Division offices and reading room.** Office of the Chief, Records Division; Accessions & Review Branch; Command Section (Rooms 5-010 to 5-018); the reading room. Level note: :c[facilities.ALPHA-03.levels.5.notes] Workstation numbering runs along the bays from the reading room counter, odd numbers on the north side. The reading room counter issues stack material against a call slip and receives cover sheet copies returned under :x[OSC-DIR-0319]. Lockers for reading room staff are in the corridor outside and are numbered to match the workstation they serve.

8.7. **Level 6, Stacks A and B.** Mobile compact shelving on rails, hand-cranked. Held at 18 C and 40% RH. Stack aisles are not to be closed with a person in them; a stack attendant checks each aisle before closing. Stacks A holds accessions to 2003; Stacks B holds 2004 and 2005.

8.8. **Level 7, Stacks C.** :c[facilities.ALPHA-03.levels.7.notes] Stacks C also holds media awaiting review: superseded registry media from other divisions is received here, accessioned on receipt and reviewed for retention or destruction under :x[OSC-DIR-0354].

8.9. **Level 8, seed collection.** :c[facilities.ALPHA-03.levels.8.notes] Two cold rooms with an anteroom held at 4 C. The collection holds :c[reserves.items.FOOD-SEED.value] samples. Entry is logged at the anteroom door, and no one works in a cold room alone. Cold-weather clothing is issued from the anteroom racks and is not to be taken off the level. Catalogue: :x[OSC-RSV-SEED].

8.10. **Level 9, biological sample collection.**

:::redact{compartment=LANTERN auth="RD" ref="RD-07-0110"}
Genetic material vault. Mechanical freezers at -80 C and vapour-phase nitrogen dewars, with a liquid nitrogen bulk tank fed from the Level 12 delivery point. The collection holds :r[:c[reserves.items.MED-GENETIC.value]{auth="RD" ref="RD-07-0231"} samples]{tier=2 auth="RD" ref="RD-07-0231"}. Temperature logs are kept by the Vault Custodian, Biological Collections (A. Coyle) for Levels 8 and 9. Oxygen depletion alarms are tested on the first Monday of the month; personnel on the level when the alarm sounds leave by the stair without waiting for confirmation. Catalogue: :x[OSC-RSV-GENE].
:::

8.11. **Level 10.** Plant level. Reactor reference at para 9.

8.12. **Level 11.** Lift car calls to Level 11 are made by key from inside the car. Personnel without a key who find the car stopped at Level 11 are to remain in the car and use the car telephone.

8.13. **Level 12, terminal.** :c[facilities.ALPHA-03.levels.12.notes] The terminal has a receiving dock for records consignments and stores, and a waiting area with eight seats.

## 9. Power

9.1. Reactor installation **RX-A03**, :c[reactors.RX-A03.designation]: :c[reactors.RX-A03.type]. Commissioned :c[reactors.RX-A03.commissioned]. Rated :c[reactors.RX-A03.thermalMWt] MWt / :c[reactors.RX-A03.electricMWe] MWe. Status page :x[OSC-RSV-RX-A03].

9.2. Status as carried: **:c[reactors.RX-A03.status]**. :c[reactors.RX-A03.statusNote]

9.3. Work order FE-08-0417 (lookup: wo FE-08-0417). Raised by the plant against the FE engineering authority at ALPHA-02. Replacement seal kit on order.

9.4. While the unit is limited, non-essential loads are shed in the order published at the operations desk. The cold rooms, the Level 9 freezers and the stack conditioning units are on the essential bus and are not shed.

## 10. Telemetry (live tab; not part of the revision)

| Channel | Reading at revision | State |
|---|---|---|
| Reactor RX-A03 | Limited per work order FE-08-0417 | DEGRADED |
| Station electrical load | 7.4 MWe, within limit | NOMINAL |
| Essential bus | Cold room 1, cold room 2 (Level 8), Level 9 freezers, AHU-07 to AHU-12 | NOMINAL |
| Diesel generator hall | 2 sets on standby, 1 set on maintenance | NOMINAL |
| Air handling | AHU-1 to AHU-6 in service | NOMINAL |
| Stacks A-C | 18.1 C, 40% RH | NOMINAL |
| Cold room 1 (Level 8) | -18.4 C | NOMINAL |
| Cold room 2 (Level 8) | -18.2 C | NOMINAL |
| Level 9 vault | -80 C freezers in limits; LN2 bulk tank 74% | NOMINAL |
| Water treatment | Single train in service, second on standby | NOMINAL |
| Potable storage | 86% of usable volume | NOMINAL |
| Seal state | OPEN. Seal-capable zones at CONDITIONED. | NOMINAL |

10.1. Cold room 2 (Level 8) was transferred to the essential bus at Revision 10. Compressor maintenance on cold room 2 is scheduled for :c[calendar.CAL-0805-23.dateText], :c[calendar.CAL-0805-23.timeText]. :c[calendar.CAL-0805-23.note]

## 11. Calendar, ALPHA-03, MAY 2008

Items from the facility calendar (:x[OSC-SYS-CAL]) open to the reader's tier.

| Date | Time | Item | Note |
|---|---|---|---|
| :c[calendar.CAL-0805-01.dateText] | :c[calendar.CAL-0805-01.timeText] | :c[calendar.CAL-0805-01.title] | :c[calendar.CAL-0805-01.note] |
| :c[calendar.CAL-0805-04.dateText] | :c[calendar.CAL-0805-04.timeText] | :c[calendar.CAL-0805-04.title] | :c[calendar.CAL-0805-04.note] |
| :c[calendar.CAL-0805-08.dateText] | :c[calendar.CAL-0805-08.timeText] | :c[calendar.CAL-0805-08.title] | :c[calendar.CAL-0805-08.note] |
| :c[calendar.CAL-0805-11.dateText] | :c[calendar.CAL-0805-11.timeText] | :c[calendar.CAL-0805-11.title] | :c[calendar.CAL-0805-11.note] |
| :c[calendar.CAL-0805-15.dateText] | :c[calendar.CAL-0805-15.timeText] | :c[calendar.CAL-0805-15.title] | :c[calendar.CAL-0805-15.note] |
| :c[calendar.CAL-0805-19.dateText] | :c[calendar.CAL-0805-19.timeText] | :c[calendar.CAL-0805-19.title] | :c[calendar.CAL-0805-19.note] |
| :c[calendar.CAL-0805-23.dateText] | :c[calendar.CAL-0805-23.timeText] | :c[calendar.CAL-0805-23.title] | :c[calendar.CAL-0805-23.note] |
| :c[calendar.CAL-0805-26.dateText] | :c[calendar.CAL-0805-26.timeText] | :c[calendar.CAL-0805-26.title] | :c[calendar.CAL-0805-26.note] |
| :c[calendar.CAL-0805-30.dateText] | :c[calendar.CAL-0805-30.timeText] | :c[calendar.CAL-0805-30.title] | :c[calendar.CAL-0805-30.note] |
| :c[calendar.CAL-0805-32.dateText] | :c[calendar.CAL-0805-32.timeText] | :c[calendar.CAL-0805-32.title] | |
| :c[calendar.CAL-0805-35.dateText] | :c[calendar.CAL-0805-35.timeText] | :c[calendar.CAL-0805-35.title] | :c[calendar.CAL-0805-35.note] |
| :c[calendar.CAL-0805-37.dateText] | :c[calendar.CAL-0805-37.timeText] | :c[calendar.CAL-0805-37.title] | :c[calendar.CAL-0805-37.note] |
| :c[calendar.CAL-0805-40.dateText] | :c[calendar.CAL-0805-40.timeText] | :c[calendar.CAL-0805-40.title] | :c[calendar.CAL-0805-40.note] |

## 12. Parking

12.1. Parking at ALPHA-03 is allocated under :x[OSC-DIR-0107] by the Deputy Commander, on the advice of the Command Section. The allocation is reissued quarterly and posted on the Level 1 board. The Quarter 3 allocation was issued 02 MAY 2008 (:x[MSG-08-04298]).

12.2. Spaces are of three kinds:

| Kind | Location | Spaces | Allocated to |
|---|---|---|---|
| Reserved, below grade | Vehicle lift apron, Level 1 | 16 | Commander, Deputy Commander, Chief of Staff, Chief Records Division, duty vehicles (4), medical (1), security (6), Resident Assurance Officer (1) |
| Reserved, surface | Depository lot, rows A and B | 28 | By allocation list, Tier 2 and Tier 3 by seniority of posting |
| General, surface | Depository lot, rows C to F | 61 | First come. Not to be used overnight except by personnel on extended duty with a dashboard card |

12.3. The surface lot is part of the cover facility. Vehicles in it are seen from the road as staff vehicles of the depository. Personnel are asked not to leave anything on dashboards other than the extended duty card, and not to display parking permits from other employers.

12.4. Requests for reserved spaces are made to the Administrative Assistant, Command Section (B. Shoal), on the form at the Level 1 desk. Requests received after the quarterly closing date are held to the next quarter. Requests citing distance from the lift head are not considered; all surface spaces are within 200 yards of the bay.

12.5. Bay doors on the lift apron close at 1900 EDT. Below-grade reserved holders who need their vehicle after 1900 EDT call the operations desk to have the apron opened, and the call is logged.

## 13. Air handling and filter schedule

13.1. Filter changes are scheduled by the FE life support section (L. Carranza) under :x[OSC-DIR-0128] and published by mail and on the Level 1 board each Friday.

| Units | Serves | Pre-filters | Final filters | Gas-phase beds |
|---|---|---|---|---|
| AHU-1 to AHU-6 | Levels 1 to 5, 10, 12 | Monthly | Six-monthly | Annual, or on seal test result |
| AHU-07 to AHU-12 | Stacks (Levels 6 and 7), cold storage anterooms | Monthly; cycle of :c[calendar.CAL-0805-04.dateText] | Annual | Not fitted |

13.2. During a filter change the zones served by the units run at reduced supply. Reading room staff may find the reading room warm in the afternoon of a change day. Doors to the stacks are not to be propped open for air.

13.3. After each change on AHU-07 to AHU-12 the stack humidity log is checked and initialled by a stack attendant. The May change was notified by :x[MSG-08-04305].

## 14. Dining

14.1. The Level 3 dining hall follows the network cafeteria rotation under :x[OSC-DIR-0141]. Cycle 4 of 6 began :c[calendar.CAL-0805-01.dateText]. :c[calendar.CAL-0805-01.note] The weekly menu is mailed on Fridays (:x[MSG-08-04472]).

| Service | Hours (EDT) |
|---|---|
| Breakfast | 0630 to 0830 |
| Lunch | 1130 to 1330 |
| Dinner | 1700 to 1900 |
| Night meal (extended duty, by card) | 0000 to 0100 |
| Holiday hours (26 MAY) | Breakfast and lunch only; cold dinner from the servery |

14.2. Special diets are arranged through the clinic, not through the kitchen. Trays are not to be taken from the dining hall to Levels 5 to 9.

## 15. Other local arrangements

15.1. **Linen.** Exchange on Wednesdays at the Level 4 linen room, 0700 to 1000 EDT and 1600 to 1800 EDT.

15.2. **Post room.** Level 3. Open 0900 to 1500 EDT. Personal mail is addressed to the cover facility box and is screened at Level 1 before delivery. Personal parcels over 5 lb are held at the post room for collection.

15.3. **Lockers and badges.** Locker assignment, locker reassignment and badge reissue requests are handled by the Command Section (B. Shoal). Lost badges are reported under :x[OSC-DIR-0115] the same day. Items found in a locker on reassignment are boxed and held by the Command Section.

15.4. **Print release.** Print release is suspended for personnel with incomplete refresher modules after the suspense of :c[calendar.CAL-0805-08.dateText] (:x[OSC-DIR-0288]). Print server maintenance: :c[calendar.CAL-0805-19.dateText], :c[calendar.CAL-0805-19.timeText].

15.5. **Smoking.** Not permitted below grade (:x[OSC-DIR-0480]). The surface smoking point is behind the armored vehicle bay and is out of sight of the road.

## 16. Documents (live tab)

16.1. Command Section notices filed against this dossier since Revision 11:

| Notice | Date | Subject | Signed |
|---|---|---|---|
| A03-CMD-08-041 | 24 APR 2008 | Linen exchange moved to Wednesdays, Level 4 | //SIGNED// R. TEAGUE, Deputy Commander |
| A03-CMD-08-044 | 02 MAY 2008 | Parking allocation, Quarter 3 (:x[MSG-08-04298]) | //SIGNED// R. TEAGUE, Deputy Commander |
| A03-CMD-08-045 | 05 MAY 2008 | Lift 2 out of service for brake inspection, 07 MAY 2008, 1300Z (0900 EDT) to 1700Z (1300 EDT) | //SIGNED// R. TEAGUE, Deputy Commander |
| A03-CMD-08-047 | 08 MAY 2008 | Memorial Day minimum manning, 26 MAY 2008 (:x[MSG-08-04362]) | //SIGNED// G. IMRIE / for R. TEAGUE, Deputy Commander |
| A03-CMD-08-049 | 13 MAY 2008 | Lost property cupboard, Level 1: items held over 30 days to be disposed of 30 MAY 2008 | //SIGNED// G. IMRIE / for R. TEAGUE, Deputy Commander |
| A03-CMD-08-050 | 19 MAY 2008 | Dining hall holiday hours, 26 MAY 2008 | //SIGNED// G. IMRIE / for R. TEAGUE, Deputy Commander |
| A03-CMD-08-052 | 20 MAY 2008 | Medical readiness appointments, 21 MAY 2008: personnel with certifications expiring 31 MAY 2008 to attend | //SIGNED// G. IMRIE / for R. TEAGUE, Deputy Commander |

16.2. Registry and directive references:

| Document | Title |
|---|---|
| :x[OSC-FAC-CLS-ALPHA] | Facility Class Standard: ALPHA |
| :x[OSC-RSV-RX-A03] | Reactor Status: RX-A03 |
| :x[OSC-RSV-SEED] | Agricultural Seed Collection, ALPHA-03 (Catalogue) |
| :x[OSC-RSV-GENE] | Biological Sample Collection, ALPHA-03 (Catalogue) |
| :x[OSC-TRN-NET-CEN] | Network Sheet: Central Network |
| :x[OSC-TRN-SEG-01] | Segment Engineering Sheet: Segment 01 |
| :x[OSC-TRN-SEG-05] | Segment Engineering Sheet: Segment 05 |
| :x[OSC-DIR-0107] | Space and Parking Allocation at ALPHA-Class Facilities |
| :x[OSC-DIR-0128] | Air Handling: Filter Change Cycles and Seal-Capable Zones |
| :x[OSC-DIR-0141] | Food Service: Cafeteria Rotation, Dining Hours and Special Diets |
| :x[OSC-DIR-0204] | Medical Readiness Standard |
| :x[OSC-DIR-0336] | Records Accession, Custody and Chain-of-Custody Tracing |
| :x[OSC-DIR-0354] | Records Retention and Destruction |
