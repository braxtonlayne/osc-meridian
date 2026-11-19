---
id: drill-site-card
route: /drill/site-card
app: drill
family: drill
template: record
docNo: OSC-DIR-0433-B
title: "Annex B: Site Action Card, Seal Drill (Personnel Shelters)"
marking: UMBRA-U
originator: TO/ALPHA-01
revision: 2
date: 2008-02-25
t4: true
summary: Site action card for a seal drill at a personnel shelter. Acknowledge on receipt, close the seal doors in order, report sealed, hold, and reopen on stand-down.
xrefs: [OSC-DIR-0433]
distribution:
  - Duty officers, personnel shelters
  - Environmental systems watch, personnel shelters (posted at the plant room)
recordType: SITE ACTION CARD
fields:
  - { label: Applies to, value: "Personnel shelters (GAMMA class)" }
  - { label: Posted at, value: "Duty officer's desk and plant room" }
  - { label: Issued by, value: "Transit Operations (Network Control)" }
  - { label: Effective, value: 03 MAR 2008 }
  - { label: Supersedes, value: "Revision 1 (12 NOV 2007)" }
revisions:
  - { rev: "2", date: 25 FEB 2008, change: "Report sealed by the watch from the site order position. NO REPORT rule stated.", by: TO/ALPHA-01 }
  - { rev: "1", date: 12 NOV 2007, change: "Initial issue.", by: TO/ALPHA-01 }
---

## Times

Counted from the moment the order is received at this site.

::canon-table{source="sealDrill.classes" cols="ackMin:Acknowledge by (min),doorCycleMin:Door cycle (min),sealMin:Report sealed by (min)" filter="classId=GAMMA" caption="Personnel shelter seal times"}

A site that has not reported sealed by twice the report time is carried as NO REPORT.

## Action

1. **Receipt.** The order arrives on the tram order wire or by voice call and shows ORDER RECEIVED at the site order position. Note the time.
2. **Acknowledge.** The duty officer, or the watch if the duty officer is at the gate, presses ACK ORDER. Do not wait for the gate to clear.
3. **Close.** Close the seal doors in this order: entry portal door, entry blast door, second portal and blast door where fitted, tram tunnel portal door where fitted, personnel airlock (both leaves). Air handling to the seal closure per the panel procedure.
4. **Report.** When every seal door shows CLOSED AND DOGGED on the door board, press REPORT SEALED. Do not report on sight of the doors alone.
5. **Hold.** No entry or exit while sealed. Persons outside wait at the surface muster point.
6. **Stand down.** On STAND DOWN or ABORTED, open the seal doors in the reverse order and return air handling to normal.

## If something does not work

- A seal door that will not close: report sealed only when it is closed. Tell the duty officer. Do not hold it open to wait for a report window.
- No order received but the network is reported in a drill: take no action. The site acts only on an order received here.
- An indication at the order position that does not agree with the doors: write it in the watch log and tell the duty officer.
