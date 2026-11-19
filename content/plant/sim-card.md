---
id: plant-sim-card
route: /plant/sim-card
app: plant
family: plant
template: record
docNo: OSC-RSV-SIM-02
title: "Part-Task Trainer: Quick Reference"
marking: UMBRA-R
originator: LR/NET
revision: 2
date: 2008-04-21
t4: true
xrefs: []
summary: One-page quick reference for the generic part-task trainer on the Reactor Plant Panel. Startup sequence, trip response, keys.
distribution:
  - All workstation holders (issued with the Reactor Plant Panel)
recordType: REFERENCE CARD
fields:
  - { label: Card, value: "OSC-RSV-SIM-02", mono: true }
  - { label: Equipment, value: "Reactor Plant Panel, part-task trainer" }
revisions:
  - { rev: "2", date: "2008-04-21", change: "Startup-rate bypass note added.", by: "Reactor Operations Section" }
---

## What it is

The part-task trainer is a generic training core of :c[apps.plant.trainer.thermalMWt] MWt. It is not modelled on any unit and is not connected to any plant. Any workstation holder may run it. Trips are recorded in the simulator trip history.

## Starting up

1. Load IC-1, hot shutdown. Check both pumps running and the trip reset.
2. Mode selector to STARTUP.
3. Shutdown bank (SD) OUT to full out. The control bank (CB) is blocked until it is.
4. Control bank OUT in short pulses. Keep the startup rate below :c[apps.plant.alarms.startupRateDpm] DPM. It trips at :c[apps.plant.trips.startupRateDpm] DPM.
5. Hold power between :c[apps.plant.electrical.syncMinPct]% and :c[apps.plant.electrical.syncMaxPct]%. Latch the turbine. Mode to RUN.
6. SYNC/CLOSE 52-G1. Raise power on the control bank to carry the station load.

## After a trip

1. All rods on the bottom, power falling.
2. ACK (F7). Read the first-out window.
3. Mode to SHUTDOWN, both banks on the bottom, then TRIP RESET.

## Manual scram

Lift the cover on HS-RPS-01, then press and hold. Escape closes the cover.

## Keys

| Key | Action |
|---|---|
| F6 | Freeze or run |
| F7 | Acknowledge |
| F8 | Reset cleared windows |
| Alt+1 to Alt+5 | Change view |
