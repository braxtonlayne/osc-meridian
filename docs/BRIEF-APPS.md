# Shared brief: application agents

You build one MERIDIAN application. Repo: C:\Users\braxt\Desktop\osc-meridian (Windows; absolute paths; Vite 8, TypeScript strict, Preact 11, @preact/signals). **Do not commit.**

## Read first
- `docs/SPEC.md` §2, §4, §7 and your app's part of §8.
- `docs/CONTRACTS.md` and `src/core/contracts.ts` (`AppProps`, `WindowHandle`, `Services`).
- `docs/STYLE.md` and `src/design/index.ts` (primitives, `DocumentView`).
- The README of each graphics module you use under `src/graphics/*`.
- `src/shell/` (skim): how windows host apps and how `useServices()` works. Also `src/apps/index.ts`, which registers your app.
- `content/manifest.json`: every page whose `app` is your app id.
- `docs/NARRATIVE.md`: the parts that touch your app. It is spoiler material, so never surface the graph in the UI.
- `docs/DECISIONS.md`.

## You own
`src/apps/<id>/**`: replace the `// SCAFFOLD STUB`. Keep `export default function App(props: AppProps)`. Write anything extra only where your brief says.

## Must
- **Real application chrome:**
  - A menu bar (`MenuBar`) whose every item does something; where an action isn't available, show an in-world refusal.
  - A toolbar where sensible, and a status bar (`StatusBar`) with live, meaningful panes.
  - Keyboard access throughout.
  - Call `props.win.setTitle(title, docNo)` and `props.win.setMarking(marking)`. The marking is the highest marking of what's on screen.
- **Routes:** handle every manifest route for your app (`props.route`), plus the home view when `route` is null. A route that is a document loads it with `services.docs.load(route.id)` and renders it with `DocumentView` (pass `markings`, `onNavigate={services.openRoute}`, and `onRedactionHover` → `services.audit.log('redaction.hover', …)`), surrounded by your app's interactive views for that page. When moving to another route of your app, use `props.win.navigate(route)`.
- **Audit:** log `doc.read` (subject = docNo) when a document is shown, plus your app's other audit kinds as listed in CONTRACTS.
- **Clearance:**
  - If `route.access` isn't satisfied (`services.clearance.satisfies`), show `RefusalState` from `@graphics/states` (prop `reference`, not `ref`) and log `window.open`.
  - Restricted canon values arrive as redaction sentinels: use `isRx` / `rxInfo` from `src/core/rx.ts` (being added in parallel; if it's missing when you start, code against those names and check again before you finish) and render the `Redaction` primitive.
- **No hand-typed figures.** Every number comes from `import canon from '@canon'` or from document content.
- **Tokens only** (`var(--…)`), no emoji, no dead controls, no placeholder text, nothing dramatic. Run the honesty test from SPEC §4 on every screen.
- **Performance:** keep heavy libraries out of the shell chunk. Your app is already a lazy chunk; import Three, xterm and uPlot dynamically inside it. Use your own worker files where briefed.
- **Small screens:** the app must work in handheld mode (a single window, under 900px wide).

## Testing without collisions
Content agents are writing `content/**` at the same time. To get test data, run `npx tsx scripts/build-content.ts --lenient` (bad files are skipped). If it fails, wait and retry. Run your own dev server on your assigned port only: `npx vite --port <PORT> --strictPort`. Drive it with Playwright (Chromium is installed): log in with canon operator credentials (any input is accepted), open your app, exercise every view, take screenshots into `src/apps/<id>/check/`, inspect them with the Read tool, and iterate. Kill your server when you finish. Unit-test any pure logic (sims, calculators, parsers) in `src/apps/<id>/*.test.ts` (vitest picks up `src/**/*.test.ts`).

## Report (under 300 words)
- the views and routes covered
- the audit events emitted
- what you need from the shell or engine
- the screenshots you checked
- typecheck, lint and test results
- anything not verified
