# Hub Circuit Patch Panel: secrets and consequences (spoiler, not shipped)

## The secret: T04-SP1, the segment 04 pair that is not open

The register (OSC-MEM-06-0291, note 3) says the two segment 04 pairs, T04-SP1 and T04-SP2, were laid with the guideway, are not assigned, and "are open at both ends". The operating instructions (OSC-MEM-07-1186 para 6) say a test on an unassigned spare returns "open circuit, no termination".

T04-SP2 behaves as documented. T04-SP1 does not:

| Clue | Where | Who |
|---|---|---|
| Its busy lamp lights. It is lit for the whole of the segment 04 movement (`seg04` signal) and at random otherwise (`traffic.unassignedLive`). | ALPHA-02 and ALPHA-05 bays | anyone who can view those bays (deputy operates A02; analyst and auditor view) |
| It stays live during network isolation. Every other inter-site lamp goes dark. | both bays | same |
| Tone, loopback and line quality all read a terminated, quiet pair (loss about 5.8 dB, noise 19 dBrnC0), each marked MARGINAL with "expected: open, no termination". | test set at ALPHA-02 | deputy only (own bay) |
| Seizing it from the operator position rings down. The far end answers "Platform seven." and clears. | ALPHA-02 | deputy |
| The ALPHA-05 bay has "7411 PL7" pencilled on the T04-SP1 strip. | ALPHA-05 bay, viewed | analyst, deputy, auditor |
| 7411 is not in the listed desks (para 8) and not in the exchange directory. Dialled on the ALPHA-05 exchange (OPR POSN to T05-V1 or T05-V2 LINE at ALPHA-03), it rings five times and answers "Seven-four-one-one. Platform seven." | ALPHA-03 | analyst |

The pair is in use by someone at the ALPHA-05 end of segment 04, on a level and platform that are on no index, and the exchange records of calls to it are withdrawn by someone Network Operations does not know. It ties to the doors secret (A05-AL3, level 12) and the segment 04 walk-downs. Nothing in the app names a level or says who is there.

The analyst's route (T05 to ALPHA-05, dial 7411) is the main find. The deputy can find the ringdown and the test anomaly at their own bay. The auditor can only monitor: a monitor cord on T04-SP1 shows speech-level traffic during the movement, and receives the referral if anyone else makes the call. The technician sees none of this.

## Consequence graph

| Trigger | Audit | Mail to self | Other account |
|---|---|---|---|
| Trunk or network repatch without an order (analyst, own bay; confirm dialog first) | `control patch:patch` (authorised false) | MSG-08-04931, once (slots bay, circuits, jacks, time, date) | trace `mail.deliver` MSG-08-04934 to `deputy`, once |
| Test FAIL at a hub bay, not isolated (analyst, deputy) | `control patch:test` | MSG-08-04932, once (testId, circuit, bay, test, result, summary, time, date) | none |
| Test FAIL on G08-M1 (technician) | `control patch:test` | MSG-08-04936, once (T4-safe, names no other facility) | none |
| Call answered by an unlisted far end (7411, or the T04-SP1 ringdown) | `control patch:call` (unlisted true) | MSG-08-04933, once (callId, circuit, number, bay, time, date) | trace `mail.deliver` MSG-08-04935 to `auditor`, once |
| Cord in, monitor cord, cord out | `control patch:patch`, `patch:monitor`, `patch:unpatch` | none | none |
| Refusal (remote bay, auditor operating, T4 off assignment, busy line) | `window.open` subject the procedure docNo | none | none |
| Document opened | `doc.read` | none | none |

Seeded faults that give a FAIL to find: T05-V2 noise (ALPHA-03 and ALPHA-05), T03-V1 loss (ALPHA-02 and ALPHA-04). T02-D1 errored seconds read MARGINAL. During isolation, tests on inter-site pairs FAIL and are not reported (para 9).

## Per-account rules

- **analyst (T3, ALPHA-03):** operates HCP-A03: tests, monitors, calls, site patches. Trunk and network repatches go in after a confirm, tagged NO ORDER and reported. Views the other four bays; network circuits at other bays are withheld (strip masked).
- **deputy (T2, ALPHA-02):** operates HCP-A02 fully. Repatches carry the order CDR-A02/date. Views the other bays with network circuits shown.
- **auditor (T3, OIA, ALPHA-01):** monitor cords at any bay. Every other cord is refused (para 7).
- **lifesupport (T4, GAMMA-08):** sees only the GAMMA-08 terminal block (TEST SET and OPR POSN, no other utilities). May test and call G08-M1 (ringdown to "Maintenance Control."). Everything else is refused with OSC-MEM-08-0152. Help shows only that document.

## Shared key `patch`

Documented in `src/apps/patch/types.ts`. `links` gives the state of each revenue segment's hub link (UP, DEGRADED, DOWN) from cords and seeded faults, for the shell's taskbar. It does not include isolation, which the shell already knows.
