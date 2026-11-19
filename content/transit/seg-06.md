---
id: transit-seg-06
route: /transit/segment/06
app: transit
family: transit
template: record
docNo: OSC-TRN-SEG-06
title: "Segment Engineering Sheet: Segment 06, ALPHA-01 to ALPHA-05"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 4
date: 2008-02-15
facility: ALPHA-05
summary: Engineering sheet for rail Segment 06, ALPHA-01 to ALPHA-05, the redundancy segment. Length, running time, 20 block sections, programme record, commissioning, possessions and defects.
xrefs: [OSC-TRN-ENG, OSC-TRN-TT-08-02, OSC-FAC-ALPHA-01, OSC-FAC-ALPHA-05, OSC-PER-PH2, OSC-TRN-SEG-02]
distribution:
  - Network Control, ALPHA-01
  - Transit Control desk, ALPHA-05
  - Platform supervisors, ALPHA-01 and ALPHA-05
  - Facilities Engineering file FE/TS/06
recordType: SEGMENT ENGINEERING SHEET
fields:
  - { label: Segment, value: "06", mono: true }
  - { label: Termini, value: "ALPHA-01 (Level 13, platform 3) to ALPHA-05 (Level 11, platform 1)" }
  - { label: System, value: "Modified maglev, double guideway" }
  - { label: Status, value: "IN REVENUE SERVICE" }
  - { label: Designation, value: "Redundancy segment" }
  - { label: File, value: "FE/TS/06", mono: true }
revisions:
  - { rev: "1", date: "2007-02-26", change: "Issued at commissioning.", by: "FE/ALPHA-02" }
  - { rev: "2", date: "2007-06-11", change: "Block 06-14 detection replaced after lightning-induced surge on shaft cable 06-V6.", by: "FE/ALPHA-02" }
  - { rev: "3", date: "2007-10-29", change: "Speed restriction in block 06-09 lifted.", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2008-02-15", change: "Annual review. No change to data.", by: "FE/ALPHA-02" }
---

1. **Segment.** 06, ALPHA-01 to ALPHA-05, :c[railSegments.06.routeNote]. Engineering length :c[railSegments.06.miles] mi. Published running time :c[railSegments.06.hours] h at :c[transitTech.railSpeed]. Status :c[railSegments.06.status].

2. **Function.** Redundancy segment. Provides a second route between ALPHA-01 and the Southern hub independent of Segment 01 and Segment 05, and a diversion route for ALPHA-01 to ALPHA-03 traffic by way of ALPHA-05 if Segment 01 is closed. Booked use is light: one path each way, Monday to Friday (:x[OSC-TRN-TT-08-02]).

3. **Programme.** Funded and scheduled under the programme heading "Primary rail network construction" (recruitment and programme phase 2, :x[OSC-PER-PH2]). Works completed :c[railSegments.06.completed].

4. **Construction.** Driven by four TBMs, 2003 to 2006, from ALPHA-01, ALPHA-05 and two intermediate launch shafts. Single bore, double guideway, 31 ft internal diameter. Ruling grade 1 in 70 at the ALPHA-01 end. Crew relief at crossover X06-2 (blocks 06-10, 06-11) on paths over eight hours; none at present.

5. **Block sections.** Twenty, 06-01 at ALPHA-01 to 06-20 at ALPHA-05. 06-01 shares the ALPHA-01 approach cavern with Segment 02. Crossovers X06-1 (06-05), X06-2 (06-10/06-11), X06-3 (06-16). Refuge chambers at each crossover.

6. **Commissioning.** Witnessed acceptance run 15 FEB 2007, consist R06-010. Entered revenue service 26 FEB 2007.

7. **Possessions, 12 months to JAN 2008.** Seven. Two for the detection replacement at 06-14 (JUN 2007), one for the 06-09 restriction (OCT 2007), four for routine shaft fan maintenance. None overran.

8. **Open defects.**
   - D06-05. Shaft 06-V6 cable surge arrester replaced; earth resistance to be re-measured at next possession. Category B.
   - D06-06. Refuge X06-3: two of twelve oxygen candles past rotation date; replacements issued, not yet fitted. Category B.
   - D06-07. Platform 1, ALPHA-05: public address loop inaudible at the south end. Category C.

9. **Remarks.** Nil.

Signed I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 15 FEB 2008.
