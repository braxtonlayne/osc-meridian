---
id: fac-delta-01
route: /registry/facility/delta-01
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-01
title: "Facility Dossier: DELTA-01"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-01
summary: Safe house or cache, DELTA class. Designation and class standard only; detailed record withheld at Tier 1.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-01, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2005-10-31, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-01.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-01.anchor.miles] mi :c[facilities.DELTA-01.anchor.bearing] of :c[facilities.DELTA-01.anchor.city], :c[facilities.DELTA-01.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[:c[facilities.DELTA-01.depthFt] ft below grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-01.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-01.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-01.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-01.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction prime | PC-05 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-01.function] Cover: :c[facilities.DELTA-01.coverStory] Site: :c[facilities.DELTA-01.terrain]
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
