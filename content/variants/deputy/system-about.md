---
id: system-about
route: /system/about
app: system
family: system
template: record
docNo: OSC-SYS-ABT
title: About This Terminal
marking: TSSCI-OSC
originator: CMS/ALPHA-02
revision: 8
date: 2008-05-06
summary: MERIDIAN Workstation Environment release 4.1.7 at workstation A02-7-002, Command Section, ALPHA-02. Approvals queue configuration changed 06 MAY 2008.
xrefs: [OSC-DIR-0301, KB-0001, OSC-ASR-COMM, OSC-SYS-COL, OSC-F-126]
recordType: ABOUT THIS TERMINAL
fields:
  - { label: Product, value: MERIDIAN Workstation Environment }
  - { label: Release, value: "4.1.7 (build 2214)", mono: true }
  - { label: Build date, value: 11 FEB 2008 }
  - { label: Issuing authority, value: "Communications Security (CMS), ALPHA-02" }
  - { label: Workstation, value: A02-7-002, mono: true }
  - { label: Accreditation, value: MWA-A02-0702, mono: true }
revisions:
  - { rev: 8, date: 2008-05-06, change: "Approvals queue: routing table changed under CMS-08-0131.", by: CMS/ALPHA-02 }
  - { rev: 7, date: 2008-03-03, change: "Re-accreditation of the A02-7 workstation group under DIR-0301 of 03 MAR 2008.", by: CMS/ALPHA-02 }
  - { rev: 6, date: 2008-02-11, change: "Release 4.1.7 installed.", by: CMS/ALPHA-02 }
---

## Release

| Item | Value |
|---|---|
| Product | :c[meta.environment] |
| Release | :c[meta.release] (build 2214) |
| Build date | 11 FEB 2008 |
| Installed at this workstation | 13 FEB 2008 0410Z (2110 MST 12 FEB) |
| Previous release | 4.1.5 (build 2087), withdrawn 14 FEB 2008 |

Release notes for 4.1.7 are summarised in :x[KB-0001].

## This workstation

| Item | Value |
|---|---|
| Workstation | A02-7-002 |
| Site | ALPHA-02 |
| Location | Level 7, Command Section, Deputy Commander's office |
| Workstation class | Command position, single-operator, smart token reader, approvals queue, one release printer |
| Highest marking accredited | :c[markings.UMBRA-C.label] |
| Network | QKD only. No external connectivity (:x[OSC-ASR-COMM]) |
| Removable media | Disabled |
| Asset tag | A02-IT-00702 |

## Approvals queue

| Item | Value |
|---|---|
| Forms routed to this position | :x[OSC-F-126] (certifying officer, gaining facility); OSC-F-122 countersignature; OSC-F-118; OSC-F-109 |
| Facilities served | ALPHA-02; ALPHA-03 (OSC-F-126 only, from 06 MAY 2008) |
| Change authority | CMS-08-0131, on instruction of the Director, Office of Internal Assurance |
| Reason entered | None |

The queue is shown in **Forms > Action queue**. Decisions are written to the requester's mail at their next sign-in.

## Accreditation

| Item | Value |
|---|---|
| Accreditation number | MWA-A02-0702 |
| Accredited under | :x[OSC-DIR-0301], MERIDIAN Workstation Use and Accreditation |
| Accrediting authority | Director, Communications Security |
| Date of accreditation | 03 MAR 2008 |
| Re-accreditation due | 02 MAR 2009, or on any change of hardware, location or class |
| Residual risk accepted | :r[R-2 (approvals for a second site decided at a workstation not accredited for that site's records); R-5 (command mailbox shared with the Facility Commander's office)]{tier=2 auth="CMS" ref="CMS-08-0131"} |

## Support

MERIDIAN Service Desk, Communications Security: ext. 1-7700, 0600Z to 1800Z (0000 to 1200 MDT). Out of hours, report workstation faults to the site duty officer.

## Licence notices

MERIDIAN Workstation Environment is the property of the Office of Strategic Continuity. Notices for the components that require one are reproduced in the colophon, :x[OSC-SYS-COL]. The presence of a notice on this page does not confer any right on the operator.
