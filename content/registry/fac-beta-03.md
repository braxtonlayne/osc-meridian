---
id: fac-beta-03
route: /registry/facility/beta-03
app: registry
family: registry
template: dossier
docNo: OSC-FAC-BETA-03
title: "Facility Dossier: BETA-03 (CDC Secondary Research Complex)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 6
date: 2008-04-30
facility: BETA-03
summary: Regional Operations Center under the cover "CDC Secondary Research Complex"; function "Southeast regional ops / biomedical".
xrefs: [OSC-FAC-CLS-BETA, OSC-TRN-NET-SOU, OSC-RSV-RX-B03]
distribution:
  - FE Registry Section, ALPHA-02
  - Facility Commander, BETA-03
  - Medical Services, ALPHA-05
  - Logistics & Reserves (Reactor Operations), ALPHA-05
  - Cover Operations, ALPHA-04
  - Records Division, ALPHA-03 (file copy)
dossier:
  facility: BETA-03
  dossierType: FACILITY DOSSIER (BETA CLASS)
  identity:
    - { label: Designation, value: BETA-03, mono: true }
    - { label: Class, value: "BETA: Regional Operations Center" }
    - { label: Cover identity, value: CDC Secondary Research Complex }
    - { label: Function, value: Southeast regional ops / biomedical }
    - { label: Commander, value: "M. Ebner, PhD (P-2-04-0225)" }
    - { label: Scientific direction, value: Facility Commander (dual appointment) }
    - { label: Containment, value: "Suites 1-3 working; suite 4 in fit-out" }
    - { label: Status, value: OPERATIONAL }
revisions:
  - { rev: 6, date: 30 APR 2008, change: "Quarterly revision. Containment suite 4 works entered; May drill entered.", by: FE Registry }
  - { rev: 5, date: 31 JAN 2008, change: "Laboratory Containment Technicians line raised from 10 to 14 posts.", by: FE Registry }
  - { rev: 4, date: 31 OCT 2007, change: "Essential bus reconfiguration (containment load) entered.", by: FE Registry }
---

## 1. Location and cover

:::redact{compartment=SEXTANT auth="CVO" ref="OSC-ASR-COV"}
**Location.** :c[facilities.BETA-03.locationText]. Piedmont pine and pasture south of the metropolitan area, inside a fenced federal parcel shared with a genuine records storage annex of the cover agency.

**Cover story (prepared statement).** :c[facilities.BETA-03.coverStory]

::canon-table{source="coverCatalogue" filter="facility=BETA-03" cols="coverAgency:Cover agency,coverFacilityType:Registered as,visibleSurfaceStaff:Visible surface staff,lastCoverReview:Last cover review" caption="Cover record (from the cover identity catalogue)"}

The surface complex is the most heavily staffed BETA cover. Its laboratories hold genuine contingency specimen stocks for the cover agency, and its biosafety posture is the publicly stated reason for the perimeter, the guard force and the standby plant.
:::

## 2. Installation

Depth :c[facilities.BETA-03.depthFt] ft (class band :c[classes.BETA.depthText]; :x[OSC-FAC-CLS-BETA]). BETA-03 differs from the class standard in two respects: it holds containment laboratories below grade, and it has on-site generation.

| Level | Use |
|---|---|
| Surface | Laboratory building, specimen receipt, records annex (cover) |
| B1 | Lift lobby, portal security, personnel decontamination |
| B2 | Plant: air handling (containment and general systems kept separate), water, switchgear |
| B3 | Operations room, regional analysis cell, communications |
| B4 | Containment suites 1-3 (working), suite 4 (fit-out), autoclave hall, specimen freezers |
| B5 | Berthing A-C, galley, clinic, isolation ward (6 beds) |
| B6 | Power plant; tram platform and stores |

Containment exhaust from B4 discharges through the surface laboratory building's stack, which is registered with the state as the laboratory stack.

## 3. Berthing and staffing

Surge berthing: :c[facilities.BETA-03.capacity]. Posted strength at the 30 APR 2008 pay run: :c[facilities.BETA-03.staff].

::canon-table{source="facilities.BETA-03.staffBreakdown" cols="role:Staffing line,count:Posted" caption="Posted strength by line, 30 APR 2008 return"}

Biomedical Research and Laboratory Containment Technicians are particular to BETA-03 and report through the commander as scientific director. Reactor Operations staff are posted to the site and report to Logistics & Reserves at ALPHA-05 for plant matters.

**Programme growth.** The Phase 4 objective "Expand BETA-03 biomedical research capacity" stands against this site. Containment suite 4 (fit-out from January 2008) is the first work under it. The objective carries no staffing figure; posts will be requested against completed suites.

:::redact{tier=2 auth="MS" ref="OSC-DIR-0412"}
**Specimen holdings.** Working stocks in suites 1-3 are drawn from, and returned to, the biological sample collection at ALPHA-03 by tram under Medical Services escort. Suite 4 is specified for work on material not held at the surface complex. Admission to the isolation ward on activation is by the relocation list only; the surface complex's own laboratory staff are not on the list and the surface laboratory is not equipped to shelter them.
:::

## 4. Tram connection

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
BETA-03 takes one link from the adjacent hub and feeds two GAMMA shelters. Link engineering is on :x[OSC-TRN-NET-SOU].

::canon-table{source="tramNetworks.links" filter="to=BETA-03" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Inbound link"}

::canon-table{source="tramNetworks.links" filter="from=BETA-03" cols="from:From,to:To,label:Link,miles:Miles,hours:Running time (h)" caption="Outbound links"}

Specimen consignments ride in the leading vehicle of a booked consist with a Medical Services escort. They are not carried on freight paths.
:::

## 5. Power and sustainability

Class standard: :c[classes.BETA.sustainabilityText]. Unlike the class standard, the site carries on-site generation, sized for the containment load over the full sustainment window. Diesel plant to network standard (:c[reserves.items.ENERGY-DIESEL.value] days) is kept as backup.

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
On-site generation is reactor :c[reactors.RX-B03.id], :c[reactors.RX-B03.designation] (:c[reactors.RX-B03.type]), :c[reactors.RX-B03.electricMWe] MWe. Status :c[reactors.RX-B03.status]: :c[reactors.RX-B03.statusNote] Plant status, fuel and refuelling: :x[OSC-RSV-RX-B03].

Containment suite 4 will add an estimated 0.6 MW at full operation. Logistics & Reserves has confirmed the unit can carry it within rating.
:::

## 6. Telemetry (last return, 30 APR 2008 2300Z (1900 EDT))

| System | Reading | State |
|---|---|---|
| Station supply | On-site generation, utility tie closed | NOMINAL |
| Essential bus (containment) | Carried on on-site generation | NOMINAL |
| Diesel plant | Standby | NOMINAL |
| Air (B4 containment) | Suites 1-3 at -0.05 in. w.g. to corridor | NOMINAL |
| Air (B3 operations room) | CO2 650 ppm, 21.4 C | NOMINAL |
| Water treatment | Potable storage 90% | NOMINAL |
| Effluent decontamination | Kill tank B cycle complete 2140Z | NOMINAL |
| NBC seal | Open | NOMINAL |

## 7. Command and routine items

Commander and scientific director: :c[roster.P-2-04-0225.name], :c[roster.P-2-04-0225.rank] (P-2-04-0225), m.ebner@b03.cmd.mer.

- **Fire drill.** :c[calendar.CAL-0805-09.title], :c[calendar.CAL-0805-09.dateText], :c[calendar.CAL-0805-09.timeText]. :c[calendar.CAL-0805-09.note] Containment suites are made safe and vacated before the alarm, not during it; suite supervisors begin at 1415Z.
- Respirator fit testing for all B4 staff is due before 31 MAY 2008.
- Autoclave 2 failed its spore test on 17 APR 2008 and is tagged out. Autoclave 1 carries the load; the waste schedule is extended by one shift.
- The galley is closed for deep cleaning 20 to 22 MAY 2008. Boxed meals are issued from B5 stores.

:::redact{tier=1 auth="CS" ref="OSC-CNL-CHR-IV"}
Southeast regional ops / biomedical: the programme of record for suite 4, its tasking authority and the material lists, held by the Council Secretariat. Not entered in this register.
:::
