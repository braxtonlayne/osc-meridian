---
id: transit-engineering
route: /transit/engineering
app: transit
family: transit
template: record
docNo: OSC-TRN-ENG
title: "Tunnel Engineering Summary: Lengths, Depths and Environmental Data"
marking: UMBRA-C
originator: FE/ALPHA-02
revision: 5
date: 2008-04-07
summary: Facilities Engineering summary of tunnel engineering lengths for the six rail segments and four tram networks, depth bands, hardening, TBM construction 2002 to 2007 and its cover classification, with tunnel environmental data by block.
xrefs: [OSC-MEM-07-0944, OSC-TRN-SEG-04, OSC-SYS-GLO, OSC-TRN-SEG-01, OSC-TRN-SEG-02, OSC-TRN-SEG-03, OSC-TRN-SEG-05, OSC-TRN-SEG-06, OSC-TRN-NET-EAS, OSC-TRN-NET-SOU, OSC-TRN-NET-MTW, OSC-TRN-NET-CEN, OSC-LDG-CAT-TRANSIT]
distribution:
  - Director, Transit Operations
  - Comptroller (Transit Accounts)
  - Network Control, ALPHA-01
  - Transit Control desks, ALPHA-02 and ALPHA-05
  - Tunnel maintenance depots, ALPHA-02 and ALPHA-04
  - Facilities Engineering file FE/TS/00
recordType: ENGINEERING SUMMARY
fields:
  - { label: Prepared by, value: "Tunnel Structures Section, Facilities Engineering, ALPHA-02" }
  - { label: Basis, value: "Alignment and link survey; segment and network sheets" }
  - { label: Review, value: "Annual, and on any change to a segment or network sheet" }
  - { label: Environmental annex, value: "Annex C, generated from tunnel telemetry" }
  - { label: File, value: "FE/TS/00", mono: true }
revisions:
  - { rev: "3", date: "2007-04-02", change: "Segment 04 added on completion. Segment 06 added.", by: "FE/ALPHA-02" }
  - { rev: "4", date: "2007-11-06", change: "Lengths restated for the FY2008 cost tables (OSC-MEM-07-0944).", by: "FE/ALPHA-02" }
  - { rev: "5", date: "2008-04-07", change: "Annual review. Annex C extended to all segments including standby.", by: "FE/ALPHA-02" }
---

## 1. Scope

This summary gives the engineering lengths of the inter-hub rail segments and the regional tram networks, their depth, hardening and construction, and the environmental data recorded in the tunnels. It is compiled from the six segment engineering sheets and the four network sheets. Where a figure here differs from a sheet, the sheet governs and this summary is corrected at the next revision.

Engineering lengths are measured along the running line by alignment and link survey. They are the lengths used for maintenance planning, possession planning, traction power rating, ventilation design and the Network Control board.

## 2. Rail segments

::canon-table{source="railSegments" cols="no:Seg,a:From,b:To,routeNote:Route,miles:Engineering miles,hours:Running time (h),completed:Completed,status:Status" caption="Inter-hub rail segments"}

| Rail total | Miles |
|---|---|
| Total, six segments, engineering | :c[headline.railEngineeringMi] |

System :c[transitTech.railSystem], line speed basis :c[transitTech.railSpeed]. Sheets: :x[OSC-TRN-SEG-01], :x[OSC-TRN-SEG-02], :x[OSC-TRN-SEG-03], :x[OSC-TRN-SEG-04], :x[OSC-TRN-SEG-05], :x[OSC-TRN-SEG-06].

## 3. Tram networks

::canon-table{source="tramNetworks" cols="name:Network,hubs:Hub(s),statedTotalMi:Engineering miles" caption="Regional tram networks, network totals"}

| Tram totals | Miles |
|---|---|
| Total, four networks, engineering | :c[headline.tramEngineeringMi] |
| Sum of listed links, all networks | :c[headline.tramLinkSumMi] |

The network totals and the link sum agree. System :c[transitTech.tramSystem], speed basis :c[transitTech.tramSpeed]. Sheets: :x[OSC-TRN-NET-EAS], :x[OSC-TRN-NET-SOU], :x[OSC-TRN-NET-MTW], :x[OSC-TRN-NET-CEN].

| Engineering total | Miles |
|---|---|
| Total, rail and tram, engineering | :c[anomalies.TUNNEL_847.figures.engineeringTotalMi] |

## 4. Note on reporting figures

Certified mileage (:c[headline.tunnelCertifiedMi]) is a Council reporting figure and is not derived from this table. It is prepared and returned by Transit Operations. This office has not been asked to reconcile the two and does not do so. The return comprises five tram links :r[ALPHA-01 to BETA-02, BETA-02 to GAMMA-03, BETA-02 to GAMMA-04, BETA-10 to GAMMA-07 and ALPHA-05 to GAMMA-09]{compartment=SEXTANT auth="TO" ref="TO-07-313"} accepted by witnessed run before the first cut-off date of the return. No inter-hub rail segment is included in it.

Cost tables prepared by the Comptroller use the figures in sections 2 and 3, as restated in :x[OSC-MEM-07-0944]. Definitions are in the glossary, :x[OSC-SYS-GLO], under CERTIFIED MILEAGE (:c[headline.tunnelCertifiedMi]) and ENGINEERING MILEAGE.

## 5. Depth

Network depth band: :c[transitTech.averageDepth]. Depth is measured from ground surface to guideway or track level. Mean depth is the length-weighted mean over the segment or network; portal and hub approaches are included.

| Line | Mean depth (ft) | Greatest depth (ft) | Shallowest running depth (ft) |
|---|---|---|---|
| Segment 01 | 1,140 | 2,050 (ALPHA-01 approach) | 800 |
| Segment 02 | 980 | 2,050 (ALPHA-01 approach) | 610 |
| Segment 03 | 1,190 | 2,240 (plateau summit) | 720 |
| Segment 04 | 870 | 1,820 (ALPHA-02 approach) | 640 |
| Segment 05 | 1,020 | 1,610 (embayment) | 690 |
| Segment 06 | 940 | 2,050 (ALPHA-01 approach) | 600 |
| Tram networks (all) | 650 to 780 | 1,350 (hub approaches) | 160 (termini) |

Tram termini at shallower stations rise to platform level on the final mile of each link. Depth at a terminus is the station's depth, not the tunnel band.

## 6. Hardening

All running tunnels: :c[transitTech.hardening]. Portal seal doors at every hub and station portal close on a SEALED facility state and are interlocked with the signals. Seismic isolation is fitted at fault crossings on Segments 01 and 03 and on four Mountain/Western tram links. Traction power and detection cabling is screened and surge-protected at every shaft.

## 7. Construction

:c[transitTech.construction]. During construction the works were classified as :c[transitTech.constructionCover]. Shaft headworks and spoil sites are still maintained under those descriptions or under the cover agency of the nearest facility.

| Item | Rail | Tram |
|---|---|---|
| Machines used | 19 TBMs (14 rail diameter, 5 reconfigured for tram) | 23 TBMs (including the 5 reconfigured) |
| Drives | 2002 to 2007 | 2003 to 2007 |
| Spoil disposal | By conveyor to shaft and road haul to registered fill sites | Same; two sites by rail spur |
| Lining | Precast segmental, bolted, gasketed | Precast segmental |
| Retired plant still in tunnel | Spoil conveyor structure, ALPHA-04 crossover cavern (removal in hand) | None |

Funding lines for construction are given in :x[OSC-LDG-CAT-TRANSIT].

## Annex C. Tunnel environmental readings (selected blocks)

Generated from tunnel telemetry. Extract run 15 MAY 2008 0600Z (0200 EDT). Readings are hourly means at the block's mid-point sensor unless a sensor at a portal is shown. Normal range for a running tunnel with ventilation in service: CO2 400 to 600 ppm, temperature 61 to 68 F, RH 40 to 65%.

:::redact{compartment=KESTREL auth="FE" ref="FE-06-0311"}
| Block | Date | Interval (Z) | CO2 ppm (mean / peak) | Temp F | RH % | Vent mode | Annotation |
|---|---|---|---|---|---|---|---|
| 01-03 | 13 MAY 2008 | 2100-2300 | 470 / 520 | 64.1 | 58 | Normal | |
| 02-11 (M02) | 13 MAY 2008 | 2100-2300 | 510 / 590 | 65.0 | 55 | Normal | Crew relief |
| 03-07 | 13 MAY 2008 | 2100-2300 | 440 / 460 | 63.2 | 41 | Normal | |
| 04-01 (ALPHA-05 portal) | 12 MAY 2008 | 2100-2300 | 430 / 440 | 62.0 | 47 | Standby | |
| 04-01 (ALPHA-05 portal) | 13 MAY 2008 | 2100-2300 | 940 / 1,310 | 65.4 | 52 | Standby | possession |
| 04-02 | 13 MAY 2008 | 2100-2300 | 880 / 1,240 | 65.1 | 51 | Standby | possession |
| 04-12 (ALPHA-02 portal) | 13 MAY 2008 | 2100-2300 | 420 / 430 | 60.8 | 38 | Standby | |
| 04-01 (ALPHA-05 portal) | 14 MAY 2008 | 0100-0300 | 520 / 560 | 63.0 | 49 | Standby | |
| 05-07 | 13 MAY 2008 | 2100-2300 | 490 / 540 | 66.3 | 63 | Normal | Pumps P05-1 to P05-6 |
| 06-10 | 13 MAY 2008 | 2100-2300 | 450 / 480 | 64.7 | 50 | Normal | |

Segment 04 ventilation is at standby (shafts run 2 hours weekly, Sundays). Readings on standby segments are not alarmed.
:::

Signed for Facilities Engineering:

I. Lockhart, Chief Engineer, Facilities Engineering, ALPHA-02. 07 APR 2008.
