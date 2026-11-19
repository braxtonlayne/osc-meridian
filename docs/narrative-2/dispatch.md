# Dispatcher Workstation: secrets and consequences (spoiler, not shipped)

## The secret: key position 3 on the segment 04 working key

The desk's SEG 04 WORKING key switch (key A02-TC-04, canon `apps.dispatch.seg04`) has three positions: NORMAL, ENGRG and 3. The procedure (OSC-TRN-DSP-01 section 7) documents NORMAL and ENGRG and says of position 3 only "Not used at this desk". The reference card says "See OSC-TRN-DSP-01 section 7".

- NORMAL: any route over segment 04 is refused ("Segment 04 is not in revenue service").
- ENGRG: refused with "Engineering working ... No possession is in force".
- 3: the route sets. RELEASE TC/A05 lights and the desk waits `seg04.releaseDelayMs` for a release from the ALPHA-05 desk, which arrives quoting instruction TC-08-0113. Signals clear and the movement dispatches.

What happens next:

- The movement is drawn on every board (Transit Control, the dispatch desk of every account, including the analyst in training) under the suppressed label R04-*** with consist identity hidden.
- It is not entered on the dispatch log as a desk movement. The log row shows the release desk TC/ALPHA-05 as "entered by", and the row turns WITHDRAWN `withdrawAfterMs` after arrival, when it also leaves the boards.
- MSG-08-04764 from tc.desk@a05.to.mer: accepted under the instruction; not in the log, timetable or possession register; the consist identity is replaced and not to be quoted; return the key to NORMAL; hand desk notes to ALPHA-05 for destruction at the next walk-down.
- No dispatch log query (04761) is sent for it. Network Control "will not query the movement".

Who can find it: only the deputy (T2, ALPHA-02). The key is present only at the deputy's live desk. Everyone else sees the R04-*** indication pass over segment 04 if they happen to be watching a board while it runs. It agrees with pass-one canon: R04-9xx movements under ALPHA-05 desk instruction, identity suppressed, records withdrawn afterwards.

## Consequence graph

| Trigger | Audit | Mail | Other account |
|---|---|---|---|
| Route set | `control dispatch:route-set` | none | none |
| Route refused (seg 04, mixed, unjoined, isolation, drill) | `window.open dispatch:route-refused` | none | annunciator SEG 04 / NETWORK ISOLATED / SEAL DRILL |
| Route refused for conflict or possession (live) | `control dispatch:route-conflict` | MSG-08-04762 once (slots time, route, conflict) | none |
| First live dispatch | `control dispatch:dispatch` | MSG-08-04761 once (slots ref, consist, route, time) | none |
| Dispatch under key position 3 | `control dispatch:release-request`, `dispatch:release-given`, `dispatch:dispatch` | MSG-08-04764 each time (slots time, instruction) | suppressed R04-*** on all boards |
| Isolation brings a desk movement to a stand | `control dispatch:held` | MSG-08-04763 once per isolation ref per movement, to the entering desk (trace if another account's desk notices first) | Transit Control shows HELD and a holds pane |
| Analyst or auditor turns the DESK key to LIVE | `window.open dispatch:live-refused` | analyst only: MSG-08-04765 once | none |
| Hold, release, cancel, signals, desk mode, key, ack | `control dispatch:<action>` | none | none |
| Document opened | `doc.read` | none | none |

## Per-account rules

- **deputy (T2, ALPHA-02):** live desk. Sets routes, dispatches spare stock, holds and releases. The only account with the segment 04 key.
- **analyst (T3, ALPHA-03):** training simulator TS-2 only (local records, scale 1:60, nothing shared). LIVE refused; qualification mail.
- **auditor (T3, ALPHA-01):** opens on the live dispatch log (all desks, including withdrawn rows). The desk itself is the training simulator; LIVE refused (no mail).
- **lifesupport (T4, GAMMA-08):** tram platform indicator at GAMMA-08 only, SERVICES HELD lamp under isolation or drill, the platform notice. Other views refused (DIR-0301). Far ends are shown as "Hub service".

## Rules enforced

Possessions (calendar and desk TC-POS-08-051), rail headway two blocks, tram headway one block, opposing tram movements on single line unless they meet at a passing loop, `isolation.active` (all trains stand where they are, latched until released at the desk), and the seal drill (trains run to the next platform and are held; departures held).
