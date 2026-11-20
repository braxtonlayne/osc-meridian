import { describe, expect, it } from 'vitest';
import {
  EMPTY_STATE,
  HOISTS,
  M,
  authority,
  cageAt,
  call,
  hoistById,
  inch,
  landingAt,
  landingRestriction,
  limits,
  motionEnd,
  positionWords,
  profileAt,
  run,
  runProfile,
  runRefusal,
  runSeconds,
  setGates,
  setLoad,
  setMode,
  settle,
  stop,
  unitOf,
  vanes,
  zoneAt,
} from './model';
import type { PlantCtx } from './model';

const ctx = (now: number, extra: Partial<PlantCtx> = {}): PlantCtx => ({ now, isolated: false, sealed: new Set(), dateLabel: '19 MAY 2008', ...extra });
const H = (id: string) => hoistById(id)!;

describe('speed profile', () => {
  it('reaches rated speed on a long run and covers the distance exactly', () => {
    const p = runProfile(1130, 1600 / 60, 1600 / 60 / 10, 1, 4);
    expect(p.vp).toBeCloseTo(1600 / 60);
    expect(profileAt(p, p.total).d).toBeCloseTo(1130);
    expect(profileAt(p, p.tA).v).toBeCloseTo(p.vp);
    // continuous at phase boundaries
    const eps = 1e-6;
    for (const t of [p.tA, p.tA + p.tC, p.tA + p.tC + p.tD]) expect(profileAt(p, t - eps).d).toBeCloseTo(profileAt(p, t + eps).d, 3);
  });

  it('short runs never reach rated speed and still end at the landing', () => {
    const p = runProfile(34, 1600 / 60, 1600 / 60 / 10, 1, 4);
    expect(p.vp).toBeLessThan(1600 / 60);
    expect(profileAt(p, p.total).d).toBeCloseTo(34);
    expect(profileAt(p, p.total - 0.1).v).toBeCloseTo(1); // creeping in
  });

  it('a full personnel-hoist run takes longer than travel at rated speed', () => {
    const h = H('A03-H1');
    expect(runSeconds(h, h.travelFt)).toBeGreaterThan(h.travelFt / (h.speedFpm / 60));
  });
});

describe('shaft', () => {
  it('lists a vane at every landing and limits beyond the end landings', () => {
    for (const h of HOISTS) {
      const v = vanes(h);
      for (const s of h.stops) expect(v.some((x) => x.listed && x.depthFt === s.depthFt)).toBe(true);
      const lim = limits(h);
      expect(lim.top).toBeLessThan(h.stops[0]!.depthFt);
      expect(lim.bottom).toBeGreaterThan(h.stops[h.stops.length - 1]!.depthFt);
    }
  });

  it('personnel shafts carry unlisted vanes at the Tier 1 levels they pass', () => {
    const v = vanes(H('A03-H1')).filter((x) => !x.listed);
    expect(v.map((x) => x.level)).toEqual([11]);
    expect(vanes(H('A01-H1')).filter((x) => !x.listed).map((x) => x.level)).toEqual([11, 12]);
    expect(vanes(H('A02-H1')).filter((x) => !x.listed)).toEqual([]);
  });

  it('the A02 freight hoist has a sump vane below its bottom landing, inside its final limit', () => {
    const h = H('A02-H2');
    const sump = vanes(h).find((x) => x.kind === 'sump')!;
    const bottom = h.stops[h.stops.length - 1]!.depthFt;
    expect(sump.depthFt).toBeGreaterThan(bottom);
    expect(sump.depthFt).toBeLessThan(limits(h).bottom);
    expect(zoneAt(h, sump.depthFt)?.kind).toBe('sump');
    expect(positionWords(h, sump.depthFt)).toBe(`below landing ${h.stops[h.stops.length - 1]!.level}`);
  });

  it('describes intermediate positions by listed landings only', () => {
    const h = H('A03-H1');
    const l11 = vanes(h).find((x) => x.level === 11)!;
    expect(positionWords(h, l11.depthFt)).toBe('between landings 10 and 12');
  });
});

describe('runs', () => {
  const h = H('A02-H1');
  it('runs to a landing and settles there', () => {
    let s = setMode(EMPTY_STATE, h, 'manual', 'deputy', 0);
    expect(runRefusal(unitOf(s, h), h, 9, ctx(0))).toBeNull();
    s = run(s, h, 9, 'deputy', 1000);
    const end = motionEnd(unitOf(s, h).motion!);
    const mid = cageAt(unitOf(s, h), (1000 + end) / 2);
    expect(mid.moving).toBe(true);
    const r = settle(s, ctx(end + 1));
    expect(r.changed).toBe(true);
    expect(landingAt(h, unitOf(r.state, h).posFt)).toBe(9);
    expect(r.state.events.at(-1)?.kind).toBe('arrive');
  });

  it('refuses with gates open, overload, at the landing, and to a sealed portal', () => {
    let s = setMode(EMPTY_STATE, h, 'manual', 'deputy', 0);
    const at = landingAt(h, unitOf(s, h).posFt)!;
    expect(runRefusal(unitOf(s, h), h, at, ctx(0))).toMatch(/at landing/);
    s = setGates(s, h, 'open', 'deputy', 0);
    expect(runRefusal(unitOf(s, h), h, 9, ctx(0))).toMatch(/gates are open/i);
    s = setGates(s, h, 'closed', 'deputy', 0);
    s = setLoad(s, h, h.cagePersons + M.personStep, 0, 'deputy', 0);
    expect(s.events.at(-1)?.kind).toBe('overload');
    expect(runRefusal(unitOf(s, h), h, 9, ctx(0))).toMatch(/rated payload/);
    s = setLoad(s, h, 0, 0, 'deputy', 0);
    expect(runRefusal(unitOf(s, h), h, 1, ctx(0, { sealed: new Set([h.facility]) }))).toMatch(/sealed/);
  });

  it('an emergency stop trips the hoist, stops short of the target and returns to service later', () => {
    let s = setMode(EMPTY_STATE, h, 'manual', 'deputy', 0);
    s = run(s, h, 11, 'deputy', 0);
    const end = motionEnd(unitOf(s, h).motion!);
    const t = end / 2;
    const r = stop(s, h, 'estop', 'deputy', t);
    const u = unitOf(r.state, h);
    expect(u.trip?.cause).toBe('estop');
    expect(r.restFt).toBeLessThan(h.stops.at(-1)!.depthFt);
    expect(runRefusal(u, h, 11, ctx(t + 60_000))).toMatch(/tripped/);
    const back = settle(r.state, ctx(u.trip!.returnAt! + 1));
    expect(unitOf(back.state, h).trip).toBeNull();
    expect(unitOf(back.state, h).posFt).toBeCloseTo(r.restFt);
  });

  it('inspection inching to the final limit trips on overtravel', () => {
    const f = H('A02-H2');
    let s = setMode(EMPTY_STATE, f, 'inspection', 'deputy', 0);
    s = inch(s, f, 1, 'deputy', 0);
    const end = motionEnd(unitOf(s, f).motion!);
    const r = settle(s, ctx(end + 1));
    expect(unitOf(r.state, f).trip?.cause).toBe('overtravel');
    expect(unitOf(r.state, f).posFt).toBeCloseTo(limits(f).bottom);
  });
});

describe('automatic mode', () => {
  it('answers a call: runs, opens gates, dwells, then serves the next call', () => {
    const h = H('A03-H1');
    let s = call(EMPTY_STATE, h, 5, 'analyst', 0);
    s = call(s, h, 12, 'analyst', 0);
    let r = settle(s, ctx(0));
    const u = unitOf(r.state, h);
    expect(u.motion?.kind).toBe('run');
    const firstTarget = (u.motion as { toLevel: number }).toLevel;
    expect(firstTarget).toBe(5); // nearest call first
    r = settle(r.state, ctx(motionEnd(u.motion!) + 1));
    const at5 = unitOf(r.state, h);
    expect(at5.gates).toBe('open');
    expect(at5.calls).toEqual([12]);
    r = settle(r.state, ctx(at5.dwellUntil! + 1));
    const next = unitOf(r.state, h);
    expect(next.gates).toBe('closed');
    expect(next.motion?.startedAt).toBe(at5.dwellUntil! + 1 + M.gateCycleSec * 1000);
  });
});

describe('authority', () => {
  const a03 = H('A03-H1');
  const a02 = H('A02-H1');
  it('analyst calls at ALPHA-03 but does not drive; deputy drives at ALPHA-02', () => {
    const analyst = { id: 'analyst' as const, tier: 3, site: 'ALPHA-03' };
    const deputy = { id: 'deputy' as const, tier: 2, site: 'ALPHA-02' };
    expect(authority(analyst, a03, false)).toMatchObject({ call: true, drive: false, estop: true });
    expect(authority(analyst, a02, false)).toMatchObject({ call: false, drive: false, estop: false });
    expect(authority(deputy, a02, false)).toMatchObject({ call: true, drive: true, estop: true });
    expect(authority(deputy, a03, false).drive).toBe(false);
  });
  it('isolation removes remote control', () => {
    expect(authority({ id: 'deputy', tier: 2, site: 'ALPHA-02' }, a02, true)).toMatchObject({ call: false, drive: false, estop: false });
  });
  it('restricted landings need the tier or compartment', () => {
    const none = () => false;
    const t3 = (k: string) => k === 'T3';
    expect(landingRestriction(a03, 9, t3)?.key).toBe('T2');
    expect(landingRestriction(a03, 5, t3)).toBeNull();
    expect(landingRestriction(a03, 8, t3)?.key).toBe('LANTERN');
    expect(landingRestriction(a03, 8, (k) => k === 'LANTERN')).toBeNull();
    expect(landingRestriction(a03, 9, none)?.key).toBe('T2');
  });
});
