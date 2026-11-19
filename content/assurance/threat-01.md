---
id: assurance-threat-01
route: /assurance/threat/01
app: assurance
family: assurance
template: record
docNo: OSC-ASR-THR-01
title: "Threat Register Entry 01: Nuclear Exchange"
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 3
date: 2008-02-28
summary: Threat (external), source response and contingency paragraphs owned by Operations and Continuity Planning.
xrefs: [OSC-ASR-CG, OSC-ASR-THR-02, OSC-ASR-THR-03, OSC-MEM-07-0612, OSC-DIR-0156]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Facility Commanders, ALPHA-01 to ALPHA-05
  - Operations and Continuity Planning (ALPHA-01)
  - Resident Assurance Officers (all ALPHA sites)
recordType: THREAT REGISTER ENTRY
fields:
  - { label: Register, value: OIA Threat and Contingency Register }
  - { label: Entry, value: "01", mono: true }
  - { label: Threat group, value: External }
  - { label: Owning office, value: Operations and Continuity Planning }
  - { label: Register custodian, value: Office of Internal Assurance }
  - { label: Contingency protocol, value: OSC-CP-01, mono: true }
  - { label: Last review, value: 28 FEB 2008 }
  - { label: Next review, value: 29 AUG 2008 }
revisions:
  - { rev: "3", date: 28 FEB 2008, change: "Semi-annual review. Paragraph 2.3 restated on the sustained basis. Protocol revision noted.", by: OIA/ALPHA-01 }
  - { rev: "2", date: 30 AUG 2007, change: "Semi-annual review. Owning office changed from Facility Command (ALPHA-01).", by: OIA/ALPHA-01 }
  - { rev: "1", date: 14 MAR 2006, change: "Entry created from the Council threat assessment.", by: OIA/ALPHA-01 }
---

## 1. Threat

**:c[threatDetail.EXT-NUCLEAR.label].** Response as stated in the Council threat assessment and carried into this register without amendment:

> :c[threats.external.EXT-NUCLEAR.response]

This entry restates the response for facility command staff. It does not authorise action. Action under this entry is taken only under the contingency protocol at section 3, on the order of the authority named in that protocol.

## 2. Contingency

2.1 The network is designed for survival and for post-event governance. Facility depth and hardening are sufficient for a direct near-strike; rail and tram tunnels are EMP-rated and seismic-isolated.

2.2 On warning, ALPHA hubs assume SEALED state on Council or facility commander order. Transit Control suspends revenue service and holds consists at the nearest terminal. Essential personnel extraction to GAMMA-class shelters proceeds by the routes held at DELTA-class extraction route nodes.

2.3 Reconstitution is directed from ALPHA-01, with ALPHA-05 as the secondary reconstitution site. Facility sustainment windows and reserves are stated at sustained capacity (:c[headline.capacitySustained]), not surge berthing. The basis is set out in :x[OSC-MEM-07-0612].

:::redact{compartment=BRIAR auth="OIA" ref="OIA-PROT-01"}
2.4 Personnel outside a facility when it assumes SEALED state are not admitted after sealing. They are directed by the published route to the nearest GAMMA-class shelter with an open berth, or where no berth is open to a DELTA-class node, which holds stocks for its stated sustainment window only.

2.5 Facility commanders account for posted personnel at sealing by roster. Persons on the roster and not inside the facility at sealing are recorded as not accounted for and are carried in that status until the facility unseals or the Council directs otherwise. No search is made for them from a sealed facility.

2.6 Berths above the sustained figure are allotted at sealing in the order of the essential personnel list. The list is held with the protocol and not with this register.
:::

## 3. Contingency protocol

| Designation | Title | Revision | Pages | Withholding authority | Reference |
|---|---|---|---|---|---|
| :c[threatDetail.EXT-NUCLEAR.protocol.designation] | :r[Sealing of Facilities, Extraction of Essential Personnel and Reconstitution of Government Following a Nuclear Exchange]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} | :c[threatDetail.EXT-NUCLEAR.protocol.revision] | :c[threatDetail.EXT-NUCLEAR.protocol.pageCount] | :c[threatDetail.EXT-NUCLEAR.protocol.withholdingAuthority] | :c[threatDetail.EXT-NUCLEAR.protocol.ref] |

3.1 The protocol is held in numbered physical copies by Operations and Continuity Planning at ALPHA-01 and ALPHA-05, and by the facility commander of each ALPHA site. The title is withheld by the Council. The page count and revision are not withheld and are given so that holders can confirm their copy is complete and current.

3.2 Holders confirm completeness by page count at each semi-annual review and record the confirmation with the Resident Assurance Officer. A copy found short of pages is reported on OSC-F-114 the same duty period.

## 4. Related entries

| Entry | Relationship |
|---|---|
| :x[OSC-ASR-THR-02] | Seal states and NBC filtration; SEALED state under this entry uses the same seal procedure. |
| :x[OSC-ASR-THR-03] | Surface cover facility loss; shaft collars and portals. |
| :x[OSC-DIR-0156] | Refuge chambers and evacuation drills (routine). |

## 5. Register notes

5.1 Markings, compartment use and withholding authorities in this entry follow :x[OSC-ASR-CG].

5.2 Facility drills under this entry are scheduled on the facility calendar as seal drills and are not identified there by threat. Results are reported to the owning office, not to this register.

5.3 Entry reviewed and certified current 28 FEB 2008, C. Brandauer, Director, Office of Internal Assurance. Next review suspense 29 AUG 2008, action officer OIA/ALPHA-01 register clerk.
