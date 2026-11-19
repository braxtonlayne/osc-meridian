---
id: reserves-rx-a05
route: /reserves/reactor/rx-a05
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-A05
title: "Reactor Status: RX-A05, HCPU-45 Unit 2"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: ALPHA-05
xrefs: [OSC-RSV-ENERGY, OSC-RSV-RX-A02]
summary: Plant status for RX-A05 at ALPHA-05, the fleet training unit, with surveillance schedule, operator requalification and work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-A05, mono: true }
  - { label: Host site, value: ALPHA-05 }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Senior reactor operator, value: "V. Haldane" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-A05-0101 rev C, 01 APR 2008", mono: true }
  - { label: Status as at, value: "0600Z (0100 CDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status; requalification schedule updated.", by: "V. Haldane" }
  - { rev: "2", date: "2008-05-05", change: "Weekly status.", by: "V. Haldane" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-A05.designation] |
| Type | :c[reactors.RX-A05.type] |
| Host site | :c[reactors.RX-A05.site] |
| Rated thermal power | :c[reactors.RX-A05.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-A05.electricMWe] MWe |
| Commissioned | :c[reactors.RX-A05.commissioned] |

RX-A05 is the second HCPU-45 (the first is :x[OSC-RSV-RX-A02]) and the training unit for the fleet. The Reactor Operations Section is at the host site, and candidate operators for every unit stand their qualifying watches here before posting.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-A05.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 3 available, standby. Set 1 loaded run 06 MAY 2008, satisfactory. |

Generator testing at the surface coordination complex is routine and is not connected to the unit.

## One-line diagram

Station single-line diagram FE-E-A05-0101, revision C, dated 01 APR 2008. Revision C adds the Reserves Stacks refrigeration feeder transferred from bus A to bus B. The issued paper copy in the power plant control room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Protection channel functional test | RX-SP-101 | Quarterly | 08 APR 2008 | JUL 2008 |
| Protection channel check | RX-SP-102 | Monthly | 08 MAY 2008 | 09 JUN 2008 |
| Turbine overspeed trip test | RX-SP-204 | Quarterly | 25 MAR 2008 | JUN 2008 |
| Emergency feedwater flow test | RX-SP-206 | Quarterly | 25 MAR 2008 | JUN 2008 |
| Containment and seal leak-rate test | RX-SP-310 | Annual | 14 AUG 2007 | AUG 2008 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 05 MAY 2008 | 02 JUN 2008 |

## Operator qualification

| Item | Entry |
|---|---|
| Qualified reactor operators, fleet | Establishment met at all ALPHA units; one vacancy at a BETA unit |
| Candidates under instruction at RX-A05 | 4 |
| Next requalification examination | 27 MAY 2008, 1400Z (0900 CDT), Level 6 classroom 6-12 |
| Simulator | Control room part-task trainer, Level 6; booked through the section clerk |

Operators whose requalification falls due in June are to sit the 27 MAY examination. An operator who misses requalification is removed from the watch bill until the examination is passed and is not to stand a watch as second operator in the interval.

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| LR-08-0118 | Part-task trainer, replace failed annunciator lamp cards (3) | 21 APR 2008 | Complete 02 MAY 2008 |
| FE-08-0409 | Chiller plant tie to reactor spaces cooling, valve 4 packing leak | 02 MAY 2008 | Open |
| FE-08-0352 | Drawing revision C, refrigeration feeder transfer | 18 MAR 2008 | Complete 01 APR 2008 |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Core | Initial core, loaded MAR 2005 |
| Core life remaining | 1,210 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 5 years 2 months of continuous operation |
| Next refuelling | After FY2010, in place |

Fleet burn-down planning figures are compiled at this site from the unit pages and reported to the Director, Logistics & Reserves, on the first working day of each quarter.
:::

Compiled from the unit log by V. Haldane, Senior Reactor Operator, for the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
