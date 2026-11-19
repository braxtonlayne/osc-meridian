---
id: reserves-rx-b03
route: /reserves/reactor/rx-b03
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-B03
title: "Reactor Status: RX-B03, RCPU-20 Unit 1"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: BETA-03
xrefs: [OSC-RSV-ENERGY, OSC-RSV-RX-B09]
summary: Plant status for RX-B03 at a BETA site, with laboratory containment load on the essential bus, surveillance schedule and work orders.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-B03, mono: true }
  - { label: Host site, value: BETA site }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-B03-0101 rev H, 27 FEB 2008", mono: true }
  - { label: Status as at, value: "0600Z (0200 EDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-B03.designation] |
| Type | :c[reactors.RX-B03.type] |
| Host site | BETA site :r[:c[reactors.RX-B03.site]{auth="LR" ref="LR-07-0314"}]{compartment=SEXTANT auth="LR" ref="LR-07-0313"} |
| Rated thermal power | :c[reactors.RX-B03.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-B03.electricMWe] MWe |
| Commissioned | :c[reactors.RX-B03.commissioned] |

RX-B03 is the first of two RCPU-20 units; the second is :x[OSC-RSV-RX-B09]. The core is a transportable module, exchanged whole at refuelling.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> |
| Status note | :c[reactors.RX-B03.statusNote] |
| Limiting conditions in effect | None |
| Diesel sets | 2 available, standby |

The host site's laboratory containment plant (exhaust fans, filter housings and the pressure cascade controls) is fed from essential bus E-A and is not shed on any load list. A loss of the unit transfers it to diesel without interruption through the automatic transfer switch. The containment plant is tested on transfer quarterly, jointly with the site's laboratory staff.

## One-line diagram

Station single-line diagram FE-E-B03-0101, revision H, dated 27 FEB 2008. Revision H records the second containment exhaust fan feeder added for the laboratory extension. The issued paper copy in the power plant room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Protection channel functional test | RX-SP-121 | Quarterly | 11 MAR 2008 | JUN 2008 |
| Protection channel check | RX-SP-122 | Monthly | 06 MAY 2008 | 05 JUN 2008 |
| Containment plant transfer test | RX-SP-140 | Quarterly | 11 MAR 2008, 1300Z (0900 EDT) | JUN 2008 |
| Turbine overspeed trip test | RX-SP-224 | Quarterly | 15 APR 2008 | JUL 2008 |
| Module seal leak-rate test | RX-SP-330 | Annual | 20 FEB 2008 | FEB 2009 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 01 MAY 2008 | 02 JUN 2008 |

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0368 | Containment exhaust fan 2 feeder, thermographic survey after first month in service | 24 APR 2008 | Complete 29 APR 2008, no hot spots |
| LR-08-0124 | Power plant room eyewash station, replace expired solution | 30 APR 2008 | Complete 01 MAY 2008 |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Core module | Initial module, installed JAN 2007 |
| Core life remaining | 330 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 1 year 2 months of continuous operation |
| Next refuelling | APR 2009, module exchange |

The planned growth of the host site's laboratory load will shorten this burn-down. Facilities Engineering has been asked for a revised station load estimate before the FY2009 module schedule is fixed.
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
