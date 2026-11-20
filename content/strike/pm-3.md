---
id: strike-pm-3
route: /strike/pm-3
app: strike
family: strike
template: memo
docNo: OSC-MEM-07-0312
title: "Planning Model PM-3: Method and Operating Notes"
marking: UMBRA-C
originator: OCP/ALPHA-01
revision: 2
date: 2007-03-12
summary: Operations and Continuity Planning sets out the method of planning model PM-3 (Hardened Site Survivability Estimator), its tables, its inputs and what its outputs may and may not be used for. A simplified planning model, not for engineering use.
distribution:
  - Facility Commanders, ALPHA-01 to ALPHA-05 (planning cells)
  - Deputy Commanders, ALPHA sites
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Director, Transit Operations (TO/ALPHA-01)
  - Office of Internal Assurance (OIA/ALPHA-01)
  - Records Division, planning series (RD/ALPHA-03)
xrefs: [OSC-FAC-IDX, OSC-TRN-ENG, OSC-ASR-CG, OSC-DIR-0301, OSC-DIR-0319]
memo: &tpl
  letterhead:
    - OPERATIONS AND CONTINUITY PLANNING
    - Intelligence & Analysis
    - ALPHA-01
  memoFor: ["Distribution"]
  from: Operations and Continuity Planning (OCP), Intelligence & Analysis
  subject: "Planning Model PM-3: Method and Operating Notes"
  references:
    - OSC-FAC-IDX, Facility Registry Index
    - OSC-TRN-ENG, Tunnel Engineering Tables
    - OSC-ASR-CG, Classification Guide
  signature: { name: "Operations and Continuity Planning", title: "Intelligence & Analysis, ALPHA-01" }
  routing:
    - { office: "OCP Planning Cell", action: "Originator", initials: "OCP", date: "2007-03-12" }
    - { office: "FE Structures Section", action: "Coord", initials: "IL", date: "2007-03-09" }
    - { office: "Records Division, planning series", action: "File", initials: "RD", date: "2007-03-20" }
<<: *tpl
---

1. **Status of the model.** PM-3 is a SIMPLIFIED PLANNING MODEL, NOT FOR ENGINEERING USE. It is issued on MERIDIAN workstations as the Hardened Site Survivability Estimator so that planning cells can work through continuity exercises with a common, rounded set of figures. Its outputs are estimates for exercise planning only. Revision 2 replaces Revision 1 in full. The disclaimer below is shown on every screen of the estimator and printed on every sheet:

   > :c[survivability.model.disclaimer]

2. **What the model does.** For one surface event at a point, of one generic yield step, the model draws the contours of peak overpressure in the table at paragraph 4 and reads each programme installation against its hardening class and depth. It gives one word per installation. It does not give casualties, fire, fallout, ground shock, or the state of external services, and it is not to be quoted as if it did.

3. **Method.** The estimator applies the following rules, in this order, and no others:

   1. The surface peak overpressure at an installation is read from the contour table. The range to each contour, in statute miles, is its coefficient multiplied by the cube root of the yield in kilotons.
   2. Between two contours the overpressure is interpolated on the logarithms of range and overpressure. Beyond the outermost contour the installation is taken as unaffected. Inside the innermost contour the overpressure is above the range of the model.
   3. The effective rating of an installation is the rated overpressure of its hardening class, increased by the depth coupling of the class for each thousand feet of model depth.
   4. The estimated condition is read from the ratio of site overpressure to effective rating. Inside the innermost contour the condition is always NOT ASSURED.
   5. The model depth is the depth of record. Where the operator does not hold the depth of record, GAMMA installations are modelled at the planning depth (paragraph 6).
   6. DELTA installations are not modelled (paragraph 10).

4. **Contour table.** Range to each contour, in statute miles, is the coefficient below multiplied by the cube root of the yield in kilotons. Doubling the distance does not halve the overpressure; the table is interpolated on logarithms.

::canon-table{source="survivability.contours" cols="psi:Overpressure (psi),rangeCoeffMi:Range coefficient (mi)" caption="PM-3 contours"}

5. **Hardening classes.** Each installation is assigned one class. The GAMMA split is made on posted staff, not depth, so that the class itself discloses nothing that is held at Tier 2.

::canon-table{source="survivability.classes" cols="id:Class,name:Name,ratedPsi:Rated psi,depthCoupling:Depth coupling,description:Description" caption="PM-3 hardening classes"}

6. **Depth.** The model depth of an ALPHA or BETA installation is its registered depth. GAMMA depths of record are held at Tier 2. Where the operator does not hold them, the estimator models every GAMMA installation at the planning depth of :c[survivability.gammaPlanningDepthFt] ft, which is the shallowest depth of the class and so the conservative choice. Estimates made at different tiers will therefore differ for GAMMA sites. This is intended. The sheet states which depth was used (P for planning depth, R for depth of record from the release).

7. **Conditions.** The condition is read from the ratio of the site overpressure to the effective rating.

::canon-table{source="survivability.conditions" cols="id:Condition,maxRatio:Ratio up to,text:Reading" caption="PM-3 conditions (the last applies above the preceding ratios)"}

8. **Egress basis.** Where an ALPHA installation is read ISOLATED or NOT ASSURED, the estimator lists the inter-hub rail segments on which egress is planned. The list is the segment table as it stood at this revision and is not re-issued between revisions. Route lengths are the engineering figures of :x[OSC-TRN-ENG]. Questions on whether a segment is available on a given day are for Transit Operations, not for this office.

9. **Positions.** The estimator evaluates only installations whose position is held in the site table issued to the workstation. Others are listed as NOT EVALUATED. No position is supplied by OCP to make up the table; positions are released under the registry plan (:x[OSC-FAC-IDX]).

10. **DELTA.** :c[survivability.notModelled.text] DELTA installations appear in every result as NOT MODELLED, with the withholding reference of :x[OSC-ASR-CG].

11. **Inputs.** A point may be given by clicking the national or local plot, by selecting a marker, by moving the point cursor with the arrow keys, or by typing it: a designation (ALPHA-03), a city held in the estimator's gazetteer (LEXINGTON KY), a distance and compass point from either (24 MI S OF LEXINGTON), or a latitude and longitude (37.69N 84.50W; a longitude without E or W is taken as west). The yield is chosen from the generic steps on the Yield menu. No other yield is accepted, and no weapon type is or will be named in the model.

12. **Outputs and use.** A run is recorded in the workstation audit trail. A run that is to be kept is entered in the planning register held by this office, under the operator's id. Printed sheets are UNCONTROLLED WHEN PRINTED and are handled under :x[OSC-DIR-0319]. Planning model PM-3 is not issued on Tier 4 workstation profiles (:x[OSC-DIR-0301]).

13. **Revision.** Revision 2 corrects one contour coefficient of Revision 1, adds the GAMMA planning depth and adds the egress basis. Comments to the OCP planning cell, ALPHA-01.
