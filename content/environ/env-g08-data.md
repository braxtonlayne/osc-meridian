---
id: env-g08-data
route: /environ/data-sheet
app: environ
family: environ
template: record
docNo: OSC-MEM-08-0171
title: "Air Revitalization Plant, GAMMA-08: Data Sheet"
marking: UMBRA-R
originator: FE/GAMMA-08
revision: 1
date: 2008-04-08
t4: true
facility: GAMMA-08
summary: Design figures for the GAMMA-08 air revitalization plant. Air volume, unit flows, scrubber sizing, filter banks, alarm limits, sensor calibration and the occupancy basis.
xrefs: [OSC-MEM-07-0262, OSC-DIR-0128]
distribution:
  - Environmental systems watch, GAMMA-08 (posted at the plant room)
  - Site Superintendent, GAMMA-08
recordType: PLANT DATA SHEET
fields:
  - { label: Plant, value: "Air revitalization, GAMMA-08" }
  - { label: Panel, value: "ECP-G08-1" }
  - { label: Prepared by, value: "Facilities Engineering, GAMMA-08" }
  - { label: Sensors calibrated, value: 08 APR 2008 }
revisions:
  - { rev: "1", date: 08 APR 2008, change: "Issued after sensor calibration. Occupancy basis restated.", by: FE/GAMMA-08 }
---

## 1. Air volume and occupancy

| Item | Figure |
|---|---|
| Conditioned air volume | :c[apps.environ.volumeM3] m3 |
| Occupancy basis | :c[facilities.GAMMA-08.staff] (posted staff) |
| Berthing | :c[facilities.GAMMA-08.capacity] |
| CO2 per person | :c[apps.environ.metabolic.co2M3hPerPerson]{raw} m3/h |
| O2 per person | :c[apps.environ.metabolic.o2M3hPerPerson]{raw} m3/h |
| Heat per person | :c[apps.environ.metabolic.heatKwPerPerson]{raw} kW |

The plant is sized and its alarms are set on the occupancy basis. Berthing above the occupancy basis is supplied from the same units and is not counted in the basis.

## 2. Air handling

| Unit | Rated flow | Fan positions |
|---|---|---|
| AHU-1 | :c[apps.environ.ahus.AHU-1.ratedM3h] m3/h | OFF, LOW, MED, HIGH |
| AHU-2 | :c[apps.environ.ahus.AHU-2.ratedM3h] m3/h | OFF, LOW, MED, HIGH |
| Makeup air damper, OPEN | :c[apps.environ.makeup.positions.OPEN.m3h] m3/h | |
| Makeup air damper, MIN | :c[apps.environ.makeup.positions.MIN.m3h] m3/h | |
| Filtered makeup, CBRN | :c[apps.environ.filtration.cbrnFlowM3h] m3/h (clean bank) | |

## 3. CO2 scrubbers

| Item | Figure |
|---|---|
| Trains | 2 (SCR-A, SCR-B), regenerable swing bed |
| Removal per train at 1,000 ppm | :c[apps.environ.scrubbers.removalM3hAt1000]{raw} m3/h CO2 (AHU-2 at HIGH) |
| Bed capacity | :c[apps.environ.scrubbers.bedCapacityM3]{raw} m3 CO2 |
| Regeneration | :c[apps.environ.scrubbers.regenMin] minutes |
| Rise on full recirculation, no scrubber, at the occupancy basis | :c[apps.environ.reference.sealedRisePpmH] ppm per hour |
| Equilibrium, one train, at the occupancy basis | :c[apps.environ.reference.oneTrainEquilibriumPpm] ppm |
| Equilibrium, two trains, at the occupancy basis | :c[apps.environ.reference.twoTrainEquilibriumPpm] ppm |

## 4. Filter banks

| Bank | Last change | Lot |
|---|---|---|
| A | :c[apps.environ.filtration.banks.A.lastChange]{raw} | :c[apps.environ.filtration.banks.A.lot] |
| B | :c[apps.environ.filtration.banks.B.lastChange]{raw} | :c[apps.environ.filtration.banks.B.lot] |

Cycle :c[apps.environ.filtration.cycleDays] days (seal-capable zones, :x[OSC-DIR-0128]). Change earlier at :c[apps.environ.filtration.dpChangeAt]{raw} in. w.g. pre-filter differential.

## 5. Sensors

| Zone | Sensor |
|---|---|
| Z1, level 1 | :c[apps.environ.zones.Z1.sensor] |
| Z2, level 2 | :c[apps.environ.zones.Z2.sensor] |
| Z3, level 3 | :c[apps.environ.zones.Z3.sensor] |

Calibrated :c[apps.environ.calibration.date]{raw} against reference gas. Tolerance :c[apps.environ.calibration.tolerancePpm] ppm. A reading outside tolerance against a handheld meter is reported to Facilities Engineering and the sensor is recalibrated before its readings are used in any report.
