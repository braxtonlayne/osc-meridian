# Per-app canon schemas

Every number a pass-two app uses that is not already in canon lives in a canon fragment, never in code:

| File | Owner | Purpose |
|---|---|---|
| `content/canon/apps/<appId>.json` | that app's agent | The data (model constants, plant parameters, message library, ...) |
| `src/core/canon-apps/<appId>.ts` | that app's agent | `export const schema` (Zod) that validates the fragment, plus `export type <App>Canon = z.infer<typeof schema>` |

`<appId>` is the file name and must be an `AppId` (src/core/contracts.ts). `npm run canon` merges each fragment into `canon.apps[<appId>]` of both `canon.json` and the client canon, and validates it against the schema when the `.ts` file exists (a fragment without a schema is merged and listed in a warning). A schema failure stops the merge.

Reading it in the app:

```ts
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { StrikeCanon } from '@core/canon-apps/strike';

const canon = canonJson as unknown as Canon;
const strike = canon.apps.strike as StrikeCanon;
```

Rules:
- Use `z.strictObject` and finite numbers, as in `src/core/canon-schema.ts`.
- Schema modules import only `zod` and types: canon-merge loads them in Node.
- Fragments ship to the browser as they are. No Tier 1 or Tier 2 values, no DELTA location detail, no restricted names. The client-canon scrub pass will replace any withheld canon string it finds with a redaction sentinel, which is a sign the fragment is wrong.
- Dates stay on or before 2008-05-31 (the canon date ceiling applies to fragments too).
- Shared plant figures (doors, cameras, hoists, muster points, seal drill timings, survivability model) are already in canon (`docs/canon/extended-c.md`). Read them from there; do not copy them into a fragment.
