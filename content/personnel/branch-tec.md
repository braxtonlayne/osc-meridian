---
id: personnel-branch-tec
route: /personnel/branch/tec
app: personnel
family: personnel
template: record
docNo: OSC-PER-BR-TEC
title: "Functional Branch: Technical, Engineering and Communications"
marking: TSSCI-OSC
originator: PV/ALPHA-01
revision: 3
date: 2007-10-05
summary: "Functional branch record for technical, engineering and communications personnel, including reactor operators and tunnel engineers: posts, grades, licences and training."
distribution:
  - Branch members (through supervisors)
  - Chief Engineer, Facilities Engineering
  - Director, Communications Security
xrefs: [OSC-PER-RATIO, OSC-PER-ORG, OSC-DIR-0216, OSC-DIR-0128, OSC-DIR-0301, OSC-DIR-0412, OSC-TRN-ENG]
recordType: FUNCTIONAL BRANCH RECORD
fields:
  - { label: "Branch", value: "Technical, Engineering and Communications" }
  - { label: "Functions", value: "Technical/Engineering; Communications" }
  - { label: "Professional heads", value: "Chief Engineer (FE), ALPHA-02; Director, Communications Security (CMS), ALPHA-02" }
  - { label: "Grades", value: "OS-5 to OS-13" }
  - { label: "Licensing authority", value: "FE (reactor and electrical); CMS (key distribution and workstation accreditation)" }
revisions:
  - { rev: "3", date: "2007-10-05", change: "Communications posts moved from Transit Operations to CMS.", by: "PV Postings Branch" }
---

This record is for members of the branch. Model shares are from the ratio model (:x[OSC-PER-RATIO]):

::canon-table{source="ratioModel.rows" filter="function!=Command & Administration,function!=Intelligence/Analysis,function!=Security Forces,function!=Military Operations,function!=Medical,function!=Logistics & Supply,function!=Food Service,function!=Maintenance" cols="function:Function,pct:Model per cent,count:At reference capacity"}

## Technical/Engineering

Engineering staff at each facility belong to Facilities Engineering for their professional work and to the facility command for everything else (:x[OSC-PER-ORG]).

| Post | Grade | Licence or qualification |
|---|---|---|
| Plant technician (life support) | OS-5 to OS-7 | Air handling and seal systems; filter change procedures (:x[OSC-DIR-0128]) |
| Electrical technician | OS-5 to OS-8 | FE electrical authorisation, level 2 or 3 |
| Reactor operator | OS-8 to OS-10 | FE reactor operator licence for the unit concerned |
| Senior reactor operator | OS-10 to OS-12 | FE senior reactor operator licence; normally former naval propulsion plant operators |
| Structures engineer | OS-9 to OS-12 | Chartered or professional engineer, or equivalent |
| Tunnel engineer, tunnel survey technician | OS-7 to OS-12 | FE tunnel authorisation; see below |

Reactor operators hold a licence for one unit. A licence lapses after 90 days without a shift on the unit and is renewed by a supervised shift and an oral examination. Reactor spaces are entered only with a dosimetry badge (:x[OSC-DIR-0216]).

## Tunnel crews

Tunnel engineers and survey technicians are posted to Facilities Engineering at ALPHA-02 and work throughout the rail and tram network under possessions booked through Network Control. Engineering lengths and environmental data are in :x[OSC-TRN-ENG].

:::redact{compartment=KESTREL auth="FE" ref="FE-07-0071"}
A tunnel crew is two engineers or technicians with a security forces escort. The crew leader holds KESTREL; other members are briefed for the segment or network of the possession only. Walk-downs of portal seals are made monthly on each segment, including segments not in revenue service, and are booked by the Tunnel Structures Engineer. Crews record environmental readings at the stations fixed in the segment engineering sheet and nowhere else. Crew vacancies on segments not in revenue service are filled from Facilities Engineering at ALPHA-02 only and are not advertised.
:::

## Communications

Communications specialists operate the key distribution network, the site switchboards and the MERIDIAN workstation estate under Communications Security. Posts: key distribution operator, switchboard supervisor, workstation technician, Service Desk technician. Grades OS-5 to OS-10. Workstation technicians are accredited by CMS and may reissue a workstation only after the previous user profile has been archived (:x[OSC-DIR-0301]).

Key distribution operators work a three-watch rota at ALPHA sites and the day watch elsewhere. Service Desk hours are 0600Z to 1800Z; outside those hours the duty workstation technician at each ALPHA site takes calls.

## Training common to the branch

| Requirement | Frequency |
|---|---|
| Annual security refresher | Annual, by division suspense |
| Handling of compartmented records (:x[OSC-DIR-0412]) | On each new briefing |
| Confined spaces and breathing apparatus | On appointment; refresher every two years |
| Licence or authorisation renewal | As stated on the licence |
| Seal drill | Quarterly, with the facility |
