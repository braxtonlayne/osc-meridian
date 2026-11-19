---
id: transit-net-sou
route: /transit/network/sou
app: transit
family: transit
template: record
docNo: OSC-TRN-NET-SOU
title: "Network Sheet: Southern Network (hub ALPHA-05)"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 3
date: 2008-01-31
facility: ALPHA-05
summary: Network sheet for the Southern tram network, hub ALPHA-05. Eight links with engineering miles and running times, network total, consist diagram, flood protection and link designations.
xrefs: [OSC-TRN-TT-08-02, OSC-TRN-ENG, OSC-FAC-ALPHA-05, OSC-TRN-NET-CEN]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-05
  - Southern Network platform supervisors
  - Transit Operations file TO/NET/SOU
recordType: NETWORK SHEET
fields:
  - { label: Network, value: "Southern Network" }
  - { label: Network code, value: "SO (consists TSO-nnn)", mono: true }
  - { label: Hub, value: "ALPHA-05, Level 11, platforms 3 to 6" }
  - { label: Links, value: "Eight" }
  - { label: Local control, value: "Transit Control desk, ALPHA-05, under Network Control" }
  - { label: File, value: "TO/NET/SOU", mono: true }
revisions:
  - { rev: "1", date: "2006-04-28", change: "First issue.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2007-07-31", change: "Flood door tests added for coastal termini.", by: "TO/ALPHA-01" }
  - { rev: "3", date: "2008-01-31", change: "Annual reissue.", by: "TO/ALPHA-01" }
---

**System:** :c[transitTech.tramSystem]. **Speed basis:** :c[transitTech.tramSpeed]. **Depth band:** :c[transitTech.averageDepth].

## Link register (engineering)

Eight links, S1 to S8, in register order. Miles are engineering miles from link survey.

::canon-table{source="tramNetworks.links" filter="network=SOUTHERN" cols="kind:Far-end class,miles:Engineering miles,hours:Running time (h)" caption="Southern Network: links S1 to S8 in register order"}

| Network total | Miles |
|---|---|
| Total, Southern Network, engineering | :c[tramNetworks.SOUTHERN.statedTotalMi] |

Total equals the sum of the register.

## Link designations

:::redact{compartment=SEXTANT auth="TO" ref="TO-07-313"}
| Link | From | To | Label |
|---|---|---|---|
| S1 | ALPHA-05 | BETA-03 | (Atlanta) |
| S2 | ALPHA-05 | BETA-12 | (New Orleans) |
| S3 | ALPHA-05 | BETA-05 | (Kansas City) |
| S4 | BETA-03 | GAMMA-05 | (Charlotte) |
| S5 | BETA-03 | GAMMA-06 | (Miami) |
| S6 | BETA-12 | GAMMA-16 | (Nashville) |
| S7 | ALPHA-05 | GAMMA-08 | (Dallas) |
| S8 | ALPHA-05 | GAMMA-09 | (Houston) |

BETA-05 is also the origin of a Central Network link; the consist for that link is worked from this network's stabling at BETA-05.
:::

## Hub platforms and consist diagram

| Platform (ALPHA-05 L11) | Links worked | Diagrammed consists | Stabled overnight |
|---|---|---|---|
| 3 | S1 | TSO-008 | At far end |
| 4 | S2 | TSO-012 | Platform 4 |
| 5 | S3 | TSO-015 | At far end |
| 6 | S7, S8 | TSO-030, TSO-033 | Platform 6 road, 2 consists |

Second-order links (S4, S5, S6) are worked by consists stabled at their junction stations: TSO-021, TSO-023, TSO-027. Spare: TSO-036 at ALPHA-05.

Platforms 1 and 2 at ALPHA-05 are inter-hub rail and are not part of this network. Platform 7 is not part of this network.

## Flood protection

Three termini on this network lie under coastal or low-lying cover sites. Their tram portals carry flood doors in addition to the seal doors. Flood doors are tested before 01 JUN each year, before the start of the hurricane season, under a possession of the link concerned. For 2008 the tests are to be booked by 23 MAY 2008. A terminus whose flood door fails its test is closed to booked paths until retested.

## Working notes

- S1 is the longest link on this network. Its crew is relieved at the S1 passing loop by a crew carried out on the previous path. Passengers travelling from the hub to the far end of S5 change at the junction station and are booked on two paths.
- S7 and S8 run direct from the hub. They are worked from platform 6 as a pair and share one crew.
- Dwell at the hub is 10 minutes. Late running on S2 is common in summer owing to portal ventilation limits at the far end; Network Control does not hold connecting paths for it.

Approved D. Harker, Director, Transit Operations. 31 JAN 2008.
