---
id: doors-operating-procedure
route: /doors/operating-procedure
app: doors
family: doors
template: record
docNo: OSC-MEM-08-0146
title: "Door and Airlock Control Board: Operating Procedure"
marking: UMBRA-R
originator: FE/ALPHA-01
revision: 3
date: 2008-03-17
t4: true
summary: How the door and airlock control board is operated at a site. Door positions, local and remote control, the held-open alarm, seal drill behaviour, overrides and the watch handover.
xrefs: [OSC-MEM-08-0147]
distribution:
  - Duty door operators, all sites on the plant network
  - Facilities Engineering, plant network
  - Security control rooms (for information)
recordType: OPERATING PROCEDURE
fields:
  - { label: Procedure, value: "OSC-MEM-08-0146", mono: true }
  - { label: Equipment, value: "Door and airlock control board, plant HMI release 2.3" }
  - { label: Applies to, value: "Portal doors, blast doors and personnel airlocks on the site door board" }
  - { label: Prepared by, value: "Facilities Engineering, Plant Network Section" }
  - { label: Revision, value: "3, 17 MAR 2008" }
---

## 1. Purpose

This procedure tells the duty door operator how to work the door board. The board shows every door at the site level by level, and drives the doors from the site's own control room. The positions, cycle times and ratings on the board are the door records of the site. They are not repeated here.

## 2. Who operates the board

The board is operated by the duty door operator: the security control room at a hub, or the environmental systems watch at a shelter site. Facilities Engineering staff may operate the doors they are working on. Records staff may operate the records stack vault doors where their access determination allows. The Office of Internal Assurance may display boards and cycle logs for review. It holds no door control authority, and commands from an OIA workstation are refused.

## 3. Local and remote control

A door is commanded only from its own site. A workstation at another site displays the board for indication only, and every command from it is refused. Door control is not passed between sites by telephone.

## 4. What the board displays

Doors above the operator's access determination are drawn as a closed black block with no tag, and their lines are left out of the cycle log. The level name is withheld in the same way. The door is still on the board, and the seal drill still closes it.

## 5. Door positions

A door passes through six positions. The lamps under the position word follow it.

| Position | Meaning |
|---|---|
| CLOSED-LOCKED | Leaf seated on its seals and the locking bolts driven. The normal position of a door that is normally closed. |
| UNLOCKING | Bolts withdrawing. The leaf has not moved. |
| OPENING | Leaf travelling to the open stop. |
| OPEN | Leaf on the open stop. The normal position of a door that is normally open. |
| CLOSING | Leaf travelling to the seals. |
| SEATED | Leaf on the seals, bolts not yet driven. Becomes CLOSED-LOCKED. |

A command is accepted only with the leaf on a stop. A door in travel finishes its stroke. There is no stop button on the board. The emergency stop is at the door.

Bolt withdrawal before travel and bolt drive after seating are part of the door's cycle time:

| Door | Bolts withdrawn (s) | Bolts driven (s) | Held-open alarm after (s) |
|---|---|---|---|
| Portal door | :c[apps.doors.motion.unlockSec.portal] | :c[apps.doors.motion.dogSec.portal] | :c[apps.doors.motion.heldOpenSec.portal] |
| Blast door | :c[apps.doors.motion.unlockSec.blast] | :c[apps.doors.motion.dogSec.blast] | :c[apps.doors.motion.heldOpenSec.blast] |
| Airlock leaf | :c[apps.doors.motion.unlockSec.airlock] | :c[apps.doors.motion.dogSec.airlock] | :c[apps.doors.motion.heldOpenSec.airlock] |

## 6. Alarms

The annunciator above the mimic carries eight windows. DOOR HELD OPEN and AIRLOCK INTERLOCK sound the horn. Acknowledge with ACK (Ctrl+Shift+A); a window that has cleared waits for RESET. Do not acknowledge an alarm you have not looked at.

- **DOOR HELD OPEN.** A normally closed door has stood open longer than its held-open time. Close it, or enter a hold-open override (para 8).
- **AIRLOCK INTERLOCK.** A leaf was commanded open with the other leaf off its seals, or a cycle was called with a leaf open. The command was refused. Find out why before trying again.
- **PORTAL DOOR NOT SECURE.** A portal door is off CLOSED-LOCKED.
- **OVERRIDE IN FORCE**, **REMOTE CONTROL LOST**, **DECON CYCLE**, **SEAL DRILL DOORS HELD**, **DOOR IN TRAVEL**: status windows.

## 7. Seal drill

When the site acknowledges a seal drill order, every door marked for the drill closes and the airlocks stop cycling. Drill doors move at drill time, so the board agrees with the drill report. A door already in travel finishes its stroke and then closes. Doors stay closed until stand-down, when the doors that are normally open reopen. A door opened during the drill needs a drill-hold override (para 8).

## 8. Overrides

There are three overrides: hold open (a normally closed door kept open past its alarm), drill hold (a door opened while the site is sealed for a drill) and decon bypass (para 5 of :x[OSC-MEM-08-0147]). Every override takes a reason in full: the work or condition, and who is attending the door. The board numbers each one (DOR-<site>-<serial>), writes it to the cycle log and the audit trail, and reports it to the Office of Internal Assurance. Clear an override as soon as the reason for it ends.

## 9. Loss of hub circuits

While hub circuits are down, the board at each site keeps local control of its own doors. Boards displayed from another site show the last indication received and the note REMOTE INDICATION LOST. Nothing on them can be commanded.

## 10. Watch handover

At each watch change the outgoing duty door operator signs the handover from the board menu. The report lists every door off its normal position and every override in force. A normally closed door left open across a watch change is reported to the incoming watch whether or not the handover is signed.

## 11. Cycle log

The board keeps :c[apps.doors.logRetentionDays] days of cycle log. Entries are written by the board and are not edited. A log line that names a door with no record on the board is reported to the site door records office from the log entry.
