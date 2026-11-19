---
id: isolate-procedure
route: /isolate/procedure
app: isolate
family: isolate
template: directive
docNo: OSC-DIR-0507
title: Network Isolation, Manual Initiate (Control HS-0001)
marking: UMBRA-R
originator: CMS/ALPHA-02
revision: 2
date: 2008-02-04
xrefs: [OSC-DIR-0447, OSC-DIR-0378, OSC-DIR-0301, OSC-MEM-07-0233]
summary: Operation of the covered manual-initiate control HS-0001 that isolates the key distribution network, its escalation, the tamper seal, and restoration of hub circuits by Circuit Restoration Certificate.
distribution:
  - Assigned operator, workstation A03-5-114
  - Command sections, ALPHA-02 and ALPHA-03
  - Network Operations, Communications Security, ALPHA-02
  - Resident Assurance Officer, ALPHA-03
effective: "2008-02-11"
opr: CMS/ALPHA-02
category: Communications
directive:
  directiveNo: OSC-DIR-0507
  effective: "2008-02-11"
  opr: CMS/ALPHA-02 (Network Operations)
  supersedes: "OSC-DIR-0507 Revision 1, 05 MAR 2007"
  reviewDate: "2009-02-04"
  category: Communications
revisions:
  - { rev: 1, date: "2007-03-05", change: "First issue on fitting of control HS-0001.", by: "CMS/ALPHA-02" }
  - { rev: 2, date: "2008-02-04", change: "Tamper seal (para 5.3). Certifying officer named (para 6.2). Para 5.4 added.", by: "CMS/ALPHA-02" }
---

## Purpose

This directive sets out how control HS-0001, Network Isolation, Manual Initiate, is operated; what follows each operation; and how hub circuits are restored afterwards.

## Applicability

This directive applies to the assigned operator of workstation A03-5-114, ALPHA-03, to command officers of ALPHA-02 and ALPHA-03, to Network Operations, Communications Security, and to the Office of Internal Assurance.

Control HS-0001 is fitted at workstation A03-5-114 because the Accessions and Review Branch reading room on Level 5 is the nearest continuously staffed position to the ALPHA-03 switch room. The fitting confers no communications duty on the Records Division. The assigned operator is not trained on the control and is not expected to operate it.

## Description of the control

1.1 The control is a red actuator under a hinged guard cover, with a hold bar, an annunciator, an operations counter and five escalation lamps. It is a remote panel of the key distribution network switch at ALPHA-02 (:x[OSC-DIR-0447]).

1.2 When the actuator is held for the full hold period, the switch drops every remote hub circuit at once. Every remote hub is then shown DOWN in the MERIDIAN notification area, and a notice line appears under the classification banner of every workstation on the network.

1.3 Rail and tram movements hold at the next station while the circuits are down. Patch circuits between sites are dead. Telephone calls beyond the local hub are refused by the switch.

> **WARNING.** There is no test position. The control is not exercised, demonstrated or "tried". Every completed hold is an initiation and is recorded as one.

> **WARNING.** The isolation is not confined to the workstation, the site or the account in use. It applies to the whole network and to every user of it.

> **CAUTION.** Releasing the actuator before the hold bar is full has no effect on the circuits. The release is recorded in the workstation audit trail.

## Operation

3.1 The control may be operated by the assigned operator of workstation A03-5-114, or by a command officer of ALPHA-02 or ALPHA-03, on the instruction of the duty officer, or without instruction where the integrity of the key distribution network is in immediate doubt and the duty officer cannot be reached.

3.2 Doubt about whether to operate the control is resolved by not operating it.

3.3 An operator who operates the control in error does not attempt to correct the error at the control. A second actuation while the isolation is latched has no further effect and is recorded.

3.4 Staff of the Office of Internal Assurance observe the control and read its register. They do not operate it.

3.5 Personnel at sites other than the hubs are not told the cause of an isolation. They are told that the site's external circuits are out of service.

## Escalation

5.1 Each initiation raises the escalation level of the control by one, to a maximum of five. The consequences of each level are set out in the schedule at :x[OSC-MEM-07-0233] and are displayed at the control before the cover is lifted.

5.2 The escalation level is a property of the control, not of the operator. It is not reduced by any procedure, by the passage of time, by restoration of the circuits, or by reissue of the workstation.

5.3 After restoration from the third initiation and from each initiation after it, the Resident Assurance Officer fits a numbered tamper seal through the cover tab. The seal is broken before the cover can be lifted. The breaking of a seal is reported to the Office of Internal Assurance whether or not the control is then operated. Seals are not refitted from the workstation.

5.4 At the fifth initiation the control is withdrawn from service in the actuated position. The isolation is then held. Restoration is reserved to the Council Secretariat and is not made from any workstation.

## Restoration

6.1 After the first initiation, Network Operations restores the circuits after line checks, without action at the workstation.

6.2 After the second and later initiations, the circuits may be restored, or after the third initiation may only be restored, on a Circuit Restoration Certificate. The certificate is raised at the control with a written statement of circumstances and is routed to the Deputy Commander, ALPHA-02, as certifying officer for the hub of the issuing switch.

6.3 The certifying officer approves the certificate or returns it. On approval the circuits are restored at once. A returned certificate may be raised again with a fuller statement.

6.4 Restoration does not close any report made to the Office of Internal Assurance under :x[OSC-DIR-0378].

## Procedures

1. Do not lift the cover unless para 3.1 applies.
2. Read the consequences displayed at the control for the next initiation.
3. If a tamper seal is fitted, break it (para 5.3).
4. Lift the cover. Press and hold the actuator until the hold bar is full.
5. Acknowledge the alarm. Close the cover.
6. Tell the duty officer by telephone on the local extension. Do not use mail; the hub circuits are down.
7. Make the statement required by the Office of Internal Assurance when it is asked for.
8. Where para 6.2 applies, raise a Circuit Restoration Certificate at the control.

## References

(a) :x[OSC-DIR-0447], Telephones, Mail Addressing and the Key Distribution Network. (b) :x[OSC-DIR-0378], Security Incidents, Self-Reporting and Inquiries. (c) :x[OSC-DIR-0301], MERIDIAN Workstation Use and Accreditation. (d) :x[OSC-MEM-07-0233], Escalation Schedule, Control HS-0001.

## Supersession

This revision supersedes Revision 1 of 05 MAR 2007.
