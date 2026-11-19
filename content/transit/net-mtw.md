---
id: transit-net-mtw
route: /transit/network/mtw
app: transit
family: transit
template: record
docNo: OSC-TRN-NET-MTW
title: "Network Sheet: Mountain/Western Network (hub ALPHA-02 and ALPHA-04)"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 3
date: 2008-01-31
summary: Network sheet for the Mountain/Western tram network, hubs ALPHA-02 and ALPHA-04. Nine links with engineering miles and running times, network total, division of the network between the two hubs, depots and link designations.
xrefs: [OSC-TRN-TT-08-02, OSC-TRN-ENG, OSC-FAC-ALPHA-02, OSC-FAC-ALPHA-04, OSC-TRN-SEG-03]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-02
  - Platform supervisors, ALPHA-02 and ALPHA-04
  - Tram depot, ALPHA-04 Level 9
  - Transit Operations file TO/NET/MTW
recordType: NETWORK SHEET
fields:
  - { label: Network, value: "Mountain/Western Network" }
  - { label: Network code, value: "MW (consists TMW-nnn)", mono: true }
  - { label: Hubs, value: "ALPHA-02 (Level 11, platforms 4 to 6); ALPHA-04 (Level 10, platforms 2 to 4)" }
  - { label: Links, value: "Nine" }
  - { label: Hub connection, value: "Rail Segment 03 (no tram link between the hubs)" }
  - { label: File, value: "TO/NET/MTW", mono: true }
revisions:
  - { rev: "1", date: "2006-10-31", change: "First issue, ALPHA-02 sub-network only.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2007-09-28", change: "ALPHA-04 sub-network added; sheets combined.", by: "TO/ALPHA-01" }
  - { rev: "3", date: "2008-01-31", change: "Annual reissue.", by: "TO/ALPHA-01" }
---

## 1. Description

The Mountain/Western Network is worked as two sub-networks, one from each hub, joined only by rail Segment 03 (:x[OSC-TRN-SEG-03]). No tram link runs between ALPHA-02 and ALPHA-04. Tram stock moving between the sub-networks travels by rail on a flat consist.

ALPHA-04 is described in its facility record as follows: ":c[facilities.ALPHA-04.connectionsText]{auth="TO" ref="TO-07-313"}" For working purposes it is the hub of sub-network W and is treated as a full hub by Network Control.

System: :c[transitTech.tramSystem], :c[transitTech.tramSpeed]. Depth band :c[transitTech.averageDepth].

## 2. Link register (engineering)

Links M1 to M9 in register order. M1 to M3 are worked from ALPHA-02 (sub-network M); M4, M5 and M9 from ALPHA-04 (sub-network W); M6 to M8 are second-order links worked from their junction stations.

::canon-table{source="tramNetworks.links" filter="network=MOUNTAIN_WESTERN" cols="kind:Far-end class,miles:Engineering miles,hours:Running time (h)" caption="Mountain/Western Network: links M1 to M9 in register order"}

| Network total | Miles |
|---|---|
| Total, Mountain/Western Network, engineering | :c[tramNetworks.MOUNTAIN_WESTERN.statedTotalMi] |

## 3. Link designations

| Link | Sub-network | From | To | Label |
|---|---|---|---|---|
| M1 | M | ALPHA-02 | :r[BETA-04]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Minneapolis)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M2 | M | ALPHA-02 | :r[BETA-11]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Salt Lake City)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M3 | M | ALPHA-02 | :r[BETA-06]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Phoenix)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M4 | W | ALPHA-04 | :r[BETA-07]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Seattle)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M5 | W | ALPHA-04 | :r[BETA-08]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Las Vegas)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M6 | W | :r[BETA-07]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[GAMMA-13]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Portland)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M7 | W | :r[BETA-08]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[GAMMA-11]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Los Angeles)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M8 | M | :r[BETA-11]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[GAMMA-14]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(Boise)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |
| M9 | W | ALPHA-04 | :r[GAMMA-12]{compartment=SEXTANT auth="TO" ref="TO-07-313"} | :r[(San Francisco)]{compartment=SEXTANT auth="TO" ref="TO-07-313"} |

## 4. Division of responsibility

| Function | Sub-network M (ALPHA-02) | Sub-network W (ALPHA-04) |
|---|---|---|
| Platform working | ALPHA-02 platform supervisor | ALPHA-04 platform supervisor |
| Possessions | Transit Control desk, ALPHA-02 | Transit Control desk, ALPHA-02, by telephone to ALPHA-04 |
| Stabling | Hub roads and junction station | ALPHA-04 Level 9 tram depot, 6 roads |
| Heavy maintenance | Tunnel maintenance depot, ALPHA-02 Level 10 | Sent to ALPHA-02 by rail over Segment 03 |
| Seismic trips | Not fitted | Fitted on M4, M5, M6, M9 |

## 5. Working notes

- Seismic isolation bearing inspection at the M4 far-end tram portal, 12 MAY 2008, is visual only and needs no possession.
- M4 is the longest tram link on the four networks. Crew relief at the passing loop as on the Southern Network.
- Desert-section portals (M5, M7) run summer ventilation settings from 15 MAY. Expect portal temperature alarms on the board in the afternoon; these are acknowledged by Network Control, not reported.
- Tram stock for sub-network W does not run in service on sub-network M and is not to be borrowed for it.

Approved D. Harker, Director, Transit Operations. 31 JAN 2008.
