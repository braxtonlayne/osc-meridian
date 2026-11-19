---
id: reserves-rx-a03
route: /reserves/reactor/rx-a03
app: reserves
family: reserves
template: record
docNo: OSC-RSV-RX-A03
title: "Reactor Status: RX-A03, HCPU-36 Unit 1"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 3
date: 2008-05-12
facility: ALPHA-03
xrefs: [OSC-RSV-ENERGY, KB-0031, OSC-RSV-SEED]
summary: Plant status for RX-A03 at ALPHA-03, degraded with main feedwater pump B out of service under work order FE-08-0417; limiting conditions, load list, surveillance schedule.
recordType: REACTOR STATUS
fields:
  - { label: Unit, value: RX-A03, mono: true }
  - { label: Host site, value: ALPHA-03 }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: One-line drawing, value: "FE-E-A03-0101 rev G, 24 MAR 2008", mono: true }
  - { label: Status as at, value: "0600Z (0200 EDT) 12 MAY 2008" }
revisions:
  - { rev: "3", date: "2008-05-12", change: "Weekly status. Work order FE-08-0417 still awaiting material.", by: "LR Reactor Operations Section" }
  - { rev: "2", date: "2008-05-05", change: "Weekly status.", by: "LR Reactor Operations Section" }
  - { rev: "1", date: "2008-03-24", change: "Status changed to DEGRADED; limiting condition entered.", by: "LR Reactor Operations Section" }
---

## Unit

| Item | Entry |
|---|---|
| Designation | :c[reactors.RX-A03.designation] |
| Type | :c[reactors.RX-A03.type] |
| Host site | :c[reactors.RX-A03.site] |
| Rated thermal power | :c[reactors.RX-A03.thermalMWt] MWt |
| Rated electrical output | :c[reactors.RX-A03.electricMWe] MWe |
| Commissioned | :c[reactors.RX-A03.commissioned] |

## Status

| Item | Entry |
|---|---|
| Status | <span class="status-light status-light--DEGRADED"><span class="status-light__sq" aria-hidden="true"></span>DEGRADED</span> |
| Status note | :c[reactors.RX-A03.statusNote] |
| Work order | FE-08-0417 (lookup: wo FE-08-0417) |
| Out of service since | 19 MAR 2008, 1420Z (1020 EDT) |
| Limiting condition | Thermal power limit as in the status note, in force until pump B is returned to service and tested |
| Diesel sets | 3 available, standby |
| Surface supply | Available, breaker open |

Main feedwater pump B was removed from service on 19 MAR 2008 after the outboard mechanical seal leakage exceeded its limit on the watch round. Pump A carries full feedwater flow for the limited power. The pump is isolated, drained and tagged; the motor breaker is racked out. Replacement of the seal kit is carried out under FE-08-0417. Work order status, location and distribution are held by Facilities Engineering and can be looked up from the workstation (see :x[KB-0031]).

## Compensatory measures

1. Pump A discharge pressure, bearing temperatures and seal leakage are read and logged every two hours instead of every watch.
2. Emergency feedwater is lined up for automatic start and tested weekly instead of quarterly until pump B is returned (RX-SP-206, abbreviated).
3. No planned maintenance is to be carried out on pump A, its motor or its breaker while pump B is out of service.
4. Station loads above the essential buses are not to be added without the agreement of the power plant control room.

## Essential bus load list

Loads on the essential buses are listed in shedding order. The list is posted in the power plant control room and at the ALPHA-03 operations desk.

| Order | Load | Bus |
|---|---|---|
| 1 | Level 1 vehicle lift, standby heating | E-B |
| 2 | Level 3 dining hall kitchen, hot service | E-B |
| 3 | Level 6 and 7 stacks humidity control | E-B |
| 4 | Level 8 cold room 2 (seed collection) | E-B |
| 5 | Level 9 nitrogen plant | E-A |
| 6 | Level 9 freezer hall and dewar room monitoring | E-A |
| 7 | Air handling units AHU-1 to AHU-6 | E-A |
| 8 | Water treatment train | E-A |
| 9 | Operations desk, communications equipment, lighting | E-A |

Loads are never shed while the unit carries the station within its limit. The list applies on loss of the unit with the diesel plant carrying the buses. See :x[OSC-RSV-SEED] for the cold room plant note.

## One-line diagram

Station single-line diagram FE-E-A03-0101, revision G, dated 24 MAR 2008. Revision G shows the feedwater pump B motor breaker racked out and tagged and the essential bus load list in its current order. The issued paper copy in the ALPHA-03 power plant control room governs switching.

## Surveillance schedule

| Test | Procedure | Frequency | Last performed | Next due |
|---|---|---|---|---|
| Protection channel functional test | RX-SP-101 | Quarterly | 15 APR 2008 | JUL 2008 |
| Protection channel check | RX-SP-102 | Monthly | 15 APR 2008 | 15 MAY 2008 |
| Emergency feedwater auto-start test (abbreviated) | RX-SP-206A | Weekly while FE-08-0417 open | 09 MAY 2008, 1400Z (1000 EDT) | 16 MAY 2008 |
| Turbine overspeed trip test | RX-SP-204 | Quarterly | 04 MAR 2008 | Deferred until pump B returned |
| Containment and seal leak-rate test | RX-SP-310 | Annual | 11 SEP 2007 | SEP 2008 |
| Dosimetry badge exchange, reactor spaces | MS-HP-04 | Monthly | 01 MAY 2008 | 02 JUN 2008 |

## Work orders

| Work order | Description | Opened | Status |
|---|---|---|---|
| FE-08-0417 | Main feedwater pump B: replace outboard mechanical seal kit; post-maintenance run and leakage test | 19 MAR 2008 | Open, awaiting material |
| FE-08-0402 | Main feedwater pump B: isolate, drain, tag out | 19 MAR 2008 | Complete 19 MAR 2008 |
| FE-08-0426 | One-line drawing revision G, pump B and load list | 20 MAR 2008 | Complete 24 MAR 2008 |
| LR-08-0139 | Reactor spaces telephone, handset at hatch 2 inoperative | 08 MAY 2008 | Open |

## Fuel and burn-down

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
| Item | Entry |
|---|---|
| Core | Initial core, loaded MAY 2004 |
| Core life remaining | 880 effective full power days at 12 MAY 2008 |
| Burn-down at present station load | Approximately 3 years 6 months of continuous operation |
| Next refuelling | AUG 2010, in place, 45-day outage |
| FE-08-0417 material | Seal kit received at ALPHA-05 stores 02 APR 2008; held for movement order LR-08-0144 (June tram) |

At the thermal power limit the unit carries station load for the posted strength of ALPHA-03 with margin. It does not carry station load at the site's allocation of designated persons under seal. In that case the essential bus loads would be shed in the order of the load list above, beginning with order 1, until the diesel plant was brought on to carry bus E-B.
:::

Compiled from the unit log by the Reactor Operations Section, Logistics & Reserves, ALPHA-05. Fleet summary: :x[OSC-RSV-ENERGY].
