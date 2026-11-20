---
id: dispatch-reference
route: /dispatch/reference
app: dispatch
family: dispatch
template: record
docNo: OSC-TRN-DSP-02
title: "Route and Signal Reference Sheet, Transit Control Desk ALPHA-02"
marking: UMBRA-C
originator: TO/ALPHA-02
revision: 4
date: 2008-04-28
access: { tier: 3 }
summary: Desk reference card for panel PNL-TO-0204. Controls and keys, annunciator windows, interlocking refusals, and the spare stock list carried at the desk.
xrefs: [OSC-TRN-DSP-01, OSC-TRN-RS, OSC-TRN-SEG-04, OSC-TRN-TT-08-02]
distribution:
  - Transit Control desk, ALPHA-02 (posted at the desk)
  - Transit Operations file TO/DSP
recordType: DESK REFERENCE CARD
fields:
  - { label: Panel, value: "PNL-TO-0204 REV B", mono: true }
  - { label: Desk, value: "Transit Control, ALPHA-02 Level 11" }
  - { label: Procedure, value: "OSC-TRN-DSP-01", mono: true }
revisions:
  - { rev: "3", date: "2007-11-15", change: "TCE spare entered.", by: "TO/ALPHA-02" }
  - { rev: "4", date: "2008-04-28", change: "Desk possession TC-POS-08-051 entered. R03-055 in works.", by: "TO/ALPHA-02" }
---

## 1. Desk controls

| Control | Key | Action |
|---|---|---|
| SET ROUTE | F5 | Interlocking checks and sets the entered route |
| CANCEL ROUTE | Esc | Releases the route; signals to danger |
| CLEAR SIGNALS | F6 | Proves the route for the selected consist; starter to PROCEED |
| DISPATCH | F7 | Enters the movement on the dispatch log |
| HOLD | F8 | Holds the selected movement at its next platform |
| RELEASE | F9 | Releases the selected held movement |
| DEPART switch | | Departure now or after the minutes shown |
| DESK key | | LIVE or TRAINING. Removable in TRAINING only |
| SEG 04 WORKING key | | See :x[OSC-TRN-DSP-01] section 7 |

## 2. Annunciator

| Window | Lit when |
|---|---|
| ROUTE CONFLICT | The last route offered was refused for headway or an opposing movement |
| POSSESSION IN FORCE | The last route offered crosses a possession |
| SEG 04 NOT IN SERVICE | A route over segment 04 was offered, or is set |
| NETWORK ISOLATED | Network isolation in force; all movements held |
| SEAL DRILL PORTALS SHUT | A seal drill is in progress; portal seal doors closed |
| TRAIN HELD | A movement entered at the desk is held |
| RELEASE TC/A05 | Waiting for a release from the ALPHA-05 desk |

ACK silences the horn. RESET clears a window that has returned to normal.

## 3. Interlocking refusals

| Message | Meaning |
|---|---|
| Segment 04 is not in revenue service | No route over the segment in position NORMAL |
| Engineering working ... No possession is in force | Position ENGRG without a possession on the segment |
| A route is set over one system | Rail and tram links mixed in one route |
| Opposing movement ... single line | A booked path or entered movement runs the other way on the link |
| ... inside minimum headway | A movement in the same direction is too close |
| Possession ... in force | The link is under possession |
| Route setting and signal clearance are suspended | Network isolated |
| Portal seal doors are closed | Seal drill in progress |

## 4. Spare stock carried at the desk

The desk lists spare stock from the rolling stock register (:x[OSC-TRN-RS]) and where each consist stands. Rail spares: R01-201, R02-101, R03-050, R05-030 and R06-010 at the ALPHA-02 depot; R01-219 at ALPHA-01 platform 1 road. Tram spares: TEA-048 (ALPHA-01), TSO-036 (ALPHA-05), TCE-020 (ALPHA-03). Listed but not available: R03-055 and TMW-033 (in works), R04-001 and R04-002 (not in service).

## 5. Desk possessions

| Possession | Limits | Times | Granted by |
|---|---|---|---|
| TC-POS-08-051 | Tram link BETA-07 to GAMMA-13 | 19 MAY 2008, 0000Z to 2359Z | TC/ALPHA-04 |

Card posted at the desk. Replace when the revision changes.
