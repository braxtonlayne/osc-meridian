---
id: fac-delta-07
route: /registry/facility/delta-07
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-07
title: "Facility Dossier: DELTA-07"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-07
summary: Safe house or cache, DELTA class. Detailed record withheld at Tier 1. Guard rotation changeover 22 MAY 2008; key register discrepancy.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-07, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2007-02-28, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-07.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-07.anchor.miles] mi :c[facilities.DELTA-07.anchor.bearing] of :c[facilities.DELTA-07.anchor.city], :c[facilities.DELTA-07.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[:c[facilities.DELTA-07.depthFt] ft below grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-07.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-07.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-07.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-07.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction primes | PC-22, PC-23 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-07.function] Cover: :c[facilities.DELTA-07.coverStory] Site: :c[facilities.DELTA-07.terrain]
:::

Released notes:

- :c[calendar.CAL-0805-28.title], 22 MAY 2008, :c[calendar.CAL-0805-28.timeText].
- Key control. At the 14 APR 2008 changeover the key register showed one key more than the cabinet held (padlock key, vehicle bay :r[2, north door]{tier=1 auth="SFC" ref="OSC-2008-Q2"}). Outgoing and incoming guard signed the count as found. Referred to SFC for reconciliation at the next changeover; register annotated.

Class standard: :x[OSC-FAC-CLS-DELTA].
