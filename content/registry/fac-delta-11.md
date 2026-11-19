---
id: fac-delta-11
route: /registry/facility/delta-11
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-11
title: "Facility Dossier: DELTA-11"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-11
summary: Safe house or cache, DELTA class. Designation and class standard only; detailed record withheld at Tier 1.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-11, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2007-10-31, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Third construction prime entered; annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-11.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-11.anchor.miles] mi :c[facilities.DELTA-11.anchor.bearing] of :c[facilities.DELTA-11.anchor.city], :c[facilities.DELTA-11.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[At grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-11.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-11.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-11.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-11.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction primes | PC-37, PC-40, PC-47 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-11.function] Cover: :c[facilities.DELTA-11.coverStory] Site: :c[facilities.DELTA-11.terrain]
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
