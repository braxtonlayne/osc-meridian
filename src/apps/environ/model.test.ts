import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.json';
import type { EnvironCanon } from '@core/canon-apps/environ';
import { schema } from '@core/canon-apps/environ';
import {
  advance,
  defaultState,
  loadBalance,
  localHour,
  readings,
  scrubberEquilibrium,
  sealedRise,
  watchAt,
  type ModelEnv,
} from './model';
import type { EnvironControls, EnvironSample } from './types';

const canon = canonJson as unknown as {
  apps: { environ: unknown };
  facilities: { id: string; staff: number | null }[];
  sealDrill: { timeScale: number };
};
const ec = schema.parse(canon.apps.environ) as EnvironCanon;
const posted = canon.facilities.find((f) => f.id === ec.site)?.staff ?? 0;
const T0 = Date.UTC(2026, 10, 19, 6, 0, 0); // 0100 local

function env(sealAt: (w: number) => boolean = () => false): ModelEnv {
  return { ec, posted, timeScale: canon.sealDrill.timeScale, sealAt };
}
const wallForPlantHours = (h: number) => ((h * 3600) / canon.sealDrill.timeScale) * 1000;

describe('environ canon fragment', () => {
  it('reference figures agree with posted strength', () => {
    expect(posted).toBeGreaterThan(0);
    expect(Math.round(sealedRise(ec, posted))).toBe(ec.reference.sealedRisePpmH);
    expect(Math.round(scrubberEquilibrium(ec, posted, 1))).toBe(ec.reference.oneTrainEquilibriumPpm);
    expect(Math.round(scrubberEquilibrium(ec, posted, 2))).toBe(ec.reference.twoTrainEquilibriumPpm);
  });
  it('zones match the GAMMA level template and shares sum to one', () => {
    expect(ec.zones.reduce((a, z) => a + z.personShare, 0)).toBeCloseTo(1, 6);
    expect(ec.initial.tempC.length).toBe(ec.zones.length);
  });
});

describe('model', () => {
  it('holds CO2 near the makeup air equilibrium in normal line-up', () => {
    const s = defaultState(env(), T0);
    expect(s.log.length).toBeGreaterThan(50);
    expect(s.checkpoint.plant.co2Ppm).toBeGreaterThan(700);
    expect(s.checkpoint.plant.co2Ppm).toBeLessThan(1300);
    expect(s.checkpoint.at).toBeLessThanOrEqual(T0);
  });

  it('is deterministic from a checkpoint', () => {
    const s = defaultState(env(), T0);
    const a = advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, s.controls, s.filters, env(), T0 + 60000);
    const b = advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, s.controls, s.filters, env(), T0 + 60000);
    expect(a).toEqual(b);
  });

  it('closes makeup air on a seal and CO2 climbs faster than posted strength predicts', () => {
    const s = defaultState(env(), T0);
    const sealed = env((w) => w >= T0);
    const r0 = readings(s.checkpoint.plant, s.controls, s.filters, sealed, T0 + 1000);
    expect(r0.makeupM3h).toBe(0);
    const end = advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, s.controls, s.filters, sealed, T0 + wallForPlantHours(2));
    const rise = (end.plant.co2Ppm - s.checkpoint.plant.co2Ppm) / 2;
    expect(rise).toBeGreaterThan(ec.reference.sealedRisePpmH * 1.1);
    expect(end.plant.sealLatched).toBe(true);
  });

  it('scrubbers in AUTO hold CO2 under the HIGH limit while sealed', () => {
    const s = defaultState(env(), T0);
    const c: EnvironControls = { ...s.controls, ahu: { ...s.controls.ahu, 'AHU-2': 3 }, scrubbers: { 'SCR-A': 'auto', 'SCR-B': 'auto' } };
    const sealed = env(() => true);
    let max = 0;
    advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, c, s.filters, sealed, T0 + wallForPlantHours(10), (x) => (max = Math.max(max, x.co2)));
    expect(max).toBeLessThan(ec.limits.co2Warn);
  });

  it('a manual regeneration ends in standby with a clean bed', () => {
    const s = defaultState(env(), T0);
    const c: EnvironControls = { ...s.controls, scrubbers: { 'SCR-A': 'regen', 'SCR-B': 'off' } };
    const end = advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, c, s.filters, env(), T0 + wallForPlantHours(1));
    expect(end.plant.trains['SCR-A']?.phase).toBe('standby');
    expect(end.plant.trains['SCR-A']?.loading).toBeCloseTo(ec.scrubbers.regenResidual, 3);
  });

  it('CBRN mode raises overpressure; the dirty bank gives less', () => {
    const s = defaultState(env(), T0);
    const run = (bank: 'A' | 'B') =>
      advance({ at: s.checkpoint.at, plant: s.checkpoint.plant }, { ...s.controls, filtration: { mode: 'cbrn', bank } }, s.filters, env(), T0 + wallForPlantHours(1)).plant.overpressure;
    const a = run('A');
    const b = run('B');
    expect(b).toBeGreaterThan(ec.filtration.overpressureTarget);
    expect(a).toBeLessThan(b);
  });

  it('load balance finds more occupants than posted staff', () => {
    const s = defaultState(env(), T0);
    const lb = loadBalance(s.log, env());
    expect(lb).not.toBeNull();
    expect(lb!.difference).toBeGreaterThan(ec.model.loadBalanceTolerancePersons);
    expect(lb!.withinTolerance).toBe(false);
  });

  it('load balance returns null on too little data', () => {
    const one: EnvironSample[] = [];
    expect(loadBalance(one, env())).toBeNull();
  });

  it('local hour and watch', () => {
    expect(localHour(T0, ec)).toBe(1);
    expect(watchAt(T0, ec)).toBe('C');
    expect(watchAt(Date.UTC(2026, 10, 19, 15, 0), ec)).toBe('A');
  });
});
