/** Canon fragment schema for the dispatch app (content/canon/apps/dispatch.json). */
import { z } from 'zod';

const n = z.number().finite();
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const zulu = z.string().regex(/^\d{4}Z$/);
const msgId = z.string().regex(/^msg-\d{2}-\d{5}$/);
const facility = z.string().regex(/^(ALPHA|BETA|GAMMA)-\d{2}$/);
const system = z.enum(['RAIL', 'TRAM']);
const mode = z.enum(['live', 'training', 'review', 'platform']);

export const schema = z.strictObject({
  desk: z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    site: facility,
    panelNo: z.string().min(1),
    plate: z.array(z.string().min(1)).min(1),
    refPrefix: z.string().min(1),
    procedureDocNo: z.string().min(1),
    referenceDocNo: z.string().min(1),
    platformDocNo: z.string().min(1),
  }),
  working: z.strictObject({
    dwellMin: z.strictObject({ rail: n.nonnegative(), tram: n.nonnegative() }),
    headwayBlocks: z.strictObject({ rail: n.positive(), tram: n.positive() }),
    tramLoopMinMiles: n.positive(),
    loopTolerance: n.nonnegative(),
    departOffsetsMin: z.array(n.nonnegative()).min(1),
    routeSetMs: n.positive(),
    signalClearMs: n.positive(),
    lookaheadDays: z.number().int().min(0),
    logShown: z.number().int().positive(),
    source: z.string().min(1),
  }),
  training: z.strictObject({
    plate: z.array(z.string().min(1)).min(1),
    timeScale: n.positive(),
    refPrefix: z.string().min(1),
  }),
  stock: z
    .array(
      z.strictObject({
        id: z.string().regex(/^(R\d{2}|T[A-Z]{2})-\d{3}$/),
        system,
        type: z.string().min(1),
        stabled: facility,
        available: z.boolean(),
        remark: z.string().min(1),
      }),
    )
    .min(1),
  possessions: z.array(
    z.strictObject({
      id: z.string().min(1),
      link: z.string().min(1),
      date: iso,
      startZ: zulu,
      endZ: zulu,
      originator: z.string().min(1),
      title: z.string().min(1),
      note: z.string(),
    }),
  ),
  seg04: z.strictObject({
    segment: z.string().regex(/^\d{2}$/),
    keyNo: z.string().min(1),
    keyHolder: z.enum(['analyst', 'lifesupport', 'deputy', 'auditor']),
    positions: z.array(z.string().min(1)).length(3),
    documentedPositions: z.number().int().positive(),
    releaseDesk: z.string().min(1),
    releaseDelayMs: n.positive(),
    instructionNo: z.string().min(1),
    suppressedLabel: z.string().min(1),
    withdrawAfterMs: n.positive(),
    portalDoors: z.array(z.string().min(1)),
  }),
  modes: z.strictObject({ deputy: mode, analyst: mode, auditor: mode, lifesupport: mode }),
  platformSite: facility,
  platformService: z.strictObject({ from: facility, to: facility, pathsEachWay: z.number().int().positive(), consist: z.string().min(1), source: z.string().min(1) }),
  mail: z.strictObject({ logQuery: msgId, conflict: msgId, isolationHold: msgId, instruction: msgId, qualification: msgId }),
});

export type DispatchCanon = z.infer<typeof schema>;
export type DispatchMode = DispatchCanon['modes']['deputy'];
export type StockCanon = DispatchCanon['stock'][number];
