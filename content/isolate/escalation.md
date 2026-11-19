---
id: isolate-escalation
route: /isolate/escalation
app: isolate
family: isolate
template: memo
docNo: OSC-MEM-07-0233
title: Escalation Schedule, Control HS-0001 (Network Isolation, Manual Initiate)
marking: UMBRA-R
originator: CMS/ALPHA-02
revision: 2
date: 2008-02-04
summary: Network Operations sets out what follows each of the five initiations of control HS-0001, the hold periods, the line-check periods and the certifying officer for restoration.
distribution:
  - Assigned operator, workstation A03-5-114
  - Duty officers, ALPHA-02 and ALPHA-03
  - Resident Assurance Officer, ALPHA-03
  - Network Operations, CMS (file HS-0001)
xrefs: [OSC-DIR-0507, OSC-DIR-0447, OSC-DIR-0378, OSC-DIR-0301]
memo: &tpl
  letterhead:
    - COMMUNICATIONS SECURITY
    - Network Operations
    - Level 3, ALPHA-02
  memoFor: ["Distribution"]
  from: Network Operations, Communications Security (CMS)
  subject: Escalation Schedule, Control HS-0001 (Network Isolation, Manual Initiate)
  references:
    - OSC-DIR-0507, Network Isolation, Manual Initiate (Control HS-0001), Rev 2
    - OSC-DIR-0447, Telephones, Mail Addressing and the Key Distribution Network
  signature: { name: "Network Operations", title: "Communications Security, ALPHA-02" }
  routing:
    - { office: "CMS Network Operations", action: "Originator", initials: "NO", date: "2008-02-04" }
    - { office: "Resident Assurance Officer, ALPHA-03", action: "Info", initials: "DP", date: "2008-02-07" }
<<: *tpl
---

1. This schedule is issued under :x[OSC-DIR-0507] para 5.1 and replaces the schedule issued with Revision 1. It is displayed at the control before the cover is lifted. The figures below are the settings of the control; they are not varied by Network Operations on request.

2. **First initiation.** Hold period :c[apps.isolate.levels.1.holdMs] ms. All remote hub circuits are dropped. Network Operations carries out line checks and restores the circuits without action at the workstation, after about :c[apps.isolate.levels.1.clearsAfterMin] minutes. The initiation is reported to the Office of Internal Assurance and a written statement is required of the initiating operator. Every MERIDIAN account holder is sent a network notice; sites other than the hubs are told only that their external circuits are out of service.

3. **Second initiation.** Hold period :c[apps.isolate.levels.2.holdMs] ms. Circuits are held down for the full line-check period of :c[apps.isolate.levels.2.clearsAfterMin] minutes, unless restored earlier on a Circuit Restoration Certificate approved by the Deputy Commander, ALPHA-02. That officer is notified at the time of the initiation. The initiating operator is interviewed by the Resident Assurance Officer.

4. **Third initiation.** Hold period :c[apps.isolate.levels.3.holdMs] ms. There is no automatic restoration. Circuits remain down until a certificate is approved. The Office of Internal Assurance records a formal finding against the initiating operator and places the workstation under review; the lock screen of the workstation says so from then on. On restoration a numbered tamper seal is fitted to the cover.

5. **Fourth initiation.** The seal is broken first, then the cover is lifted and the actuator held for :c[apps.isolate.levels.4.holdMs] ms. Restoration as for the third initiation, and a further seal is fitted. An adverse report is entered on the probation record of the operator to whom the workstation is assigned. The report is entered whoever initiated, the assignment being the operator's responsibility under :x[OSC-DIR-0301].

6. **Fifth initiation.** Hold period :c[apps.isolate.levels.5.holdMs] ms. The isolation is held. The control is withdrawn from service in the actuated position and no certificate is accepted at it. Restoration is reserved to the Council Secretariat.

7. The escalation level is not reduced by any procedure (:x[OSC-DIR-0507] para 5.2). Questions about this schedule are addressed to Network Operations by telephone. They are not addressed to the Records Division, which has no communications duty in respect of the control.
