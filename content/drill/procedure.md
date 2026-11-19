---
id: drill-procedure
route: /drill/procedure
app: drill
family: drill
template: directive
docNo: OSC-DIR-0433
title: "Network Seal Drill: Order, Relay and Report"
marking: UMBRA-R
originator: TO/ALPHA-01
revision: 2
date: 2008-02-25
summary: How a network seal drill is ordered from the Seal Drill Coordinator, relayed by Network Control over the inter-hub circuits, tram order wires and voice circuits, acknowledged, sealed, reported, stood down or aborted, and observed by OIA.
xrefs: [OSC-DIR-0434, OSC-DIR-0128, OSC-DIR-0412]
distribution:
  - Facility commanders and deputy commanders, ALPHA sites
  - Network Control, Transit Operations, ALPHA-01
  - Site superintendents, BETA and GAMMA sites
  - Communications Security, ALPHA-02 (circuit office)
  - Office of Internal Assurance (for information)
effective: 2008-03-03
opr: TO/ALPHA-01
category: Operations and Continuity
revisions:
  - { rev: "1", date: "2007-11-12", change: "Initial issue on commissioning of the Seal Drill Coordinator. Site drills before this date were ordered and recorded at the site.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2008-02-25", change: "Two-person rule at the order position. NO REPORT rule. OIA observation. Annex B reissued.", by: "TO/ALPHA-01" }
directive:
  effective: "2008-03-03"
  opr: TO/ALPHA-01
  review: "2009-02-25"
  category: Operations and Continuity
---

## 1. Purpose

This directive governs the network seal drill: an exercise in which every staffed site on the plant network closes its seal doors on an order from Network Control, reports sealed, holds, and reopens on the stand-down. It is the procedure the Seal Drill Coordinator is built to. Site drills ordered and held at a single site remain under the site's own orders and are not covered here.

## 2. Applicability

This directive applies to every ALPHA, BETA and GAMMA site on the plant network. :c[sealDrill.excluded.text]

## 3. Authority to order

A network seal drill is ordered only by a facility commander or a deputy commander, from the order position of the Seal Drill Coordinator. The order is issued in the name of Network Control, :c[sealDrill.origin], which is the origin of every drill whoever orders it.

No other position may order a drill. The order authority key is issued to command sections only. An attempt to order from a position without the key is refused by the coordinator and entered in the drill log, and the ordering command is told.

## 4. Two-person rule

An order is given with a second officer present at the order position. The ordering officer turns the order authority key to ENABLE, lifts the cover and holds ORDER. The coordinator assigns the drill number. Network Control reads the number back on the order wire; the ordering officer enters the read-back as received, names the second officer, and the second officer countersigns. The order is not issued until the read-back agrees and the countersignature is entered.

## 5. One drill at a time

Only one network drill may be in progress. A drill is in progress from the order until it is stood down or aborted.

## 6. Relay, acknowledgement, seal and report

1. Network Control acknowledges the order at once and relays it over the inter-hub circuits, one relay interval of :c[sealDrill.relay.hubHopMin]{raw} minute per rail segment in revenue service. A segment not in revenue service does not carry the order.
2. Each hub relays the order down its tram network, :c[sealDrill.relay.tramHopMin]{raw} minute per tram link, BETA sites before GAMMA sites.
3. Sites with no tram link are called by voice circuit from Network Control after the networks, :c[sealDrill.relay.unlinkedMin]{raw} minutes apart, in designation order.
4. Each site acknowledges, closes its seal doors and reports sealed within its class times, counted from the moment it receives the order:

::canon-table{source="sealDrill.classes" cols="classId:Class,ackMin:Acknowledge (min),doorCycleMin:Door cycle (min),sealMin:Report sealed (min)" caption="Class seal times"}

5. A site that has not reported sealed by twice its class seal time is carried as NO REPORT. Network Control does not chase a NO REPORT during the drill; the ordering officer receives a query after the drill.
6. When every site has reported sealed or is carried as NO REPORT, Network Control reports the network held sealed. It is held for :c[apps.drill.holdMin]{raw} drill minutes and then stood down by Network Control unless the ordering officer stands it down first.
7. The ordering officer may abort a drill at any time before the network is held sealed. Sites that have sealed reopen; sites that have not received the order take no action.

The Seal Drill Coordinator displays the drill compressed: drill time runs :c[sealDrill.timeScale]{raw} times faster than the wall clock on the display. Times in the drill register and the drill report are drill times.

## 7. Observation

The Office of Internal Assurance may enter an observation against a drill while it propagates or is held sealed. An observed drill is reported to the ordering command by OIA. A drill held without an observer is notified to OIA after it ends. OIA does not order, stand down or abort drills.

## 8. Relay traffic and queries

Every relay, acknowledgement and report is entered in the coordinator's message log with its date-time group, drill time, originating station, circuit and text. An operator who doubts a line may query it with Network Control from the log. Queries about circuit timing are passed to the circuit office, Communications Security, ALPHA-02, and answered by message.

## 9. Reports

When a drill is stood down or aborted the coordinator issues the drill report by message to the ordering officer. The report lists sites sealed, late reports, NO REPORT sites and any acknowledgement out of sequence. Coordinator displays are not printed; the report is the record. The drill register keeps the most recent :c[apps.drill.registerCap]{raw} network drills.

## 10. Site action

Site personnel act on Annex B, :x[OSC-DIR-0434]. Seal doors and seal-capable air handling zones are listed in the site's door board and in :x[OSC-DIR-0128]. Indications on the coordinator that do not agree with the site are reported under :x[OSC-DIR-0412].

## Annex A. Relay sequence

The order in which sites receive the order, computed from the rail segments in revenue service and the tram network links.

::canon-table{source="sealDrill.sequence" cols="facility:Site,via:Relayed by,relay:Relay,hop:Hops,offsetMin:Receipt (drill min)" caption="Relay sequence"}
