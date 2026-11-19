# strike: Hardened Site Survivability Estimator (PM-3). SPOILERS, not shipped.

## Shape
A planning toy for continuity exercises. Pick a point and one of seven generic yield steps; PM-3 reads every installation whose position the workstation holds against its hardening class and depth (canon `survivability`). Entries go to a shared, append-only planning register (shared key `strike`, `src/apps/strike/types.ts`). Every screen and printout says SIMPLIFIED PLANNING MODEL, NOT FOR ENGINEERING USE and carries the canon disclaimer.

Documents: `/strike/pm-3` (OSC-MEM-07-0312, method and operating notes, rev 2, 12 MAR 2007) and `/strike/register` (OSC-MEM-08-0166, register procedure).

## Per account
| Account | What PM-3 does |
|---|---|
| analyst | Runs, enters, withdraws own entries, compares, prints. Sees own entries only. GAMMA at planning depth (P). Own site ALPHA-03 is held, so own-site entries trigger OIA. First entry copies a notice to the auditor (probation). |
| lifesupport | Refused in-world (Tier 4 profile, DIR-0301). The refusal is audited. |
| deputy | Full use; GAMMA depths of record from CANON-T2 (R), so the deputy's GAMMA rows differ from the analyst's for the same entry. Own site ALPHA-02 is not in the client site table: the deputy commander cannot model their own hub ("not held in the site table issued to this workstation"). Deadpan, and it agrees with the segment 04 pattern: ALPHA-02's end of the network is the part nobody can see. |
| auditor | Register shows every operator's entries; can re-run any entry (review runs are audited, never registered); raises review queries that route a notice to the entry's owner. Cannot enter estimates. ALPHA-01 hosts the register, so isolation never cuts the auditor off. |

## Consequences (mail)
| Trigger | Message | To |
|---|---|---|
| Entry whose outer contour includes the operator's own installation (once) | MSG-08-05961 OIA "Own Installation" query, slots entry/site/condition | self (analyst in practice) |
| Auditor raises review query (once per entry) | MSG-08-05962 via trace `mail.deliver` | entry owner |
| First entry by an operator on probation (once) | MSG-08-05963 via trace | auditor |
| A run lists a segment not in revenue service in an egress basis (once) | MSG-08-05964 OCP "Egress Basis: Segment {segment}" | self |

Isolation (`isolation.active`, not yet cleared): register writes refused from any site but ALPHA-01; status bar "Register ALPHA-01: DOWN". Runs and printing continue. Seal drill: shown in the status bar only.

## Secrets
1. **Segment 04 in the egress basis.** PM-3 rev 2 is dated 12 MAR 2007, the month segment 04 was commissioned. The egress rule takes every segment "complete by the model revision month", so ALPHA-05 (and ALPHA-02, never evaluable) list `SEG 04 to ALPHA-02` as planned egress, although Transit shows it NOT IN REVENUE SERVICE and neither facility's connection list carries it. The planning cell built its survival case on the segment, then the segment was taken out of the record but never out of the model. Found by modelling a point on ALPHA-05 (click its marker, any yield: NOT ASSURED). The OCP reply (05964) says only that the table is not re-issued between revisions and that "this office does not hold a date for revision 3".
2. **847 on paper, 6,074 on screen.** The Model data view gives egress route miles from the engineering table. The printed sheet's basis line says the egress basis rests on the "certified mileage" of 847 (the Council return). Screen and paper disagree in the same document set, as everywhere else.
3. **The model cannot see what the planner cannot see.** The results always end with "N not evaluated (position not held)". A Tier 2 deputy commander cannot place a point on their own hub. Hovering the withheld distance bars is audited.

## Audit
`control` subjects: `strike:run` (data point, anchor, kt, affected, worst, worstSites, review), `strike:register` (entry...), `strike:withdraw`, `strike:query` (entry, ref, account). `print` for sheets (subject sheet number). `window.open` for every refusal (Tier 4, auditor entering, isolation, withdraw of another's entry, position not held). `doc.read` for both documents; `redaction.hover` for withheld positions.
