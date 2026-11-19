---
id: fac-beta-07
route: /registry/facility/beta-07
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-07
title: "Facility Dossier: BETA-07 (USGS Seismology Center)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-07
summary: Regional Operations Center under the cover "USGS Seismology Center"; function "Pacific Northwest ops / tech sector continuity".
xrefs: [OSC-FAC-CLS-BETA]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-07
  - Transit Operations (Network Control), ALPHA-01
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-07
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-07, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: USGS Seismology Center }
    - { label: Function, value: Pacific Northwest ops / tech sector continuity }
    - { label: Commander, value: "A. Haverford (P-2-05-0241)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Structural design, value: "Base-isolated (levels B2-B5)" }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Bearing inspection for May entered.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Post-handover settlement survey (December) entered; within tolerance.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Handover from construction; dossier opened at revision 4 to follow the class series.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-07-104"}
**Location.** :c[facilities.BETA-07.locationText]{auth="TO" ref="TO-07-313"}. Forested foothills of the Cascades above a river valley. The seismology center occupies a two-storey data building, an instrument workshop and a radio mast on a gated forest road.

**Cover story (prepared statement).** :c[facilities.BETA-07.coverStory]{auth="CVO" ref="CVO-07-113"}

::canon-table{source="coverCatalogue" auth="CVO" filter="facility=BETA-07" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The center's surface sensors are part of the public network and their data is published. The installation keeps its own down-hole instruments separately; they are not connected to the cover's network.
:::

## 2. Installation

Depth :c[facilities.BETA-07.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). BETA-07 is the only base-isolated BETA site. Levels B2 to B5 are built as a single box on elastomeric bearings within the excavated cavern, with a 30-inch moat all round. The tram portal is the one rigid connection across the moat and is carried on a separate set of bearings with a sliding expansion joint at the platform edge.

| Level | Use |
|---|---|
| Surface | Data building, instrument workshop, radio mast (cover) |
| B1 | Lift lobby, portal security (rigid; outside the isolated box) |
| B2 | Plant, diesel hall |
| B3 | Operations room, analysis cell, Technology Sector Liaison |
| B4 | Berthing, galley, clinic |
| B5 | Tram platform and portal (isolated portal bearings) |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-07.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-07.staff].

::canon-table{source="facilities.BETA-07.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

The Technology Sector Liaison line is particular to BETA-07. It maintains continuity arrangements with regional software, semiconductor and data-centre operators under the cover of the seismic-hazard outreach the center genuinely runs.

:::redact{tier=2 auth="IAD" ref="IAD-07-0118"}
**Liaison arrangements.** Arrangements are in place with nine firms in the region. Each holds a sealed recovery set (source code escrow, process documentation, key-holder lists) on deposit at the installation under a commercial storage contract with the cover agency. The firms' names are held by Intelligence & Analysis and do not appear in installation records. No firm employee is on the relocation list.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
BETA-07 takes one link from the adjacent hub, the longest BETA link in the network, and feeds one GAMMA shelter. Link engineering is on :x[OSC-TRN-NET-MTW].

::canon-table{source="tramNetworks.links" filter="to=BETA-07" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-07" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}
:::

**Bearing inspection, May 2008.**

| Item | Entry |
|---|---|
| Calendar entry | :c[calendar.CAL-0805-12.title] |
| Date | :c[calendar.CAL-0805-12.dateText] |
| Times | :c[calendar.CAL-0805-12.timeText] |
| Booked by | :c[calendar.CAL-0805-12.originator] |
| Conditions | :c[calendar.CAL-0805-12.note] |
| Scope | Portal bearings P1-P8: cover rubber cracking, shear offset, anchor bolts. Expansion joint at platform edge: gap and plate wear. |
| Previous result | NOV 2007: bearing P6 shear offset 4 mm, within tolerance; marked for re-measurement |

Bearings for the isolated box are inspected annually in October; the portal bearings twice a year because they carry the tram running loads.

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation. Groundwater inflow is the highest in the region in winter (peak 140 gpm in January) and falls through the spring; the B5 sump pumps are on the essential bus.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1600 PDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility, 0.49 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B3 operations room) | CO2 640 ppm, 20.2 C | NOMINAL |
| Water treatment | Potable storage 93% | NOMINAL |
| Groundwater, B5 sump | Inflow 62 gpm | NOMINAL |
| Isolation moat | Clear; last walk 28 APR 2008 | NOMINAL |
| Down-hole accelerometers | 3 of 3 reporting | NOMINAL |
| NBC seal | Open | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-05-0241.name]{auth="PV" ref="PV-07-212"} (P-2-05-0241), a.haverford@b07.cmd.mer.

- The isolation moat is not a storage space. Two pallets of filter elements found in the north moat on 28 APR 2008 have been removed to B2 stores.
- Earthquake drill (drop, cover, hold; then muster) is on the third Thursday of each month at 1900Z (1200 PDT).
- The cover's radio mast is being repainted in June. Staff using the forest road will see a contractor crane on site from 09 JUN 2008.

:::redact{tier=1 auth="COUNCIL" ref="CC-ART-IV"}
Pacific Northwest ops / tech sector continuity: the order in which deposited recovery sets are opened on activation, and by whom, held for the Council.
:::
