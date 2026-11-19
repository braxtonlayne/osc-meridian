---
id: personnel-branch-sup
route: /personnel/branch/sup
app: personnel
family: personnel
template: record
docNo: OSC-PER-BR-SUP
title: "Functional Branch: Medical, Logistics and Facility Support"
marking: TSSCI-OSC
originator: PV/ALPHA-01
revision: 3
date: 2007-10-05
summary: Functional branch record for medical, logistics and supply, food service and maintenance personnel, with the cafeteria rotation and air handling staffing.
distribution:
  - Branch members (through supervisors)
  - Director, Medical Services
  - Director, Logistics & Reserves
  - Facility command sections
xrefs: [OSC-PER-RATIO, OSC-PER-ORG, OSC-DIR-0141, OSC-DIR-0128, OSC-DIR-0204, OSC-DIR-0480, OSC-DIR-0189]
recordType: FUNCTIONAL BRANCH RECORD
fields:
  - { label: "Branch", value: "Medical, Logistics and Facility Support" }
  - { label: "Functions", value: "Medical; Logistics & Supply; Food Service; Maintenance" }
  - { label: "Professional heads", value: "Director, Medical Services (MS); Director, Logistics & Reserves (LR)" }
  - { label: "Grades", value: "OS-2 to OS-9 (Tier 4); medical officers OS-11 to OS-13" }
  - { label: "Training authority", value: "Facility command, with MS and LR" }
revisions:
  - { rev: "3", date: "2007-10-05", change: "Dining rotation brought into line with OSC-DIR-0141 Rev 4.", by: "PV Postings Branch" }
  - { rev: "2", date: "2006-05-30", change: "Maintenance shown as a separate function from Food Service.", by: "PV Postings Branch" }
---

This record is for members of the branch, most of whom are Tier 4. Model shares are from the ratio model (:x[OSC-PER-RATIO]):

::canon-table{source="ratioModel.rows" filter="function!=Command & Administration,function!=Intelligence/Analysis,function!=Security Forces,function!=Military Operations,function!=Technical/Engineering,function!=Communications" cols="function:Function,pct:Model per cent,count:At reference capacity"}

## Medical

Site medical officers, nurses, medical technicians and pharmacy technicians, under the professional direction of Medical Services. Each staffed facility has a sick bay on the accommodation level; ALPHA sites keep a surgical suite. The site medical officer conducts medical readiness reviews (:x[OSC-DIR-0204]) and keeps the readiness list for the command section. Pharmacy technicians rotate pharmaceutical stocks on the schedule issued by Medical Services and record each rotation by lot number.

## Logistics & Supply

Storekeepers, logistics coordinators and tram freight handlers, under Logistics & Reserves for stocks and under the facility command for everything else. Stores are issued against a signed request and counted weekly. Freight is received at the tram platform only during booked freight paths; anything arriving outside a path is held on the platform and reported to the shift supervisor.

## Food Service

Cooks, assistant cooks, servery and dishwash staff, and the dining office. Food service at each facility follows the cafeteria rotation in :x[OSC-DIR-0141]:

| Item | Arrangement |
|---|---|
| Menu cycle | Six-week cycle, published weekly by the dining office |
| Dining hours | Four sittings, aligned with shift changes; a cold service runs between sittings |
| Special diets | Notified to the dining office on arrival; changes take effect the following Monday |
| Staff rotation | Cooks rotate between hot line, preparation and bakery every two weeks |
| Stock rotation | Stores drawn from reserve stock in date order; dining office records lot numbers |

Food service staff hold a food hygiene certificate and a medical readiness certification before their first shift.

## Maintenance

General maintenance technicians, painters, plumbers, carpenters and cleaners, working to the facility maintenance schedule. Air handling filter changes are staffed jointly with life support technicians under :x[OSC-DIR-0128]: maintenance provides two persons per air handling unit for the filter change and the life support technician signs the change record. Filter changes on a level are posted on the level notice board three days ahead.

## Conditions common to the branch

- Shifts: three eight-hour shifts in food service and maintenance; medical on call outside the day shift.
- Leave is requested on OSC-F-104 through the supervisor (:x[OSC-DIR-0189]).
- Smoking is permitted only in designated areas (:x[OSC-DIR-0480]).
- Lockers and mail slots are allocated by the command section administrative office.
- Uniform: issued on arrival, two sets, exchanged at the laundry counter.
