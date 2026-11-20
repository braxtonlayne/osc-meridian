# Playtest 2: PT-A (analyst and deputy)

Tester: PT-A. Date: 2026-11-19. Build: production build (`npm run build`), served by `vite preview` on port 5331, driven with Playwright Chromium at 1440x900. Accounts: analyst OPR-A03-1147 and deputy OPR-A02-0139, switching between them in one browser profile. Played unaided: only README.md and SPEC-2 §1–§3 read.

Screenshots are in the tester's scratch area (`scratchpad/shots/`, 179 PNGs). They are referred to by name below.

**Environment note.** Other agents rebuilt `dist/` twice during the session: at 17:27 with the normal base, and at 17:30 with `build:pages` and base `/osc-meridian/`. One rebuild landed while a page was open and gave a 404 on a lazy chunk (`App-CC0lek5x.js`). Transit Control handled it gracefully with the in-world refusal "AS-LOAD-0031". From then on I served a snapshot copy of `dist/` with `--base /osc-meridian/`. The working tree also has uncommitted edits by others (cctv, environ, scripts), so some findings may already be fixed.

## 1. Defects, ranked by severity

No crash, uncaught page error or white screen was seen in about 60 scripted sessions. The only console noise is the Canvas2D `willReadFrequently` warnings (L14).

### High

**H1. Plant Trends x-axis shows the real current date.**
- Steps: as the analyst, open the Reactor Plant Simulator, go to the Trends tab and run any transient.
- Result: the time axis is labelled "19 NOV", the real date. Everything else in the world is MAY 2008.
- Shot: `94-analyst-plant-trends`.

**H2. Mail during network isolation is delivered at once.**
- Steps:
  1. As the analyst, actuate isolation NI-080519-01. The NETOPS mail says controlled mail "is queued".
  2. While latched, send mail from the analyst to the deputy (MSG-08-80009).
  3. Switch to the deputy.
- Result: the message is already in the deputy's inbox with a delivery report. The isolation has no effect on mail.
- Related: the later approval mail says "Queued mail is being delivered", but nothing was queued.

### Medium

**M1. Mail header "Sent:" times are fixed and disagree with the inbox DTG.**
Each mail's "Sent:" header is a template time that differs from the time shown in the inbox list:

| Mail | Inbox time | Header "Sent:" |
|---|---|---|
| Prewitt isolation list | 192202Z | 191500Z |
| NETOPS | — | 191501Z / 191530Z |
| Drill report | — | 191800Z |
| Okafor tasking | — | 161420Z |
| Registry "Request in your queue" | — | 191300Z |

The registry mail's header time is 8 hours before the F-126 it reports was filed (2141Z). Open any of these mails and compare the header with the list.

**M2. The applicant is told who the request went to, which the registry says it should not be.**
- The deputy's REGISTRY mail says the applicant is not told that the request has been routed to them, and that it is "in the registry's name".
- But the analyst's F-126 receipt says "Entered in the action queue of the Deputy Commander, ALPHA-02".
- And the decision mail arrives from deputy.cmdr@a02.cmd.mer, signed "DEPUTY COMMANDER 2-0139".
- Shots: `38-dep-filedcopy`, plus the analyst's receipt and decision mail.

**M3. The drill NO REPORT mail disagrees with the drill report.**
- Steps: as the deputy, order seal drill SD-08-0519-01.
- Result: the report shows 33/35 sealed, with no report from BETA-05 and GAMMA-14. The NO REPORT mail lists only GAMMA-14 ("1 site(s)").

**M4. Drill clocks keep running after stand-down.**
- Steps: stand the drill down at 2159Z, then keep the session open.
- Result: the muster board shows "T+1492:27" and the exercise clock tops out at "9999".
- Shot: `err-1795128331191`.

**M5. Hoist depths disagree within the app.**
- A03 depth section vs call stations:
  - landing 02: 832 vs 860
  - landing 07: 1,002 vs 1,030. The car arrived at 1,030.
  - landing 09: 1,070 vs 1,098
  - landing 1: 40 vs 70
- A02:
  - section 09 shows 1,720, but the run ends near 1,760.
  - the indicator reads 1500 at landing 02, which is posted at 1,470.
- The terminal floor is 1,200 ft, but level 12 is at 1,164.
- Shots: `11-analyst-app08`, `err-1795128070556`, `173-dep-hoist-running`, `174-dep-hoist-end`.

**M6. A seal drill does not hold trains.**
- Steps: while drill SD-08-0519-01 has 33 sites sealed, open Transit Control and the Dispatcher.
- Result: every segment shows IN REVENUE SERVICE with 4 consists running, and the dispatch status says "No network holds". Isolation does hold transit, so this is an inconsistency between the two events.
- Shots: `71-analyst-drill-transit`, `71-analyst-drill-dispatch`.

**M7. A Cc to the deputy never arrives.** The Prewitt isolation mail is Cc'd to the deputy, but the deputy's inbox never gets it.

**M8. The deputy's audit record names the wrong site.** The deputy's session activity shows "WORKSTATION A03-5-114 (ALPHA-02)". A03 is the analyst's site. Shot: `25-deputy-activity`.

### Low (polish, overflow, props)

**L1. Strike layout overlap.** The "The planning register is held at ALPHA-01…" note overlaps the "Contours at 1,000 kt" heading. Shot: `100-deputy-strike-own`.

**L2. Truncated or overflowing text:**
- strike table: "Estimated c", "NOT ASSU"
- Transit status: "IN REVENUE SE"
- hoist site select: "ALPHA-("
- hoist depth labels overlap: "NOT IN REVENUE SERVIC" over level 11
- "ALPHA-03 ARCHIVE S…" box
- drill "OIA OBSERVER" button clipped
- reactor "ROD WITHDRAWAL BLOCK" tile
- CCTV overlay: "COLLAR LANDIN"
- lock-card labels ellipsized

**L3. CCTV C01 overlay.** It is low contrast and looks drawn twice (offset ghost text).

**L4. Doors status after a close.**
- After A02-BD3 reaches CLOSED-LOCKED, the status bar still says "closing: 60 s cycle" and the DOOR IN TRAVEL tile stays lit. Shot: `143-deputy-doors-after`.
- Earlier, the panel showed "1 UNACK" with no lit tile to acknowledge.

**L5. CCTV ALPHA-02 uses Eastern time instead of the site's Mountain time.**
- Timestamps and events are in EDT rather than the site's MDT.
- "Hub link restored 1823:01" does not match the actual restore at 2216Z, which is 1816 EDT. Shot: `153-deputy-cctv-playback`.
- The Transit ETA for an ALPHA-02 arrival is also given in EDT.

**L6. Drill message times don't advance.** Every drill message carries DTG 192156Z while the T+ clock advances.

**L7. Isolation panel while latched.** "Before actuation: consequences of initiation 2" is still offered while an isolation is latched. Pressing it does nothing beyond "Isolation already latched".

**L8. Restoration certificate mails.**
- RC-080519-01 produced two decision mails: the generic "Your form, receipt RC-…" ("Approved by the approving officer") and "Circuit Restoration Certificate Approved".
- Approving the restoration has no confirm dialog, while approving the F-126 does.

**L9. Filed F-126 copy.**
- The block 2B radio is not shown as selected.
- A generic notice replaces the form's own notice text.
- The applicant signature renders as a handwritten-looking name ("E. Rudd…") that is not the analyst's.
- Shot: `38-dep-filedcopy`.

**L10. Read receipt.** The REGISTRY mail shows "Read receipt returned" although no read-receipt choice was offered or made.

**L11. Doubled text.** "on OSC-F-126 (OSC-F-126)".

**L12. Deputy drill map.** It does not mark the deputy's own site, ALPHA-02.

**L13. Pressure ratings look inconsistent.** A blast door is rated 50 psi, while the H1 hardness elsewhere is 1,000 psi. This may be intended; flagged for a content check.

**L14. Console warnings.** CCTV and the Patch Panel log Canvas2D `willReadFrequently` warnings.

**L15. Patch panel dialing.**
- The operator position gets dial tone and says "Dial 4 digits".
- Dialling a single digit gives no feedback or timeout message.
- The KEY buttons are disabled until the OPR cord is seated, but nothing on screen says why.
- Shot: `191-analyst-patch-call`.

## 2. Accounts

| | Analyst OPR-A03-1147 | Deputy OPR-A02-0139 |
|---|---|---|
| Desktop | library and analysis icons | plant and operations icons |
| Login mail | 9 (Okafor welcome, account issued, LANTERN briefing…) | 5 (Ruddock, HVAC, SFC possession escort, REGISTRY certifying officer…) |
| Session panel | Compartment LANTERN (later LANTERN, KESTREL); probation day 36/90 | "Compartments: None held" |
| Audit | Assurance → Your session activity works; Audit review refused in-world ("OIA auditors only") | same |

**Refusals.** All of these were in-world and none was a dead button.

Analyst:
- Environmental Control: GAMMA-08, DIR-0128.
- CCTV, ALPHA-02 interior: SEXTANT, VR-403.
- Hoist to landing 9: Tier 2 level.
- Reserves/arms: Tier 2.
- Dispatch: a training simulator (TS-2 off line).

Deputy:
- Strike, "Own site": REJECTED because the ALPHA-02 position is not held (SEXTANT).
- Environmental Control: GAMMA-08 opens as a REMOTE MONITOR, display only (`200-deputy-environ`).
- PA to zone Z00: TO-PA-0040.

Either account:
- Hoist calls during an isolation are refused.

## 3. Cross-account flow

The F-126 request, approval and mail round trip all worked:

1. **Analyst files F-126.** Compartment KESTREL, sponsor P-3-05-0288 (Owen Garrity), justification citing OSC-TRN-SEG-04 and POS-08-044. Receipt OSC-F-126/08-00490, trace TR-0001.
2. **Deputy approves.** The request appears in the Forms Action queue (1). The deputy approves it with a confirm step; trace TR-0002.
3. **Analyst sees the decision.** The analyst gets "Decision on OSC-F-126/08-00490", and the session panel now lists LANTERN, KESTREL. See M2 for the secrecy problem.
4. **Mail round trip.** The analyst sends MSG-08-80003 to the deputy and the deputy replies. Both sides get MTS delivery reports.
5. **Restoration certificate.** During isolation level 2, the analyst raised RC-080519-01 and the deputy approved it with remarks. The circuits were restored and the level stayed at 2. See L8.

## 4. Documents that read differently between accounts

1. **OSC-DIR-0395.** The deputy sees a "Command Copy, Interim Instruction Inserted": para 12 is OIA-II-08-04, with the hand annotation "That is G. Imrie".
2. **OSC-DIR-0233.** The analyst sees Rev 5. The deputy sees Rev 3 with the withdrawn section 6 (DETACHED/UNPOSTED) and the note "Keep. Nothing has replaced it."
3. **OSC-MEM-07-0944.**
   - The analyst gets the Comptroller copy, where para 4 stops at "working papers".
   - The deputy gets the FE registry original, which states that the 847 certified miles is the sum of five tram links, with an annotation.
4. **ALPHA-02 facility dossier.** The deputy's Command Copy Rev 10 adds para 5.3: platform 3 / Segment 04, the PD04-2 seal, and lighting notes.
5. **OSC-TRN-POS-08-044.** The analyst's From/To times are blank. The deputy's command copy shows surrender at 2352Z and "APR and MAY both about 50 min over".
6. **OSC-TRN-SEG-04.** The deputy's Rev 3 has refuge chambers for 12 and shaft ventilation changed from 2 h to 6 h.
7. **OSC-MEM-08-0203.** The deputy sees para 4 "by hand of officer".
8. **OSC-DIR-0128.** The deputy sees the seal-capable zones paragraph.
9. **Strike depth.** The deputy's estimates are on "R" (record), the analyst's on "P" (planning).

## 5. Secrets found, and how

1. **Something moves on Segment 04.**
   - Source: the RX-A05 log for 13 MAY, 2131Z–2358Z.
   - It shows a traction demand step on feeder 52-B3 with "no traction movement on the schedule".
   - At that time possession 08-044 was in force on Segment 04, which is "not in revenue service".
2. **Phantom badges on platform 3.**
   - Found as the deputy, when closing out the drill muster.
   - Reader A02-MP3-R3 (Level 11, platform 3) is "not in service", yet it logged 3 badges not on posted strength: 05-0142, 05-0151 and 05-0157.
   - P-3-05-0142 is blanked in the Personnel directory.
3. **The 847 certified miles is five tram links.** From the deputy's copy of MEM-07-0944.
4. **The A03 certifier is "a person signing for".** From the deputy's copy of DIR-0395, annotated "That is G. Imrie".
5. **Withdrawn DETACHED/UNPOSTED strength.**
   - DIR-0233 Rev 3 section 6, plus the strength summary's 790 DETACHED/UNPOSTED.
   - MEM-08-0203 para 4.
6. **Possession extensions are off the books.**
   - The Garrity mail says extensions are given by telephone and are not in the register.
   - It gives escort hours as "4.3 each", but 2045Z–0005Z is 3.33 h.
7. **ALPHA-02 PA zone Z00** is "not assigned to a level" and can only be called from Transit Control console 2. Found through the PA zone refusal.
8. **Levels 9–11 at ALPHA-03** are unnamed or redacted across CCTV, the hoist and PA. Landing 9 is a Tier 2 level.
9. **The trip date.** RX-A05's only unplanned trip, on 30 MAR 2007, fell on the day Segment 04 was handed over.
10. **Segment 04 provisions.** Seg-04 Rev 3 provides refuge chambers for 12 and 6 h ventilation on a line that runs no trains.
11. **A possible prop slip, or a clue.** The handwritten-style applicant signature on the filed F-126 ("E. Rudd…") is not the analyst's.

## 6. Set pieces exercised

All twelve were opened by both accounts, and each main action was done by at least one.

| App | Main action and result |
|---|---|
| strike | Analyst: own site, 100 kt. Deputy: ALPHA-01 at 1,000 kt/500 mi, and 41.2N 96.0W. The Nebraska diamond is BETA-09. |
| isolate | Twice, by the analyst. NI-080519-01: level 1, banner, hub DOWN, mail, transit holds, patch and CCTV down, auto-cleared 2212Z. NI-080519-02: level 2, restored by certificate RC-080519-01. The deputy's actuation while latched was refused. |
| drill | Deputy ordered SD-08-0519-01 with the two-person dialog. It spread to doors (SEALED: DRILL), PA and muster; stood down 2159Z. |
| cctv | Deputy: A02-C07 live and playback. Analyst refused for ALPHA-02. |
| plant | Analyst: CB withdraw → NEUTRON FLUX HIGH trip, pump A stop, manual scram; trends and event log; Haldane mail. |
| doors | Deputy closed A02-BD3 → CLOSED-LOCKED. |
| dispatch | Deputy: ALPHA-01→03 refused (headway with 1D05). R02-101 ALPHA-02→01 dispatched as DSP-A02-0519-001 and shown in Transit Movements. Analyst: simulator only. |
| hoist | Analyst: A03-H1 to landing 7. Deputy: A02-H1 in MANUAL to landing 9. |
| environ | Analyst refused. Deputy: remote monitor, display only. Sliders do not move (consistent with "operated at the site"). |
| pa | Deputy: message 12 to A02-Z01/Z02 (PA-0519-0072). Z00 refused. |
| muster | Deputy closed out and signed the drill muster, then started MU-A02-0519-01 (400 of 412). |
| patch | Analyst: TEST SET → T01-V1, QUAL test PASSED (26.1 dBrnC0, CT-08-0002). OPR POSN → T05-V1 gave dial tone. |

## 7. Overall impressions

This is a strong build.
- **Two distinct accounts.** The accounts feel like different people: different desktop, mail, privileges and versions of the same documents.
- **Systems work together.** Isolation, the drill and the restoration certificate each ripple through several apps, mail and the audit trail.
- **Refusals are in-world.** No refusal produced a dead button.
- **The cross-account loop works.** The F-126 request, approval and decision round trip is the highlight.
- **Secrets are found in play.** The Segment 04 thread can be assembled from logs, muster readers, document revisions and mail without reading source.

The weak spots, in order:
1. **Time handling breaks immersion most.** The real-date trend axis, template "Sent:" headers, frozen drill DTGs, the runaway T+ clock and EDT on Mountain-time sites.
2. **Events don't agree across apps.** Isolation mail is not queued, the drill does not hold trains, and the NO REPORT count is wrong.
3. **Small numeric mismatches.** Hoist depths, an audit record with the wrong site, and the "4.3" escort hours. A careful player will notice these and may read them as clues when they are not.

Most of the layout problems are truncation at 1440 px in maximised windows.

## Fixes (F4)

F3 handled M1, M8, the muster addresses and the other items assigned to it. Each repro below was re-run against a private production preview (port 5351, Playwright, 1440x900). Build, unit tests (754/754), `verify-dist` and eslint are clean.

- **H1.** The trend axis date comes from the in-world calendar (`inWorldDateIsoAt` in `src/sim/time.ts`), so it reads 19 MAY. Ticks less than a minute apart show seconds. No other real-date displays were found.
- **H2.** Mail to another site's account while an isolation is in force is queued:
  - The trace carries `queued`, and `services.traces` holds it until the isolation clears.
  - The send status and the delivery report say it is queued.
  - Repro: the deputy has no copy while isolated and has it after the clear.
- **M2.** F-126 decisions come from the OIA compartment registry (`registry@a01.oia.mer`) and say "the certifying officer". The filing receipt no longer names the approver. Isolation certificates still name the approver.
- **M3.** NO REPORT mail is sent only once propagation ends, so its count matches the report.
- **M4.** The muster drill clock freezes at drill end (`drillEndFor`).
- **M5.** Hoist depths use the canon floor depth throughout (`levelDepth="floor"`).
- **M6.** A seal drill holds trains already running at the home signal outside a sealing portal. Transit shows "HELD: SEAL DRILL" or "HELD: ISOLATION". The training simulator still shows no holds, by design.
- **M7.** A Cc on a delivered document is copied to the mailboxes of issued accounts.
- **L2.** Fixed the hoist site select and the CCTV title. The CCTV title now shrinks, then cuts, to fit beside the tags.
- **L3.** Fixed in the tree already (OSD backing box).
- **L4.** Status tiles (travel, drill, decon) no longer lock in as UNACK.
- **L5.** Root cause: the client canon withholds ALPHA-02's anchor state, so the zone fell back to EDT.
  - Fix: `zoneForSite`, with ALPHA-02 documented as MDT, is used by the taskbar, CCTV and Transit.
  - CCTV link events now come from the isolation periods.
- **L6.** Drill log DTGs carry seconds (`dtgSec`).
- **L7.** The isolation panel shows the latched initiation in force instead of offering a new one.
- **L8.** No generic duplicate decision mail for a certificate. Approving a certificate asks for confirmation.
- **L9.** The filed copy has the form's own privacy notice and the filer's own signature. The radio code looks right and was not reproduced.
- **L10.** The receipt line is hidden unless a receipt was actually returned.
- **L11.** The doubled text in the directory is removed.
- **L12.** The drill map marks your own site. The deputy's site is withheld under the network geography compartment and the key says so.
- **L14.** Fixed in the tree already (`willReadFrequently`).
- **L15.** Partial dialling now gives feedback and times out after 10 s. A note explains why the KEY buttons are disabled.
- **Not done:**
  - L1: no overlap at 1440.
  - The other L2 truncations.
  - L13: judged intentional. The 50 psi rating is an internal door and the 1,000 psi figure is site hardness.
