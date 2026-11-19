---
id: assurance-cov
route: /assurance/cover-catalogue
app: assurance
family: assurance
template: record
docNo: OSC-ASR-COV
title: Cover Identity Catalogue (ALPHA and BETA)
marking: UMBRA-C
originator: CVO/ALPHA-04
revision: 9
date: 2008-05-14
summary: "Seventeen entries: cover agency, cover facility type, visible surface staff, public records posture and last cover review."
xrefs: [OSC-FAC-IDX, OSC-FAC-ALPHA-03, OSC-FAC-BETA-09, OSC-ASR-THR-07, OSC-ASR-THR-04, OSC-SYS-CAL, OSC-ASR-CG]
distribution:
  - Director, Cover Operations (ALPHA-04)
  - Cover Liaison Officers
  - Facility Commanders, ALPHA and BETA sites (own entry and adjacent entries)
  - Director, Office of Internal Assurance (ALPHA-01)
recordType: CATALOGUE EXTRACT
fields:
  - { label: Catalogue, value: Cover Identity Catalogue }
  - { label: Custodian, value: "Cover Operations (CVO/ALPHA-04)" }
  - { label: Extract prepared for, value: "ALPHA-03 (host site and adjacent entry)" }
  - { label: Review interval, value: Not exceeding eighteen months }
  - { label: Classes covered, value: "ALPHA and BETA (GAMMA and DELTA sites hold no cover catalogue entry)" }
revisions:
  - { rev: "9", date: 14 MAY 2008, change: "Cover review entered (one site).", by: CVO/ALPHA-04 }
  - { rev: "8", date: 06 MAY 2008, change: "Cover review entered (one site). Visible staffing figure amended.", by: CVO/ALPHA-04 }
  - { rev: "7", date: 29 APR 2008, change: "Cover review entered (one site). Review programme for the third quarter issued.", by: CVO/ALPHA-04 }
---

## 1. Purpose

1.1 The catalogue records, for every ALPHA and BETA site, the authentic government function under which the surface installation is registered, staffed and budgeted; the number of surface staff a member of the public would see; how the site appears in public records; and the date of its last cover review.

1.2 A cover identity is real at the surface. Its staff are employed by the cover agency, its work is done and its reports are filed. Most surface staff hold no OSC access and are not told of the installation. Nothing in this catalogue is to be raised with them.

1.3 The catalogue is issued as extracts. Each facility command receives its own entry and the entries of facilities it is connected to. Other entries are withheld.

## 2. Host site

::canon-table{source="coverCatalogue" auth="CVO" facility="ALPHA-03" cols="facility:Site,coverAgency:Cover agency,coverFacilityType:Cover facility type,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records posture,lastCoverReview:Last cover review"}

Next review due by 27 AUG 2009. Facility dossier: :x[OSC-FAC-ALPHA-03].

## 3. Adjacent regional operations centre

::canon-table{source="coverCatalogue" auth="CVO" facility="BETA-09" cols="facility:Site,coverAgency:Cover agency,coverFacilityType:Cover facility type,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records posture,lastCoverReview:Last cover review"}

Next review: **28 MAY 2008**, 1500Z (1000 CDT), at the site. Brought forward from the ordinary interval at the request of the parent command, whose construction notice for the quarter lists works at the auxiliary facility. The review will confirm visible surface staffing and public-records posture against this entry. Facility dossier: :x[OSC-FAC-BETA-09].

## 4. Other entries

:::redact{compartment=SEXTANT auth="CVO" ref="CVO-08-027"}
::canon-table{source="coverCatalogue" auth="CVO" filter="facility!=ALPHA-03,facility!=BETA-09" cols="facility:Site,coverAgency:Cover agency,coverFacilityType:Cover facility type,visibleSurfaceStaff:Visible surface staff,publicRecordsPosture:Public records posture,lastCoverReview:Last cover review"}
:::

## 5. Cover review

5.1 A cover review assesses whether the identity still holds: whether the visible staffing matches what the cover agency publishes, whether public records say no more than this catalogue records, and whether local attention has changed. Reviews are carried out at the site by a Cover Liaison Officer with the facility commander's nominee. Reviews appear on the facility calendar (:x[OSC-SYS-CAL]) under the cover facility type, not the facility's designation.

5.2 A review is brought forward when the cover agency reorganises, when the surface workforce changes by more than a fifth, when construction at the surface is publicly announced, or on the instruction of the Office of Internal Assurance (:x[OSC-ASR-THR-04]).

5.3 Findings are entered in this catalogue as a new revision. A finding that the identity no longer holds is reported to the Director, Cover Operations the same day and is not entered here.

## 6. Prepared public statements

6.1 Prepared statements are held for every facility type and are issued to the cover agency's public affairs office for use without alteration (:x[OSC-ASR-THR-07]). They are released to facility command staff so that command staff can recognise them in use.

:::redact{tier=2 auth="CVO" ref="CVO-08-031"}
| Facility type | Prepared statement |
|---|---|
| Monitoring station | "The station is one of a number of federal monitoring sites in the region. Its data is published with the agency's regular reports. For reasons of instrument security the grounds are not open to visitors." |
| Research station or research complex | "Research at the site is carried out under the agency's published programme. Some laboratories operate under biosafety or security requirements that restrict access. Results are released through the agency's normal channels." |
| Training center | "The center provides regional training for agency personnel. Course schedules are set by the agency and are not open to the public." |
| Reserve or storage facility | "The facility forms part of the national reserve system. Quantities held and operating details are not released, in keeping with long-standing practice for reserve sites." |
| Surveying or field station | "The station supports the agency's field work in the area and is staffed according to the season. Questions about land use in the area should be directed to the field office." |
| Support or auxiliary facility | "The facility supports the operations of the parent command. Its activities are not discussed separately from those of the command." |
| Regional coordination or response center | "The center coordinates the agency's regional preparedness and response. It is used for exercises throughout the year, which may involve increased traffic and activity." |
| Depository | "The site provides secure storage for the System. Security arrangements, holdings and staffing are not discussed." |

6.2 Where a statement has been used, the public affairs office records the date and the inquirer and passes the record to the Cover Liaison Officer. A statement is not used twice to the same inquirer; the second inquiry is referred to Cover Operations.
:::

## 7. Notes

7.1 Visible surface staff are the persons seen at the surface installation on an ordinary weekday, cover agency employees and OSC personnel with surface duties alike. The figure is a cover figure and is not reconciled with facility staff returns.

7.2 Markings and withholding authorities follow :x[OSC-ASR-CG]. Site-to-cover correspondence beyond the reader's own connections is SEXTANT.

Issued 14 MAY 2008, R. Kerr, Director, Cover Operations.
