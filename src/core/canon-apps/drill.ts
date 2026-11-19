/**
 * Canon fragment schema for the Seal Drill Coordinator (content/canon/apps/drill.json).
 * Class timings, relay intervals, timeScale and the sequence are canon `sealDrill`; this
 * holds the coordinator's own constants (late and NO REPORT rules, register history, mail ids).
 */
import { z } from 'zod';

const num = z.number().finite();
const nonNeg = num.min(0);
const int = z.number().int().finite();
const fac = z.string().regex(/^(ALPHA|BETA|GAMMA)-\d{2}$/, 'a non-DELTA FacilityId');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d <= '2008-05-31', 'on or before 2008-05-31');
const isoTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).refine((d) => d <= '2008-05-31', 'on or before 2008-05-31');
const msgId = z.string().regex(/^msg-\d{2}-\d{5}$/);

export const schema = z.strictObject({
  $comment: z.string().optional(),
  /** Drill numbers are "<prefix>-YY-MMDD-NN". */
  drillIdPrefix: z.string().min(1),
  /** Coordinator update interval, wall ms. */
  tickMs: int.min(50),
  /** Drill minutes the network is held sealed before Network Control stands it down. */
  holdMin: nonNeg,
  /** Network drills kept in the register. */
  registerCap: int.min(5),
  orderPosition: z.strictObject({
    keyNo: z.string().min(1),
    panelNo: z.string().min(1),
    secondOfficers: z.array(z.string().min(1)).min(1),
  }),
  /** A site whose staff breakdown carries exactly one duty officer acknowledges late by this much. */
  singleDutyOfficer: z.strictObject({ ackDelayMin: nonNeg, text: z.string().min(1) }),
  /** Months between the site's completion and the in-world date (whole months). */
  completion: z.strictObject({
    /** Below this: no seal report at all (NO REPORT). */
    acceptanceMonths: int.min(0),
    /** Below this: door cycle slower by doorDelayMin. */
    unpracticedMonths: int.min(0),
    doorDelayMin: nonNeg,
    acceptanceText: z.string().min(1),
    unpracticedText: z.string().min(1),
  }),
  /** Sites with a recorded drill: exempt from the completion rules. */
  drilledSites: z.array(z.strictObject({ facility: fac, date: isoDate, note: z.string().min(1) })),
  /** Calendar entries that defer a site's seal while in session (times from canon calendar). */
  calendarHolds: z.array(z.strictObject({ calendarId: z.string().min(1), facility: fac, through: isoDate, text: z.string().min(1) })),
  /** Order-wire circuits that carry a site's acknowledgement (ackAtMin = drill minute from the order). */
  orderWire: z.array(z.strictObject({ facility: fac, ackAtMin: nonNeg, circuit: z.string().min(1) })),
  /** Register entries before this coordinator was commissioned. */
  history: z.array(
    z.strictObject({
      id: z.string().min(1),
      ordered: isoTime,
      ended: isoTime,
      scope: z.string().min(1),
      orderedBy: z.string().min(1),
      result: z.string().min(1),
      sites: int.min(0),
      sealed: int.min(0),
      late: int.min(0),
      noReport: int.min(0),
    }),
  ),
  mail: z.strictObject({
    report: msgId,
    noReport: msgId,
    circuitReply: msgId,
    deputyNote: msgId,
    oiaObserved: msgId,
    oiaUnobserved: msgId,
  }),
  docs: z.strictObject({ procedure: z.string().min(1), siteCard: z.string().min(1) }),
});

export type DrillCanon = z.infer<typeof schema>;
