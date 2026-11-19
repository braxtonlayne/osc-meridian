---
id: doors-airlock-card
route: /doors/airlock-reference-card
app: doors
family: doors
template: record
docNo: OSC-MEM-08-0147
title: "Personnel Airlock Cycle and Decontamination: Reference Card"
marking: UMBRA-R
originator: FE/ALPHA-01
revision: 2
date: 2008-03-17
t4: true
summary: Reference card for personnel airlocks. Cycle sequence, pressure permissives, CBRN decontamination dwell, decon bypass and the interlock bypass key.
xrefs: [OSC-MEM-08-0146]
distribution:
  - Duty door operators, all sites on the plant network (posted at the board)
recordType: REFERENCE CARD
fields:
  - { label: Card, value: "OSC-MEM-08-0147", mono: true }
  - { label: Equipment, value: "Personnel airlocks, inner and outer leaves interlocked" }
  - { label: Read with, value: "OSC-MEM-08-0146" }
---

## 1. The interlock

An airlock has an outer leaf (outside or tunnel side) and an inner leaf (shelter side). The two leaves are interlocked: **both leaves are never open together.** A leaf opens only when the other leaf is CLOSED-LOCKED. The board refuses any command that would break this and raises AIRLOCK INTERLOCK.

## 2. Cycle sequence

Call a cycle with CYCLE IN (outside to shelter) or CYCLE OUT (shelter to outside). The leaves are then driven by the sequence until the IDLE lamp lights. Leaves cannot be commanded during a cycle.

| Step | Inbound | Outbound |
|---|---|---|
| 1 | Vent chamber to outside, :c[apps.doors.airlock.equalizeSec] s | Inner leaf opens; dwell :c[apps.doors.airlock.dwellSec] s; inner leaf closes |
| 2 | Outer leaf opens; dwell :c[apps.doors.airlock.dwellSec] s; outer leaf closes | Vent chamber to outside, :c[apps.doors.airlock.equalizeSec] s |
| 3 | Decon dwell, if selected (para 4) | Outer leaf opens; dwell; outer leaf closes |
| 4 | Pressurize chamber to shelter, :c[apps.doors.airlock.equalizeSec] s | Pressurize chamber to shelter, :c[apps.doors.airlock.equalizeSec] s |
| 5 | Inner leaf opens; dwell; inner leaf closes | IDLE |

Each leaf stroke is the leaf's cycle time on the board, bolts included. The chamber is rated for :c[apps.doors.airlock.maxPersons] persons per cycle.

## 3. Pressure

The shelter is held at :c[apps.doors.pressure.insideDp]{raw} :c[apps.doors.pressure.unit] above outside. A leaf opens only when the differential across it is :c[apps.doors.pressure.leafOpenMaxDp]{raw} :c[apps.doors.pressure.unit] or less. The chamber meter and the two across-leaf meters on the board show the differentials. An idle chamber sits at shelter pressure, so the inner leaf may be opened alone for maintenance; the outer leaf may not.

## 4. CBRN decontamination

With MODE at CBRN DECON, an inbound cycle holds both leaves locked after the outer leaf closes and runs the air wash for the site's decon time (on the board under the airlock), with the chamber at :c[apps.doors.pressure.deconDp]{raw} :c[apps.doors.pressure.unit]. Outbound cycles never decon. Platform airlocks have no decon plant and run NORMAL only.

## 5. Decon bypass

DECON BYPASS ends the dwell at once. It is the duty officer's decision, entered at the command post as an override with a reason. A request from a shelter watch is refused and the cycle runs on.

## 6. Interlock bypass key

The INTERLOCK switch has a BYPASS position for maintenance under a signed permit. Its key is held by the site duty officer and is not kept in the switch. Turning the switch without the key does nothing at the door and is recorded.
