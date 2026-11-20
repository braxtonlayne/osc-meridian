---
id: system-settings
route: /system/settings
t4: true
app: system
family: system
template: record
docNo: OSC-SYS-SET
title: Workstation Settings
marking: TSSCI-OSC
originator: CMS/ALPHA-02
revision: 3
date: 2008-03-03
summary: Operator-adjustable workstation settings (sound, density, motion, handheld mode) and the session timeout, with the accreditation condition behind each.
xrefs: [OSC-DIR-0301, KB-0001]
recordType: WORKSTATION SETTINGS
fields:
  - { label: Release, value: MERIDIAN Workstation Environment 4.1.7 }
  - { label: Authority, value: "OSC-DIR-0301, MERIDIAN Workstation Use and Accreditation" }
  - { label: Accreditation conditions, value: "Schedule AC, issue 4 (03 MAR 2008)", mono: false }
  - { label: Scope of change, value: This workstation only }
revisions:
  - { rev: 3, date: 2008-03-03, change: "Release 4.1.7. Motion setting follows the workstation's reduced-motion preference by default.", by: CMS/ALPHA-02 }
  - { rev: 2, date: 2007-09-24, change: "Handheld mode added for field terminals.", by: CMS/ALPHA-02 }
---

The settings below may be changed by the operator. Changes take effect at once and are kept on this workstation. They do not follow your operator ID to another workstation, and they are not visible to the Service Desk.

Every setting is bounded by a condition in the workstation's accreditation, shown in the last column. Settings that would breach a condition are not offered. Use of the workstation is governed by :x[OSC-DIR-0301].

## Operator settings

| Setting | Values | Default | Accreditation note |
|---|---|---|---|
| Sound | OFF, ON | OFF | AC-12. Cues are four synthesised tones (window open, refusal, mail arrival, login relay). No recorded audio or speech is held on the workstation. |
| Density | STANDARD, COMPACT | STANDARD | AC-07. Compact rows and controls only. The classification banner and window marking strips are not reduced. |
| Motion | STANDARD, REDUCED | As the workstation's reduced-motion preference | AC-15. Reduced removes window open and close animation. The hourglass and segmented progress indications are kept. |
| Handheld mode | AUTO, ON, OFF | AUTO (on below 900 pixels wide) | AC-21. One window at a time with the application switcher at the foot of the screen. Same content, same banner. |

## Fixed settings (display only)

| Setting | Value | Accreditation note |
|---|---|---|
| Session timeout | 15 minutes without input | AC-03. Interval set by accreditation and not adjustable by the operator. Windows and their contents are kept while locked. |
| Session timer | Shown in the notification area | AC-03. Counts down from the last input. |
| Classification banner | Top and bottom, always shown | AC-01. Shows the highest marking among open windows. Cannot be hidden in any mode. |
| Audit trail | Always on | AC-02. Records windows opened, searches, prints, withheld items examined and Terminal commands. |
| External connectivity | None | AC-05. The workstation carries traffic over the QKD network only. |
| Removable media | Disabled | AC-09. Enabled only under an approved reproduction request. |

## Resetting

To return all operator settings to their defaults, set each one back by hand. The Service Desk cannot reset settings remotely. Settings are cleared when a workstation is reassigned to another operator.

For help with a setting, see :x[KB-0001] or call the MERIDIAN Service Desk, ext. 1-7700.
