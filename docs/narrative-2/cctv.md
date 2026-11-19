# Facility Video (cctv): secrets

SPOILERS. Owner: cctv app agent, MERIDIAN pass two.

## 1. The train on platform 3 (segment 04)

- **Camera:** A02-C24 (ALPHA-02, Level 11, platform 3) is the platform that serves rail segment 04. In canon it is `apps.cctv.platforms` `serves: "SEG04"`. Its lights are permanently on standby because the platform is out of the timetable.
- **Pass-one event:** while the segment 04 movement runs (`seg04` signal from `@narrative/engine`, analyst account only), the camera shows the segment 04 tunnel portal door (A02-BD9) opening `doorLeadSec` before the movement ends. Then an unlit consist with head lamps runs in over the last `approachSec` and stands at the platform until the board's log hold clears.
- **Far end:** A05-C27 (ALPHA-05 platform 7, portal door A05-BD8) shows the consist leaving as the first block lights.
- **Gap:** both recorders write a record gap over [start, end + hold] with the event text `REC SUSPENDED (HOST)`. In playback the interval shows NO RECORDED VIDEO. Only someone watching live sees the train.
- **Consequences:**
  - The deputy commander (ALPHA-02) gets MSG-08-05886 through a trace. Video maintenance reports that both ends stopped recording to the second on a host command nobody logged.
  - An analyst who had either camera on the wall live is audited as `control` `cctv:view` with `{seg04:'1', live:'1'}`.
- **Access:** the analyst (Tier 3, ALPHA-03) can view it under the hub portal and platform rule (OSC-DIR-0474 para 5(c)).

## 2. Three people at the dead reader (muster)

- **Camera and reader:** A02-C24 again. The muster reader on that platform, A02-MP3-R3, is out of service (muster canon `readersOutOfService`). Muster canon `unknownBadges` records three badges at that reader: 05-0142, 05-0151 and 05-0157, at 10.5, 10.75 and 11 drill minutes.
- **What the camera shows:** during any ALPHA-02 muster, whether an operator run in the `muster` key or the seal drill's acknowledgement, three figures appear standing on platform 3 at those times (minutes times 60000 divided by `sealDrill.timeScale`). They stay `leaveAfterMin` minutes and leave.
- **The mismatch:** the muster count never includes them. The camera shows people where the roll says nobody is. 05-0142 is Tobin (ALPHA-05 series badges at ALPHA-02).

## 3. CH16, the spare channel (hoist sump)

- **Where it is:** recorder unit DVR-A02-2 at ALPHA-02 has 11 cameras (channels 1 to 11). Channels 12 to 15 are listed "(no camera)". Channel 16 is listed as `CH16  CAM16` and has no line in the camera schedule. It appears only in **View, Cameras by recorder**. It has no access rule, so anyone who can list ALPHA-02 can open it. Tier 4 cannot list ALPHA-02.
- **What it shows:** a hoist landing with the level placard **12**. ALPHA-02's level index stops at 11.
- **The cage:** the cage of A02-H2 appears there, gates and all, when the hoist key puts it within 2 ft of the bottom landing plus `sumpVanes.belowBottomFt` (48 ft). That is the hoist agent's secret landing below level 11. Nobody walks past (activity rate 0).
- **Consequences:**
  - Opening it logs `control` `cctv:view` with `{unassigned:'1', unit, channel}`.
  - MSG-08-05886 para 4 mentions "video present" on a spare channel.
  - OSC-DIR-0474 para 9 says spare channels carry no picture.

## Mail

| Msg | Trigger | Who |
|---|---|---|
| 05881 | first still printed | any account except Tier 4 |
| 05885 | first still printed | Tier 4 (GAMMA-08 post) |
| 05882 | refused camera requests reach `restrictedAfter` (3) | any account |
| 05883 | first PTZ move | any account except Tier 4 |
| 05884 | first PTZ move | Tier 4 |
| 05886 | segment 04 record gap | deputy, by trace |
