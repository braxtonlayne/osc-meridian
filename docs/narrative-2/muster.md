# Muster Board: secrets and consequences (spoiler; not shipped)

App: `muster` (Muster Board). Plant key: `muster` (`src/apps/muster/types.ts`). Procedure OSC-DIR-0461 (route `/muster/procedure`), operator reference KB-0316 (`/muster/operator-reference`, `t4: true`). Model constants in `content/canon/apps/muster.json`.

## The secret: reader A02-MP3-R3

Every muster at ALPHA-02, whoever starts it (operator or seal drill), reads three badges at reader **A02-MP3-R3**, "Level 11 platform 3". That reader is marked NOT IN SERVICE on the board because platform 3 is the Segment 04 platform and the segment is not in revenue service. It logs reads anyway, late in the muster (T+10:30, T+10:45, T+11:00), in the same format as every other read:

| Badge | Resolves to |
|---|---|
| 05-0142 | P-3-05-0142, Reginald Tobin, Tunnel Survey Technician, Segment 04 commissioning crew, carried DETACHED / UNPOSTED since 19 APR 2007 (directory; name and role need HOLLOW) |
| 05-0151 | nothing in the directory |
| 05-0157 | nothing in the directory |

All three are intake-05 serials close to Tobin's: the commissioning crew. The board says only "No directory entry. Not on posted strength." The close-out at ALPHA-02 can never reconcile: platforms point A02-MP3 accounts for more staff than it has assigned (assigned + 3), and the reader line lists the three badge numbers. The secret agrees with pass-one canon: the 790 DETACHED / UNPOSTED hold no assembly point (DIR-0461 para 3.3), yet something with their numbers musters on the platform nobody uses.

How a curious operator finds it:
1. Run a muster at ALPHA-02 (deputy), or watch one on the network board (analyst, auditor) after a seal drill reaches ALPHA-02. NOT ON STRENGTH reads 3; BADGE NOT ON STRENGTH lights.
2. Point view of A02-MP3: reader R3 is NOT IN SERVICE with 3 reads.
3. The badge format note (DIR-0461 para 6: badge = intake year + serial, no tier digit) lets the analyst search the Personnel directory for `0142` and land on P-3-05-0142 in DETACHED / UNPOSTED. With HOLLOW the entry names Tobin; the Segment 04 commissioning file names him on the crew.
4. Looking the badge up delivers the Badge and Pass Office note (msg-08-04772): the register "does not show these numbers as issued, lost or withdrawn, so there is nothing to cancel" and "Do not approach the holders."

ALPHA-05's segment 04 platform reader (A05-MP3-R7) is also NOT IN SERVICE and logs nothing. That is deliberate: the reads come from the ALPHA-02 end only.

## Smaller details

- The network board's reconciliation reconciles exactly (assigned 3,036 + posted at DELTA 21 = posted 3,057; + DETACHED / UNPOSTED 790 = 3,847). The only thing that does not reconcile is the ALPHA-02 platform.
- The board shows the operator's own badge in the log at their own site (deputy 04-0139 at ALPHA-02, Voss 07-0611 at GAMMA-08), with a name only where the tier rule permits.
- Tier 2 names arrive from CANON-T2 only for the deputy; for the analyst and auditor, Tier 2 badge holders show a bar and "Tier 2".

## Consequence graph

| Trigger | Condition | Effect |
|---|---|---|
| `control muster:initiate` | operator with control at the site (deputy ALPHA-02, lifesupport GAMMA-08) | run stored in `muster`; horn (`alarm`) on any board open on that site; MUSTER ALARM flashes |
| seal drill acknowledgement | `drill.sites[site].acknowledged` set | derived drill muster at every reached site (`<drill id>/<short>`), no write needed |
| report time passes | run open, unaccounted > 0, this account responsible (initiator, or `siteAccounts[site]` for a drill run) | msg-08-04771 once per run (`notices: unaccounted`), slots run/site/count/report/date |
| `control muster:lookup` of a NOT ON POSTED STRENGTH read | first time for this account | msg-08-04772 (Badge and Pass Office) |
| `control muster:closeout` with discrepancies | always at ALPHA-02; elsewhere if unaccounted remain | msg-08-04773 to the signer (repeat per run); trace `mail.deliver` msg-08-04774 to the auditor (OIA referral) |
| refused control | any | `window.open` audit `muster:<action>`, error sound, in-world refusal citing DIR-0461 para |

## Per-account rules

| Account | Network board | Control |
|---|---|---|
| analyst (T3, ALPHA-03) | read | none (para 4.3) |
| lifesupport (T4, GAMMA-08) | refused (DIR-0301); own site only | initiate, sweep, close-out at GAMMA-08 as duty watch (para 4.2) |
| deputy (T2, ALPHA-02) | read; Tier 2 names from CANON-T2 | initiate, sweep, close-out at ALPHA-02 (para 4.1) |
| auditor (T3 BRIAR, ALPHA-01) | read, every site, every close-out | none (para 4.4); receives OIA referrals |
