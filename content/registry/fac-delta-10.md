---
id: fac-delta-10
route: /registry/facility/delta-10
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-10
title: "Facility Dossier: DELTA-10"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-10
summary: Safe house or cache, DELTA class. Designation and class standard only; detailed record withheld at Tier 1.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-10, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2007-08-31, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-10.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-10.anchor.miles] mi :c[facilities.DELTA-10.anchor.bearing] of :c[facilities.DELTA-10.anchor.city], :c[facilities.DELTA-10.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[:c[facilities.DELTA-10.depthFt] ft below grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-10.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-10.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-10.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-10.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction primes | PC-35, PC-43 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-10.function] Cover: :c[facilities.DELTA-10.coverStory] Site: :c[facilities.DELTA-10.terrain]
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
