/**
 * Canon fragment schema for the Emergency Broadcast / Public Address console
 * (content/canon/apps/pa.json). Imports only zod: canon-merge loads it in Node.
 */
import { z } from 'zod';

const int = z.number().int().finite();
const posInt = int.positive();
const facilityId = z.string().regex(/^(ALPHA|BETA|GAMMA)-\d{2}$/);
const classId = z.enum(['ALPHA', 'BETA', 'GAMMA']);
const hhmm = z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/);
const msgNo = z.string().regex(/^\d{2}$/);
const zoneId = z.string().regex(/^[ABG]\d{2}-(Z\d{2}|ALL|MP\d+|[A-Z]+)$/);
const toneId = z.enum(['PRE', 'ALERT', 'EVAC', 'SEAL', 'CLEAR']);

const message = z.strictObject({
  no: msgNo,
  /** null only for a withheld library entry. */
  title: z.string().min(1).nullable(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  pre: toneId.nullable(),
  post: toneId.nullable(),
  durationSec: posInt,
  repeat: posInt,
  classes: z.array(classId).min(1),
  use: z.enum(['operator', 'drill', 'isolation', 'test', 'withheld']),
  /** null only for a withheld library entry: the text is never shipped. */
  text: z.string().min(1).nullable(),
});

export const schema = z
  .strictObject({
    system: z.strictObject({
      name: z.string().min(1),
      controller: z.string().min(1),
      consoleNo: z.string().min(1),
      procedureDocNo: z.string().min(1),
      libraryDocNo: z.string().min(1),
      logRetentionDays: posInt,
      queueLapseSec: posInt,
      logLimit: posInt,
    }),
    priorities: z.array(z.strictObject({ level: posInt, name: z.string().min(1), note: z.string().min(1) })).length(5),
    tones: z.array(
      z.strictObject({
        id: toneId,
        name: z.string().min(1),
        steps: z.array(z.strictObject({ cue: z.enum(['chime', 'tone']), ms: posInt })).min(1),
      }),
    ),
    messages: z.array(message).min(1),
    withheld: z.strictObject({ no: msgNo, carriedFrom: z.string().min(1), auth: z.string().min(1), ref: z.string().min(1) }),
    testWindow: z.strictObject({ weekday: int.min(0).max(6), startZ: hhmm, endZ: hhmm, label: z.string().min(1) }),
    speakers: z.strictObject({ ALPHA: posInt, BETA: posInt, GAMMA: posInt }),
    zonesPerRack: posInt,
    unassignedZones: z.array(z.strictObject({ site: facilityId, zone: z.string().regex(/^\d{2}$/), rack: posInt, speakers: posInt })),
    divisionZones: z.array(
      z.strictObject({ id: zoneId, site: facilityId, division: z.string().min(1), levels: z.array(int.nonnegative()).min(1), name: z.string().min(1) }),
    ),
    networkKey: z.strictObject({ keyNo: z.string().min(1), heldBy: z.string().min(1) }),
    history: z.array(
      z.strictObject({
        id: z.string().regex(/^PA-\d{4}-\d{4}$/),
        date: z.string().regex(/^2008-0[1-5]-\d{2}$/),
        time: hhmm,
        site: facilityId,
        zones: z.array(zoneId).min(1),
        msg: msgNo,
        by: z.string().min(1),
        status: z.enum(['COMPLETE', 'PRE-EMPTED', 'CANCELLED', 'LAPSED']),
      }),
    ),
  })
  .superRefine((v, ctx) => {
    const nos = new Set<string>();
    for (const m of v.messages) {
      if (nos.has(m.no)) ctx.addIssue({ code: 'custom', message: `duplicate message number ${m.no}` });
      nos.add(m.no);
      if ((m.text === null) !== (m.use === 'withheld')) ctx.addIssue({ code: 'custom', message: `message ${m.no}: text is null exactly when withheld` });
      if ((m.title === null) !== (m.use === 'withheld')) ctx.addIssue({ code: 'custom', message: `message ${m.no}: title is null exactly when withheld` });
    }
    if (!nos.has(v.withheld.no)) ctx.addIssue({ code: 'custom', message: 'withheld.no is not in the library' });
    for (const h of v.history) if (!nos.has(h.msg)) ctx.addIssue({ code: 'custom', message: `history ${h.id}: unknown message ${h.msg}` });
    const tones = new Set(v.tones.map((t) => t.id));
    for (const m of v.messages) for (const t of [m.pre, m.post]) if (t && !tones.has(t)) ctx.addIssue({ code: 'custom', message: `message ${m.no}: unknown tone ${t}` });
  });

export type PaCanon = z.infer<typeof schema>;
export type PaMessage = PaCanon['messages'][number];
export type PaToneId = z.infer<typeof toneId>;
