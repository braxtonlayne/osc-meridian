# MERIDIAN

A static, browser-based recreation of a fictional 2008 government intranet: the
workstation environment of the "Office of Strategic Continuity". You log in to a
terminal and get a desktop with windows, documents, mail, forms, maps and a
terminal.

**This is fiction.** The agency, its people, facilities and documents do not
exist and are not based on any real agency. Nothing you type is transmitted
anywhere: there is no server, no analytics, and no request to any third party.
Any state is kept in your own browser.

## Requirements

- Node.js 24 and npm

## Run locally

```sh
npm install
npm run dev        # http://localhost:5178
npm run build      # production build into dist/
npm run preview    # serves dist/ at http://localhost:5179
```

## Deploy to GitHub Pages

1. Create a GitHub repository named `osc-meridian`.
   - If you use another name, change `MERIDIAN_BASE=/osc-meridian/` to
     `MERIDIAN_BASE=/<repo>/` in the `build:pages` script in `package.json`
     (and `SUBPATH` in `scripts/rehearse-pages.ts` if you use `npm run rehearse`).
2. Push the `main` branch.
3. In the repository, go to Settings → Pages → Source and choose **GitHub Actions**.

`.github/workflows/pages.yml` runs the unit tests, builds with `npm run build:pages`
and publishes `dist/` on every push to `main` (or manually via "Run workflow").

To rehearse the deploy locally under the `/osc-meridian/` subpath, run
`npm run rehearse` (builds, serves like Pages, runs the Playwright suite).

## Tests

```sh
npm run test:unit   # Vitest
npm run test:dist   # checks the built dist/ (run after a build)
npm run test:e2e    # Playwright browser tests
```

`npm test` runs `test:unit` and `test:dist`.

## Adding a page

Pages are Markdown files under `content/<family>/`. Figures come from canon
(`content/canon/`), not from the page text. `npm run build` regenerates the
content and prerenders every route.

## Layout

- `content/`: page sources (Markdown), one folder per application family
- `content/canon/`: canon data, the single source of truth for every figure
- `scripts/`: canon merge, content build, prerender, dist checks, Pages rehearsal
- `src/core`: shared services and contracts: session, router, search, audit, persistence
- `src/shell`: boot and lock screens, desktop, window manager, taskbar
- `src/apps`: the applications (registry, transit, mail, forms, terminal, ...)
- `src/graphics`: code-drawn graphics (maps, tunnel diagrams, seals, banners, charts)
- `src/narrative`: the in-world event and progression engine
- `docs/`: spec, canon notes, style guide, decisions

## Further reading

- `docs/DECISIONS.md`: design and build decisions
- `docs/AGENTS-LOG.md`: build log
- `docs/NARRATIVE.md` contains spoilers.
