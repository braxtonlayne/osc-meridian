// Run: npx vitest run -c src/graphics/tunnelmap/vitest.config.ts
import { describe, expect, it } from 'vitest';
import { CERTIFIED, certifiedLinks, certifiedSumMi, CERTIFIED_ROUTE_MILEAGE } from './certified';
import { canon, tunnelLinks, linkOf } from './links';

describe('tunnelmap certified schedule', () => {
  it('every certified entry is a listed link, once', () => {
    const ids = CERTIFIED.map((c) => c.link);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(linkOf(id), id).toBeDefined();
    expect(certifiedLinks()).toHaveLength(CERTIFIED.length);
  });

  it('certified links sum exactly to the canon certified mileage (847)', () => {
    expect(canon.headline.tunnelCertifiedMi).toBe(847);
    expect(certifiedSumMi()).toBe(canon.headline.tunnelCertifiedMi);
    expect(CERTIFIED_ROUTE_MILEAGE).toBe(canon.headline.tunnelCertifiedMi);
  });

  it('every entry carries a one-line rationale', () => {
    for (const c of CERTIFIED) {
      expect(c.rationale.length).toBeGreaterThan(20);
      expect(c.rationale).not.toMatch(/\n/);
    }
  });

  it('the engineering link table matches canon totals', () => {
    const rail = tunnelLinks.filter((l) => l.kind === 'RAIL');
    const tram = tunnelLinks.filter((l) => l.kind === 'TRAM');
    expect(rail).toHaveLength(canon.railSegments.length);
    expect(rail.reduce((s, l) => s + l.miles, 0)).toBe(canon.headline.railEngineeringMi);
    expect(tram.reduce((s, l) => s + l.miles, 0)).toBe(canon.headline.tramEngineeringMi);
    expect(new Set(tunnelLinks.map((l) => l.id)).size).toBe(tunnelLinks.length);
  });

  it('every link has two positioned ends and a straight-line distance', () => {
    for (const l of tunnelLinks) expect(l.straightMi, l.id).toBeGreaterThan(0);
  });

  it('segment 04 is the only link not in revenue service', () => {
    expect(tunnelLinks.filter((l) => !l.inRevenueService).map((l) => l.id)).toEqual(['RAIL-04']);
  });
});
