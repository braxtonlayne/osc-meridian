---
id: assurance-ctr
route: /assurance/contractor-register
app: assurance
family: assurance
template: record
docNo: OSC-ASR-CTR
title: Contractor Register and Construction Security Protocols
marking: UMBRA-C
originator: OIA/ALPHA-01
revision: 6
date: 2008-02-12
summary: Construction security (contractor compartmentalization, cover infrastructure, audit camouflage across 127 line items) with the register of 47 primes, 390 subcontractors (mean 8.3), and the compartment matrix showing no contractor knows more than three sites.
xrefs: [OSC-LDG-REG, OSC-FAC-CLS-DELTA, OSC-ASR-COV, OSC-ASR-THR-04, OSC-ASR-CG, OSC-CNL-SEAT-10, OSC-CNL-SEAT-11, OSC-DIR-0163]
distribution:
  - Director, Office of Internal Assurance (ALPHA-01)
  - Chief Engineer, Facilities Engineering (ALPHA-02)
  - Comptroller (ALPHA-01)
  - Director, Cover Operations (ALPHA-04)
  - Facility Commanders, ALPHA and BETA sites (own site columns)
recordType: REGISTER AND PROTOCOL
fields:
  - { label: Register, value: Prime Contractor Register }
  - { label: Custodian, value: "Office of Internal Assurance (OIA/ALPHA-01)" }
  - { label: Contracting office, value: "Facilities Engineering (FE/ALPHA-02)" }
  - { label: Effective, value: 15 FEB 2008 }
  - { label: Supersedes, value: "OSC-ASR-CTR rev 5 (03 AUG 2007)" }
  - { label: Register closed for entries, value: 31 JAN 2008 }
revisions:
  - { rev: "6", date: 12 FEB 2008, change: "Annual register return. Matrix redrawn by class. Section 2.4 added (closed contracts).", by: OIA/ALPHA-01 }
  - { rev: "5", date: 03 AUG 2007, change: "Two primes added for DELTA works. Site columns for DELTA withheld by the Council.", by: OIA/ALPHA-01 }
  - { rev: "4", date: 19 JAN 2007, change: "Annual register return.", by: OIA/ALPHA-01 }
---

## 1. Purpose

1.1 This record sets out the protocols under which OSC facilities and tunnels are built and maintained by outside contractors, and holds the register of prime contractors with the compartment matrix that shows which sites each prime has been told of. It is the Office of Internal Assurance's control on the first defence recorded against outside agency discovery (:x[OSC-ASR-THR-04]).

1.2 The register is not circulated to Council seats 10 and 11, whose holders recuse on contractor register matters (:x[OSC-CNL-SEAT-10], :x[OSC-CNL-SEAT-11]).

## 2. Construction security protocols

::canon-table{source="security.construction" cols="label:Protocol,text:Provision"}

2.1 **Contractor compartmentalization.** Every prime is engaged under a Title 50 contract identified by a project number. The project number is the only identifier the firm holds for a site. Drawings are issued sheet by sheet with title blocks removed, and work packages are issued through the cover agency of the site, so that the firm's personnel are badged to the cover agency and no OSC identifier appears on any contract document. No prime is told of more than :c[contractors.maxSitesKnown] sites over the life of its contracts, including sites where its work is complete.

2.2 **Cover infrastructure.** Contractor traffic is a cover traffic. Deliveries, plant movements and contractor shifts are scheduled to the cover facility's published activity and are booked through its gate. Contractor personnel below grade are escorted throughout under :x[OSC-DIR-0163]; escorts are drawn from security forces, not from the facility's own staff.

2.3 **Audit camouflage.** Construction costs are distributed across :c[budget.lineItemCount] line items in four departments (:x[OSC-LDG-REG]). A prime is paid under the line item of the cover agency through which its work package was issued and does not see any other.

2.4 **Closed contracts.** A prime whose works are complete remains on the register. Its sites remain counted against the limit in 2.1. Its personnel remain bound by the secrecy provisions of the contract, and its records of the works are held by the firm under those provisions.

2.5 **Subcontractors.** Subcontractors are engaged by the prime and are known to the OSC through the prime's annual return only. They are told neither the end user nor the project's location beyond the delivery address supplied by the prime. A subcontractor engaged by two primes is recorded under both and counted once against each.

## 3. Register of prime contractors

3.1 Primes on the register: :c[contractors.primeCount]. Subcontractors returned by primes: 390, a mean of :c[contractors.avgSubs] per prime. Register return closed 31 JAN 2008.

::canon-table{source="contractors.register" cols="id:Prime,name:Contractor,trade:Trade,subcontractors:Subs,compartmentNote:Compartment arrangement" caption="Prime contractor register, annual return 2008"}

## 4. Compartment matrix

4.1 Each row shows the sites known to one prime, grouped by facility class. No row holds more than :c[contractors.maxSitesKnown] entries. The host site of this extract is shown; other site entries are released to holders of the network geography compartment. DELTA-class entries are withheld by the Council and are not released below Tier 1 (:x[OSC-FAC-CLS-DELTA]).

| Prime | ALPHA | BETA | GAMMA | DELTA |
|---|---|---|---|---|
| PC-01 | ALPHA-03 | :r[BETA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-02 | — | :r[BETA-04]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[GAMMA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-03 | :r[ALPHA-04]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[GAMMA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-04 | — | :r[BETA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[GAMMA-03]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-05 | — | — | :r[GAMMA-11]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-12]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[DELTA-01]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-06 | :r[ALPHA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[BETA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-07 | — | — | — | :r[DELTA-02 DELTA-09]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-08 | — | — | :r[GAMMA-04]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-09 | — | :r[BETA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[DELTA-03]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-10 | — | — | :r[GAMMA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-11 | ALPHA-03 | :r[BETA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-03]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-12 | — | :r[BETA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-04]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-13 | — | :r[BETA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-14 | — | — | :r[GAMMA-06]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-15]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-15 | — | — | — | :r[DELTA-04]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-16 | — | — | :r[GAMMA-05]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-06]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-07]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-17 | — | — | — | :r[DELTA-05]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-18 | — | — | :r[GAMMA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-19 | — | :r[BETA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[GAMMA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-20 | — | :r[BETA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[GAMMA-07]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-10]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-21 | — | — | :r[GAMMA-10]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-11]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-22 | — | — | — | :r[DELTA-04 DELTA-06 DELTA-07]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-23 | — | — | — | :r[DELTA-07 DELTA-09]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-24 | :r[ALPHA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[BETA-06]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-07]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-25 | — | — | :r[GAMMA-10]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-12]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-26 | — | :r[BETA-07]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-27 | — | — | — | :r[DELTA-03 DELTA-08]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-28 | — | — | :r[GAMMA-03]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-13]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-29 | :r[ALPHA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-30 | — | — | :r[GAMMA-14]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-31 | — | — | :r[GAMMA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-14]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[DELTA-09]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-32 | :r[ALPHA-01]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[BETA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-33 | :r[ALPHA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-34 | — | — | :r[GAMMA-15]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-35 | — | — | — | :r[DELTA-10]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-36 | — | :r[BETA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-37 | — | — | — | :r[DELTA-11]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-38 | — | — | :r[GAMMA-16]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-39 | — | :r[BETA-03]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-10]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-11]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-40 | — | — | — | :r[DELTA-11 DELTA-12]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-41 | — | :r[BETA-11]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-12]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-42 | — | :r[BETA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[GAMMA-17]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-18]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-43 | — | — | :r[GAMMA-09]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-18]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[DELTA-10]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-44 | — | :r[BETA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[BETA-12]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | — | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-45 | — | — | :r[GAMMA-08]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} :r[GAMMA-17]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-46 | — | — | :r[GAMMA-02]{compartment=SEXTANT auth="OIA" ref="OIA-PROT-04"} | :r[nil]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |
| PC-47 | — | — | — | :r[DELTA-02 DELTA-11]{tier=1 auth="COUNCIL" ref="CC-ART-IV"} |

4.2 Every facility is known to at least one prime. Where a facility needed more than one prime, each was given its own project number for the site, so that no prime can tell from its contract documents that another firm is working there.

## 5. Assurance checks

| Check | Frequency | Office | Last completed |
|---|---|---|---|
| Annual register return from each prime (subcontractors, personnel, sites) | Annual, by 31 JAN | Facilities Engineering, Office of Internal Assurance | 31 JAN 2008 |
| Matrix check: sites per prime against the limit | On every new work package | Office of Internal Assurance | 22 JAN 2008 |
| Badge reconciliation, contractor personnel at each cover gate | Quarterly | Security Forces Command | 31 DEC 2007 |
| Drawing return: issued sheets returned or certified destroyed | On completion of each package | Facilities Engineering | Continuous |
| Invoice path: payment only under the issuing cover agency's line item | Each invoice | Comptroller | Continuous |

5.1 A prime that asks about another site, uses a site name, or returns a subcontractor known to be engaged at another site under a different prime is reported to the Office of Internal Assurance. The report is assessed under :x[OSC-ASR-THR-04].

5.2 Markings and withholding authorities follow :x[OSC-ASR-CG].

Certified 12 FEB 2008, C. Brandauer, Director, Office of Internal Assurance. Contracting office coordination, I. Lockhart, Chief Engineer, Facilities Engineering.
