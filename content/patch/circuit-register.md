---
id: patch-circuit-register
route: /patch/circuit-register
app: patch
family: patch
template: record
docNo: OSC-MEM-08-0244
title: "Hub Circuit Designation Register: Trunk Circuits (Revision 5)"
marking: UMBRA-C
originator: CMS/ALPHA-02
revision: 5
date: 2008-04-30
summary: Network Operations register of the inter-hub trunk circuits on the guideway cables, by rail segment, with designation, type, register status and circuit order of record. Network and site circuits are registered at each hub.
xrefs: [OSC-MEM-07-1186, OSC-DIR-0447, OSC-TRN-SEG-04]
distribution:
  - Network Operations section, CMS/ALPHA-02
  - Hub command sections, ALPHA-01 to ALPHA-05
  - "File: CMS-REG 08/0244"
recordType: CIRCUIT DESIGNATION REGISTER
fields:
  - { label: Register, value: "Trunk circuits, all hubs", mono: false }
  - { label: Revision, value: "5, as at 30 APR 2008", mono: true }
  - { label: Kept by, value: "Network Operations, Communications Security (CMS/ALPHA-02)" }
  - { label: Bays, value: "HCP-A01 to HCP-A05", mono: true }
revisions:
  - { rev: "3", date: "2007-04-02", change: "Segment 04 pairs entered on completion of works.", by: "CMS/ALPHA-02" }
  - { rev: "4", date: "2007-11-19", change: "Expected losses re-entered after repeater survey.", by: "CMS/ALPHA-02" }
  - { rev: "5", date: "2008-04-30", change: "Annual check of orders of record. No change of designation.", by: "CMS/ALPHA-02" }
---

## 1. Scope

This register lists the trunk circuits between the hubs. Each rail segment in revenue service carries two voice circuits (V1, V2), one data bearer of the key distribution network (D1) and one terminated spare pair (SP1) for restoration. The circuits run on the guideway cable of the segment and terminate on the patch bay at each end. How the bays are worked is in :x[OSC-MEM-07-1186].

Network circuits (hub to directly linked sites) and site circuits are registered at each hub and are not repeated here.

## 2. Trunk circuits

::canon-table{source="apps.patch.circuits" filter="class=trunk" cols="id:Circuit,route:Route,a:End A,b:End B,kind:Type,status:Register status,order:Order of record,use:Use" caption="Trunk circuits, by segment"}

## 3. Notes

1. Orders of record are Network Operations work orders. A circuit carried on another pair under a temporary repatch keeps its own order of record; the repatch is entered in the bay log, not here.
2. Expected losses are held with the test desk and printed on the bay's test set when a tone test is run.
3. Segment 04 (:x[OSC-TRN-SEG-04]): two pairs were laid with the guideway and entered at revision 3. No circuits are assigned while the segment is not in revenue service. The pairs are open at both ends.
4. A designation strip at a bay that does not agree with this register is reported to Network Operations. Strips are not altered at the bay.
