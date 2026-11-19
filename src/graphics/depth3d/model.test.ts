import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { alphaSiteIds, buildSiteModel, isWithheld, spreadLabels } from './model';

const canon = canonJson as unknown as Canon;

describe('@graphics/depth3d model', () => {
  it('covers the five ALPHA sites', () => {
    expect(alphaSiteIds()).toHaveLength(5);
  });

  for (const id of alphaSiteIds()) {
    it(`${id}: depths come from canon and the terminal floor is the site depth`, () => {
      const f = canon.facilities.find((x) => x.id === id)!;
      const m = buildSiteModel(id)!;
      expect(m.depthFt).toBe(f.depthFt);
      expect(m.floorMatchesCanon).toBe(true);
      expect(m.terminal.floorFt).toBe(f.depthFt);
      expect(m.levels).toHaveLength(f.levels!.length);
      for (const l of m.levels) {
        const src = f.levels!.find((x) => x.n === l.n)!;
        expect(l.y1).toBe(-src.topFt);
        expect(l.y0).toBe(-(src.topFt + src.heightFt));
      }
      const canonTick = m.ticks.filter((t) => t.canon);
      expect(canonTick).toHaveLength(1);
      expect(canonTick[0]!.ft).toBe(f.depthFt);
      // one maglev bore per rail segment at the site, and a bore on each side
      const segs = canon.railSegments.filter((s) => s.a === id || s.b === id);
      expect(m.bores.filter((b) => b.kind === 'rail')).toHaveLength(segs.length);
      expect(m.bores.some((b) => b.side < 0)).toBe(true);
      expect(m.bores.some((b) => b.side > 0)).toBe(true);
      // the decline ends at the top of the terminal
      expect(m.ramp.legs[m.ramp.legs.length - 1]!.yb).toBeCloseTo(-m.terminal.topFt, 6);
    });
  }

  it('withholds names whose tier is more restricted than the session', () => {
    expect(isWithheld({ tier: 2 }, 3)).toBe(true);
    expect(isWithheld({ tier: 3 }, 3)).toBe(false);
    expect(isWithheld({ tier: 4 }, 3)).toBe(false);
    expect(isWithheld({ tier: 2 }, 2)).toBe(false);
    expect(isWithheld({ tier: 1 }, 2)).toBe(true);
  });

  it('spreads labels to the minimum gap inside the limits', () => {
    const out = spreadLabels([100, 101, 102, 300], 13, 0, 310);
    for (let i = 1; i < out.length; i++) expect(out[i]! - out[i - 1]!).toBeGreaterThanOrEqual(13 - 1e-9);
    expect(out[out.length - 1]).toBeLessThanOrEqual(310);
    expect(out[0]).toBeGreaterThanOrEqual(0);
  });

  it('returns null for a site with no level record', () => {
    expect(buildSiteModel('BETA-01')).toBeNull();
  });
});
