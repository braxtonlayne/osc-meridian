import { describe, expect, it } from 'vitest';
import { buildSiteModel } from '@graphics/depth3d';
import { sectionTransform } from './ShaftElevation';

describe('sectionTransform', () => {
  it('maps grade and the terminal floor inside the drawing for every ALPHA site', () => {
    for (const id of ['ALPHA-01', 'ALPHA-02', 'ALPHA-03', 'ALPHA-04', 'ALPHA-05']) {
      const m = buildSiteModel(id)!;
      const { Y, s } = sectionTransform(m, 520, 600);
      expect(s).toBeGreaterThan(0);
      const grade = Y(0);
      const floor = Y(-m.depthFt);
      expect(grade).toBeGreaterThan(0);
      expect(floor).toBeGreaterThan(grade);
      expect(floor).toBeLessThan(600);
      expect(floor - grade).toBeCloseTo(m.depthFt * s, 6);
    }
  });
});
