/**
 * Canon fragment schema for the doors app (content/canon/apps/doors.json).
 * Door definitions themselves are canon `doors` (extended-c); this holds the board's model
 * constants, the cycle-log history seeded on the board, and the message ids it delivers.
 */
import { z } from 'zod';

const num = z.number().finite();
const nonNeg = num.min(0);
const int = z.number().int().finite();
const iso = z.string().regex(/^2008-0[1-5]-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'in-world ISO time, on or before 2008-05-31');
const byKind = z.strictObject({ portal: nonNeg, blast: nonNeg, airlock: nonNeg });

export const schema = z.strictObject({
  $comment: z.string().optional(),
  /** Door motion: a door's canon cycleSec covers unlock + travel (open) and travel + dog (close). */
  motion: z.strictObject({
    /** Bolt withdrawal before the leaf moves. */
    unlockSec: byKind,
    /** Bolt drive after the leaf seats. */
    dogSec: byKind,
    /** A normally closed door open longer than this raises DOOR HELD OPEN. */
    heldOpenSec: byKind,
  }),
  /** Airlock cycle: 4 leaf strokes + 2 dwells + 2 equalizations = canon airlock cycleSec. */
  airlock: z.strictObject({
    dwellSec: nonNeg,
    equalizeSec: nonNeg,
    /** Badge-counted persons per cycle (chamber rating). */
    maxPersons: int.min(1),
  }),
  /** Shelter overpressure and leaf permissives, in `unit` relative to outside. */
  pressure: z.strictObject({
    unit: z.string().min(1),
    insideDp: num,
    deconDp: num,
    leafOpenMaxDp: nonNeg,
    lowAlarmDp: num,
    meterMax: num,
  }),
  /** Watch changes, hours Zulu. */
  shiftChangeZ: z.array(int.min(0).max(23)).min(1),
  /** Site-local time shown beside Zulu for these sites only. */
  localZones: z.array(z.strictObject({ facility: z.string().min(1), offsetH: int, label: z.string().min(1) })),
  /** Cycle-log lines kept in the shared state. */
  logCap: int.min(10),
  /** Days of cycle log the board retains (history older than this is not shown). */
  logRetentionDays: int.min(1),
  /** Key switch numbers (interlock bypass) are issued to the site duty officer. */
  bypassKeyPrefix: z.string().min(1),
  mail: z.strictObject({
    override: z.string().min(1),
    overrideOia: z.string().min(1),
    interlock: z.string().min(1),
    interlockOia: z.string().min(1),
    shift: z.string().min(1),
    noRecord: z.string().min(1),
  }),
  /** Cycle log lines recorded before the board session (in-world). */
  history: z.array(
    z.strictObject({
      site: z.string().min(1),
      door: z.string().min(1),
      level: int,
      event: z.string().min(1),
      at: iso,
      by: z.string().min(1),
      count: int.min(0).nullable(),
      note: z.string(),
    }),
  ),
});

export type DoorsCanon = z.infer<typeof schema>;
