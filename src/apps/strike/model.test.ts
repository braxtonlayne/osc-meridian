import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { StrikeCanon } from '@core/canon-apps/strike';
import {
  conditionFor,
  contourRanges,
  destination,
  distanceMi,
  effectiveRating,
  egressFor,
  evaluate,
  gazetteer,
  overpressureAt,
  parseAnchor,
  summarize,
} from './model';

const canon = canonJson as unknown as Canon;
const frag = canon.apps.strike as StrikeCanon;
const s = canon.survivability;
const R = frag.earthRadiusMi;
const ctx = { canon, frag, places: gazetteer(canon, frag) };
const fac = (id: string) => canon.facilities.find((f) => f.id === id)!;

describe('PM-3 contours (method 1 and 2)', () => {
  it('scales range by the cube root of yield', () => {
    const r1 = contourRanges(s, 1)[0]!.rangeMi;
    const r1000 = contourRanges(s, 1000)[0]!.rangeMi;
    expect(r1).toBeCloseTo(s.contours[0]!.rangeCoeffMi, 9);
    expect(r1000 / r1).toBeCloseTo(10, 9);
  });

  it('returns the contour value at each contour range and interpolates on logarithms between', () => {
    const ranges = contourRanges(s, 100);
    for (const c of ranges.slice(0, -1)) {
      const op = overpressureAt(ranges, c.rangeMi);
      expect(op.band).toBe('psi');
      if (op.band === 'psi') expect(op.psi).toBeCloseTo(c.psi, 6);
    }
    const a = ranges[0]!;
    const b = ranges[1]!;
    const mid = Math.sqrt(a.rangeMi * b.rangeMi); // geometric mean of ranges -> geometric mean of psi
    const op = overpressureAt(ranges, mid);
    if (op.band !== 'psi') throw new Error('expected psi');
    expect(op.psi).toBeCloseTo(Math.sqrt(a.psi * b.psi), 6);
  });

  it('is unaffected beyond the outermost contour and above range inside the innermost', () => {
    const ranges = contourRanges(s, 100);
    expect(overpressureAt(ranges, ranges[0]!.rangeMi * 1.01).band).toBe('below');
    expect(overpressureAt(ranges, ranges[ranges.length - 1]!.rangeMi * 0.5).band).toBe('above');
  });
});

describe('PM-3 rating and condition (method 3 and 4)', () => {
  it('raises the rating with depth by the class coupling', () => {
    const h1 = s.classes.find((c) => c.id === 'H1')!;
    expect(effectiveRating(h1, 0)).toBe(h1.ratedPsi);
    expect(effectiveRating(h1, 1000)).toBeCloseTo(h1.ratedPsi * (1 + h1.depthCoupling), 9);
  });

  it('reads the condition from the ratio thresholds in canon order', () => {
    for (const c of s.conditions) {
      if (c.maxRatio === null) continue;
      expect(conditionFor(s, { band: 'psi', psi: c.maxRatio * 100 }, 100).id).toBe(c.id);
    }
    expect(conditionFor(s, { band: 'below' }, 100).id).toBe(s.conditions[0]!.id);
    expect(conditionFor(s, { band: 'above', psi: 3000 }, 1e9).id).toBe('NOT ASSURED');
  });
});

describe('sphere', () => {
  it('destination and distance agree', () => {
    const p = { lat: 38, lon: -84.5 };
    const q = destination(p, 180, 24, R);
    expect(distanceMi(p, q, R)).toBeCloseTo(24, 6);
    expect(q.lat).toBeLessThan(p.lat);
  });
});

describe('anchors', () => {
  it('places 24 MI S OF LEXINGTON on ALPHA-03', () => {
    const r = parseAnchor('24 mi S of Lexington, KY', ctx);
    if (!r.ok) throw new Error(r.detail);
    const a03 = fac('ALPHA-03');
    expect(distanceMi(r.point, { lat: a03.lat!, lon: a03.lon! }, R)).toBeLessThan(0.1);
    expect(r.label).toBe('24 MI S OF LEXINGTON KY');
  });

  it('accepts designations, cities and coordinates in several forms', () => {
    const a = parseAnchor('alpha-3', ctx);
    expect(a.ok && a.site).toBe('ALPHA-03');
    const b = parseAnchor('37.6932N 84.5037W', ctx);
    const c = parseAnchor('37.6932, -84.5037', ctx);
    const d = parseAnchor('37.6932 84.5037', ctx);
    for (const r of [b, c, d]) {
      if (!r.ok) throw new Error(r.detail);
      expect(r.point.lat).toBeCloseTo(37.6932, 4);
      expect(r.point.lon).toBeCloseTo(-84.5037, 4);
    }
    const e = parseAnchor('10mi NNE denver', ctx);
    expect(e.ok).toBe(true);
    const f = parseAnchor('St. Louis', ctx);
    expect(f.ok).toBe(true);
  });

  it('refuses unknown places, DELTA sites and positions not held', () => {
    expect(parseAnchor('Atlantis', ctx)).toMatchObject({ ok: false, error: 'unknown-place' });
    expect(parseAnchor('DELTA-01', ctx)).toMatchObject({ ok: false, error: 'delta' });
    const withheld = canon.facilities.find((f) => f.class !== 'DELTA' && f.lat == null);
    if (withheld) expect(parseAnchor(withheld.id, ctx)).toMatchObject({ ok: false, error: 'position-not-held' });
    expect(parseAnchor('', ctx)).toMatchObject({ ok: false, error: 'empty' });
  });
});

describe('evaluate', () => {
  it('evaluates every held site, lists the rest, and never models DELTA', () => {
    const a03 = fac('ALPHA-03');
    const ev = evaluate(canon, frag, { lat: a03.lat!, lon: a03.lon! }, 100);
    const nonDelta = canon.facilities.filter((f) => f.class !== 'DELTA').length;
    expect(ev.rows.length + ev.notEvaluated.length).toBe(nonDelta);
    expect(ev.delta.length).toBe(canon.facilities.length - nonDelta);
    expect(ev.rows[0]!.id).toBe('ALPHA-03');
    expect(ev.rows[0]!.condition).toBe('NOT ASSURED');
    expect(ev.rows[0]!.egress.map((e) => e.no)).toEqual(['01', '05']);
    const sum = summarize(s, ev);
    expect(sum.worst).toBe('NOT ASSURED');
    expect(sum.worstSites).toBe('ALPHA-03');
  });

  it('carries segment 04 in the egress basis of ALPHA-05 (model revision basis)', () => {
    const nos = egressFor(canon, 'ALPHA-05').map((e) => e.no);
    expect(nos).toContain('04');
  });

  it('uses the planning depth for GAMMA unless a depth of record is released', () => {
    const g = fac('GAMMA-08');
    const p = { lat: g.lat!, lon: g.lon! };
    const plan = evaluate(canon, frag, p, 10).rows.find((r) => r.id === 'GAMMA-08')!;
    expect(plan.depthBasis).toBe('planning');
    expect(plan.depthFt).toBe(s.gammaPlanningDepthFt);
    const rel = evaluate(canon, frag, p, 10, { 'GAMMA-08': 310 }).rows.find((r) => r.id === 'GAMMA-08')!;
    expect(rel.depthBasis).toBe('release');
    expect(rel.depthFt).toBe(310);
  });
});
