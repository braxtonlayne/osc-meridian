# MERIDIAN style guide

Owner: design system (`src/design/**`). Read with `docs/SPEC.md` §4 (art direction) and §11 (voice).

MERIDIAN looks like software a contractor shipped in 2003 to a requirements document and nobody has redesigned since: flat grey panels, 1px bevels, small type, many tables. Status is given in words. Nothing glows.

## 1. Setup

```ts
import '@design/styles';        // once, first, in src/main.tsx: layer order, tokens, fonts, primitives, documents
import { Button, DataTable, DocumentView } from '@design/index';
const Gallery = lazy(() => import('@design/gallery/Gallery'));   // keep it out of the shell chunk
```

Cascade layers (declared in `base.css`): `tokens, reset, base, primitives, documents, utilities`. Shell and app CSS can stay unlayered, which beats every layer, or go in `@layer utilities`.

Fonts are bundled from @fontsource, latin subset only: Plex Sans 400/500/600/700 plus 400 italic, Plex Mono 400/600, Source Serif 4 400/600 plus 400 italic, Courier Prime 400/700. Use no other weights.

## 2. Tokens (`src/design/tokens.css`)

Colour literals are allowed only in `tokens.css`. Everywhere else, use `var(--token)`.

| Group | Tokens |
|---|---|
| Workspace / chrome | `--ws-bg` `--chrome-face` `--chrome-hi` `--chrome-shadow` `--chrome-outer` `--chrome-dark` `--window-drop` |
| Title bars | `--title-active-bg/-fg` `--title-inactive-bg/-fg` |
| Surfaces | `--surface` `--paper` `--paper-edge` `--th-bg` `--row-rule` `--zebra` `--row-hover` |
| Text | `--text-1` `--text-2` `--text-3` `--text-disabled` `--text-emboss` `--link` `--link-visited` |
| Status | `--st-nominal` `--st-degraded` `--st-fault` `--st-offline` (only as the 10px square) |
| Interaction | `--focus-ring` `--focus-ring-input` `--select-bg/-fg` `--select-inactive-bg/-fg` `--tooltip-bg/-fg/-border` |
| Documents | `--redact` `--print-ink` `--toner` `--stamp-ink` `--hole` `--rx-ch` |
| Markings | `--mark-bg` `--mark-fg`: neutral defaults only. Real values come from `canon.markings` and are set inline (`markingStyle(marking)`). Never hard-code them. |
| Fonts | `--font-ui` (Plex Sans) `--font-doc` (Source Serif 4) `--font-typed` (Courier Prime) `--font-mono` (Plex Mono) |

**Type scale** (px size/line height): xs 10/13, sm 11/14, **base 12/16**, md 13/17, lg 14/18, xl 16/20, doc 14/21, typed 13/18. No display faces. Build hierarchy from weight (400/500/600/700), capitals with `--tracking-caps`, rules and position.

**Spacing**: `--sp-1..9` = 2, 4, 6, 8, 12, 16, 24, 32, 48 px.
**Sizes**: `--ctl-h` 22, `--row-h` 20, `--th-h` 20, `--title-h` 20, `--menu-h` 20, `--toolbar-h` 28, `--status-h` 20, `--tab-h` 21, `--check` 13, `--status-sq` 10, `--label-w` 140, `--doc-max` 760, `--radius` 0 (2px maximum, tabs only).
**Density**: `data-density="compact"` on `<html>` or on any container shrinks controls, rows and spacing. The shell maps `settings.density` to it.
**Motion**: `--motion-open` 90ms. Animations use `steps()`, never easing. Both `prefers-reduced-motion` and `data-motion="reduced"` (the Settings option) turn motion off.

## 3. Bevels

- **Raised** (buttons, panels, menus): border hi/outer plus an inset −1px −1px shadow line.
- **Sunken** (inputs, wells, status panes): border shadow/hi plus an inset 1px 1px outer line.
- **Etched** (group boxes, separators): one shadow line and one highlight line.
- A window gets exactly one hard 1px drop (`--window-drop`). There are no other shadows and no gradients. The only exception is the block-redaction stripe, which uses hard stops.

## 4. Components

All components take plain props, are keyboard-operable, and show a dotted focus rectangle.

| Component | Use | Key props |
|---|---|---|
| `Button` | Push button. `&` in `label` marks the mnemonic. | `variant: default\|primary`, `size: normal\|small\|icon`, `pressed`, `disabled`, `label` |
| `ButtonRow` | Right-aligned dialog/form buttons | `align` |
| `MenuBar` | Window menu. F10 or Alt+letter inside the host opens it; arrows, Enter, Esc. | `menus: {label, items}[]` |
| `Menu` | Drop-down or context menu (`position` = fixed x/y) | `items: (MenuCommand\|{separator:true})[]`, `onClose(reason)`, `initialIndex` |
| `Toolbar` + `ToolbarButton/Separator/Spacer/Label` | Every toolbar button carries a word; an icon is optional | `label`, `icon`, `pressed`, `title` |
| `StatusBar` | Sunken panes; the first pane is usually `fill` | `panes: {id, content, width?, fill?, mono?}[]` |
| `DataTable<T>` | Sortable, sticky header, zebra, single or multi selection, keyboard grid, totals footer, empty slot | `columns`, `rows`, `rowKey`, `label`, `selection`, `selected/onSelectionChange`, `sort/defaultSort/onSortChange`, `onActivate`, `dense`, `wrap`, `empty`, `footer`, `onRowContextMenu` |
| `Tree` | Folder tree; arrows, Enter, `*` | `nodes`, `label`, `selectedId/onSelect`, `expanded/defaultExpanded/onExpandedChange`, `onActivate` |
| `Tabs` | Notebook tabs (automatic activation) | `tabs`, `active/onChange`, `label`, `panel: chrome\|surface\|flush` |
| `TextField` `TextArea` `Select` `Checkbox` `Radio` `RadioGroup` `DateField` | Labelled controls with in-world validation | `label`, `error`, `hint`, `required`, `block` (form block number), `layout`, `width` |
| `DateField` | House format `12 MAY 2008`. Accepts 12MAY08 or ISO. Rejects dates after 31 MAY 2008. | `value` (ISO), `onChange(iso\|null, raw)`, `max`, `min` |
| `FieldGroup` / `Fieldset` / `FieldMessage` | Shared label column; etched form section; a `REJECTED` / `NOTE` line | `labelWidth`, `columns`; `legend`, `no` |
| `Splitter` | Draggable divider; arrows move 8px, Shift+arrows 32px | `direction`, `initial`, `min`, `max`, `label`, two children |
| `ProgressBar` | Fills one segmented block at a time; omit `value` for indeterminate | `value`, `max`, `label`, `showValue`, `segments` |
| `StatusLight` | 10px square plus the WORD | `status: NOMINAL\|DEGRADED\|FAULT\|OFFLINE`, `word`, `note` |
| `PropertyGrid` | Key/value identity block | `rows`, `columns: 1\|2`, `caption` |
| `GroupBox` | Etched frame with a caption | `title`, `on` |
| `Dialog` / `MessageBox` | Modal inside the window (`scope="screen"` for the whole screen); traps focus; Enter = default, Esc = cancel | `kind`, `title`, `icon`, `reference`, `buttons`, `onClose`, `onOpen` (wire it to `sound.play('error')`) |
| `Tooltip` | Hover after 500ms, or on focus | `text`, `placement` |
| `Pager` | Record browser: first/prev/[n] of N/next/last, with typed go-to | `page`, `pageCount`, `onPage`, `noun`, `total` |
| `Redaction` | Black bar `len` characters wide in the current font. Focusable. Hover or focus shows only `Withheld: <auth> · Ref <reference>`. | `len`, `auth`, `reference`, `block`, `onHover(info)` |

Helpers: `formatOscDate`, `parseOscDate`, `formatDtg` (`121430Z MAY 08`), `formatNumber`, `DATE_CEILING`, `cx`, `markingStyle`.

## 5. Documents: `DocumentView`

```tsx
<DocumentView doc={docJson} markings={canon.markings}
  onNavigate={(route) => services.openRoute(route)}
  onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `${i.auth} ${i.ref}`)}
  slots={{ ScanPage, MarkingStrip, Seal, Stamp }} print={{ copyNo, printedBy, printedAt }} />
```

Every document has this frame:

1. **Control strip**: Doc No, Marking, Originator, Rev, Date, Type.
2. **Marking strip**, repeated after the sheet.
3. **Sheet**: the template head, the body HTML, then the template tail.
4. **Annexes**, each drawn only when its data is present: Distribution (`doc.distribution`), Routing slip (`fm.routing`), Revision history (`fm.revisions`), Cross-references (`doc.xrefs`).
5. **Footer**: Doc No · Rev, the original "UNCONTROLLED WHEN PRINTED OR COPIED" notice, and the marking.
6. **Print only**: a cover sheet page (marking bands, identification table, a DISTRIBUTION LIMITED stamp listing the distribution, a handling notice, and the print record), and `Page n of N` in the page margin.

What the pipeline emits and the renderer handles:
- `<span class="rx" data-rx data-len data-auth data-ref>` becomes an inline bar. A `<div data-rx>` (or class `rx-block`) becomes a block of bars at about 80 characters per line. Elements with class `rx-released` are left alone (they get a dotted underline).
- `<a data-xref="/route">` clicks are intercepted and sent to `onNavigate`. Ctrl/Shift/middle-click keep normal link behaviour.
- Tables get class `doc-table`. Numeric cells are right-aligned in mono. A row whose first cell starts with Total, Subtotal, Grand total, Net or Balance becomes a totals row.
- There are fallback styles for `.stamp` / `[data-stamp]` and `.margin-note` / `[data-margin]`. The `@graphics/scan` components replace them when supplied.

**Template anatomy and frontmatter keys** (all optional; a missing key drops its block):

| Template | Head / tail | Frontmatter |
|---|---|---|
| memo | Letterhead, date, MEMORANDUM FOR / THROUGH / FROM / SUBJECT / REFERENCES table, numbered paragraphs, signature, attachments, cc | `memoFor`, `thru`, `from`, `subject`, `references[]`, `letterhead[]`, `signature{name,title,by}`, `attachments[]`, `cc[]`, `numbered:false` |
| directive | DIRECTIVE box (number, effective date, OPR, supersedes, category), title, section index; `##` sections auto-numbered 1., paragraphs 1.1.; APPROVED signature | `directiveNo`, `effective`, `opr`, `category`, `certifiedCurrent`, `approvedBy{}` |
| cable | Courier Prime, all caps: marking line, PRECEDENCE, DTG, SERIAL, FM, TO, INFO, SUBJ, REF A./B.; numbered paragraphs; END OF MESSAGE plus marking | `precedence`, `dtg` or `time` (HHMM Z), `serial`, `fm`, `to[]`, `info[]`, `subj`, `refs[]` |
| minutes | MINUTES title, meeting grid, attendance table, agenda; body `##` = items; actions table (no., action, owner, suspense, status); next meeting; approval | `meeting`, `convened`, `adjourned`, `location`, `chair`, `recorder`, `attendees[{name,office,status}]`, `agenda[]`, `actions[{no,action,owner,suspense,status}]`, `nextMeeting`, `approvedBy{}` |
| ledger | Title, two-column identity grid, dense tables, totals box, certification | `fields`, `totals`, `certification` |
| record | Record kind, title, identity grid, dense body | `recordType`, `fields`, `totals` |
| dossier | Dossier kind, facility id plus title, IDENTITY grid | `dossierType`, `identity` |
| form | OSC FORM number and edition box, title, control number, AUTHORITY AND USE notice, numbered block grid, "previous editions" line | `formNo`, `edition`, `formTitle`, `authority`, `blocks[{no,label,value,wide}]` |
| message | Mail header (From / To / Cc / Sent / Precedence / Subject), body, receipt line | `from`, `to[]`, `cc[]`, `sent`, `precedence`, `subject`, `receipt` |
| help | Knowledge base header grid (article, applies to, audience, last reviewed) | `kbNo`, `appliesTo`, `audience`, `reviewed` |
| charter | The one place with gravity: seal slot, small-caps title, article line, justified serif, indented paragraphs | `charterTitle`, `article`, `attestation` |
| scan | Paper treatment: rotated sheet, punch holes, typed face (or the `ScanPage` slot). `scanOf` lays the content out as another template inside the scan | `seed`, `rotate`, `scanNote`, `scanOf` |
| index | Title, intro, table of entries (number, linked title, date, marking) | `entries[{docNo,title,route,date,marking,note}]` |

Common keys: `routing[{office,action,initials,date}]`, `revisions[{rev,date,change,by}]`. `fields`, `identity` and `totals` can each be given as `[{label,value,mono}]` or as a `{Label: value}` map.

**Signature with "for"**: `signature: { name: "Margaret K. Brandt", title: "Deputy Commander, ALPHA-03", by: "D. Okafor" }` renders `//SIGNED// D. OKAFOR / for MARGARET K. BRANDT / title`. Never explain it in the text.

## 6. Writing voice (SPEC §11, short form)

- Bureaucratic, specific, unexcited. Use passive voice where a real memo would. Include reference numbers, effective dates, supersession lines, action officers and suspense dates.
- Never wink: no jokes, no self-aware lines, no ominous flourishes. The only rhetoric allowed is the Charter's. Menace comes from euphemism and omission.
- Mundane items outnumber sinister ones ten to one, and both get the same formatting.
- Dates: `12 MAY 2008`. Times: Zulu with local in brackets, `1430Z (1030 EDT)`. Nothing is dated after 31 MAY 2008.
- Figures come from canon. Use the glossary's terms. A document knows its audience.
- UI messages are in-world refusals that give a reason and a reference ("Requires Tier 2 compartment briefing. Reference DIR-0412."), never "error" or "oops".
- Validation lines start with the status word REJECTED and say which block failed and why.

## 7. The honesty test

If a screen looks like a movie prop, it is wrong. If it looks like something an admin would screenshot for a help-desk ticket, it is right.

## 8. Do / don't

| Do | Don't |
|---|---|
| Use `var(--token)` for every colour | Write hex or rgb outside `tokens.css` (marking colours come from canon) |
| Put status in words with a 10px square (`StatusLight`) | Show colour alone, glowing dots, or traffic-light icons |
| Use 12px Plex Sans and dense tables | Use display faces, type above 20px outside the charter, or hero layouts |
| Use 1px bevels, square corners, grey | Use gradients, soft shadows, radii above 2px, glassmorphism |
| Make progress move in segmented steps | Use smooth bars, spinners, skeleton shimmer |
| Animate in 90ms `steps()`, off under reduced motion | Use scanlines, glitch, flicker, CRT effects, typewriter text |
| Give every control a result, even a refusal | Ship dead buttons or unfinished copy |
| Use drawn glyphs or `@graphics/icons` | Use emoji or Unicode warning symbols as icons |
| Underline links, always | Remove underlines or style links as buttons |
| Give an accessible name and focus ring to every interactive element | Make div-buttons that do nothing on the keyboard |
| Keep hidden text out of the DOM (build-time redaction) | Hide withheld text with CSS |

## 9. Visual review

`src/design/gallery/Gallery.tsx` renders every primitive and a specimen of each of the 13 templates (samples in `gallery/samples.ts`). For local review, run `npx vite` and open `/src/design/gallery/preview.html` (add `?t=docs` for the templates).
