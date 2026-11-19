---
id: reserves-rx-a04
route: /reserves/reactor/rx-a04
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-A04
title: "Reactor Status: RX-A04, HCPU-36 Unit 2"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: ALPHA-04
xrefs: [OSC-RSV-ENERGY, OSC-RSV-RX-A03]
summary: Plant status for RX-A04 at ALPHA-04, with the air-cooled condenser fan 3 vibration watch, monthly surveillance test of 20 MAY 2008 and work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-A04, mono: true }
  - { label: Host site, value: ALPHA-04 }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-A04-0101 rev H, 03 SEP 2007", mono: true }
  - { label: Status as at, value: "0600Z (2300 PDT 11 MAY) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status; fan 3 readings to 11 MAY.", by: "LR Reactor Operations Section" }
  - { rev: "2", date: "2008-05-05", change: "Weekly status.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-A04.designation] |
| Type | :c[reactors.RX-A04.type] |
| Host site | :c[reactors.RX-A04.site] |
| Rated thermal power | :c[reactors.RX-A04.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-A04.electricMWe] MWe |
| Commissioned | :c[reactors.RX-A04.commissioned] |

RX-A04 is the second unit of the HCPU-36 design; the first is :x[OSC-RSV-RX-A03]. It is the only unit in the fleet that rejects heat through an air-cooled condenser, the host site having no reliable cooling water at depth. The condenser is in a ventilated gallery with intake and exhaust shafts to the surface.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-A04.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 3 available, standby |

## Condenser fan 3 watch

Fan 3 of the air-cooled condenser was placed on the watch list on 22 APR 2008 after the watch round reported intermittent bearing noise at the non-drive end. Vibration is read daily. The bearing is to be replaced at the next planned fan outage, or earlier if velocity exceeds the alert level of 7.1 mm/s.

| Date | Velocity, NDE bearing (mm/s) | Bearing temperature (C) | Remarks |
|---|---|---|---|
| 22 APR 2008 | 4.2 | 51 | Noise reported |
| 29 APR 2008 | 4.4 | 52 | |
| 05 MAY 2008 | 4.9 | 52 | Grease added, 2 strokes |
| 08 MAY 2008 | 4.6 | 51 | |
| 11 MAY 2008 | 4.8 | 53 | Afternoon surface temperature 31 C |

With fan 3 stopped the remaining fans carry full condenser duty up to a surface air temperature of 38 C. Above that the unit would be reduced in power. Summer evaporative pre-cooling of the condenser intake is to be in service from 01 JUN 2008.

## One-line diagram

Station single-line diagram FE-E-A04-0101, revision H, dated 03 SEP 2007. The condenser fan motors are fed from switchgear bus B. The issued paper copy in the power plant control room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Reactor surveillance test, monthly | RX-SP-102 | Monthly | 22 APR 2008 | 20 MAY 2008, 1600Z (0900 PDT) to 1900Z (1200 PDT) |
| Protection channel functional test | RX-SP-101 | Quarterly | 19 FEB 2008 | Combined with monthly test, 20 MAY 2008 |
| Turbine overspeed trip test | RX-SP-204 | Quarterly | 01 APR 2008 | JUL 2008 |
| Emergency feedwater flow test | RX-SP-206 | Quarterly | 01 APR 2008 | JUL 2008 |
| Containment and seal leak-rate test | RX-SP-310 | Annual | 05 DEC 2007 | DEC 2008 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 02 MAY 2008 | 02 JUN 2008 |

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0391 | Air-cooled condenser fan 3, NDE bearing: daily vibration readings; replace at next fan outage | 22 APR 2008 | Open, monitoring |
| FE-08-0392 | Condenser intake shaft, clear windblown sand from screens | 24 APR 2008 | Complete 25 APR 2008 |
| FE-08-0415 | Evaporative pre-cooling, pre-season inspection and pad replacement | 05 MAY 2008 | Scheduled 27 MAY 2008 |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
| Item | Entry |
|---|---|
| Core | Initial core, loaded SEP 2005 |
| Core life remaining | 1,290 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 5 years 9 months of continuous operation |
| Next refuelling | After FY2010, in place |
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
