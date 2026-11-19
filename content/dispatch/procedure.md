---
id: dispatch-procedure
route: /dispatch/procedure
app: dispatch
family: dispatch
template: record
docNo: OSC-TRN-DSP-01
title: "Dispatcher Workstation, Transit Control Desks: Operating Procedure"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 3
date: 2008-03-12
access: { tier: 3 }
summary: Operating procedure for the Dispatcher Workstation at the Transit Control desks. Desk authority, route setting, consists, signals, dispatch, holds under network isolation and seal drill, and the segment 04 working key.
xrefs: [OSC-TRN-DSP-02, OSC-TRN-TT-08-02, OSC-TRN-RS, OSC-TRN-SEG-04, OSC-TRN-POS-08-044, OSC-DIR-0412, OSC-DIR-0301]
distribution:
  - Director, Transit Operations
  - Network Control supervisor, ALPHA-01
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Command posts, ALPHA-01 to ALPHA-05
  - Transit Operations file TO/DSP
recordType: OPERATING PROCEDURE
fields:
  - { label: Applies to, value: "Dispatcher Workstation, panel PNL-TO-0204, and the training simulator TS-2" }
  - { label: Desk, value: "Transit Control desk, ALPHA-02 (TC/A02)" }
  - { label: Keeper, value: "Transit Operations, ALPHA-01" }
  - { label: File, value: "TO/DSP", mono: true }
revisions:
  - { rev: "1", date: "2006-10-02", change: "Issued for the opening of segment 02.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2007-04-16", change: "Segment 04 working key added to the desk. Section 7 issued.", by: "TO/ALPHA-01" }
  - { rev: "3", date: "2008-03-12", change: "Holds under seal drill brought into line with the seal drill procedure. Training simulator TS-2 opened to Tier 3 operators.", by: "TO/ALPHA-01" }
---

## 1. Purpose

This procedure governs the entry of movements at a Dispatcher Workstation. Booked paths are run by Network Control from the working timetable (:x[OSC-TRN-TT-08-02]) and are not entered at the desk. The desk enters movements that are not booked: empty stock workings, consignments and movements ordered by a command post.

## 2. Authority

Live working at the desk requires the desk key. The key is issued to dispatchers who hold the Transit Control desk qualification and to the command post of the facility in which the desk stands. A workstation without the key shows the desk in training mode only.

The training simulator TS-2 is open to any Tier 3 operator. It uses the network as built and the spare stock as registered, compressed :c[apps.dispatch.training.timeScale]{raw} to 1 in time. Movements entered in the simulator are not passed to Network Control and are not retained when the window is closed.

## 3. Setting a route

1. Enter the route by selecting platforms on the line diagram in order, or by choosing an origin and a destination. With origin and destination only, the desk offers the shortest route in revenue service, by rail between hubs and otherwise by tram.
2. A route is set over one system. Rail consists do not work tram links; tram consists do not work rail segments.
3. Press SET ROUTE (F5). The interlocking checks the whole route against the booked paths and against movements already entered, for the departure time selected on the DEPART switch, and refuses the route on any of the following:

| Check | Rule |
|---|---|
| Possession | No movement over a link inside a possession in force or booked for the time of the run |
| Headway, rail | :c[apps.dispatch.working.headwayBlocks.rail] clear block sections in the same direction |
| Headway, tram | :c[apps.dispatch.working.headwayBlocks.tram] clear block section in the same direction |
| Opposing movement, tram | Tram links are single line. An opposing movement is refused unless the two meet at a mid-link passing loop (links over :c[apps.dispatch.working.tramLoopMinMiles] mi) |
| Opposing movement, rail | No check. Rail segments are double guideway |
| Segment not in revenue service | Refused. See section 7 |

4. A refused route is reported on the desk annunciator (ROUTE CONFLICT or POSSESSION IN FORCE) and in a message box naming the path or possession concerned. Network Control is advised automatically of the first refusal at the desk.

## 4. Consist

Only spare stock may be entered (:x[OSC-TRN-RS]). In-service consists are allocated to booked paths. The consist must stand at the origin platform. A consist that has been worked to another platform stands there until it is worked back. Consists in works or not in service are listed and refused.

## 5. Signals and dispatch

1. With the route set (ROUTE SET lamp lit), select the consist and press CLEAR SIGNALS (F6). The starting signal shows PROCEED when the route has proved.
2. Press DISPATCH (F7). The movement is entered on the dispatch log under a log number of the form DSP-A02-mmdd-nnn and departs at the time selected on the DEPART switch. Dwell at intermediate platforms is :c[apps.dispatch.working.dwellMin.rail] minutes for rail and :c[apps.dispatch.working.dwellMin.tram] minutes for tram.
3. CANCEL ROUTE (Esc) replaces the signals to danger and releases the route.

## 6. Holds

| Cause | Effect on a movement | Release |
|---|---|---|
| Network isolation | Every movement is brought to a stand where it is. No route is set and no signal cleared while the network is isolated | At the desk, train by train, after hub circuits are restored |
| Seal drill | Portal seal doors close. A movement in section runs to the next platform and is held there. Departures are held | At the desk, after the drill stands down |
| Desk hold (F8) | The movement is held at the next platform | At the desk (F9) at any time |

A held movement does not move again by itself when the cause clears. The desk that entered it releases it. A movement is cancelled only while it stands at a platform.

## 7. Segment 04 working key

The desk carries a key switch for segment 04 (key :c[apps.dispatch.seg04.keyNo]{raw}). The segment is not in revenue service (:x[OSC-TRN-SEG-04]). The key is not kept at the desk.

| Position | Use |
|---|---|
| NORMAL | Key removable. The interlocking refuses any route over segment 04 |
| ENGRG | Engineering trains for portal seal walk-downs, inside a possession in force on segment 04 (:x[OSC-TRN-POS-08-044]) |
| 3 | Not used at this desk |

## 8. Records

Every desk operation is recorded in the workstation audit trail. Queries about an entry on the dispatch log come from the Network Control supervisor and are answered by return, quoting the log number.

Issued for Transit Operations: D. Harker, Director, Transit Operations, ALPHA-01. 12 MAR 2008.
