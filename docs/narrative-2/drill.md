# Seal Drill Coordinator: secrets and consequences (spoiler; not shipped)

App `drill`, route `/drill`, documents `/drill/procedure` (OSC-DIR-0433) and `/drill/site-card` (OSC-DIR-0433-B, t4). Shared keys `drill` and `drill-register` (src/apps/drill/types.ts).

## The drill

Ordered by the deputy only (key K-A02-07, guarded ORDER, then the two-person dialog: second officer, Network Control read-back of the drill number, countersign). Timings are canon `sealDrill` (sequence of 35, class times, timeScale 30). Every outcome is deterministic from canon facts, so the same drill happens in every tab and every account:

| Site | What happens | Canon fact |
|---|---|---|
| GAMMA-14 | Acknowledges 3 min late, doors cycle, never reports sealed: NO REPORT | One duty officer posted (staff breakdown); completed 2008-04, under 2 months before the in-world date, seal acceptance not entered |
| GAMMA-17, GAMMA-06, BETA-12 | Late seal report (+2 min) | Completed under 6 months before 19 MAY 2008, never drilled |
| GAMMA-13, BETA-06 | On time despite recent completion | Drilled in the October 2007 exercise week (registry fac-gamma-13, extended-b TOPOFF 4) |
| BETA-05 | Acknowledges, seal deferred, NO REPORT | Only if ordered between 1300Z and 2200Z: calendar CAL-0805-22, cover course in session through 23 MAY |
| Everything beyond the EASTERN network | Order not passed, NO REPORT | Only while `isolation` is active (hub circuits down) |

## Secret: the platform 7 acknowledgement

ALPHA-05 receives the order at drill minute 1 over inter-hub segment 06. Its acknowledgement is stamped at minute 0.5, before it could have been received, and arrives on circuit `A05 PL7 ORDER WIRE`, not on the circuit the order went out on. Platform 7 at ALPHA-05 is the segment 04 platform (extended-c cameras), and segment 04 "does not carry the order" (canon sealDrill rule). Something on the segment 04 side of ALPHA-05 answered a drill order nobody had sent it yet.

Where a curious operator finds it:
- Message log: the `ACK ... ALPHA-05 SEALING` line sits above the relay line `A01 > A05 SEAL DRILL ... ACKNOWLEDGE` and carries a different CCT.
- Timeline: ALPHA-05's door-cycle bar starts left of its receipt tick.
- Site detail (select ALPHA-05 after it acknowledges): an extra row "Ack circuit A05 PL7 ORDER WIRE" and the note "Acknowledgement received on the order wire."
- Annunciator: ORDER WIRE SEQUENCE lights on every drill.
- Register column "Ack out of seq." reads 1; the drill report lists ALPHA-05 under "Ack out of sequence" with a paragraph saying such acknowledgements "are not a ground for query".
- Doors (another app) start closing ALPHA-05's seal doors from `acknowledged`, so on CCTV/doors ALPHA-05 begins sealing before the order reaches it.

Reward: selecting that log line and pressing "Query line with Network Control" (or Enter on it) delivers msg-08-05303 from the circuit office: the stamp is a clock offset; the platform 7 order wire "is maintained for the segment it serves", "is not patched to Network Control", no fault recorded, and "the circuit office does not hold the name of the operator who answered on it". Query closed, like PV-Q-08-0031. Querying any other line: "The line agrees with the relay record." The OIA observation (msg-08-05305) notes such lines and makes no finding.

## Consequence graph

| Trigger | Consequence |
|---|---|
| Deputy orders | audit `control drill:order` (drill, second, isolated, sites); tone; shared `drill` + register entry; annunciator DRILL ORDERED |
| Any site NO REPORT during a drill | annunciator alarm (horn until ACK); mail 05302 to the ordering account (repeat per drill, slots) |
| Drill stood down (deputy or Network Control after `holdMin`) or aborted | mail 05301 drill report to the ordering account (repeat per drill, slots); OIA: observed -> 05305 to the deputy (trace), unobserved -> 05306 to the auditor (trace, once) |
| Auditor presses OIA OBSERVER during a drill | `drill.observer = auditor`; audit `control drill:observe` |
| Analyst tries the order key / cover / Drill > Order | in-world refusal + `window.open` audit; mail 05304 from the deputy (once); `notice` trace to the deputy |
| Technician (GAMMA-08) ACK ORDER / REPORT SEALED | GAMMA-08 acknowledges / seals early in the shared plan; audit `control drill:ack-site` / `drill:report-sealed` |
| Query ALPHA-05 ack line | mail 05303 (once); audit `control drill:query` |

The technician never sees another facility: site panel, own timeline row, own log lines (relaying station shown as RELAY, Network Control as NETWORK CONTROL), own column of the register, Annex B only.
