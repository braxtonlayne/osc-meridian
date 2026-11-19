import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.client.json';
import type { Canon } from '../../core/canon-types';
import { addDays, classLines, facilityLines, probationPeriodDays, probationStatus, reconciliation, tierLines } from './strength';
import { parsePath, pathOf, navEntries } from './model';

const canon = canonJson as unknown as Canon;

describe('strength lines', () => {
  it('reads tier, class and facility lines from canon', () => {
    expect(tierLines(canon).map((t) => t.count)).toEqual([...canon.tiers].sort((a, b) => a.tier - b.tier).map((t) => t.count));
    expect(classLines(canon)).toHaveLength(canon.classes.length);
    expect(facilityLines(canon)).toHaveLength(canon.headline.facilities);
  });
  it('totals are the canon headline figures, unreconciled', () => {
    const r = reconciliation(canon);
    expect(r.totalPersonnel).toBe(canon.headline.staffTotal);
    expect(r.totalPosted).toBe(canon.headline.staffPosted);
    expect(r.unposted).toBe(canon.headline.staffUnposted);
  });
  it('canon lines agree with the canon totals they sit under', () => {
    expect(tierLines(canon).reduce((a, t) => a + t.count, 0)).toBe(canon.headline.staffTotal);
    expect(classLines(canon).reduce((a, c) => a + c.posted, 0)).toBe(canon.headline.staffPosted);
    expect(facilityLines(canon).reduce((a, f) => a + f.posted, 0)).toBe(canon.headline.staffPosted);
  });
});

describe('probation', () => {
  it('reads the period from the canon rule', () => {
    expect(probationPeriodDays(canon.security.personnel.compartmentation)).toBeGreaterThan(0);
    expect(probationPeriodDays('no period stated')).toBeNull();
  });
  it('computes end date and days remaining', () => {
    expect(addDays('2008-04-14', 30)).toBe('2008-05-14');
    const s = probationStatus('2008-04-14', 90, 47);
    expect(s.end).toBe('2008-07-13');
    expect(s.daysRemaining).toBe(43);
    expect(probationStatus('2008-04-14', 90, 120).day).toBe(90);
    expect(probationStatus('2008-04-14', 90, -2).servedPct).toBe(0);
  });
});

describe('routes', () => {
  it('parses every app path and round-trips', () => {
    for (const e of navEntries()) {
      const v = parsePath(e.path);
      expect(v).not.toBeNull();
      expect(pathOf(v!)).toBe(e.path);
    }
    expect(parsePath(null)).toEqual({ kind: 'overview' });
    expect(parsePath('/personnel/tier/9')).toBeNull();
    expect(parsePath('/personnel/unposted')).toBeNull();
    expect(parsePath('/registry')).toBeNull();
  });
  it('covers every personnel route in the manifest', async () => {
    const { default: manifest } = await import('../../../content/manifest.json');
    const pages = ((manifest as { pages?: { app: string; route: string }[] }).pages ?? (manifest as unknown as { app: string; route: string }[]));
    const mine = pages.filter((p) => p.app === 'personnel');
    expect(mine.length).toBeGreaterThan(0);
    for (const p of mine) expect(parsePath(p.route), p.route).not.toBeNull();
  });
});
