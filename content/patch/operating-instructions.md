---
id: patch-operating-instructions
route: /patch/operating-instructions
app: patch
family: patch
template: memo
docNo: OSC-MEM-07-1186
title: "Hub Circuit Patch Bays: Patching, Testing and Line Check Calls (Operating Instructions)"
marking: UMBRA-C
originator: CMS/ALPHA-02
revision: 2
date: 2008-02-18
summary: Network Operations instructions for the hub circuit patch bays operated from MERIDIAN positions. Circuit classes, who may patch, the busy lamp rule, repatches without a circuit order, tests and limits, monitoring, line check calls and conduct while the network is isolated.
xrefs: [OSC-DIR-0447, OSC-ASR-COMM, OSC-DIR-0378, OSC-MEM-06-0291]
numbered: false
distribution:
  - Network Operations section, CMS/ALPHA-02
  - Hub command sections, ALPHA-01 to ALPHA-05
  - Duty officers, all hubs
  - Office of Internal Assurance (information)
  - "File: CMS-REG 07/1186"
letterhead:
  - COMMUNICATIONS SECURITY
  - Network Operations
  - ALPHA-02, Level 9
memoFor: ["Hub command sections and holders of MERIDIAN patch bay access"]
from: "Network Operations, Communications Security (CMS/ALPHA-02)"
subject: "Hub Circuit Patch Bays: Patching, Testing and Line Check Calls"
references:
  - "OSC-DIR-0447, Telephones, Mail Addressing and the Key Distribution Network"
  - "OSC-ASR-COMM, Communications Security Protocols"
  - "OSC-MEM-06-0291, Hub Circuit Designation Register"
signature: { name: "Network Operations", title: "Watch Supervisor, CMS/ALPHA-02" }
---

**1. The bays.** Each hub has one voice-frequency and data patch bay, designated HCP followed by the short form of the hub (HCP-A01 to HCP-A05). The bay is worked from the Hub Circuit Patch Panel at a MERIDIAN position; the cords are placed by the bay's remote patching unit, not by hand. Every circuit that terminates at the hub appears on two jacks: LINE, towards the cable, and EQPT, towards the site switch or multiplexer. With no cord in either jack the two are connected inside the bay (normal-through). A cord in either jack breaks the normal. Each circuit has a designation strip and a busy lamp. Four utility jacks sit on the bottom strip: TEST SET, OPR POSN (operator position), MONITOR and LOOP PLUG.

**2. Circuit classes.** Circuits are designated in the register :x[OSC-MEM-06-0291].

| Class | Designation | On each route | Carried on |
|---|---|---|---|
| Trunk | T, segment number, suffix | V1 and V2 voice, D1 data bearer, SP1 spare pair | Guideway cable of each rail segment in revenue service |
| Network | Site short form, suffix | V1 voice, D1 data bearer, M1 maintenance ringdown | Tram tunnel cable to each directly linked site |
| Site | Hub short form, X1 or X2 | X1 exchange line, X2 duty officer ringdown | Within the hub |

The D1 bearer of a trunk route is the key distribution network circuit between the two hubs. Its state is the link state shown in the MERIDIAN notification area (:x[OSC-DIR-0447]).

**3. Who operates a bay.** A position operates the bay of its own hub only. The bays of other hubs may be viewed from any hub position and are operated from their own Network Operations position. The positions are:

| Position | May do |
|---|---|
| Hub command (Tier 2), own hub | Every operation, including trunk and network repatches. The command authority is recorded as the circuit order, in the form CDR-hub/date. |
| Any other account holder at a hub, own hub | Tests, monitoring, line check calls and site patches. Trunk and network repatches only against a circuit order issued by Network Operations. |
| Office of Internal Assurance | Monitoring at any bay (para 7). No other operation. |
| Site technicians away from the hubs | Their own site's maintenance circuit: test and line check. Instructions are issued by the site. |

**4. Busy lamps.** A voice circuit whose busy lamp is lit is carrying traffic. It is not patched, tested or seized until the lamp goes out. The bay refuses the cord with the busy tone. A data bearer's lamp is always lit while the bearer is in service: patching its LINE jack takes the key distribution network link between the two hubs DOWN, and the duty officers at both hubs are told beforehand.

**5. Repatches without an order.** A trunk or network repatch moves a circuit's equipment onto another pair, normally the route's spare, to restore a circuit with a fault. It needs a circuit order. The bay is a physical frame and will take a cord without one. A repatch made without an order is recorded as such, the cord is tagged NO ORDER on the bay drawing, and the repatch is reported to Network Operations and to the hub command. It is left in place until Network Operations decides on it. It is not a reason for not reporting a fault.

**6. Tests.** The test set is patched to a LINE jack. Three tests are available.

| Test | Method | Pass |
|---|---|---|
| Tone | :c[apps.patch.tests.toneHz]{raw} Hz at :c[apps.patch.tests.toneDbm0]{raw} dBm0 sent to the far end, received level read back | Loss within :c[apps.patch.limits.lossToleranceDb]{raw} dB of the expected loss in the register |
| Loopback | Far-end loop requested; round trip timed | Loop returned |
| Line quality | :c[apps.patch.tests.qualitySamples]{raw} readings, one each :c[apps.patch.tests.sampleMs]{raw} ms | Voice: C-message noise not above :c[apps.patch.limits.noiseWarnDbrnc0]{raw} dBrnC0 (limit :c[apps.patch.limits.noiseFailDbrnc0]{raw}), signal to noise not below :c[apps.patch.limits.snrMinDb]{raw} dB. Data: errored seconds not above :c[apps.patch.limits.esWarnPerHour]{raw} per hour (limit :c[apps.patch.limits.esFailPerHour]{raw}) |

A result between the warning figure and the limit is MARGINAL. A failure is reported to the test desk automatically, with a copy to the position that ran the test. Do not repeat a failed test more than once before the test desk has replied.

A spare pair that is not assigned is open at both ends. A test on it returns "open circuit, no termination".

**7. Monitoring.** A monitor cord bridges a jack without breaking the circuit. The position shows whether the circuit is carrying traffic and its level. No speech is reproduced at a MERIDIAN position. Monitoring is open to the Office of Internal Assurance at every bay, under :x[OSC-DIR-0378], and to the hub's own positions.

**8. Line check calls.** With OPR POSN patched to a voice LINE jack, the position receives dial tone and dials the four-digit extension of a desk on the exchange at the far end. Telephones are answered as :x[OSC-DIR-0447] requires: extension and section, nothing else. Ringdown circuits (X2, M1) ring the far end as soon as the line is seized and are not dialled. The desks below accept line check calls at any hour unless shown otherwise. Other extensions are not to be used for line checks.

| Exchange | Extension | Desk |
|---|---|---|
| ALPHA-01 | 2100 | Duty Officer |
| ALPHA-01 | 1300 | Network Control |
| ALPHA-01 | 7700 | MERIDIAN Service Desk (0600Z to 1800Z) |
| ALPHA-02 | 2100 | Duty Officer |
| ALPHA-02 | 4400 | Network Operations test desk |
| ALPHA-03 | 2100 | Duty Officer |
| ALPHA-03 | 2207 | Level 2 plant room |
| ALPHA-03 | 5021 | Records Division |
| ALPHA-04 | 2100 | Duty Officer |
| ALPHA-05 | 2100 | Duty Officer |

An extension not in a hub's directory returns the exchange intercept.

**9. Network isolation.** While the network is isolated every inter-site circuit is dead at every bay: no loop current, no dial tone, no signal returned. Tests return FAIL and are not reported. Site circuits and patches within a bay continue to work. Cords placed during isolation stay in place when the circuits are restored.

**10. Records.** Every cord inserted or removed, every test and every call is entered in the bay log and in the workstation audit trail.
