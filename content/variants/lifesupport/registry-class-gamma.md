---
id: registry-class-gamma
route: /registry/class/gamma
app: registry
family: registry
template: index
docNo: OSC-FAC-CLS-GAMMA
title: "Facility Class Standard: GAMMA (Personnel Shelters), Extract for Tier 4"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 7
date: 2008-04-30
summary: "Extract of the GAMMA class standard for Tier 4 personnel at a shelter: depth band, life support window, the plant every shelter carries and the seal times it is built to. No site list."
xrefs: [OSC-FAC-GAMMA-08, OSC-DIR-0128, OSC-DIR-0156]
revisions:
  - { rev: "2", date: 2003-09-08, change: Diesel backup requirement restated after the August 2003 outage, by: FE/ALPHA-02 }
  - { rev: "6", date: 2008-01-08, change: Seal state added to GAMMA dossier identity blocks, by: FE/ALPHA-02 }
  - { rev: "7", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
entries:
  - { docNo: OSC-FAC-GAMMA-08, title: "Facility Dossier: GAMMA-08", route: /registry/facility/gamma-08, date: 2008-04-30, marking: UMBRA-C }
---

This extract is for Tier 4 personnel posted to a shelter. The full class standard, with its list of sites, is held by the site superintendent. Your own site's dossier is the only one listed.

## What a GAMMA shelter is

| Item | Standard |
|---|---|
| Class | :c[classes.GAMMA.name] |
| Depth band | :c[classes.GAMMA.depthText] |
| Life support window | :c[classes.GAMMA.sustainabilityText] |
| Transit | :c[classes.GAMMA.transitEntitlement]. A shelter may have a tram platform. |
| Purpose | Personnel preservation. Essential staff only. |

## Plant every shelter carries

1. Air handling with CO2 scrubbing and gas-phase filtration, able to hold the shelter at positive pressure with the portals closed.
2. One diesel generator with a day tank and a bulk tank for the life support window. Monthly loaded run test.
3. Water storage and treatment for the berthing figure.
4. A personnel airlock with a decontamination cycle.
5. Blast valves on every air intake and exhaust, cycled for closure time at each annual inspection.

## Seal times

A shelter receives a seal order from the hub that serves it, by tram link or by voice circuit. It is built and staffed to report sealed within the time below, counted from receipt of the order.

::canon-table{source="sealDrill.classes" classId="GAMMA" cols="ackMin:Acknowledge (min),doorCycleMin:Doors closed (min),sealMin:Report sealed (min)"}

A shelter that has not reported sealed by twice that time is shown on the drill board as NO REPORT.

## Hardening

Shelters with two portals are built to the dual-portal standard, with a blast door behind each portal door. Shelters with one portal are built to the single-portal standard. Your site's standard is on its dossier.

## Your site

:x[OSC-FAC-GAMMA-08], Facility Dossier: GAMMA-08 (site extract).
