---
id: fac-beta-12
route: /registry/facility/beta-12
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-12
title: "Facility Dossier: BETA-12 (FEMA Hurricane Continuity Site)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-12
summary: Regional Operations Center under the cover "FEMA Hurricane Continuity Site"; function "Gulf Coast operations".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-SOU]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-12
  - Cover Operations, ALPHA-04
  - Comptroller, ALPHA-01
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-12
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-12, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: FEMA Hurricane Continuity Site }
    - { label: Function, value: Gulf Coast operations }
    - { label: Commander, value: "M. Thibodeaux (P-2-05-0269)" }
    - { label: Status, value: OPERATIONAL }
    - { label: Season posture, value: "Pre-season (season opens 01 JUN)" }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Season posture review entered; dewatering well DW-4 returned to service.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Handover from construction (December) entered; first staffing return.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-12.locationText]. Piney woods and pasture on the terrace north of the lake parishes, above the storm surge line. The continuity site is a hardened operations building, two equipment staging warehouses, a fuel farm, a helicopter pad and a generator building.

**Cover story (prepared statement).** :c[facilities.BETA-12.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-12" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}
:::

**Cover history.** :c[realEvents.RE-06.dateText]: :c[realEvents.RE-06.publicEvent] The site was then under construction. Surface activity during the response made the cover more visible than planned, and the higher level of activity was kept afterwards and written into the cover story. Obligations on the site's line item rose from FY2006:

| Line item | Title | FY2005 | FY2006 | FY2007 | FY2008 |
|---|---|---|---|---|---|
| LI-063 | :c[budget.lineItems.LI-063.title] | :c[budget.lineItems.LI-063.fy.FY2005] | :c[budget.lineItems.LI-063.fy.FY2006] | :c[budget.lineItems.LI-063.fy.FY2007] | :c[budget.lineItems.LI-063.fy.FY2008] |

Figures in $ millions, from :x[OSC-LDG-REG].

## 2. Installation

Depth :c[facilities.BETA-12.depthFt] ft, the shallowest BETA site (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]), and the most recently completed. The installation sits in saturated coastal-plain sands and clays below a perched water table; it is kept dry by a ring of six dewatering wells (DW-1 to DW-6) and a sump system on every level. Loss of dewatering is the site's principal engineering risk and has its own response plan (FE-RP-B12-01).

| Level | Use |
|---|---|
| Surface | Operations building, staging warehouses, fuel farm, generator building, helicopter pad (cover) |
| B1 | Lift lobby, portal security, flood doors |
| B2 | Plant, dewatering control room, diesel hall |
| B3 | Operations room, analysis cell, communications |
| B4 | Berthing A-C, galley, clinic |
| B5 | Tram platforms 1-2, stores |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-12.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-12.staff].

::canon-table{source="facilities.BETA-12.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

The Technical/Engineering line includes the dewatering crew, which keeps a two-person watch in the B2 control room at all hours. Logistics/Support is larger than the class norm because the site holds the regional storm stock for the cover.

:::redact{tier=2 auth="PV" ref="OSC-DIR-0412"}
**Relocation list.** The Gulf Coast relocation list (RL-B12) was enlarged in FY2006 from 190 to 340 named persons. The list was drawn up after the 2005 response showed which regional officials had remained in post. Officials who left their posts during that response were not carried forward.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
BETA-12 takes one link from the adjacent hub and feeds one GAMMA shelter. Link engineering is on :x[OSC-TRN-NET-SOU].

::canon-table{source="tramNetworks.links" filter="to=BETA-12" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-12" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}

The tram portal at B5 is fitted with a flood door, closed on storm warning and opened for booked movements only.
:::

## 5. Sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Diesel runtime to network standard (:c[reserves.items.ENERGY-DIESEL.value] days). No on-site generation. Dewatering pumps are on the essential bus and are the largest single essential load. The cover's generator building and fuel farm serve the surface site only.

## 6. Telemetry (last return, 30 APR 2008 2300Z (1800 CDT))

| System | Reading | State |
|---|---|---|
| Station supply | Utility, 0.71 MW | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Dewatering | DW-1 to DW-6 running; ring drawdown 2.1 ft below design | NOMINAL |
| Sumps (B1-B5) | All pumps auto; B5 high-level alarm tested 28 APR 2008 | NOMINAL |
| Air (B3 operations room) | CO2 640 ppm, 21.8 C, 58% RH | NOMINAL |
| Water treatment | Potable storage 87% | NOMINAL |
| NBC seal | Open | NOMINAL |

DW-4 was returned to service on 22 APR 2008 after a pump change (FE-08-0377).

## 7. Command and routine items

Commander: :c[roster.P-2-05-0269.name] (P-2-05-0269), m.thibodeaux@b12.cmd.mer.

- **Season posture review.** :c[calendar.CAL-0805-16.title], :c[calendar.CAL-0805-16.dateText], :c[calendar.CAL-0805-16.timeText]. :c[calendar.CAL-0805-16.note] The review also confirms that the flood doors at B1 and B5 close in under 90 seconds, that dewatering runs on diesel alone for the 72-hour test, and the staff call-in list for a storm landfall.
- Staff living in the lake parishes are to keep their household storm plans current; leave during a declared storm is granted only for evacuation of dependants.
- Mould: report any visible growth at B4 to the clinic, not to the galley. Dehumidifier filters are changed fortnightly through the summer.
- The cover's helicopter pad is not a parking area at any time.

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Gulf Coast operations: continuity of the energy and port picture for the Gulf Coast on activation, with the regional reconstitution order held for the Council.
:::
