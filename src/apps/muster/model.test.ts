import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { DrillState } from '@core/contracts';
import type { MusterCanon } from '@core/canon-apps/muster';
import { allRuns, badgeOfPn, closeoutOf, evaluate, minToMs, nameVisible, reconciliation, runId, shortSite, siteModel, upsertRun, type ModelInputs } from './model';
import { MUSTER_NONE, type MusterRun } from './types';

const canon = canonJson as unknown as Canon;
const muster = canon.apps.muster as MusterCanon;
const inp: ModelInputs = { canon, muster };
const TS = canon.sealDrill.timeScale;

const run = (site: string, extra: Partial<MusterRun> = {}): MusterRun => ({ id: `T-${site}`, site, startedAt: 1_000_000, by: 'deputy', drillId: null, sweeps: [], closeout: null, notices: [], ...extra });
const at = (min: number) => 1_000_000 + minToMs(min, TS);

describe('site model', () => {
  it('places exactly the assigned staff at every point of every site', () => {
    for (const s of canon.musterPoints) {
      const m = siteModel(s.facility, inp)!;
      expect(m.people.length).toBe(s.points.reduce((a, p) => a + p.assigned, 0));
      for (const p of s.points) expect(m.people.filter((x) => x.point === p.id).length).toBe(p.assigned);
      const fac = canon.facilities.find((f) => f.id === s.facility)!;
      expect(m.people.length).toBe(fac.staff);
    }
  });

  it('issues unique badges per site that never collide with a directory entry or an unknown badge', () => {
    const reserved = new Set(canon.roster.map((r) => badgeOfPn(r.pn)));
    for (const s of canon.musterPoints) {
      const m = siteModel(s.facility, inp)!;
      const anon = m.people.filter((p) => !p.pn).map((p) => p.badge);
      expect(new Set(anon).size).toBe(anon.length);
      for (const b of anon) {
        expect(reserved.has(b)).toBe(false);
        expect(muster.unknownBadges.some((u) => u.badge === b)).toBe(false);
      }
    }
  });

  it('is deterministic', () => {
    const a = siteModel('ALPHA-02', inp)!;
    const b = siteModel('ALPHA-02', { canon, muster })!;
    expect(a.people.map((p) => `${p.badge}${p.atMin}${p.reader}`)).toEqual(b.people.map((p) => `${p.badge}${p.atMin}${p.reader}`));
  });

  it('gives ALPHA platform points one reader per platform and marks segment 04 readers out of service', () => {
    const m = siteModel('ALPHA-02', inp)!;
    const plat = m.readers.filter((r) => r.point === 'A02-MP3');
    expect(plat.length).toBeGreaterThan(1);
    expect(plat.find((r) => r.id === 'A02-MP3-R3')?.inService).toBe(false);
    expect(m.people.some((p) => p.reader === 'A02-MP3-R3')).toBe(false);
  });
});

describe('run evaluation', () => {
  it('reads nobody at the alarm and every badging person by report time', () => {
    const r = run('GAMMA-08');
    expect(evaluate(r, at(0), inp, TS)!.totals.present).toBe(0);
    const v = evaluate(r, at(muster.classes[2]!.reportMin), inp, TS)!;
    const m = siteModel('GAMMA-08', inp)!;
    expect(v.totals.present).toBe(m.people.filter((p) => p.fate === 'badge').length);
    expect(v.totals.present + v.totals.roster + v.totals.unaccounted).toBe(v.totals.assigned);
  });

  it('sweeps locate the staff who did not badge', () => {
    const site = 'ALPHA-02';
    const m = siteModel(site, inp)!;
    const sweeps = m.points.map((p, i) => ({ id: `SW-${i}`, point: p.id, by: 'deputy' as const, at: at(1) }));
    const v = evaluate(run(site, { sweeps }), at(40), inp, TS)!;
    expect(v.totals.unaccounted).toBe(0);
    expect(v.totals.located).toBe(m.people.filter((p) => p.fate === 'sweep').length);
  });

  it('ALPHA-02 platforms read more staff badges than are assigned, and the close-out says so', () => {
    const site = 'ALPHA-02';
    const m = siteModel(site, inp)!;
    const sweeps = m.points.map((p, i) => ({ id: `SW-${i}`, point: p.id, by: 'deputy' as const, at: at(1) }));
    const v = evaluate(run(site, { sweeps }), at(40), inp, TS)!;
    expect(v.totals.unknown).toBe(muster.unknownBadges.filter((u) => u.site === site).length);
    const plat = v.points.find((p) => p.point.id === 'A02-MP3')!;
    expect(plat.present + plat.located + plat.roster + plat.unknown).toBeGreaterThan(plat.assigned);
    const c = closeoutOf(v, 'deputy', at(40));
    expect(c.discrepancies.length).toBeGreaterThan(0);
    expect(c.discrepancies.join(' ')).toContain('05-0142');
  });

  it('a GAMMA-08 muster with every point swept closes out reconciled', () => {
    const m = siteModel('GAMMA-08', inp)!;
    const sweeps = m.points.map((p, i) => ({ id: `SW-${i}`, point: p.id, by: 'lifesupport' as const, at: at(1) }));
    const v = evaluate(run('GAMMA-08', { sweeps }), at(30), inp, TS)!;
    expect(closeoutOf(v, 'lifesupport', at(30)).discrepancies).toEqual([]);
  });

  it('freezes a closed run at its signature', () => {
    const r = run('BETA-03');
    const v1 = evaluate(r, at(2), inp, TS)!;
    const closed = { ...r, closeout: closeoutOf(v1, 'deputy', at(2)) };
    expect(evaluate(closed, at(30), inp, TS)!.totals).toEqual(v1.totals);
  });
});

describe('runs and reconciliation', () => {
  it('derives drill musters from acknowledged sites and lets stored runs win', () => {
    const drill: DrillState = {
      id: 'SD-08-0519-01',
      orderedAt: 0,
      by: 'deputy',
      phase: 'propagating',
      endedAt: null,
      sites: {
        'ALPHA-01': { ordered: 0, acknowledged: 10, sealed: null, status: 'acknowledged' },
        'GAMMA-08': { ordered: 5, acknowledged: null, sealed: null, status: 'pending' },
      },
    };
    const sites = canon.musterPoints.map((s) => s.facility);
    const runs = allRuns(MUSTER_NONE, drill, sites);
    expect(runs.map((r) => r.id)).toEqual(['SD-08-0519-01/A01']);
    const stored = upsertRun(MUSTER_NONE, runs[0]!, (r) => ({ ...r, notices: ['x'] }));
    expect(allRuns(stored, drill, sites)[0]!.notices).toEqual(['x']);
  });

  it('formats ids', () => {
    expect(shortSite('GAMMA-08')).toBe('G08');
    expect(runId('ALPHA-02', '2008-05-19', 3)).toBe('MU-A02-0519-03');
    expect(badgeOfPn('P-3-05-0142')).toBe('05-0142');
  });

  it('reconciles assembly points against posted staff and DETACHED / UNPOSTED', () => {
    const r = reconciliation(canon);
    expect(r.postedStaff + r.unposted).toBe(r.totalPersonnel);
    expect(r.assignedToPoints + r.postedOffNetwork).toBe(r.postedStaff);
    expect(r.postedOffNetwork).toBeGreaterThan(0);
  });

  it('shows names only at or below the viewer tier, never Tier 1', () => {
    expect(nameVisible(3, 3)).toBe(true);
    expect(nameVisible(2, 3)).toBe(false);
    expect(nameVisible(2, 2)).toBe(true);
    expect(nameVisible(1, 1)).toBe(false);
    expect(nameVisible(null, 2)).toBe(false);
  });
});
