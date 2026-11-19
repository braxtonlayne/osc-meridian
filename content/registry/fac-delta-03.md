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
    - { label: Class, value: "DELTA (Safe Houses & Caches)" }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2006-09-29, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="CS-07-012"} |
| Location | :r[:c[facilities.DELTA-03.locationText]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Map reference | :r[:c[facilities.DELTA-03.anchor.miles]{auth="SFC" ref="SFC-07-0012"} mi :c[facilities.DELTA-03.anchor.bearing]{auth="SFC" ref="SFC-07-0012"} of :c[facilities.DELTA-03.anchor.city]{auth="SFC" ref="SFC-07-0012"}, :c[facilities.DELTA-03.anchor.state]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Depth | :r[At grade]{tier=1 auth="FE" ref="FE-07-0012"} |
| Cover identity | :r[:c[facilities.DELTA-03.coverIdentity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="CVO" ref="CVO-07-012"} |
| Completed | :r[:c[facilities.DELTA-03.completed]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="FE" ref="FE-07-0012"} |
| Berthing | :r[:c[facilities.DELTA-03.capacity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="LR" ref="LR-07-0012"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-03.staff]{auth="SFC" ref="SFC-07-0012"}]{tier=2 auth="SFC" ref="SFC-06-0163"} |
| Construction primes | PC-09, PC-27 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="LR-07-0012"}
:c[facilities.DELTA-03.function]{auth="SFC" ref="SFC-07-0012"} Cover: :c[facilities.DELTA-03.coverStory]{auth="SFC" ref="SFC-07-0012"} Site: :c[facilities.DELTA-03.terrain]{auth="SFC" ref="SFC-07-0012"}
:::

Released notes:

- :c[calendar.CAL-0805-20.title], 16 MAY 2008, :c[calendar.CAL-0805-20.timeText]. Rotating guard to countersign the count sheets.
- Generator fuel rotation last completed 11 APR 2008. Next rotation :r[due 11 JUL 2008, delivered on the cover operator's bulk fuel account]{tier=1 auth="LR" ref="LR-07-0012"}.

Class standard: :x[OSC-FAC-CLS-DELTA].
