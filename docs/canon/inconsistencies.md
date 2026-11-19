# Internal inconsistencies in the source

Every inconsistency the canon extractor found in `lore/source-facility-inventory.html`, with the numbers. **None is corrected in canon.** Canon carries the source figures as written; the ones worth surfacing in-world are also in `canon.anomalies` (ids in brackets). Positions used for geographic checks are the computed ones in `canon.json` (see docs/CANON.md, "Merge and derivation").

## A. The five brief discrepancies

1. **Staff: tiers vs facilities** [UNPOSTED_790]. Tier totals 11 + 247 + 1,891 + 1,698 = 3,847. Facility staff ALPHA 1,417 + BETA 1,206 + GAMMA 413 + DELTA 21 = 3,057. Difference 790.
2. **Tunnel mileage** [TUNNEL_847]. Certified 847 mi. Rail segments sum to 6,074 mi; tram network totals sum to 10,538 mi (equal to the 27 listed links). Engineering total 16,612 mi, 19.6 times the certified figure. 847 is shorter than segment 02 alone (1,544 mi).
3. **Capacity** [CAPACITY_23400]. "Total personnel capacity" 23,400. Class capacities 16,000 + 10,780 + 6,940 + 980 = 34,700 (11,300 more).
4. **Segment 04** [SEGMENT_04]. ALPHA-02 ↔ ALPHA-05, 891 mi, 5.0 h, completed Mar 2007, is in the segment table. ALPHA-02 lists "ALPHA-01, ALPHA-04"; ALPHA-05 lists "ALPHA-01, ALPHA-03". Every other segment appears in both endpoint lists.
5. **Electronic copies** [ELECTRONIC_COPY]. "11 copies — physical only, no electronic copies permitted", yet the document exists as a file (the source's own terminal header names it FACILITY-INVENTORY-2008-Q2.DAT, decrypted at a terminal).

## B. Arithmetic

6. **Meals** [MEALS_RATION]. 47,000,000 meals / (23,400 persons × 5.5 years × 365.25 days) = 1.00 meal per person per day. At 3 meals a day the stock lasts 670 days (1.83 years).
7. **Small arms** [ARMS_RESERVE]. "68,000 weapons — full capacity + 400% reserve" = 5 weapons per position, so 13,600 positions. At 23,400 the figure would be 117,000; at 34,700, 173,500.
8. **Utilization bases** [UTILIZATION_BASIS]. 16.4% = 3,847 / 23,400 (tier total over sustained capacity, 16.44%). Every site and class percentage is posted staff over that site's berthing: ALPHA-01 287/4,500 = 6.4%, BETA 1,206/10,780 = 11.2%, GAMMA 413/6,940 = 6.0%. On a single basis the network is 3,057/34,700 = 8.8%, or 3,057/23,400 = 13.1%, or 3,847/34,700 = 11.1%.
9. **7:1 support-to-command** [SUPPORT_RATIO]. ALPHA command lines 42 + 38 + 22 + 19 + 41 = 162 against 1,255 others = 7.7:1 (by site: 5.8, 9.8, 8.0, 8.3, 7.4). Network (Tiers 3 + 4) / (Tiers 1 + 2) = 3,589 / 258 = 13.9:1. Ratio model (8% command) = 11.5:1.
10. **Phase targets.** 40% × 23,400 = 9,360 and 75% × 23,400 = 17,550 agree with the source, so targets use sustained capacity, while facility percentages use berthing (item 8). Reaching 9,360 by 2012 needs 5,513 more people (1,378 a year); the Phase 4 Tier 3 recruitment target is 800 a year, so the rest must come from other tiers (not stated).
11. **Contractors.** 47 primes × 8.3 subcontractors = 390.1; the true total must be 390 (mean 8.298, rounds to 8.3). Consistent after rounding.
12. **Percentages that check out** (recorded so nobody "fixes" them): ALPHA site percentages 6.4 / 12.9 / 7.1 / 7.3 / 11.1; BETA 11.2; GAMMA 6.0; budget categories 49.5 / 31.0 / 11.8 / 4.9 / 2.8 sum to 100.0 and match $142B/$89B/$34B/$14B/$8B of $287B to one decimal; funding sources sum to 100%; ratio model sums to 100% and every count = pct × 4,500; ALPHA breakdowns sum to staff; BETA and GAMMA row sums equal the stated totals (10,780 / 1,206 and 6,940 / 413); tier compositions sum to tier counts; phase cumulatives 347 + 1,823 = 2,170 and + 1,677 = 3,847.

## C. Transit

13. **Rail times vs 180 mph.** Five of six segments round correctly. Segment 01: 387 / 180 = 2.15 h, stated 2.1 (implied 184 mph); half-up rounding gives 2.2. Implied speeds: 184, 180, 178, 178, 181, 179 mph.
14. **Tram times vs 90 mph.** All 27 links agree to within ±0.05 h. No inconsistency.
15. **Network totals vs links.** Eastern 1,858, Southern 3,507, Mountain/Western 3,691, Central 1,482: each equals its link sum. No inconsistency.
16. **Tram links shorter than the straight line** [TRAM_GEOMETRY]. 17 of 27 tram links are shorter than the great-circle distance between their computed end points. Worst: BETA-02 → GAMMA-03 97 mi vs 201 mi; BETA-02 → GAMMA-04 156 vs 256; BETA-05 → GAMMA-10 189 vs 282; BETA-10 → GAMMA-07 189 vs 277; BETA-09 → GAMMA-17 412 vs 525; BETA-09 → GAMMA-10 267 vs 349; ALPHA-01 → BETA-01 527 vs 601; BETA-03 → GAMMA-06 523 vs 583; ALPHA-05 → BETA-12 438 vs 480; BETA-11 → GAMMA-14 287 vs 323; BETA-08 → GAMMA-11 223 vs 250; ALPHA-05 → BETA-03 792 vs 841; ALPHA-03 → BETA-09 614 vs 652; ALPHA-02 → BETA-04 713 vs 735; ALPHA-04 → GAMMA-12 198 vs 217; BETA-12 → GAMMA-16 412 vs 428; ALPHA-05 → BETA-05 647 vs 660. (The last three are within or near the anchor uncertainty.) The stated lengths come from the lore source and anchors, so they are canon and are not corrected; canon-merge prints them as an info line, not a warning. In-world reading: a stated tunnel length is the route-miles figure as returned by the engineering office, not a survey distance. All six rail segments are longer than the straight line (route factor 1.02 to 1.17).
17. **"Tram (ALPHA-to-BETA)".** Tech table and section heading say trams run ALPHA to BETA, but three links run ALPHA straight to GAMMA (ALPHA-05 → GAMMA-08, ALPHA-05 → GAMMA-09, ALPHA-04 → GAMMA-12) and twelve run BETA to GAMMA.
18. **"Local" Alpha.** BETA class: "Tram connections to local Alpha facility". BETA-03 (Atlanta) links to ALPHA-05 in Texas (792 mi), not ALPHA-01; BETA-10 (Chicago) to ALPHA-01 (671 mi), not ALPHA-03; BETA-09 (Omaha) to ALPHA-03 in Kentucky (614 mi), not ALPHA-02 in Colorado; BETA-04 (Minneapolis) to ALPHA-02 (713 mi).
19. **Cross-network link.** BETA-05 is a Southern Network site (fed from ALPHA-05) but its link to GAMMA-10 (189 mi) is counted in the Central Network total. GAMMA-10 is the only site fed twice.
20. **Repeated mileages.** 412 mi appears twice (BETA-12 → GAMMA-16, BETA-09 → GAMMA-17), as do 267 (BETA-09 → GAMMA-10, ALPHA-05 → GAMMA-08) and 189 (BETA-10 → GAMMA-07, BETA-05 → GAMMA-10), each with identical times. Possible transcription.
21. **Twelve primary hubs** [HUBS_12]. Executive summary: network connects "12 primary hub installations". Only the five ALPHA sites are called hubs; 12 is the BETA count; tunnel-connected ALPHA + BETA = 17.
22. **Hub naming.** ALPHA-03 is "Secondary hub for Central Network" but the Central Network has no other hub ("ALPHA-03 Hub"). ALPHA-04 is "Terminal hub for Western Network"; the network is named "Mountain/Western".
23. **Tunnel depth vs site depth.** Tunnels average 600–1,200 ft below surface; GAMMA sites are 150–500 ft and BETA 400–800 ft, so most tram termini are shallower than the tunnels serving them.
24. **GAMMA "No rail connections"** while 14 of 18 GAMMA sites have tram links (true only if tram is not rail; the network is described as "rail and tram tunnels"). GAMMA-01, -02, -15, -18 have no link at all.

## D. Dates and phases

25. **Phase 2 "ALPHA facilities brought to completion" (2004–2006)**, but ALPHA-01 completed November 2003 (Phase 1).
26. **Phase 2 "Primary rail network construction" (2004–2006)**, but segments 06 (Feb 2007) and 04 (Mar 2007) completed in Phase 3; tunnelling ran 2002–2007, starting in Phase 1, which lists no tunnelling.
27. **Rail topology chart "UPDATED 2007-Q4"** in a 2008-Q2 revision; harmless but carried.

## E. Sustainability

28. **NBC seal vs class windows.** "All facilities NBC-rated with 180-day seal capability" and "Diesel generator backup: 180-day runtime all facilities", but DELTA has a 72-hour sustainability maximum and is surface or minimal depth, and GAMMA's window starts at 90 days.
29. **Food vs ALPHA windows.** Network food stocks claim 5.5 years at 23,400; ALPHA sustained windows are 12–18 months. Different bases, not reconciled. Pharmaceutical supply 8 years.
30. **47 operating rooms network-wide** equals the facility count, which would put an operating room in every DELTA safe house.

## F. Personnel categories

31. **Categories with no tier.** Military Operations (ALPHA-02 124, ALPHA-05 89) and Data/Records Mgmt. (ALPHA-03 47) appear in facility breakdowns but in no tier composition. Communications specialists (Tier 3, 185) and the ratio model's Communications 5% appear in no facility breakdown. ALPHA-01, the ratio model's basis, has no Military Operations line although the model gives it 12%.

## G. Budget and funding

32. **Departments vs funding sources.** Line items span DOD, DOE, DHS and FEMA, but no funding source is DHS; FEMA is listed apart from DHS although it was part of DHS from March 2003 (extender B's budget notes give the in-world explanation).

## H. Real-world geography and records (external checks, from general knowledge; not verified against a source in this build)

33. **ALPHA-01**: 18 mi SE of Mount Weather lands near Ashburn/Leesburg in the Loudoun piedmont, east of the Blue Ridge, not in it.
34. **ALPHA-02**: 31 mi NW of Denver is the Boulder-area Front Range, about 90 mi from Cheyenne Mountain (NORAD), so "expanded NORAD infrastructure" is a cover claim, not geography.
35. **ALPHA-04**: 44 mi E of Reno is near Fernley in the Lahontan valley; the Carson Range lies west and south-west of Reno.
36. **BETA-08**: 28 mi NE of Las Vegas; the Nevada Test Site is about 65 mi NW, so "Nuclear Test Site Support" is on the wrong side of the city.
37. **Executive Order 13201** (signed February 2001) concerns notice of employee rights on union dues, and construction "initiated January 2001" predates it. Extender B's realEvents RE-01 adopts this as an unpublished annex.
