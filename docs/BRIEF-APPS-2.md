# Shared brief: pass-two set-piece app agents

You build one MERIDIAN set-piece application. Repo: C:\Users\braxt\Desktop\osc-meridian (Windows; absolute paths; branch build/meridian-2; Vite 8, TypeScript strict, Preact 11, @preact/signals). **Do not commit.** Eleven other app agents are working in parallel on their own apps.

## Read first
- `docs/SPEC-2.md` (all of it) and `docs/SPEC.md` §2–§4 and §11. The honesty test applies to every screen.
- `docs/BRIEF-APPS.md`: every rule in it applies (real chrome, menus that all work, status bar, keyboard, handheld mode, title and marking, in-world refusals, tokens only, no hand-typed figures, lazy heavy libraries, testing method).
- `docs/CONTRACTS.md`, especially the "Pass two" section (ownership, shared plant state keys, shell reactions), and `src/core/contracts.ts` (pass-two types and Services: `account`, `traces`, `shared`, `sound.play/stop`, audit kinds `control` and `trace`).
- `docs/DECISIONS.md`, `docs/canon/extended-c.md`, `content/canon/extended-c.json` (accounts, survivability, sealDrill, doors, cameras, hoists, musterPoints), and `content/canon/apps/README.md` (the app-fragment convention).
- `src/graphics/panel/README.md` (the shared panel hardware kit: use it for every control, do not draw your own switches/lamps/meters), and the existing graphics modules you can reuse: `@graphics/map` (US map + markers), `@graphics/schematic` (rail/tram mimic), `@graphics/reactor` (one-line diagrams, gauges), `@graphics/depth3d` (`DepthSection2D` elevation), `@graphics/states`, `@graphics/icons` (your app icon and toolbar icons exist).
- `docs/NARRATIVE.md` for tone of consequences (spoiler; never surface it in the UI).

## You own
- `src/apps/<appId>/**` (replace the `// SCAFFOLD STUB`; keep `export default function App(props: AppProps)`), including `src/apps/<appId>/types.ts` with the type of your shared-state key.
- New graphics you need, in `src/graphics/<appId>/**` (you are an Opus agent; graphics drawn here are logged as Opus). Reuse existing modules first.
- `content/canon/apps/<appId>.json` + `src/core/canon-apps/<appId>.ts` (Zod schema): every number your app uses that is not already in canon (model constants, plant parameters, message library…). Run `npm run canon` after editing. Never hand-type figures in code.
- `content/<appId>/*.md`: 1–3 document routes (the operating procedure / reference sheet your panel is built to), routes `/<appId>/<slug>`, `app: <appId>`, `family: <appId>`, proper docNo per canon numbering (see docs/canon/extended-a.md), date ≤ 2008-05-19, marking, revision. Mark `t4: true` on any your app's Tier 4 users should read.
- `content/mail/<appId>/*.md`: your consequence messages (template `message`, family `mail`, routes `/mail/<id>`; see existing content/mail/*.md for the format and `{date}` slot).
- `docs/narrative-2/<appId>.md`: your secrets and consequence graph (spoiler; not shipped).
Touch nothing else. Need something from core/shell, another app's state, or a contract change? Put it in your report.

## Must (pass two)
- **Plant state:** your shared key (`services.shared`) holds the physical state so every account and every open tab sees the same plant. Only you write your key; read others' keys via `import type` from their `types.ts` (core-typed keys: `isolation`, `drill`, `dispatch`). React to `isolation.active` (most panels lose remote control or circuits) and to `drill` where it plausibly affects you.
- **Per-account behaviour:** use `services.account.def` (tier, site, role). Decide what each of the four accounts may do on your panel; refuse the rest in-world. The Tier 4 technician sees only their own site.
- **Sound cues** via `services.sound.play(cue)` (and `stop('alarm')`) at the moments real hardware would make a sound.
- **Audit:** log kind `control`, subject `<appId>:<action>`, a security-office `detail`, and `data` with specifics, for every operator action that changes state; plus `doc.read` for your document routes and `window.open` for refusals.
- **Mail consequences:** at least three messages your actions trigger (`services.mail.deliver(msgId, { slots })`; to another account: `services.traces.post({ to, kind: 'mail.deliver', msgId, subject })`). Idempotent: once per meaningful event, never spam.
- **At least one secret**: something discoverable by a curious operator that rewards attention (a hidden state, an anomaly that agrees with pass-one canon discrepancies, an undocumented control position…), written in the same deadpan voice. Record it in `docs/narrative-2/<appId>.md`.
- **Spectacle within the art direction:** motion is functional (mimic lines filling, doors stepping through positions, counters), never cinematic. Respect reduced motion.
- **Performance:** your app is a lazy chunk; Canvas/WebGL/uPlot imports stay inside it; long sims in a worker or rAF loop that stops when the window is minimised or closed.

## Testing
Build content: `npx tsx scripts/build-content.ts --lenient`. Dev server on your assigned port only: `npx vite --port <PORT> --strictPort`. Playwright (Chromium installed): sign in as each relevant account (lock screen offers four cards; any input accepted), exercise every view and control, screenshots into `src/apps/<appId>/check/`, read them, iterate. Unit-test pure logic in `src/apps/<appId>/*.test.ts`. Run `npx tsc --noEmit` (report only your errors; others are mid-change), `npx eslint src/apps/<appId> src/graphics/<appId>`, `npx vitest run src/apps/<appId>`. Kill your server.

## Report (under 300 words)
Views and controls built; per-account rules; shared-state key shape; sound cues; audit subjects; mail messages and triggers; the secret (one line); what you need from core/shell/others; screenshots checked; test results; anything unverified.
