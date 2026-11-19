import { describe, expect, it } from 'vitest';
import { areaOffset, buildCanon, destination, greatCircleMi, loadInputs } from '../../scripts/canon-merge';
import type { Canon } from '../../src/core/canon-types';
import { PN_RE } from '../../src/core/canon-schema';

const inputs = loadInputs();
const result = buildCanon(inputs);
const canon: Canon = result.canon;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const fac = (id: string) => {
  const f = canon.facilities.find((x) => x.id === id);
  if (!f) throw new Error(`no facility ${id}`);
  return f;
};
const anomaly = (id: string) => {
  const a = canon.anomalies.find((x) => x.id === id);
  if (!a) throw new Error(`no anomaly ${id}`);
  return a;
};

describe('canon merge', () => {
  it('builds without validation errors', () => {
    expect(result.errors).toEqual([]);
  });

  it('works with source.json alone', () => {
    const solo = buildCanon({ source: inputs.source, extendedA: null, extendedB: null });
    expect(solo.errors).toEqual([]);
    expect(solo.canon.headline.staffPosted).toBe(3057);
    expect(solo.canon.facilities.filter((f) => f.class !== 'DELTA')).toHaveLength(35);
  });
});

describe('headline figures', () => {
  const h = canon.headline;
  it('matches the source executive summary', () => {
    expect(h.facilities).toBe(47);
    expect(h.hubs).toBe(12);
    expect(h.capacitySustained).toBe(23400);
    expect(h.staffTotal).toBe(3847);
    expect(h.utilizationPct).toBe(16.4);
    expect(h.programCostB).toBe(287);
    expect(h.tunnelCertifiedMi).toBe(847);
  });
  it('derives the computed figures', () => {
    expect(h.capacitySurge).toBe(34700);
    expect(h.staffPosted).toBe(3057);
    expect(h.staffUnposted).toBe(790);
    expect(h.railEngineeringMi).toBe(6074);
    expect(h.tramEngineeringMi).toBe(10538);
    expect(h.tramLinkSumMi).toBe(10538);
  });
  it('has class counts 5/12/18/12 and tier sum 3847', () => {
    expect(canon.classes.map((k) => k.count)).toEqual([5, 12, 18, 12]);
    expect(sum(canon.tiers.map((t) => t.count))).toBe(3847);
    expect(canon.tiers.map((t) => t.count)).toEqual([11, 247, 1891, 1698]);
    for (const k of ['ALPHA', 'BETA', 'GAMMA'] as const) {
      expect(canon.facilities.filter((f) => f.class === k)).toHaveLength(canon.classes.find((c) => c.id === k)!.count);
    }
  });
  it('ALPHA breakdowns sum to staff', () => {
    for (const f of canon.facilities.filter((x) => x.class === 'ALPHA')) {
      expect(sum(f.staffBreakdown.map((l) => l.count))).toBe(f.staff);
    }
  });
  it('budget and phases agree with source', () => {
    expect(sum(canon.budget.categories.map((c) => c.amountB))).toBe(287);
    expect(sum(canon.budget.sources.map((s) => s.pct))).toBe(100);
    expect(canon.phases.map((p) => p.cumulative)).toEqual([347, 2170, 3847, null, null]);
    expect(canon.phases[3]!.targetCount).toBe(Math.round(0.4 * canon.headline.capacitySustained));
    expect(canon.phases[4]!.targetCount).toBe(Math.round(0.75 * canon.headline.capacitySustained));
  });
});

describe('the five discrepancies', () => {
  it('UNPOSTED_790: 3847 vs 3057', () => {
    const a = anomaly('UNPOSTED_790');
    expect(a.figures.tierTotal).toBe(3847);
    expect(a.figures.facilityStaffSum).toBe(3057);
    expect(a.figures.unposted).toBe(790);
    expect(canon.headline.staffTotal - canon.headline.staffPosted).toBe(790);
    const classStaff = sum(canon.classes.map((k) => k.statedStaff));
    expect(classStaff).toBe(3057);
  });

  it('TUNNEL_847: certified vs engineering', () => {
    const a = anomaly('TUNNEL_847');
    expect(a.figures.certifiedMi).toBe(847);
    expect(a.figures.railEngineeringMi).toBe(sum(canon.railSegments.map((s) => s.miles)));
    expect(a.figures.railEngineeringMi).toBe(6074);
    expect(a.figures.tramEngineeringMi).toBe(10538);
    expect(a.figures.engineeringTotalMi).toBe(6074 + 10538);
    for (const n of canon.tramNetworks) expect(sum(n.links.map((l) => l.miles))).toBe(n.statedTotalMi);
  });

  it('CAPACITY_23400: sustained vs surge', () => {
    const a = anomaly('CAPACITY_23400');
    expect(a.figures.sustained).toBe(23400);
    expect(a.figures.surge).toBe(34700);
    expect(sum(canon.classes.map((k) => k.statedCapacity))).toBe(34700);
    const alphaCap = sum(canon.facilities.filter((f) => f.class === 'ALPHA').map((f) => f.capacity));
    expect(alphaCap).toBe(16000);
  });

  it('SEGMENT_04: in the table, absent from both connection lists', () => {
    const seg = canon.railSegments.find((s) => s.no === '04')!;
    expect(seg.a).toBe('ALPHA-02');
    expect(seg.b).toBe('ALPHA-05');
    expect(seg.status).toBe('NOT IN REVENUE SERVICE');
    expect(seg.completed).toBe('2007-03');
    expect(fac('ALPHA-02').connectionsText).not.toContain('ALPHA-05');
    expect(fac('ALPHA-05').connectionsText).not.toContain('ALPHA-02');
    for (const s of canon.railSegments.filter((x) => x.no !== '04')) {
      expect(s.status).toBe('IN REVENUE SERVICE');
      expect(fac(s.a).connectionsText).toContain(s.b);
      expect(fac(s.b).connectionsText).toContain(s.a);
    }
  });

  it('ELECTRONIC_COPY: 11 copies, no electronic copies', () => {
    const a = anomaly('ELECTRONIC_COPY');
    expect(a.figures.copies).toBe(11);
    expect(a.figures.electronicCopiesPermitted).toBe(0);
    const dist = canon.classificationControl.find((c) => c.label === 'Document Distribution')!;
    expect(dist.text).toContain('11 copies');
    expect(dist.text).toContain('no electronic copies permitted');
    expect(canon.tiers[0]!.count).toBe(11);
  });
});

describe('positions', () => {
  it('every facility has lat/lon inside the CONUS bounding box', () => {
    for (const f of canon.facilities) {
      expect(f.lat, f.id).toBeGreaterThan(24.4);
      expect(f.lat, f.id).toBeLessThan(49.4);
      expect(f.lon, f.id).toBeGreaterThan(-124.8);
      expect(f.lon, f.id).toBeLessThan(-66.9);
    }
  });
  it('anchored facilities sit the stated distance from their city', () => {
    for (const f of canon.facilities) {
      if (typeof f.anchor.miles !== 'number') continue;
      const d = greatCircleMi(f.anchor.cityLat, f.anchor.cityLon, f.lat!, f.lon!);
      expect(Math.abs(d - f.anchor.miles), f.id).toBeLessThan(0.1);
    }
  });
  it('area offsets are deterministic and small', () => {
    expect(areaOffset('GAMMA-01')).toEqual(areaOffset('GAMMA-01'));
    for (const f of canon.facilities.filter((x) => x.class === 'GAMMA')) {
      const d = greatCircleMi(f.anchor.cityLat, f.anchor.cityLon, f.lat!, f.lon!);
      expect(d).toBeGreaterThanOrEqual(3.9);
      expect(d).toBeLessThanOrEqual(9.1);
    }
    const keys = new Set(canon.facilities.map((f) => `${f.lat},${f.lon}`));
    expect(keys.size).toBe(canon.facilities.length);
  });
  it('destination(): due north 69.09 mi is about one degree of latitude', () => {
    const p = destination(40, -100, 0, 69.09);
    expect(p.lat).toBeCloseTo(41, 1);
    expect(p.lon).toBeCloseTo(-100, 4);
  });
});

describe('operator and markings', () => {
  it('operator is a Tier 3 probationary analyst at ALPHA-03 with LANTERN', () => {
    expect(canon.operator.tier).toBe(3);
    expect(canon.operator.site).toBe('ALPHA-03');
    expect(canon.operator.compartments).toEqual(['LANTERN']);
    expect(canon.operator.probationStart).toBe('2008-04-14');
    expect(canon.operator.pn).toBe('P-3-06-1147');
    expect(canon.operator.pn).toMatch(PN_RE);
    if (canon.roster.length > 0) {
      expect(canon.roster.some((p) => p.pn === canon.operator.supervisorPn)).toBe(true);
      expect(canon.roster.some((p) => p.pn === canon.operator.pn)).toBe(false);
    }
  });
  it('five markings ranked 0..4', () => {
    expect(canon.markings.map((m) => [m.id, m.rank])).toEqual([
      ['TSSCI-OSC', 0],
      ['UMBRA-R', 1],
      ['UMBRA-C', 2],
      ['UMBRA-U', 3],
      ['UMBRA-EO', 4],
    ]);
  });
  it('legal notice does not reproduce the statutory wording', () => {
    expect(canon.legalNotice).not.toMatch(/Espionage Act|U\.S\.C\.|793|794|798/);
  });
});
