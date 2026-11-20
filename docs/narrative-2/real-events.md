# Real events, real people and the September 11 thread (SPOILERS)

Owner: content agent CT2, pass two. Governing text: `docs/SPEC-2.md` §5, "Rules that follow from it (final)". Never shipped.

## Rules as applied

- **Real history.** No alternate history. George W. Bush is president 2001–2009 and appears only doing what the public record says (signing EO 13201, the PATRIOT Act, the supplementals, the AUMF, the reauthorization, issuing NSPD-51/HSPD-20). Barack Obama is not named anywhere; the 2008 primaries appear only as "the primary campaigns are followed from the public record". An interim `altHistory` canon block was planned under an earlier revision of the rules and was never written; nothing to revert.
- **The president is unwitting.** He is never briefed and never a member. His OSC handler is a fictional Tier 2 officer, **D. H. Carrow** (P-2-01-0019, Liaison Officer, Principal Desk, Council Secretariat; detailed since JAN 2001 to an unnamed "Executive Office continuity programs post", the "host office"). Added to `content/canon/extended-c.json` roster at the coordinator's direction; the sanitiser strips the name and address from client canon. Carrow reports to the Secretary to the Council (A. Penhallow) and is "not admitted to meetings held under delegated authority".
- **Real public figures** may be light background members, compartmented away from 9/11. CT2 added no named real person; I2 added four continuity readers in 2008 papers (section below). The Council seats remain by role (lore: Cabinet rank, agency directors, Joint Chiefs, industry). The need-to-know gap is shown on paper: the Council's members' copy of Session 6 of 2001 omits item 5 ("not reproduced in members' copies"), and the delegated-authority record is "not distributed to members of the Council". Nothing invented is attributed to any real person; no invented quotes.
- **The high table.** 9/11 sits with "a meeting held under authority delegated by the Council (Article III)": no names, no time, no place, no clerk, five seats. The Council itself (whose seats imply real office-holders) receives only "objectives met or in hand. No particulars were laid. None were requested." Carrow is never at it.
- No operational detail anywhere, Tier 1 included. No joke at the victims' expense (public observances are explicitly excluded from monitoring). No CIA-did-it: the agency-director seats are on the Council, which is kept outside the decision. No ethnic or religious tropes.

## Real public figures as continuity readers (I2, wave 2C, owner's request)

Four light appearances, all in 2008 papers, none near the 2001 thread. Each is a congressional committee chair (public role as of MAY 2008) on the Secretary's list of "continuity readers": no seat, cleared for SITES and BUDGET papers only, sent extracts by Secretariat courier. Nothing is attributed to them beyond receiving papers; no quote, no vote, no attendance at any session, never the president, vice president or anyone in the line of succession, never QUARRY or the delegated meeting. Names are in plain T3-visible text, never inside a redaction (so never Tier 1). All four were chosen from people no longer living, to keep the implied membership off anyone alive.

| Who (public role, MAY 2008) | Where | What the paper shows |
|---|---|---|
| Rep. Ike Skelton, Chairman, House Armed Services | OSC-CNL-MIN-08-02, readers' extract footnote and distribution | Received items 3 (inventory revision) and 5 (transit return) only; the extract "does not show that other items exist" (item 7, the closed category change, is the gap) |
| Sen. Carl Levin, Chairman, Senate Armed Services | same footnote | same |
| Sen. Daniel K. Inouye, Chairman, Senate Appropriations Subcommittee on Defense | OSC-LDG-FY08 distribution | Line totals only |
| Rep. John P. Murtha, Chairman, House Appropriations Subcommittee on Defense | OSC-LDG-SRC-DOD distribution | Fiscal-year totals only |

## Audit of real people, companies, agencies, laws and events

| Where | Problem | Change |
|---|---|---|
| canon RE-01 (extended-b) | "Operative annex not published" implied the order's signer issued a secret annex | The annex is the Council's own instrument, entered on its register against the order's number on publication; not issued with the order, unknown to its issuing office. publicEvent names the signer as on the record. Lore line "construction initiated January 2001 under EO 13201" kept. |
| ledger/overview.md note 5 | same | Annex restated as a Council instrument, not held by the issuing office |
| ledger/fy-01.md para 2 | same | same; new note 6 points to OSC-MEM-02-0284 |
| personnel/phase-1.md, Record | "unpublished annex to EO 13201" | Council annex entered on the register when the order was published 17 FEB 2001 |
| canon RE-02, registry/fac-beta-11.md §7 | Crews worked "under the security infrastructure survey programme", implying federal agencies hosted the OSC | Crews worked alongside, under their own contractor markings; no agency engaged or knew of them |
| canon RE-08 | Signer unstated | publicEvent: issued by President George W. Bush (public record) |
| council/seat-01.md | Cabinet-level, presiding, unchanged since 20 JAN 2001: read as the vice president | Added "Of Cabinet rank by designation. Not an elective office; not held by any officer in the line of succession." |
| RE-03..07, RE-09 and their pages | Reviewed | No change: the OSC exploits timing or cover; no real party acts for it |

Residual items for the orchestrator (not changed, outside CT2's files or judgement calls): `docs/canon/extended-b.md` still describes RE-01 as "operative annex not published" and lists 9 events (now 13); lore composition names "CIA/FBI/NSA" for the agency seats; Seat 06 admitted 24 SEP 2001 and Seat 08 changed 01 OCT 2007 fall close to real appointment dates (light implied membership, both after the decision and outside it); threat-05 para 2.2 has parent departments answering within cover titles (they act on the cover, not knowingly). `content/manifest.json` does not list the new docNos.

## New canon (extended-b `realEvents`)

- **RE-10, 11 SEP 2001**: public record only (four airliners, the three sites and Shanksville, 2,977 killed). OSC explanation: P1-4 met at the delegated meeting, Council not told, OSC-CP-08 (title withheld, 23 pages, rev 1).
- **RE-11, 26 OCT 2001**: USA PATRIOT Act. S. 1510 96–1 (11 OCT); H.R. 2975 337–79 (12 OCT); H.R. 3162 introduced 23 OCT, House 357–66 (24 OCT), Senate 98–1 (25 OCT); signed 26 OCT, P.L. 107-56; sunset 31 DEC 2005; reauthorization signed 09 MAR 2006.
- **RE-12, 18 SEP 2001**: P.L. 107-38 ($40 billion) and the AUMF, P.L. 107-40 (14 SEP: Senate 98–0, House 420–1).
- **RE-13, 02 AUG 2002**: P.L. 107-206, the 2002 supplemental.

## The thread (documents)

| docNo | Route | Contributes | Visible at T3 | Compartment release | Tier 1 (never ships) |
|---|---|---|---|---|---|
| OSC-CNL-DEL-01-04 | /council/delegated/01-04 | The high table: five seats, nothing else; Phase 1 objectives table, P1-4 **Met** | Seat count, "not recorded" everywhere, P1-1..P1-5 with P1-4 "Met", CP-08 to be closed, report to Council without particulars | QUARRY: P1-4 title ("legislative and appropriations conditions for the continuity build and its authorities"); two conditions met on 18 SEP and 26 OCT 2001 | The event "on the date planned and in the form planned"; no admitted person identified; read-in personnel recategorised |
| OSC-CNL-MIN-01-06 | /council/minutes/01-06 | Council minutes, mundane (cold chamber, soup, recusal); item 5 missing from members' copies | "Item 5 is not reproduced in members' copies" | QUARRY: register text, objectives "met or in hand", no particulars laid or requested | none |
| OSC-ASR-CP-08 | /assurance/contingency/cp-08 | 2001 contingency, title withheld, 23 pages | Not raised against a threat, owner "not recorded", closed 08 NOV, withdrawn 14 DEC 2001, 3 copies | BRIAR: 9 read in, all moved to "categories other than POSTED" from 01 DEC 2001 (THR-06 dispositions); OIA refused sight of the register copy | Title; issued 18 MAY 2001; activated 11 SEP 2001 |
| OSC-MEM-02-0284 | /ledger/memo/mem-02-0284 | FY2002 supplementals; lines hidden in account growth | Public record of both supplementals; FY figures via `:c[]`; reference CMP-01-0297 of 05 NOV 2001 | QUARRY: placement follows plan CMP-01-0088, prepared for the Secretary and "assumed parent account growth of the size that followed" (serial 0088 vs 0297 dates it before September) | Plan dated 22 JUN 2001 |
| OSC-MEM-01-0388 | /council/memo/mem-01-0388 | Legislative tracking: only public dates and votes | Vote table; "consistent with programme requirements" | QUARRY: signature completes condition two of P1-4 | 38 days from condition one to two; CP-08 assumed ninety |
| OSC-MEM-01-0391 | /council/memo/mem-01-0391 | Handler note, week of the signing: passes, courier, re-keyed fax; "signing scheduled for 26 OCT"; "principal not briefed on programme" | All mundane paragraphs plus the two quoted lines | QUARRY: principal's attention directed to domestic security summaries; continuity papers held back a week | "Second condition met"; the remarks at the signing were his own |
| OSC-MEM-08-0241 | /council/memo/mem-08-0241 | Handler extract 2006–2008: reauthorization, NSPD-51, transition; parking | Signings on the record; "not briefed"; no candidate to be briefed | QUARRY: desk wrote the summary on top of the NSPD-51 final draft and got two paragraphs generalised | Desk carries over to the next principal and stays out of transition papers |
| OSC-MEM-06-0417 | /assurance/memo/mem-06-0417 | Cover Operations on "independent researchers": no action to discourage | Commentary names no site or line; "the question itself a mark of the people who ask it"; recommendation; margin "we should encourage these guys" (GT); routing margin by CB: "not a recommendation… Remove before filing" (it was not removed) | BRIAR: no prepared statement under CP-07; the commentary does the protocol's work without assistance | Secretary told; delegation not asked; CP-08 not to be cited on the file |
| OSC-ASR-THR-07 (edited) | /assurance/threat/07 | Commentary counted, not reported; link to 06-0417 | as stated | BRIAR: no prepared statement held, none to be prepared | none |
| OSC-LDG-FY01 (edited) | /ledger/fy/2001 | Note 6, placement in supplemental growth | yes | none | none |

The mundane still outweighs: of 372 routes, 8 carry the thread, and each of those is mostly passes, parking, heaters and courier days.

## Validation

`npm run canon`, `npx tsx scripts/build-content.ts` (no warnings), `npm run build` (verify-dist: all checks passed, 372 routes) and `npx vitest run` (724 passed) all clean on 19 NOV 2026 with the app agents' work in progress in the tree. Tier 1 strings checked absent from `dist/` and `public/`.
