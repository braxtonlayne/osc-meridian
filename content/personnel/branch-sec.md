---
id: personnel-branch-sec
route: /personnel/branch/sec
app: personnel
family: personnel
template: record
docNo: OSC-PER-BR-SEC
title: "Functional Branch: Security Forces"
marking: TSSCI-OSC
originator: PV/ALPHA-01
revision: 3
date: 2007-10-05
summary: "Functional branch record for security forces personnel: post orders, posts and grades, qualification, the DELTA guard rotation and armament issue."
distribution:
  - Branch members (through detachment commanders)
  - Commandant, Security Forces Command
  - Facility commanders
xrefs: [OSC-PER-RATIO, OSC-PER-ORG, OSC-DIR-0115, OSC-DIR-0163, OSC-DIR-0156, OSC-DIR-0216, OSC-RSV-ARMS]
recordType: FUNCTIONAL BRANCH RECORD
fields:
  - { label: "Branch", value: "Security Forces" }
  - { label: "Professional head", value: "Commandant, Security Forces Command (SFC), ALPHA-02" }
  - { label: "Grades", value: "OS-4 to OS-11; detachment commanders Tier 2 at ALPHA sites" }
  - { label: "Post orders", value: "Issued by SFC; facility annexes by the facility commander" }
  - { label: "Training authority", value: "SFC" }
revisions:
  - { rev: "3", date: "2007-10-05", change: "DELTA rotation changed from 21 to 14 days on post.", by: "PV Postings Branch" }
  - { rev: "2", date: "2006-02-13", change: "Armament issue paragraph moved to Tier 2 annex.", by: "PV Postings Branch" }
---

This record is for members of the security forces. It does not replace your post orders. Model share from the ratio model (:x[OSC-PER-RATIO]):

::canon-table{source="ratioModel.rows" filter="function=Security Forces" cols="function:Function,pct:Model per cent,count:At reference capacity"}

## Command

Security forces at every facility are commanded by Security Forces Command for post orders, armament, qualification and discipline on post, and by the facility commander for everything else. The detachment commander is the facility commander's adviser on security and is not a member of the command section (:x[OSC-PER-ORG]).

## Posts

| Post | Grade | Notes |
|---|---|---|
| Security officer (access control) | OS-4 to OS-6 | Portal, lift lobby and level access points. Checks badges against the access roster (:x[OSC-DIR-0115]). |
| Security officer (patrol) | OS-5 to OS-7 | Level patrols, refuge chamber checks (:x[OSC-DIR-0156]). |
| Escort officer | OS-6 to OS-8 | Escort of visitors (:x[OSC-DIR-0163]) and of consists and maintenance parties when booked. |
| Shift supervisor | OS-8 to OS-9 | One per shift per facility. Signs the shift log. |
| Detachment commander | OS-10 to OS-11 | Tier 2 at ALPHA sites. |

## Shifts and post orders

Security forces work a four-shift rota of twelve hours with a 30-minute handover. Post orders are read and signed at the start of the first shift of each rota week. A post may not be left until relieved. A post order that conflicts with an instruction given on post is reported to the shift supervisor after the instruction has been carried out, unless it would endanger life.

## DELTA guard rotation

DELTA sites are guarded by two-person posts drawn from the security forces of the parent BETA command. Tours are 14 days on post. Guards travel to and from post under escort and do not carry personal mobile telephones, cameras or personal notebooks. A guard is told the location of a DELTA site on the day of travel and is debriefed from it on return. Dosimetry badges are worn where the post orders require (:x[OSC-DIR-0216]).

## Armament issue

:::redact{tier=2 auth="SFC" ref="OSC-PER-BR-SEC"}
Armament is issued from the facility armoury against the post orders for each post and returned at the end of the shift. Access control and patrol posts carry a sidearm; escort officers for consists also carry a carbine. The armoury custodian keeps the issue register by personnel number and reconciles it at each handover. Heavy weapons and their stocks are held under the armaments reserve (:x[OSC-RSV-ARMS]) and are issued only on the order of the facility commander after a declared discontinuity, or for qualification firing. A security officer who discharges a weapon other than at qualification firing makes a written report before the end of the shift, and is withdrawn from armed posts pending review by Security Forces Command.
:::

## Qualification

On appointment: access control course (five days), first aid at work, refuge chamber procedures. Annually: firearms qualification, security refresher, fitness test. Officers who fail the fitness test are restricted to access control posts until they pass.
