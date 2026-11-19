---
id: reserves-rx-a02
route: /reserves/reactor/rx-a02
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-A02
title: "Reactor Status: RX-A02, HCPU-45 Unit 1"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: ALPHA-02
xrefs: [OSC-RSV-ENERGY]
summary: Plant status for RX-A02 at ALPHA-02, including the quarterly turbine overspeed test of 09 MAY 2008, surveillance schedule and work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-A02, mono: true }
  - { label: Host site, value: ALPHA-02 }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-A02-0101 rev F, 22 NOV 2007", mono: true }
  - { label: Status as at, value: "0600Z (0000 MDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status; overspeed test result entered.", by: "LR Reactor Operations Section" }
  - { rev: "2", date: "2008-05-05", change: "Weekly status.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-A02.designation] |
| Type | :c[reactors.RX-A02.type] |
| Host site | :c[reactors.RX-A02.site] |
| Rated thermal power | :c[reactors.RX-A02.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-A02.electricMWe] MWe |
| Commissioned | :c[reactors.RX-A02.commissioned] |

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-A02.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 3 available, standby |

Facilities Engineering shops and the tunnel maintenance depot share the host site. Heavy shop loads (the rolling stock wheel lathe and the depot compressors) are scheduled through the power plant control room and are not started without its agreement.

## Turbine overspeed trip test, 09 MAY 2008

Performed to RX-SP-204 between 1500Z (0900 MDT) and 1740Z (1140 MDT) with the turbine-generator separated from the switchgear and the station carried on the surface supply and diesel set 2.

| Trip | Required band | As found | Action |
|---|---|---|---|
| Mechanical overspeed trip, run 1 | 109 to 111% rated speed | 110.4% | None |
| Mechanical overspeed trip, run 2 | 109 to 111% rated speed | 110.2% | None |
| Electrical overspeed trip | 107 to 109% rated speed | 108.1% | None |

Unit resynchronised at 1752Z (1152 MDT). Test witnessed by the Facilities Engineering duty engineer.

## One-line diagram

Station single-line diagram FE-E-A02-0101, revision F, dated 22 NOV 2007. Revision F records the separate feeder to the depot compressors. The issued paper copy in the power plant control room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Protection channel functional test | RX-SP-101 | Quarterly | 12 FEB 2008 | Overdue from 12 MAY 2008; rescheduled 16 MAY 2008 |
| Protection channel check | RX-SP-102 | Monthly | 21 APR 2008 | 21 MAY 2008 |
| Turbine overspeed trip test | RX-SP-204 | Quarterly | 09 MAY 2008 | AUG 2008 |
| Emergency feedwater flow test | RX-SP-206 | Quarterly | 03 MAR 2008 | JUN 2008 |
| Containment and seal leak-rate test | RX-SP-310 | Annual | 22 JAN 2008 | JAN 2009 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 09 MAY 2008, 1400Z (0800 MDT) to 2200Z (1600 MDT) | JUN 2008 |

The quarterly protection channel test was deferred four days so as not to coincide with the overspeed test. Deferral approved by the Chief Engineer, Facilities Engineering, 06 MAY 2008.

Two May dosimetry badges were not returned at the exchange. Both have since been returned; the late returns were reported to the division head as required.

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0379 | Air intake pre-filters, reactor spaces ventilation, change for dust load | 28 APR 2008 | Complete 30 APR 2008 |
| FE-08-0406 | Turbine oil sample, quarterly | 01 MAY 2008 | Sample sent; result awaited |
| LR-08-0131 | Control room chair replacement (2) | 07 MAY 2008 | Open |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Core | Initial core, loaded NOV 2004 |
| Core life remaining | 1,140 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 5 years of continuous operation |
| Next refuelling | After FY2010, in place |
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
