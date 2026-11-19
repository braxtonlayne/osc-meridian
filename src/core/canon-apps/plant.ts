/**
 * Canon fragment schema for the plant app (content/canon/apps/plant.json): the training
 * simulator's model constants (one-group point kinetics, a lumped fuel/coolant thermal toy,
 * protection trip and alarm setpoints), initial conditions, the Tier 4 part-task trainer,
 * the live plant event log for the eight installations, and the message ids the app delivers.
 * Reactor ratings, status and notes stay in canon `reactors`.
 */
import { z } from 'zod';

const num = z.number().finite();
const pos = num.positive();
const nonNeg = num.min(0);
const int = z.number().int().finite();
const isoDay = z.string().regex(/^(200[0-7]-\d{2}-\d{2}|2008-0[1-5]-\d{2})$/, 'ISO date on or before 2008-05-31');
const msgId = z.string().regex(/^msg-08-\d{5}$/);

export const schema = z.strictObject({
  panel: z.strictObject({
    panelNo: z.string().min(1),
    panelRev: z.string().min(1),
    keyNo: z.string().min(1),
    trainerRoom: z.string().min(1),
    procedureDocNo: z.string().min(1),
    cardDocNo: z.string().min(1),
    simulatorRelease: z.string().min(1),
  }),
  /** Point kinetics (one delayed group) and the lumped thermal toy. Power is a fraction of rated. */
  model: z.strictObject({
    betaEff: pos,
    lambdaPerS: pos,
    /** Prompt neutron generation time, lengthened for a stable display model. */
    genTimeS: pos,
    sourcePerS: nonNeg,
    minPower: pos,
    maxPower: pos,
    stepS: pos,
    maxCatchUpS: pos,
    excessPcm: num,
    alphaModeratorPcmPerC: num,
    alphaFuelPcmPerC: num,
    noLoadTempC: num,
    feedTempC: num,
    fuelDeltaTFullPowerC: pos,
    fuelTauS: pos,
    coolantHeatupCPerS: pos,
    decayHeatFraction: nonNeg,
    decayTauS: pos,
    naturalCirculation: nonNeg,
    removalFlowForFull: pos,
    dumpDeadbandC: nonNeg,
    dumpGainPerC: nonNeg,
    dumpCapacity: nonNeg,
    pressureNominalMPa: pos,
    pressurePerC: num,
    pumpSpinUpS: pos,
    pumpCoastdownS: pos,
    /** Largest (reactivity - beta)/genTime x step allowed before a step is subdivided. */
    promptStepLimit: pos,
  }),
  rods: z.strictObject({
    steps: int.min(1),
    speedStepsPerS: pos,
    scramInsertS: pos,
    banks: z.array(z.strictObject({ id: z.enum(['SD', 'CB']), label: z.string().min(1), worthPcm: pos })).length(2),
  }),
  trips: z.strictObject({
    fluxHighRunPct: pos,
    fluxHighStartupPct: pos,
    startupRateDpm: pos,
    /** Startup rate trip is bypassed at and above this power (intermediate range). */
    startupRateBypassPct: pos,
    pressureHighMPa: pos,
    pressureLowMPa: pos,
    pressureLowPermissivePct: nonNeg,
    coolantTempHighC: pos,
    flowLowFraction: pos,
    flowLowPermissivePct: nonNeg,
    turbineTripPermissivePct: nonNeg,
  }),
  alarms: z.strictObject({
    fluxHighPct: pos,
    fluxHighStartupPct: pos,
    startupRateDpm: pos,
    pressureHighMPa: pos,
    pressureLowMPa: pos,
    coolantTempHighC: pos,
    flowLowFraction: pos,
  }),
  electrical: z.strictObject({ syncMinPct: nonNeg, syncMaxPct: pos, loadRampPerS: pos }),
  limits: z.strictObject({ holdS: pos, defaultLimitPct: pos }),
  meters: z.strictObject({
    powerMaxPct: pos,
    pressureMinMPa: nonNeg,
    pressureMaxMPa: pos,
    tempMinC: num,
    tempMaxC: num,
    flowMaxPct: pos,
    sumMinDpm: num,
    sumMaxDpm: num,
  }),
  /** powerFraction -1 = the unit's own station load (canon loadFraction). */
  initialConditions: z.array(z.strictObject({ id: z.string().min(1), label: z.string().min(1), powerFraction: num.min(-1).max(1) })).min(1),
  /** The generic part-task trainer offered to accounts that see no installation (Tier 4). */
  trainer: z.strictObject({
    id: z.string().min(1),
    designation: z.string().min(1),
    thermalMWt: pos,
    electricMWe: pos,
    stationLoadFraction: pos.max(1),
    essKV: pos,
  }),
  history: z.strictObject({
    maxScrams: int.min(1),
    trendSeconds: pos,
    trendSampleS: pos,
    checkpointS: pos,
    leaseS: pos,
    liveHistorySpanS: pos,
    liveHistoryStepS: pos,
  }),
  live: z.strictObject({
    intervalMs: pos,
    zoneBands: z.array(z.strictObject({ minLon: num, offsetH: num, label: z.string().min(1) })).min(1),
  }),
  qualification: z.strictObject({
    qualifiedAccounts: z.array(z.enum(['analyst', 'lifesupport', 'deputy', 'auditor'])),
    authority: z.string().min(1),
    watchBillRef: z.string().min(1),
  }),
  mail: z.strictObject({
    simTrip: msgId,
    outsideLimits: msgId,
    liveAttempt: msgId,
    liveAttemptCommand: msgId,
    simTripTier4: msgId,
    repeatedTrips: msgId,
    repeatedTripsCount: int.min(2),
  }),
  events: z.array(
    z.strictObject({
      unit: z.string().regex(/^RX-[AB]\d{2}$/),
      date: isoDay,
      timeZ: z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/),
      kind: z.enum(['SHUTDOWN', 'STARTUP', 'TRIP', 'SURVEILLANCE', 'TEST', 'LOAD', 'MAINTENANCE', 'TRANSIENT']),
      planned: z.boolean(),
      entry: z.string().min(1),
      ref: z.string().min(1),
      by: z.string().regex(/^[A-Z]{2,3}$/),
    }),
  ),
});

export type PlantCanon = z.infer<typeof schema>;
