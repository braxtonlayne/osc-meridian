---
id: reserves-rx-b08
route: /reserves/reactor/rx-b08
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-B08
title: "Reactor Status: RX-B08, RCPU-16 Unit 1"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: BETA-08
xrefs: [OSC-RSV-ENERGY, OSC-CBL-08-01208]
summary: Plant status for RX-B08 at a BETA site, offline for a scheduled refuelling outage from 28 APR 2008; outage and startup test schedule, station supply arrangements.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-B08, mono: true }
  - { label: Host site, value: BETA site }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-B08-0101 rev G, 04 AUG 2007", mono: true }
  - { label: Outage, value: "Scheduled refuelling, from 28 APR 2008" }
  - { label: Schedule as at, value: "0600Z (2300 PDT 11 MAY) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Outage schedule updated; spent module removal complete.", by: "LR Reactor Operations Section" }
  - { rev: "2", date: "2008-05-05", change: "Outage schedule updated.", by: "LR Reactor Operations Section" }
  - { rev: "1", date: "2008-04-28", change: "Status changed to OFFLINE for scheduled refuelling outage.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-B08.designation] |
| Type | :c[reactors.RX-B08.type] |
| Host site | BETA site :r[:c[reactors.RX-B08.site]{auth="LR" ref="LR-07-0314"}]{compartment=SEXTANT auth="LR" ref="LR-07-0313"} |
| Rated thermal power | :c[reactors.RX-B08.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-B08.electricMWe] MWe |
| Commissioned | :c[reactors.RX-B08.commissioned] |

RX-B08 is the only RCPU-16 in the fleet and the first unit to be refuelled by module exchange.

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--OFFLINE"><span class="status-light__sq" aria-hidden="true"></span>OFFLINE</span> |
| Status note (plant status feed) | :c[reactors.RX-B08.statusNote] |
| Diesel sets | 2 running, carrying essential bus E-A |
| Surface supply | Closed, carrying essential bus E-B |
| Non-essential loads | Shed for the outage |
| Seal state and staffing | Unchanged |

The status line is taken from the plant status feed when the record is displayed. The outage schedule below is as at the record date. Progress reports from the plant superintendent are sent by cable to Logistics & Reserves, ALPHA-05; see :x[OSC-CBL-08-01208].

## Outage schedule

| Step | Planned | Actual | Status |
|---|---|---|---|
| Reactor shut down, cooldown begun | 28 APR 2008 | 28 APR 2008, 1500Z (0800 PDT) | Complete |
| Cooldown and decay hold | 28 APR to 06 MAY 2008 | 06 MAY 2008 | Complete |
| Module bay opened; health physics survey | 07 MAY 2008 | 07 MAY 2008 | Complete |
| Spent core module disconnected and lifted to cask | 08 to 11 MAY 2008 | 11 MAY 2008, 2210Z (1510 PDT) | Complete |
| New core module set and connected | 12 to 14 MAY 2008 | | In progress |
| Module seal leak-rate test | 14 MAY 2008 | | |
| Low power physics tests | 15 MAY 2008 | | |
| Power ascension in stages, with surveillance holds | 16 to 22 MAY 2008 | | |
| Return to rated power; status to NOMINAL | Not before 22 MAY 2008 | | |

## Startup tests

| Test | Procedure | Hold point |
|---|---|---|
| Module seal leak-rate test | RX-SP-330 | Before criticality |
| Protection channel functional test, all channels | RX-SP-121 | Before criticality |
| Approach to criticality and low power physics tests | RX-SU-01 | At zero power |
| Turbine overspeed trip test | RX-SP-224 | Before synchronisation |
| Power ascension holds at 25%, 50% and 75% rated thermal power | RX-SU-02 | Plant superintendent's release at each hold |
| Diesel sets returned to standby; surface supply breaker opened | RX-OP-14 | At station load |

## One-line diagram

Station single-line diagram FE-E-B08-0101, revision G, dated 04 AUG 2007. During the outage the drawing in the Reserves application shows the unit breaker open, essential bus E-A on diesel and bus E-B on the surface supply. The issued paper copy in the power plant room governs switching.

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| LR-08-0098 | Refuelling outage, RX-B08, core module exchange | 01 APR 2008 | Open |
| FE-08-0344 | Module bay crane, pre-lift inspection and load test | 01 APR 2008 | Complete 25 APR 2008 |
| FE-08-0380 | Diesel set 2 fuel filter change during outage running | 30 APR 2008 | Complete 05 MAY 2008 |
| LR-08-0136 | Spent module cask, shipping papers and escort request | 08 MAY 2008 | Open, awaiting shipment instructions |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="LR-07-0314"}
| Item | Entry |
|---|---|
| Spent module | Removed 11 MAY 2008; to be held in the module bay cask pending shipment instructions |
| New module | Delivered under escort 24 APR 2008; burn-up planning figure 1,460 effective full power days |
| Burn-down at present station load | Not stated during outage; site burn-down tables to be reissued on return to rated power |
| Diesel on hand | Below the full requirement; replenishment by surface tanker requested for the week of 19 MAY 2008 |
| Next refuelling | Second quarter FY2012, module exchange |
:::

Compiled from the unit log and the plant superintendent's reports by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
