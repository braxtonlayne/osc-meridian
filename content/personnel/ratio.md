---
id: personnel-ratio
route: /personnel/ratio
app: personnel
family: personnel
template: record
docNo: OSC-PER-RATIO
title: Standard Facility Personnel Ratios (ALPHA-01 Model, 4,500 Capacity)
marking: TSSCI-OSC
originator: PV/ALPHA-01
revision: 3
date: 2007-09-10
summary: The ten-function ratio model for a fully staffed ALPHA facility, with the staffing calculator for any facility at any fill.
distribution:
  - Facility commanders
  - Division directors
  - Personnel & Vetting, Postings Branch
xrefs: [OSC-FAC-CLS-ALPHA, OSC-PER-ORG, OSC-PER-IDX, OSC-PER-BR-OPS, OSC-PER-BR-SEC, OSC-PER-BR-TEC, OSC-PER-BR-SUP]
recordType: PLANNING STANDARD
fields:
  - { label: "Standard", value: "Personnel ratio model, ten functions" }
  - { label: "Basis", value: "Fully staffed ALPHA-class facility (ALPHA-01 model)" }
  - { label: "Applies to", value: "Staffing plans, posting requests, recruitment planning" }
  - { label: "Review", value: "Annually, or on change of the reference facility" }
  - { label: "Approved", value: "Director, Personnel & Vetting" }
revisions:
  - { rev: "3", date: "2007-09-10", change: "Calculator added to the Personnel System. Rounding rule stated (para 4).", by: "PV Postings Branch" }
  - { rev: "2", date: "2005-04-11", change: "Communications shown as a separate function.", by: "PV Postings Branch" }
  - { rev: "1", date: "2003-12-01", change: "First issue on completion of the reference facility.", by: "PV Postings Branch" }
---

## Basis

The model is based on :c[ratioModel.basis]. Reference capacity is :c[ratioModel.capacity] persons. It is the standard against which staffing plans for every class are drawn up and posting requests are assessed; it is not a return of actual strength. Class standards are in :x[OSC-FAC-CLS-ALPHA] and the class records.

## Ratio table

::canon-table{source="ratioModel.rows" cols="function:Function,pct:Per cent,count:Persons at reference capacity" caption="Ratio model at reference capacity"}

Functions are grouped into the four functional branches for training and post management: :x[OSC-PER-BR-OPS] (command, intelligence, military operations), :x[OSC-PER-BR-SEC] (security forces), :x[OSC-PER-BR-TEC] (technical, engineering, communications) and :x[OSC-PER-BR-SUP] (medical, logistics, food service, maintenance). Reporting lines are shown in :x[OSC-PER-ORG].

## Low-manning note

Source note, carried unaltered from the Facility Inventory:

> :c[ratioModel.note]

## Staffing calculator

The Personnel System applies the model to any facility at any fill. Enter the facility and either a fill percentage of its berthing or a total strength. The calculator returns persons by function.

- Default view: ALPHA-03 at current posted strength, :c[facilities.ALPHA-03.staff] persons against berthing of :c[facilities.ALPHA-03.capacity].
- Each function is the model percentage of the strength entered, rounded to the nearest whole person. Rows may not sum to the strength entered because of rounding; the difference is not to be posted.
- The calculator applies the model as it stands. It does not adjust for functions a facility does not carry, and it does not draw on facility returns.

Worked example, ALPHA-03 at current posted strength (calculator output, rounded):

| Function | Persons |
|---|---|
| Command & Administration | 16 |
| Intelligence/Analysis | 30 |
| Security Forces | 44 |
| Military Operations | 24 |
| Technical/Engineering | 28 |
| Medical | 12 |
| Communications | 10 |
| Logistics & Supply | 18 |
| Food Service | 8 |
| Maintenance | 10 |
| Total of rounded rows | 200 |

## Use in posting requests

A posting request that would take a function more than five percentage points above the model at the receiving facility is referred to the Postings Branch with the commander's reasons. Requests below the model need no reasons. Strength figures for the request are taken from :x[OSC-PER-IDX], not from the calculator.
