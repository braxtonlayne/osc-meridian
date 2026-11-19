/** Canon fragment schema for Facility Video (content/canon/apps/cctv.json). */
import { z } from 'zod';

const n = z.number().finite();
const pos = n.positive();
const nonneg = n.nonnegative();
const int = z.number().int();
const hour = n.min(0).max(24);
const kind = z.enum(['corridor', 'portal', 'platform', 'vault', 'hoist', 'plant', 'assembly']);

const preset = z.strictObject({
  n: int.positive(),
  name: z.string().min(1),
  /** Pan from the camera's mounting axis, degrees (positive = right). */
  yaw: n.min(-90).max(90),
  /** Tilt, degrees (negative = down). */
  pitch: n.min(-45).max(20),
  /** Focal multiplier (1 = widest). */
  zoom: n.min(1).max(4),
});

export const schema = z.strictObject({
  client: z.strictObject({
    title: z.string(),
    product: z.string(),
    release: z.string(),
    recorderModel: z.string(),
    contract: z.string(),
    originator: z.string(),
    maintainer: z.string(),
  }),
  recorder: z.strictObject({
    channelsPerUnit: int.positive(),
    /** Minutes of recording the client can retrieve for playback. */
    retentionMin: pos,
    /** Encoded picture size per tile in multi-camera layouts, [w, h] px. */
    multiRes: z.tuple([int.positive(), int.positive()]),
    /** Encoded picture size in the single-camera layout. */
    singleRes: z.tuple([int.positive(), int.positive()]),
    /** Display rate per layout (the client thins frames as tiles are added). */
    fps: z.array(z.strictObject({ layout: z.union([z.literal(1), z.literal(4), z.literal(9), z.literal(16)]), fps: pos })).length(4),
    playbackSpeeds: z.array(pos).min(1),
    /** Compression block edge, px of the encoded picture. */
    blockPx: int.positive(),
    /** Share of each block pulled toward its mean (0 = none). */
    blockMix: n.min(0).max(0.5),
    /** Grey levels kept by the encoder. */
    grayLevels: int.min(8).max(256),
    ptzMoveSec: pos,
    ptzStepDeg: pos,
    zoomStep: pos,
    zoomMax: n.min(1).max(4),
    /** A PTZ camera left off HOME parks itself after this long. */
    parkMin: pos,
  }),
  activity: z.strictObject({
    shiftChangesLocal: z.array(hour),
    shiftWindowMin: pos,
    mealsLocal: z.array(z.strictObject({ from: hour, to: hour })),
    nightFromLocal: hour,
    nightToLocal: hour,
    /** Length of one activity slot per camera kind (at most one passer-by per slot). */
    slotSec: z.array(z.strictObject({ kind, sec: pos })).length(7),
    dayRate: n.min(0).max(1),
    nightRate: n.min(0).max(1),
    shiftRate: n.min(0).max(1),
    walkMps: pos,
    cartMps: pos,
    cartShare: n.min(0).max(1),
    seatedDay: int.nonnegative(),
    seatedMeal: int.nonnegative(),
    seatedNight: int.nonnegative(),
  }),
  trains: z.strictObject({ boardingMin: nonneg, dwellMin: nonneg, approachSec: pos }),
  /** What each ALPHA platform camera's platform serves: a facility id, "tram" or "SEG04". */
  platforms: z.array(z.strictObject({ camera: z.string().regex(/^A0\d-C\d\d$/), serves: z.string().regex(/^(ALPHA|BETA|GAMMA)-\d\d$|^tram$|^SEG04$/) })),
  presets: z.array(z.strictObject({ scene: z.enum(['gate', 'portal', 'platform', 'assembly']), list: z.array(preset).min(2) })),
  seg04: z.strictObject({
    nearCamera: z.string(),
    farCamera: z.string(),
    portalDoorNear: z.string(),
    portalDoorFar: z.string(),
    /** Seconds before the movement ends that the near portal door is seen opening. */
    doorLeadSec: pos,
    approachSec: pos,
    eventText: z.string(),
  }),
  unassigned: z.strictObject({
    facility: z.string(),
    unit: z.string(),
    channel: int.positive(),
    osdTitle: z.string(),
    placard: z.string(),
    scene: z.enum(['corridor', 'lobby', 'hoist']),
    /** Hoist whose cage the channel shows when it stands at the channel's landing. */
    hoist: z.string(),
  }),
  /** Persons seen at an out-of-service muster reader during a site muster; they leave after `leaveAfterMin`. */
  musterCamera: z.strictObject({ camera: z.string(), reader: z.string(), standing: int.nonnegative(), leaveAfterMin: pos }),
  mail: z.strictObject({
    printNetwork: z.string(),
    printSite: z.string(),
    restricted: z.string(),
    restrictedAfter: int.positive(),
    ptzNetwork: z.string(),
    ptzSite: z.string(),
    recordGap: z.string(),
  }),
  docs: z.strictObject({ instructions: z.string(), rules: z.string() }),
  stillPrefix: z.string(),
});

export type CctvCanon = z.infer<typeof schema>;
