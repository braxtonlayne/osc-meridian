# Shared brief: content agents

You write in-world pages for MERIDIAN, a fictional 2008 government intranet. Repo: C:\Users\braxt\Desktop\osc-meridian (Windows; absolute paths). **Do not commit.** Write only the files for the manifest pages whose `owner` is your key.

## Read first
1. `docs/SPEC.md`, especially §3 guardrails, §6 discrepancies, §9, and **§11 Writing voice**. The voice carries the realism. Re-read it before every few pages.
2. `docs/CONTRACTS.md`: content format, directives, drift trigger phrases.
3. `scripts/content/README.md`: the directive cheat sheet as implemented.
4. `content/manifest.json`: your pages (filter by `owner`). Use each page's `id`, `route`, `app`, `family`, `template`, `docNo`, `title`, `marking`, `originator`, `revision`, `date`, `access` and `aliases` **exactly**. `synopsis` tells you what the page says. `plants` lists what the page MUST contain: clues, anomaly evidence, xrefs, exact phrases.
5. `docs/NARRATIVE.md`: the unlock graph, the paper trails and the recurring people. Plant clues exactly as specified, and never explain the game mechanics in-world. This file is spoiler material, so nothing in content may mention "unlock", "steps" or the graph.
6. `docs/CANON.md` and `content/canon/canon.json`: frozen facts. `docs/DECISIONS.md` covers the certified 847-mile links, the client canon and other choices.
7. `docs/STYLE.md` §5: the frontmatter keys each template understands.

## Rules
- **Every number is a canon directive.** Use `:c[path]` for any figure that exists in canon, and never type a canon number by hand. Use the drift trigger phrases exactly as listed in CONTRACTS, with the `:c[]` value beside them. Invented incidental numbers that aren't in canon are fine: room numbers, work-order numbers, times, page counts.
- **Redaction is authored.** Use `:r[...]{tier=.. compartment=.. auth=".." ref=".."}` and `:::redact{...}`. Decide what is hidden and why, so that releasing it at Tier 2 or under a compartment reveals something worth the effort. Withholding authorities are real division codes from canon; references follow the canon numbering scheme. Tier 1 text never ships: write it if the page reads better with the bar sized right, but expect it to be gone.
- **Cross-references:** use `:x[DOCNO]` for every xref in `plants`, plus natural extra references to real manifest docNos.
- **Voice:**
  - Bureaucratic, specific, unexcited. Use passive voice where a real memo would.
  - Include reference numbers, effective dates, supersession lines, action officers and suspense dates.
  - Dates are written `12 MAY 2008`. Times are Zulu with local in brackets: `1430Z (1030 EDT)`.
  - Never wink, and add no ominous flourishes. Mundane outnumbers sinister ten to one.
  - Each document knows its audience: a Tier 4 notice does not mention other facilities, and a Tier 2 paper says "the adjacent hub".
- **Templates:**
  - Different families look different: memo, directive, cable, minutes, dossier, ledger, form, message, help, record, charter, scan, index.
  - Fill the template's frontmatter object (`memo:`, `directive:`, `minutes:`, `cable:`, `message:`, `form:`, `dossier:`, `help:`) per STYLE.md §5 and this brief.
  - Use `::stamp`, `::routing`, `:::margin`, `:ink[]` and `:::scan` where a real paper record would show them. Use them sparingly and on purpose.
- **Length:** real and varied. A GAMMA dossier is short and terse; an ALPHA dossier is long. Don't pad. No two pages in your set may read like the same page with names swapped.
- **Guardrails:**
  - No real person named as an OSC member or official.
  - Real agencies appear only as cover identities and funding lines.
  - No `.gov` addresses; in-world email uses the `.mer` domain.
  - No copied federal warning text.
- **Banned words in shipped content:** TODO, lorem, coming soon, placeholder, TBD.

## Structured frontmatter shapes (shared with the app agents)
```yaml
form:      # Forms app renders and validates from this
  formNo: OSC-F-126
  edition: REV 03-2007
  routing: [Supervisor, RD Security Office, OIA]
  blocks:
    - n: 1
      label: Requesting operator
      fields:
        - { name: pn, label: Personnel number, type: pn, required: true }
        - { name: compartment, label: Compartment requested, type: select, options: [KESTREL, HOLLOW], required: true }
  submit: { receiptPrefix: RCPT-126 }
message:   # Message Traffic renders from this; body is the Markdown
  from: m.okafor@a03.rd.mer
  to: [analyst.1147@a03.rd.mer]
  cc: []
  precedence: ROUTINE       # ROUTINE | PRIORITY | IMMEDIATE | FLASH
  sent: 121430Z MAY 08      # DTG
  folder: Inbox
  thread: <thread id>
  inReplyTo: <msg id or null>
  readReceipt: true
  arrival: <copy the arrival rule from src/narrative/plan.json>
```
Field `type` values: `text textarea date time select radio checkbox pn docno facility signature number`.

## Validate
Run `npx tsx scripts/build-content.ts --dry-run --only content/<family>` until there are **zero errors** in your files. Warnings about manifest pages other agents haven't written yet are fine. Never run the build without `--dry-run`.

## Report (under 250 words)
- pages written vs assigned, with docNos
- any plant you could not place, and why
- canon gaps you worked around
- the validation result
