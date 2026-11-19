---
id: reserves-rx-b09
route: /reserves/reactor/rx-b09
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-B09
title: "Reactor Status: RX-B09, RCPU-20 Unit 2"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: BETA-09
xrefs: [OSC-RSV-ENERGY, OSC-RSV-RX-B03]
summary: Plant status for RX-B09 at a BETA site, steady state, with surveillance schedule and work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-B09, mono: true }
  - { label: Host site, value: BETA site }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-B09-0101 rev F, 19 AUG 2007", mono: true }
  - { label: Status as at, value: "0600Z (0100 CDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-B09.designation] |
| Type | :c[reactors.RX-B09.type] |
| Host site | BETA site :r[:c[reactors.RX-B09.site]]{compartment=SEXTANT auth="LR" ref="LR-07-0313"} |
| Rated thermal power | :c[reactors.RX-B09.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-B09.electricMWe] MWe |
| Commissioned | :c[reactors.RX-B09.commissioned] |

Second RCPU-20 unit, identical to :x[OSC-RSV-RX-B03] except for the turbine-generator, which is of a later build.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-B09.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 2 available, standby |

Communications equipment rooms at the host site are carried on essential bus E-A with battery ride-through. No other unusual loads.

## One-line diagram

Station single-line diagram FE-E-B09-0101, revision F, dated 19 AUG 2007. The issued paper copy in the power plant room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Protection channel functional test | RX-SP-121 | Quarterly | 01 APR 2008 | JUL 2008 |
| Protection channel check | RX-SP-122 | Monthly | 01 MAY 2008 | 02 JUN 2008 |
| Turbine overspeed trip test | RX-SP-224 | Quarterly | 26 FEB 2008 | 26 MAY 2008 (see FE-08-0397) |
| Module seal leak-rate test | RX-SP-330 | Annual | 17 SEP 2007 | SEP 2008 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 01 MAY 2008 | 02 JUN 2008 |

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0397 | Turbine overspeed test, schedule against communications load window | 29 APR 2008 | Open, date to be agreed with host site |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Core module | Initial module, installed AUG 2006 |
| Core life remaining | 160 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 7 months of continuous operation |
| Next refuelling | OCT 2008, module exchange, using the spare module held at ALPHA-02 |
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
