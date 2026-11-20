/** Canon fragment schema: content/canon/apps/hoist.json (Shaft Hoist Control). */
import { z } from 'zod';

const num = z.number().finite();
const pos = num.positive();
const int = z.number().int().finite();
const account = z.enum(['analyst', 'lifesupport', 'deputy', 'auditor']);
const msgId = z.string().regex(/^msg-\d{2}-\d{5}$/);

export const schema = z.strictObject({
  $comment: z.string().optional(),
  model: z.strictObject({
    /** Creep speed for the final approach to a landing. */
    creepFpm: pos,
    /** Distance run at creep speed before a landing. */
    creepFt: num.nonnegative(),
    /** Speed limit in INSPECTION mode (inching). */
    inspectionFpm: pos,
    /** A cage within this distance of a landing depth is at the landing. */
    levelToleranceFt: pos,
    /** Half-width of the landing zone each shaft vane signals. */
    landingZoneFt: pos,
    /** Normal overtravel allowance beyond the end landings before the final limit. */
    overtravelFt: pos,
    /** Emergency brake deceleration. */
    estopDecelFtps2: pos,
    /** Overspeed trip, percent of rated rope speed. */
    overspeedPct: pos,
    /** Load-cell allowance per person. */
    personLb: pos,
    /** Load weighing: warning band and meter full scale, percent of rated payload. */
    loadWarnPct: pos,
    loadScalePct: pos,
    /** Onsetter's loading report steps. */
    personStep: int.positive(),
    freightStepLb: pos,
    gateCycleSec: pos,
    /** AUTO mode: gates held open at a landing before the next call is served. */
    dwellSec: pos,
    brakeTestSec: pos,
    brakeTestTorquePct: pos,
    /** Emergency stop actuator hold time. */
    estopHoldMs: int.positive(),
    /** Inspection before a tripped hoist is returned to service from the winder house. */
    estopInspectionMin: pos,
    /** AUTO mode: largest share of cage capacity boarding at a landing. */
    autoLoadMaxPct: pos,
    recorderEvents: int.positive(),
    /** Highest (least restricted) issued tier that holds driver authority at its own site. */
    driverMaxTier: int.min(1).max(4),
  }),
  landingCompartments: z.array(
    z.strictObject({
      facility: z.string().regex(/^ALPHA-\d{2}$/),
      level: int.nonnegative(),
      compartment: z.enum(['KESTREL', 'HOLLOW', 'SEXTANT', 'TALLOW', 'BRIAR', 'QUARRY', 'LANTERN']),
    }),
  ),
  sumpVanes: z.array(
    z.strictObject({
      hoist: z.string().regex(/^A\d{2}-H\d$/),
      belowBottomFt: pos,
      finalLimitBelowBottomFt: pos,
    }),
  ),
  docs: z.strictObject({ procedure: z.string().min(1), dataSheet: z.string().min(1) }),
  mail: z.strictObject({
    restrictedCall: z.partialRecord(account, msgId),
    estop: z.partialRecord(account, msgId),
    overload: z.partialRecord(account, msgId),
    position: z.partialRecord(account, msgId),
    oiaEstop: msgId,
  }),
});

export type HoistCanon = z.infer<typeof schema>;
