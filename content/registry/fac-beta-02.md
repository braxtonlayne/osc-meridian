---
id: fac-beta-02
route: /registry/facility/beta-02
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-02
title: "Facility Dossier: BETA-02 (Natural Gas Reserve Facility)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-02
summary: Regional Operations Center under the cover "Natural Gas Reserve Facility"; function "Mid-Atlantic industrial continuity".
xrefs: [OSC-FAC-CLS-BETA]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-02
  - Transit Control, BETA-02
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-02
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-02, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: Natural Gas Reserve Facility }
    - { label: Function, value: Mid-Atlantic industrial continuity }
    - { label: Commander, value: "D. Kowalczyk (P-2-04-0211)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Tram role, value: "Through station (one inbound, two outbound)" }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Possession for May entered; compressor building works closed.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Cover review of 15 JAN 2008 entered.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Industrial Continuity Planning line raised from 11 to 14 posts.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
**Location.** :c[facilities.BETA-02.locationText]{auth="TO" ref="TO-07-313"}. Upland farm and second-growth woodland on the Allegheny plateau. The surface property is fenced to pipeline-operator standard and posted with the operator's emergency number.

**Cover story (prepared statement).** :c[facilities.BETA-02.coverStory]{auth="CVO" ref="CVO-07-113"}

::canon-table{source="coverCatalogue" auth="CVO" filter="facility=BETA-02" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The compressor station and wellheads at the surface are operable and are run on a published test schedule. Flare tests are notified to the county the day before. Odorant deliveries arrive by road on the first Monday of the month.
:::

## 2. Installation

Depth :c[facilities.BETA-02.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). Access is by the personnel lift inside the compressor building and the materials lift under the pipe yard. The site was the first BETA installation in the region to take a tram link and is laid out around the tram level, which has three platforms.

| Level | Use |
|---|---|
| Surface | Compressor building, control room, meter house, pipe yard (cover) |
| B1 | Lift lobby, portal security |
| B2 | Plant: air handling, water, switchgear, diesel hall |
| B3 | Operations room, regional analysis cell, Industrial Continuity Planning |
| B4 | Berthing A-B, galley, clinic |
| B5 | Tram level: platforms 1-3, crew room, Transit Control desk |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-02.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-02.staff].

::canon-table{source="facilities.BETA-02.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

The Industrial Continuity Planning line is particular to BETA-02. It keeps the regional register of continuity-essential plant (refineries, rolling mills, chemical works, power stations, rail yards) and the call-out arrangements for each.

:::redact{tier=2 auth="IAD" ref="IAD-07-0118"}
**Continuity cards.** Industrial Continuity Planning holds relocation cards for 31 named plant managers and senior engineers in the region. Holders know the card admits them to "a federal facility" on a published code word. They have not been told where it is or how deep. Card holders' families are not covered; the matter was raised at the 2007 programme review and left with the Council Secretariat.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
BETA-02 takes one link from the adjacent hub and feeds two GAMMA shelters. Link engineering is on :x[OSC-TRN-NET-EAS].

::canon-table{source="tramNetworks.links" filter="from=BETA-02" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound links"}

::canon-table{source="tramNetworks.links" filter="to=BETA-02" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

All three links were witnessed in acceptance runs before the first cut-off of the Council return and are counted in it.
:::

**Possession, May 2008.** Track inspection on the link to GAMMA-03 is booked as an ordinary possession:

| Item | Entry |
|---|---|
| Calendar entry | :c[calendar.CAL-0805-27.title] |
| Date | :c[calendar.CAL-0805-27.dateText] |
| Times | :c[calendar.CAL-0805-27.timeText] |
| Limits | BETA-02 platform 2 starter signal to GAMMA-03 buffer stop |
| Engineer in charge | Permanent Way Inspector, BETA-02 (Technical/Engineering) |
| Party | 4 (inspection trolley crew 3, lookout 1) |
| Booked by | :c[calendar.CAL-0805-27.originator] |
| Conditions | :c[calendar.CAL-0805-27.note] |

The link to GAMMA-04 and the inbound link stay open throughout. The 0430Z (0030 EDT) freight path to GAMMA-03 is cancelled for the night and runs the following night.

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). The site draws utility power through the cover's compressor-station feed, which is a dedicated circuit from the regional distributor; loss of that feed is the normal trigger for the diesel plant, and has occurred four times since handover (the last on 11 FEB 2008, ice on the line, 3 h 10 min).

Diesel bulk storage was cleaned and polished in March under work order FE-08-0288. The polisher has been returned to ALPHA-01 stores.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1900 EDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility (dedicated feed), 0.88 MW | NOMINAL |
| Diesel plant | Standby; unit 2 on maintenance hold | DEGRADED |
| Air (B3 operations room) | CO2 690 ppm, 20.9 C | NOMINAL |
| Water treatment | Potable storage 94% | NOMINAL |
| NBC seal | Open | NOMINAL |
| Tram traction supply | Platforms 1-3 energised | NOMINAL |

Diesel unit 2 is held for a governor actuator (on order, FE-08-0402). Units 1 and 3 carry the station load between them.

## 7. Command and routine items

Commander: :c[roster.P-2-04-0211.name]{auth="PV" ref="PV-07-212"} (P-2-04-0211), d.kowalczyk@b02.cmd.mer.

- Parking at the surface is limited to the cover's 18 marked bays. Staff are reminded that the meter house apron is not a parking area; two vehicles were moved in April at the request of the cover's shift supervisor.
- Annual hearing tests for staff with surface duties (compressor noise exposure) are on 13 and 14 MAY 2008 at the clinic.
- The regional analysis cell has moved to 0600Z (0200 EDT) submission of its contribution to the daily continuity summary.

:::redact{tier=1 auth="COUNCIL" ref="CC-ART-IV"}
Mid-Atlantic industrial continuity: the order of restoration for designated plant in the region and the reserve allocations against each, held for the Council and released on activation.
:::
