---
id: assurance-threat-04
route: /assurance/threat/04
app: assurance
family: assurance
template: record
docNo: OSC-ASR-THR-04
title: "Threat Register Entry 04: Outside Agency Discovery (Register Working Copy, OIA)"
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 3
date: 2008-02-28
summary: "The Office of Internal Assurance working copy of threat register entry 04, with the review papers for paragraph 2.4 and the auditor's note."
xrefs: [OSC-ASR-CG, OIA-08-031, OSC-ASR-CTR, OSC-ASR-COV, OSC-LDG-REG, OSC-DIR-0378]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Director, Cover Operations (ALPHA-04)
  - Comptroller (ALPHA-01)
  - Resident Assurance Officers (all ALPHA sites)
  - "Register working copy, Inquiries Section, ALPHA-01"
recordType: THREAT REGISTER ENTRY
fields:
  - { label: Register, value: OIA Threat and Contingency Register }
  - { label: Entry, value: "04", mono: true }
  - { label: Threat group, value: Internal }
  - { label: Owning office, value: "Office of Internal Assurance (OIA/ALPHA-01)" }
  - { label: Register custodian, value: Office of Internal Assurance }
  - { label: Contingency protocol, value: OSC-CP-04, mono: true }
  - { label: Last review, value: 28 FEB 2008 }
  - { label: Next review, value: 29 AUG 2008 }
revisions:
  - { rev: "3", date: 28 FEB 2008, change: "Semi-annual review. Indicator list revised. Paragraph 2.4 added.", by: OIA/ALPHA-01 }
  - { rev: "2", date: 30 AUG 2007, change: "Referral threshold set at two sites.", by: OIA/ALPHA-01 }
  - { rev: "1", date: 14 MAR 2006, change: "Entry created from the Council threat assessment.", by: OIA/ALPHA-01 }
---

## 1. Threat

**:c[threatDetail.INT-AGENCY.label].** An agency of government outside the OSC acquires knowledge of one or more facilities, of the network, or of the programme.

> :c[threats.internal.INT-AGENCY.response]

Owning office: :c[threatDetail.INT-AGENCY.ownerDivision]. This is one of the two entries the Office holds as owner as well as custodian.

## 2. Contingency

2.1 Compartmentation prevents comprehensive understanding from a single-point compromise. No prime contractor knows more than three sites (:x[OSC-ASR-CTR]); no line item discloses the programme (:x[OSC-LDG-REG]); no cover agency holds the network's existence (:x[OSC-ASR-COV]).

2.2 An inquiry by an outside agency into a single site is answered by that site's cover identity, through the cover agency's ordinary channels. Inquiries that touch two or more sites are referred to the Office of Internal Assurance for assessment.

:::redact{compartment=BRIAR auth="OIA" ref="OIA-PROT-04"}
2.3 Assessment under the protocol establishes how the inquiring agency came to connect the sites. Where the connection was made through a person, the person's access is reviewed whether or not the person is within the OSC.

2.4 An electronic copy of a controlled record found outside controlled records is not destroyed on discovery. It is retained on the index of the holding library, under an open incident, so that access can be recorded. Each access is assessed for whether it forms part of a connection under paragraph 2.3. Destruction follows closure of the incident.
:::

## 3. Indicators

Any of the following is reported to the Resident Assurance Officer on OSC-F-114 under :x[OSC-DIR-0378]. None of them is in itself evidence of discovery.

| No. | Indicator | Usual explanation |
|---|---|---|
| 3.1 | Cover agency headquarters asks a site for a document it would not ordinarily hold. | Routine records call |
| 3.2 | Two cover agencies raise questions about the same contractor in the same quarter. | Contract audit |
| 3.3 | A line item is questioned at a level of detail below its cover title. | Appropriations staff turnover |
| 3.4 | A surface visitor asks about traffic, power or water use out of proportion to the cover function. | Local interest |
| 3.5 | An inquiry refers to a site by a name or number not used by its cover agency. | None |
| 3.6 | Controlled material is found in a place, form or medium in which it should not exist. | None |

## 4. Contingency protocol

| Designation | Title | Revision | Pages | Withholding authority | Reference |
|---|---|---|---|---|---|
| :c[threatDetail.INT-AGENCY.protocol.designation] | :r[Assessment and Containment of Inquiries Connecting Two or More Facilities]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} | :c[threatDetail.INT-AGENCY.protocol.revision] | :c[threatDetail.INT-AGENCY.protocol.pageCount] | :c[threatDetail.INT-AGENCY.protocol.withholdingAuthority] | :c[threatDetail.INT-AGENCY.protocol.ref] |

The protocol is held by the Office of Internal Assurance at ALPHA-01. Resident Assurance Officers hold the annex for their own site. Inquiry files opened under it are held in compartment BRIAR.

## 5. Linked incidents

Maintained automatically by the OIA case system. Not part of the revision.

| Incident | Opened | Status | Action officer |
|---|---|---|---|
| :x[OIA-08-031] | 05 MAY 2008 | OPEN | D. Prewitt, RAO ALPHA-03 |

## 6. Register notes

6.1 Markings and withholding authorities follow :x[OSC-ASR-CG].

6.2 Entry certified current 28 FEB 2008, C. Brandauer, Director, Office of Internal Assurance.

::stamp{kind="REVIEWED-OIA" date="2008-05-19" seed=36}

## Review papers, revision 3 (working copy only)

| Paragraph | Change at review of 28 FEB 2008 | Source recorded |
|---|---|---|
| 2.4 | Added | Instruction of the Director, 26 FEB 2008. No paper attached. |
| 3.5 | Usual explanation changed from "Clerical error" to "None" | Review meeting |
| 3.6 | Added | Review meeting |

## Auditor's note

H. L. Vance, Assurance Auditor, 19 MAY 2008, for the second review of :x[OIA-08-031].

1. Paragraph 2.4 was added at the review of 28 FEB 2008 on the Director's instruction of 26 FEB 2008. The item retained under it, the image held under OIA-08-031, was received in Stacks C on 24 MAR 2008 and found on 05 MAY 2008.
2. The handling direction on OIA-08-031 (07 MAY 2008) follows paragraph 2.4 word for word.
3. Indicator 3.6 was added at the same review.

No finding. The dates are entered on the OIA-08-031 file.

:::margin{hand="HV" seed=40 mark=arrow}
Written four weeks before the item arrived. Ask the Director what 2.4 was written for. Ask in person.
:::
