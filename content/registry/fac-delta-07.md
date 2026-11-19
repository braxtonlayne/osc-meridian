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
    - { label: Class, value: "DELTA (Safe Houses & Caches)" }
    - { label: Transit, value: No integrated transit connections }
    - { label: Detailed record, value: Tier 1 }
revisions:
  - { rev: "1", date: 2007-02-28, change: Record opened on completion, by: FE/ALPHA-02 }
  - { rev: "2", date: 2008-04-30, change: Annual register review, by: FE/ALPHA-02 }
---

| Field | Entry |
|---|---|
| Codename | :r[None assigned]{tier=1 auth="CS" ref="CS-07-012"} |
| Location | :r[:c[facilities.DELTA-07.locationText]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Map reference | :r[:c[facilities.DELTA-07.anchor.miles]{auth="SFC" ref="SFC-07-0012"} mi :c[facilities.DELTA-07.anchor.bearing]{auth="SFC" ref="SFC-07-0012"} of :c[facilities.DELTA-07.anchor.city]{auth="SFC" ref="SFC-07-0012"}, :c[facilities.DELTA-07.anchor.state]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="SFC" ref="SFC-07-0012"} |
| Depth | :r[:c[facilities.DELTA-07.depthFt]{auth="SFC" ref="SFC-07-0012"} ft below grade]{tier=1 auth="FE" ref="FE-07-0012"} |
| Cover identity | :r[:c[facilities.DELTA-07.coverIdentity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="CVO" ref="CVO-07-012"} |
| Completed | :r[:c[facilities.DELTA-07.completed]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="FE" ref="FE-07-0012"} |
| Berthing | :r[:c[facilities.DELTA-07.capacity]{auth="SFC" ref="SFC-07-0012"}]{tier=1 auth="LR" ref="LR-07-0012"} |
| Sustainability | :c[classes.DELTA.sustainabilityText] |
| Rotating guard | :r[:c[facilities.DELTA-07.staff]{auth="SFC" ref="SFC-07-0012"}]{tier=2 auth="SFC" ref="SFC-06-0163"} |
| Construction primes | PC-22, PC-23 (see :x[OSC-ASR-CTR]) |

Function and remarks:

:::redact{tier=1 auth="LR" ref="LR-07-0012"}
:c[facilities.DELTA-07.function]{auth="SFC" ref="SFC-07-0012"} Cover: :c[facilities.DELTA-07.coverStory]{auth="SFC" ref="SFC-07-0012"} Site: :c[facilities.DELTA-07.terrain]{auth="SFC" ref="SFC-07-0012"}
:::

Released notes:

- :c[calendar.CAL-0805-28.title], 22 MAY 2008, :c[calendar.CAL-0805-28.timeText].
- Key control. At the 14 APR 2008 changeover the key register showed one key more than the cabinet held (padlock key, vehicle bay :r[2, north door]{tier=1 auth="SFC" ref="SFC-07-0012"}). Outgoing and incoming guard signed the count as found. Referred to SFC for reconciliation at the next changeover; register annotated.

Class standard: :x[OSC-FAC-CLS-DELTA].
