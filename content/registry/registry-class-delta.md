---
id: registry-class-delta
route: /registry/class/delta
app: registry
family: registry
template: index
docNo: OSC-FAC-CLS-DELTA
title: "Facility Class Standard: DELTA (Safe Houses & Caches)"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 3
date: 2008-04-30
audience: 2
summary: Class standard for the twelve Safe Houses & Caches. Surface or minimal depth, short-duration sustainability, no integrated transit. Detailed records Tier 1.
xrefs: [OSC-FAC-IDX, OSC-ASR-CTR, OSC-DIR-0163]
revisions:
  - { rev: "1", date: 2004-11-15, change: Class standard issued, by: FE/ALPHA-02 }
  - { rev: "2", date: 2006-02-06, change: Guard rotation transferred to Security Forces Command post orders, by: FE/ALPHA-02 }
  - { rev: "3", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
entries:
  - { docNo: OSC-FAC-DELTA-01, title: "Facility Dossier: DELTA-01", route: /registry/facility/delta-01, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-02, title: "Facility Dossier: DELTA-02", route: /registry/facility/delta-02, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-03, title: "Facility Dossier: DELTA-03", route: /registry/facility/delta-03, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-04, title: "Facility Dossier: DELTA-04", route: /registry/facility/delta-04, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-05, title: "Facility Dossier: DELTA-05", route: /registry/facility/delta-05, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-06, title: "Facility Dossier: DELTA-06", route: /registry/facility/delta-06, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-07, title: "Facility Dossier: DELTA-07", route: /registry/facility/delta-07, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-08, title: "Facility Dossier: DELTA-08", route: /registry/facility/delta-08, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-09, title: "Facility Dossier: DELTA-09", route: /registry/facility/delta-09, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-10, title: "Facility Dossier: DELTA-10", route: /registry/facility/delta-10, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-11, title: "Facility Dossier: DELTA-11", route: /registry/facility/delta-11, date: 2008-04-30, marking: UMBRA-U }
  - { docNo: OSC-FAC-DELTA-12, title: "Facility Dossier: DELTA-12", route: /registry/facility/delta-12, date: 2008-04-30, marking: UMBRA-U }
---

This standard governs the DELTA class of installation. It is maintained by the Facilities Register Section, FE/ALPHA-02. Surface or near-surface safe houses and equipment caches; not enumerated in detail for operational security.

## Standard

| Item | Standard |
|---|---|
| Class | Safe Houses & Caches |
| Depth | :c[classes.DELTA.depthText] |
| Purpose | Emergency staging and equipment storage |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Transit | :c[classes.DELTA.transitEntitlement] |
| Installations | :c[classes.DELTA.count] |
| Berthing, class aggregate (72-hour basis) | :c[classes.DELTA.statedCapacity] |
| Staff, class aggregate | :c[classes.DELTA.statedStaff] (rotating guard duty only) |

Siting criteria: strategic interstate corridors; proximity to major military installations; extraction route nodes; rural areas of low population density.

## Guard

DELTA sites are not staffed. Guard rotation, post orders and the count of guards at each site are set by Security Forces Command (SFC/ALPHA-02) post orders, not by this standard. Visits to a DELTA site by persons other than the rotating guard are escorted under :x[OSC-DIR-0163].

## Construction

Construction primes for DELTA sites are shown on site dossiers by PC number only. See :x[OSC-ASR-CTR].

Detailed records:

:::redact{tier=1 auth="CS" ref="OSC-2008-Q2"}
| Site | Location | Cover identity | Berthing | Function |
|---|---|---|---|---|
| :x[OSC-FAC-DELTA-01] | :r[:c[facilities.DELTA-01.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-01.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-01.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-01.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-02] | :r[:c[facilities.DELTA-02.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-02.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-02.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-02.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-03] | :r[:c[facilities.DELTA-03.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-03.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-03.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-03.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-04] | :r[:c[facilities.DELTA-04.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-04.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-04.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-04.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-05] | :r[:c[facilities.DELTA-05.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-05.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-05.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-05.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-06] | :r[:c[facilities.DELTA-06.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-06.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-06.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-06.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-07] | :r[:c[facilities.DELTA-07.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-07.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-07.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-07.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-08] | :r[:c[facilities.DELTA-08.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-08.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-08.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-08.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-09] | :r[:c[facilities.DELTA-09.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-09.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-09.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-09.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-10] | :r[:c[facilities.DELTA-10.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-10.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-10.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-10.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-11] | :r[:c[facilities.DELTA-11.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-11.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-11.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-11.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| :x[OSC-FAC-DELTA-12] | :r[:c[facilities.DELTA-12.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-12.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-12.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} | :r[:c[facilities.DELTA-12.function]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
:::

Action officer: Facilities Register Section, FE/ALPHA-02. Next review: APR 2009.
