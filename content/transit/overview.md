---
id: transit-overview
route: /transit
app: transit
family: transit
template: record
docNo: OSC-TRN-TT-08-02
title: Network Control Overview and Working Timetable No. 2 of 2008
marking: UMBRA-C
originator: TO/ALPHA-01
revision: 2
date: 2008-03-28
summary: Working timetable No. 2 of 2008, effective 01 APR 2008. Rail paths by segment, tram paths by network, headways, speed basis, Network Control watch roster and board notices.
supersedes: OSC-TRN-TT-08-01
xrefs: [OSC-TRN-RS, OSC-TRN-ENG, OSC-TRN-SEG-04, OSC-TRN-INC-08-017, OSC-TRN-POS-08-044, KB-0042, OSC-SYS-GLO, OSC-DIR-0262, OSC-TRN-SEG-01, OSC-TRN-SEG-05, OSC-TRN-NET-CEN]
distribution:
  - Network Control, ALPHA-01 (all watches)
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Platform supervisors, ALPHA-01 to ALPHA-05
  - Chief Engineer, Facilities Engineering (info)
  - Security Forces Command, escort desk (info)
  - Travel offices, ALPHA sites (rail paths only)
recordType: WORKING TIMETABLE
fields:
  - { label: Timetable, value: "No. 2 of 2008", mono: true }
  - { label: Effective, value: "01 APR 2008 0000Z (31 MAR 2008 2000 EDT)", mono: true }
  - { label: Remains in force, value: "Until superseded by No. 3 of 2008" }
  - { label: Issued by, value: "Network Control, Transit Operations, ALPHA-01" }
  - { label: Board, value: "MERIDIAN Network Control board, schematic and geographic views" }
  - { label: Bulletins, value: "Weekly, Mondays, by Network Control" }
revisions:
  - { rev: "1", date: "2008-03-14", change: "Issued for comment to Transit Control desks.", by: "TO/ALPHA-01" }
  - { rev: "2", date: "2008-03-28", change: "Segment 06 down path retimed 0930Z to 1000Z. Central Network second path added on BETA-09 to GAMMA-17. Watch roster updated.", by: "TO/ALPHA-01" }
routing:
  - { office: "Network Control", action: "Prepare", initials: "WB", date: "2008-03-24" }
  - { office: "Transit Control, ALPHA-05", action: "Coordinate", initials: "EV", date: "2008-03-25" }
  - { office: "Director, Transit Operations", action: "Approve", initials: "DH", date: "2008-03-27" }
---

## 1. Purpose and status

This document is the working timetable for the inter-hub rail segments and the four regional tram networks, and the home record of the Network Control board. It supersedes Working Timetable No. 1 of 2008 (OSC-TRN-TT-08-01) from 01 APR 2008 0000Z (31 MAR 2008 2000 EDT). Paths not shown here are not booked. Unscheduled movements are entered in the incident log, not added to this timetable.

Passenger booking against the paths below is made on OSC-F-109 under :x[OSC-DIR-0262]. Passengers are not told the consist ID in advance. Travel offices receive the rail path tables only.

## 2. Speed basis and running times

Running times are calculated on the line speed basis below and are those given on the segment engineering sheets. They are not recalculated by Network Control.

| System | Speed basis | Source |
|---|---|---|
| Inter-hub rail | :c[transitTech.railSystem], :c[transitTech.railSpeed] | Segment engineering sheets, FE |
| Regional tram | :c[transitTech.tramSystem], :c[transitTech.tramSpeed] | Network sheets, TO |

Minimum headway on rail segments is two clear block sections in the same direction. Minimum headway on tram links is one clear block. Dwell at hub platforms is 20 minutes for rail and 10 minutes for tram unless shown otherwise.

## 3. Rail paths by segment (Monday to Friday)

Down paths run from the first-named hub. Saturday and Sunday: first path in each direction only, except Segment 01, which keeps its full pattern. Times are Zulu with platform-local time in brackets.

| Seg | Path | Departs | Arrives | Consist | Running time (h) |
|---|---|---|---|---|---|
| 01 | 1D01 | ALPHA-01 1100Z (0700 EDT) | ALPHA-03 1306Z (0906 EDT) | R01-214 | :c[railSegments.01.hours] |
| 01 | 1U02 | ALPHA-03 1400Z (1000 EDT) | ALPHA-01 1606Z (1206 EDT) | R01-214 | :c[railSegments.01.hours] |
| 01 | 1D03 | ALPHA-01 1700Z (1300 EDT) | ALPHA-03 1906Z (1506 EDT) | R01-216 | :c[railSegments.01.hours] |
| 01 | 1U04 | ALPHA-03 2000Z (1600 EDT) | ALPHA-01 2206Z (1806 EDT) | R01-216 | :c[railSegments.01.hours] |
| 01 | 1D05 | ALPHA-01 2300Z (1900 EDT) | ALPHA-03 0106Z (2106 EDT) | R01-214 | :c[railSegments.01.hours] |
| 01 | 1U06 | ALPHA-03 0200Z (2200 EDT) | ALPHA-01 0406Z (0006 EDT) | R01-214 | :c[railSegments.01.hours] |
| 02 | 2D01 | ALPHA-01 1200Z (0800 EDT) | ALPHA-02 2036Z (1436 MDT) | R02-108 | :c[railSegments.02.hours] |
| 02 | 2U02 | ALPHA-02 1300Z (0700 MDT) | ALPHA-01 2136Z (1736 EDT) | R02-111 | :c[railSegments.02.hours] |
| 03 | 3D01 | ALPHA-02 1500Z (0900 MDT) | ALPHA-04 1912Z (1212 PDT) | R03-052 | :c[railSegments.03.hours] |
| 03 | 3U02 | ALPHA-04 2130Z (1430 PDT) | ALPHA-02 0142Z (1942 MDT) | R03-052 | :c[railSegments.03.hours] |
| 04 | | No paths. Not in revenue service. | | | |
| 05 | 5D01 | ALPHA-03 1230Z (0830 EDT) | ALPHA-05 1836Z (1336 CDT) | R05-031 | :c[railSegments.05.hours] |
| 05 | 5U02 | ALPHA-05 1300Z (0800 CDT) | ALPHA-03 1906Z (1506 EDT) | R05-034 | :c[railSegments.05.hours] |
| 06 | 6D01 | ALPHA-01 1000Z (0600 EDT) | ALPHA-05 1748Z (1248 CDT) | R06-019 | :c[railSegments.06.hours] |
| 06 | 6U02 | ALPHA-05 1100Z (0600 CDT) | ALPHA-01 1848Z (1448 EDT) | R06-022 | :c[railSegments.06.hours] |

Segment sheets: :x[OSC-TRN-SEG-01], :x[OSC-TRN-SEG-02], :x[OSC-TRN-SEG-03], :x[OSC-TRN-SEG-04], :x[OSC-TRN-SEG-05], :x[OSC-TRN-SEG-06].

Note 1. Consist identities may be suppressed on the board by Transit Control on instruction (glossary: CONSIST ID, :x[OSC-SYS-GLO]). Board conventions are described in :x[KB-0042].

Note 2. Path 6D01 was retimed from 0930Z to 1000Z at Revision 2 to clear the 0945Z platform 1 crew change at ALPHA-01. Travel offices holding Revision 1 tables are to reissue bookings for 6D01.

## 4. Tram paths by network (daily)

The Central Network is shown in full. Paths on the other three networks are carried in the network sheets and are released to holders of the network geography compartment.

**Central Network** (:x[OSC-TRN-NET-CEN]), hub ALPHA-03, platform 3:

| Link | Paths each way | First departure from hub end | Standard consist | Notes |
|---|---|---|---|---|
| ALPHA-03 to BETA-09 | 2 | 1100Z (0700 EDT) | TCE-011 | Second path 2300Z (1900 EDT) Monday, Wednesday, Friday only |
| BETA-09 to GAMMA-10 | 2 | 0900Z (0400 CDT) | TCE-014 | Shuttle; stables at BETA-09 |
| BETA-09 to GAMMA-17 | 2 | 1500Z (1000 CDT) | TCE-016 | Second path added at Revision 2 |
| BETA-05 to GAMMA-10 | 1 | 1400Z (0900 CDT) | TCE-019 | Consist provided from outside the Central Network |

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
**Eastern Network** (hub ALPHA-01, platforms 4 and 5): ALPHA-01 to BETA-01, 1 path each way, TEA-031. ALPHA-01 to BETA-02, 3 paths each way, TEA-022 and TEA-024. ALPHA-01 to BETA-10, 1 path each way, TEA-035. BETA-02 to GAMMA-03, 4 paths each way, TEA-040 shuttle. BETA-02 to GAMMA-04, 2 paths each way, TEA-042. BETA-10 to GAMMA-07, 2 paths each way, TEA-046.

**Southern Network** (hub ALPHA-05, platforms 3 to 6): ALPHA-05 to BETA-03, 1 path each way, TSO-008. ALPHA-05 to BETA-12, 2 paths each way, TSO-012. ALPHA-05 to BETA-05, 1 path each way, TSO-015. BETA-03 to GAMMA-05, 2 paths, TSO-021. BETA-03 to GAMMA-06, 1 path, TSO-023. BETA-12 to GAMMA-16, 1 path, TSO-027. ALPHA-05 to GAMMA-08, 2 paths, TSO-030. ALPHA-05 to GAMMA-09, 3 paths, TSO-033.

**Mountain/Western Network** (hubs ALPHA-02, platforms 4 to 6, and ALPHA-04): ALPHA-02 to BETA-04, 1 path, TMW-004. ALPHA-02 to BETA-11, 2 paths, TMW-009. ALPHA-02 to BETA-06, 1 path, TMW-011. ALPHA-04 to BETA-07, 1 path, TMW-017. ALPHA-04 to BETA-08, 2 paths, TMW-020. BETA-07 to GAMMA-13, 2 paths, TMW-024. BETA-08 to GAMMA-11, 2 paths, TMW-026. BETA-11 to GAMMA-14, 1 path, TMW-028. ALPHA-04 to GAMMA-12, 2 paths, TMW-031.
:::

## 5. Network Control watch roster

Network Control, ALPHA-01, Level 13 control room. One dispatcher on the desk at all times; a Transit Control duty controller is on call for possessions and instructions.

| Watch | Hours | Dispatcher | Relief |
|---|---|---|---|
| Watch 1 | 0600Z-1400Z (0200-1000 EDT) | W. Brennecke | S. Ochs |
| Watch 2 | 1400Z-2200Z (1000-1800 EDT) | C. Albright | S. Ochs |
| Watch 3 | 2200Z-0600Z (1800-0200 EDT) | Y. Reyes-Whitt | T. Mallory |

Handover is taken at the desk against the board. The outgoing dispatcher stays on the desk until the incoming dispatcher has signed the log. Leave and exchanges of watch are arranged with the Network Control supervisor, not between dispatchers.

## 6. Notices to dispatchers (current; maintained by Network Control between revisions)

- 02 MAY 2008. Escalator E2, ALPHA-01 Level 13 concourse, out of use pending parts (see incident log). Passengers to use stair S1.
- 21 APR 2008. Tram brake test regime revised for TEA-series consists after overhaul. Consists returning from the ALPHA-02 depot run one loaded brake test before first booked path.
- 05 MAY 2008. Platform 2, ALPHA-03: tactile edge strip replacement, night possessions, no effect on booked paths.
- 12 MAY 2008. Possession :x[OSC-TRN-POS-08-044] booked for 13 MAY 2008 by Facilities Engineering.
- 14 MAY 2008. Incident :x[OSC-TRN-INC-08-017] closed by the Director, Transit Operations. No change to working.

## 7. Annex A: Consist allocation

:::redact{compartment=KESTREL auth="TO" ref="OSC-CB-011"}
Rail consists are numbered for the segment of their first booked run (:x[OSC-TRN-RS]). Allocation for this timetable:

| Series | Allocated to | In this timetable |
|---|---|---|
| R01-2xx | Segment 01 | R01-214, R01-216; R01-219 spare at ALPHA-01 |
| R02-1xx | Segment 02 | R02-108, R02-111 |
| R03-05x | Segment 03 | R03-052; R03-055 at depot |
| R04-001, R04-002 | Segment 04 | Allocated, not booked |
| R05-03x | Segment 05 | R05-031, R05-034 |
| R06-01x, R06-02x | Segment 06 | R06-019, R06-022 |

Series R04-900 to R04-999 reserved to Transit Control; not allocated to vehicles in this timetable.

Tram consists carry the network letters EA, SO, MW or CE and are allocated by network sheet.
:::

Prepared by W. Brennecke, Network Control. Approved D. Harker, Director, Transit Operations, 27 MAR 2008. Engineering basis: :x[OSC-TRN-ENG].
