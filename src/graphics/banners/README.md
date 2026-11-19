# @graphics/banners

Asset family 12: classification banners, per-window marking strips, the document cover sheet and the rubber stamp set of the fictional OSC marking system.

All layouts and wording are original to MERIDIAN. Nothing here reproduces a real government banner, cover sheet or colour scheme. Marking colours are never defined in this folder: every component takes a canon `Marking` and reads `bannerBg` / `bannerFg` from it.

## Exports (`index.tsx`)

| Export | Notes |
|---|---|
| `ClassificationBanner({ marking, position })` | 18px bar, centred capitals, 1px rule on the inner edge. Not positioned: the shell places it (flex child or fixed). The bottom copy is `aria-hidden`. |
| `MarkingStrip({ marking, markings? })` | 13px strip for directly under a window title bar. `marking` is a canon `Marking` or a `MarkingId`; ids resolve against `markings` or the list the shell registers with `registerMarkings()` once canon loads (unknown id renders nothing). |
| `CoverSheet({ marking, docNo, title, copyNo?, copiesTotal?, distribution?, originator, date, logRows? })` | One 816 x 1056 page (8.5 x 11). Border in the marking colour, marking label, document control block, six handling instructions, receipt and access record with empty ruled lines (default 16). `date` takes ISO or formatted text. Breaks to its own page in print. |
| `Stamp({ kind, date?, text?, seed?, of?, ink?, marking?, scale?, class? })` | Inline SVG stamp. Seeded ink mask, rotation within 3 degrees either way, double-rule border. |
| `enhanceStamps(root?, markings?)` | Upgrades `.stamp[data-kind]` elements into SVG stamps. Idempotent; returns the count upgraded. |
| `normalizeStampKind(raw)`, `formatStampDate(iso)`, `STAMP_KINDS`, types `StampKind`, `StampInk`, `StampProps`, `CoverSheetProps` | |

### Stamp kinds

`RECEIVED` (date; `text` replaces the registry line), `COPY-NO` (`text` = copy number, `of` defaults to 11), `FILE-COPY`, `SUPERSEDED` (`text` = superseding document number), `CANCELLED`, `ACTION`, `INFO`, `DISTRIBUTION-LIMITED`, `REPRODUCTION-PROHIBITED`, `NO-ELECTRONIC-COPY`, `REVIEWED-OIA` (date), `DESTROY-BY` (date), `VOID`, and the five marking ids `TSSCI-OSC`, `UMBRA-R`, `UMBRA-C`, `UMBRA-U`, `UMBRA-EO`.

Loose spellings are accepted (`FILE COPY`, `Distribution: Limited`, `file_copy`). An unknown kind is stamped with its own text rather than failing. Marking stamps read `marking.label` when a `marking` is passed, and otherwise fall back to a built-in face text. Dated stamps with no date show a blank to be filled in.

Default inks: blue-black for RECEIVED, COPY-NO, FILE-COPY, INFO, REVIEWED-OIA; oxblood for the rest. Override with `ink`.

## Pipeline markup (`stamps.css` + `enhanceStamps`)

```html
<span class="stamp" data-kind="RECEIVED" data-date="2008-05-02"></span>
```

Attributes read: `data-kind`, `data-date`, `data-text`, `data-seed`, `data-of`, `data-ink` (`red` | `blue`), `data-scale`. Before enhancement (prerendered HTML, no scripting) the element still shows as a double-ruled stamp in the right ink with its kind and date as text. Call `enhanceStamps(container, canon.markings)` after document HTML is inserted.

## Styles

- `banners.css`: banner, strip, cover sheet. Reads `--text-1`, `--text-2`, `--surface`, `--th-bg`, `--row-rule`, `--font-ui`, `--font-mono` from `src/design/tokens.css`; fallbacks repeat the SPEC values so the check page runs alone.
- `stamps.css`: the two pad inks are local custom properties on `.stamp` (`--stamp-red`, `--stamp-blue`) and are used nowhere else. Stamps use `mix-blend-mode: multiply` so they sit into paper and text underneath.

Both files are imported by `index.tsx`.

## Rendered check

```
node src/graphics/banners/check/render.mjs
```

Bundles `check/entry.tsx` with esbuild, opens it in headless Chromium through Playwright and writes the PNGs below. It uses `content/canon/canon.json` markings when that file exists; otherwise a sample palette defined in `check/entry.tsx` and labelled SAMPLE in the image. The committed images were rendered with the sample palette.

| File | Shows |
|---|---|
| `check/banners.png` | top and bottom banner for each of the five markings |
| `check/strips.png` | marking strip under a window title bar |
| `check/cover.png` | cover sheet with copy number and distribution list |
| `check/cover-blank.png` | cover sheet with optional fields omitted |
| `check/stamps.png` | every stamp kind, including blank and filled variants |
| `check/pipeline.png` | pipeline markup before and after `enhanceStamps()` |
| `check/scan.png` | stamps over typed text, including NO ELECTRONIC COPY |
