# environ: Environmental Control (air revitalization), GAMMA-08 (spoiler, not shipped)

## What it is

The Tier 4 technician's home app (account `lifesupport`, Darlene M. Voss, GAMMA-08). A deterministic air model
(`src/apps/environ/model.ts`, constants in `content/canon/apps/environ.json`): one mixed air volume, three zones on
the GAMMA level template, two AHUs, makeup air damper MAD-1 with a seal closure latch, two swing-bed CO2 scrubber
trains (OFF / AUTO / ADSORB / REGEN), two filter banks for CBRN mode with overpressure. The plant runs on the seal
drill timebase (`sealDrill.timeScale`, 30 plant seconds per second) so a drill seal at GAMMA-08 lines up with the
Seal Drill Coordinator.

## The secret: more people breathing than are posted

The model's occupancy is posted staff (canon `facilities.GAMMA-08.staff`, 38) plus a residual load
(`residualPersonsByLocalHour`: 9 at night, 6 to 7 by day, all in the shelter hall zone Z2). The panel never shows
the residual. It shows the occupancy basis (38) everywhere: the OCCUPANCY BASIS window, the data sheet, the
procedure's reference figures (rise 296 ppm/h, one-train 2,369 ppm, two-train 1,184 ppm, all computed from 38 and
checked by a unit test).

Ways a curious operator finds it:
1. **Seal rate.** In a seal drill with the scrubbers off, CO2 climbs about a quarter faster than the procedure's
   296 ppm/h (about 340 by day, 366 at night). The equilibria with scrubbers running sit higher than the data sheet.
2. **CO2 load balance** (Engineering menu, Ctrl+B). An honest mass balance over the historian (stored CO2 change +
   makeup air carry-out + scrubber uptake, divided by the metabolic rate) returns an implied occupancy of about
   44 by day and 47 at night against 38 posted: OUTSIDE TOLERANCE. Sensor tolerance is fine; calibration was done.
3. **The handover log seed.** The night watch (TECHNICIAN 4-0592) already wrote "CO2 trend above basis again on
   this watch. CT-201 checked against handheld meter, agrees within 40 ppm. Noted for FE."

It agrees with pass one's DETACHED / UNPOSTED discrepancy (790 paid, not posted, no drill-down; R. Tobin carried
in the category since April 2007): people who are on the payroll and on no site's strength are being kept
somewhere, and at GAMMA-08 the air says nine of them sleep in the shelter hall at night. Nothing in the app names
the category or any other facility (Tier 4 rule); the player makes the connection.

If the technician signs the handover log with the load balance result in the remarks (the sign dialog offers
"Insert load balance result" after a balance outside tolerance), the senior engineer replies (MSG-08-05614):
the occupancy basis is posted staff, the balance "is not a headcount", CT-201 is within tolerance, the entry
"has not been copied to the monthly plant return". Delivered once.

## Consequence graph

| Trigger (lifesupport only) | Effect |
|---|---|
| Seal drill reaches GAMMA-08 (`drill.sites['GAMMA-08']` acknowledged/sealing/sealed) | MAD-1 closes whatever its selector says; closure latches; SEAL SIGNAL, MAKEUP AIR SEAL CLOSED, NO SCRUBBER ON LINE (if trains off) windows; horn. CO2 climbs. |
| Seal lifted (drill ended) | Damper stays shut until RESET CLOSURE pushbutton (refused while the seal signal is present). |
| CO2 above HIGH (2,500 ppm) for 30 plant minutes | MSG-08-05611 CO2 Excursion Recorded (slots time, peak, limit); once per excursion (shared `excursion.reported`), re-delivered for a later excursion. |
| Seal override key to OVERRIDE (reason required) while a closure is in force | MSG-08-05613 from the Site Superintendent: who directed it, CO2 and trains, time returned; "bring the key to the command post". Once per override event. |
| Handover log signed while a filter bank is past its 60-day cycle (bank A is, from canon: changed 12 MAR 2008) | MSG-08-05612 Filter Change Overdue from the senior engineer. Once. Recording a change on the panel first avoids it. |
| Handover log signed with an out-of-tolerance load balance in the remarks | MSG-08-05614 (the secret's answer). Once. |
| Filter change on the on-line bank, or while sealed | In-world refusal citing DIR-0128. |

Other accounts: `deputy` (Tier 2) and `auditor` (audit reader) see the GAMMA-08 panel as a REMOTE MONITOR,
display only; any control attempt is refused in-world and logged (`window.open`, subject `environ:<what>`). While
the network is isolated their link is DOWN and readings hold. `analyst` is refused outright (RefusalState, DIR-0128).
The auditor reading the technician's audit trail sees every `environ:*` control line, including the override
reason and the load balance run.

## Hooks for integration (not wired here)

- OIA finding on a seal override during a drill (the auditor can already see it in Audit review).
- Muster app: a muster at GAMMA-08 that totals 38 while the air says 47 would be the matching beat.
- CCTV G08-C06 (bunk room corridor) at night is the obvious place to show nothing at all.
