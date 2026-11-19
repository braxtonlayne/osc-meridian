---
id: fac-beta-08
route: /registry/facility/beta-08
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-08
title: "Facility Dossier: BETA-08 (Nuclear Test Site Support)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-08
summary: Regional Operations Center under the cover "Nuclear Test Site Support"; function "Nevada operations / weapons oversight".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-MTW, OSC-RSV-RX-B08]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-08
  - Logistics & Reserves (Reactor Operations), ALPHA-05
  - Security Forces Command, ALPHA-02
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-08
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-08, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: Nuclear Test Site Support }
    - { label: Function, value: Nevada operations / weapons oversight }
    - { label: Commander, value: "M. Sorensen, Col (Ret.) (P-2-04-0247)" }
    - { label: Status, value: "OPERATIONAL (plant outage in progress)" }
    - { label: Dosimetry, value: All staff badged under DIR-0216 }
    - { label: Dossier custodian, value: FE Registry Section }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Plant outage from 28 APR entered; staffing from the April returns.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Outage plan for April entered; diesel fuel raised to outage reserve.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-08.locationText]. Desert basin and alluvial fan below a limestone range. The support facility is a walled compound of vehicle maintenance sheds, a dispatch office, a fuel point and a guard house on a paved spur from the state highway.

**Cover story (prepared statement).** :c[facilities.BETA-08.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-08" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

Convoys, radiological placarding and badged workers are ordinary under the cover, and deliveries to the installation travel as test-site support traffic.
:::

## 2. Installation

Depth :c[facilities.BETA-08.depthFt] ft, the deepest BETA site (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). Access is by a vehicle decline from the maintenance shed, the only drive-in access at a BETA site, and by the personnel lift.

| Level | Use |
|---|---|
| Surface | Maintenance sheds, dispatch office, fuel point, guard house (cover) |
| Decline | Vehicle decline to B2, two passing bays |
| B1 | Personnel lift lobby, portal security, dosimetry issue |
| B2 | Vehicle hall, plant, diesel hall |
| B3 | Operations room, analysis cell, Weapons Oversight |
| B4 | Berthing, galley, clinic |
| B5 | Power plant |
| B6 | Tram platform and stores |

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-08.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-08.staff].

::canon-table{source="facilities.BETA-08.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

| Vacancies and changes since last revision | |
|---|---|
| Security Forces | Two posts filled from the March intake |
| Reactor Operations | One operator on loan to ALPHA-05 for the outage review, returning 16 MAY 2008 |
| Weapons Oversight | :r[One analyst post vacated 03 MAR 2008; not refilled (L. Ackroyd, P-3-06-0977).]{compartment=HOLLOW auth="PV" ref="OSC-CB-012"} |

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Weapons oversight: custody verification, movement monitoring and the integrity audit for the weapons holdings in the region, with the reporting line to the Council direct. The audit schedule and the holdings list are kept by the Council Secretariat and are not entered here.
:::

:::redact{tier=2 auth="SFC" ref="OSC-DIR-0412"}
**Security Forces.** BETA-08 holds the regional armament issue point for the western BETA and GAMMA sites and the two-person rule applies to its bays as at ALPHA-05. Convoy escort for the cover's test-site traffic is provided by the cover agency, not by installation posts.
:::

## 4. Tram connections

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
BETA-08 takes one link from the adjacent hub and feeds one GAMMA shelter. Link engineering is on :x[OSC-TRN-NET-MTW].

::canon-table{source="tramNetworks.links" filter="to=BETA-08" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-08" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound link"}
:::

## 5. Power and sustainability

Class standard: :c[classes.BETA.sustainabilityText]. The site has on-site generation in addition to the diesel plant (:c[reserves.items.ENERGY-DIESEL.value] days to network standard). On-site generation is presently out of service for scheduled maintenance; the station is on diesel and surface supply.

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
On-site generation is reactor :c[reactors.RX-B08.id], :c[reactors.RX-B08.designation], :c[reactors.RX-B08.electricMWe] MWe. Status :c[reactors.RX-B08.status]: :c[reactors.RX-B08.statusNote] Plant status: :x[OSC-RSV-RX-B08].

The outage began 28 APR 2008 with the core module exchange; the spent module left by the vehicle decline under cover-agency placarding the same night. Startup testing is reported by cable to the distribution of this dossier (:x[OSC-CBL-08-01208]). During the outage diesel bus E-A carries essential loads and the surface supply carries bus E-B. Diesel bulk stock was raised to the outage reserve in January and is drawn down against the outage plan.
:::

## 6. Telemetry (last return, 30 APR 2008 2300Z (1600 PDT))

| System | Reading | State |
|---|---|---|
| Station supply | Diesel (bus E-A) and surface supply (bus E-B) | DEGRADED |
| On-site generation | Out of service, scheduled | OFFLINE |
| Diesel plant | Units 1 and 2 running, 3 standby | NOMINAL |
| Air (B3 operations room) | CO2 720 ppm, 22.1 C | NOMINAL |
| Water treatment | Potable storage 89% | NOMINAL |
| Area radiation, B5 | Within outage limits | NOMINAL |
| NBC seal | Open | NOMINAL |

## 7. Command and routine items

Commander: :c[roster.P-2-04-0247.name], :c[roster.P-2-04-0247.rank] (P-2-04-0247), m.sorensen@b08.cmd.mer.

- Dosimeters are exchanged on the first working day of each month at the B1 issue window. Staff on leave on that day exchange on return. Lost dosimeters are reported under :x[OSC-DIR-0216].
- Outage working hours: the galley serves a fourth meal at 0900Z (0200 PDT) until startup testing is complete.
- The decline is closed to installation vehicles while the cover's convoy is forming at the maintenance sheds. Check the dispatch board before driving up.
- Summer heat posture as for the cover facility from 01 JUN 2008.
