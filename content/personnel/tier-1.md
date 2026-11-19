---
id: personnel-tier-1
route: /personnel/tier/1
app: personnel
family: personnel
template: record
docNo: OSC-PER-T1
title: "Tier 1: Core Council"
marking: UMBRA-U
originator: PV/ALPHA-01
revision: 5
date: 2008-03-14
summary: "Tier 1, the Core Council: members by category, clearance UMBRA/OSC UNRESTRICTED, full network awareness. Seat holders are not named."
distribution:
  - Council Secretariat
  - Director, Personnel & Vetting
xrefs: [OSC-PER-IDX, OSC-CNL-SEAT-00, OSC-CNL-CHR-II, OSC-CNL-CHR-V, OSC-PER-VET]
recordType: TIER RECORD
fields:
  - { label: "Tier", value: "1" }
  - { label: "Designation", value: "Core Council" }
  - { label: "Clearance", value: "UMBRA/OSC UNRESTRICTED" }
  - { label: "Knowledge scope", value: "Full network awareness" }
  - { label: "Personnel number series", value: "P-1 (issued by the Council Secretariat)", mono: false }
  - { label: "Record held by", value: "Council Secretariat, ALPHA-01" }
revisions:
  - { rev: "5", date: "2008-03-14", change: "Seat categories restated to agree with OSC-CNL-SEAT-00. Holder column withheld at origin.", by: "PV" }
  - { rev: "4", date: "2006-11-02", change: "Succession procedure reference updated (Charter Article II).", by: "PV" }
---

## Strength and composition

Tier 1 strength is :c[tiers.1.count]. Composition is fixed by the Council and is stated in the Facility Inventory:

::canon-table{source="tiers.1.composition" cols="role:Category,count:Members"}

Clearance is :c[tiers.1.clearance]. Knowledge scope: :c[tiers.1.knowledgeScope].

## Seats

Seats are numbered 01 to 11 and are described by category only. The seat record of each holder is kept by the Council Secretariat (:x[OSC-CNL-SEAT-00]). Personnel & Vetting holds no seat-to-person mapping and does not enter Tier 1 personnel in the directory.

| Seat | Category | Holder |
|---|---|---|
| 01 | Cabinet-level | :r[Holder, office held and date of appointment]{tier=1 auth="CS" ref="CS-06-140"} |
| 02 | Cabinet-level | :r[Holder, office held and date of appointment on succession]{tier=1 auth="CS" ref="CS-06-140"} |
| 03 | Cabinet-level | :r[Holder and office held]{tier=1 auth="CS" ref="CS-06-140"} |
| 04 | Cabinet-level | :r[Holder, office held and date of appointment]{tier=1 auth="CS" ref="CS-06-140"} |
| 05 | Agency director | :r[Holder and agency]{tier=1 auth="CS" ref="CS-06-140"} |
| 06 | Agency director | :r[Holder, agency and date of appointment]{tier=1 auth="CS" ref="CS-06-140"} |
| 07 | Agency director | :r[Holder, agency and date of appointment on succession, with note]{tier=1 auth="CS" ref="CS-06-104"} |
| 08 | Senior military | :r[Holder, service and rank]{tier=1 auth="CS" ref="CS-06-140"} |
| 09 | Senior military | :r[Holder, service, rank and date]{tier=1 auth="CS" ref="CS-06-140"} |
| 10 | Defense industry | :r[Holder and company]{tier=1 auth="CS" ref="CS-06-140"} |
| 11 | Defense industry | :r[Holder, company and date]{tier=1 auth="CS" ref="CS-06-140"} |

## Appointment and succession

Members are appointed and succeed under Charter Article II (:x[OSC-CNL-CHR-II]). Investigation of a member under the OSC supplement (:x[OSC-PER-VET]) is conducted by the Council Secretariat, not by Personnel & Vetting, and its results are not returned to this office. A member's personnel number is issued from the P-1 series by the Secretariat on appointment and is not reissued on succession; a successor receives a new number.

## Personnel accounting

Tier 1 members are counted in the tier figures of :x[OSC-PER-IDX] and are paid on the central account. They do not appear on any facility strength return. The Council's own provision on accounting for persons is at Charter Article V (:x[OSC-CNL-CHR-V]).

:::redact{tier=2 auth="CS" ref="CS-06-140"}
Members are berthed at ALPHA-01 in a residential area reserved to the Council and are not allocated berths in the facility berthing plan. Staff attached to members (aides, drivers and protection details) are Tier 2 or Tier 3 personnel of the Council Secretariat and are counted on the ALPHA-01 return.
:::
