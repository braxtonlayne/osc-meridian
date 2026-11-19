---
id: patch-maintenance-circuit
route: /patch/maintenance-circuit
app: patch
family: patch
template: memo
docNo: OSC-MEM-08-0252
title: "Site Maintenance Circuit: Weekly Line Check and Test"
marking: TSSCI-OSC
originator: FE/GAMMA-08
revision: 1
date: 2008-03-10
facility: GAMMA-08
t4: true
summary: Site instruction for the life support watch on the maintenance circuit at the terminal block. Weekly line check to Maintenance Control, tone and loopback tests, and what to do when the circuit fails.
xrefs: []
distribution:
  - Life support watch, all shifts
  - Site Superintendent
  - "File: FE site file 08/03"
numbered: false
letterhead:
  - FACILITIES ENGINEERING
  - Site instruction
memoFor: ["Life support watch"]
from: "Site Superintendent"
subject: "Maintenance Circuit M1: Weekly Line Check and Test"
signature: { name: "Site Superintendent", title: "for the Facilities Engineering detachment" }
---

**1. The circuit.** The terminal block in the plant room carries this site's external circuits. Only one of them is worked by the life support watch: the maintenance circuit, designated M1 on its strip. M1 is a ringdown line to Maintenance Control. It is not dialled. When the handset is patched to its LINE jack, Maintenance Control rings.

**2. Other circuits.** The voice and data circuits on the same block are worked by Network Operations. The watch does not patch, test or seize them. If a lamp on another circuit looks wrong, note it in the watch log and mention it on the next line check.

**3. Weekly line check.** Every Monday on the day watch:

1. Open the patch panel at the workstation and select the M1 LINE jack.
2. Patch the handset to it (Call menu, or select the HANDSET jack and then the M1 LINE jack).
3. Wait for Maintenance Control to answer. Say "weekly check, M1" and the time. They will clear.
4. Remove the cord.
5. Enter the time and "M1 line check correct" in the watch log.

**4. Tests.** If Maintenance Control does not answer, patch the test set to the M1 LINE jack and run a tone test, then a loopback. A pass on both means the line is good and Maintenance Control was away from the desk: try again after 30 minutes. A FAIL is logged with the Site Superintendent automatically and a fault notice comes back to you by mail. Do not run the tests more than twice.

**5. When the circuit is down.** If M1 is dead (no loop, no ring) the line is out of service beyond this site. Tell the Site Superintendent by the local telephone. Plant faults are reported through the Site Superintendent until M1 is restored. Do not try other circuits.
