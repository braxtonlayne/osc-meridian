# isolate: Network Isolation, Manual Initiate (SPOILERS, not shipped)

Control HS-0001, a covered red actuator fitted at workstation A03-5-114 "because the reading room is the nearest continuously staffed position to the switch room". Shared key `isolation` (type `IsolateState` in `src/apps/isolate/types.ts`, a superset of core `IsolationState`). Figures in `content/canon/apps/isolate.json`.

## Escalation ladder (level never decreases)

| Level | Steps | Hold | Isolation | Restoration | Mail |
|---|---|---|---|---|---|
| 1 | lift + hold | 3 s | 10 min | automatic (line checks) | initiator 05201 (OIA statement); network 05202 (all Tier 2-3); lifesupport 05203 (site notice, no other facility named) |
| 2 | lift + hold | 3 s | 60 min | automatic, or earlier by certificate | network 05204; deputy 05205 (named certifying officer); initiator 05206 (OIA interview) |
| 3 | lift + hold | 5 s | until certificate | certificate only; seal fitted on restore | initiator 05207 (OIA formal finding); auditor 05208 (review assigned). Shell: lock-screen review notice from here on |
| 4 | break seal + lift + hold | 5 s | until certificate | certificate only; second seal fitted | analyst 05209 (probation adverse report, whoever pressed: "the assignment is the operator's responsibility") |
| 5 | break seal + lift + hold | 8 s | held for good | none: "reserved to the Council Secretariat" | network 05211; lifesupport 05212 (no restoration date) |

Event mail: seal broken -> auditor 05210 (first time only); certificate approved/returned -> raiser 05213 / 05214 (cross-account deliveries are once only; the decision is always visible at the control).

Restoration certificate: raised at the Restoration view (analyst or deputy; statement >= 20 chars), posted as `form.routed` to `deputy` (subject = RC number, data.receipt = RC number). The deputy approves or returns inside the isolate app. If the Forms action queue decides it instead, the isolate app applies any `form.decided` trace from `deputy` whose `data.receipt` matches the pending certificate. A pending certificate is withdrawn if the line-check clear arrives first. Level 5 is permanent by design: only clearing site data undoes it.

Second actuation while latched: recorded (`isolate:actuate-latched`), no escalation. Auditor can lift nothing (refusal cites para 3.4); Tier 4 sees only "Site External Circuits, GAMMA-08".

## The secret: the counter that does not match the register

The panel's operations counter reads **0001** on a fresh install while the register says no initiations are recorded. The difference is explained only if the operator ticks "Include entries archived with the previous user profile" (View menu or Register view):

- **NI-080327-01, 27 MAR 2008 2214Z, operator P-4-07-0219, workstation A03-5-114, level 1.** Restored 28 MAR 0610Z ("Certificate not raised"), eight hours for a ten-minute line check. Statement: "Not received."
- Note: "Escalation level zeroed on reissue of the workstation [14 APR 2008] ... Reason: not entered." That contradicts OSC-DIR-0507 para 5.2 ("not reduced by any procedure ... or by reissue of the workstation").

P-4-07-0219 is Carol Ann Dimmick (name HOLLOW-withheld in the directory, never in the bundle): DETACHED / UNPOSTED effective 28 MAR 2008, the morning the circuits came back; OIA-08-031 (BRIAR) records the Facility Inventory scan "first opened from workstation A03-5-114, 27 MAR 2008". So the night she opened the scan, she also cut the network. The site never says so. The auditor's review mail (05208) asks "whether the archived entries were read", which points the auditor account at the same checkbox.

Refs continue the archived numbering only on its own date (`NI-080327-02` would be next on 27 MAR); live refs are `NI-080519-nn`.
