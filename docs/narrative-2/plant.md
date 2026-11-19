# Reactor Plant Panel: secrets and consequences (spoiler, not shipped)

## The secret: RX-A05 carries the segment 04 traction load, unplanned and unbooked

The Plant event log (View, Plant event log; canon `apps.plant.events`) is the unit log extract for all eight units as reported to the Reactor Operations Section. Most entries are mundane and agree with the reserves pages: surveillances, the RX-A03 feedwater pump B outage (FE-08-0417, limit 80%), the RX-A02 overspeed test of 09 MAY 2008, routine load changes.

Four RX-A05 entries tell another story:

- 23 MAR 2007 0905Z LOAD: traction for the booked acceptance run of segment 04. Planned, booking ref. The one innocent one.
- 30 MAR 2007 0640Z TRIP, unplanned, FE-07-0233: 52-B3 traction feeder overcurrent, "No traction movement booked". This is the day the segment 04 commissioning sheet was signed. It is the **only unplanned trip in the fleet**, and the fleet summary table at the top of the log says so ("Unplanned trips since commissioning": RX-A05 1, every other unit 0).
- 08 APR 2008 2210Z TRANSIENT, ref none: a 0.6 MW step from 2210Z to 0038Z. The first segment 04 occurrence in incident 08-017.
- 13 MAY 2008 2131Z TRANSIENT, ref none: 2131Z to 2358Z, "second occasion". Exactly the window of incident 08-017, which the transit pages explain as "traction de-energised at standby".

So the plant that feeds segment 04 saw real traction load on both nights Transit says the line was dead, and it tripped on unbooked traction the week the line was signed off. Refs on the transients read "none". The FE work order is refused at the panel ("not on the distribution"), which points the player to the terminal (KB-0031).

Who can find it: every account that sees installations (analyst, deputy, auditor). Tier 4 (lifesupport, GAMMA-08) sees only the generic trainer TRN-1, and the event log and one-line are refused. The live RX-A05 display itself is unremarkable.

## Secondary: masked sites

RX-B03 and RX-B08 sites are SEXTANT sentinels and render as redaction bars (hover audits `redaction.hover`). Their live seeds run under the unit id, not the site, and show no local time.

## Shared state (`plant`)

`{ v: 1, sims: { [unitId]: { state, rev, savedAt, by, runner: { token, until } | null, frozen } }, trips: SimTripRecord[] }`. The last station to act holds a lease and checkpoints every second; others follow. Trips are global (60 kept) with operator ids, shown in Trip history filtered to units the account can see.

## Consequence graph

| Trigger | Audit | Mail | Other account |
|---|---|---|---|
| Any simulator control | `control plant:<rod, mode, guard, scram, trip.reset, pump, turbine.trip, turbine.reset, gen.close, gen.open, diesel, ack, reset, ic, freeze, run>` | none | follows checkpoints if watching the same unit |
| Simulator trip (auto or manual) | `control plant:trip` | MSG-08-05731 once (T4: MSG-08-05735) | entry in shared trip history |
| Third trip by the same account | as above | MSG-08-05736 once | none |
| Held outside limits (power above unit limit, essential buses dead) longer than `limits.holdS` | `control plant:limit` | MSG-08-05732 once | none |
| Any control on the live display | `window.open` "<unit> live control: ..." | MSG-08-05733 once | if the unit is RX-A02 and the actor is not the deputy: trace MSG-08-05734 to deputy, once per actor |
| Event log reference clicked | `window.open <ref>` | none | none |
| T4 asks for live, log or one-line | `window.open` | none | none |

## Reactions

- `isolation.active`: live links to units at other sites read CIRCUIT DOWN; the home-site unit stays live.
- `drill`: a SITE SEAL DRILL window lights on the live annunciator while the unit's site is sealing or sealed.
