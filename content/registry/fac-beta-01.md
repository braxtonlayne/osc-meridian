---
id: fac-beta-01
route: /registry/facility/beta-01
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-01
title: "Facility Dossier: BETA-01 (EPA Monitoring Station)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-01
summary: Regional Operations Center under the cover "EPA Monitoring Station"; function "Northeast regional ops".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-EAS]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-01
  - Cover Operations, ALPHA-04
  - Transit Operations (Network Control), ALPHA-01
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-01
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-01, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: EPA Monitoring Station }
    - { label: Function, value: Northeast regional ops }
    - { label: Commander, value: "W. Ingersoll (P-2-05-0203)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Engineering authority, value: FE/ALPHA-02 }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Staffing from the April returns; winter works closed out.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Portal snow-melt slab added to plant list.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Handover from construction complete; first quarterly return.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-01.locationText]. Rolling woodland and farm lots west of the Penobscot valley. The surface installation sits on a 140-acre parcel registered to the cover agency, with a single paved access from the town road.

**Cover story (prepared statement).** :c[facilities.BETA-01.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-01" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The monitoring work at the surface is genuine. Air and surface water results are published by the cover agency under its own programme. Sampling crews are employed by the cover agency and are not briefed on the installation below.
:::

## 2. Installation

Depth to the lowest occupied level is :c[facilities.BETA-01.depthFt] ft, within the class band of :c[classes.BETA.depthText] (:x[OSC-FAC-CLS-BETA]). The installation is entered from the instrument building by the personnel lift and from the vehicle garage by the materials lift. There is no vehicle ramp.

| Level | Use |
|---|---|
| Surface | Instrument building, sample preparation laboratory, vehicle garage (cover) |
| B1 | Lift lobby, portal security, decontamination |
| B2 | Air handling, water treatment, switchgear, diesel generator room |
| B3 | Operations room, regional analysis cell, communications |
| B4 | Berthing, galley, clinic |
| B5 | Tram platform and stores |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-01.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-01.staff].

::canon-table{source="facilities.BETA-01.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

BETA-01 runs three watches on the operations floor rather than the four kept at the larger BETA commands. Security Forces post orders were revised on 14 APR 2008 to drop the second portal post between 2300 and 0600 local, when the instrument building is locked.

:::redact{tier=2 auth="PV" ref="OSC-DIR-0412"}
**Relocation designation.** On activation the installation receives the Northeastern regional continuity group (relocation list RL-B01, 212 named persons). Admission is by list. The cover agency's sampling crews and instrument technicians are not on the list and are released from duty at the gate under the cover agency's own closure procedure.
:::

## 4. Tram connection

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
Single tram link to the adjacent hub. Link engineering is given on :x[OSC-TRN-NET-EAS].

::canon-table{source="tramNetworks.links" filter="to=BETA-01" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)"}

BETA-01 is a terminal station: there is no onward link to a GAMMA site.
:::

One platform, one stabling road. Freight movements run on Tuesdays and Fridays; passenger movements are booked through Network Control under :x[OSC-DIR-0262].

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel plant is sized to the network standard of :c[reserves.items.ENERGY-DIESEL.value] days' runtime. The site has no on-site generation other than the diesel plant and the cover agency's utility supply.

The winter works list closed on 18 APR 2008. Items carried forward:

- Snow-melt slab at the garage apron: heating element zone 3 open circuit. Work order FE-08-0361. Not required until November.
- Spring road posting: the town road carries a seasonal weight limit until the town lifts it, normally the second week of May. Fuel and bulk deliveries are deferred until then; diesel day tanks are at 92% and the bulk tank at 81%.
- Sample shipment courier changed to the cover agency's new regional contract from 01 APR 2008. Courier vehicles now arrive at 1500 local, not 1000. Portal security has the revised list.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1900 EDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility, 0.41 MW | NOMINAL |
| Diesel plant | Standby, auto start armed | NOMINAL |
| Air (B3 operations room) | CO2 610 ppm, 20.5 C | NOMINAL |
| Water treatment | Potable storage 88% | NOMINAL |
| NBC seal | Open, dampers tested 22 APR 2008 | NOMINAL |
| Groundwater, B5 sump | Pump duty 31% (spring melt) | NOMINAL |

## 7. Command and routine items

Commander: Walter Ingersoll (P-2-05-0203), w.ingersoll@b01.cmd.mer.

- The annual security refresher for the site falls due 31 MAY 2008. Eleven staff were outstanding at the April return.
- Galley menu rotation follows the Eastern region cycle. The site has asked for a second fish day; the request is with Logistics & Reserves.
- Lost badge reported 09 APR 2008 (Logistics/Support). Badge cancelled and reissued under :x[OSC-DIR-0115].

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Northeast regional ops: continuity of the regional analysis picture for the six northeastern states on loss of ALPHA-01, including the maritime approaches. Standing designations for the regional reconstitution group are held by the Council Secretariat.
:::
