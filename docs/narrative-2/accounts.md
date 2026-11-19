# Accounts: variants, Tier 4 flags and per-account mail (CT1)

Content for the three pass-two accounts. The analyst account (OPR-A03-1147) is unchanged: it reads the base documents and the existing mail queue.

| Account | Operator | Tier | Compartments | Mailbox | Local time |
|---|---|---|---|---|---|
| lifesupport | OPR-G08-0611, D. M. Voss, GAMMA-08 | 4 | none | d.voss@g08.fe.mer | CDT (Z-5) |
| deputy | OPR-A02-0139, Deputy Commander ALPHA-02 | 2 | none | deputy.cmdr@a02.cmd.mer | MDT (Z-6) |
| auditor | OPR-A01-0948, H. L. Vance, OIA | 3 | BRIAR | h.vance@a01.oia.mer | EDT (Z-4) |

The Deputy Commander's name is Tier 2 restricted and is not written anywhere in this content. Use the role or the command mailbox.

## Variants (content/variants/<account>/<id>.md)

**deputy (14):** transit-possession-08-044, transit-seg-04, fac-alpha-02, f-131, dir-0233, ledger-mem-07-0944, system-calendar, system-about, f-126, personnel-tier-2, personnel-mem-08-0203, dir-0395, transit-rolling-stock, f-118.

**auditor (12):** assurance-oia-08-031, council-inventory-scan, transit-incident-08-017, council-minutes-07-03, personnel-mem-08-0187, dir-0378, council-seat-07, transit-possession-08-044, system-about, system-calendar, assurance-threat-04, f-160.

**lifesupport (11):** fac-gamma-08, registry-class-gamma, f-104, f-114, system-about, system-calendar, dir-0128, personnel-tier-4, dir-0189, dir-0156, system-glossary.

### Contradictions the variants carry

| Between | What differs |
|---|---|
| deputy / auditor possession 08-044 vs incident 08-017 | Surrendered 2352Z (command copy, telephone extension) vs 2300Z (register); occupancy ran to 2358Z. |
| auditor incident 08-017 vs base | 14 MAY extract has serial 08-016 (ALPHA-05 platform 7 lighting raised 2124Z); the 19 MAY extract does not. |
| auditor minutes 07-03 vs base | Seat 11 present on the OIA extract and the gate log (in 1352Z, out 1801Z); absent in the signed minutes. |
| deputy dir-0233 vs base | Rev 3 binder copy still has Section 6 (declarations by hand to the Deputy Director). |
| deputy rolling stock vs base | R04-002 odometer rises 09 APR and 14 MAY while the consist is shown out of service. |
| deputy seg-04 vs base | Shaft ventilation 6 hours weekly at rev 3, base 2; no reason entered. |
| auditor oia-08-031 vs base | Pre-05 MAY access lines: A01 Secretariat workstation opened the scan 02 APR; operator withheld. |
| auditor threat-04 vs base | Para 2.4 added on the Director's instruction of 26 FEB 2008, four weeks before the item arrived. |
| auditor dir-0378 Rev 5 draft vs analyst OIA mail | Self-report after access is recorded is no longer mitigating. |
| lifesupport calendar / mail vs base | G08-BD3 closed and held 13 MAY 2100Z to 0000Z on the adjacent hub's instruction; reopened 0011Z with no call. |

## Tier 4 flags

`t4: true` added (one line, after `route`) to 31 base documents: dir-0115, 0128, 0141, 0156, 0163, 0177, 0189, 0204, 0262, 0288, 0301, 0378, 0447, 0480, 0519; f-104, f-114, f-118, f-145, f-152; system glossary, kb-0001, kb-0012, kb-0019, settings, colophon, about, calendar; personnel/tier-4; registry/registry-class-gamma, registry/fac-gamma-08. Every one of these that names another facility has a lifesupport variant (or is a form or directive whose text is facility-neutral).

## Per-account mail (content/mail/accounts/)

Every message carries `account: <id>` in frontmatter. Login mail has no slots. Triggered mail has `dateMode: delivery` and `slots: [date]`. Lifesupport messages carry `t4: true`.

`arrival` uses the existing rule shapes (`login`, `after`, `firstOf`) plus four descriptive shapes for the integrator to map onto the account's own rules:

- `{ type: trace, kind, ... }`: an audit trace entry of that kind (`form.route` for an F-126 entering the deputy queue; `doc.read` with `docNo` and the reading account).
- `{ type: docRead, docNo }`: the receiving account reads that document number (`doc.read` audit).
- `{ type: app, app, on, ... }`: an app event (doors open of a named door; assurance audit review of an account).
- `{ type: plant, key, when }`: shared plant state changes (`drill` becomes `active`).
- `{ type: mailTo, pattern }`: the account sends mail to an address matching the pattern (`mail.send`).

Every triggered message has an `after` fallback inside `firstOf`, except 06206 (a queue notice that only makes sense once a request exists) and 06209 (plain timer).

### lifesupport (6)

| Id | Arrival | Trigger | Subject |
|---|---|---|---|
| msg-08-06101 | login | | Environmental Watch Rota, Week of 19 MAY |
| msg-08-06102 | login | | Filter Bank A Change Withdrawn; Bank B Sample 22 MAY |
| msg-08-06103 | login | | Tram Portal Door G08-BD3: Closed and Held, 13 MAY |
| msg-08-06104 | login | | Medical Readiness Appointments, 21 MAY |
| msg-08-06105 | triggered | shared plant `drill` goes active, or 12 min | Seal Drill: Plant Room Posts |
| msg-08-06106 | triggered | doors app opens G08-BD3, or 30 min (read receipt) | Door Log Page 14: Countersignature Needed |

### deputy (9)

| Id | Arrival | Trigger | Subject |
|---|---|---|---|
| msg-08-06201 | login | | Command Section: Week of 19 MAY |
| msg-08-06202 | login | | Annex Lot Permits, Quarter 3 |
| msg-08-06203 | login | | HVAC Shop Schedule, Week of 19 MAY |
| msg-08-06204 | login | | Possession 08-044: Escort Detail, 13 MAY |
| msg-08-06205 | login | | Certifying Officer: ALPHA-03 Requests Routed to You (read receipt) |
| msg-08-06206 | triggered | first F-126 from the analyst routed into the deputy approvals queue (`form.route` trace); no fallback | Request in Your Queue: OSC-F-126 from ALPHA-03 |
| msg-08-06207 | triggered | deputy reads OSC-TRN-POS-08-044, or 20 min | RE: Possession 08-044: Overrun |
| msg-08-06208 | triggered | auditor reads OSC-MEM-08-0187 (cross-account trace), or 40 min (read receipt) | OIA Request: ALPHA-02 Status Declarations, 2007 |
| msg-08-06209 | triggered | 50 min | Memorial Day: Hub Deputies Net Call |

### auditor (8)

| Id | Arrival | Trigger | Subject |
|---|---|---|---|
| msg-08-06301 | login | | Second Reviews Assigned (read receipt) |
| msg-08-06302 | login | | Quarterly Register Return: Suspense 30 MAY |
| msg-08-06303 | login | | Surface Lot B Resurfacing and Shuttle Times |
| msg-08-06304 | login | | Training: Interview Read-In Refresher, 23 MAY |
| msg-08-06305 | login | | OIA-08-031: For Your Second Review |
| msg-08-06306 | triggered | assurance audit review of the analyst's trail, or 15 min | SD-08-1187: Archived Profile, A03-5-114 |
| msg-08-06307 | triggered | auditor reads OIA-08-031 or OSC-2008-Q2, or 30 min | Your Request of 13 MAY: Register Comparison |
| msg-08-06308 | triggered | auditor mails any *@a01.pv.mer address, or 45 min | Declarations Held in Pay & Strength Accounting |

### Threads that cross accounts

- **G08-BD3 hold:** lifesupport 06103/06106 and the lifesupport calendar; deputy 06204/06207 (the same evening's possession, overrun to 2352Z); auditor incident 08-017 variant (occupancy to 2358Z). The tram door at the shelter reopened at 0011Z with no call from the hub.
- **F-131 declarations:** deputy f-131 / dir-0233 variants (by hand to the Deputy Director); auditor 06308 (an envelope returned to PSA as "command sections send by hand"); deputy 06208 (the auditor asks ALPHA-02 about an April 2007 declaration).
- **Certification routing:** deputy 06205/06206 and the deputy dir-0395/f-126 variants; the analyst's F-126 decisions arrive in the registry's name. The auditor's 06301 scope (A02-7 group) lets her see the deputy's trail.
- **A03-5-114 previous operator:** auditor 06305/06306 (archived profile, three unsent messages) and the auditor oia-08-031 / mem-08-0187 variants (P-4-07-0219 off the return the day after opening the scan).
- **Segment 04 instruction:** deputy 06201/06203/06207 (shaft hours and platform 3 lighting on Transit Operations' instruction, no reason given).
