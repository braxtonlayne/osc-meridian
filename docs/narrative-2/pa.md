# pa: Emergency Broadcast and Public Address (SPOILERS, not shipped)

## Secret: message 40 and Zone 00

The library has a message 40 that no console holds. Its title and text are withheld (authority TO, ref TO-PA-0040: Transit Operations), but its row still carries a priority (P2) and a recording length (47 s). KB-0057, the Tier 4-readable library sheet, lists it as "Not held at this console" with the duration printed from canon, so even the GAMMA-08 technician can see that the gap in the numbering has a length.

Message 40 was carried twice in the 42 days the controller retains (the broadcast log, "Controller records"):

| Call | When | Zones | Originator |
|---|---|---|---|
| PA-0408-0001 | 08 APR 2008 0312Z | A05-Z00 | TC/ALPHA-01 |
| PA-0513-0007 | 13 MAY 2008 2104Z | A02-Z00, A05-Z00 | TC/ALPHA-01 |

Zone 00 exists only at ALPHA-02 and ALPHA-05, the two ends of segment 04. The controllers number level zones from 01 (Level 0 is Zone 01), so Zone 00 has no level. The zone table shows it with an empty level column, "Not assigned to a level", 18 loudspeakers, on rack AR-4 at ALPHA-02 (a rack number no level of ALPHA-02 uses: its twelve levels sit on racks 1 to 3) and AR-5 at ALPHA-05. A site all-call answers back from every zone, so an ALPHA-02 all-call reports one zone more than the site has levels.

The deputy (ALPHA-02 command) can select every ALPHA-02 zone except Zone 00. Selecting it is refused: "Zone 00 at ALPHA-02 is not assigned to a level. Selective calls to it are made from Transit Control console 2, Network Control, ALPHA-01." (ref TO-PA-0040). Choosing message 40 at any console gives the same carried-from line.

Agreement with pass-one canon:
- 08 APR is the first segment 04 occupancy that INC-08-017 says was "not logged".
- 13 MAY 2104Z sits inside the possession window on the engineering environmental table (13 MAY 2100Z to 2300Z, "possession"), and the calendar's 13 MAY possession entry that has no times.
- Platforms on segment 04 are ALPHA-02 platform 3 and ALPHA-05 platform 7. Zone 00 is where a loudspeaker circuit for the bore would be: beyond the portal doors that are normally closed.
- 18 loudspeakers in a tunnel nobody works in, and a 47-second recording that only Transit Control can play into it.

Nothing in the UI explains any of this. The duration, the rack number, the extra answer-back zone and the two log rows are the whole of it.

## Per-account behaviour

| Account | May | Refused (in-world) |
|---|---|---|
| analyst (T3, ALPHA-03 RD) | Records Division zone A03-RD (Levels 5-7), routine (P4) messages; monitor tone test | any other zone or site (mail 05741 once), P1-P3 messages, zone tests, network all-call |
| lifesupport (T4, GAMMA-08) | every GAMMA-08 zone, P2-P5 messages, zone and monitor tests; sees only GAMMA-08 in selectors, log and zone table; network calls shown as G08-ALL | P1 life safety (mail 05746 once), Zone 00 n/a, network all-call |
| deputy (T2, ALPHA-02 command) | every ALPHA-02 zone and the site all-call, every operator message, zone and monitor tests, cancel any ALPHA-02 operator call | other sites (mail 05742 once), Zone 00, network all-call (key NC-1 at Network Control) |
| auditor (T3, OIA ALPHA-01) | reads the whole log and zone tables; monitor test | originating anything ("OIA does not originate public address traffic") |

Everyone: messages 31-36 are controller-only; message 40 is refused with the TO reference; during an active seal drill at the site, P4/P5 calls and tests are refused; during isolation, other sites' controllers are NOT REACHABLE.

## Consequence graph

| Trigger | Mail (once per account) |
|---|---|
| analyst selects a zone other than A03-RD (or another site) | MSG-08-05741 Communications Security ALPHA-03, cc Okafor |
| deputy selects a zone at another site | MSG-08-05742 Network Operations |
| deputy makes a selective call to a Tier 2 level (Levels 7-9 at ALPHA-02) | MSG-08-05743 SFC duty officer (call is carried) |
| deputy keys a zone tone test outside Mondays 1600Z-1630Z | MSG-08-05744 Network Operations |
| lifesupport keys a zone tone test outside the window | MSG-08-05745 Site Superintendent GAMMA-08 |
| lifesupport attempts a P1 life safety message | MSG-08-05746 Site Superintendent GAMMA-08 |

The in-world date is always Monday 19 MAY 2008, so the test window depends only on the real Zulu time.

## Automatic broadcasts (plant state)

Derived from `drill` and `isolation` by any open pa window (idempotent by autoKey, written with the original event times): 31 at each site as it receives the drill order, 32 as each site seals, 33/34 network-wide at stand-down/abort, 35 network-wide on each isolation initiation, 36 when it clears (at `clearsAt`, or when a pa window sees `active` go false).
