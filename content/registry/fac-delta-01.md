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
    - { label: Class, value: "DELTA (Safe Houses & Caches)" }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2005-10-31, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="CS-07-012"} |
| Location | :r[:c[facilities.DELTA-01.locationText]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Map reference | :r[:c[facilities.DELTA-01.anchor.miles]{auth="SFC" ref="SFC-07-0012"} mi :c[facilities.DELTA-01.anchor.bearing]{auth="SFC" ref="SFC-07-0012"} of :c[facilities.DELTA-01.anchor.city]{auth="SFC" ref="SFC-07-0012"}, :c[facilities.DELTA-01.anchor.state]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Depth | :r[:c[facilities.DELTA-01.depthFt]{auth="SFC" ref="SFC-07-0012"} ft below grade]{tier=1 auth="FE" ref="FE-07-0012"} |
| Cover identity | :r[:c[facilities.DELTA-01.coverIdentity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="CVO" ref="CVO-07-012"} |
| Completed | :r[:c[facilities.DELTA-01.completed]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="FE" ref="FE-07-0012"} |
| Berthing | :r[:c[facilities.DELTA-01.capacity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="LR" ref="LR-07-0012"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-01.staff]{auth="SFC" ref="SFC-07-0012"}]{tier=2 auth="SFC" ref="SFC-06-0163"} |
| Construction prime | PC-05 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="LR-07-0012"}
:c[facilities.DELTA-01.function]{auth="SFC" ref="SFC-07-0012"} Cover: :c[facilities.DELTA-01.coverStory]{auth="SFC" ref="SFC-07-0012"} Site: :c[facilities.DELTA-01.terrain]{auth="SFC" ref="SFC-07-0012"}
:::

Notes: none released.

Class standard: :x[OSC-FAC-CLS-DELTA].
