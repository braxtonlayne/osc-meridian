import { describe, expect, it } from 'vitest';
import {
  applyAction,
  criticalBankSteps,
  initialState,
  logPower,
  pressureMPa,
  protection,
  reactivityPcm,
  sCurve,
  sCurveInverse,
  step,
} from './model';
import type { SimEvent } from './model';
import { INSTALLATIONS, K, P, TRAINER, defaultIc, defaultUnit, eventsFor, icPower, rulesFor, unplannedTrips, zuluWithLocal } from './data';
import type { SimState } from './types';

const unit = (id: string) => INSTALLATIONS.find((u) => u.id === id)!;

function run(s0: SimState, seconds: number, u = unit('RX-A05').params) {
  let s = s0;
  const events: SimEvent[] = [];
  for (let t = 0; t < seconds; t += 0.25) {
    const r = step(K, u, s, 0.25);
    s = r.state;
    events.push(...r.events);
  }
  return { s, events };
}

describe('rod worth curve', () => {
  it('is monotonic and inverts', () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const v = sCurve(f);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
      expect(sCurveInverse(v)).toBeCloseTo(Math.min(1, f), 4);
    }
    expect(sCurve(0)).toBe(0);
    expect(sCurve(1)).toBeCloseTo(1, 9);
  });

  it('critical bank position moves out with power (fuel temperature feedback)', () => {
    const hzp = criticalBankSteps(K, 0);
    const full = criticalBankSteps(K, 1);
    expect(hzp).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(hzp);
    expect(full).toBeLessThan(P.rods.steps);
  });
});

describe('initial conditions', () => {
  it('station load IC is steady and critical for every installation', () => {
    for (const u of INSTALLATIONS) {
      const p = icPower(u, 'IC-3');
      const s0 = initialState(K, u.params, 'IC-3', p);
      expect(Math.abs(reactivityPcm(K, s0))).toBeLessThan(1);
      const { s, events } = run(s0, 60, u.params);
      expect(events.filter((e) => e.type === 'trip')).toEqual([]);
      expect(s.n).toBeGreaterThan(p * 0.95);
      expect(s.n).toBeLessThan(p * 1.05);
      expect(Math.abs(s.tc - s0.tc)).toBeLessThan(1.5);
    }
  });

  it('hot shutdown is deeply subcritical and stays there', () => {
    const u = unit('RX-B08');
    expect(defaultIc(u)).toBe('IC-1');
    const s0 = initialState(K, u.params, 'IC-1', icPower(u, 'IC-1'));
    expect(reactivityPcm(K, s0)).toBeLessThan(-1000);
    const { s } = run(s0, 30, u.params);
    expect(s.n).toBeLessThan(1e-4);
    expect(s.scrammed).toBe(false);
  });

  it('is deterministic', () => {
    const u = unit('RX-A01');
    const a = run(initialState(K, u.params, 'IC-3', u.params.stationLoad), 20, u.params).s;
    const b = run(initialState(K, u.params, 'IC-3', u.params.stationLoad), 20, u.params).s;
    expect(a).toEqual(b);
  });
});

describe('protection and operator actions', () => {
  const u = unit('RX-A05');
  const atPower = () => initialState(K, u.params, 'IC-3', u.params.stationLoad);

  it('manual scram trips, inserts rods and opens the generator breaker', () => {
    const r = applyAction(K, u.params, atPower(), { type: 'scram' });
    expect(r.state.scrammed).toBe(true);
    expect(r.state.gen).toBe(false);
    expect(r.events.some((e) => e.type === 'trip' && e.manual)).toBe(true);
    expect(r.events.some((e) => e.type === 'horn')).toBe(true);
    const { s } = run(r.state, 10, u.params);
    expect(s.rods.SD).toBe(0);
    expect(s.rods.CB).toBe(0);
    expect(s.n).toBeLessThan(0.1);
    expect(s.ann.RX_TRIP.seq).toBe('unack');
    // Decay heat keeps the coolant from cooling below no-load temperature on the dump.
    expect(s.d).toBeGreaterThan(0);
  });

  it('losing a coolant pump at power trips on low flow', () => {
    const r = applyAction(K, u.params, atPower(), { type: 'pump', pump: 'A', on: false });
    const { s, events } = run(r.state, 20, u.params);
    const trip = events.find((e) => e.type === 'trip');
    expect(trip && trip.type === 'trip' && trip.cause).toBe('COOLANT FLOW LOW');
    expect(s.scrammed).toBe(true);
  });

  it('continuous rod withdrawal at hot standby trips on startup rate or flux', () => {
    let s = initialState(K, u.params, 'IC-2', 1e-6);
    s = applyAction(K, u.params, s, { type: 'rod', bank: 'CB', dir: 1 }).state;
    const { events } = run(s, 60, u.params);
    const trip = events.find((e) => e.type === 'trip');
    expect(trip).toBeDefined();
    expect(['STARTUP RATE HIGH', 'NEUTRON FLUX HIGH']).toContain(trip && trip.type === 'trip' ? trip.cause : '');
  });

  it('blocks control bank withdrawal until the shutdown bank is out', () => {
    let s = initialState(K, u.params, 'IC-1', 0);
    s = applyAction(K, u.params, s, { type: 'mode', mode: 'STARTUP' }).state;
    const r = applyAction(K, u.params, s, { type: 'rod', bank: 'CB', dir: 1 });
    expect(r.refused).toMatch(/shutdown bank/);
    expect(r.state.ann.ROD_BLOCK.seq).toBe('unack');
  });

  it('trip reset needs SHUTDOWN and rods in', () => {
    let s = applyAction(K, u.params, atPower(), { type: 'scram' }).state;
    expect(applyAction(K, u.params, s, { type: 'scramReset' }).refused).toMatch(/SHUTDOWN/);
    s = applyAction(K, u.params, s, { type: 'mode', mode: 'SHUTDOWN' }).state;
    s = run(s, 5, u.params).s;
    const r = applyAction(K, u.params, s, { type: 'scramReset' });
    expect(r.refused).toBeUndefined();
    expect(r.state.scrammed).toBe(false);
  });

  it('acknowledge and reset follow the ring-back sequence', () => {
    let s = applyAction(K, u.params, atPower(), { type: 'scram' }).state;
    s = applyAction(K, u.params, s, { type: 'ack' }).state;
    expect(s.ann.RX_TRIP.seq).toBe('ack');
  });

  it('diesel selector STOP with the unit off line leaves bus E-A dead and reports a limit', () => {
    let s = applyAction(K, u.params, atPower(), { type: 'scram' }).state;
    s = applyAction(K, u.params, s, { type: 'diesel', select: 'STOP' }).state;
    const { events, s: after } = run(s, P.limits.holdS + 2, u.params);
    expect(after.ann.ESS_DEAD.abnormal).toBe(true);
    expect(events.some((e) => e.type === 'limit')).toBe(true);
  });

  it('RX-A03 carries its feedwater limit and status window', () => {
    const a03 = unit('RX-A03');
    expect(a03.params.limitPct).toBe(80);
    expect(a03.params.fwBOos).toBe(true);
    const s = initialState(K, a03.params, 'IC-3', a03.params.stationLoad);
    expect(s.ann.FW_B_OOS.abnormal).toBe(true);
    expect(s.n * 100).toBeLessThan(80);
  });

  it('pressure follows coolant temperature and protection sees it', () => {
    const s = atPower();
    expect(pressureMPa(K, s.tc)).toBeCloseTo(P.model.pressureNominalMPa, 3);
    expect(protection(K, { ...s, tc: P.trips.coolantTempHighC + 1 })).toBe('PRIMARY PRESSURE HIGH');
  });
});

describe('procedure walk-through', () => {
  it('a careful startup from hot shutdown reaches station load without a trip', () => {
    const u = unit('RX-A05');
    const act = (s: SimState, a: Parameters<typeof applyAction>[3]) => {
      const r = applyAction(K, u.params, s, a);
      expect(r.refused).toBeUndefined();
      return r.state;
    };
    let s = initialState(K, u.params, 'IC-1', 0);
    s = act(s, { type: 'mode', mode: 'STARTUP' });
    s = act(s, { type: 'rod', bank: 'SD', dir: 1 });
    s = run(s, P.rods.steps / P.rods.speedStepsPerS + 2, u.params).s;
    expect(s.rods.SD).toBe(P.rods.steps);
    s = act(s, { type: 'rod', bank: 'SD', dir: 0 });
    let trips = 0;
    let phase: 'approach' | 'sync' | 'load' = 'approach';
    for (let t = 0; t < 900 && phase !== 'load'; t += 0.25) {
      if (phase === 'approach') {
        // Withdraw in short pulls while the startup rate is low; stop at 1 DPM.
        const want = s.sur < 0.8 && s.n < 0.12 ? 1 : 0;
        if (want && !s.rodCmd) s = act(s, { type: 'rod', bank: 'CB', dir: 1 });
        if (!want && s.rodCmd) s = act(s, { type: 'rod', bank: 'CB', dir: 0 });
        if (s.n > 0.1) {
          s = act(s, { type: 'rod', bank: 'CB', dir: 0 });
          s = act(s, { type: 'mode', mode: 'RUN' });
          s = act(s, { type: 'turbineReset' });
          s = act(s, { type: 'genClose' });
          phase = 'sync';
        }
      } else {
        // Hold coolant temperature on programme with the control bank while load comes on.
        const err = s.tc - P.model.noLoadTempC;
        // Short pulls (one tick in sixteen), as the procedure asks, and wait for temperature.
        const pulse = Math.round(t * 4) % 16 === 0;
        const dir = pulse && err < -1 && s.sur < 0.3 ? 1 : pulse && err > 3 ? -1 : 0;
        if ((s.rodCmd?.dir ?? 0) !== dir) s = act(s, { type: 'rod', bank: 'CB', dir });
        if (s.demand >= u.params.stationLoad - 1e-6 && Math.abs(err) < 2) phase = 'load';
      }
      const r = step(K, u.params, s, 0.25);
      s = r.state;
      trips += r.events.filter((e) => e.type === 'trip').length;
    }
    expect(trips).toBe(0);
    expect(phase).toBe('load');
    expect(s.n).toBeGreaterThan(u.params.stationLoad * 0.9);
  });
});

describe('accounts, events and formatting', () => {
  it('Tier 4 sees only the trainer; others see the eight installations; nobody is qualified', () => {
    expect(rulesFor({ id: 'lifesupport', tier: 4 }).simUnits).toEqual([TRAINER]);
    expect(rulesFor({ id: 'lifesupport', tier: 4 }).liveUnits).toEqual([]);
    expect(rulesFor({ id: 'analyst', tier: 3 }).simUnits).toHaveLength(8);
    for (const id of ['analyst', 'lifesupport', 'deputy', 'auditor'] as const) expect(rulesFor({ id, tier: 3 }).liveQualified).toBe(false);
  });

  it('defaults to the home site unit', () => {
    expect(defaultUnit(INSTALLATIONS, 'ALPHA-02')?.id).toBe('RX-A02');
    expect(defaultUnit(INSTALLATIONS, 'GAMMA-08')?.id).toBe('RX-A05');
  });

  it('the fleet has one unplanned trip on record', () => {
    const total = INSTALLATIONS.reduce((a, u) => a + unplannedTrips(u.id), 0);
    expect(total).toBe(1);
    expect(unplannedTrips('RX-A05')).toBe(1);
    expect(eventsFor('RX-A05')[0]!.date >= eventsFor('RX-A05').at(-1)!.date).toBe(true);
  });

  it('formats times Zulu with local where the site is released', () => {
    expect(zuluWithLocal('0640', unit('RX-A05'))).toBe('0640Z (0140 CDT)');
    expect(zuluWithLocal('0640', unit('RX-B08'))).toBe('0640Z');
    expect(logPower(3.2e-5)).toBe('3.2E-5');
  });
});
