# Shaft Hoist Control: secrets and consequences (spoiler, not shipped)

## The secret: landing-zone vanes that are not in the stop list

Every hoist has a stop list (canon `hoists.<id>.stops`). The shaft carries landing-zone vanes, which the controller uses to find a landing. Shaft Hoist Control draws every vane, not only the stops.

### Personnel shafts: vanes at Tier 1 levels

Canon says Tier 1 levels are reached by a lift that is not on any list. The personnel hoists nevertheless have vanes at those levels, within their travel:

| Hoist | Unlisted vanes |
|---|---|
| A01-H1 | levels 11 and 12 |
| A03-H1 | level 11 |
| A05-H1 | level 8 |

Where an operator can see them:

- **Depth indicator.** Each one is a bare tick with no number, between two numbered landings.
- **Shaft data.** "LANDING-ZONE VANES FITTED" is one more than "LANDINGS IN STOP LIST". The vane table has a row "--" with a redaction bar and the remark "Vane fitted. No landing in stop list."
- **LANDING ZONE lamp.** It lights as the cage passes through the vane.

The e-stop mail and the recorder never name the level. A cage stopped beside A03 L11 is "between landings 10 and 12".

### A02-H2: the sump vane

The freight hoist at ALPHA-02 has a vane 48 ft below its bottom landing, at 1,898 ft. Canon gives the site depth as 1,850 ft. The final limit is 56 ft below the bottom landing (1,906 ft). The shaft is deeper than the site.

The deputy can reach it. The steps:

1. Turn the mode key to INSPECT.
2. Hold INCH DOWN from landing 11 for about 20 s at inspection speed. Nothing stops the cage, and the LANDING ZONE lamp lights at 1,898 ft.
3. Try GATES OPEN at the vane. It is refused with "Landing gate interlocked closed from the landing side. The cage gate will not open against it." Something is on the other side, and it is closed from there.

When the cage comes to rest at an unlisted vane under the deputy's own hand, MSG-08-06237 arrives from O. Garrity (Tunnel Structures). The position has been entered in the record "in the form the record uses". Inspection travel to that depth "is booked through Transit Control" with an engineer and escort. No booking was held today, and no report will be made. This ties to segment 04 and the walk-down escorts: Transit Control books trips to a depth that is not in any level index.

The analyst and the auditor see the A02-H2 sump vane as a bare tick only when they select ALPHA-02, which is display-only for them.

## Consequence graph

| Trigger | Audit | Mail | Other account |
|---|---|---|---|
| Call to a restricted landing (tier above session, or the compartment landing A03 L8 LANTERN without LANTERN) | `window.open hoist:call` (refusal), `control hoist:call` | analyst MSG-08-06231, auditor 06232 (once each) | none |
| Emergency stop from a workstation | `control hoist:estop` (hoist, depth, speed, rest position) | analyst 06233, auditor 06234, deputy 06235; later stops re-deliver with `repeat` | first e-stop per account: trace to `auditor`, MSG-08-06238 (OIA intake) |
| Overload entered on the load-weighing buttons | `control hoist:load` | deputy 06236 (repeat on later overloads) | none |
| Cage at rest at an unlisted vane, moved by self | `control hoist:inch` / `hoist:run` | deputy 06237 once | none |
| Run, stop, reset, mode, gates, brake test, cancel calls, annunciator ack, select | `control hoist:<action>` | none | the recorder shows origin `OPR-...` to every account |
| Refusal of any kind (authority, remote site, isolation, interlock, drill seal) | `window.open hoist:<action>` plus dialog | none | none |
| Procedure or data sheet opened | `doc.read` (shell) | none | none |

## Per-account rules

- **analyst (T3, ALPHA-03):** Can register calls and use the e-stop at ALPHA-03. Cannot run the console ("operated by the duty hoist driver or the site command"). Tier 2 landings are redacted and calls to them are refused (OSC-DIR-0412). Other sites are display-only.
- **auditor (T3, ALPHA-01):** The same rules at ALPHA-01. Reads the full recorder for every site; the origin column is the way to identify a workstation.
- **deputy (T2, ALPHA-02):** Full driver's console at ALPHA-02: run, stop, inch, mode key, gates, brake test, load report, trip reset. T2 level names are released through CANON-T2. Other sites are display-only.
- **lifesupport (T4, GAMMA-08):** No hoists at the site; sees an empty state. The procedure (TSSCI-OSC, Tier 3) is refused by the shell.
- **Network isolation (any account):** All workstation control is lost ("runs on local control from the winder house only"). The cage keeps answering AUTO service locally.
- **Seal drill:** The portal landing (level 1) is sealed at sealing or sealed sites. Runs and calls to it are held, and the PORTAL SEALED tile lights.

## Ties to canon

- A03 L8 LANTERN compartment: the cage stops there only for a session holding LANTERN.
- The segment 04 walk-down (doors AL3 "level 12" at ALPHA-05) and the A02-H2 sump vane both show depths outside the level index, entered by escorted parties booked through Transit Control.
