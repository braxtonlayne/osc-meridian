---
id: assurance-cg
route: /assurance/classification-guide
app: assurance
family: assurance
template: record
docNo: OSC-ASR-CG
title: Classification Guide and Withholding Authorities
marking: TSSCI-OSC
originator: OIA/ALPHA-01
revision: 7
date: 2008-03-11
summary: The five markings with banner text and rank, tier-to-marking table, compartment list (names and scope lines only), and the table of withholding authorities and reference formats that redaction hovers show (OIA, CS, PV, TO, FE, LR, CVO, COUNCIL).
xrefs: [OSC-DIR-0412, OSC-SYS-GLO, KB-0012, OSC-DIR-0319, OSC-DIR-0354, OSC-DIR-0177, OSC-ASR-COMM, OSC-CNL-CHR-VII]
distribution:
  - All MERIDIAN users (by library index)
  - Division Heads
  - Resident Assurance Officers (all ALPHA sites)
recordType: CLASSIFICATION GUIDE
fields:
  - { label: Guide, value: OSC Classification Guide }
  - { label: Office of primary responsibility, value: "Office of Internal Assurance (OIA/ALPHA-01)" }
  - { label: Effective, value: 15 MAR 2008 }
  - { label: Supersedes, value: "OSC-ASR-CG rev 6 (09 OCT 2007)" }
  - { label: Applies to, value: "All personnel and all records, every medium" }
  - { label: Queries, value: Resident Assurance Officer at your site }
revisions:
  - { rev: "7", date: 11 MAR 2008, change: "Section 7 restated with reference formats as shown on MERIDIAN redaction marks. CVO added as a withholding authority.", by: OIA/ALPHA-01 }
  - { rev: "6", date: 09 OCT 2007, change: "Banner colours fixed for MERIDIAN release 4.1. Section 9 added.", by: OIA/ALPHA-01 }
  - { rev: "5", date: 22 JAN 2007, change: "LANTERN compartment added.", by: OIA/ALPHA-01 }
---

## 1. Purpose and scope

1.1 This guide sets out the markings used by the Office of Strategic Continuity, the tier at which each may be read, the compartments in use, the handling rules for each marking, and the offices that may withhold text from a reader. It applies to every record in every medium: paper, MERIDIAN, cable traffic, and anything said in a briefing.

1.2 A marking describes the most sensitive content of a record. A record is marked at the highest level of any part of it. Parts of a record above the reader's tier or outside the reader's compartments are withheld at the time the record is displayed or printed (section 8).

1.3 The terms used here have the meanings given in :x[OSC-SYS-GLO].

## 2. The five markings

2.1 Markings are listed in rank order, lowest first. Rank decides which banner is shown when records of different markings are open on one workstation: the highest rank wins.

::canon-table{source="markings" cols="rank:Rank,label:Banner text,sourceLabel:Written in source documents as,bannerBg:Banner colour,usage:Used for"}

2.2 Banner colours are part of the marking and are used only on banners, cover sheets and stamps. The colours are slate for :c[markings.TSSCI-OSC.label], ochre for :c[markings.UMBRA-R.label], oxblood for :c[markings.UMBRA-C.label], deep violet for :c[markings.UMBRA-U.label] and black for :c[markings.UMBRA-EO.label]. Banner text is white on all five. Colour is never the only indication of a marking: the text is always shown.

2.3 Banner text is written with a double slash. Council source documents, including the Facility Inventory, write markings with a single slash (UMBRA/OSC RESTRICTED). The two forms are the same marking.

2.4 "UNRESTRICTED" describes the reader's access, which is unrestricted across the network. It does not describe the handling of the record, which is the most restricted below EYES ONLY.

## 3. Markings by tier

3.1 Each tier is cleared to one marking and to every marking of lower rank. Tier 4 holds no OSC marking and reads only records released to it by name of facility.

::canon-table{source="tiers" cols="tier:Tier,name:Designation,clearance:Clearance held,clearanceMarking:Highest OSC marking"}

3.2 :c[markings.UMBRA-EO.label] is not a tier marking. It is read only by the named holder of a numbered Council copy, in physical form.

3.3 :c[markings.UMBRA-R.label] is applied to Council text released for reading below Council level. It may be read at Tier 3 where the release names Tier 3.

## 4. Compartments

4.1 A compartment is a further restriction within a tier. A record in a compartment is displayed only to a reader who has been briefed into it under :x[OSC-DIR-0412]. The scope of each compartment is stated below so that a reader can tell whether withheld text is likely to concern their duties. The contents of a compartment are not stated here.

::canon-table{source="compartments" cols="id:Compartment,scope:Scope,briefingDocNo:Briefing"}

4.2 LANTERN is granted to all Records Division personnel on posting. Every other compartment is granted by briefing on the grounds listed in :x[OSC-DIR-0412] para 4.

4.3 A redaction may be keyed to a tier, to a compartment, or to both (for example, a compartment at Tier 2). Holding the compartment without the tier, or the tier without the compartment, does not release it.

## 5. Handling rules

| Marking | Storage | Reproduction | Transmission | Destruction |
|---|---|---|---|---|
| :c[markings.TSSCI-OSC.label] | Locked container or controlled room at the holder's site. | Permitted under :x[OSC-DIR-0319] with cover sheet. | MERIDIAN mail, cable, or hand carriage within the site. | Burn bag (:x[OSC-DIR-0177]). |
| :c[markings.UMBRA-R.label] | Locked container. Charter extracts in the Secretariat issue folder. | By the Secretariat only. | MERIDIAN or cable, as released. | Returned to the Secretariat. |
| :c[markings.UMBRA-C.label] | Two-person container or controlled room at the holder's site. | Permitted under :x[OSC-DIR-0319] with cover sheet and OSC-F-142. Each copy numbered. | MERIDIAN or cable between named addressees. Hand carriage by courier with escort. | Witnessed destruction, certified on OSC-F-137 (:x[OSC-DIR-0354]). |
| :c[markings.UMBRA-U.label] | Two-person container at ALPHA-01 or the holder's command suite. | Not without the originator's written consent. | Cable to named addressees only. | Witnessed destruction, certified on OSC-F-137, copy to originator. |
| :c[markings.UMBRA-EO.label] | Held by the named reader in a controlled space. Not stored overnight outside the Secretariat strongroom. | Not permitted in any form. | By the Secretariat by hand only. Never by any system. | By the Secretariat, on succession, under the Council procedure. Not certified on OSC-F-137. |

5.1 Material at :c[markings.UMBRA-EO.label] is not entered into any information system in any form (:x[OSC-ASR-COMM] section 4; :x[OSC-CNL-CHR-VII]). A record about such material, such as an index entry, a register line or correspondence about a copy, is marked at the level of its own content and not at the level of the material it concerns.

5.2 A record found in a medium its marking does not permit is not destroyed by the finder. It is secured where it is, reported to the Resident Assurance Officer the same duty period, and left for the Office of Internal Assurance.

## 6. Cover sheets and stamps

6.1 A printed record outside a container carries a cover sheet in the colour of its marking, showing the marking in words, the document number, the copy number where numbered, and the print record. Cover sheets are produced by MERIDIAN at print release.

6.2 Stamps in use on paper records: RECEIVED, COPY NO., FILE COPY, SUPERSEDED, CANCELLED, ACTION, INFO, DISTRIBUTION LIMITED, REPRODUCTION PROHIBITED, NO ELECTRONIC COPY, REVIEWED OIA, DESTROY BY, VOID, and the five marking stamps. A stamp records a fact about the copy it is on and does not change the marking.

## 7. Withholding authorities

7.1 Every withheld passage shows, when examined, the office that withheld it and a reference. It shows nothing else. Only the withholding authority, or the Council, may release withheld text.

| Code | Office | Withholds | Reference format | Example |
|---|---|---|---|---|
| OIA | Office of Internal Assurance | Inquiry files, incidents, assurance contingencies, monitoring methods | `OIA-YY-NNN` (incident), `OIA-PROT-NN` (contingency protocol) | OIA-08-031 |
| CS | Council Secretariat | Council records custody, copy register, succession and destruction | `CS-YY-NNN` | CS-07-114 |
| PV | Personnel & Vetting | Investigation detail, strength accounting, personnel categories | `PV-YY-NNN`, or the query number `PV-Q-YY-NNNN`; a directory entry withheld below the holder's tier shows the holder's personnel number `P-T-YY-NNNN` | PV-Q-08-0031 |
| TO | Transit Operations | Network control, timetables, possessions, consist records | `TO-YY-NNN` | TO-08-062 |
| FE | Facilities Engineering | Engineering sheets, plant and tunnel data | Work order `FE-YY-NNNN` | FE-08-0417 |
| LR | Logistics & Reserves | Reserve positions, fuel, burn-down figures | Work order `LR-YY-NNNN` | LR-08-0153 |
| CVO | Cover Operations | Cover identities, surface staffing, prepared statements | `CVO-YY-NNN` | CVO-08-027 |
| COUNCIL | The Council | Anything the Council withholds | `CC-ART-` and the Charter article, or the resolution number | CC-ART-IV |

7.2 Other divisions (CMP, CMS, IAD, MS, RD, SFC) withhold within their own records under the same rules, using their division code and a serial of the form `CODE-YY-NNNN`.

7.3 A reference identifies the authority's file on the withholding. It is not a document number and does not open a document. Requests for release are made to the authority through the Resident Assurance Officer and are refused unless the reader's tier or compartments have changed.

## 8. Redaction on MERIDIAN

8.1 Withheld text is removed before a record reaches the workstation. A black bar is shown in its place, sized to the text it replaces, so that a reader can see that text has been withheld and how much. The bar is not a cover over the text; the text is not present on the workstation.

8.2 When the reader is briefed into a compartment or cleared to a tier, passages withheld under that key are released on the next display of the record. Released passages are underlined with a dotted rule.

8.3 Text withheld by the Council at Tier 1 is not released at any lower tier and is not held on any workstation below Tier 1.

8.4 Examining a withholding mark is recorded in the audit trail like any other access (:x[KB-0012]). Examining marks is not a violation.

## 9. Classification control: Council numbered copies

9.1 The control lines below are carried from the Facility Inventory and apply to every Council numbered-copy document. They are reproduced here as handling rules only.

::canon-table{source="classificationControl" cols="label:Control,text:Provision"}

9.2 A Council copy is accountable by its number. Its loss, transcription, reproduction or entry into any system is reported in person to the Office of Internal Assurance before the end of the duty period, by any person who learns of it.

Approved 11 MAR 2008, C. Brandauer, Director, Office of Internal Assurance.
