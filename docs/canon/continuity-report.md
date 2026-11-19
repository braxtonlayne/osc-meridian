# Continuity pass: what changed and what was left alone

Continuity editor pass over all 240 pages, 19 NOV 2026. Nothing is committed. Validation: `npx tsx scripts/build-content.ts --dry-run` gives 0 errors and 0 warnings. A scratch build run through `checkDrift` gives 0 drift problems.

## 1. Withholding authorities and references (OSC-ASR-CG section 7)

- 715 `auth`/`ref` pairs were rewritten to the guide formats. Every `auth` is now a canon division code or COUNCIL. Each old pair maps to one authority file, so the same withholding shows the same reference on every page:
  - Invented formats: `CS-R-01`, `CS-R-04`, `CS-R-06-04`, `TO-R-02`, `TO-R-08-011`, `LR-R-07-12`, `PV-R-06`, `OIA-R-07`, `OIA-R-15`, `RD-R-11`, `CMS-R-04`, `CMS-R-09`.
  - Document numbers used as references: `OSC-CB-0nn`, `OSC-2008-Q2`, `OSC-ASR-*`, `OSC-DIR-*`, `OSC-PER-*` and others.
- Key mappings:
  - HOLLOW material goes to `PV-Q-08-0031`. Categories (DIR-0233 and the old PV-R-06) go to `PV-06-233`.
  - BRIAR contingencies go to `OIA-PROT-15`. The acting-credential clause goes to `OIA-PROT-07`.
  - The seat 07 / minutes 06-04 file is `CS-06-104`. Copy register and seat matters are `CS-06-140`.
  - Withholdings that cite a Charter article now carry `COUNCIL` with `CC-ART-<n>`. Council resolutions keep the `OSC-CNL-RES-` number, as the guide allows.
  - KESTREL engineering is `FE-06-0311`. The RX-B08 TALLOW paragraph is `LR-08-0153`, the guide's own example.
- 179 + 148 restricted `:c[]` values now carry an explicit `auth`/`ref`, replacing the pipeline default `OSC/CSO` + docNo:
  - roster: PV
  - cover: CVO
  - geography: TO
  - DELTA: SFC
  - arms: SFC
  - reactors and energy: LR
  - genetic vault: RD
- Canon tables that withhold cells now pass `auth`: CVO on facility and cover tables, PV on the directory.
- The guide's PV row now records that a directory entry shows the holder's personnel number.

## 2. Titles and facilities

- `MSG-08-04472`: "Level 4 Dining" became "Level 3 Dining" in the page and the manifest (canon puts dining on ALPHA-03 Level 3). The ALPHA-02 copy-paste plant (note 3, MDT and the hood inspection) is untouched.
- AHU numbering was checked. AHU-1 to AHU-6 are the central units and AHU-07 to AHU-12 are the stack units. The mail, calendar, the ALPHA-03 dossier, RX-A03 and the terminal all agree; no change was needed.
- `MEM-07-0944` addressee room moved from ALPHA-02 Level 3 (berthing) to Level 10, room 10-140 (engineering).

## 3. Canon text

- Glossary UTILIZATION now reads "sustained capacity (23,400): 3,847 persons ..." and passes the drift rule. The glossary page shows the normal unfiltered table again. The rev 8 note was reworded to match.
- Glossary GENETIC MATERIAL VAULT no longer quotes the T2 figure 125,000.
- A scan of every glossary definition and calendar entry found no other restricted value.
- `canon-merge` was re-run.
- The ALPHA-01 dossier frontmatter carried the SEXTANT cover type and agency in clear. They are now withheld, and the body line is redacted.

## 4. Figures checked against canon (left as typed; `:c[]` cannot address them)

- **390 subcontractors**: the sum of `contractors.register[].subcontractors` is exactly 390 (47 primes). It appears only in a frontmatter summary.
- **800 per year**: matches `expansion.phase4[4]`. `:c[]` cannot index a string array.
- **90-day probation**: matches `security.compartmentation`. Day 30 falls on 14 MAY, which agrees with MSG-08-04417.
- **16,612**: now `:c[anomalies.TUNNEL_847.figures.engineeringTotalMi]` in `LDG-CAT-TRANSIT` and `MEM-07-0944`.
- **Per-mile figures**: 105.08, 5.36, 16.53, 0.84 and 19.6 are all correct.
- **Ledger tables**: every category × FY, source and department sum, line count, share and change on the ledger pages matches the canon line items.

## 5. Dates, people, numbers

- RX-B08 page (as at 12 MAY) against cable 01208 (15 MAY): the cable reports the planned steps as completed, so the two are consistent.
- Teague and Imrie: every ALPHA-03 command item dated 06 MAY or later uses "G. IMRIE / for R. TEAGUE". Teague signs in his own hand only up to 05 MAY.
- Segment 04: the dates in the cable, possession, incident, engineering and calendar records all agree.
- Telephone scheme: `S-NNNN` (site digit plus extension) across the network; inside ALPHA-03 the local number is the level plus the room.
  - Prewitt changed from 5-2208 to 3-3014 (RAO room 3-014).
  - Okafor in MSG-08-04486 changed from 5-2140 to 5021.
  - ALPHA-05 Logistics & Reserves extensions changed from 6-xxxx to 5-xxxx.
  - Kessler changed from 6-2214 to 1-2214.
- Recurring people (canon roster):

| Person | PN | Title used | Address |
|---|---|---|---|
| M. Okafor | P-2-04-0218 | Chief, Accessions & Review Branch | m.okafor@a03.rd.mer, room 5-021, ext. 5021 |
| D. Prewitt | P-2-05-0148 | Resident Assurance Officer, ALPHA-03 | d.prewitt@a03.oia.mer, room 3-014, ext. 3-3014 |
| H. Lindqvist | P-2-03-0119 | Deputy Director, Personnel & Vetting | h.lindqvist@a01.pv.mer |
| R. A. Kessler | P-4-07-0532 | Personnel Reconciliation Clerk, Pay & Strength Accounting | r.kessler@a01.pv.mer, ext. 1-2214 |
| R. Teague / G. Imrie | P-2-04-0061 / -0133 | Deputy Commander / Chief of Staff | a03.cmd.mer |
| B. Shoal | P-4-08-0377 | Command Section | room 1-008, ext. 1104 |
| K. Dwyer | P-4-07-0688 | MERIDIAN Service Desk | ext. 1-7700 |

- Every `.mer` address is either in the roster or one of the functional addresses (registry, food.service, all.personnel and similar). No `.gov` address, banned word or real official was found.

## 6. Orchestrator addenda

- **Redacted-only xrefs**: 27 xrefs that appeared only inside redactions were removed from frontmatter. Each was hidden on purpose: network, reactor, segment, vetting and DIR-0233 links.
- **Form frontmatter**: 113 YAML flow-map values that contained a comma, colon or brackets are now quoted, in 19 files. One `options` item in F-118 is quoted too. The parsed output changed only where a value had been split.
- **Ledger**: the T2 redaction around the category tables was removed from the register and the five category pages.
- **Terminal alignment**:
  - Council certificates now use `CS-CD-YYMM-NN`, issued under the Secretariat procedure and not on F-137. This follows DIR-0354 and the guide.
  - RX-B08 work order LR-08-0102 became LR-08-0098.
  - The KB-0031 sample now shows the terminal's FE-07-0233 output.
  - The DIR-0336 trace example is now 00401.
  - The rolling stock register gains a table with one row per tram consist, because `consist` looks up single cells.
- **Tobin (seg-04)**: the crew-list name is now HOLLOW-keyed inside the KESTREL block. This departs from the manifest plant: KESTREL alone shows only the PN.

## 7. Deliberately left

- 847 against 6,074 and 10,538.
- 3,847 against 3,057 + 790.
- Meals arithmetic.
- The segment 04 absence.
- The empty seat 07 certificate.
- The scan accession date.
- The ALPHA-02 copy-paste note in the menu mail.
- ALPHA-03 dossier "live tab" notices dated after the 30 APR revision. The table is labelled as filed since the revision.

## 8. For other owners

- **Pipeline**: canon-table redactions use the row id or docNo as `ref`. Guide-format references need a `ref` attribute that canon-table does not yet accept.
- **Pipeline**: `tests/unit` has two failures caused by the in-progress `canon-merge.ts` restrictions (DELTA staff and capacity), not by content: `client-canon.test.ts` line 90 and `pipeline.test.ts` line 401.
- **Pipeline**: `scripts/canon-merge.ts` warns that threatDetail owners "Operations and Continuity Planning" and "Office of General Counsel" are not divisions.
- **Terminal**: `src/apps/terminal/records.ts` lines 145-189 generate accessions 00398-00415 from a generic cycle. The descriptions, origins and dates conflict with the tasking table in MSG-08-04470, lines 41-58, which should be the source.
- **Narrative**: `src/narrative/plan.json` line 1137 quotes `PV-R-06`; it should be `PV-06-233`.
