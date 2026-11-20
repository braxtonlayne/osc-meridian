/** Canon fragment schema for the environ app (content/canon/apps/environ.json). */
import { z } from 'zod';

const num = z.number().refine(Number.isFinite, 'must be finite');
const frac = num.refine((v) => v >= 0 && v <= 1, 'must be 0..1');
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => d <= '2008-05-31', 'date ceiling');

export const schema = z.strictObject({
  site: z.string().regex(/^GAMMA-\d{2}$/),
  panelNo: z.string().min(1),
  local: z.strictObject({ utcOffsetH: num, zone: z.string().min(1) }),
  volumeM3: num,
  minZoneFlowM3h: num,
  zones: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        level: z.number().int(),
        ahu: z.string().min(1),
        flowShare: frac,
        personShare: frac,
        equipKw: num,
        sensor: z.string().min(1),
      }),
    )
    .min(1),
  ahus: z.array(z.strictObject({ id: z.string().min(1), ratedM3h: num, initialSpeed: z.number().int().min(0), tag: z.string().min(1) })).min(1),
  fanSpeeds: z.array(z.strictObject({ pos: z.string().min(1), frac })).min(2),
  makeup: z.strictObject({
    tag: z.string().min(1),
    positions: z.array(z.strictObject({ id: z.string().min(1), m3h: num })).min(2),
    initial: z.number().int().min(0),
    outdoorCo2Ppm: num,
    outdoorO2Pct: num,
  }),
  metabolic: z.strictObject({ co2M3hPerPerson: num, o2M3hPerPerson: num, heatKwPerPerson: num, moistureGhPerPerson: num }),
  residualPersonsByLocalHour: z.array(num).length(24),
  scrubbers: z.strictObject({
    trains: z.array(z.strictObject({ id: z.string().min(1), initialLoading: frac, tag: z.string().min(1) })).length(2),
    removalM3hAt1000: num,
    fanBase: frac,
    bedCapacityM3: num,
    autoRegenAt: frac,
    saturationKnee: frac,
    regenMin: num,
    regenResidual: frac,
  }),
  filtration: z.strictObject({
    banks: z.array(z.strictObject({ id: z.string().min(1), lastChange: isoDay, dpBase: num, lot: z.string().min(1) })).length(2),
    /** Replacement filter sets on the shelf at the site plant store (the stock label). */
    stock: z.strictObject({ lot: z.string().regex(/^GPB-\d{4}-\d{2}$/), received: isoDay, store: z.string().min(1), sets: num }),
    cycleDays: num,
    dpChangeAt: num,
    dpClean: num,
    dpRisePerCbrnHour: num,
    cbrnFlowM3h: num,
    flowLossPerDp: num,
    overpressureFull: num,
    overpressureTarget: num,
    overpressureLow: num,
    overpressureRecirc: num,
    overpressureTauMin: num,
  }),
  thermal: z.strictObject({
    supplyC: num,
    kwPerM3hK: num,
    tauMin: num,
    maxC: num,
    rhBase: num,
    rhPerGm3: num,
    rhSealAdd: num,
    rhMax: num,
    rhTauMin: num,
  }),
  limits: z.strictObject({ co2Warn: num, co2Alarm: num, o2Low: num, o2LowLow: num, tempHigh: num, rhHigh: num, excursionMin: num }),
  model: z.strictObject({
    stepSec: num,
    sampleEveryMin: num,
    historyHours: num,
    catchupMaxHours: num,
    checkpointEveryRealSec: num,
    loadBalanceTolerancePersons: num,
    loadBalanceMinHours: num,
  }),
  initial: z.strictObject({ co2Ppm: num, o2Pct: num, tempC: z.array(num), rh: z.array(num), overpressure: num }),
  reference: z.strictObject({ sealedRisePpmH: num, oneTrainEquilibriumPpm: num, twoTrainEquilibriumPpm: num }),
  calibration: z.strictObject({ date: isoDay, tolerancePpm: num, by: z.string().min(1) }),
  watches: z.array(z.strictObject({ id: z.string().min(1), start: z.number().int().min(0).max(23), end: z.number().int().min(0).max(24) })).min(1),
  handoverSeed: z.array(
    z.strictObject({
      at: z.string().regex(/^2008-0[1-5]-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
      watch: z.string().min(1),
      by: z.string().min(1),
      co2Ppm: num,
      o2Pct: num,
      remarks: z.string().min(1),
    }),
  ),
  mail: z.strictObject({ excursion: z.string(), filterOverdue: z.string(), overrideQuery: z.string(), loadBalance: z.string() }),
  docs: z.strictObject({ procedure: z.string(), datasheet: z.string() }),
});

export type EnvironCanon = z.infer<typeof schema>;
