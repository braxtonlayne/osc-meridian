---
id: assurance-threat-02
route: /assurance/threat/02
app: assurance
family: assurance
template: record
docNo: OSC-ASR-THR-02
title: "Threat Register Entry 02: Biological / Chemical"
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 3
date: 2008-02-28
summary: Threat (external), source response and contingency paragraphs owned by Facility Engineering.
xrefs: [OSC-ASR-CG, OSC-DIR-0128, OSC-FAC-BETA-03, OSC-DIR-0204]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Chief Engineer, Facilities Engineering (ALPHA-02)
  - Director, Medical Services (ALPHA-05)
  - Facility Commanders, all staffed facilities
  - Resident Assurance Officers (all ALPHA sites)
recordType: THREAT REGISTER ENTRY
fields:
  - { label: Register, value: OIA Threat and Contingency Register }
  - { label: Entry, value: "02", mono: true }
  - { label: Threat group, value: External }
  - { label: Owning office, value: "Facilities Engineering (FE/ALPHA-02)" }
  - { label: Register custodian, value: Office of Internal Assurance }
  - { label: Contingency protocol, value: OSC-CP-02, mono: true }
  - { label: Last review, value: 28 FEB 2008 }
  - { label: Next review, value: 29 AUG 2008 }
revisions:
  - { rev: "3", date: 28 FEB 2008, change: "Semi-annual review. Seal state table aligned with OSC-DIR-0128 rev 5.", by: OIA/ALPHA-01 }
  - { rev: "2", date: 30 AUG 2007, change: "BETA-03 response function added.", by: OIA/ALPHA-01 }
  - { rev: "1", date: 14 MAR 2006, change: "Entry created from the Council threat assessment.", by: OIA/ALPHA-01 }
---

## 1. Threat

**:c[threatDetail.EXT-NBC.label].** Response as stated in the Council threat assessment:

> :c[threats.external.EXT-NBC.response]

Owning office: :c[threatDetail.EXT-NBC.ownerDivision]. The owning office maintains the seal procedure, the filtration plant and the decontamination locks. The Office of Internal Assurance maintains this entry and the protocol register only.

## 2. Contingency

2.1 All facilities are NBC-rated with 180-day seal capability. Seal state is held at CONDITIONED during normal operation, with air handling units on gas-phase filtration and positive pressure at the personnel doors.

2.2 On a biological or chemical indication, the affected facility goes to SEALED; adjacent facilities on the same network go to CONDITIONED pending assessment. BETA-03 holds the biomedical response function for its network (:x[OSC-FAC-BETA-03]).

:::redact{compartment=BRIAR auth="OIA" ref="OIA-PROT-02"}
2.3 A person presenting an indication inside a sealed facility is held in the personnel lock nearest the point of presentation until cleared by the Site Medical Officer. The lock is not opened to the facility side while the indication persists, and the seal is not broken to evacuate an individual.

2.4 Persons at a personnel door at the time of sealing are admitted to the outer lock only. Admission past the outer lock is at the discretion of the facility commander on the advice of the Site Medical Officer, and the decision is recorded in the seal log with the time.
:::

## 3. Seal states

| State | Meaning | Personnel doors | Set by |
|---|---|---|---|
| OPEN | Plant on particulate filtration only. Used during filter changes and plant outages. | Normal use | Facility engineer on duty |
| CONDITIONED | Normal operating state. Gas-phase filtration on line, positive pressure held at personnel doors. | Normal use, lock discipline | Standing (default) |
| SEALED | Facility isolated from surface air and water. Personnel doors locked shut from inside. | Closed | Facility commander, or on Council order |
| SEALED (DRILL) | SEALED for a scheduled period with no entry or exit. Logged as a drill. | Closed for the drill period | Facility commander, on the facility calendar |

Filter change cycles and the zones that remain seal-capable during a change are set by :x[OSC-DIR-0128]. A facility at OPEN for filter work is reported to the owning office at the start and end of the work period.

## 4. Contingency protocol

| Designation | Title | Revision | Pages | Withholding authority | Reference |
|---|---|---|---|---|---|
| :c[threatDetail.EXT-NBC.protocol.designation] | :r[Seal, Filtration and Decontamination Procedures on a Biological or Chemical Indication]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} | :c[threatDetail.EXT-NBC.protocol.revision] | :c[threatDetail.EXT-NBC.protocol.pageCount] | :c[threatDetail.EXT-NBC.protocol.withholdingAuthority] | :c[threatDetail.EXT-NBC.protocol.ref] |

The protocol is held by Facilities Engineering and by each facility commander. Its annexes (plant procedures by facility) are held at the facility concerned only. The title is withheld; the page count and revision are given for completeness checks.

## 5. Register notes

5.1 Medical readiness of personnel on the seal roster is governed by :x[OSC-DIR-0204]. Personnel with lapsed medical readiness are removed from the seal roster until recertified.

5.2 Markings and withholding authorities follow :x[OSC-ASR-CG].

5.3 Entry certified current 28 FEB 2008, C. Brandauer, Director, Office of Internal Assurance.
