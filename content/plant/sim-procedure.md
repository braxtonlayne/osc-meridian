---
id: plant-sim-procedure
route: /plant/sim-procedure
app: plant
family: plant
template: record
docNo: OSC-RSV-SIM-01
title: "Part-Task Training Simulator: Operating Procedure"
marking: UMBRA-C
originator: LR/ALPHA-05
revision: 4
date: 2008-04-21
xrefs: [OSC-RSV-RX-A05, OSC-RSV-ENERGY, OSC-RSV-SIM-02]
summary: Operating procedure for the reactor plant part-task trainer at MERIDIAN workstations. Panel layout, initial conditions, startup to station load, trips and resets, and the rule that the live plant display is read only.
distribution:
  - Reactor Operations Section, all units
  - Candidate and requalifying operators (issued with the training record)
  - Workstation holders at reactor sites (on request to the section clerk, ALPHA-05)
recordType: OPERATING PROCEDURE
fields:
  - { label: Procedure, value: "OSC-RSV-SIM-01", mono: true }
  - { label: Equipment, value: "Reactor Plant Panel, training simulator mode", mono: false }
  - { label: Senior reactor operator, value: "V. Haldane, RX-A05" }
  - { label: Read with, value: "OSC-RSV-SIM-02, quick reference" }
revisions:
  - { rev: "4", date: "2008-04-21", change: "Startup-rate bypass above the sync band added to section 5; watch bill note in 2.3 restated.", by: "V. Haldane" }
  - { rev: "3", date: "2008-01-14", change: "Plant link key switch K-0612 and the live display added.", by: "V. Haldane" }
  - { rev: "2", date: "2007-09-03", change: "Diesel selector and essential bus windows added.", by: "G. Pratt" }
---

## 1. Purpose and scope

This procedure covers the part-task training simulator reached from the Reactor Plant Panel on a MERIDIAN workstation: panel :c[apps.plant.panel.panelNo] revision :c[apps.plant.panel.panelRev], simulator software release :c[apps.plant.panel.simulatorRelease], under the training authority of the :c[apps.plant.qualification.authority]. The simulator models one reactor unit with a simplified point-kinetics core and a lumped thermal plant. It is a familiarisation and drill aid. It is **not** an engineering model, does not reproduce any unit's transients to plant accuracy, and is not connected to any plant.

The full-scope trainer for qualifying watches remains the control room trainer on Level 6 at ALPHA-05 (:x[OSC-RSV-RX-A05]), booked through the section clerk.

## 2. Use of the panel

### 2.1 Simulator and live display

The PLANT LINK key switch (key :c[apps.plant.panel.keyNo]) selects SIM or LIVE.

- **SIM**: the training simulator. Every control on the panel works.
- **LIVE**: the remote display of the selected unit, from plant telemetry. Indications only.

### 2.2 Who may operate

Any workstation holder may operate the simulator. Simulator runs are recorded in the plant panel audit and in the simulator trip history, which is common to all workstations.

### 2.3 Live display is read only

No control on the live display acts on a plant. Plant controls are operated only from a unit's power plant control room by a licensed operator on the current watch bill. A control operated on the live display is refused, and the attempt is recorded and reported to the Reactor Operations Section. A workstation holder who is on the watch bill operates the plant from the control room, not from the workstation.

### 2.4 One station at a time

A simulator unit runs at one station at a time. The station that last operated a control runs it. Other stations watching the same unit follow it. When no station has it on screen, it stands frozen where it was left.

## 3. Panel layout

| Section | Contents |
|---|---|
| Annunciator | Sixteen windows, first-out on reactor trip. ACK silences the horn, RESET clears windows whose condition has cleared, TEST lights every window. |
| Reactor trip | Guarded manual scram HS-RPS-01 (lift the cover, then press and hold), TRIP SEALED IN lamp, TRIP RESET. |
| Reactor | Power, primary pressure, coolant temperature, log power, startup rate, fuel temperature. |
| Control rods | Shutdown (SD) and control (CB) bank step counters, OUT and IN pushbuttons (hold to drive), full-out and on-bottom lamps, reactor mode selector. |
| Primary coolant | Pump A and B start and stop, running lamps, coolant flow. |
| Turbine-generator | Turbine trip and latch, generator breaker 52-G1 close and open, generator and station load. |
| Electrical | Diesel set selector (STOP, AUTO, RUN), diesel running, surface supply, essential buses. |
| Simulator | Initial condition selector and LOAD IC, FREEZE, simulator time, plant link key switch. |

## 4. Initial conditions

| IC | Condition | Use |
|---|---|---|
| IC-1 | Hot shutdown, all rods in, pumps running | Startup drill |
| IC-2 | Hot standby, critical at source level, turbine latched | Power ascension |
| IC-3 | Carrying station load, generator on | Load changes, trips |

Load an IC with the IC selector and LOAD IC. Loading an IC clears the trip and the annunciator. Each unit's simulator carries that unit's own ratings and any limiting condition in force (for example a unit limited by equipment out of service shows its limit on the ABOVE LIMIT window).

## 5. Startup from IC-1 to station load

1. Check both coolant pumps running and flow normal. Check the trip is reset.
2. Mode selector to STARTUP.
3. Withdraw the shutdown bank to full out. The shutdown bank must be full out before the control bank will move (ROD BLOCK).
4. Withdraw the control bank in short pulses. Watch the startup rate: the rod-withdrawal alarm sounds at :c[apps.plant.alarms.startupRateDpm] DPM and the reactor trips at :c[apps.plant.trips.startupRateDpm] DPM. Let power settle between pulses.
5. In STARTUP the high-flux trip is set low, at :c[apps.plant.trips.fluxHighStartupPct]% rated. Bring power into the sync band, :c[apps.plant.electrical.syncMinPct]% to :c[apps.plant.electrical.syncMaxPct]% rated.
6. Latch the turbine (TURBINE RESET). Mode selector to RUN.
7. SYNC/CLOSE 52-G1. Station load transfers from the surface supply to the unit at a controlled rate. Above :c[apps.plant.trips.startupRateBypassPct]% rated with the generator on, the startup-rate trip is bypassed.
8. Raise power with the control bank to carry the station load. The moderator and fuel temperature coefficients are negative: power follows load once the rods are set.

## 6. Trips

The reactor trips (all rods in) on: manual scram; high flux (:c[apps.plant.trips.fluxHighRunPct]% in RUN); high startup rate; high or low primary pressure (:c[apps.plant.trips.pressureHighMPa] MPa, :c[apps.plant.trips.pressureLowMPa] MPa); high coolant temperature (:c[apps.plant.trips.coolantTempHighC] °C); low coolant flow (below :c[apps.plant.trips.flowLowFraction] of full flow with power above :c[apps.plant.trips.flowLowPermissivePct]%); turbine trip above :c[apps.plant.trips.turbineTripPermissivePct]%; mode selector to SHUTDOWN.

After a trip:

1. Check all rods on the bottom and power falling.
2. ACK the annunciator. Note the first-out window.
3. Check the diesel sets have started if the surface supply was lost.
4. When the cause is cleared, the mode selector is at SHUTDOWN and both banks are on the bottom, press TRIP RESET.

Every simulator trip is entered in the simulator trip history with the station's operator number. A third trip at one station are reviewed by the senior reactor operator.

## 7. Limits

The simulator records a run outside the unit's limits (power above the unit limit, or the essential buses dead) that is held for more than :c[apps.plant.limits.holdS] seconds without a trip. The Reactor Operations Section reviews these runs with the operator.

## 8. Keys

| Key | Action |
|---|---|
| F6 | Freeze or run |
| F7 | Acknowledge |
| F8 | Reset cleared windows |
| Alt+1 to Alt+5 | Panel, trends, one-line, event log, trip history |
| Ctrl+P | Print this procedure |
