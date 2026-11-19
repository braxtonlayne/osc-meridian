---
id: system-about
route: /system/about
t4: true
app: system
family: system
template: record
docNo: OSC-SYS-ABT
title: About This Terminal
marking: TSSCI-OSC
originator: CMS/ALPHA-02
revision: 7
date: 2008-03-03
summary: MERIDIAN Workstation Environment release 4.1.7. Build, accreditation, workstation A03-5-114, Service Desk and contractor support, and licence notices.
xrefs: [OSC-DIR-0301, KB-0001, OSC-ASR-COMM, OSC-SYS-COL]
recordType: ABOUT THIS TERMINAL
fields:
  - { label: Product, value: MERIDIAN Workstation Environment }
  - { label: Release, value: "4.1.7 (build 2214)", mono: true }
  - { label: Build date, value: 11 FEB 2008 }
  - { label: Issuing authority, value: "Communications Security (CMS), ALPHA-02" }
  - { label: Workstation, value: A03-5-114, mono: true }
  - { label: Accreditation, value: MWA-A03-0114, mono: true }
revisions:
  - { rev: 7, date: 2008-03-03, change: "Re-accreditation of the A03-5 workstation group under DIR-0301 of 03 MAR 2008.", by: CMS/ALPHA-02 }
  - { rev: 6, date: 2008-02-11, change: "Release 4.1.7 installed.", by: CMS/ALPHA-02 }
  - { rev: 5, date: 2007-09-24, change: "Release 4.1.5 installed.", by: CMS/ALPHA-02 }
---

## Release

| Item | Value |
|---|---|
| Product | :c[meta.environment] |
| Release | :c[meta.release] (build 2214) |
| Build date | 11 FEB 2008 |
| Installed at this workstation | 14 FEB 2008 0315Z (2215 EST 13 FEB) |
| Previous release | 4.1.5 (build 2087), withdrawn 14 FEB 2008 |
| Next scheduled release | Not announced |

Release notes for 4.1.7 are summarised in :x[KB-0001]. Releases are installed by CMS during the overnight maintenance window and are not installed by operators.

## This workstation

| Item | Value |
|---|---|
| Workstation | A03-5-114 |
| Site | ALPHA-03 |
| Location | Level 5, Records Division, Accessions & Review Branch, position 114 |
| Workstation class | Analyst position, single-operator, smart token reader, one release printer |
| Highest marking accredited | :c[markings.UMBRA-C.label] |
| Network | QKD only. No external connectivity (:x[OSC-ASR-COMM]) |
| Removable media | Disabled |
| Asset tag | A03-IT-00114 |

The workstation number is printed on the label on the front of the unit. Quote it when you call the Service Desk.

## Accreditation

| Item | Value |
|---|---|
| Accreditation number | MWA-A03-0114 |
| Accredited under | :x[OSC-DIR-0301], MERIDIAN Workstation Use and Accreditation |
| Accrediting authority | Director, Communications Security |
| Date of accreditation | 03 MAR 2008 |
| Re-accreditation due | 02 MAR 2009, or on any change of hardware, location or class |
| Conditions | Schedule AC, issue 4. The conditions that bound operator settings are shown in **System > Settings**. |
| Residual risk accepted | :r[R-3 (shared release printer with an adjacent branch); R-7 (reassignment of a workstation between operators without media sanitisation, profile archive only)]{tier=2 auth="CMS" ref="CMS-08-0114"} |

## Support

MERIDIAN Service Desk, Communications Security: ext. 1-7700, 0600Z to 1800Z (0200 to 1400 EDT). Out of hours, report workstation faults to the site duty officer.

Contractor support for this release is provided under CMS contract and is reached through the Service Desk only. Operators do not contact contractor staff, and contractor staff do not attend a workstation except under escort and with the operator logged out.

## Licence notices

MERIDIAN Workstation Environment is the property of the Office of Strategic Continuity. Release 4.1.7 incorporates components developed under government contract and components obtained commercially. Commercial components are licensed to the Government for use on accredited OSC workstations only, and the licence records are held by CMS/ALPHA-02. No component may be copied from this workstation, run on any other system, or described to any person outside the OSC.

Typefaces and map geometry used by MERIDIAN are held under the licences recorded with CMS. Notices for the components that require one are reproduced in the colophon, :x[OSC-SYS-COL].

The presence of a notice on this page does not confer any right on the operator.
