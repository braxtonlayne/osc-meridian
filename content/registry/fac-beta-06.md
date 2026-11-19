---
id: fac-beta-06
route: /registry/facility/beta-06
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-06
title: "Facility Dossier: BETA-06 (DOE Solar Research Facility)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-06
summary: Regional Operations Center under the cover "DOE Solar Research Facility"; function "Southwest regional ops".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-MTW]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-06
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-06
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-06, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: DOE Solar Research Facility }
    - { label: Function, value: Southwest regional ops }
    - { label: Commander, value: "T. Quintero (P-2-05-0236)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Seasonal posture, value: Summer heat posture from 01 JUN }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Summer heat posture entered; heat rejection works closed.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Dry cooler 3 added to plant list.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-06.locationText]. Upper Sonoran desert on the north side of the valley. The array field covers about 90 acres; the operations building, two maintenance buildings and a fenced instrument compound sit at its south edge.

**Cover story (prepared statement).** :c[facilities.BETA-06.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-06" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The array is real and exports to the grid. Its published output figures are the cover agency's. Part of the array's ground-mounted inverter yard stands over the installation's heat rejection plant, which accounts for the yard's size.
:::

## 2. Installation

Depth :c[facilities.BETA-06.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). Ground temperature at depth is about 27 C, and heat rejection rather than heating governs the plant design. Three dry coolers discharge through louvres in the inverter yard. Evaporative cooling is not used: water is the site's limiting reserve.

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-06.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-06.staff].

::canon-table{source="facilities.BETA-06.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

Security Forces carry a heavier share than at most BETA sites because the array field perimeter is long and is patrolled by the cover agency's contract guards by day and by installation posts at night.

:::redact{tier=2 auth="IAD" ref="OSC-DIR-0412"}
**Water.** The installation draws from two wells on the cover agency's water right. On activation the surface array staff are released from duty and directed to the public shelter list for the county; the wells are then drawn for the installation only. The regional analysis cell keeps the Southwest position on reservoir levels and canal deliveries for the same reason.
:::

## 4. Tram connection

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
Single tram link to the adjacent hub. Link engineering is on :x[OSC-TRN-NET-MTW].

::canon-table{source="tramNetworks.links" filter="to=BETA-06" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)"}

Terminal station; no onward link.
:::

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). In normal operation the station load is carried partly by the array through the cover agency's metering, which is recorded in the cover's accounts as research consumption. At night and on utility loss the diesel plant takes the load.

Water storage below grade was raised by 40,000 gallons in 2007 (tanks W5 and W6). The site's water allowance per berth remains below the class guide; a request to drill a third well is with Facilities Engineering and the cover agency.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1600 MST))

| System | Reading | State |
|---|---|---|
| Station supply | Utility with array contribution, 0.55 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Heat rejection | Dry coolers 1-2 running, 3 standby; supply 24.0 C | NOMINAL |
| Air (B3 operations room) | CO2 620 ppm, 22.6 C | NOMINAL |
| Water storage | 86% | NOMINAL |
| Dust load, intake filters | Pre-filter dP 0.42 in. w.g. | DEGRADED |
| NBC seal | Open | NOMINAL |

Intake pre-filters are changed early after wind events. The 27 APR 2008 dust event brought the change forward to 02 MAY 2008 (FE-08-0399).

## 7. Command and routine items

Commander: :c[roster.P-2-05-0236.name] (P-2-05-0236), t.quintero@b06.cmd.mer.

- **Summer heat posture** from 01 JUN 2008: surface work by installation staff between 1700Z and 2300Z (1000 and 1600 MST) needs the duty officer's approval; water and shade at the instrument compound; vehicles not to be left in the array access lanes.
- Glare complaints from the county road were raised with the cover agency in March. The agency has re-angled row 14. No action falls to the installation.
- Rattlesnake sightings at the instrument compound are to be reported to the cover's grounds contractor, not handled by staff.
- The galley water-saving schedule (paper service on Mondays and Thursdays) continues through the summer.

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Southwest regional ops: water allocation among sites in the region on activation, and the release of surface staff, under standing instructions held by the Council Secretariat.
:::
