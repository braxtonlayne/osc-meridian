---
id: personnel-org
route: /personnel/org
app: personnel
family: personnel
template: record
docNo: OSC-PER-ORG
title: "Organisation Chart: Council, Divisions and Facility Commands"
marking: UMBRA-C
originator: PV/ALPHA-01
revision: 9
date: 2008-04-01
summary: Organisation of the Office from the Core Council through the Council Secretariat and the thirteen divisions to the facility commands, with division codes and heads.
distribution:
  - Division directors
  - Facility commanders
  - All MERIDIAN workstations (read only)
xrefs: [OSC-PER-IDX, OSC-CNL-SEAT-00, OSC-PER-DIR, OSC-PER-T1, OSC-PER-T2, OSC-ASR-CG, OSC-FAC-IDX]
recordType: ORGANISATION RECORD
fields:
  - { label: "Chart", value: "Council, divisions and facility commands" }
  - { label: "As at", value: "01 APR 2008" }
  - { label: "Maintained by", value: "PV Personnel Number Register" }
  - { label: "Division codes", value: "As used in withholding marks, document originators and mail addresses" }
revisions:
  - { rev: "9", date: "2008-04-01", change: "Division heads confirmed. Medical Services shown at ALPHA-05.", by: "PV" }
  - { rev: "8", date: "2007-08-15", change: "Communications Security separated from Transit Operations.", by: "PV" }
  - { rev: "7", date: "2006-12-04", change: "Cover Operations moved to ALPHA-04 on facility completion.", by: "PV" }
---

The interactive chart in the Personnel System is drawn from this record. Boxes show offices, not persons, except where a head is named. The Core Council is shown as a single box (:x[OSC-PER-T1]); seat records are held by the Council Secretariat (:x[OSC-CNL-SEAT-00]).

## Structure

- **CORE COUNCIL** (Tier 1)
  - **Council Secretariat (CS)**, Secretary to the Council
    - Network divisions: IAD, TO, FE, CMS, PV, CMP, RD, MS, LR, SFC
    - Facility commands: ALPHA commanders; BETA commanders; GAMMA site superintendents (through the parent BETA command); DELTA sites (through the parent BETA command, guard rotation by SFC)
  - **Office of Internal Assurance (OIA)**: :r[reports directly to the Council through the presiding seat; not through the Secretariat]{tier=2 auth="CS" ref="OSC-CNL-SEAT-00"}
  - **Cover Operations (CVO)**: :r[reports directly to the Council through the presiding seat; tasked by the Council in session]{tier=2 auth="CS" ref="OSC-CNL-SEAT-00"}

Network divisions are seated at an ALPHA facility but act for all facilities within their mandate. A facility commander commands every person posted to the facility, including personnel of network divisions, for discipline, berthing and the strength return; the division directs their work.

## Divisions

| Code | Division | Seat | Head | Personnel no. |
|---|---|---|---|---|
| CS | Council Secretariat | ALPHA-01 | Arthur Penhallow, Secretary to the Council | P-2-01-0012 |
| OIA | Office of Internal Assurance | ALPHA-01 | Celia Brandauer, Director | P-2-01-0047 |
| RD | Records Division | ALPHA-03 | Julian Harrow, Chief | P-2-03-0097 |
| TO | Transit Operations | ALPHA-01 | Dennis Harker, Director | P-2-02-0102 |
| FE | Facilities Engineering | ALPHA-02 | Irene Lockhart, Chief Engineer | P-2-02-0091 |
| PV | Personnel & Vetting | ALPHA-01 | Marjorie Easterbrook, Director | P-2-01-0066 |
| CMP | Comptroller | ALPHA-01 | Bernard Achterberg, Comptroller | P-2-01-0074 |
| CMS | Communications Security | ALPHA-02 | Martin Szabo, Director | P-2-02-0110 |
| MS | Medical Services | ALPHA-05 | Simon Mallory MD, Director | P-2-02-0114 |
| LR | Logistics & Reserves | ALPHA-05 | Glenda Pratt, Director | P-2-03-0105 |
| CVO | Cover Operations | ALPHA-04 | Rosalind Kerr, Director | P-2-02-0088 |
| SFC | Security Forces Command | ALPHA-02 | Col (Ret.) Dwayne Pruitt, Commandant | P-2-03-0127 |
| IAD | Intelligence & Analysis | ALPHA-01 | Graham Tolliver, Director | P-2-01-0083 |

Mandates in full:

::canon-table{source="divisions" cols="id:Code,mandate:Mandate"}

The certified mileage return named in the Transit Operations mandate is the figure reported to the Council, last certified at :c[headline.tunnelCertifiedMi] route miles. Engineering lengths are held by Facilities Engineering and are not part of the return.

Division codes are the withholding authorities used on redaction marks (:x[OSC-ASR-CG]) and the first element of document originators and mail domains.

## Facility commands

::canon-table{source="facilities" filter="class=ALPHA" cols="id:Facility,codename:Name,commanderId:Commander (personnel no.)"}

BETA commanders and GAMMA site superintendents are listed by personnel number in the Personnel Directory (:x[OSC-PER-DIR]). The full list of installations is in the Facility Registry (:x[OSC-FAC-IDX]). Facility command staff are Tier 2 (:x[OSC-PER-T2]).

## Deputies and signature

Each ALPHA command has a deputy commander and a chief of staff. Routine notices of the command are signed by the deputy commander. Where another officer signs for the deputy commander the notice is valid as signed; delegations are notified to Records Division.

Strength figures for every box on this chart are in :x[OSC-PER-IDX].
