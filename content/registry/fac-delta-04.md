---
id: fac-delta-04
route: /registry/facility/delta-04
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-04
title: "Facility Dossier: DELTA-04"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-04
summary: Safe house or cache, DELTA class. Designation and class standard only; detailed record withheld at Tier 1.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-04, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2005-06-30, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Codename entered; annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[:c[facilities.DELTA-04.codename]]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-04.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-04.anchor.miles] mi :c[facilities.DELTA-04.anchor.bearing] of :c[facilities.DELTA-04.anchor.city], :c[facilities.DELTA-04.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[:c[facilities.DELTA-04.depthFt] ft below grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-04.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-04.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-04.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-04.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction primes | PC-15, PC-22 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-04.function] Cover: :c[facilities.DELTA-04.coverStory] Site: :c[facilities.DELTA-04.terrain]
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
