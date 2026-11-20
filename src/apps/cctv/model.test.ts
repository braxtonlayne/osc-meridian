import { describe, expect, it } from 'vitest';
import type { AccountDef } from '@core/contracts';
import { CAMERA_COUNT, CAM_BY_ID, CC, SITES, SITE_BY_ID, accessFor, canon, doorsForCamera, dvrStamp, frameFor, platformUsedBy, sceneOf, siteDoorsOf, siteListed, unitChannels, viewAt } from './model';
import type { PlantView, Viewer } from './model';
import { CCTV_EMPTY } from './types';
import { canonModel } from '@sim/transit-sim';

const acct = (id: string, tier: 1 | 2 | 3 | 4, site: string, auditReader = false) => ({ id, tier, site, auditReader }) as unknown as AccountDef;
const v = (a: AccountDef, comps: string[] = []): Viewer => ({ def: a, tier: a.tier, compartments: comps });
const analyst = v(acct('analyst', 3, 'ALPHA-03'), ['LANTERN']);
const lifesupport = v(acct('lifesupport', 4, 'GAMMA-08'));
const deputy = v(acct('deputy', 2, 'ALPHA-02'));
const auditor = v(acct('auditor', 3, 'ALPHA-01', true), ['BRIAR']);
const cam = (id: string) => CAM_BY_ID.get(id)!;

const plant = (over: Partial<PlantView> = {}): PlantView => ({
  isolation: null,
  drill: null,
  dispatch: [],
  doors: null,
  hoist: null,
  muster: null,
  cctv: CCTV_EMPTY,
  seg04: null,
  seg04HoldMs: 60_000,
  model: canonModel(),
  ...over,
});

describe('camera index', () => {
  it('indexes every canon camera plus the one unassigned channel', () => {
    const all = SITES.flatMap((s) => s.cams);
    expect(all.filter((c) => !c.unassigned)).toHaveLength(CAMERA_COUNT);
    expect(all.filter((c) => c.unassigned)).toHaveLength(1);
  });
  it('puts the unassigned channel on a spare channel of its unit', () => {
    const s = SITE_BY_ID.get(CC.unassigned.facility)!;
    const chs = unitChannels(s, CC.unassigned.unit);
    expect(chs[CC.unassigned.channel - 1]!.cam?.unassigned).toBe(true);
    expect(chs.filter((c) => !c.cam).length).toBeGreaterThan(0);
  });
  it('the unassigned placard is a level the site does not list', () => {
    const f = canon.facilities.find((x) => x.id === CC.unassigned.facility)!;
    expect(f.levels?.some((l) => String(l.n) === CC.unassigned.placard)).toBe(false);
  });
});

describe('access', () => {
  it('Tier 4 lists its own site only', () => {
    expect(siteListed(lifesupport, 'GAMMA-08')).toBe(true);
    expect(siteListed(lifesupport, 'ALPHA-02')).toBe(false);
  });
  it('Tier 3 sees other ALPHA platforms but not BETA interiors', () => {
    expect(accessFor(analyst, cam(CC.seg04.nearCamera)).allowed).toBe(true);
    const beta = SITE_BY_ID.get('BETA-04')!.cams.find((c) => c.kind !== 'portal' && c.kind !== 'platform')!;
    expect(accessFor(analyst, beta).allowed).toBe(false);
  });
  it('level tier applies at the own site', () => {
    const t2 = SITE_BY_ID.get('ALPHA-03')!.cams.find((c) => c.tier < 3);
    if (t2) expect(accessFor(analyst, t2).allowed).toBe(false);
  });
  it('Tier 2 sees everything; review is view only', () => {
    expect(SITES.every((s) => s.cams.every((c) => accessFor(deputy, c).allowed || c.tier < 2))).toBe(true);
    const ptz = SITE_BY_ID.get('ALPHA-01')!.cams.find((c) => c.ptz)!;
    expect(accessFor(auditor, ptz).allowed).toBe(true);
    expect(accessFor(auditor, ptz).steer).toBe(false);
  });
});

describe('plant', () => {
  it('segment 04 platform is used only by link 04', () => {
    const c = cam(CC.seg04.nearCamera);
    expect(platformUsedBy(c, 'ALPHA-05', '04')).toBe(true);
    expect(platformUsedBy(c, 'ALPHA-01', '01')).toBe(false);
  });
  it('platform cameras find their tunnel portal door', () => {
    const c = cam(CC.seg04.nearCamera);
    const d = doorsForCamera(c, siteDoorsOf(c.facility), 'SEG04');
    expect(d.secondary?.id).toBe(CC.seg04.portalDoorNear);
  });
  it('shows the segment 04 consist and drops the recording', () => {
    const c = cam(CC.seg04.nearCamera);
    const start = Date.UTC(2026, 0, 1, 12);
    const w = { start, end: start + 150_000 } as never;
    const t = start + 150_000 - 2_000;
    const f = frameFor(c, sceneOf(c), t, t, plant({ seg04: w }), 'ALPHA-03', false);
    expect(f.input.train).not.toBeNull();
    const gap = { camera: c.id, from: start, to: start + 210_000, note: CC.seg04.eventText, notified: true };
    const pb = frameFor(c, sceneOf(c), t, t + 600_000, plant({ cctv: { ...CCTV_EMPTY, gaps: [gap] } }), 'ALPHA-03', true);
    expect(pb.blank).toEqual(['NO RECORDED VIDEO']);
  });
  it('other sites go NO LINK while isolated', () => {
    const c = cam(CC.seg04.nearCamera);
    const t = Date.now();
    const iso = { level: 1, initiations: [], active: true, clearsAt: null } as never;
    expect(frameFor(c, sceneOf(c), t, t, plant({ isolation: iso }), 'ALPHA-03', false).blank?.[0]).toBe('NO LINK');
    expect(frameFor(c, sceneOf(c), t, t, plant({ isolation: iso }), 'ALPHA-02', false).blank).toBeNull();
  });
  it('muster puts persons at the dead reader on platform 3', () => {
    const c = cam(CC.musterCamera.camera);
    const start = Date.now() - 60_000;
    const muster = { runs: [{ id: 'X', site: c.facility, startedAt: start, by: 'deputy', drillId: null, sweeps: [], closeout: null, notices: [] }], seq: 1 } as never;
    const f = frameFor(c, sceneOf(c), Date.now(), Date.now(), plant({ muster }), 'ALPHA-02', false);
    expect(f.input.standing).toBe(CC.musterCamera.standing);
  });
  it('PTZ moves interpolate and park after parkMin', () => {
    const c = SITE_BY_ID.get('ALPHA-03')!.cams.find((x) => x.ptz)!;
    const rec = { yaw: 20, pitch: -5, zoom: 2, preset: 2, from: { yaw: 0, pitch: -7, zoom: 1 }, at: 1000, by: 'analyst' as never };
    expect(viewAt(c, rec, 1000 + CC.recorder.ptzMoveSec * 1000).view.yaw).toBeCloseTo(20);
    expect(viewAt(c, rec, 1000 + (CC.recorder.parkMin * 60 + CC.recorder.ptzMoveSec) * 1000).preset).toBe(1);
  });
  it('stamps the in-world date', () => {
    expect(dvrStamp(Date.now(), { abbr: 'Z', offsetH: 0 }).startsWith('05-19-2008')).toBe(true);
  });
});
