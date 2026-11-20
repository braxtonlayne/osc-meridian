/** Canon fragment schema: content/canon/apps/strike.json (Hardened Site Survivability Estimator). */
import { z } from 'zod';

const finite = z.number().finite();
const pos = finite.positive();
const msgId = z.string().regex(/^msg-\d{2}-\d{5}$/);

export const schema = z.strictObject({
  $comment: z.string().optional(),
  caveat: z.string().min(1),
  earthRadiusMi: pos,
  defaultYieldKt: pos,
  listingRangesMi: z.array(pos).min(1),
  defaultListingRangeMi: pos,
  cursorStepsMi: z.tuple([pos, pos, pos]),
  plotMarginFactor: pos,
  plotMinSpanMi: pos,
  registerPrefix: z.string().regex(/^[A-Z0-9]+$/),
  registerShowLimit: z.number().int().positive(),
  /** OIA review query references are OIA-YY-(base + n). */
  queryRefBase: z.number().int().min(0).max(899),
  compassPoints: z.array(z.strictObject({ id: z.string().regex(/^[NESW]{1,3}$/), deg: finite.min(0).max(360) })).length(16),
  deltaWithholding: z.strictObject({ authority: z.string().min(1), reference: z.string().min(1) }),
  positionWithholding: z.strictObject({ compartment: z.string().min(1) }),
  refusals: z.strictObject({
    tier4: z.strictObject({ authority: z.string(), reference: z.string(), reason: z.string(), requirement: z.string() }),
    auditorRegister: z.string().min(1),
    isolated: z.string().min(1),
    positionNotHeld: z.string().min(1),
    withdrawOthers: z.string().min(1),
    queryOwn: z.string().min(1),
  }),
  messages: z.strictObject({ ownSite: msgId, reviewQuery: msgId, probationerEntry: msgId, egressBasis: msgId }),
  gazetteer: z.array(
    z.strictObject({ name: z.string().min(1), state: z.string().length(2), lat: finite.min(24).max(50), lon: finite.min(-125).max(-66) }),
  ),
});

export type StrikeCanon = z.infer<typeof schema>;
