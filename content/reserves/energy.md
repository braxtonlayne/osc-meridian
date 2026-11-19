---
id: reserves-energy
route: /reserves/energy
app: reserves
family: reserves
template: record
docNo: OSC-RSV-ENERGY
title: "Energy Reserves: Reactor Plant, Diesel Backup and Surface Renewables"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 7
date: 2008-05-05
xrefs: [OSC-RSV-RX-A01, OSC-RSV-RX-A02, OSC-RSV-RX-A03, OSC-RSV-RX-A04, OSC-RSV-RX-A05, OSC-RSV-RX-B03, OSC-RSV-RX-B08, OSC-RSV-RX-B09, OSC-RSV-IDX]
summary: Reactor fleet status for the eight installations, diesel generator backup runtime, and solar and geothermal supply at surface facilities.
recordType: RESERVE RECORD
fields:
  - { label: Record, value: OSC-RSV-ENERGY, mono: true }
  - { label: Category, value: ENERGY }
  - { label: Plant operator, value: "Logistics & Reserves, Reactor Operations Section" }
  - { label: Engineering authority, value: "Facilities Engineering (ALPHA-02)" }
  - { label: Fleet status as at, value: "0600Z 05 MAY 2008" }
  - { label: Next revision, value: "With the JUN 2008 reserve position" }
---

## Generation sources

| Source | Holding | Stated basis |
|---|---|---|
| Nuclear reactor plant | :c[reserves.items.ENERGY-NUCLEAR.value] installations | Five at ALPHA sites, three at BETA sites |
| Diesel generator backup | :c[reserves.items.ENERGY-DIESEL.value] days runtime | :c[reserves.items.ENERGY-DIESEL.text] |
| Surface renewables | Not stated as a quantity | :c[reserves.items.ENERGY-RENEWABLE.text] |

A reactor-equipped site carries its station load on the reactor plant. Diesel sets start automatically on loss of the unit or the switchgear and carry the essential buses; the surface supply carries the second essential bus where it is fitted. Sites without reactor plant carry station load on the surface supply and grid tie in normal service, and on diesel under seal.

Diesel runtime is stated at the essential load of each site with all sets available and the full fuel holding on hand. It is not reduced for sites whose fuel holding is below allocation; see Fuel holdings below.

## Reactor fleet status

| Unit | Designation | Site | Rated | Commissioned | Status | Record |
|---|---|---|---|---|---|---|
| RX-A01 | :c[reactors.RX-A01.designation] | ALPHA-01 | :c[reactors.RX-A01.thermalMWt] MWt / :c[reactors.RX-A01.electricMWe] MWe | :c[reactors.RX-A01.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-A01] |
| RX-A02 | :c[reactors.RX-A02.designation] | ALPHA-02 | :c[reactors.RX-A02.thermalMWt] MWt / :c[reactors.RX-A02.electricMWe] MWe | :c[reactors.RX-A02.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-A02] |
| RX-A03 | :c[reactors.RX-A03.designation] | ALPHA-03 | :c[reactors.RX-A03.thermalMWt] MWt / :c[reactors.RX-A03.electricMWe] MWe | :c[reactors.RX-A03.commissioned] | <span class="status-light status-light--DEGRADED"><span class="status-light__sq" aria-hidden="true"></span>DEGRADED</span> | :x[OSC-RSV-RX-A03] |
| RX-A04 | :c[reactors.RX-A04.designation] | ALPHA-04 | :c[reactors.RX-A04.thermalMWt] MWt / :c[reactors.RX-A04.electricMWe] MWe | :c[reactors.RX-A04.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-A04] |
| RX-A05 | :c[reactors.RX-A05.designation] | ALPHA-05 | :c[reactors.RX-A05.thermalMWt] MWt / :c[reactors.RX-A05.electricMWe] MWe | :c[reactors.RX-A05.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-A05] |
| RX-B03 | :c[reactors.RX-B03.designation] | BETA site :r[:c[reactors.RX-B03.site]]{compartment=TALLOW auth="LR" ref="OSC-CB-014"} | :c[reactors.RX-B03.thermalMWt] MWt / :c[reactors.RX-B03.electricMWe] MWe | :c[reactors.RX-B03.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-B03] |
| RX-B08 | :c[reactors.RX-B08.designation] | BETA site :r[:c[reactors.RX-B08.site]]{compartment=TALLOW auth="LR" ref="OSC-CB-014"} | :c[reactors.RX-B08.thermalMWt] MWt / :c[reactors.RX-B08.electricMWe] MWe | :c[reactors.RX-B08.commissioned] | <span class="status-light status-light--OFFLINE"><span class="status-light__sq" aria-hidden="true"></span>OFFLINE</span> | :x[OSC-RSV-RX-B08] |
| RX-B09 | :c[reactors.RX-B09.designation] | BETA site :r[:c[reactors.RX-B09.site]]{compartment=TALLOW auth="LR" ref="OSC-CB-014"} | :c[reactors.RX-B09.thermalMWt] MWt / :c[reactors.RX-B09.electricMWe] MWe | :c[reactors.RX-B09.commissioned] | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span>NOMINAL</span> | :x[OSC-RSV-RX-B09] |

Status words follow the plant status convention: NOMINAL, unit carrying station load within its limits; DEGRADED, unit carrying station load under a limit or with a component out of service; OFFLINE, unit not carrying load, station on diesel and surface supply; FAULT, unit tripped or unavailable without a planned outage. Each unit's status page gives the status note, the surveillance schedule and open work orders.

HCPU units (ALPHA sites) are refuelled in place. RCPU units (BETA sites) are refuelled by exchange of the transportable core module, with the spent module returned under escort.

## Fuel holdings

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
| Holding | ALPHA sites | BETA sites | GAMMA sites | Basis |
|---|---|---|---|---|
| Diesel fuel, % of allocation | 97 to 100 | 88 (class) | 71 (class) | Return of 25 APR 2008 |
| Diesel runtime at holding | 175 days or more | 158 days (class) | 128 days (class) | Essential load, all sets |
| Reactor core life remaining | See unit pages | See unit pages | Not applicable | Effective full power days |
| Spare core modules | Not applicable | 1 held at ALPHA-02 | Not applicable | RCPU-16/20 common module |

Refuelling programme, FY2008 to FY2010:

| Unit | Last refuelling | Next refuelling | Method |
|---|---|---|---|
| RX-B08 | Outage from 28 APR 2008, in progress | Second quarter FY2012 | Module exchange |
| RX-B09 | Initial core | OCT 2008 | Module exchange |
| RX-B03 | Initial core | APR 2009 | Module exchange |
| RX-A01 | Initial core | MAR 2010 | In place, 45-day outage |
| RX-A03 | Initial core | AUG 2010 | In place, 45-day outage |
| RX-A02, A04, A05 | Initial core | After FY2010 | In place |

GAMMA diesel holdings below 75% are to be restored by tram movement before 30 SEP 2008. DELTA caches hold fuel for vehicle use only and are not included.
:::

## Surface renewables

Solar arrays and ground-source heat exchange are fitted at the surface cover facilities of reactor and non-reactor sites alike, sized to the cover facility's own load with a surplus exported below grade through the surface supply inverter. Geothermal supply is ground-source heat exchange for space conditioning; no site generates electricity from geothermal sources. Output is not stated as a reserve quantity because it depends on the cover facility remaining in service.

## Surveillance and inspection

Every unit is on the reactor surveillance schedule: protection channel functional tests monthly and quarterly, turbine overspeed tests quarterly, containment and seal leak-rate tests annually, and dosimetry badge exchange monthly for reactor spaces. Results are recorded in the unit log and the summary is entered on the unit's status page each Monday. Facilities Engineering reviews the logs quarterly.

Diesel sets are run loaded monthly for one hour and run for four hours at full load annually. Run results are entered on the site life support return.

Point of contact: Reactor Operations Section, Logistics & Reserves, ALPHA-05, extension 6-2304.
