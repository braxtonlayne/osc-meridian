---
id: transit-net-cen
route: /transit/network/cen
app: transit
family: transit
template: record
docNo: OSC-TRN-NET-CEN
title: "Network Sheet: Central Network (hub ALPHA-03)"
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 3
date: 2008-01-31
facility: ALPHA-03
summary: Network sheet for the Central tram network, hub ALPHA-03. Four links with endpoints, engineering miles and running times, network total, platform 3 working, records consignments and stabling.
xrefs: [OSC-TRN-TT-08-02, OSC-TRN-ENG, OSC-FAC-ALPHA-03, OSC-FAC-BETA-09, OSC-DIR-0262, OSC-DIR-0336]
distribution:
  - Network Control, ALPHA-01
  - Platform supervisor, ALPHA-03
  - Records Division reception, ALPHA-03 (consignment notes, section 5)
  - Transit Operations file TO/NET/CEN
recordType: NETWORK SHEET
fields:
  - { label: Network, value: "Central Network" }
  - { label: Network code, value: "CE (consists TCE-nnn)", mono: true }
  - { label: Hub, value: "ALPHA-03, Level 12, platform 3" }
  - { label: Links, value: "Four" }
  - { label: Controlled from, value: "Network Control, ALPHA-01" }
  - { label: File, value: "TO/NET/CEN", mono: true }
revisions:
  - { rev: "1", date: "2006-12-15", change: "First issue.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2007-08-31", change: "Link C4 added to this sheet for working and accounting.", by: "TO/ALPHA-01" }
  - { rev: "3", date: "2008-01-31", change: "Annual reissue. Records consignment procedure added (section 5).", by: "TO/ALPHA-01" }
---

## 1. System

:c[transitTech.tramSystem] at :c[transitTech.tramSpeed]. Single bore, single track, passing loops at mid-link on C1 and C3. Depth band :c[transitTech.averageDepth]. Lengths are engineering lengths from link survey.

## 2. Link register

Links C1 to C4 in register order.

::canon-table{source="tramNetworks.links" filter="network=CENTRAL" cols="from:From,to:To,label:Label,kind:Far-end class,miles:Engineering miles,hours:Running time (h)" caption="Central Network: links C1 to C4 in register order"}

| Network total | Miles |
|---|---|
| Total, Central Network, engineering | :c[tramNetworks.CENTRAL.statedTotalMi] |

The network total is the sum of C1 to C4.

## 3. Notes on the register

a. The hub has one tram link (C1). BETA-09 is the junction station for C2 and C3 and has two platforms and stabling for two consists.

b. Link C4 is carried on this sheet for working and accounting. BETA-05 is not served from this hub; its feed is carried on another network sheet. The C4 consist is provided from outside the Central Network and is stabled at BETA-05.

c. C2 and C4 share a terminus. Paths are arranged so that the two links do not occupy the terminus platform at the same time.

## 4. Platform 3, ALPHA-03

Platform 3 is on Level 12, beside the inter-hub platforms 1 and 2. It takes one consist. Passengers for C1 assemble at the Level 12 barrier not earlier than 20 minutes before departure and show their F-109 travel authorization and badge (:x[OSC-DIR-0262]). Baggage over two pieces travels in the van compartment and is labelled at the barrier.

Platform 3 shares ventilation shaft 05-V1 with inter-hub Segment 05. When the shaft fans are on maintenance, platform 3 runs on reduced supply and dwell is held to 10 minutes.

## 5. Records consignments

Records moving between the regional analysis cells and the ALPHA-03 stacks travel on C1 in the locked van compartment.

- Consignments are made up by the sending station and carry a consignment note with the Records Division accession reference where one has been issued (:x[OSC-DIR-0336]).
- The van compartment is locked at the sending station and opened only at the ALPHA-03 Level 12 barrier, in the presence of a Records Division reception clerk.
- Consignment notes are signed by the clerk and the platform supervisor. A consignment arriving without a note is held at the barrier and Records Division reception is called.
- Network Control does not record the contents of consignments.

## 6. Stabling and maintenance

| Consist | Diagram | Stabled |
|---|---|---|
| TCE-011 | C1 | ALPHA-03 platform 3 road (overnight) |
| TCE-014 | C2 | BETA-09 |
| TCE-016 | C3 | BETA-09 |
| TCE-019 | C4 | BETA-05 |
| TCE-020 | Spare | ALPHA-03 platform 3 road (second berth) |

Daily inspection at the stabling point. Heavy maintenance at the ALPHA-02 depot; consists travel by rail.

Paths: :x[OSC-TRN-TT-08-02]. Engineering summary: :x[OSC-TRN-ENG].

Approved D. Harker, Director, Transit Operations. 31 JAN 2008.
