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
revision: 7
date: 2008-03-03
summary: MERIDIAN Workstation Environment release 4.1.7 at workstation A01-4-022, Office of Internal Assurance, ALPHA-01. Audit review (read-only) enabled.
xrefs: [OSC-DIR-0301, KB-0001, OSC-ASR-COMM, OSC-SYS-COL]
recordType: ABOUT THIS TERMINAL
fields:
  - { label: Product, value: MERIDIAN Workstation Environment }
  - { label: Release, value: "4.1.7 (build 2214)", mono: true }
  - { label: Build date, value: 11 FEB 2008 }
  - { label: Issuing authority, value: "Communications Security (CMS), ALPHA-02" }
  - { label: Workstation, value: A01-4-022, mono: true }
  - { label: Accreditation, value: MWA-A01-0422, mono: true }
revisions:
  - { rev: 7, date: 2008-03-03, change: "Re-accreditation of the A01-4 workstation group under DIR-0301 of 03 MAR 2008.", by: CMS/ALPHA-02 }
  - { rev: 6, date: 2008-02-11, change: "Release 4.1.7 installed.", by: CMS/ALPHA-02 }
---

## Release

| Item | Value |
|---|---|
| Product | :c[meta.environment] |
| Release | :c[meta.release] (build 2214) |
| Build date | 11 FEB 2008 |
| Installed at this workstation | 14 FEB 2008 0340Z (2240 EST 13 FEB) |

Release notes for 4.1.7 are summarised in :x[KB-0001].

## This workstation

| Item | Value |
|---|---|
| Workstation | A01-4-022 |
| Site | ALPHA-01 |
| Location | Level 4, Office of Internal Assurance, Inquiries Section, position 022 |
| Workstation class | Assurance position, single-operator, smart token reader, audit review, one release printer |
| Highest marking accredited | :c[markings.UMBRA-C.label] |
| Network | QKD only. No external connectivity (:x[OSC-ASR-COMM]) |
| Removable media | Read-only, for audit archive media under ticket |
| Asset tag | A01-IT-00422 |

## Audit review

| Item | Value |
|---|---|
| Function | Read-only display of the audit trail of any MERIDIAN workstation account, under :x[OSC-DIR-0301] para 9 |
| Workstation groups assigned | A03-5 (Records Division, ALPHA-03); A02-7 (Command Section, ALPHA-02); G08-1 (GAMMA-08) |
| Effect on the account reviewed | None. The reviewed operator is not told. |
| Own trail | The review itself is written to this workstation's audit trail, which is reviewed by the Director |

## Accreditation

| Item | Value |
|---|---|
| Accreditation number | MWA-A01-0422 |
| Accredited under | :x[OSC-DIR-0301] |
| Accrediting authority | Director, Communications Security |
| Re-accreditation due | 02 MAR 2009 |
| Residual risk accepted | :r[R-4 (audit archive media read at the reviewing workstation); R-11 (audit trails of Council Secretariat workstations not available to this position)]{tier=2 auth="CMS" ref="CMS-08-0422"} |

## Support

MERIDIAN Service Desk, Communications Security: ext. 1-7700, 0600Z to 1800Z (0200 to 1400 EDT).

## Licence notices

Notices for the components that require one are reproduced in the colophon, :x[OSC-SYS-COL]. The presence of a notice on this page does not confer any right on the operator.
