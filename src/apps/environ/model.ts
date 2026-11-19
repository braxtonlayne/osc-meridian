/**
 * Air revitalization model for one GAMMA site (pure, deterministic; constants from canon
 * apps.environ). One well-mixed air volume for CO2 and O2, zone offsets from each zone's own
 * supply flow, first-order zone temperature and humidity, two swing-bed CO2 scrubber trains,
 * makeup air with a seal closure latch, and filtered (CBRN) makeup with overpressure.
 *
 * Time: the plant runs on the seal drill timebase (canon sealDrill.timeScale plant seconds per
 * wall second). The model steps in whole steps of `model.stepSec` plant seconds anchored on the
 * checkpoint, so every reader of the shared state computes the same values.
 */
import type { EnvironCanon } from '@core/canon-apps/environ';
import type { EnvironControls, EnvironPlant, EnvironSample, EnvironState, FilterBankId, TrainState } from './types';

export interface ModelEnv {
  ec: EnvironCanon;
  /** Posted staff of the site (canon facilities[].staff): the occupancy basis. */
  posted: number;
  /** Plant seconds per wall second. */
  timeScale: number;
  /** Seal signal from the seal drill at a wall time. */
  sealAt: (wall: number) => boolean;
}

/** Derived readings at a moment (not stored). */
export interface Readings {
  seal: boolean;
  makeupClosedBySeal: boolean;
  persons: number;
  makeupM3h: number;
  removalM3h: number;
  zoneCo2: number[];
  zoneFlow: number[];
  fanFactor: number;
  bankDp: Record<FilterBankId, number>;
  bankFlow: number;
}

const HOUR = 3600;

export function stepWallMs(env: ModelEnv): number {
  return (env.ec.model.stepSec / env.timeScale) * 1000;
}

export function plantHours(wallMs: number, env: Pick<ModelEnv, 'timeScale'>): number {
  return (wallMs / 1000) * env.timeScale / HOUR;
}

/** Site-local hour (0..23) of a wall time (in-world time of day = real UTC time of day). */
export function localHour(wall: number, ec: EnvironCanon): number {
  const h = new Date(wall).getUTCHours() + ec.local.utcOffsetH;
  return ((h % 24) + 24) % 24;
}

/** Persons the model carries at a wall time: posted staff plus the residual metabolic load. */
export function modelPersons(wall: number, env: ModelEnv): number {
  return env.posted + (env.ec.residualPersonsByLocalHour[localHour(wall, env.ec)] ?? 0);
}

export function initialControls(ec: EnvironCanon): EnvironControls {
  return {
    ahu: Object.fromEntries(ec.ahus.map((a) => [a.id, a.initialSpeed])),
    makeup: ec.makeup.initial,
    sealOverride: false,
    filtration: { mode: 'normal', bank: 'B' },
    scrubbers: Object.fromEntries(ec.scrubbers.trains.map((t) => [t.id, 'off' as const])),
  };
}

export function initialPlant(ec: EnvironCanon): EnvironPlant {
  return {
    co2Ppm: ec.initial.co2Ppm,
    o2Pct: ec.initial.o2Pct,
    tempC: [...ec.initial.tempC],
    rh: [...ec.initial.rh],
    overpressure: ec.initial.overpressure,
    trains: Object.fromEntries(ec.scrubbers.trains.map((t) => [t.id, { phase: 'off', loading: t.initialLoading, regenLeft: 0 } satisfies TrainState])),
    sealLatched: false,
    cbrnHours: { A: 0, B: 0 },
  };
}

export function initialFilters(ec: EnvironCanon): EnvironState['filters'] {
  const out = {} as EnvironState['filters'];
  for (const b of ec.filtration.banks) out[b.id as FilterBankId] = { lastChange: b.lastChange, lot: b.lot };
  return out;
}

/** Pre-filter differential pressure (in. w.g.) of a bank. */
export function bankDp(ec: EnvironCanon, filters: EnvironState['filters'], plant: EnvironPlant, bank: FilterBankId): number {
  const c = ec.filtration.banks.find((b) => b.id === bank);
  const changedSince = !c || filters[bank].lastChange !== c.lastChange;
  const base = changedSince ? ec.filtration.dpClean : c.dpBase;
  return base + plant.cbrnHours[bank] * ec.filtration.dpRisePerCbrnHour;
}

/** Flow fraction through a filter bank at a differential pressure. */
export function bankFlowFactor(ec: EnvironCanon, dp: number): number {
  return Math.max(0, Math.min(1, 1 - ec.filtration.flowLossPerDp * Math.max(0, dp - ec.filtration.dpClean)));
}

/** Days since a bank's last change on an in-world day (ISO). */
export function filterAgeDays(lastChange: string, todayIso: string): number {
  return Math.round((Date.parse(todayIso + 'T00:00:00Z') - Date.parse(lastChange + 'T00:00:00Z')) / 86400000);
}

function speedFrac(ec: EnvironCanon, i: number | undefined): number {
  return ec.fanSpeeds[i ?? 0]?.frac ?? 0;
}

/** The zone that carries the residual load (largest person share). */
function residualZone(ec: EnvironCanon): number {
  let best = 0;
  ec.zones.forEach((z, i) => {
    if (z.personShare > (ec.zones[best]?.personShare ?? 0)) best = i;
  });
  return best;
}

export function zonePersons(ec: EnvironCanon, posted: number, persons: number): number[] {
  const rz = residualZone(ec);
  return ec.zones.map((z, i) => posted * z.personShare + (i === rz ? persons - posted : 0));
}

export function readings(plant: EnvironPlant, controls: EnvironControls, filters: EnvironState['filters'], env: ModelEnv, wall: number): Readings {
  const { ec } = env;
  const seal = env.sealAt(wall);
  const latched = plant.sealLatched || seal;
  const makeupClosedBySeal = latched && !controls.sealOverride;
  const dps = { A: bankDp(ec, filters, plant, 'A'), B: bankDp(ec, filters, plant, 'B') };
  const bankFlow = bankFlowFactor(ec, dps[controls.filtration.bank]);
  let makeupM3h: number;
  if (makeupClosedBySeal) makeupM3h = 0;
  else if (controls.filtration.mode === 'cbrn') makeupM3h = ec.filtration.cbrnFlowM3h * bankFlow;
  else makeupM3h = ec.makeup.positions[controls.makeup]?.m3h ?? 0;

  const persons = modelPersons(wall, env);
  const zp = zonePersons(ec, env.posted, persons);
  const zoneFlow = ec.zones.map((z) => {
    const ahu = ec.ahus.find((a) => a.id === z.ahu);
    return Math.max(ec.minZoneFlowM3h, (ahu?.ratedM3h ?? 0) * speedFrac(ec, controls.ahu[z.ahu]) * z.flowShare);
  });
  const rate = ec.metabolic.co2M3hPerPerson;
  const zoneCo2 = ec.zones.map((_, i) => plant.co2Ppm + ((zp[i] ?? 0) * rate * 1e6) / (zoneFlow[i] ?? 1));

  const scrubAhu = ec.zones[residualZone(ec)]?.ahu ?? '';
  const f = speedFrac(ec, controls.ahu[scrubAhu]);
  const fanFactor = f === 0 ? 0 : ec.scrubbers.fanBase + (1 - ec.scrubbers.fanBase) * f;
  let removalM3h = 0;
  for (const t of ec.scrubbers.trains) {
    const tr = plant.trains[t.id];
    if (tr?.phase === 'adsorb') removalM3h += trainRemoval(ec, tr.loading, plant.co2Ppm, fanFactor);
  }
  return { seal, makeupClosedBySeal, persons, makeupM3h, removalM3h, zoneCo2, zoneFlow, fanFactor, bankDp: dps, bankFlow };
}

export function trainRemoval(ec: EnvironCanon, loading: number, co2Ppm: number, fanFactor: number): number {
  const s = ec.scrubbers;
  const eff = loading < s.saturationKnee ? 1 : Math.max(0, (1 - loading) / (1 - s.saturationKnee));
  return s.removalM3hAt1000 * (co2Ppm / 1000) * fanFactor * eff;
}

/** Advance the plant by one model step ending at `wall`. Returns the new plant and the readings used. */
export function stepPlant(plant: EnvironPlant, controls: EnvironControls, filters: EnvironState['filters'], env: ModelEnv, wall: number): { plant: EnvironPlant; r: Readings } {
  const { ec } = env;
  const dt = ec.model.stepSec;
  const dtH = dt / HOUR;
  const r = readings(plant, controls, filters, env, wall);
  const next: EnvironPlant = {
    ...plant,
    tempC: [...plant.tempC],
    rh: [...plant.rh],
    trains: {},
    cbrnHours: { ...plant.cbrnHours },
    sealLatched: plant.sealLatched || r.seal,
  };

  // Scrubber trains.
  const s = ec.scrubbers;
  const regenSec = s.regenMin * 60;
  for (const t of s.trains) {
    const cur = plant.trains[t.id] ?? { phase: 'off', loading: t.initialLoading, regenLeft: 0 };
    const tr: TrainState = { ...cur };
    const mode = controls.scrubbers[t.id] ?? 'off';
    // Selector logic first, then the process for this step.
    if (mode === 'off') {
      tr.phase = 'off';
      tr.regenLeft = 0;
    } else if (mode === 'adsorb') {
      if (tr.phase !== 'adsorb') {
        tr.phase = 'adsorb';
        tr.regenLeft = 0;
      }
    } else if (mode === 'regen') {
      if (tr.phase === 'adsorb' || tr.phase === 'off') {
        tr.phase = 'regen';
        tr.regenLeft = regenSec;
      }
    } else if (mode === 'auto') {
      if (tr.phase === 'off' || tr.phase === 'standby') tr.phase = 'adsorb';
      if (tr.phase === 'adsorb' && tr.loading >= s.autoRegenAt) {
        tr.phase = 'regen';
        tr.regenLeft = regenSec;
      }
    }
    if (tr.phase === 'adsorb') {
      tr.loading = Math.min(1, tr.loading + (trainRemoval(ec, tr.loading, plant.co2Ppm, r.fanFactor) * dtH) / s.bedCapacityM3);
    } else if (tr.phase === 'regen') {
      tr.loading = Math.max(s.regenResidual, tr.loading - (dt * (1 - s.regenResidual)) / regenSec);
      tr.regenLeft = Math.max(0, tr.regenLeft - dt);
      if (tr.regenLeft <= 0) tr.phase = mode === 'auto' ? 'adsorb' : 'standby';
    }
    next.trains[t.id] = tr;
  }

  // CO2 and O2 (one mixed volume).
  const m = ec.metabolic;
  const gen = r.persons * m.co2M3hPerPerson;
  const o2use = r.persons * m.o2M3hPerPerson;
  const V = ec.volumeM3;
  next.co2Ppm = Math.max(ec.makeup.outdoorCo2Ppm * 0.5, plant.co2Ppm + ((gen * 1e6 - r.makeupM3h * (plant.co2Ppm - ec.makeup.outdoorCo2Ppm) - r.removalM3h * 1e6) / V) * dtH);
  next.o2Pct = plant.o2Pct + ((-o2use * 100 + r.makeupM3h * (ec.makeup.outdoorO2Pct - plant.o2Pct)) / V) * dtH;

  // Overpressure.
  const fl = ec.filtration;
  const cbrn = controls.filtration.mode === 'cbrn' && r.makeupM3h > 0;
  const opTarget = cbrn ? fl.overpressureFull * r.bankFlow * r.bankFlow : r.makeupM3h > 0 ? fl.overpressureRecirc : 0;
  next.overpressure = plant.overpressure + (opTarget - plant.overpressure) * (1 - Math.exp(-dt / (fl.overpressureTauMin * 60)));
  if (cbrn) next.cbrnHours[controls.filtration.bank] += dtH;

  // Zone temperature and humidity.
  const th = ec.thermal;
  const zp = zonePersons(ec, env.posted, r.persons);
  const aT = 1 - Math.exp(-dt / (th.tauMin * 60));
  const aH = 1 - Math.exp(-dt / (th.rhTauMin * 60));
  ec.zones.forEach((z, i) => {
    const flow = r.zoneFlow[i] ?? ec.minZoneFlowM3h;
    const p = zp[i] ?? 0;
    const tTarget = Math.min(th.maxC, th.supplyC + (p * m.heatKwPerPerson + z.equipKw) / (flow * th.kwPerM3hK));
    const hTarget = Math.min(th.rhMax, th.rhBase + (th.rhPerGm3 * p * m.moistureGhPerPerson) / flow + (r.makeupM3h === 0 ? th.rhSealAdd : 0));
    next.tempC[i] = (plant.tempC[i] ?? tTarget) + (tTarget - (plant.tempC[i] ?? tTarget)) * aT;
    next.rh[i] = (plant.rh[i] ?? hTarget) + (hTarget - (plant.rh[i] ?? hTarget)) * aH;
  });
  return { plant: next, r };
}

export function sampleOf(plant: EnvironPlant, r: Readings, wall: number, ec: EnvironCanon): EnvironSample {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return {
    w: wall,
    co2: Math.round(plant.co2Ppm),
    o2: Math.round(plant.o2Pct * 1000) / 1000,
    zc: r.zoneCo2.map((v) => Math.round(v)),
    zt: plant.tempC.map(r1),
    zh: plant.rh.map(r1),
    op: Math.round(plant.overpressure * 1000) / 1000,
    mk: Math.round(r.makeupM3h),
    rm: Math.round(r.removalM3h * 10000) / 10000,
    ld: ec.scrubbers.trains.map((t) => Math.round((plant.trains[t.id]?.loading ?? 0) * 1000) / 1000),
  };
}

/** A running integration: plant at `at` (a step boundary counted from the checkpoint). */
export interface Cursor {
  at: number;
  plant: EnvironPlant;
}

/**
 * Integrate whole steps from `cur` up to `to` (wall ms). Catch-up beyond `catchupMaxHours`
 * of plant time skips ahead (the plant held on its automatics while nobody was watching).
 * `onSample` receives a historian sample at every `sampleEveryMin` boundary.
 */
export function advance(cur: Cursor, controls: EnvironControls, filters: EnvironState['filters'], env: ModelEnv, to: number, onSample?: (s: EnvironSample) => void): Cursor {
  const step = stepWallMs(env);
  const sampleWall = ((env.ec.model.sampleEveryMin * 60) / env.timeScale) * 1000;
  const maxWall = ((env.ec.model.catchupMaxHours * HOUR) / env.timeScale) * 1000;
  let at = cur.at;
  let plant = cur.plant;
  if (to - at > maxWall) at += Math.floor((to - at - maxWall) / step) * step;
  while (at + step <= to) {
    const w = at + step;
    const out = stepPlant(plant, controls, filters, env, w);
    plant = out.plant;
    if (onSample && Math.floor(w / sampleWall) !== Math.floor(at / sampleWall)) onSample(sampleOf(plant, out.r, w, env.ec));
    at = w;
  }
  return { at, plant };
}

/** Trim historian samples to the last `historyHours` of plant time before `now`. */
export function trimLog(log: EnvironSample[], env: ModelEnv, now: number): EnvironSample[] {
  const keep = ((env.ec.model.historyHours * HOUR) / env.timeScale) * 1000;
  return log.filter((s) => s.w >= now - keep);
}

/** A fresh plant: initial values run for `historyHours` before `now` on the initial line-up. */
export function defaultState(env: ModelEnv, now: number): EnvironState {
  const { ec } = env;
  const controls = initialControls(ec);
  const filters = initialFilters(ec);
  const span = ((ec.model.historyHours * HOUR) / env.timeScale) * 1000;
  const step = stepWallMs(env);
  const start = now - Math.ceil(span / step) * step;
  const log: EnvironSample[] = [];
  const quiet: ModelEnv = { ...env, sealAt: () => false };
  const cur = advance({ at: start, plant: initialPlant(ec) }, controls, filters, quiet, now, (s) => log.push(s));
  return {
    v: 1,
    site: ec.site,
    rev: 0,
    checkpoint: { at: cur.at, plant: cur.plant },
    controls,
    filters,
    log,
    handover: [],
    events: [],
    excursion: { since: null, peak: 0, reported: false },
  };
}

/* ------------------------------------------------------------ load balance */

export interface LoadBalance {
  hours: number;
  samples: number;
  generationM3h: number;
  impliedPersons: number;
  posted: number;
  difference: number;
  withinTolerance: boolean;
}

/**
 * CO2 mass balance over historian samples: generation = V dC/dt + makeup x (C - outdoor) + scrubber
 * removal, averaged, divided by the metabolic rate per person. Returns null with too little data.
 */
export function loadBalance(samples: readonly EnvironSample[], env: ModelEnv): LoadBalance | null {
  const { ec } = env;
  if (samples.length < 3) return null;
  let sumG = 0;
  let sumH = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const dtH = plantHours(b.w - a.w, env);
    if (dtH <= 0) continue;
    const g = (ec.volumeM3 * (b.co2 - a.co2)) / dtH / 1e6 + (b.mk * ((a.co2 + b.co2) / 2 - ec.makeup.outdoorCo2Ppm)) / 1e6 + b.rm;
    sumG += g * dtH;
    sumH += dtH;
  }
  if (sumH < ec.model.loadBalanceMinHours) return null;
  const generationM3h = sumG / sumH;
  const impliedPersons = generationM3h / ec.metabolic.co2M3hPerPerson;
  const difference = impliedPersons - env.posted;
  return {
    hours: sumH,
    samples: samples.length,
    generationM3h,
    impliedPersons,
    posted: env.posted,
    difference,
    withinTolerance: Math.abs(difference) <= ec.model.loadBalanceTolerancePersons,
  };
}

/** Rate of CO2 rise (ppm per plant hour) on full recirculation with no scrubbers, for a headcount. */
export function sealedRise(ec: EnvironCanon, persons: number): number {
  return (persons * ec.metabolic.co2M3hPerPerson * 1e6) / ec.volumeM3;
}

/** Equilibrium CO2 with n trains adsorbing at full fan factor, for a headcount. */
export function scrubberEquilibrium(ec: EnvironCanon, persons: number, trains: number): number {
  return ((persons * ec.metabolic.co2M3hPerPerson) / (ec.scrubbers.removalM3hAt1000 * trains)) * 1000;
}

/** The watch (A/B/C) at a wall time. */
export function watchAt(wall: number, ec: EnvironCanon): string {
  const h = localHour(wall, ec);
  for (const w of ec.watches) {
    if (w.start < w.end ? h >= w.start && h < w.end : h >= w.start || h < w.end) return w.id;
  }
  return ec.watches[0]?.id ?? '';
}
