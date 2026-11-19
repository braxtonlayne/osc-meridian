# MERIDIAN content pipeline

`scripts/build-content.ts` compiles `content/<family>/<slug>.md` into the generated outputs
listed in `docs/CONTRACTS.md` (`.generated/routes.json`, `.generated/canon-figures.json`,
`public/data/docs/<id>.json`, `public/data/releases/<KEY>.json`, `public/data/search.json`).
`npm run content` runs it with defaults. Any problem prints as `file:line  message` and exits 1.

## Validating your own pages (content agents)

Many agents write content in parallel. **Always validate with `--dry-run`**. It writes nothing,
so it cannot clobber anyone else's outputs:

```
npx tsx scripts/build-content.ts --dry-run --only content/directives
```

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--dry-run` | off | Compile and validate everything. Writes **nothing** to `.generated/` or `public/data/`. |
| `--only <dir>` | all | Requires `--dry-run`. Reports problems and warnings only for files under `<dir>`. All content is still loaded, so `:x[]` references into other families resolve. The summary line says how many problems in other folders were not shown. |
| `--manifest <file>` | `content/manifest.json` if it exists | Planned document numbers. An `:x[DOCNO]` (or a frontmatter `xrefs` entry) naming a planned docNo that has no page yet is a **warning** in `--dry-run` and an **error** in a real build. A docNo that is neither on a page nor in the manifest is always an error. |
| `--content <dir>` | `content` | Directory scanned for `<family>/<slug>.md`. `content/canon/` and `README.md` files are skipped. |
| `--canon <file>` | `content/canon/canon.json` | Canon used by `:c[]`, `::canon-table` and the drift rules. |
| `--out <dir>` | repo root | Root that receives `.generated/` and `public/data/` (ignored with `--dry-run`). |
| `--base </path/>` | `$MERIDIAN_BASE` or `/` | Base path baked into cross-reference hrefs. In Git Bash, prefer `MERIDIAN_BASE=/osc-meridian/`. Git Bash rewrites a bare `/osc-meridian/` argument into a Windows path, and the build refuses that. |

Manifest shapes accepted: an array of docNo strings, records anywhere in the JSON carrying a
`docNo` field, `docNos: [...]` arrays, or an object keyed by docNo.

## Directive cheat sheet

| Syntax | Output |
|---|---|
| `:r[text]{tier=2 compartment=KESTREL auth="OIA" ref="OIA-08-114"}` | inline redaction. `auth` and `ref` are required. The key is `T2`, `KESTREL` or `KESTREL+T2`. Tier 1 never ships. |
| `:::redact{tier=2 auth="CSO" ref="..."}` … `:::` | block redaction |
| `:c[headline.staffTotal]` | canon value (`3,847`). Arrays are addressed by id/no/n/fy/term/pn/seat/tier, e.g. `:c[facilities.ALPHA-03.depthFt]`. Add `{raw}` to print the stored value unformatted. |
| `:x[OSC-DIR-0412]` | cross-reference link |
| `::canon-table{source="facilities" class="BETA" cols="id:Site,capacity" filter="network=EASTERN" caption="..." limit=10}` | static table from canon |
| `:::margin{hand="RT" seed=3 mark=arrow}` | margin note. `mark` is arrow, underline, circle or none. |
| `:ink[847]{mark=circle}` | hand ink on running text (circle or underline) |
| `::stamp{kind="RECEIVED" date="2008-05-02" text="..." seed=4 of="12" ink="red"}` | rubber stamp |
| `::routing{initials="JH 5/2,MKB 5/5"}` | routing slip |
| `:::scan{seed=7 rotate=-0.6}` | scanned page wrapper |

## Headline figures (drift test)

`npm run test:dist` checks the phrases in `scripts/content/figures.ts`. If a page says
"certified mileage", "sustained capacity", "total surge berthing", "total personnel",
"total posted staff", "DETACHED / UNPOSTED" or "total programme cost", the number printed next
to the phrase must equal canon. Print it with `:c[...]` so it cannot drift.
