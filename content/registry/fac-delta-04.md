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
    - { label: Class, value: "DELTA (Safe Houses & Caches)" }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2005-06-30, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Codename entered; annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[:c[facilities.DELTA-04.codename]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="CS" ref="CS-07-012"} |
| Location | :r[:c[facilities.DELTA-04.locationText]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Map reference | :r[:c[facilities.DELTA-04.anchor.miles]{auth="SFC" ref="SFC-07-0012"} mi :c[facilities.DELTA-04.anchor.bearing]{auth="SFC" ref="SFC-07-0012"} of :c[facilities.DELTA-04.anchor.city]{auth="SFC" ref="SFC-07-0012"}, :c[facilities.DELTA-04.anchor.state]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Depth | :r[:c[facilities.DELTA-04.depthFt]{auth="SFC" ref="SFC-07-0012"} ft below grade]{tier=1 auth="FE" ref="FE-07-0012"} |
| Cover identity | :r[:c[facilities.DELTA-04.coverIdentity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="CVO" ref="CVO-07-012"} |
| Completed | :r[:c[facilities.DELTA-04.completed]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="FE" ref="FE-07-0012"} |
| Berthing | :r[:c[facilities.DELTA-04.capacity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="LR" ref="LR-07-0012"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-04.staff]{auth="SFC" ref="SFC-07-0012"}]{tier=2 auth="SFC" ref="SFC-06-0163"} |
| Construction primes | PC-15, PC-22 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="LR-07-0012"}
:c[facilities.DELTA-04.function]{auth="SFC" ref="SFC-07-0012"} Cover: :c[facilities.DELTA-04.coverStory]{auth="SFC" ref="SFC-07-0012"} Site: :c[facilities.DELTA-04.terrain]{auth="SFC" ref="SFC-07-0012"}
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
