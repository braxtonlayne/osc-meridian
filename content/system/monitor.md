---
id: system-monitor
route: /system/monitor
app: system
family: system
template: record
docNo: OSC-SYS-MON
title: "System Monitor: Link States and Services"
marking: TSSCI-OSC
originator: CMS/ALPHA-02
revision: 4
date: 2008-05-01
summary: QKD link state from ALPHA-03 to each ALPHA hub, mail transfer, print queue, audit forwarding and session timer, with planned work for MAY 2008.
xrefs: [OSC-ASR-COMM, KB-0019, OSC-SYS-CAL]
recordType: SYSTEM MONITOR
fields:
  - { label: Site, value: ALPHA-03 }
  - { label: Workstation group, value: "A03-5 (Records Division, Level 5)", mono: false }
  - { label: Refresh, value: Every 30 seconds while open }
  - { label: Monitor owner, value: "CMS/ALPHA-02, Network Operations" }
revisions:
  - { rev: 4, date: 2008-05-01, change: "Planned work for MAY 2008 entered. BUSY state added to legend.", by: CMS/ALPHA-02 }
  - { rev: 3, date: 2008-03-03, change: "Release 4.1.7. Audit forwarding row added.", by: CMS/ALPHA-02 }
---

This page shows the state of the circuits and services this workstation depends on, as last reported to it. States are given in words. The square beside each word repeats the state and never carries meaning on its own. The same link states are shown in the notification area of the taskbar.

The monitor is read-only. Faults are reported automatically to Network Operations. Do not call the Service Desk about a state shown here unless it has been DOWN for more than 30 minutes.

## QKD links from ALPHA-03

| Link | State | Since | Note |
|---|---|---|---|
| ALPHA-03 to ALPHA-01 | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | 0412Z 27 APR 2008 | Primary route for controlled mail and directory updates. |
| ALPHA-03 to ALPHA-02 | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | 1147Z 22 APR 2008 | |
| ALPHA-03 to ALPHA-04 | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | 0930Z 14 APR 2008 | Routed via ALPHA-01 during planned work on 28 MAY (below). |
| ALPHA-03 to ALPHA-05 | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | 2306Z 30 APR 2008 | |

:::redact{tier=2 auth="CMS" ref="CMS-08-0207"}
| Key period | Loaded | Next rollover | Custodian |
|---|---|---|---|
| A03 group key, period 08-05 | 0001Z 01 MAY 2008 | 0001Z 01 JUN 2008 | Key custodian, CMS detachment ALPHA-03 |
:::

### Link state words

| State | Meaning | Action |
|---|---|---|
| <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Circuit keyed and carrying traffic. | None. |
| <span class="status-light status-light--DEGRADED"><span class="status-light__sq" aria-hidden="true"></span><span>DEGRADED</span></span> | Circuit carrying traffic on reduced key rate or an alternate route. Mail may be slow. | None. Controlled mail is queued, not lost. |
| <span class="status-light status-light--DEGRADED"><span class="status-light__sq" aria-hidden="true"></span><span>BUSY</span></span> | Circuit committed to priority traffic. Routine traffic for the hub is held until the priority traffic clears. | None. Not logged as a fault. Clears without action. |
| <span class="status-light status-light--FAULT"><span class="status-light__sq" aria-hidden="true"></span><span>DOWN</span></span> | No keyed circuit. Mail and directory updates for the hub are held. | Report if DOWN for more than 30 minutes. |
| <span class="status-light status-light--OFFLINE"><span class="status-light__sq" aria-hidden="true"></span><span>NOT REPORTED</span></span> | The monitor has had no report for the link. Usually the monitor, not the link. | Close and reopen the monitor. |

The communications network, its independence from other government circuits and the absence of any external connectivity are described in :x[OSC-ASR-COMM].

## Services

| Service | State | Detail |
|---|---|---|
| Mail transfer | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Outbound queue empty. Transfer to all hubs every 60 seconds. |
| Print service (ALPHA-03) | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Release printers A03-5-PRN-01 and A03-5-PRN-02. Jobs held for this operator are listed in the notification area. Unreleased jobs purge after four hours (:x[KB-0019]). |
| Search index | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Index reissued nightly at 0700Z (0300 EDT). |
| Audit forwarding | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Entries forwarded to the Resident Assurance Officer, ALPHA-03, every 15 minutes. |
| Time source | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>UP</span></span> | Network time. Zulu, with site-local (EDT) in brackets. |
| Session | <span class="status-light status-light--NOMINAL"><span class="status-light__sq" aria-hidden="true"></span><span>ACTIVE</span></span> | Locks after 15 minutes without input. Time remaining is shown in the notification area. |

## Planned work, MAY 2008

| Date | Time | Work | Effect at this workstation |
|---|---|---|---|
| 16 MAY 2008 | :c[calendar.CAL-0805-19.timeText] | :c[calendar.CAL-0805-19.title] | Print release unavailable. Jobs sent during the window are held and released to the queue at the end of it. |
| 28 MAY 2008 | :c[calendar.CAL-0805-34.timeText] | :c[calendar.CAL-0805-34.title] | Traffic for ALPHA-04 routed via ALPHA-01. Link ALPHA-03 to ALPHA-04 shows DEGRADED for the work period. Controlled mail queued, not lost. |

Planned work for all sites is listed in the facility calendar, :x[OSC-SYS-CAL].
