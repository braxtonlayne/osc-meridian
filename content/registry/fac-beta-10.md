---
id: fac-beta-10
route: /registry/facility/beta-10
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-10
title: "Facility Dossier: BETA-10 (DHS Regional Response Center)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-10
summary: Regional Operations Center under the cover "DHS Regional Response Center"; function "Great Lakes regional command".
xrefs: [OSC-FAC-CLS-BETA]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-10
  - Transit Operations (Network Control), ALPHA-01
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-10
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-10, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: DHS Regional Response Center }
    - { label: Function, value: Great Lakes regional command }
    - { label: Commander, value: "P. Novak (P-2-04-0258)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Diesel plant, value: "Six units (1-3 essential, 4-6 general)" }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. May generator run test entered; staffing from the April returns.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Tram crew depot (B6) added to level table.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Transit Operations (Tram) line raised from 10 to 14 posts.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
**Location.** :c[facilities.BETA-10.locationText]{auth="TO" ref="TO-07-313"}. Flat farmland and light industrial parks at the edge of the outer suburbs, beside a state route and a freight rail line.

**Cover story (prepared statement).** :c[facilities.BETA-10.coverStory]{auth="CVO" ref="CVO-07-113"}

::canon-table{source="coverCatalogue" auth="CVO" filter="facility=BETA-10" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The response center is the largest BETA cover by surface floor area: an operations building with a public-facing exercise hall, an equipment staging warehouse, a generator building and a truck yard. Surface staff are cover agency employees.
:::

## 2. Installation

Depth :c[facilities.BETA-10.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). The generator building at the surface houses the installation's diesel plant in plain view; the cover's published generator testing accounts for it.

| Level | Use |
|---|---|
| Surface | Operations building, exercise hall, staging warehouse, generator building, truck yard (cover) |
| B1 | Lift lobby, portal security |
| B2 | Plant: air handling, water, switchgear |
| B3 | Regional command floor, analysis cell |
| B4 | Communications, key distribution terminal |
| B5 | Berthing A-D, galley, clinic, gymnasium |
| B6 | Tram platforms 1-2, crew depot, stores |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-10.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-10.staff], the largest BETA staff.

::canon-table{source="facilities.BETA-10.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

The Transit Operations (Tram) line staffs the crew depot at B6. Drivers based here work turns on the region's links and are rostered by Network Control. The Communications line is the largest at any BETA site because B4 relays traffic for the region's GAMMA shelters.

:::redact{tier=2 auth="IAD" ref="IAD-07-0118"}
**Regional command.** On activation BETA-10 takes command of the Great Lakes region's GAMMA shelters and corridor sites and holds the regional relocation list (RL-B10, 1,040 named persons, the largest BETA list). Exercise participants from the cover agency's own interagency programme have been used, without their knowledge, to time the surface-to-B3 transit on three occasions since 2006.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
BETA-10 takes one link from the adjacent hub and feeds one GAMMA shelter. Link engineering is on :x[OSC-TRN-NET-EAS].

::canon-table{source="tramNetworks.links" filter="to=BETA-10" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-10" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}
:::

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation other than diesel. The site has the largest diesel plant in the class: six units, with units 1 to 3 on the essential buses and units 4 to 6 on the general buses. The cover's grid ties are duplicated from two substations.

**Generator run test, May 2008.**

| Item | Entry |
|---|---|
| Calendar entry | :c[calendar.CAL-0805-03.title] |
| Date | :c[calendar.CAL-0805-03.dateText] |
| Times | :c[calendar.CAL-0805-03.timeText] |
| Booked by | :c[calendar.CAL-0805-03.originator] |
| Notice | :c[calendar.CAL-0805-03.note] |
| Load | Station essential load transferred to units 1-3; utility tie open for the test period |
| Witness | Duty Engineer, B2; Facilities Engineering witness by telephone from ALPHA-02 |

Units 4 to 6 are run loaded in the first week of each quarter; next in July.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1800 CDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility (two feeds), 1.12 MW | NOMINAL |
| Diesel plant | 6 units standby | NOMINAL |
| Air (B3 command floor) | CO2 680 ppm, 20.8 C | NOMINAL |
| Water treatment | Potable storage 95% | NOMINAL |
| NBC seal | Open | NOMINAL |
| Tram traction supply | Platforms 1-2 energised | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-04-0258.name]{auth="PV" ref="PV-07-212"} (P-2-04-0258), p.novak@b10.cmd.mer.

- Parking: the truck yard is the cover's. Installation staff use the north lot. Permits for the north lot are reissued on 01 JUN 2008; collect from the B1 security office.
- The gymnasium at B5 is closed 0500Z to 0700Z (0000 to 0200 CDT) for cleaning.
- The interagency exercise in the surface exercise hall on 20 and 21 MAY 2008 will bring about 120 visitors to the surface. Installation staff without surface duties use the service entrance on both days.
- Tram crew rest rooms at B6 have been repainted. Crews are asked not to fix notices to the new paintwork.

:::redact{tier=1 auth="COUNCIL" ref="CC-ART-IV"}
Great Lakes regional command: command relationships with the regional corridor sites and the activation authority for the regional relocation list, held by the Council Secretariat.
:::
