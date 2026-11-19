---
id: reserves-arms
route: /reserves/arms
app: reserves
family: reserves
template: record
docNo: OSC-RSV-ARMS
title: Armaments Reserve
marking: UMBRA-C
originator: SFC/ALPHA-02
revision: 4
date: 2008-03-03
access: { tier: 2 }
xrefs: [OSC-RSV-IDX, OSC-PER-BR-SEC]
summary: Small arms and ammunition held in reserve, the issue basis, and the two-person rule for armament bays.
recordType: RESERVE RECORD
fields:
  - { label: Record, value: OSC-RSV-ARMS, mono: true }
  - { label: Category, value: ARMAMENTS }
  - { label: Custodian, value: "Security Forces Command, Armament Issue Branch" }
  - { label: Holding sites, value: "ALPHA-05 Level 7 (Reserves Stacks); site armories" }
  - { label: Bay control, value: "Two-person rule" }
  - { label: Count cycle, value: "Monthly by serial; quarterly by lot" }
revisions:
  - { rev: "4", date: "2008-03-03", change: "Q1 2008 serial count; replacement deliveries entered.", by: "SFC Armament Issue Branch" }
  - { rev: "3", date: "2007-12-03", change: "Issue table restated by position.", by: "SFC Armament Issue Branch" }
---

## Holdings

| Item | Holding | Stated basis |
|---|---|---|
| Small arms | :c[reserves.items.ARMS-SMALL.value]{auth="SFC" ref="SFC-07-0068"} weapons | :c[reserves.items.ARMS-SMALL.text]{auth="SFC" ref="SFC-07-0068"} |
| Ammunition | :c[reserves.items.ARMS-AMMUNITION.value]{auth="SFC" ref="SFC-07-0068"} rounds | All calibres on issue |
| Heavy weapon systems | :r[Holdings by system type and bay]{tier=1 auth="CS" ref="CS-07-012"} | :c[reserves.items.ARMS-HEAVY.text]{auth="SFC" ref="SFC-07-0068"} |

Small arms are counted by serial number, whether on issue, in a site armory or in the Reserves Stacks. Weapons in repair at the ALPHA-02 armourer's shop are counted. Weapons awaiting disposal are not.

## Issue table

| Line | Entry |
|---|---|
| Weapons per armed position at full capacity | 1 |
| Reserve per armed position | 4 |
| Weapons per armed position, full capacity plus reserve | 5 |
| Armed positions on the issue basis | :c[anomalies.ARMS_RESERVE.figures.impliedEquippedStrength] |
| Holding | :c[reserves.items.ARMS-SMALL.value]{auth="SFC" ref="SFC-07-0068"} |

Armed positions are established by Security Forces Command post orders for each site and are not the same as security forces strength. See :x[OSC-PER-BR-SEC].

## Armament bays

1. Armament bays at the Reserves Stacks (ALPHA-05 Level 7) and every site armory are under two-person control at all times. No person is to be alone in an armament bay, including during the count.
2. The two persons are drawn from different watches. One must be a Security Forces non-commissioned officer or above. Both sign the bay log on entry and on exit with the time in Zulu.
3. Bay keys and combinations are held separately. A key holder does not hold the combination for the same bay.
4. A bay log showing a single entry signature is reported to the Commandant, Security Forces Command, as a security incident, whether or not the bay was opened.
5. Ammunition is stored in lots by calibre in separate bays from the weapons it fits.

## Count, Q1 2008

| Count | Date | Variance | Remarks |
|---|---|---|---|
| Serial count, all sites | 25 FEB 2008 | None | |
| Lot count, ammunition | 25 FEB 2008 | 3 cases | Re-counted 26 FEB 2008; cases found in the adjoining bay, lot labels transposed. Corrected. |
| Replacement deliveries | JAN to FEB 2008 | | 1,140 weapons received under cover line LI-084; an equal number of worn weapons taken off count for disposal. |

## Heavy weapon systems

:::redact{tier=1 auth="CS" ref="CS-07-012"}
Heavy weapon systems are held under the Council schedule and are not reported on this record. The schedule lists each system by type, bay and serial with the authority for its release.
:::

Point of contact: Armament Issue Branch, Security Forces Command, ALPHA-02, extension 2-1655.
