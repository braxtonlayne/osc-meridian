---
id: transit-net-eas
route: /transit/network/eas
app: transit
family: transit
template: record
docNo: OSC-TRN-NET-EAS
title: "Network Sheet: Eastern Network (hub ALPHA-01)"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 3
date: 2008-01-31
facility: ALPHA-01
summary: Network sheet for the Eastern tram network, hub ALPHA-01. Link register with engineering miles and running times, network total, topology, platforms, stabling and link designations.
xrefs: [OSC-TRN-TT-08-02, OSC-TRN-ENG, OSC-FAC-ALPHA-01, OSC-SYS-CAL]
distribution:
  - Network Control, ALPHA-01
  - Eastern Network platform supervisors
  - Tram maintenance, ALPHA-01 Level 13
  - Transit Operations file TO/NET/EAS
recordType: NETWORK SHEET
fields:
  - { label: Network, value: "Eastern Network" }
  - { label: Network code, value: "EA (consists TEA-nnn)", mono: true }
  - { label: Hub, value: "ALPHA-01, Level 13, platforms 4 and 5" }
  - { label: Links, value: "Six" }
  - { label: Controlled from, value: "Network Control, ALPHA-01" }
  - { label: File, value: "TO/NET/EAS", mono: true }
revisions:
  - { rev: "1", date: "2006-06-30", change: "First issue (four links in service).", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2007-05-15", change: "Links L5 and L6 entered service.", by: "TO/ALPHA-01" }
  - { rev: "3", date: "2008-01-31", change: "Annual reissue. Running times confirmed against network survey.", by: "TO/ALPHA-01" }
---

## 1. System

:c[transitTech.tramSystem], :c[transitTech.tramSpeed]. Tunnels lie in the network depth band (:c[transitTech.averageDepth]). Links are single bore, single track with passing loops at the mid-point of every link over 150 mi. Lengths below are engineering lengths from link survey. They are the figures used by Network Control and for possession planning.

## 2. Link register

Links L1 to L6, in register order.

::canon-table{source="tramNetworks.links" filter="network=EASTERN" cols="kind:Far-end class,miles:Engineering miles,hours:Running time (h)" caption="Eastern Network: links L1 to L6 in register order"}

| Network total | Miles |
|---|---|
| Total, Eastern Network, engineering | :c[tramNetworks.EASTERN.statedTotalMi] |

The network total is the sum of the link register.

## 3. Link designations

| Link | From | To | Label |
|---|---|---|---|
| L1 | ALPHA-01 | :r[BETA-01]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(Maine)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| L2 | ALPHA-01 | :r[BETA-02]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(Pittsburgh)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| L3 | ALPHA-01 | :r[BETA-10]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(Chicago)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| L4 | :r[BETA-02]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[GAMMA-03]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(DC Metro)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| L5 | :r[BETA-02]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[GAMMA-04]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(Philadelphia)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |
| L6 | :r[BETA-10]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[GAMMA-07]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} | :r[(Detroit)]{compartment=SEXTANT auth="TO" ref="OSC-CB-013"} |

## 4. Topology

Three first-order links leave the hub. Two of the far-end stations are themselves junctions: one has two second-order links, the other one. All second-order links terminate at GAMMA-class stations with a single platform and no stabling. Passing loops: L1, L2, L3, L5 and L6.

## 5. Platforms, stabling and maintenance

| Location | Platforms | Stabling | Maintenance |
|---|---|---|---|
| ALPHA-01, Level 13 | 4 and 5 | 3 consists | Daily inspection; brake tests; heavy work sent to the ALPHA-02 depot by rail flat |
| Junction station of L2, L4, L5 | 2 | 2 consists | Daily inspection |
| Junction station of L3, L6 | 1 | 1 consist | Daily inspection |
| Other termini | 1 each | None | Visual only |

## 6. Working notes

- TEA-series consists returning from overhaul run one loaded brake test before their first booked path (notice of 21 APR 2008 in the timetable).
- Link L4 track inspection is booked under possession for 22 MAY 2008, 0400Z-0800Z (0000-0400 EDT); see :x[OSC-SYS-CAL] and the possession register.
- Platform 5 at ALPHA-01 is lit at standby between the last and first paths. Platform staff are not to switch lighting to full outside booked times.

Paths: :x[OSC-TRN-TT-08-02]. Engineering summary: :x[OSC-TRN-ENG].

Approved D. Harker, Director, Transit Operations. 31 JAN 2008.
