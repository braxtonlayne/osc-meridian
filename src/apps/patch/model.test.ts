import { describe, expect, it } from 'vitest';
import type { AccountDef } from '@core/contracts';
import {
  CIRCUITS,
  EMPTY,
  HUBS,
  LIVE_UNASSIGNED,
  PC,
  circuit,
  circuitsAt,
  classifyCord,
  computeLinks,
  dial,
  lampOf,
  listedDesks,
  pairKey,
  ringdownOf,
  runTest,
  service,
  utilitiesAt,
} from './model';
import { bayAccess, decide } from './rules';
import type { PatchCord, PatchState } from './types';

const c = (id: string) => {
  const x = circuit(id);
  if (!x) throw new Error(`no circuit ${id}`);
  return x;
};

const cord = (site: string, a: string, b: string, purpose: PatchCord['purpose']): PatchCord => ({
  id: 'PC-0001',
  site,
  a,
  b,
  purpose,
  by: 'analyst',
  at: '2008-05-19T15:00:00Z',
  wall: 0,
  order: null,
  authorised: false,
});

const withCords = (...cords: PatchCord[]): PatchState => ({ ...EMPTY, cords });

type Who = Pick<AccountDef, 'id' | 'tier' | 'site'>;
const analyst: Who = { id: 'analyst', tier: 3, site: 'ALPHA-03' };
const deputy: Who = { id: 'deputy', tier: 2, site: 'ALPHA-02' };
const auditor: Who = { id: 'auditor', tier: 3, site: 'ALPHA-01' };
const lifesupport: Who = { id: 'lifesupport', tier: 4, site: 'GAMMA-08' };

describe('canon fragment', () => {
  it('has unique circuit ids and five hub bays', () => {
    expect(new Set(CIRCUITS.map((x) => x.id)).size).toBe(CIRCUITS.length);
    expect(HUBS.length).toBe(5);
  });
  it('the GAMMA-08 block carries only its maintenance circuit side', () => {
    const at = circuitsAt('GAMMA-08');
    expect(at.length).toBeGreaterThan(0);
    expect(utilitiesAt('GAMMA-08')).toEqual(['TST', 'OPR']);
  });
  it('never prints an unlisted desk', () => {
    expect(listedDesks().some((d) => d.ext === '7411')).toBe(false);
  });
});

describe('classifyCord', () => {
  it('test set and operator position need the LINE jack', () => {
    expect(classifyCord('ALPHA-03', 'A03/TST', 'T05-V2/L')).toMatchObject({ ok: true, purpose: 'test' });
    expect(classifyCord('ALPHA-03', 'A03/TST', 'T05-V2/E').ok).toBe(false);
    expect(classifyCord('ALPHA-03', 'A03/OPR', 'A03-X1/L')).toMatchObject({ ok: true, purpose: 'call' });
  });
  it('a repatch joins LINE to EQPT of different circuits in one bay', () => {
    expect(classifyCord('ALPHA-03', 'T05-V2/E', 'T05-SP1/L')).toMatchObject({ ok: true, purpose: 'repatch' });
    expect(classifyCord('ALPHA-03', 'T05-V2/E', 'T05-V1/E').ok).toBe(false);
    expect(classifyCord('ALPHA-03', 'T05-V2/E', 'T05-V2/L').ok).toBe(false);
    expect(classifyCord('ALPHA-03', 'T05-V2/E', 'T02-SP1/L').ok).toBe(false);
  });
});

describe('service and isolation', () => {
  it('a repatch onto the spare carries the circuit', () => {
    const s = withCords(cord('ALPHA-03', 'T05-V2/E', 'T05-SP1/L', 'repatch'));
    expect(service(s, c('T05-V2'), false)).toMatchObject({ status: 'REPATCHED', via: 'T05-SP1' });
  });
  it('isolation kills inter-site circuits, not site circuits, and not the segment 04 pair', () => {
    expect(service(null, c('T05-V2'), true).status).toBe('DEAD');
    expect(service(null, c('A03-X1'), true).status).toBe('IN SERVICE');
    expect(service(null, c(LIVE_UNASSIGNED), true).status).not.toBe('DEAD');
    const ctx = { now: 0, isolated: true, drillRelay: false, drillOrigin: 'ALPHA-01', seg04: true, calling: new Set<string>() };
    expect(lampOf(null, c('T05-V2'), ctx)).toBe('dark');
    expect(lampOf(null, c(LIVE_UNASSIGNED), ctx)).toBe('busy');
  });
});

describe('runTest', () => {
  it('fails the noisy T05-V2 on line quality', () => {
    expect(runTest('quality', c('T05-V2'), 0, false).result).toBe('FAIL');
  });
  it('fails everything while dead', () => {
    expect(runTest('tone', c('T03-V2'), 0, true).result).toBe('FAIL');
  });
  it('an open unassigned pair reads open; the live one reads terminated', () => {
    expect(runTest('loopback', c('T04-SP2'), 0, false).result).toBe('PASS');
    const live = runTest('loopback', c(LIVE_UNASSIGNED), 0, false);
    expect(live.result).toBe('MARGINAL');
    expect(live.summary).toMatch(/expected: open/);
  });
});

describe('dial plan', () => {
  it('listed desk, intercept, hours and the unlisted number', () => {
    expect(dial('ALPHA-02', '4400', 12)).toMatchObject({ kind: 'desk', listed: true });
    expect(dial('ALPHA-02', '9999', 12).kind).toBe('intercept');
    expect(dial('ALPHA-01', '7700', 2).kind).toBe('no-reply');
    expect(dial('ALPHA-05', '7411', 12)).toMatchObject({ kind: 'desk', listed: false });
  });
  it('the segment 04 pair rings down to the unassigned far end', () => {
    expect(ringdownOf(c(LIVE_UNASSIGNED))).toEqual(PC.ringdowns.UNASSIGNED);
  });
});

describe('computeLinks', () => {
  it('reports every revenue segment, and a data bearer cord takes its link down', () => {
    const base = computeLinks(null, 0);
    const key = pairKey('ALPHA-03', 'ALPHA-05');
    expect(base[key]).toBeDefined();
    expect(base[pairKey('ALPHA-02', 'ALPHA-05')]).toBeUndefined();
    const cut = computeLinks(withCords(cord('ALPHA-03', 'A03/TST', 'T05-D1/L', 'test')), 1);
    expect(cut[key]!.state).toBe('DOWN');
  });
});

describe('rules per account', () => {
  const today = '190508';
  it('bay access', () => {
    expect(bayAccess(analyst, 'ALPHA-03', HUBS)).toBe('operate');
    expect(bayAccess(analyst, 'ALPHA-05', HUBS)).toBe('view');
    expect(bayAccess(auditor, 'ALPHA-01', HUBS)).toBe('view');
    expect(bayAccess(lifesupport, 'ALPHA-03', HUBS)).toBe('hidden');
    expect(bayAccess(lifesupport, 'GAMMA-08', HUBS)).toBe('operate');
  });
  it('analyst repatch needs confirmation and holds no order; deputy quotes command authority', () => {
    const a = decide(analyst, 'ALPHA-03', 'repatch', [c('T05-V2'), c('T05-SP1')], HUBS, today);
    expect(a).toMatchObject({ ok: true, authorised: false, order: null });
    expect(a.ok && a.confirm).toBeTruthy();
    const d = decide(deputy, 'ALPHA-02', 'repatch', [c('T03-V1'), c('T03-SP1')], HUBS, today);
    expect(d).toMatchObject({ ok: true, authorised: true, order: `${PC.panel.authorisedOrderPrefix}-A02/${today}` });
  });
  it('remote bays are view only', () => {
    expect(decide(analyst, 'ALPHA-05', 'test', [c('T05-V2')], HUBS, today).ok).toBe(false);
  });
  it('the auditor may only monitor', () => {
    expect(decide(auditor, 'ALPHA-03', 'monitor', [c('T05-V2')], HUBS, today).ok).toBe(true);
    expect(decide(auditor, 'ALPHA-01', 'test', [c('T02-V1')], HUBS, today).ok).toBe(false);
  });
  it('tier 4 may test and call its own maintenance circuit only', () => {
    expect(decide(lifesupport, 'GAMMA-08', 'call', [c('G08-M1')], HUBS, today).ok).toBe(true);
    expect(decide(lifesupport, 'GAMMA-08', 'test', [c('G08-M1')], HUBS, today).ok).toBe(true);
    expect(decide(lifesupport, 'GAMMA-08', 'monitor', [c('G08-M1')], HUBS, today).ok).toBe(false);
    const other = circuitsAt('GAMMA-08').find((x) => x.kind !== 'MAINT');
    if (other) expect(decide(lifesupport, 'GAMMA-08', 'test', [other], HUBS, today).ok).toBe(false);
  });
});
