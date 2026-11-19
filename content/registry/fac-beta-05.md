---
id: fac-beta-05
route: /registry/facility/beta-05
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-05
title: "Facility Dossier: BETA-05 (FAA Regional Training Center)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-05
summary: Regional Operations Center under the cover "FAA Regional Training Center"; function "Central logistics hub".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-SOU, OSC-TRN-NET-CEN]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-05
  - Logistics & Reserves, ALPHA-05
  - Transit Operations (Network Control), ALPHA-01
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-05
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-05, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: FAA Regional Training Center }
    - { label: Function, value: Central logistics hub }
    - { label: Commander, value: "R. Atwater (P-2-05-0230)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Tram role, value: Through station with tram yard }
    - { label: Stores account, value: LR stores account 05 }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. May cover course entered; yard road 4 returned to service.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Logistics & Supply line raised from 20 to 24 posts.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-05.locationText]. Rolling prairie between the river and the turnpike. The training center campus has two classroom blocks, the simulator building, a dormitory for course students and a warehouse.

**Cover story (prepared statement).** :c[facilities.BETA-05.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-05" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}
:::

## 2. Installation

Depth :c[facilities.BETA-05.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). The site is built around stores rather than operations. Two of its five levels are bulk stores and the tram level has a four-road yard.

| Level | Use |
|---|---|
| Surface | Classrooms, simulator building, student dormitory, warehouse (cover) |
| B1 | Lift lobby, portal security, goods receipt |
| B2 | Plant, operations room, analysis cell |
| B3 | Berthing, galley, clinic |
| B4 | Bulk stores A-D (rations, medical, spares) |
| B5 | Tram platforms 1-2, yard roads 1-4, wagon repair bay |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-05.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-05.staff].

::canon-table{source="facilities.BETA-05.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

Logistics & Supply is the largest line and works to Logistics & Reserves at ALPHA-05 on a stores account of its own. Transit Operations (Tram Yard) staff are carried on the site's strength but take their rosters from Network Control.

:::redact{tier=2 auth="LR" ref="OSC-DIR-0412"}
**Forward stocks.** BETA-05 holds the forward stock for the central and southern BETA and GAMMA sites: about 21 days' rations at surge berthing for the sites it serves, medical consumables, filter elements and lift spares. Issues are made against LR demands only. On activation, issues to GAMMA sites are made in the order of the published priority list, and a site that has not acknowledged the activation signal is passed over.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
BETA-05 takes one link from the adjacent hub and runs one outbound link to a GAMMA shelter. Link engineering: inbound on :x[OSC-TRN-NET-SOU]; outbound on :x[OSC-TRN-NET-CEN].

::canon-table{source="tramNetworks.links" filter="to=BETA-05" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-05" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}

The outbound link to GAMMA-10 is counted in the total of the neighbouring network, on whose sheet it appears, and not in the total of the network that feeds BETA-05. GAMMA-10 is also fed from that network's own BETA site.
:::

Yard road 4 was returned to service on 25 APR 2008 after re-sleepering. All four roads are available for stabling.

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation. The bulk stores carry the site's own sustainment stock separately from the forward stock; the two are not to be mixed on the shelves.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1800 CDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility, 0.67 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B4 bulk stores) | 16.5 C, 38% RH | NOMINAL |
| Air (B2 operations room) | CO2 700 ppm, 21.0 C | NOMINAL |
| Water treatment | Potable storage 91% | NOMINAL |
| NBC seal | Open | NOMINAL |
| Tram traction supply | Platforms and yard energised | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-05-0230.name] (P-2-05-0230), r.atwater@b05.cmd.mer.

- **Cover course in session.** :c[calendar.CAL-0805-22.title], from :c[calendar.CAL-0805-22.dateText], :c[calendar.CAL-0805-22.timeText] daily. :c[calendar.CAL-0805-22.note] The course students are cover agency personnel and are not to be addressed on any installation matter.
- The student dormitory's car park is full during course weeks. Installation staff park in the warehouse yard and walk to the service entrance.
- Annual stocktake of bulk stores B-D runs 02 to 06 JUN 2008. Stores A were counted in March with a variance of 0.4%.
- Forklift operator recertification for the Logistics & Supply line is due by 30 JUN 2008.

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Central logistics hub: the activation priority list for forward-stock issues and the passed-over procedure, held by Logistics & Reserves for the Council.
:::
