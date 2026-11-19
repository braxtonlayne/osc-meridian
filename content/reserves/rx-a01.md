---
id: reserves-rx-a01
route: /reserves/reactor/rx-a01
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-A01
title: "Reactor Status: RX-A01, HCPU-60 Unit 1"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: ALPHA-01
xrefs: [OSC-RSV-ENERGY]
summary: Plant status for RX-A01 at ALPHA-01, with the station one-line drawing, surveillance schedule and open work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-A01, mono: true }
  - { label: Host site, value: ALPHA-01 }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-A01-0101 rev E, 18 SEP 2007", mono: true }
  - { label: Status as at, value: "0600Z (0200 EDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status; quarterly protection channel test result entered.", by: "LR Reactor Operations Section" }
  - { rev: "2", date: "2008-05-05", change: "Weekly status.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-A01.designation] |
| Type | :c[reactors.RX-A01.type] |
| Host site | :c[reactors.RX-A01.site] |
| Rated thermal power | :c[reactors.RX-A01.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-A01.electricMWe] MWe |
| Commissioned | :c[reactors.RX-A01.commissioned] |

RX-A01 is the first unit of the fleet and the only HCPU mounted on a shock-isolated skid. The skid isolators are inspected annually under the structures programme, not the reactor surveillance schedule.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-A01.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 3 available, standby |
| Surface supply | Available, breaker open |

## One-line diagram

Station single-line diagram FE-E-A01-0101, revision E, dated 18 SEP 2007, issued by Facilities Engineering. The Reserves application displays the drawing with breaker positions taken from the station telemetry. The drawing in the application is for information; switching is carried out only from the issued paper copy held in the ALPHA-01 power plant control room.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Result | Next due |
|---|---|---|---|---|---|
| Protection channel functional test | RX-SP-101 | Quarterly | 07 MAY 2008, 1100Z (0700 EDT) to 1500Z (1100 EDT) | Satisfactory | AUG 2008 |
| Protection channel check | RX-SP-102 | Monthly | 14 APR 2008 | Satisfactory | 14 MAY 2008 |
| Turbine overspeed trip test | RX-SP-204 | Quarterly | 18 MAR 2008 | Satisfactory | JUN 2008 |
| Emergency feedwater flow test | RX-SP-206 | Quarterly | 26 FEB 2008 | Satisfactory | MAY 2008 |
| Containment and seal leak-rate test | RX-SP-310 | Annual | 09 OCT 2007 | Within limit | OCT 2008 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 01 MAY 2008 | 0 badges outstanding | 02 JUN 2008 |

The quarterly protection channel test of 07 MAY 2008 was performed to written procedure with reactor spaces restricted to test personnel. Channel C bistable trip setpoint was found at the edge of its tolerance band, recalibrated and retested satisfactorily; entered in the unit log.

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0362 | Condensate polisher resin change, bed 2 | 22 APR 2008 | Complete 29 APR 2008 |
| FE-08-0411 | Skid isolator annual inspection, isolators 1 to 12 | 02 MAY 2008 | Scheduled JUN 2008 |
| LR-08-0127 | Reactor spaces lighting, replace lamps at hatch 3 | 06 MAY 2008 | Open |
| FE-07-0918 | Pressurizer heater group 2 current imbalance | 19 NOV 2007 | Closed 14 DEC 2007, no fault found |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Core | Initial core, loaded AUG 2003 |
| Core life remaining | 610 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 2 years 4 months of continuous operation |
| Next refuelling | MAR 2010, in place, 45-day outage |
| Fuel for next refuelling | Fabrication complete; held off site pending movement order |

Burn-down assumes station load as at the status time with the diesel plant on standby. Under seal, with the station at surge berthing, the burn-down shortens in proportion to load.
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
