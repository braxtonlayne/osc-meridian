---
id: assurance-threat-07
route: /assurance/threat/07
app: assurance
family: assurance
template: record
docNo: OSC-ASR-THR-07
title: "Threat Register Entry 07: Media Exposure"
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 3
date: 2008-02-28
summary: Threat (internal), source response and contingency paragraphs owned by Cover Programs Office.
xrefs: [OSC-ASR-CG, OSC-ASR-COV, OSC-ASR-THR-04]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Director, Cover Operations (ALPHA-04)
  - Director, Intelligence & Analysis (ALPHA-01)
  - Facility Commanders, ALPHA and BETA sites
recordType: THREAT REGISTER ENTRY
fields:
  - { label: Register, value: OIA Threat and Contingency Register }
  - { label: Entry, value: "07", mono: true }
  - { label: Threat group, value: Internal }
  - { label: Owning office, value: Cover Programs Office (CVO/ALPHA-04) }
  - { label: Register custodian, value: Office of Internal Assurance }
  - { label: Contingency protocol, value: OSC-CP-07, mono: true }
  - { label: Last review, value: 28 FEB 2008 }
  - { label: Next review, value: 29 AUG 2008 }
revisions:
  - { rev: "3", date: 28 FEB 2008, change: "Semi-annual review. Monitoring responsibility moved to Intelligence & Analysis.", by: OIA/ALPHA-01 }
  - { rev: "2", date: 30 AUG 2007, change: "Inquiry handling table added.", by: OIA/ALPHA-01 }
  - { rev: "1", date: 14 MAR 2006, change: "Entry created from the Council threat assessment.", by: OIA/ALPHA-01 }
---

## 1. Threat

**:c[threatDetail.INT-MEDIA.label].** Publication, or preparation for publication, of an account that refers to a facility, the network or the programme.

> :c[threats.internal.INT-MEDIA.response]

Owning office: :c[threatDetail.INT-MEDIA.ownerDivision], the cover programme function of Cover Operations at ALPHA-04.

## 2. Contingency

2.1 Information warfare capabilities enable narrative control. Prepared cover stories exist for all facility types and are reviewed with each cover review (:x[OSC-ASR-COV]).

2.2 A media inquiry concerning a site is answered by the cover agency's public affairs office using the published cover story. No OSC office responds to a media inquiry directly.

:::redact{compartment=BRIAR auth="OIA" ref="OIA-PROT-07"}
2.3 Where a published account identifies a site correctly, the cover agency's statement is not altered to deny it. The account is answered by further publication, so that the correct account becomes one of several, and the least specific.

2.4 Where an account is traced to a person admitted to the OSC, the matter is transferred to Entry 06 and closed under this entry.
:::

## 3. Inquiry handling

| Received by | Action | Passed to | Time limit |
|---|---|---|---|
| Surface staff of the cover facility | Refer the caller to the cover agency public affairs office. Make no statement. | Cover facility manager | Same day |
| Cover facility manager | Log the inquiry in the cover agency's ordinary log. Notify the cover liaison officer. | Cover liaison officer (CVO) | Same day |
| Cover liaison officer | Confirm the published cover story is current. Notify Cover Operations. | Director, Cover Operations | 24 hours |
| Cover Operations | Assess. Where the inquiry touches two or more sites, refer to Entry 04 (:x[OSC-ASR-THR-04]). | Office of Internal Assurance | 48 hours |

Personnel below grade who are approached by a journalist, in any setting, report the approach to the Resident Assurance Officer on OSC-F-114. An approach reported is not a disclosure.

## 4. Monitoring

Published material is monitored for references to cover facilities and cover line items by Intelligence & Analysis (ALPHA-01) and summarised weekly to Cover Operations. Items of no significance are not reported; the weekly summary is sent whether or not it contains items.

## 5. Contingency protocol

| Designation | Title | Revision | Pages | Withholding authority | Reference |
|---|---|---|---|---|---|
| :c[threatDetail.INT-MEDIA.protocol.designation] | :r[Narrative Management and Re-covering of Exposed Facilities]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} | :c[threatDetail.INT-MEDIA.protocol.revision] | :c[threatDetail.INT-MEDIA.protocol.pageCount] | :c[threatDetail.INT-MEDIA.protocol.withholdingAuthority] | :c[threatDetail.INT-MEDIA.protocol.ref] |

The protocol is the longest held in this register after OSC-CP-01. Its annexes include the prepared statements for every facility type and are amended at each cover review without change of protocol revision.

## 6. Register notes

6.1 Markings and withholding authorities follow :x[OSC-ASR-CG].

6.2 Entry certified current 28 FEB 2008, C. Brandauer, Director, Office of Internal Assurance.
