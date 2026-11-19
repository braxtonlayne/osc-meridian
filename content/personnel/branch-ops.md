---
id: personnel-branch-ops
route: /personnel/branch/ops
app: personnel
family: personnel
template: record
docNo: OSC-PER-BR-OPS
title: "Functional Branch: Command, Intelligence and Military Operations"
marking: TSSCI-OSC
originator: PV/ALPHA-01
revision: 3
date: 2007-10-05
summary: "Functional branch record for command and administration, intelligence and analysis, and military operations personnel: posts, grades, qualifications and training."
distribution:
  - Branch members (through supervisors)
  - Director, Intelligence & Analysis
  - Facility commanders
xrefs: [OSC-PER-RATIO, OSC-PER-ORG, OSC-DIR-0288, OSC-DIR-0412, OSC-PER-BR-SEC]
recordType: FUNCTIONAL BRANCH RECORD
fields:
  - { label: "Branch", value: "Command, Intelligence and Military Operations" }
  - { label: "Functions", value: "Command & Administration; Intelligence/Analysis; Military Operations" }
  - { label: "Professional head", value: "Director, Intelligence & Analysis (IAD) for analysis posts" }
  - { label: "Grades", value: "OS-5 to OS-13; Tier 2 senior appointments" }
  - { label: "Training authority", value: "PV, with IAD" }
revisions:
  - { rev: "3", date: "2007-10-05", change: "Watch qualification for BETA analysis cells added.", by: "PV Postings Branch" }
---

This record is for members of the branch. It sets out the posts in the branch, the grades they carry and the training each post requires. Model shares are from the ratio model (:x[OSC-PER-RATIO]); reporting lines are in :x[OSC-PER-ORG].

::canon-table{source="ratioModel.rows" filter="function!=Security Forces,function!=Technical/Engineering,function!=Medical,function!=Communications,function!=Logistics & Supply,function!=Food Service,function!=Maintenance" cols="function:Function,pct:Model per cent,count:At reference capacity"}

## Command & Administration

Posts: command section officer, administrative officer, registry clerk, personnel clerk, typist-clerk. The command section of each facility keeps the strength return, the badge and locker registers, the parking allocation, the rota board and the facility's routine notices. Grades OS-5 to OS-9. Command section officers are trained in the strength return (:x[OSC-DIR-0233]) before their first month-end.

## Intelligence/Analysis

Analysts serve on the intelligence fusion floor at ALPHA-01 or in a regional analysis cell at a BETA site, under the professional direction of Intelligence & Analysis. The fusion floor works three watches; cells work the day watch with an on-call analyst at night. Posts: watch analyst, senior analyst, cell chief, collection manager, reports officer. Grades OS-7 to OS-13; cell chiefs at a BETA site are Tier 2 by appointment.

Qualifications. Before a first watch an analyst completes the watch qualification (three supervised watches and a written test on the daily continuity summary format). Analysts are briefed into the compartments their cell's work requires (:x[OSC-DIR-0412]) and no others.

Products. The fusion floor issues the daily continuity summary at 1100Z. Cells contribute by 0900Z. Late contributions are carried to the next day's summary and marked LATE.

## Military Operations

:::redact{tier=2 auth="SFC" ref="OSC-PER-BR-OPS"}
Military operations posts exist only at facilities with a military operations function and are filled by officers and senior non-commissioned officers retired from the armed services within the preceding five years. Posts: operations officer, plans officer, liaison officer (Joint Staff), watch officer. The branch maintains the plans for the recovery of command of designated forces from a facility, liaison with the military continuity sites, and the order of battle of forces expected to report to the Office after a declared discontinuity. Military operations staff are not part of Security Forces Command and do not command security forces (:x[OSC-PER-BR-SEC]).
:::

## Training common to the branch

| Requirement | Frequency | Authority |
|---|---|---|
| Annual security refresher | Annual, by division suspense | :x[OSC-DIR-0288] |
| Handling of compartmented records | On each new briefing | :x[OSC-DIR-0412] |
| Strength return (command sections) | On appointment | :x[OSC-DIR-0233] |
| Watch qualification (analysts) | On appointment and after 90 days off watch | IAD |
| Relocation drill | Twice yearly | Facility command |
