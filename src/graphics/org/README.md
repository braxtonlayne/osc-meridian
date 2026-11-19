# @graphics/org

Organisation chart and tier pyramid for the Personnel System. Every name, personnel number and count is read (or summed) from canon; nothing is typed by hand.

## Exports

```ts
OrgChart({ root?, sessionTier, onSelectPerson?, onSelectUnit?, width?, height? })
TierPyramid({ width, height, highlightTier? })
type OrgChartProps, TierPyramidProps, OrgRoot, OrgNode, OrgNodeKind
```

### OrgChart

| Prop | Meaning |
|---|---|
| `root` | `'COUNCIL'` (default), a division id (`'RD'`) or a facility id (`'ALPHA-03'`). Unknown ids fall back to the Council chart. |
| `sessionTier` | The session's tier. A person whose `tier < sessionTier` has the name replaced by a black bar sized to the name's length. The name is not put in the DOM. Personnel numbers stay visible. |
| `onSelectPerson(pn)` | A person box was activated, or the head/commander lines (name and number) of a unit box. Fires for withheld names too; the caller decides what the record shows. |
| `onSelectUnit(unitId)` | The title strip of a unit box (or the whole box when it has no head). `unitId` is a division id, facility id, class id, or one of `COUNCIL`, `DIVISIONS`, `FACILITIES`, `ACCOUNTING`, `POSTED`. |
| `width`, `height` | Fixed size in px. Omitted: the chart fills its container and follows it with a ResizeObserver. |

Structure (root `COUNCIL`): a row of seat boxes labelled by seat number and category only, then the Core Council, then two groups. DIVISIONS holds the divisions, each with its head and listed staff. FACILITY COMMANDS holds the four classes, each with its facilities, each with its commander and command staff. Tier 1 roster entries never appear as people. A facility root also lists the divisions resident at that site.

PERSONNEL ACCOUNTING sits under Personnel & Vetting and carries the total personnel figure, with two count boxes beneath it: POSTED TO FACILITIES (total posted staff) and DETACHED / UNPOSTED (`headline.staffUnposted`). The unposted box has no expand control and no children. Activating it shows the note "No organisational assignment of record." and calls neither callback. Roster entries whose site is DETACHED / UNPOSTED are left off the chart.

Layout is `d3-hierarchy`'s tidy tree with orthogonal elbow connectors. Children that are not themselves expanded hang under their parent in columns (spine on the left, one tick per box). Each column is given to d3 as a chain so the tidy tree reserves its depth. Expanding a box in a column moves it out to the right of the columns as an ordinary branch.

View controls:

- Buttons top left: zoom in, zoom out, Fit, and the current zoom.
- Keyboard, with focus anywhere in the chart: arrow keys pan, `+` / `-` zoom, `F` or `0` fits, `Esc` dismisses the unposted note.
- Mouse: wheel zooms about the pointer, drag pans.
- Each box with children has an expand / collapse button (`aria-expanded`). The toggled box keeps its place on screen. Fit is applied when the chart opens, when `root` changes and when the viewport resizes, never on expand.

### TierPyramid

Four stacked bands, Tier 1 at the top, with tier name and clearance name on the left and the headcount on the band. **Band width is proportional to the square root of headcount** (a linear scale leaves the Tier 1 band of 11 under 4 px wide); the chart says so in its footnote. Tier 4 is narrower than Tier 3 because its count is lower; the bands are not forced into a taper.

The side bracket is linear: total personnel on the outer bracket, total posted staff on the upper part of the inner bracket, and the difference labelled DETACHED / UNPOSTED on the lower part. The bracket is a reconciliation of totals and is not aligned to the tier bands (canon does not say which tiers the unposted belong to); the footnote says this too. Needs about 640 px of width.

`highlightTier` darkens one band and shades its label row.

## Look

Flat fills from `src/design/tokens.css` only, 1px lines, IBM Plex Sans 10 to 12px, IBM Plex Mono for numbers and figures. No gradients, no shadows other than the standard 1px bevel on the view buttons, no animation. Selectors are prefixed `.org-` and `.tp-`.

## Files

| File | Purpose |
|---|---|
| `index.tsx` | `OrgChart`, re-exports |
| `TierPyramid.tsx` | `TierPyramid` |
| `model.ts` | canon to chart tree, default expansion, withholding rule |
| `layout.ts` | d3-hierarchy layout, hanging columns, connector paths |
| `org.css` | styles |
| `preview.html`, `preview.tsx` | check page (`#council`, `#division=RD`, `#facility=ALPHA-01`, `#pyramid`, `#pyramid=3`, plus `&tier=N`) |
| `check/render.mjs` | renders the check images |

## Rendered check

`node src/graphics/org/check/render.mjs` bundles the preview with esbuild and screenshots it in Playwright Chromium at 1400 x 900. It also asserts by log that the unposted box has no expand control and prints the refusal note.

| Image | Shows |
|---|---|
| `check/org-council-t3.png` | Council chart at session tier 3: seat row, groups, divisions in hanging columns, Personnel & Vetting open to the accounting boxes, Tier 2 names withheld |
| `check/org-council-t1.png` | Same chart at session tier 1: no names withheld |
| `check/org-council-expanded.png` | Records Division, class ALPHA and ALPHA-03 expanded, then Fit |
| `check/org-division-RD.png` | Division subtree |
| `check/org-facility-ALPHA-01.png` | Facility subtree with resident divisions |
| `check/org-unposted-refusal.png` | The note shown on activating DETACHED / UNPOSTED |
| `check/pyramid.png`, `check/pyramid-highlight-3.png` | Tier pyramid, plain and with Tier 3 picked out |
