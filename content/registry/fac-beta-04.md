---
id: fac-beta-04
route: /registry/facility/beta-04
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-04
title: "Facility Dossier: BETA-04 (Agricultural Research Station)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-04
summary: Regional Operations Center under the cover "Agricultural Research Station"; function "Northern Plains monitoring".
xrefs: [OSC-FAC-CLS-BETA]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-04
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-04
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-04, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: Agricultural Research Station }
    - { label: Function, value: Northern Plains monitoring }
    - { label: Commander, value: "K. Lindahl (P-2-05-0224)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Watch pattern, value: "Two watches, day-weighted" }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Spring field programme entered; no change to identity block.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Frost protection on the materials lift head entered.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
**Location.** :c[facilities.BETA-04.locationText]{auth="TO" ref="TO-07-313"}. Glacial till farmland in the St. Croix valley approaches. The station holds 600 acres of test plots, two machine sheds, a grain dryer and the office and laboratory building.

**Cover story (prepared statement).** :c[facilities.BETA-04.coverStory]{auth="CVO" ref="CVO-07-113"}

::canon-table{source="coverCatalogue" auth="CVO" filter="facility=BETA-04" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}
:::

## 2. Installation

Depth :c[facilities.BETA-04.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). The personnel lift rises inside machine shed 2. The materials lift head is housed in the grain dryer annex, which accounts for its size and for truck movements at harvest.

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-04.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-04.staff], the smallest BETA command.

::canon-table{source="facilities.BETA-04.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

The proportion of Intelligence/Analysis posts is the highest in the class. The regional analysis cell works a day-weighted pattern; one analyst and one communications operator keep the night watch.

:::redact{tier=2 auth="IAD" ref="IAD-07-0118"}
**Monitoring task.** The cell compiles a weekly position on grain in elevator storage, rail car loadings and fertiliser stocks across the northern plains states, drawn from published market reports and the cover station's own crop survey. The position is forwarded to Logistics & Reserves for the subsistence planning figures. It is not attributed to the station in any product.
:::

## 4. Tram connection

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
Single tram link to the adjacent hub, one of the longer BETA links in the network. Link engineering is on :x[OSC-TRN-NET-MTW].

::canon-table{source="tramNetworks.links" filter="to=BETA-04" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)"}

Terminal station; no onward link.
:::

Freight runs Wednesdays. The station has asked for a second weekly freight path to cover the summer field programme; Transit Operations has replied that paths for the timetable change are fixed.

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation. The cover's grain dryer runs on propane from the station's own tank farm, which is not connected to the installation.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1800 CDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility (rural cooperative), 0.32 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B3 operations room) | CO2 580 ppm, 19.8 C | NOMINAL |
| Water treatment | Potable storage 97% | NOMINAL |
| NBC seal | Open | NOMINAL |
| Materials lift head | Frost heaters off for season | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-05-0224.name]{auth="PV" ref="PV-07-212"} (P-2-05-0224), k.lindahl@b04.cmd.mer.

- Spring planting on the cover's test plots runs from 05 MAY 2008. Staff without surface duties use the south gate while the planters are working the north field.
- The station's two machine sheds are counted in the cover's equipment inventory. Nothing belonging to the installation is to be stored in them.
- Two Security Forces posts were filled from the April intake; the site is at establishment for the first time since handover.
- Radon readings on B2 were within limits at the March survey. Next survey September.

:::redact{tier=1 auth="COUNCIL" ref="CC-ART-IV"}
Northern Plains monitoring: subsistence planning for the network on activation draws on the regional grain position held here; requisition authority under the Charter rests with the Council.
:::
