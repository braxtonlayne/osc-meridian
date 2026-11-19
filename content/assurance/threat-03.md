---
id: assurance-threat-03
route: /assurance/threat/03
app: assurance
family: assurance
template: record
docNo: OSC-ASR-THR-03
title: "Threat Register Entry 03: Conventional Military"
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 3
date: 2008-02-28
summary: Threat (external), source response and contingency paragraphs owned by Security Forces Command.
xrefs: [OSC-ASR-CG, OSC-ASR-COV, OSC-PER-BR-SEC, OSC-DIR-0163]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Commandant, Security Forces Command (ALPHA-02)
  - Director, Cover Operations (ALPHA-04)
  - Facility Commanders, ALPHA and BETA sites
recordType: THREAT REGISTER ENTRY
fields:
  - { label: Register, value: OIA Threat and Contingency Register }
  - { label: Entry, value: "03", mono: true }
  - { label: Threat group, value: External }
  - { label: Owning office, value: Security Forces Command (SFC/ALPHA-02) }
  - { label: Register custodian, value: Office of Internal Assurance }
  - { label: Contingency protocol, value: OSC-CP-03, mono: true }
  - { label: Last review, value: 28 FEB 2008 }
  - { label: Next review, value: 29 AUG 2008 }
revisions:
  - { rev: "3", date: 28 FEB 2008, change: "Semi-annual review. No change to contingency paragraphs.", by: OIA/ALPHA-01 }
  - { rev: "2", date: 30 AUG 2007, change: "Paragraph 2.2 added (surface cover staff).", by: OIA/ALPHA-01 }
  - { rev: "1", date: 14 MAR 2006, change: "Entry created from the Council threat assessment.", by: OIA/ALPHA-01 }
---

## 1. Threat

**:c[threatDetail.EXT-CONVENTIONAL.label].**

> :c[threats.external.EXT-CONVENTIONAL.response]

Owning office: :c[threatDetail.EXT-CONVENTIONAL.ownerDivision]. Post orders implementing this entry are issued by the Commandant and are not reproduced here.

## 2. Contingency

2.1 Facilities are hardened against direct strike, and depth is sufficient to survive surface detonation. The surface cover facility is not defended as such; its loss is planned for.

2.2 Security forces hold the shaft collars and portal approaches. Surface cover staff with no OSC access are evacuated under the cover agency's own procedures.

:::redact{compartment=BRIAR auth="OIA" ref="OIA-PROT-03"}
2.3 Shaft collars and portals are closed on the order of the post commander when the approach can no longer be held. Closure is not delayed for personnel on the approach, including security forces personnel.

2.4 Surface cover staff are not informed of the installation and are not admitted to it in any state. Their evacuation is the cover agency's responsibility and is not reported to this register.
:::

## 3. Responsibilities at the surface

| Party | Under this entry |
|---|---|
| Security forces post commander | Holds shaft collars and portal approaches. Orders closure. Reports by the post order channel. |
| Facility commander | Orders the facility to its seal state. Accounts for posted personnel below grade. |
| Cover agency (surface) | Evacuates its own staff by its own procedures. Receives no instruction from the OSC. |
| Cover Operations | Prepares the public account of the surface facility's loss from the prepared statements held for its facility type (:x[OSC-ASR-COV]). |

Visitors under escort at the time of an alert are handled by the escort under :x[OSC-DIR-0163] until the post commander directs otherwise.

## 4. Contingency protocol

| Designation | Title | Revision | Pages | Withholding authority | Reference |
|---|---|---|---|---|---|
| :c[threatDetail.EXT-CONVENTIONAL.protocol.designation] | :r[Defence of Shaft Collars and Portals and Closure Under Attack]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} | :c[threatDetail.EXT-CONVENTIONAL.protocol.revision] | :c[threatDetail.EXT-CONVENTIONAL.protocol.pageCount] | :c[threatDetail.EXT-CONVENTIONAL.protocol.withholdingAuthority] | :c[threatDetail.EXT-CONVENTIONAL.protocol.ref] |

## 5. Register notes

5.1 Security forces strength and organisation: :x[OSC-PER-BR-SEC].

5.2 Markings and withholding authorities follow :x[OSC-ASR-CG].

5.3 Entry certified current 28 FEB 2008, C. Brandauer, Director, Office of Internal Assurance.
