---
id: hoist-procedure
route: /hoist/procedure
app: hoist
family: hoist
template: directive
docNo: OSC-DIR-0466
title: Operation of Shaft Hoists at ALPHA Sites
marking: TSSCI-OSC
originator: FE/ALPHA-02
revision: 3
date: 2008-04-07
xrefs: [OSC-DIR-0301, OSC-DIR-0412, OSC-DIR-0378, OSC-MEM-07-0851]
summary: Facilities Engineering procedure for the personnel, freight and vehicle hoists and the emergency egress winders at the ALPHA sites, including remote display and calls from MERIDIAN workstations, interlocks, emergency stop, brake tests and loading.
distribution:
  - Duty hoist drivers and hoist engineers, ALPHA-01 to ALPHA-05
  - Site commands, ALPHA-01 to ALPHA-05
  - Security forces post orders offices, ALPHA sites
  - MERIDIAN account holders at ALPHA sites (Shaft Hoist Control)
effective: "2008-04-21"
opr: FE/ALPHA-02
category: Plant and Engineering
approvedBy: { name: O. Garrity, title: "for the Chief Engineer, Facilities Engineering" }
directive:
  directiveNo: OSC-DIR-0466
  effective: "2008-04-21"
  opr: FE/ALPHA-02 (Shafts and Tunnel Structures)
  supersedes: "OSC-DIR-0466 Revision 2, 14 MAY 2007"
  reviewDate: "2009-04-07"
  category: Plant and Engineering
  approvedBy: { name: O. Garrity, title: "for the Chief Engineer, Facilities Engineering" }
revisions:
  - { rev: 1, date: "2005-02-14", change: "First issue. Winder house operation only.", by: "FE/ALPHA-02" }
  - { rev: 2, date: "2007-05-14", change: "Remote display at MERIDIAN workstations (Shaft Hoist Control). Calls from workstations.", by: "FE/ALPHA-02" }
  - { rev: 3, date: "2008-04-07", change: "Emergency stop from workstations at the hoist's own site. Seal drill and network isolation paragraphs added. Para 9 (inspection travel) amended.", by: "FE/ALPHA-02" }
---

## Purpose

This directive sets the rules for operating the shaft hoists at the ALPHA sites, from the winder house and from MERIDIAN workstations running Shaft Hoist Control. Hoist data is in :x[OSC-MEM-07-0851].

## Applicability

It applies to every hoist driver, hoist engineer and onsetter at an ALPHA site, and to every MERIDIAN account holder who opens Shaft Hoist Control. Each ALPHA site has a personnel hoist H1, a freight hoist or vehicle lift H2, and an emergency egress winder H3, from the collar to the working levels. GAMMA and BETA sites are entered by portal and have no shaft hoists.

## Policy

A hoist is driven by one person at a time. The winder house is the control point at every site; a workstation is a remote display with the functions below and no others. A function not available at a workstation is refused at the workstation and recorded in its audit trail.

| Function | Any account holder at the hoist's site | Duty hoist driver or site command (Tier 2) at the site | Any other workstation |
|---|---|---|---|
| Display shaft, cage position, recorder | Yes | Yes | Yes |
| Register a landing call | Yes, subject to para 6 | Yes | No |
| Emergency stop | Yes | Yes | No |
| Mode key, level selector, run, stop, gates, loading report, brake test, trip reset | No | Yes | No |

## Modes

The mode key has three positions. **AUTO**: the hoist controller answers registered calls, nearest first, works the gates and holds them open :c[apps.hoist.model.dwellSec] seconds at each landing. **MANUAL**: the driver selects a landing on the level selector and presses RUN; gates are worked from the console. **INSPECT**: speed is limited to :c[apps.hoist.model.inspectionFpm] feet per minute and the cage is moved only while an INCH button is held, for shaft and rope inspection.

The key is held by the duty driver. It is not left in the console.

## Speed profile

Each run accelerates to rated rope speed in the hoist's acceleration time, slows before the landing, and creeps the last :c[apps.hoist.model.creepFt] feet at :c[apps.hoist.model.creepFpm] feet per minute. Short runs between adjacent landings do not reach rated speed. Rated speeds are :c[hoists.A01-H1.speedFpm] fpm for the personnel hoists, :c[hoists.A01-H2.speedFpm] fpm for the freight hoists and vehicle lifts and :c[hoists.A01-H3.speedFpm] fpm for the egress winders.

## Landing calls and restricted landings

A call is registered from the landing call station or from the Call stations view of Shaft Hoist Control at the same site. A call to a landing above the caller's access determination is not registered: Tier 2 levels are called through the escort desk, and the ALPHA-03 cold storage landing is restricted to LANTERN holders (:x[OSC-DIR-0412]). A refused call is reported to the caller by the winder house.

Tier 1 levels are not served by the shaft hoists. They are reached by escorted lift.

## Interlocks

The drive will not run with the landing or cage gates open, with the load cell above the rated payload or the rated number of persons, while a brake test is in progress, or while the hoist is tripped. Rated loads are in :x[OSC-MEM-07-0851]. The onsetter reports the loading to the driver with the gates open; an overload holds the cage at the landing until it is unloaded, and is recorded.

During a network seal drill the portal landing is sealed when the site begins to seal. Runs and calls to the portal landing are held until stand-down. Runs below the portal are not affected.

While the network is isolated, hub and site control circuits are down. A hoist in motion completes its run and the winder house keeps local control; every workstation loses calls, emergency stop and the driver's console until the circuits are restored.

## Emergency stop

The emergency stop applies the brake at once and trips the hoist. The cage stops between landings if it was running. It is used for danger to persons or plant only.

After an emergency stop the hoist is not run until the duty hoist engineer has inspected the rope and brake. The engineer returns the hoist to service from the winder house, normally within :c[apps.hoist.model.estopInspectionMin] minutes, or the driver resets the trip at the console when the engineer is present. Each emergency stop is reported by the winder house to the account holder who applied it and recorded in the event recorder. An emergency stop applied from a workstation is also notified to the Office of Internal Assurance.

## Brake test

A static brake test is made at the start of each day's driving, in MANUAL, with the cage at rest at a landing and the gates closed. The drive applies :c[apps.hoist.model.brakeTestTorquePct] percent of rated torque against the holding brake for :c[apps.hoist.model.brakeTestSec] seconds. The result is entered in the recorder. BRAKE TEST DUE shows until the day's test is passed.

## Inspection travel

Inspection travel below the bottom landing is limited by the final limit. Where a shaft is fitted for travel below the bottom landing, the travel is booked in advance and is not made on a routine inspection. A cage that reaches a final limit trips the hoist; the trip is reset at the console.

## Records

The event recorder keeps the latest :c[apps.hoist.model.recorderEvents] events for all ALPHA hoists. Calls, runs, stops, emergency stops, mode changes, gate operations, loading reports and brake tests made from a workstation are also recorded in the workstation audit trail (:x[OSC-DIR-0301]). An irregular indication on the hoist display is reported under :x[OSC-DIR-0378].

## Responsibilities

The Chief Engineer, Facilities Engineering, is the office of primary responsibility. Site hoist engineers keep the recorder, the brake test record and the rope inspection record. Duty hoist drivers hold the mode key. Site commands authorise Tier 2 drivers at their own site.

## References

(a) :x[OSC-MEM-07-0851], Hoist and Shaft Data, ALPHA Sites. (b) :x[OSC-DIR-0301], MERIDIAN Workstation Use and Accreditation. (c) :x[OSC-DIR-0412], Compartment Briefing Requirement and Handling of Compartmented Records. (d) :x[OSC-DIR-0378], Security Incidents, Self-Reporting and Inquiries.

## Supersession

This revision supersedes Revision 2 of 14 MAY 2007.
