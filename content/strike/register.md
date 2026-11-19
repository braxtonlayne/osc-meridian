---
id: strike-register
route: /strike/register
app: strike
family: strike
template: memo
docNo: OSC-MEM-08-0166
title: "PM-3 Planning Register: Entry, Withdrawal and Review"
marking: UMBRA-C
originator: OCP/ALPHA-01
revision: 1
date: 2008-04-02
summary: Operations and Continuity Planning sets out who may enter estimates in the PM-3 planning register, how entries are withdrawn, and the review of the register by the Office of Internal Assurance.
distribution:
  - PM-3 workstation users (pm3.users@a01.ocp.mer)
  - Deputy Commanders, ALPHA sites
  - Office of Internal Assurance (OIA/ALPHA-01)
  - Network Operations, CMS (for the register link)
xrefs: [OSC-MEM-07-0312, OSC-DIR-0301, OSC-DIR-0378, OSC-DIR-0247]
memo: &tpl
  letterhead:
    - OPERATIONS AND CONTINUITY PLANNING
    - Intelligence & Analysis
    - ALPHA-01
  memoFor: ["PM-3 workstation users"]
  from: Operations and Continuity Planning (OCP), Intelligence & Analysis
  subject: "PM-3 Planning Register: Entry, Withdrawal and Review"
  references:
    - OSC-MEM-07-0312, Planning Model PM-3, Method and Operating Notes, Rev 2
    - OSC-DIR-0378, Security Incidents, Self-Reporting and Inquiries
  signature: { name: "Operations and Continuity Planning", title: "Intelligence & Analysis, ALPHA-01" }
  routing:
    - { office: "OCP Planning Cell", action: "Originator", initials: "OCP", date: "2008-04-02" }
    - { office: "Office of Internal Assurance", action: "Coord", initials: "HV", date: "2008-04-01" }
<<: *tpl
---

1. **Purpose.** The planning register holds the PM-3 estimates that planning cells keep. It is held by this office at ALPHA-01 and reached from the Survivability Estimator on any MERIDIAN workstation that carries it. The model itself is described in :x[OSC-MEM-07-0312]. It remains a SIMPLIFIED PLANNING MODEL, NOT FOR ENGINEERING USE, and an entry in the register does not make an estimate any more than that.

2. **Who may enter.** Planning and records staff at Tier 3 and above may run the estimator and enter estimates. The estimator is not issued on Tier 4 workstation profiles (:x[OSC-DIR-0301]). Staff on probationary transfer may make entries; the first entry made by an operator on probation is copied to the Office of Internal Assurance as a matter of routine (:x[OSC-DIR-0247]).

3. **Making an entry.** Run the estimate, then select Enter in register. The register records the operator id, the point as given, the yield step, the time, the number of installations evaluated and affected, and the worst condition read, exactly as they stood on the operator's screen. A remark may be added. The estimate must be run again if the point or yield has been changed since the last run.

4. **Own installation.** Planning against an operator's own installation is reserved to the planning cell of its site command. An entry whose outer contour includes the installation of the operator who made it is referred to the Office of Internal Assurance, which may ask the operator to state the purpose of the entry. A reply is not required unless asked for.

5. **Withdrawal.** Entries are not deleted. The operator who made an entry may withdraw it from the Register view; it remains in the register marked WITHDRAWN with the time of withdrawal. No other operator can withdraw it.

6. **Review.** The Office of Internal Assurance reviews every entry and may run any of them again. Review runs are recorded in the reviewing workstation's audit trail and are not entered in the register. Where the office raises a review query on an entry, the register shows QUERY and the query reference, and a notice is routed to the operator who made the entry. Queries are handled under :x[OSC-DIR-0378].

7. **Register link.** The register is written over the hub circuits to ALPHA-01. While hub circuits are down, entries and withdrawals cannot be made from other sites; the estimate on screen is not affected and may be printed. At ALPHA-01 the register is local.

8. **Printing.** An entry may be printed as a planning estimate sheet. The sheet is re-read at the printing workstation, so a GAMMA depth may print differently at a different tier (:x[OSC-MEM-07-0312] para 6). Every sheet carries the caveat and the model disclaimer.
