import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { history, portalCycle, sample, wander } from '@sim/telemetry.worker';
import { inWorldOffsetMs, seedFor } from './telemetry';

const canon = canonJson as unknown as Canon;
const T0 = 1_779_000_000;

describe('telemetry worker model', () => {
  it('is deterministic for a site and time', () => {
    const s = seedFor(canon.facilities.find((f) => f.id === 'ALPHA-03')!)!;
    expect(sample(s, T0)).toEqual(sample(s, T0));
  });

  it('drifts slowly between 2-second frames', () => {
    const s = seedFor(canon.facilities.find((f) => f.id === 'BETA-04')!)!;
    const a = sample(s, T0);
    const b = sample(s, T0 + 2);
    expect(Math.abs(a.air.co2ppm - b.air.co2ppm)).toBeLessThanOrEqual(2);
    expect(Math.abs(a.water.storagePct - b.water.storagePct)).toBeLessThan(0.2);
  });

  it('stays inside normal bands for every site over a day', () => {
    for (const f of canon.facilities) {
      const s = seedFor(f);
      if (f.class === 'DELTA') {
        expect(s).toBeNull();
        continue;
      }
      for (const r of history(s!, T0 + 86400, 86400, 600)) {
        expect(r.air.o2Pct).toBeGreaterThan(20.8);
        expect(r.air.o2Pct).toBeLessThan(21.0);
        expect(r.air.co2ppm).toBeLessThan(1000);
        expect(r.air.tempC).toBeGreaterThan(19);
        expect(r.air.tempC).toBeLessThan(23);
        expect(r.water.storagePct).toBeGreaterThan(85);
        expect(r.water.storagePct).toBeLessThanOrEqual(96.5);
        expect(Math.abs(r.power.hz - 60)).toBeLessThan(0.05);
        expect(r.air.overPa).toBeGreaterThan(25);
        if (r.power.thermalPct != null && s!.reactor?.status !== 'OFFLINE') expect(r.power.thermalPct).toBeLessThan(80);
      }
    }
  });

  it('follows the canon reactor status', () => {
    const b08 = seedFor(canon.facilities.find((f) => f.id === 'BETA-08')!)!;
    expect(sample(b08, T0).power.source).toBe('DIESEL AND SURFACE');
    expect(sample(b08, T0).power.diesel).toBe('RUNNING');
    const a03 = seedFor(canon.facilities.find((f) => f.id === 'ALPHA-03')!)!;
    expect(sample(a03, T0).power.source).toBe('REACTOR UNIT');
    const g = seedFor(canon.facilities.find((f) => f.class === 'GAMMA')!)!;
    expect(sample(g, T0).power.source).toBe('UTILITY SERVICE');
  });

  it('cycles the personnel portal briefly and keeps every other portal sealed', () => {
    const s = seedFor(canon.facilities.find((f) => f.id === 'ALPHA-01')!)!;
    let cycling = 0;
    for (let t = T0; t < T0 + 3600; t += 5) {
      const r = sample(s, t);
      expect(r.seal.portals.slice(1).every((p) => p.state === 'SEALED')).toBe(true);
      if (r.seal.portals[0]!.state === 'CYCLING') cycling++;
    }
    expect(cycling).toBeGreaterThan(0);
    expect(cycling).toBeLessThan(720 / 5);
    expect(portalCycle('X', T0).lastCycleS).toBeGreaterThanOrEqual(0);
  });

  it('wander is bounded', () => {
    for (let t = 0; t < 100000; t += 997) expect(Math.abs(wander('k', t))).toBeLessThanOrEqual(1);
  });

  it('maps the real clock onto the pinned in-world date', () => {
    const now = new Date();
    const world = new Date(now.getTime() + inWorldOffsetMs(now));
    expect(world.getUTCFullYear()).toBe(2008);
    expect(world.getUTCMonth()).toBe(4);
    expect(world.getUTCHours()).toBe(now.getUTCHours());
  });
});
