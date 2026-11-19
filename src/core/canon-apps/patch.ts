/**
 * Canon fragment schema for the Hub Circuit Patch Panel (content/canon/apps/patch.json).
 * Circuit list, line quality figures, test and call timing, the exchange desks that answer
 * line-check calls. Imports only zod (canon-merge loads this module in Node).
 */
import { z } from 'zod';

const num = z.number().finite();
const site = z.string().regex(/^(ALPHA|BETA|GAMMA)-\d{2}$/);

const desk = z.strictObject({
  ext: z.string().regex(/^\d{4}$/),
  /** Section name as listed; null for a number the exchange does not list. */
  section: z.string().min(1).nullable(),
  answer: z.string().min(1),
  reply: z.string().min(1).nullable(),
  rings: z.number().int().min(1).max(10),
  listed: z.boolean(),
  /** Staffed hours in Zulu [from, to); outside them the desk does not answer. */
  hoursZ: z.tuple([z.number().int().min(0).max(23), z.number().int().min(1).max(24)]).optional(),
});

const ringdown = z.strictObject({
  section: z.string().min(1).nullable(),
  answer: z.string().min(1),
  reply: z.string().min(1).nullable(),
  rings: z.number().int().min(1).max(10),
});

export const circuitSchema = z.strictObject({
  id: z.string().regex(/^[A-Z]\d{2}-[A-Z]{1,2}\d$/),
  kind: z.enum(['VF', 'DATA', 'SPARE', 'MAINT']),
  class: z.enum(['trunk', 'network', 'local']),
  a: site,
  b: site.nullable(),
  route: z.string().min(1),
  status: z.enum(['IN SERVICE', 'SPARE', 'NOT ASSIGNED']),
  /** Circuit order of record (CMS work order), null for spares. */
  order: z.string().regex(/^CMS-\d{2}-\d{4}$/).nullable(),
  use: z.string().min(1),
  /** Voice-frequency figures (VF, SPARE, MAINT). null where a pair is open. */
  expectedLossDb: num.nullable().optional(),
  lossDb: num.nullable().optional(),
  noiseDbrnc0: num.nullable().optional(),
  snrDb: num.nullable().optional(),
  /** Data bearer figures (DATA). */
  berExp: z.number().int().min(-14).max(-3).optional(),
  esPerHour: z.number().int().min(0).optional(),
  ringdown: z.boolean().optional(),
  fault: z.string().min(1).optional(),
});

export const schema = z.strictObject({
  panel: z.strictObject({
    title: z.string().min(1),
    bayPrefix: z.string().min(1),
    stripWidth: z.number().int().min(4).max(24),
    procedureDocNo: z.string().min(1),
    registerDocNo: z.string().min(1),
    maintenanceDocNo: z.string().min(1),
    authorisedOrderPrefix: z.string().min(1),
    logLimit: z.number().int().min(10).max(500),
  }),
  limits: z.strictObject({
    lossToleranceDb: num,
    noiseWarnDbrnc0: num,
    noiseFailDbrnc0: num,
    snrMinDb: num,
    berFailExp: z.number().int(),
    esWarnPerHour: num,
    esFailPerHour: num,
  }),
  jitter: z.strictObject({ lossDb: num, noiseDb: num, snrDb: num, esPerHour: num }),
  monitor: z.strictObject({ speechDbm0: num, dataDbm0: num, floorDbm0: num, noiseRefDbm0: num }),
  tests: z.strictObject({
    toneS: num,
    toneDbm0: num,
    toneHz: num,
    loopS: num,
    qualitySamples: z.number().int().min(5).max(120),
    sampleMs: z.number().int().min(100),
    historyHours: z.number().int().min(6).max(72),
    chartNoiseMin: num,
    chartNoiseMax: num,
    chartEsMax: num,
  }),
  traffic: z.strictObject({ slotSeconds: z.number().int().min(10), voiceBusy: num, maintBusy: num, unassignedLive: num }),
  calls: z.strictObject({
    ringOnS: num,
    ringOffS: num,
    maxRings: z.number().int().min(1),
    dialDigits: z.number().int().min(3).max(6),
    replyAfterS: num,
    clearAfterS: num,
    busyCadenceS: num,
  }),
  exchanges: z.array(z.strictObject({ site, desks: z.array(desk).min(1) })).min(1),
  ringdowns: z.strictObject({ MAINT: ringdown, DUTY: ringdown, UNASSIGNED: ringdown }),
  pencil: z.array(z.strictObject({ site, circuit: z.string().min(1), text: z.string().min(1) })),
  messages: z.strictObject({
    intercept: z.string().min(1),
    noDialTone: z.string().min(1),
    dead: z.string().min(1),
    noReply: z.string().min(1),
    busy: z.string().min(1),
    dataCircuit: z.string().min(1),
    open: z.string().min(1),
    farClear: z.string().min(1),
  }),
  circuits: z.array(circuitSchema).min(1),
});

export type PatchCanon = z.infer<typeof schema>;
export type PatchCircuit = z.infer<typeof circuitSchema>;
export type PatchDesk = z.infer<typeof desk>;
export type PatchRingdown = z.infer<typeof ringdown>;
