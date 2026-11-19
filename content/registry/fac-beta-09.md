---
id: fac-beta-09
route: /registry/facility/beta-09
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-09
title: "Facility Dossier: BETA-09 (STRATCOM Auxiliary Facility)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-09
summary: Regional Operations Center under the cover "STRATCOM Auxiliary Facility"; function "Central military coordination".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-CEN, OSC-RSV-RX-B09]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-09
  - Facility Commander, ALPHA-03
  - Logistics & Reserves (Reactor Operations), ALPHA-05
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-09
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-09, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: STRATCOM Auxiliary Facility }
    - { label: Function, value: Central military coordination }
    - { label: Adjacent hub, value: ALPHA-03 }
    - { label: Commander, value: "B. Ostrander, Col (Ret.) (P-2-04-0252)" }
    - { label: Status, value: OPERATIONAL }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Cover review for May entered; staffing from the April returns.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Location and connection blocks released to the adjacent hub's readers at Tier 3.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Communications routing to the adjacent hub entered.", by: FE Registry }
---

This dossier is released more fully than other BETA dossiers. BETA-09 is the BETA site served directly from ALPHA-03, and its location, cover and connections are released to Tier 3 readers posted at ALPHA-03 for travel and continuity planning.

## 1. Location and cover

**Location.** :c[facilities.BETA-09.locationText]. Loess hills and cropland west of the Missouri River. The auxiliary facility is a single-storey communications building, a vehicle shed and an antenna field inside a double fence, reached by a county road.

**Cover story (prepared statement).** :c[facilities.BETA-09.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-09" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

**Cover review, May 2008.** :c[calendar.CAL-0805-33.title], :c[calendar.CAL-0805-33.dateText], :c[calendar.CAL-0805-33.timeText]. :c[calendar.CAL-0805-33.note] Reviewer from Cover Operations, ALPHA-04. The surface communications building's antenna field was extended in 2007 and the review is to confirm the extension is accounted for in the parent command's public record.

## 2. Installation

Depth :c[facilities.BETA-09.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). Personnel lift from the communications building; materials lift from the vehicle shed.

| Level | Use |
|---|---|
| Surface | Communications building, vehicle shed, antenna field (cover) |
| B1 | Lift lobby, portal security |
| B2 | Plant, diesel hall, switchgear |
| B3 | Operations room, Military Operations watch floor, analysis cell |
| B4 | Communications equipment, key distribution terminal |
| B5 | Berthing A-C, galley, clinic |
| B6 | Power plant; tram platform and stores |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-09.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-09.staff].

::canon-table{source="facilities.BETA-09.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

Military Operations is the largest line and the only one of its kind at a BETA site. It keeps a four-watch floor matched to the cover command's exercise calendar.

:::redact{tier=2 auth="IAD" ref="OSC-DIR-0412"}
**Alternate command.** BETA-09 is the alternate site for the ALPHA-03 command group. On loss of ALPHA-03 the command group relocates by tram, and the key distribution traffic for the adjacent hub's tram network is re-routed through B4 without manual intervention. The ALPHA-03 records stacks have no alternate; BETA-09 holds a 30-day working set of Records Division registers only.
:::

## 4. Tram connections

BETA-09 takes one link from the adjacent hub, ALPHA-03 (platform 3 at the ALPHA-03 rail terminal), and feeds two GAMMA shelters. Link engineering is on :x[OSC-TRN-NET-CEN].

::canon-table{source="tramNetworks.links" filter="to=BETA-09" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-09" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound links"}

Passenger travel from ALPHA-03 is booked on :x[OSC-F-109] under :x[OSC-DIR-0262]. Probationary staff travel only on the instruction of their supervisor.

## 5. Power and sustainability

Class standard: :c[classes.BETA.sustainabilityText]. On-site generation: NOMINAL. The site carries backup command and communications loads that cannot depend on the grid, and its on-site generation backs up the feeder supply for the tram link from the adjacent hub. Diesel plant to network standard (:c[reserves.items.ENERGY-DIESEL.value] days).

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
On-site generation is reactor :c[reactors.RX-B09.id], :c[reactors.RX-B09.designation] (:c[reactors.RX-B09.type]), :c[reactors.RX-B09.electricMWe] MWe, commissioned before the other two BETA units. Status :c[reactors.RX-B09.status]: :c[reactors.RX-B09.statusNote] Plant status, fuel and refuelling: :x[OSC-RSV-RX-B09].
:::

## 6. Telemetry (last return, 30 APR 2008 2300Z (1800 CDT))

| System | Reading | State |
|---|---|---|
| Station supply | On-site generation, utility tie closed | NOMINAL |
| Tram feeder (adjacent hub link) | Normal feed, backup armed | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B3 watch floor) | CO2 760 ppm, 21.3 C | NOMINAL |
| Air (B4 equipment rooms) | 19.0 C, 35% RH | NOMINAL |
| Water treatment | Potable storage 92% | NOMINAL |
| Key distribution terminal | Synchronised with ALPHA-03 | NOMINAL |
| NBC seal | Open | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-04-0252.name], :c[roster.P-2-04-0252.rank] (P-2-04-0252), b.ostrander@b09.cmd.mer.

- The watch floor's CO2 is the highest at the site during exercise weeks. AHU-3 supply rate was raised by 10% on 21 APR 2008 (FE-08-0384).
- ALPHA-03 staff visiting on duty draw a visitor berth at B5 through the duty officer. The site does not hold ALPHA-03 visitor badges; bring your own and the visit authority.
- Mess dues are collected on the first working day of the month. ALPHA-03 visitors pay at the daily rate.

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Central military coordination: liaison and tasking arrangements with the parent command on activation, and the authority under which they are exercised, held by the Council Secretariat.
:::
