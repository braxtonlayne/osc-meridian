---
id: fac-beta-11
route: /registry/facility/beta-11
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-11
title: "Facility Dossier: BETA-11 (BLM Resource Management)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-11
summary: Regional Operations Center under the cover "BLM Resource Management"; function "Mountain West ops".
xrefs: [OSC-FAC-CLS-BETA]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-11
  - Cover Operations, ALPHA-04 (Cover Liaison Officer, Land Management)
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-11
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-11, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: BLM Resource Management }
    - { label: Function, value: Mountain West ops }
    - { label: Commander, value: "D. Hensley (P-2-05-0263)" }
    - { label: Cover liaison, value: "N. Buckmaster, CVO/ALPHA-04 (P-3-06-0731)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Access road closure lifted; document tab brought up to date.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Winter road closure entered.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
**Location.** :c[facilities.BETA-11.locationText]{auth="TO" ref="TO-07-313"}. High sagebrush valley on the east side of the Wasatch, about 6,400 ft above sea level. The field station is an office, a crew bunkhouse, a vehicle and equipment barn and a weather enclosure, on a graded road off the state highway.

**Cover story (prepared statement).** :c[facilities.BETA-11.coverStory]{auth="CVO" ref="CVO-07-113"}

::canon-table{source="coverCatalogue" auth="CVO" filter="facility=BETA-11" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

Surface liaison with the cover agency's field office is carried by the Cover Liaison Officer (Land Management) at ALPHA-04, :c[roster.P-3-06-0731.name], who covers this station and the surface surveying station at ALPHA-04.
:::

## 2. Installation

Depth :c[facilities.BETA-11.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). The installation lies in sedimentary rock beneath the valley floor; the personnel lift rises inside the equipment barn and the materials lift beside the fuel tank pad. Surge berthing is the lowest in the class.

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-11.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-11.staff].

::canon-table{source="facilities.BETA-11.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

:::redact{tier=2 auth="IAD" ref="IAD-07-0118"}
**Regional task.** The analysis cell keeps the Mountain West position: highway passes, power transmission corridors and the reservoirs serving the Wasatch Front. The cover's field crews survey corridor routes as part of their genuine range and mineral work; their reports are copied to the cell through the cover agency's ordinary file distribution and are not otherwise requested.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
BETA-11 takes one link from the adjacent hub and feeds one GAMMA shelter. Link engineering is on :x[OSC-TRN-NET-MTW].

::canon-table{source="tramNetworks.links" filter="to=BETA-11" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-11" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}
:::

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation. Diesel output is derated about 20% for altitude; the plant was sized for it.

The graded road from the state highway was closed by snow from 04 JAN to 11 MAR 2008. All staff movement in that period was by tram. The road is cleared by the county under the cover agency's maintenance agreement and is not to be ploughed by installation staff.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1700 MDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility, 0.46 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B3 operations room) | CO2 600 ppm, 19.6 C | NOMINAL |
| Water treatment | Potable storage 90% | NOMINAL |
| NBC seal | Open | NOMINAL |

## 7. Document tab

Site survey and geotechnical characterisation for BETA-11 began during the Winter Games security operation (:c[realEvents.RE-02.dateText]) and finished the following spring. Survey vehicles and drilling crews worked under their own contractor markings alongside the security infrastructure surveys then running across the region for the Winter Games, and were not distinguished from them by observers. No agency running those surveys engaged or knew of the crews. The survey was funded under line item LI-018:

| Line item | Title | Account |
|---|---|---|
| LI-018 | :c[budget.lineItems.LI-018.title] | :c[budget.lineItems.LI-018.account]{raw} |

Records of the survey (logs of 14 boreholes, two seismic refraction lines) are held at ALPHA-02 under FE file FE/GEO/B11. The cover agency's own records show the drilling as a groundwater investigation. See also :x[OSC-LDG-REG].

## 8. Command and routine items

Commander: :c[roster.P-2-05-0263.name]{auth="PV" ref="PV-07-212"} (P-2-05-0263), d.hensley@b11.cmd.mer.

- Elk on the access road at dusk. Drive slowly between the cattle guard and the barn.
- The cover's field crews start their summer season on 19 MAY 2008. Bunkhouse occupancy rises from 4 to 12; installation staff are not to use the bunkhouse showers.
- Altitude: new arrivals are given a 48-hour light-duty period. The clinic holds supplementary oxygen for the B5 berthing area.

:::redact{tier=1 auth="COUNCIL" ref="CC-ART-IV"}
Mountain West ops: corridor priorities for movement to and from the adjacent hub on activation, held for the Council.
:::
