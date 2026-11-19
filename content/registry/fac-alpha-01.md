---
id: fac-alpha-01
route: /registry/facility/alpha-01
app: registry
family: registry
template: dossier
docNo: OSC-FAC-ALPHA-01
title: "Facility Dossier: ALPHA-01 \"RAVEN MOUNTAIN\""
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 9
date: 2008-04-30
facility: ALPHA-01
summary: "RAVEN MOUNTAIN, beneath a former quarry under reclamation (cover catalogued by Cover Operations)."
distribution:
  - Facility Commander, ALPHA-01
  - Deputy Commander, ALPHA-01 (Chair, Space and Parking Allocation Board)
  - Secretary to the Council (CS/ALPHA-01)
  - Director, Transit Operations (TO/ALPHA-01)
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Director, Cover Operations (CVO/ALPHA-04)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-CLS-ALPHA
  - OSC-TRN-SEG-01
  - OSC-TRN-SEG-02
  - OSC-TRN-SEG-06
  - OSC-TRN-NET-EAS
  - OSC-RSV-RX-A01
  - OSC-CNL-SEAT-00
  - OSC-ASR-COV
dossierType: &dtype "FACILITY DOSSIER: COMMAND & CONTROL HUB"
identity: &ident
  - { label: Designation, value: ALPHA-01, mono: true }
  - { label: Codename, value: RAVEN MOUNTAIN }
  - { label: Class, value: "ALPHA (Command & Control Hub)" }
  - { label: Network, value: Eastern Network (primary hub) }
  - { label: Cover facility type, value: Former quarry reclamation and groundwater monitoring station }
  - { label: Cover agency of record, value: Department of the Interior }
  - { label: Reactor installation, value: RX-A01, mono: true }
  - { label: Facility Commander, value: "T. R. Kelleway, VADM (Ret.)" }
  - { label: Deputy Commander, value: S. Pelletier }
  - { label: Resident divisions, value: "CS, OIA, TO, PV, CMP, IAD" }
  - { label: Register section, value: FE/ALPHA-02 Facilities Register }
  - { label: Dossier custodian, value: Plant Records Section, FE/ALPHA-02 }
dossier:
  facility: ALPHA-01
  dossierType: *dtype
  identity: *ident
revisions:
  - { rev: "9", date: 2008-04-30, change: "Pay run 30 APR 2008 return entered. Space and parking allocation board chair entered in para 9.", by: FE/ALPHA-02 }
  - { rev: "8", date: 2008-01-31, change: "Level 7 note amended at the request of the Council Secretariat.", by: FE/ALPHA-02 }
  - { rev: "7", date: 2007-02-28, change: "Segment 06 entered on completion. Platform 3 allocation changed.", by: FE/ALPHA-02 }
  - { rev: "6", date: 2006-11-30, change: "Segment 02 entered on completion.", by: FE/ALPHA-02 }
---

## 1. Location and terrain

| Field | Entry |
|---|---|
| Location (Facility Inventory) | :r[:c[facilities.ALPHA-01.locationText]]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"} |
| Terrain | :r[:c[facilities.ALPHA-01.terrain]]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"} |
| Surface reference point | :r[Reclamation office scale house, north gate]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"} |
| Depth to terminal level | :c[facilities.ALPHA-01.depthFt] ft |
| Completed | :c[facilities.ALPHA-01.completed] |
| Commander in post since | :c[facilities.ALPHA-01.completed] (facility completion) |

## 2. Cover identity

2.1. The surface facility is presented as a former limestone quarry under reclamation. No separate cover agency title is carried in the Facility Inventory for this site; the cover arrangement is catalogued by Cover Operations at :x[OSC-ASR-COV].

2.2. Prepared public statement (Cover Operations text; to be read as written and not paraphrased):

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
> :c[facilities.ALPHA-01.coverStory]
:::

2.3. Surface cover personnel are employed on reclamation duties and are not read into the facility. They work weekdays only. They are not to be asked to hold parcels, keys or vehicles for below-grade personnel (see para 9.4).

## 3. Function

:r[:c[facilities.ALPHA-01.function]]{compartment=SEXTANT auth="CVO" ref="OSC-CB-013"}

The Core Council sits at this facility. The Council Secretariat, the Office of Internal Assurance, Transit Operations (Network Control), Personnel & Vetting, the Comptroller and Intelligence & Analysis are headquartered here.

## 4. Capacity and staffing

| Measure | Figure |
|---|---|
| Berthing | :c[facilities.ALPHA-01.capacity] |
| Posted staff (return, pay run 30 APR 2008) | :c[facilities.ALPHA-01.staff] |
| Sustainability window at full reserves | :c[facilities.ALPHA-01.sustainedMonths] months |
| Ratio model basis | This site. :c[ratioModel.basis] |

4.1. ALPHA-01 is the basis of the class staffing model at :x[OSC-PER-RATIO]. The model complement of :c[ratioModel.capacity] is the complement for this site at full berthing. The posted figure above is the skeleton crew.

4.2. Posted staff by heading, as returned:

::canon-table{source="facilities.ALPHA-01.staffBreakdown" cols="role:Heading,count:Posted" caption="ALPHA-01 posted staff by heading, pay run 30 APR 2008"}

4.3. The site returns under six headings. The ratio model's ten function headings are not used on the ALPHA-01 return. The return has been accepted in this form since Revision 3.

## 5. Connections

5.1. Facility Inventory connection line, quoted:

> :c[facilities.ALPHA-01.connectionsText]

5.2. Inter-hub rail and regional tram detail:

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
| Platform | Service | Reference | Engineering length (mi) | Running time (h) | Status |
|---|---|---|---|---|---|
| 1 | Segment 01 to ALPHA-03 | :x[OSC-TRN-SEG-01] | :c[railSegments.01.miles] | :c[railSegments.01.hours] | :c[railSegments.01.status] |
| 2 | Segment 02 to ALPHA-02 | :x[OSC-TRN-SEG-02] | :c[railSegments.02.miles] | :c[railSegments.02.hours] | :c[railSegments.02.status] |
| 3 | Segment 06 to ALPHA-05 | :x[OSC-TRN-SEG-06] | :c[railSegments.06.miles] | :c[railSegments.06.hours] | :c[railSegments.06.status] |

Platforms 4 and 5 serve the Eastern Network tram (:x[OSC-TRN-NET-EAS]).

::canon-table{source="tramLinks" filter="from=ALPHA-01" cols="to:To,label:Area,miles:Miles,hours:Hours" caption="Eastern Network tram links from ALPHA-01"}

Network Control for the whole rail and tram network is on Level 10 of this site.
:::

## 6. Level index

Depths are to the top of each level, in feet below the surface reference point. The interval between Level 1 and Level 2 is lift shaft.

| Level | Designation | Top (ft) | Access | Notes |
|---|---|---|---|---|
| 0 | Surface: Reclamation Office and Scale House | :c[facilities.ALPHA-01.levels.0.topFt] | T4 | :c[facilities.ALPHA-01.levels.0.notes] |
| 1 | Shaft Collar and Portal Security | :c[facilities.ALPHA-01.levels.1.topFt] | T4 | :c[facilities.ALPHA-01.levels.1.notes] |
| 2 | Mechanical / Air Handling and Water Treatment | :c[facilities.ALPHA-01.levels.2.topFt] | T4 | :c[facilities.ALPHA-01.levels.2.notes] |
| 3 | Berthing A-F | :c[facilities.ALPHA-01.levels.3.topFt] | T4 | :c[facilities.ALPHA-01.levels.3.notes] |
| 4 | Dining and Personnel Services | :c[facilities.ALPHA-01.levels.4.topFt] | T4 | :c[facilities.ALPHA-01.levels.4.notes] |
| 5 | Clinic | :c[facilities.ALPHA-01.levels.5.topFt] | T4 | :c[facilities.ALPHA-01.levels.5.notes] |
| 6 | Administration and Secretariat Offices | :c[facilities.ALPHA-01.levels.6.topFt] | T3 | Council Secretariat; copy register held here. :r[Register custodian: Secretary to the Council (A. Penhallow). The :c[anomalies.ELECTRONIC_COPY.figures.copies] distribution copies are issued to seat holders against signature; returns and destructions witnessed by the Secretary in person.]{compartment=QUARRY auth="CS" ref="OSC-CNL-SEAT-00"} Personnel & Vetting; Comptroller. |
| 7 | Records and Secure Storage | :c[facilities.ALPHA-01.levels.7.topFt] | T3 | :c[facilities.ALPHA-01.levels.7.notes] |
| 8 | Communications Equipment Rooms | :c[facilities.ALPHA-01.levels.8.topFt] | T3 | :c[facilities.ALPHA-01.levels.8.notes] |
| 9 | :r[Power Plant]{tier=2 auth="FE" ref="OSC-ASR-CG"} | :c[facilities.ALPHA-01.levels.9.topFt] | T2 | :r[RX-A01 and switchgear. Diesel generator hall.]{tier=2 auth="FE" ref="OSC-ASR-CG"} |
| 10 | :r[Operations Floor]{tier=2 auth="IAD" ref="OSC-ASR-CG"} | :c[facilities.ALPHA-01.levels.10.topFt] | T2 | :r[Intelligence fusion floor and Network Control (Transit Operations).]{tier=2 auth="IAD" ref="OSC-ASR-CG"} |
| 11 | :r[Conference Level]{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"} | :c[facilities.ALPHA-01.levels.11.topFt] | T1 | :r[Access by Council Secretariat escort.]{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"} |
| 12 | :r[Residential Suite R]{tier=1 auth="CS" ref="OSC-CNL-CHR-VI"} | :c[facilities.ALPHA-01.levels.12.topFt] | T1 | :r[Maintained to standing readiness.]{tier=1 auth="CS" ref="OSC-CNL-CHR-VI"} |
| 13 | Rail Terminal: Inter-Hub Platforms and Eastern Network Tram | :c[facilities.ALPHA-01.levels.13.topFt] | T3 | :r[:c[facilities.ALPHA-01.levels.13.notes]]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

6.1. Lift car calls to Levels 11 and 12 are not available from the public lift panels. Personnel who find a lift stopped at either level are to remain in the car and use the car telephone.

## 7. Power

7.1. Reactor installation **RX-A01**, :c[reactors.RX-A01.designation]: :c[reactors.RX-A01.type]. Commissioned :c[reactors.RX-A01.commissioned]. Rated :c[reactors.RX-A01.thermalMWt] MWt / :c[reactors.RX-A01.electricMWe] MWe. Status page :x[OSC-RSV-RX-A01].

7.2. Status as carried: **:c[reactors.RX-A01.status]**. :c[reactors.RX-A01.statusNote]

7.3. Quarterly protection channel functional test: :c[calendar.CAL-0805-07.dateText], :c[calendar.CAL-0805-07.timeText]. :c[calendar.CAL-0805-07.note]

## 8. Telemetry (live tab; not part of the revision)

The telemetry tab shows values from the facility telemetry service at the time the window is opened. The values below are the reference set recorded at revision.

| Channel | Reading at revision | State |
|---|---|---|
| Station electrical load | 12.6 MWe | NOMINAL |
| Diesel generator hall | 4 sets on standby, fuel day tanks full | NOMINAL |
| Air handling | AHU-1 to AHU-8 in service; NBC filtration bypassed (normal) | NOMINAL |
| Supply air, berthing levels | 20.4 C, 41% RH | NOMINAL |
| CO2, Level 10 | 640 ppm | NOMINAL |
| Water treatment train | Train A in service, Train B standby | NOMINAL |
| Potable storage | 88% of usable volume | NOMINAL |
| Seal state | OPEN. Seal-capable zones at CONDITIONED. | NOMINAL |
| Portal blast doors | Open on hooks, tested 28 APR 2008 | NOMINAL |

## 9. Local administration

9.1. **Space and parking allocation.** The ALPHA-01 Space and Parking Allocation Board is chaired by the Deputy Commander, S. Pelletier. The Board sits on the first Tuesday of each month in Room 6-114 and allocates office space on Levels 6 to 8, berth assignments for personnel on extended duty, and vehicle spaces under :x[OSC-DIR-0107].

9.2. Vehicle spaces at this site are of two kinds. Surface spaces are in the reclamation office lot and are allocated by Cover Operations to cover personnel first; 14 are released to below-grade personnel by agreement. Below-grade spaces are the 38 bays on the Level 1 vehicle lift apron. Lift apron bays are allocated to command, Secretariat and duty vehicles only. Personal vehicles are not taken below grade.

9.3. The Board has recorded 11 requests this quarter for reassignment of lift apron bays from duty vehicles to individuals. None were approved. Requests citing seniority are returned without consideration. Requests citing a medical requirement are referred to the clinic on Level 5.

9.4. Personnel arriving by private vehicle park in the surface lot as visitors to the reclamation office and proceed to the shaft collar on foot. Vehicles left in the surface lot for more than 72 hours are reported to the reclamation field office as abandoned under the cover arrangement, and recovery is at the owner's expense.

9.5. **Linen exchange** on Level 3 is on Tuesdays. Berthing occupants on extended duty who miss the exchange draw linen from the Level 4 laundry against their badge.

9.6. **Dining.** The Level 4 dining hall follows the network cafeteria rotation (:x[OSC-DIR-0141]). Council session days are served by a separate menu prepared by the Secretariat; the dining hall is not informed of session dates in advance and is to keep the standard rotation regardless.

9.7. **Fire drill.** Evacuation to refuge chambers, :c[calendar.CAL-0805-38.dateText], :c[calendar.CAL-0805-38.timeText]. All levels, including Levels 11 and 12, which will be cleared by Secretariat escort.

## 10. Documents

| Document | Title |
|---|---|
| :x[OSC-FAC-CLS-ALPHA] | Facility Class Standard: ALPHA |
| :x[OSC-RSV-RX-A01] | Reactor Status: RX-A01 |
| :x[OSC-TRN-NET-EAS] | Network Sheet: Eastern Network |
| :x[OSC-CNL-SEAT-00] | Council Composition and Register of Distribution Copies |
| :x[OSC-ASR-COV] | Cover Identity Catalogue (ALPHA and BETA) |
| :x[OSC-DIR-0107] | Space and Parking Allocation at ALPHA-Class Facilities |
| :x[OSC-DIR-0156] | Fire Safety, Drills and Refuge Chambers |
