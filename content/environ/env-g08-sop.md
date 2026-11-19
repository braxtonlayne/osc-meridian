---
id: env-g08-sop
route: /environ/procedure
app: environ
family: environ
template: record
docNo: OSC-MEM-08-0164
title: "Environmental Control Panel ECP-G08-1: Operating Procedure"
marking: UMBRA-R
originator: FE/GAMMA-08
revision: 2
date: 2008-04-10
t4: true
facility: GAMMA-08
summary: Operating procedure for the GAMMA-08 environmental control panel. Air handling, makeup air and the seal closure, CO2 scrubber trains, filtration and CBRN mode, alarms, overrides and the shift handover log.
xrefs: [OSC-DIR-0128, OSC-MEM-08-0171]
distribution:
  - Environmental systems watch, GAMMA-08 (posted at the plant room)
  - Site Superintendent, GAMMA-08
  - Duty officers, GAMMA-08
recordType: OPERATING PROCEDURE
fields:
  - { label: Panel, value: "ECP-G08-1, plant room level" }
  - { label: Issued by, value: "Facilities Engineering, GAMMA-08" }
  - { label: Effective, value: 14 APR 2008 }
  - { label: Supersedes, value: "Revision 1 (02 MAR 2007)" }
  - { label: Applies to, value: "Life support technicians, environmental systems watch" }
  - { label: Governing directive, value: "OSC-DIR-0128" }
revisions:
  - { rev: "2", date: 10 APR 2008, change: "Seal closure latch and reset. Scrubber stagger. Load balance check added to Engineering menu.", by: FE/GAMMA-08 }
  - { rev: "1", date: 02 MAR 2007, change: "Initial issue at commissioning.", by: FE/GAMMA-08 }
---

## 1. Purpose

This procedure is the operating instruction for environmental control panel ECP-G08-1. The panel runs the site's air handling units, the makeup air damper, the two CO2 scrubber trains and the filter banks, and displays carbon dioxide, oxygen, temperature and humidity for each zone. It is posted at the panel and reproduced on MERIDIAN.

## 2. Plant

| Item | Tag | Serves |
|---|---|---|
| Air handling unit 1 | :c[apps.environ.ahus.AHU-1.tag] | Zone Z1 (level 1) and zone Z3 (level 3) |
| Air handling unit 2 | :c[apps.environ.ahus.AHU-2.tag] | Zone Z2 (level 2, shelter hall) and the scrubber side stream |
| Makeup air damper | :c[apps.environ.makeup.tag] | Outside air to the mixing plenum |
| CO2 scrubber trains | SCR-A, SCR-B | Side stream from the AHU-2 return |
| Filter banks | A, B | Makeup air in CBRN mode |

Figures for each item are on the plant data sheet, :x[OSC-MEM-08-0171].

## 3. Normal line-up

1. AHU-1 and AHU-2 at MED.
2. Makeup air damper OPEN. Filtration NORMAL.
3. Scrubber trains OFF. Outside air keeps carbon dioxide down while the damper is open, and the beds are kept for a seal.
4. Seal override key at NORMAL, key removed and held by the watch.

## 4. Seal closure

A seal signal closes the makeup air damper whatever its selector shows, and the closure latches. The site is then on full recirculation and carbon dioxide rises. On the seal signal:

1. Acknowledge the alarms.
2. Put both scrubber trains to AUTO.
3. Put AHU-2 to HIGH. The scrubbers draw from the AHU-2 return, and their removal falls with the fan speed.
4. Watch the trains. In AUTO each train regenerates when its bed is loaded. Do not let both trains regenerate together. If they come into step, put the train with the lower loading to REGEN early, then back to AUTO, so that one train is always adsorbing.

At the occupancy basis for the site (:c[facilities.GAMMA-08.staff] posted staff), carbon dioxide on full recirculation with no scrubber rises about :c[apps.environ.reference.sealedRisePpmH] ppm per hour. One train adsorbing holds it near :c[apps.environ.reference.oneTrainEquilibriumPpm] ppm; two trains near :c[apps.environ.reference.twoTrainEquilibriumPpm] ppm.

When the seal is lifted the damper stays shut until the closure is reset. Press RESET SEAL CLOSURE, return the scrubber trains to OFF once carbon dioxide is back to its normal range, and return AHU-2 to MED.

## 5. Seal override

The seal override key releases the makeup air damper from a seal closure. It admits unfiltered outside air to a sealed site. It is used only on the direction of the duty officer, to clear a carbon dioxide condition the scrubbers cannot hold. The panel asks for the reason, logs it and reports it to the Site Superintendent. Return the key to NORMAL as soon as the condition clears.

## 6. Filtration and CBRN mode

In CBRN mode makeup air is drawn through the selected filter bank instead of the damper, and the site is held above atmosphere. Hold at least :c[apps.environ.filtration.overpressureTarget] in. w.g. Overpressure falls as the bank loads. When it falls toward the low alarm, select the other bank.

Filter banks are changed under :x[OSC-DIR-0128]: every :c[apps.environ.filtration.cycleDays] days on this site, or earlier at :c[apps.environ.filtration.dpChangeAt] in. w.g. pre-filter differential. No bank is opened while the site is sealed or while the bank is on line. Record each change on the panel with the lot number from the stock label.

## 7. Alarms

| Window | Limit | Action |
|---|---|---|
| CO2 HIGH | :c[apps.environ.limits.co2Warn] ppm | Scrubbers to AUTO, AHU-2 to HIGH. Report if it holds for :c[apps.environ.limits.excursionMin] minutes. |
| CO2 HIGH-HIGH | :c[apps.environ.limits.co2Alarm] ppm | Inform the duty officer at once. |
| O2 LOW | :c[apps.environ.limits.o2Low] % | Inform the duty officer. |
| ZONE TEMP HIGH | :c[apps.environ.limits.tempHigh] deg C | Check the AHU serving the zone. |
| OVERPRESS LOW | :c[apps.environ.filtration.overpressureLow] in. w.g. | Change to the other filter bank. |
| NO SCRUBBER ON LINE | Damper shut and no train adsorbing | Scrubbers to AUTO. |

A CO2 excursion above the HIGH limit that holds for :c[apps.environ.limits.excursionMin] minutes is reported automatically by the site monitoring system. Enter the cause and the action taken in the handover log.

## 8. Shift handover log

Sign the handover log at the end of each watch. The signature records the readings and the plant line-up. State in the remarks anything the oncoming watch must act on, including any filter change due.

## 9. Engineering checks

The Engineering menu carries the CO2 load balance. It estimates the occupancy the readings imply from the historian data. The occupancy basis for the site is its posted staff. A result outside tolerance is first checked against sensor calibration (see the data sheet).
