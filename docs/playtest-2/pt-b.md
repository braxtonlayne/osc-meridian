# Playtest 2, tester PT-B: lifesupport (Tier 4) and auditor

Build: `npm run build` at 4.1.7 on `build/meridian-2` (e4dd898), served with `vite preview --port 5332`. Driven with headless Chromium (Playwright) at 1440x900 and 390x844. I played unaided. I did not read the narrative docs or the app source.

Screenshots are in the tester scratch area, `ptb/shots/` (names given below). They are not committed.

Session (shared plant state): I signed in as the technician, ordered drill SD-08-0519-01 from a deputy tab, worked the drill, scrubbers, closure reset, handover log, filter change, doors, PA and muster as the technician, then switched to the auditor. A second drill (SD-08-0519-02) was ordered from the deputy tab for the auditor to observe. The deputy also made one PM-3 register entry (PM3-08-0001), and I filed two findings: OIA-AF-08-101 against the technician and OIA-AF-08-102 against the analyst.

---

## 1. Defects, ranked

### High

**H1. Tier 4 can open Transit Control in full.**
Steps: sign in OPR-G08-0611 → Directory → Transit Control.
You get the whole Network Control Board: every hub and site, segments 01–06, paths, consists, and the "All networks / Eastern / Southern…" selector, marked UMBRA//OSC COMPARTMENTED. Every other general app refuses with "holds records beyond the assigned site of this operator (GAMMA-08)". This is the biggest hole in the closed world. Shot: `52-ls-Transit_Control.png`.

**H2. Tier 4 sees the Assurance tree, threat-register titles and a refused ticket's full title.**
Steps: as the technician, Directory → Assurance. The left tree lists the incident queue, all seven threat entries (Nuclear Exchange, Congressional Investigation, Whistleblowers, Media Exposure…), the security protocols, the Classification guide, the Cover identity catalogue and Audit review. Each item refuses when opened. However, opening OIA-08-031 puts the full title in the title bar and status bar: "Security Incident OIA-08-031: Electronic Image of Council Record Found on Accession RD-ACC-08-00412". The refused threat entries open in background windows titled "Threat Register Entry 01: Nuclear Exchange" and so on. Tier 4 should get one refusal or only "Your session activity". Shots: `52-ls-Assurance.png`, `54-state.png`, `55-ls-thr01.png`.

**H3. Tier 4 material names other facilities in many places.** The brief says a Tier 4 notice never mentions other facilities. Places where it does:
- PA, network all-call key refusal: "Network all-call is keyed at Network Control, ALPHA-01" (`45-pa-allcall.png`).
- Strike estimator refusal: "Withholding authority Operations and Continuity Planning, ALPHA-01".
- Finding mail to the technician: "Office of Internal Assurance, ALPHA-01".
- Taskbar hub-link indicator tooltip: "Hub links: ALPHA-01 NOMINAL … ALPHA-05 NOMINAL".
- GAMMA-08 dossier (site extract). The body says "It does not give the site's depth, its surface arrangements or its connections beyond the tram platform". The registry side panel in the same window then shows "NETWORK Southern Network / CONNECTIONS tram ALPHA-05", a DEPTH field, and toolbar buttons ALPHA / BETA / GAMMA / DELTA. ALPHA refuses with the title "Facility Class Standard: ALPHA (Command & Control Hubs)" (`57-ls-dossier.png`, `58-ls-registry-alpha.png`).
- Originator and revision metadata on nearly every Tier 4 document, for example KB-0216 "CMS/ALPHA-02", DIR-0434 "TO/ALPHA-01", DIR-0204 "MS/ALPHA-05", and the dossier revision history "FE/ALPHA-02". Library list: `56-ls-library.png`.
- PA message library footnote: "Used at ALPHA, BETA, GAMMA sites."
- OSC-PER-T4 shows the network-wide tier strengths (11 / 247 / 1,891 / 1,698), total 3,847, and DETACHED / UNPOSTED 790. Its own "Knowledge scope: Facility-specific only" says otherwise.
- The Terminal connects the technician to "MERIDIAN RECORDS HOST A03RD1", the ALPHA-03 records host.

**H4. Workstation identity contradicts itself.**
- The audit trail, the terminal and "Your session activity" record the technician and the auditor at WS A03-5-114. The technician's own activity record reads "WORKSTATION A03-5-114 (GAMMA-08)", and the terminal banner reads "OPR-G08-0611 connected from WS A03-5-114 … (1747 EDT)".
- System Tools → About This Terminal says G08-3-002, site GAMMA-08, for the technician and A01-4-022, ALPHA-01, for the auditor.
- The lock screen always says "Workstation A03-5-114 · ALPHA-03".
- C. Brandauer's assignment mail enables audit review "for the groups A03-5, A02-7 and G08-1", which implies separate workstations.

Pick one model: either each account sits at its own workstation everywhere, or all four cards are issued at A03-5-114 and About says so. Shots: `52-ls-Assurance.png`, `96-aud-terminal.png`.

**H5. Event-driven mail carries a Sent header that predates the event.** The inbox "Received" column shows the real time, but the Sent: header inside the message is a fixed earlier DTG, so replies predate what they reply to.

| Message | Inbox | Sent header |
|---|---|---|
| Filter Change Overdue ("The handover log signed on 19 MAY…") | 192138Z | 191210Z |
| Re: Handover Log, CO2 Load Balance (reply to an entry signed at 2138Z) | 192138Z | 191230Z |
| Seal Drill: Plant Room Posts ("As of 19 MAY none is booked", delivered during the drill) | 192134Z | 191500Z |
| Muster Report (body "Report time 2135Z") | n/a | 191200Z |
| NETCONTROL "Seal Drill Held Without an OIA Observer" (auditor) | 192154Z | 191800Z |
| Door Log Page 14 | 192213Z | 191540Z |

Shots: `26-muster-mail.png`. Steps: run a drill, sign the handover log, read the new mail.

### Medium

**M1. Placeholder addresses in the muster report:** `bms@local.sfc.mer` to `duty.officer@local.cmd.mer`. Every other GAMMA-08 address uses `g08`. Shot: `26-muster-mail.png`.

**M2. The filter-change dialog fails silently on an invalid lot.**
Steps: Environmental Control → Filtration → Record change on bank A… → Lot "banana" → Record. The dialog closes with no message and nothing is recorded. A well-formed lot (GPB-0805-01) is accepted, but no stock label anywhere gives the lot number, and the "isolate the bank at the local panel" step is never asked for or checked. Shots: `27-filter-dialog.png`, `29a-lot-bad.png`, `29b-lot-good.png`.

**M3. The OIA OBSERVER pushbutton (PB-5) gives no feedback.**
Steps: as the auditor, Directory → Seal Drill Coordinator while a drill is running → click OIA OBSERVER. Afterwards `aria-pressed=false`, the lamp stays off and the register shows Observer "None". The observation was recorded only after Drill → "Enter OIA observation", after which the lamp lit and the register read "OIA (Assurance Auditor…)". The button's caption is also clipped to "OBSERVEF". Shots: `88-aud-observer.png`, `92-aud-observation.png`.

**M4. The CCTV "Rules" button is a dead end for Tier 4.** It opens OSC-DIR-0474, which is refused ("Requires Tier 3 access determination"). That is the rule for the very client the technician is using. Shot: `41-cctv-rules.png`.

**M5. Telemetry contradicts the panel.** The GAMMA-08 dossier telemetry shows CO2 656 ppm (624/626 for the other accounts) and "Portal seals ALL SEALED" while the environmental panel reads 1,000–1,250 ppm and the drill is stood down. Separately, site CO2 at start (status bar 934) is below all three zone readings (975, 1024, 996). Shots: `06-environ.png`, `57-ls-dossier.png`.

**M6. The site seal-drill panel takes the technician's job.** GAMMA-08 showed ORDER RECEIVED ON and ACKNOWLEDGED ON before I pressed ACK ORDER. Ack 2/35 at T+02:29 included G08. After stand-down, the status text reads "Status: SEALED (DRILL) … STOOD DOWN" while the SEALED lamp is OFF. Shots: `17-ls-drill-received.png`, `62-hh-Seal_Drill_Coordin.png`.

**M7. Door board state disagrees with itself.** About 90 s after closing G08-BD1, a command was refused with "G08-BD1 is in travel (CLOSING)" while the lamps showed CLOSED-LOCKED. The status bar kept "G08-BD1 closing: 45 s cycle" for minutes. Shot: `35-state.png`.

**M8. The tram platform indicator is stale.** At 2150Z it still lists all four of today's services (0928Z–1600Z) as BOOKED. The header time is CDT but the status-bar time is EDT. The footer reads "Training simulator; 0 movements entered" on what is presented as the platform indicator. Shot: `52-ls-Dispatcher_Workstati.png`.

**M9. Memos number every paragraph twice:** "1. 1. Passes.", "2. 2. Communications." (OSC-MEM-01-0391, and probably every memorandum-type document). Shot: `113-aud-0391-scrolled.png`.

**M10. Cross-references render twice:** "DIR-0128 (OSC-DIR-0128)", "OSC-F-152 (OSC-F-152) receipt", "OSC-F-114 (OSC-F-114)" in the GAMMA-08 mails.

**M11. Handheld mode at 390px (technician).** The Environmental Control tab strip is cut off (Ack and Procedure are off-screen with no scroll cue), and the panel nameplate and air path are clipped. The door mimic is scaled down until labels are about 5px and unreadable. Muster, seal drill, PA and mail are fine. There is no page-level horizontal scroll (scrollWidth 390). Shots: `62-hh-Environmental_Cont.png`, `62-hh-Door_and_Airlock_C.png`.

### Low

- **L1. Markings change from window to window.** The technician's mail window was TOP SECRET//SCI//OSC at first and UMBRA//OSC RESTRICTED later. The Records Library and seal drill windows are UMBRA//OSC UNRESTRICTED. The desktop banner stayed UNRESTRICTED while a RESTRICTED window had focus (`18-env-during-drill.png`).
- **L2. Wrong date format:** "Filter Change Overdue" writes "2008-03-12" (ISO) where house style is 12 MAR 2008.
- **L3. Illegible camera title:** on CCTV G08-C01 the overlay is white on a bright sky (`39-ls-cctv.png`).
- **L4. PA console doesn't update after a broadcast.** The status line still says "Select zones and a message, then BROADCAST", and the MSG segment display stays blank. The window title "Public address console" has no site, unlike the other apps (`44-pa-broadcast.png`).
- **L5. Truncated table:** in Personnel → Recruitment phases the header "Cumulative or target" shows as "ulative or target", and the cells "Phase 1 strengt" and "9,360 (targ…" are cut (`113-aud-0391-scrolled.png`, which is actually the PER-PH1 view).
- **L6. Grammar:** "All operators: 1 entries" in the PM-3 register.
- **L7. Time zones:** Assurance "Your session activity" shows the GAMMA-08 operator's times in EDT.
- **L8. Mixed date and time zone in the log:** the handover log shows "19 MAY 2008 0301Z (2201 CDT)", where the local time falls on 18 MAY.
- **L9. Possible rota inconsistency** (may be deliberate):
  - The rota puts D. Voss on A watch all week, yet the technician (Voss, per mail and the muster badge log) signs as watch B, and the door-log mail calls Voss "the plant technician on B watch" on 13 MAY.
  - 4-0592 (Ashby) signed watch B on Sunday 18 MAY, when the rota puts Ashby on watch C from Thursday to Sunday.
  - Card 4-0611 is not on the rota at all.
- **L10. Odd drill numbers:** in "Seal Drill: Plant Room Posts", doors closed at 2 min comes before acknowledge at 4 min, both counted from receipt.
- **L11. Muster window clipping:** at 1440x900 the annunciator's second row and the MUSTER panel are cut off at the window bottom (`47-ls-muster.png`).
- **L12. Console warnings:** CCTV logs repeated "Canvas2D … willReadFrequently". These are the only console messages seen all session. There were no page errors and no third-party requests.
- **L13. Not reproduced:** my very first sign-in as the technician gave a blank white page and 9× HTTP 404 (`03-ls-desktop.png`). A reload, and a fresh profile later, were fine. This was most likely another tester rebuilding `dist/` while I was loading.

---

## 2. Tier 4: small closed world and the home app

**Closed world.** Mostly yes. The technician's own desktop has six plant apps plus Forms, Message Traffic, Directives and System Tools. CCTV shows "GAMMA-08 (own site)" only (8/8 cameras). Doors, PA, muster, isolation ("THIS DISPLAY SHOWS THIS SITE ONLY") and the patch bay are scoped to HCP-G08. Registry, Personnel, Ledger, Reserves and Strike refuse in-world. The hoist app says "No shaft hoists at GAMMA-08". The mail is good: rota, filter bank, tram portal hold, clinic, all strictly local, with "the adjacent hub" never named. The leaks are H1–H3. The Directory menu also lists every app to Tier 4, which invites them.

**Environmental Control as a job.** It is a good job.
- **Drill.** The drill sets SEAL SIGNAL, MAKEUP AIR SEAL CLOSED and NO SCRUBBER ON LINE. Flashing tiles, ACK, RESET and "RESET REQD" all work. Scrubbers to AUTO gives two trains at 309 L/h.
- **CO2.** CO2 keeps rising (1211 → 1245 ppm) above the "two trains 1184 ppm at posted strength" figure, which is a good, quiet clue.
- **Closure latch.** The seal closure latches after stand-down until you press RESET CLOSURE.
- **Load balance.** It implies 44 people against 38 posted.
- **Handover.** Signing works, and "Insert load balance result" pre-fills the remark.
- **Fallout.** Within seconds Plant Eng replies that the entry "has not been copied to the monthly plant return". A Filter Change Overdue order also arrives that contradicts Lusk's "do not open the bank yourselves". It creates a good dilemma.
- **Filter change.** It works but is thin (M2).
- **Starting a drill.** The technician cannot order one; the site panel only receives. I ordered one from the deputy in a second tab, and the shared plant state synced live across tabs.

**Other apps.**
- **Doors.** Close and open with a 45 s cycle, logged in the audit trail.
- **CCTV.** Four-way wall showing the tram platform with a figure on it.
- **PA.** MSG 11 to Z04 broadcast and logged as PA-0519-0070; the all-call is refused.
- **Muster.** 38 / 34 / 3 unaccounted / 1 visitor; a sweep team can be dispatched, and the close-out draft is signable.
- **Dispatcher.** The platform view only.

**Handheld.** See M11.

## 3. Auditor

- **Audit review** (Assurance → Audit review) reads every account. The technician had 219 entries and the "CONTROL OPERATED" filter lists every plant action with good prose. The analyst was empty until that account was used.
- **Findings.** Ctrl+click cites an entry, the category comes from a list, then text, then Record.
  - OIA-AF-08-101 (technician) and OIA-AF-08-102 (analyst) both arrived on the target's next sign-in, PRIORITY, from "Harriet L. Vance" (`122-an-finding-mail.png`, `123-ls-finding-mail.png`).
  - The register showed "AWAITING SIGN-IN" for 101 even after the technician had signed in again in the other tab; it did not refresh.
  - Mail numbers 80003 and 80005 stand out against the 04xxx–06xxx range.
- **Strike register.** It updated live when the deputy entered PM3-08-0001. Open in estimate re-runs it at planning depth: 150 P / 224 psi for the auditor against 310 R / 250 psi for the deputy.
- **Drill observation.** Works through the menu (M3). The register and Messages relay table are rich.
- **Patch.** View-only bay HCP-A01, with circuit register, line quality and bay log.
- **Terminal.**
  - `audit tail --operator` with no id gives a usage hint.
  - `audit tail --operator OPR-G08-0611` lists the technician's trail.
  - `help` documents only `audit tail [n]`; the `--operator` switch is undocumented.
  - "clear" is audited as a command, which pads the trail.

## 4. Same document, different reading (vs the analyst)

1. **OSC-DIR-0128.** The technician gets "Extract for Life Support Technicians" with the other-class paragraphs and Annexes A/B dropped and a "Site annex: GAMMA-08" added.
2. **OSC-FAC-GAMMA-08.** The technician gets "Site Extract, Tier 4" (doors, assembly points, no depth); the analyst gets the "REGISTER SECTION" with Depth and Surface cover.
3. **OSC-DIR-0156.** The technician's copy is "Site Copy with GAMMA-08 Annex", with a refuge assignment table.
4. **OSC-DIR-0189.** The technician's copy adds "Site annex: GAMMA-08 holiday manning" for 26 MAY.
5. **OSC-DIR-0378.** The auditor gets Rev 5 dated 16 MAY 2008, marked "DISTRIBUTION LIMITED DRAFT FOR COMMENT", with OIA margin comments; the analyst has Rev 4 of 24 MAR.
6. **OSC-SYS-ABT.** Each account sees its own workstation and site (G08-3-002, A01-4-022, A03-5-114). This collides with H4.
7. **ECP panel documents** (MEM-07-0262 / MEM-08-0171). The analyst sees "NO ACCESS", the auditor "REMOTE MONITOR, display only", the technician the operable panel.
8. **PM3-08-0001.** The same register entry gives a different GAMMA-08 depth and effective psi depending on who opens it.

## 5. Records library, 2001-era Council and Assurance material

I read these as the auditor:
- Charter Articles I, II, V and VII (III, IV and VI are withheld, QUARRY)
- OSC-CNL-MIN-01-06
- OSC-CNL-DEL-01-04
- OSC-MEM-01-0391
- OSC-ASR-CP-08
- OSC-MEM-02-0284
- OSC-MEM-06-0417
- OSC-PER-PH1

**House style.** It is strong.
- **Deadpan.** The cold chamber, the two portable heaters, "Members thanked the works canteen for the soup", and Seat 10's recusal timed to the minute.
- **Redaction.** Item 5 is "register copy only", objective P1-4 is blank, there are withheld-passage bars, and DEL-01-04 records nothing but the number of seats present.
- **Euphemism.** OSC-ASR-CP-08: the 9 persons read into the protocol were "carried from 01 DEC 2001 in categories other than POSTED".

The Charter extracts are the most rhetorical pieces, but they are a charter, so that works.

Off notes:
- **Present-tense timeline.** MEM-02-0284 para 2 is written as a timeline ("The President signs … Public Law 107-38 …"), which reads like research notes rather than a Comptroller's memo. The figures match the public record: $40 billion, the AUMF votes of 98–0 and 420–1 on 14 SEP 2001, and P.L. 107-206.
- **Informal margin note.** The handwritten "GT: we should encourage these guys" on MEM-06-0417 is deliberately informal and is struck by CB in the routing slip. Even so, the memo as a whole, on the Office's policy toward independent researchers of 11 SEP 2001, is the most sensitive item in the library. It names no real person and says the commentary "does not name the Office", but it does lean toward a wink at 9/11 conspiracy culture. Worth an editorial look.

**Real person beyond the public record (report).** OSC-MEM-01-0391, "Liaison Note 01/44: Principal Desk", 30 OCT 2001:
- The Office keeps a liaison desk inside the "host office" of a "principal".
- That principal's signing "was scheduled for 26 OCT and was held as scheduled".
- It cross-references "Legislative Record: USA PATRIOT Act (Public Law 107-56)".
- Para 4 reads: "Principal not briefed on programme. Standing instruction unchanged: not to be briefed."

The principal is unnamed but plainly identifiable as the sitting President. The memo attaches invented facts to him: a secret Office desk in his office, and a standing decision about what he is told. That goes beyond the public record. I found no other real person shown acting beyond it.

## 6. Secrets found (unaided), with how

1. **Phantom occupants at GAMMA-08.** Environmental Control → Balance → Compute: implied occupancy 44 against 38 posted. During the seal, CO2 climbed past the posted-strength equilibrium of 1184 ppm. Signing the result into the handover log drew Plant Eng's brush-off: not a headcount, not copied to the monthly return.
2. **Unaccounted staff.** The muster board shows 3 posted staff at GAMMA-08 unaccounted in the drill, plus visitor badge V-G08-01 at MP1.
3. **The 13 MAY tram portal hold.**
   - The door-log countersign mail (after the drill) shows G08-BD3 held shut 2100–0000Z.
   - The entry-level differential dropped 0.04 in. w.g. at 2131Z and recovered at 2350Z "without action".
   - The adjacent hub did not answer two calls.
   - The mail invites an OSC-F-114.
4. **Who the technician is.** The muster badge log at MP1 reads "07-0611 Darlene M. Voss". Mail to `d.voss`. The rota puts Voss on A watch and card 4-0611 is on no rota.
5. **Self-report deadline (auditor only).** DIR-0378 Rev 5 draft removes self-report mitigation from 02 JUN "for anyone already in an access log", and notes that OIA mail to probationers still promises it.
6. **OIA-08-031 and workstation A03-5-114** (auditor mail). Prewitt: the previous profile of A03-5-114 was archived when it was reissued to a probationary transfer, and "please do not open it from your workstation". Brandauer scopes the second review to that archived profile.
7. **ALPHA-02's position is not held.** The strike map labels only ALPHA-01/03/05. ALPHA-02 (the deputy's own site) and ALPHA-04 show "Position not held at this workstation". GAMMA-08's depth of record is 310 ft (T2) against a planning depth of 150 ft for everyone else.
8. **Drill anomalies.** Seal Drill → Register shows GAMMA-14 with no report in both drills, BETA-05 with no report in the first, the same four late sites each time (BETA-12, GAMMA-06/17/18), and one "ack out of sequence".
9. **Patch bay HCP-A01.** Circuit T02-D1 (the KDN bearer to ALPHA-02) runs at 31 errored seconds per hour against a warning level of 20.
10. **OSC-CP-08.** A contingency closed by delegated authority. 9 persons read in, all moved out of POSTED on 01 DEC 2001, and OIA was refused a sight of the register. This ties to DETACHED / UNPOSTED 790 in Personnel.
11. **Principal not to be briefed** (OSC-MEM-01-0391), and the struck margin note on MEM-06-0417.

## 7. Impressions

- **The technician's world.** Tier 4 is the best-feeling account. The panel work is tactile, the drill is exciting on a single site, and the CO2 and occupancy thread lands without being explained. The local mail is excellent: dry, practical, and quietly ominous (portal door, differential, "no answer").
- **The leaks.** Transit Control and the Assurance tree (H1, H2) undo the closed world in two clicks. Facility names in metadata and refusals (H3) wear it down.
- **The auditor.** Strong: reading other people's trails and having a finding land in their inbox is the most "MERIDIAN" interaction in the build.
- **The fiddly parts.** Mail DTGs (H5) and the workstation identity (H4) are the inconsistencies a careful reader will catch first.

---

## Fixes (F3)

Fix agent F3 rebuilt and re-ran the repros with Playwright against `vite preview` on port 5341. Screenshots are in the fix scratch areas `f3/shots/` (H1–H5 and the Tier 4 sweep) and `f3b/shots/` (mediums and lows). `npm run build`, `npm run test` (759 unit tests and verify-dist) and `eslint .` all pass.

### Closed world for Tier 4 (H1–H3)
**Sweep result.** As OPR-G08-0611 I opened all 24 Directory applications and clicked every tab and toolbar button. I also opened every Tier 4 document route. No other facility id and no other workstation appears anywhere.

**Transit Control (H1)** now opens as the in-world refusal for Tier 4 (`src/apps/transit/acct.tsx`).

**Assurance (H2).** Tier 4 sees only "Your session activity", in the tree, the toolbar and the menus. A refused Assurance record keeps its title, originator and count out of the window. The shell's Tier 4 refusal window is now titled "<App>: access refused" and no longer carries the record's title (`src/core/services.ts`).

**New `src/core/closed-world.ts` (H3).** For a Tier 4 session it removes other facilities from three places:
- Route originators, applied in `main.tsx` and in the docs layer.
- Loaded documents: originator, revision history, routing offices, distribution and cross-reference titles.
- Text in `RefusalState` and `Dialog`.

Office codes keep their division, so "CMS/ALPHA-02" reads "CMS". A trailing ", ALPHA-01" is dropped, and any other site reads "another site".

**Other H3 changes:**
- **Taskbar.** The taskbar shows one "Network link" in place of the named hubs.
- **Finding and decision mail.** These name no site, and trace mail is passed through the same filter.
- **PA.** The all-call refusal and the library footnote no longer name sites.
- **Facility Registry.** It has a Tier 4 view (`T4View.tsx`): the document plus a site panel, with no depth, network, connections, class buttons, map or command chart.
- **Personnel.** It shows only the document.
- **OSC-PER-T4.** The network strengths are gone.
- **Forms.** Facility fields offer and accept the operator's own site only.
- **Terminal.** It connects to site host G08SV1, shows site-local time and scrubs other sites from its output.
- **Credentials.** The view hides other cards' particulars.

### Workstation per account (H4)
**Canon.** Each account now has `workstation` and `printQueue` in canon, checked by the schema:

| Account | Workstation | Print queue |
|---|---|---|
| analyst | A03-5-114 | PRN-A03-5 |
| lifesupport | G08-3-002 | PRN-G08-3 |
| deputy | A02-7-002 | PRN-A02-7 |
| auditor | A01-4-022 | PRN-A01-4 |

**Where it is used.** The following take the active account's values: audit phrasing (`workstationId()` and `printQueueId()`), the lock header (selected card), terminal, About, Assurance, Records, Forms, Isolate, System and Transit. The isolation review notice names the initiating account's workstation. `audit tail --operator` prints the target operator's workstation.

**Content.** The auditor's group G08-1 is now G08-3.

### Mail dates (H5)
- Event mail with no arrival rule is stamped with its delivery time when the delivery carries slots. Login mail carries no slots and keeps its own DTG.
- The reading pane now shows the same Sent DTG as the list (the nested `message:` block is updated too).
- OIA drill mail and plant mail now carry a date slot.
- Verified: Filter Change Overdue reads 190007Z in both the list and the message.

### Mediums and lows (fork of F3)
**Mediums.** M1–M6 and M8–M11 are fixed. M7 is partly fixed: the status line clears at the end of travel, but I could not reproduce the "in travel" refusal.

**Lows:**
- Fixed: L2, L3, L4, L5, L6, L7 (Assurance times use the site zone), L8, L10 and L12.
- Improved: L11.
- Not changed:
  - L1 (markings).
  - L9, left as is because the off-rota card 4-0611 is part of a secret.
