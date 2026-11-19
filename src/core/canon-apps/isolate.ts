/** Canon fragment schema for the isolate app (content/canon/apps/isolate.json). */
import { z } from 'zod';

const n = z.number().finite();
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/);
const msgId = z.string().regex(/^msg-\d{2}-\d{5}$/);

const recipient = z.union([z.literal('initiator'), z.literal('network'), z.enum(['analyst', 'lifesupport', 'deputy', 'auditor'])]);

const level = z.strictObject({
  /** Escalation level reached by this initiation (1..5). */
  n: z.number().int().min(1).max(5),
  title: z.string().min(1),
  holdMs: n.positive(),
  /** Minutes until the isolation clears by itself; null = restoration procedure only. */
  clearsAfterMin: n.positive().nullable(),
  restoration: z.enum(['automatic', 'automatic-or-certificate', 'certificate', 'none']),
  /** Fit a tamper seal to the cover when this level's isolation is restored. */
  sealOnRestore: z.boolean(),
  /** Operator steps to actuate at this level: 2 = lift + hold, 3 = break seal + lift + hold. */
  steps: z.union([z.literal(2), z.literal(3)]),
  consequences: z.array(z.string().min(1)).min(1),
  mail: z.array(z.strictObject({ msg: msgId, to: recipient })),
});

export const schema = z.strictObject({
  panel: z.strictObject({
    tag: z.string().min(1),
    plate: z.array(z.string().min(1)).min(1),
    station: z.string().min(1),
    controlRoom: z.string().min(1),
    refPrefix: z.string().min(1),
    certPrefix: z.string().min(1),
    procedureDocNo: z.string().min(1),
    scheduleDocNo: z.string().min(1),
    restorationForm: z.string().min(1),
    statementMaxChars: z.number().int().positive(),
    statementMinChars: z.number().int().positive(),
  }),
  levels: z.array(level).length(5),
  seals: z.array(z.string().min(1)).min(1),
  outcomeMail: z.strictObject({ approved: msgId, returned: msgId, sealBroken: msgId }),
  archived: z.array(
    z.strictObject({
      ref: z.string().min(1),
      at: iso,
      pn: z.string().min(1),
      workstation: z.string().min(1),
      level: z.number().int().min(1).max(5),
      restoredAt: iso,
      restoration: z.string().min(1),
      statement: z.string().min(1),
    }),
  ),
  counter: z.strictObject({ zeroedOn: iso, note: z.string().min(1) }),
});

export type IsolateCanon = z.infer<typeof schema>;
export type IsolateLevelCanon = IsolateCanon['levels'][number];
export type IsolateRecipient = IsolateLevelCanon['mail'][number]['to'];
