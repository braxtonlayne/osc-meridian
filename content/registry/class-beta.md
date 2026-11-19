---
id: registry-class-beta
route: /registry/class/beta
app: registry
family: registry
template: index
docNo: OSC-FAC-CLS-BETA
title: "Facility Class Standard: BETA (Regional Operations Centers)"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 7
date: 2008-04-30
summary: "Class standard for the twelve Regional Operations Centers: 400 to 800 ft, limited long-term sustainability, tram connections \"to local Alpha facility\"."
distribution:
  - Chief Engineer, Facilities Engineering (FE/ALPHA-02)
  - Facility Commanders, BETA-01 to BETA-12
  - Director, Transit Operations (TO/ALPHA-01)
  - Director, Intelligence & Analysis (IAD/ALPHA-01)
  - Director, Cover Operations (CVO/ALPHA-04)
  - Registry file copy (RD/ALPHA-03)
xrefs:
  - OSC-FAC-IDX
  - OSC-RSV-ENERGY
  - OSC-TRN-NET-CEN
entries:
  - { docNo: OSC-FAC-BETA-01, title: "Facility Dossier: BETA-01 (EPA Monitoring Station)", route: /registry/facility/beta-01, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-02, title: "Facility Dossier: BETA-02 (Natural Gas Reserve Facility)", route: /registry/facility/beta-02, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-03, title: "Facility Dossier: BETA-03 (CDC Secondary Research Complex)", route: /registry/facility/beta-03, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-04, title: "Facility Dossier: BETA-04 (Agricultural Research Station)", route: /registry/facility/beta-04, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-05, title: "Facility Dossier: BETA-05 (FAA Regional Training Center)", route: /registry/facility/beta-05, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-06, title: "Facility Dossier: BETA-06 (DOE Solar Research Facility)", route: /registry/facility/beta-06, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-07, title: "Facility Dossier: BETA-07 (USGS Seismology Center)", route: /registry/facility/beta-07, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-08, title: "Facility Dossier: BETA-08 (Nuclear Test Site Support)", route: /registry/facility/beta-08, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-09, title: "Facility Dossier: BETA-09 (STRATCOM Auxiliary Facility)", route: /registry/facility/beta-09, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-10, title: "Facility Dossier: BETA-10 (DHS Regional Response Center)", route: /registry/facility/beta-10, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-11, title: "Facility Dossier: BETA-11 (BLM Resource Management)", route: /registry/facility/beta-11, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
  - { docNo: OSC-FAC-BETA-12, title: "Facility Dossier: BETA-12 (FEMA Hurricane Continuity Site)", route: /registry/facility/beta-12, date: 2008-04-30, marking: UMBRA-C, note: Rev 6 }
revisions:
  - { rev: 7, date: 2008-04-30, change: "Site returns for pay run 30 APR 2008 entered. BETA-12 moved from 'under construction' to the site table. Para 7 added.", by: FE/ALPHA-02 }
  - { rev: 6, date: 2007-10-31, change: "BETA-07 completion entered. Para 5.2 (watch patterns) reworded.", by: FE/ALPHA-02 }
  - { rev: 5, date: 2007-04-30, change: "Staffing standard aligned with the regional analysis cell establishment issued by IAD.", by: FE/ALPHA-02 }
---

This standard defines the BETA facility class and lists the installations carried in it. It is issued by Facilities Engineering as engineering authority for all facilities. Site particulars are held in the facility dossiers listed at the end of this standard; where a dossier and this standard differ, the dossier governs for that site and the difference is reported on the next site return.

## 1. Class definition

BETA installations are designated **:c[classes.BETA.name]**. A facility is carried in the class when it meets the following criteria, which are taken from the Facility Inventory without amendment:

| Criterion | Inventory wording |
|---|---|
| Depth | Medium-depth installations: :c[classes.BETA.depthText] |
| Role | Regional coordination and intelligence fusion |
| Transit | :c[classes.BETA.transitEntitlement] |
| Sustainability | :c[classes.BETA.sustainabilityText] |

The class is closed at :c[classes.BETA.count] installations. A BETA installation is not a hub and is not given inter-hub rail platforms.

## 2. Depth and construction

Depth is measured to the floor of the lowest occupied level, which at every BETA site is the tram platform level. The band is :c[classes.BETA.depthMinFt] to :c[classes.BETA.depthMaxFt] ft. Running tunnels approach the platform level on a rising grade where the tunnel is deeper than the station; the grade is given on the network sheets and not in this standard.

Each installation is built beneath an authentic government surface facility which accounts for the movement of cleared personnel and materiel at the site. The surface facility is operated by its own agency and staffed by that agency's employees, who are not briefed on the installation. Prepared cover stories are held in the cover identity catalogue (Cover Operations, ALPHA-04).

## 3. Transit entitlement

:c[classes.BETA.transitEntitlement]. One inbound tram link per installation. A BETA installation may in addition feed one or two GAMMA shelters; the outbound links are allocated by Transit Operations and are not an entitlement of the class.

Service to the BETA installation fed from ALPHA-03 is given on :x[OSC-TRN-NET-CEN]. Network sheets for the other links are listed on each dossier.

## 4. Berthing and posted strength

| Measure | Class figure |
|---|---|
| Installations | :c[classes.BETA.count] |
| Class berthing (surge) | :c[classes.BETA.statedCapacity] |
| Class posted strength, 30 APR 2008 | :c[classes.BETA.statedStaff] |

Berthing is surge berthing, the physical count of berths. It is not supported by reserves at full occupancy. Posted strength is the sum of the site returns and excludes personnel carried centrally. The class register for the network is :x[OSC-FAC-IDX].

## 5. Staffing standard

5.1 Every BETA installation carries these lines: Command Staff; Intelligence/Analysis (the regional analysis cell, established by Intelligence & Analysis); Security Forces (post orders from Security Forces Command); Technical/Engineering; Communications; Medical; Logistics/Support.

5.2 Watch pattern: four watches on the operations floor where Intelligence/Analysis strength permits, otherwise three, or two day-weighted watches with a reduced night watch. The pattern is set by the commander and reported on the site return.

5.3 Additional lines are established at individual sites for regional tasks (industrial continuity planning, biomedical research and laboratory containment, logistics and supply, transit operations, technology sector liaison, weapons oversight, military operations, reactor operations). These lines are recorded in the dossiers only.

5.4 Facility commanders are Tier 2. Each analysis cell contributes to the daily continuity summary at a time set by Intelligence & Analysis.

## 6. Site table

Berthing and posted strength are released for every BETA installation. Location, cover and connection are released at Tier 3 for BETA-09 only, to readers posted at ALPHA-03.

::canon-table{source="facilities" class="BETA" cols="id:Site,capacity:Berthing,staff:Posted staff,depthFt:Depth (ft)" caption="BETA installations as at 30 APR 2008"}

| Site | Location | Cover identity | Adjacent hub |
|---|---|---|---|
| BETA-09 | :c[facilities.BETA-09.locationText] | :c[facilities.BETA-09.coverIdentity] | ALPHA-03 |

:::redact{compartment=SEXTANT auth="TO" ref="OSC-CB-013"}
::canon-table{source="facilities" class="BETA" cols="id:Site,locationText:Location,coverIdentity:Cover identity,network:Network" caption="BETA locations and cover identities"}

::canon-table{source="tramNetworks.links" filter="kind=BETA" cols="from:Hub,to:Site,label:Link,miles:Miles,hours:Running time (h)" caption="BETA inbound tram links"}
:::

## 7. Power

7.1 The class standard is utility supply with diesel backup sized to the network standard of :c[reserves.items.ENERGY-DIESEL.value] days' runtime. Surface renewables at the cover facility may contribute where the cover's own plant allows.

7.2 On-site generation additional to the class standard is fitted at certain BETA installations whose load cannot depend on the grid or on diesel alone. Site allocation is not given in this standard. Plant particulars are on :x[OSC-RSV-ENERGY].

:::redact{compartment=TALLOW auth="LR" ref="OSC-CB-014"}
7.3 On-site generation is fitted at :c[reactors.RX-B03.site] (:c[reactors.RX-B03.id], :c[reactors.RX-B03.designation]), :c[reactors.RX-B08.site] (:c[reactors.RX-B08.id], :c[reactors.RX-B08.designation]) and :c[reactors.RX-B09.site] (:c[reactors.RX-B09.id], :c[reactors.RX-B09.designation]). The units are of the Regional Continuity Power Unit type with a transportable core module, so that refuelling is a module exchange carried out by tram or by road under the cover. Selection rested on load: containment laboratories at BETA-03, backup command and communications at BETA-09, and at BETA-08 the cover already accounts for radiological traffic. The largest BETA command was considered and not selected, its cover already justifying a large diesel plant.
:::

## 8. Dossiers in this class
