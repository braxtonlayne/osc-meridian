# Door and Airlock Control: secrets and consequences (spoiler, not shipped)

## The secret: AL3, level 12, ALPHA-05

ALPHA-05's level index ends at level 11 (Rail and Tram Terminal). Its board has two airlocks, AL1 (lift head) and AL2 (level 11 tunnel airlock), and the segment 04 portal door A05-BD8, normally closed.

The seeded cycle log (canon `apps.doors.history`) shows, on each of the last two segment 04 walk-down days:

| Day | Line |
|---|---|
| 08 APR 2008 | 2136Z A05-AL2 CYCLE OUT, count 6; 2141Z A05-BD8 OPEN CMD; 2142Z OPEN; 2149Z CLOSED-LOCKED |
| 09 APR 2008 | 0352Z **A05-AL3** CYCLE IN, level **12**, count **4** |
| 13 MAY 2008 | 2058Z A05-AL2 CYCLE OUT, count 6; 2104Z A05-BD8 OPEN CMD; 2105Z OPEN; 2112Z CLOSED-LOCKED |
| 14 MAY 2008 | 0347Z **A05-AL3** CYCLE IN, level **12**, count **4** |

Six persons go out through the tunnel airlock to the segment 04 portal; four come back, through an airlock that is on no board, on a level that is not in the index. It agrees with pass-one canon: possession 08-044 lists "FE 2, SFC escort 4" (KESTREL) for a walk-down; incident 08-017 has occupancy from 2131Z moving away from ALPHA-05 to block 04-07 and clearing at 2358Z; the dispatcher's note says 08 APR 2210Z was the first occasion. Nobody comes back through AL2, and nothing ever cycles at the ALPHA-02 end (A02-BD9 has no lines). The board does not comment.

Selecting an A05-AL3 line shows "No door record is held for A05-AL3 on the ALPHA-05 board. Level 12 is not in the ALPHA-05 level index." and a REQUEST RECORD pushbutton. The request (audit `doors:record-request`) delivers MSG-08-04656 once: no record is held, a cycle log line is written by the controller that reports it and is not checked against the records, the request is passed to the ALPHA-05 door records office and closed.

Who can find it: the auditor (cycle logs for every site, read-only) and the deputy (own site plus ALPHA-05, the far end of segment 04). The analyst and the technician see only their own logs.

### Small echo for the technician

GAMMA-08's tram tunnel portal door G08-BD3 (normally open) shows CLOSE CMD / CLOSED-LOCKED at 13 MAY 2215Z and OPEN CMD / OPEN at 14 MAY 0405Z, source "REMOTE A05". No tram was booked. The technician's tram link runs to ALPHA-05; the closure brackets the walk-down return. Nothing names segment 04.

## Consequence graph

| Trigger | Audit | Mail | Other account |
|---|---|---|---|
| Any override (hold-open, drill-hold, decon-bypass) | `control doors:override` (data ref, door, site, kind, reason) | MSG-08-04651 to self (re-delivered with new slots on each later override) | First override per account: trace `mail.deliver` MSG-08-04652 to `auditor` |
| Interlock bypass key switch turned (no key is ever present) | `control doors:interlock-bypass` | First attempt: MSG-08-04653 to self | Second and later: trace MSG-08-04654 to `auditor`, once per account |
| Normally closed door open across a watch change (real 0400Z/1200Z/2000Z while the board is open) or a signed handover listing one | `system doors:shift-open`; `control doors:handover` | MSG-08-04655 to self, once per watch and door set | none |
| Request record for an unknown door from the log | `control doors:record-request` | MSG-08-04656 once | none |
| Open, close, cycle, decon mode, ack, board/log display | `control doors:open/close/cycle/decon-mode/ack/board/log` | none | none |
| Interlock reject (leaf or cycle refused) | `control doors:interlock-reject` | none | annunciator AIRLOCK INTERLOCK |
| Refusals (authority, remote, drill, travel, dp) | `window.open` subject `doors:<id>` | none | none |

## Per-account rules

- **lifesupport (T4, GAMMA-08):** GAMMA-08 board and log only. Operates every GAMMA-08 door and the airlock, enters hold-open and drill-hold overrides; decon bypass refused ("duty officer's decision"). Signs the watch handover. Home job.
- **deputy (T2, ALPHA-02):** displays every site's board; operates ALPHA-02 only; all overrides including decon bypass; logs for ALPHA-02 and ALPHA-05.
- **analyst (T3, ALPHA-03):** ALPHA-03 board and log; operates only the records stack vault doors (levels 6 and 7) with LANTERN; T2/T1 doors and level names withheld.
- **auditor (T3, ALPHA-01):** ALPHA-01 board, every site's cycle log, no door control at all.

Seal drill closes every `sealsOnDrill` door at a site from its acknowledged time, at drill time (x30); airlocks stop; stand-down reopens normally open doors. While isolated, boards from other sites show REMOTE INDICATION LOST and refuse commands; local control is unaffected.
