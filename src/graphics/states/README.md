# @graphics/states

Empty, error and refusal states (asset family 15). Message panels in the manner of a 2008
records-management thick client: grey, exact, undramatic. Drawn in code (inline SVG + HTML);
colours and faces come only from design tokens.

```tsx
import { RefusalState, EmptyState, ErrorState, PathNotFound, WithheldBlock, RedactionBar } from '@graphics/states';
```

## Exports

| Export | Props | Use |
|---|---|---|
| `RefusalState` | `authority, ref, reason, requirement?, docNo?, onRequestAccess?, compact?, heading?` | Window content when `access` is not satisfied. Fills its container. The "Request access (OSC Form 21)…" button appears only when `onRequestAccess` is given. `compact` is a one-row inline form for lists and table cells. |
| `EmptyState` | `title, body?, icon?` | Quiet "nothing here" for list panes. `icon` is `'tray'` (default), `'folder'`, `'search'`, `'printer'`, `'mail'`, or any node. |
| `EmptyFolder` `EmptySearchResults` `EmptyPrintQueue` `EmptyMailFolder` | `name?` / `query?` / `device?` / `folder?` | Ready-worded variants. |
| `ErrorState` | `code, title, body, detail?, defaultOpen?, actions?` | In-world system error. "Details >>" discloses a mono trace (`detail`, or one derived from `code` by `traceForCode`). The code sits in a read-only field with a Copy button. |
| `PathNotFound` | `path, onSearch?, onHome?` | Answer to an unknown deep link. Buttons appear only when their handlers are given. |
| `WithheldBlock` | `authority, ref, lines, label?` | A whole section withheld: `lines` rows of black bars. The bar plan is seeded from authority + ref + lines, so it is identical on every render and in prerendered HTML. |
| `RedactionBar` | `chars, authority?, ref?, variant?` | One black bar sized by character count. `variant`: `inline` (default), `field` (fills the cell), `sentence` (word-length pieces that wrap with the paragraph). |
| `StateGlyph` | `id, size?` | The drawn glyphs: `locked tray folder search printer mail error path`. |
| `StateButton` | `onClick, children, primary?, small?` | Bevelled push button, for `ErrorState`'s `actions` slot. |
| `traceForCode`, `withheldLines` | | The deterministic generators, exported for tests. |

`ref` is an ordinary string prop here (Preact 11 passes `ref` through to function components).

## Notes for integrators

- **Tokens used** (no literal colours in `states.css`): `--chrome-face --chrome-hi --chrome-shadow
  --chrome-outer --surface --paper --text-1 --text-2 --text-3 --font-ui --font-mono --redact
  --st-fault --st-offline`. The stylesheet has no fallbacks; the tokens must be defined.
- `states.css` is imported by `index.tsx`. Selectors are all `.st-*` and are unlayered.
- Panels (`RefusalState`, `ErrorState`, `PathNotFound`, `EmptyState`) take `width/height: 100%` and
  scroll internally; put them in a sized window content box.
- `RedactionBar` renders `<span class="rx st-rx" data-len data-auth data-ref>`, the same class and
  data attributes as the pipeline's redaction span. Width is `data-len × 1ch × --rx-ch-scale`
  (0.9 in proportional text, 1 inside `.st-mono`), passed as the `--rx-len` custom property. The
  design system's Redaction primitive can reuse `.st-rx` by setting `--rx-len`.
- No component is ever passed withheld text. Hover (`title`) and the accessible name give only the
  withholding authority and reference.
- Audit logging (`redaction.hover`, `window.open`) is the caller's job; these are presentational.
- Wording stated as fact by `RefusalState`: the attempt "has been entered in the audit log". The
  caller should log `window.open` when showing it.

## Rendered check

```
node src/graphics/states/check/render.mjs
```

Bundles `check/preview.tsx` with esbuild, opens it in headless Chromium (Playwright) and writes one
PNG per state into `check/` at a 640×420 window size, inside a stand-in window frame with the
SPEC §4 token values. It also clicks "Details >>" and reports the withheld bar plan.

`refusal` `refusal-min` `refusal-compact` `empty-folder` `empty-search` `empty-print` `empty-mail`
`empty-generic` `error` `error-open` `path` `withheld` `glyphs`
