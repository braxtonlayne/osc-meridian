---
id: assurance-comm
route: /assurance/communications
app: assurance
family: assurance
template: record
docNo: OSC-ASR-COMM
title: Communications Security Protocols
marking: UMBRA-C
originator: CMS/ALPHA-02
revision: 4
date: 2007-12-04
summary: Quantum-key distribution network independent of other government communications, no external internet connectivity, MERIDIAN workstation accreditation, and the rule that no UMBRA//OSC EYES ONLY material is entered into any information system.
xrefs: [OSC-DIR-0447, OSC-2008-Q2, OSC-DIR-0301, OSC-DIR-0319, OSC-ASR-CG, OSC-CNL-CHR-VII, OSC-SYS-MON, KB-0001]
distribution:
  - Director, Communications Security (ALPHA-02)
  - Director, Office of Internal Assurance (ALPHA-01)
  - Key Custodians, all staffed facilities
  - MERIDIAN Service Desk (ALPHA-01)
  - Facility Commanders, all staffed facilities
recordType: SECURITY PROTOCOL
fields:
  - { label: Protocol, value: Communications Security }
  - { label: Office of primary responsibility, value: Communications Security (CMS/ALPHA-02) }
  - { label: Coordinating office, value: Office of Internal Assurance (OIA/ALPHA-01) }
  - { label: Effective, value: 01 JAN 2008 }
  - { label: Supersedes, value: OSC-ASR-COMM rev 3 (20 FEB 2007) }
  - { label: Applies to, value: All MERIDIAN users and key custodians }
revisions:
  - { rev: "4", date: 04 DEC 2007, change: "MERIDIAN release 4.1 accreditation. Section 4 restated. Removable media table revised.", by: CMS/ALPHA-02 }
  - { rev: "3", date: 20 FEB 2007, change: "Telephone handling moved to OSC-DIR-0447.", by: CMS/ALPHA-02 }
---

## 1. Network

1.1 :c[security.personnel.communications]

1.2 The key distribution network (QKD) carries MERIDIAN sessions, internal mail, cable traffic between sites, telephone service below grade and the telemetry links to Network Control and to the facility plant rooms. Link states for each hub are shown on the workstation and on :x[OSC-SYS-MON]. A link shown DEGRADED is carrying traffic with reduced margin; controlled mail is queued, not lost.

1.3 The network has no gateway to any other network. There is no route by which a MERIDIAN workstation can reach the internet, any other government network or the cover agency's own systems, and none is to be created. Surface cover facilities use the cover agency's own communications, which carry no OSC traffic.

1.4 Mail addressing in the `.mer` domain, retained accounts and telephone practice are set by :x[OSC-DIR-0447].

## 2. Key management

:::redact{tier=2 auth="CMS" ref="CMS-07-0211"}
2.1 Link keys are generated at ALPHA-02 and distributed over the quantum channel; no key material is carried by hand except at commissioning of a new link, when it is carried by two key custodians travelling separately by rail. Keys are rolled every 15 minutes on hub links and every 60 minutes on tram-served links. A link that cannot roll its key within two intervals is taken out of service automatically and shows OFFLINE.

2.2 Each site holds a sealed fallback key set in a two-person container in the key custodian's office. Opening the container is reported to Communications Security by cable the same duty period, and the set is replaced from ALPHA-02 within seven days.
:::

2.3 Key custodians are named by the facility commander and recorded with Communications Security. A key custodian may not be a probationer.

## 3. MERIDIAN workstation accreditation

3.1 A MERIDIAN workstation is accredited by Communications Security for a named room, a named site and the highest marking it may display. It is not moved without reaccreditation. Accreditation is recorded on the label on the rear of the unit and in the accreditation register held by the MERIDIAN Service Desk.

3.2 Workstations are identified by site, level and serial (for example `A03-5-114`: ALPHA-03, Level 5, workstation 114). The identifier stays with the unit. On reassignment the previous user's profile is archived and the unit is issued to the new user without reimaging.

3.3 Sessions are opened with the smart token and passphrase issued by the Service Desk (:x[KB-0001]). Removal of the token locks the session. Use, session lock and the documented commands are governed by :x[OSC-DIR-0301].

3.4 Every workstation writes an audit trail of activity for review by the Office of Internal Assurance. The trail is written whether or not the session is locked.

## 4. Records that may not be entered into any system

4.1 No UMBRA//OSC EYES ONLY material is entered into any information system, MERIDIAN included, in any form: typed, transcribed, summarised, scanned, photographed or recorded. Material at this marking exists only as numbered physical copies, as the Charter requires (:x[OSC-CNL-CHR-VII]).

4.2 The rule applies to the Facility Inventory and Logistics Network in every revision (current revision: :x[OSC-2008-Q2]), to Council minutes above UMBRA//OSC RESTRICTED, and to any document the Council names as governing. It applies to extracts and to notes made from them.

4.3 Workstations are accredited to display UMBRA//OSC EYES ONLY markings on banners and cover sheets so that index entries and correspondence about such material can be handled. An accreditation to display the marking is not an authority to hold the material.

4.4 Reproduction of records at lower markings is governed by :x[OSC-DIR-0319]. Reproduction of UMBRA//OSC EYES ONLY material is not permitted under that directive or any other.

## 5. Removable media

| Medium | Permitted | Notes |
|---|---|---|
| Floppy diskette | No | Drives removed at accreditation. |
| Optical disc (write) | No | Writers removed at accreditation. |
| Optical disc (read) | Records Division only | For accession of superseded registry media. Read on the accession workstation in Stacks C only. |
| USB storage device | No | Ports disabled at accreditation. Report any device found connected. |
| Magnetic tape | Communications Security only | Backup of mail stores, held in the two-person container. |
| Paper | Yes | Print release under :x[OSC-DIR-0319]. |

Media received for accession that contain records above the marking of the accession workstation are not opened and are reported to the Resident Assurance Officer.

## 6. Reporting

Any of the following is reported to the Service Desk and to the Resident Assurance Officer the same duty period: a workstation found unlocked and unattended; a label missing or altered; a device connected to a workstation that was not there at accreditation; a link state that does not match the site's own indications; any material at a marking above the workstation's accreditation appearing on screen.

Approved 04 DEC 2007, M. Szabo, Director, Communications Security. Coordinated C. Brandauer, Director, Office of Internal Assurance.
