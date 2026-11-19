---
id: system-calendar
route: /system/calendar
t4: true
app: system
family: system
template: index
docNo: OSC-SYS-CAL
title: Facility Calendar, MAY 2008
marking: TSSCI-OSC
originator: CS/ALPHA-01
revision: 1
date: 2008-05-01
summary: "Facility calendar for MAY 2008, filtered by tier: food service rotation, generator tests, filter cycles, drills, training suspenses, possessions, personnel accounting dates."
xrefs: [OSC-TRN-POS-08-044, OSC-F-131, OSC-SYS-MON, OSC-DIR-0233]
---

Events booked by divisions and sites for MAY 2008, as entered by the originating office. Times are Zulu, with the civil time at the site's surface location in brackets. Where the originator has entered no times, none are shown. Each entry is shown to the tier stated in its booking; entries above your access are not listed.

Corrections to an entry are made by its originator, not by the Council Secretariat. The calendar is reissued on the first working day of each month.

::canon-table{source="calendar" filter="tier!=2" cols="dateText:Date,timeText:Time,facility:Site,title:Event,category:Category,originator:Originator,note:Note"}

:::redact{tier=2 auth="CS" ref="CS-08-041"}
Entries booked at Tier 2:

::canon-table{source="calendar" tier="2" cols="dateText:Date,timeText:Time,facility:Site,title:Event,category:Category,originator:Originator,note:Note"}
:::

## Notes

1. Possessions of rail segments and tram links are entered by Transit Control as booked. The limits, party and times of a possession are given in the possession record, for example :x[OSC-TRN-POS-08-044], and not in this calendar.
2. Unposted status declarations are made on :x[OSC-F-131]. Declarations received after collection closes are carried to the following month's personnel accounting under :x[OSC-DIR-0233].
3. Medical readiness certifications expiring on 31 MAY 2008 must be renewed at the appointments on 21 MAY 2008. Personnel with a lapsed certification are removed from the seal roster on 01 JUN 2008.
4. Work affecting MERIDIAN services (print release, QKD links) is also shown in the System Monitor, :x[OSC-SYS-MON].
5. Federal holidays are observed at surface cover facilities under cover agency arrangements. Below the surface, minimum manning applies.
