---
id: fac-delta-03
route: /registry/facility/delta-03
app: registry
family: registry
template: dossier
docNo: OSC-FAC-DELTA-03
title: "Facility Dossier: DELTA-03"
marking: UMBRA-U
originator: FE/ALPHA-02
revision: 2
date: 2008-04-30
audience: 1
facility: DELTA-03
summary: Safe house or cache, DELTA class. Detailed record withheld at Tier 1. Cache inventory 16 MAY 2008; generator fuel rotation.
xrefs: [OSC-FAC-CLS-DELTA, OSC-ASR-CTR]
dossier:
  dossierType: "FACILITY DOSSIER: SAFE HOUSE / CACHE"
  identity:
    - { label: Designation, value: DELTA-03, mono: true }
    - { label: Class, value: DELTA (Safe Houses & Caches) }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2006-09-29, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="OSC-2008-Q2"} |
| Location | :r[:c[facilities.DELTA-03.locationText]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Map reference | :r[:c[facilities.DELTA-03.anchor.miles] mi :c[facilities.DELTA-03.anchor.bearing] of :c[facilities.DELTA-03.anchor.city], :c[facilities.DELTA-03.anchor.state]]{tier=1 auth="SFC" ref="OSC-2008-Q2"} |
| Depth | :r[At grade]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Cover identity | :r[:c[facilities.DELTA-03.coverIdentity]]{tier=1 auth="CVO" ref="OSC-2008-Q2"} |
| Completed | :r[:c[facilities.DELTA-03.completed]]{tier=1 auth="FE" ref="OSC-2008-Q2"} |
| Berthing | :r[:c[facilities.DELTA-03.capacity]]{tier=1 auth="LR" ref="OSC-2008-Q2"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-03.staff]]{tier=2 auth="SFC" ref="OSC-DIR-0163"} |
| Construction primes | PC-09, PC-27 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="OSC-2008-Q2"}
:c[facilities.DELTA-03.function] Cover: :c[facilities.DELTA-03.coverStory] Site: :c[facilities.DELTA-03.terrain]
:::

Released notes:

- :c[calendar.CAL-0805-20.title], 16 MAY 2008, :c[calendar.CAL-0805-20.timeText]. Rotating guard to countersign the count sheets.
- Generator fuel rotation last completed 11 APR 2008. Next rotation :r[due 11 JUL 2008, delivered on the cover operator's bulk fuel account]{tier=1 auth="LR" ref="OSC-2008-Q2"}.

Class standard: :x[OSC-FAC-CLS-DELTA].
