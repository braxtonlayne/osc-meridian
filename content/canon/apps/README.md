# App canon fragments

One JSON file per app, `<appId>.json`, merged by `npm run canon` into `canon.apps[<appId>]`. The optional Zod schema for each file is `src/core/canon-apps/<appId>.ts`. The convention, the rules and how to read a fragment from an app are in `src/core/canon-apps/README.md`.
