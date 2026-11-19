import { describe, expect, it } from 'vitest';
import type { AccountDef, DrillState } from '@core/contracts';
import {
  DC,
  DOORS_EMPTY,
  airlockDef,
  applyDrill,
  authority,
  bothLeavesOpen,
  canon,
  chamberDp,
  crossedShift,
  doorDef,
  doorView,
  heldOpen,
  leafPermissive,
  levelIndex,
  logRows,
  onBoard,
  overrideRef,
  planAirlock,
  planClose,
  planOpen,
  rulesFor,
  siteDoors,
} from './model';
import { openFraction, type DoorsState } from './types';

const acct = (id: AccountDef['id']) => canon.accounts.find((a) => a.id === id) as unknown as AccountDef;

describe('door motion', () => {
  const bd = doorDef('G08-BD1')!;
  it('open and close take the canon cycle time and pass through every position', () => {
    const o = planOpen(bd, 0);
    expect(o.map((s) => s.pos)).toEqual(['unlocking', 'opening', 'open']);
    expect(o[2]!.from).toBe(bd.cycleSec * 1000);
    const c = planClose(bd, 0);
    expect(c.map((s) => s.pos)).toEqual(['closing', 'seated', 'closed-locked']);
    expect(c[2]!.from).toBe(bd.cycleSec * 1000);
  });
  it('interpolates the leaf while travelling', () => {
    const rec = { steps: planOpen(bd, 0), cmd: 'open' as const, by: 'lifesupport' as const, override: null };
    const unlock = DC.motion.unlockSec.blast * 1000;
    const mid = unlock + (bd.cycleSec * 1000 - unlock) / 2;
    expect(doorView(bd, rec, mid).frac).toBeCloseTo(0.5, 5);
    expect(openFraction(rec, mid)).toBeCloseTo(0.5, 5);
    expect(doorView(bd, rec, bd.cycleSec * 1000 + 1).pos).toBe('open');
  });
  it('a door without a record sits at its canon normal position', () => {
    expect(doorView(bd, undefined, 0).pos).toBe(bd.normal === 'open' ? 'open' : 'closed-locked');
  });
  it('canon has 296 doors and the GAMMA-08 board has its airlock', () => {
    expect(canon.doors.reduce((n, s) => n + s.doors.length, 0)).toBe(296);
    expect(siteDoors('GAMMA-08')!.airlocks.map((a) => a.id)).toEqual(['G08-AL1']);
  });
});

describe('airlock', () => {
  const al = airlockDef('G08-AL1')!;
  it('a normal cycle takes the canon airlock cycle time', () => {
    const p = planAirlock(al, 'out', false, 0, 'lifesupport', 2);
    expect(p.endsAt).toBe(al.cycleSec * 1000);
    const pin = planAirlock(al, 'in', false, 0, 'lifesupport', 2);
    expect(pin.endsAt).toBe(al.cycleSec * 1000);
  });
  it('decon adds the canon decon time on the way in only', () => {
    const p = planAirlock(al, 'in', true, 0, 'lifesupport', 2);
    expect(p.endsAt).toBe((al.cycleSec + al.deconSec!) * 1000);
    expect(p.airlock.decon).toBe(true);
    expect(planAirlock(al, 'out', true, 0, 'lifesupport', 2).airlock.decon).toBe(false);
  });
  it('both leaves are never open at the same moment during a cycle', () => {
    const p = planAirlock(al, 'in', true, 0, 'lifesupport', 2);
    const st: DoorsState = { ...DOORS_EMPTY, doors: { [al.outer]: p.outer, [al.inner]: p.inner }, airlocks: { [al.id]: p.airlock } };
    for (let t = 0; t <= p.endsAt; t += 250) expect(bothLeavesOpen(al, st, t)).toBe(false);
  });
  it('a leaf opens only at a differential within the permissive', () => {
    const p = planAirlock(al, 'in', false, 0, 'lifesupport', 2);
    const st: DoorsState = { ...DOORS_EMPTY, doors: { [al.outer]: p.outer, [al.inner]: p.inner }, airlocks: { [al.id]: p.airlock } };
    const outerOpen = p.outer.steps.find((s) => s.pos === 'opening')!.from;
    expect(Math.abs(chamberDp(p.airlock, outerOpen))).toBeLessThanOrEqual(DC.pressure.leafOpenMaxDp);
    const innerOpen = p.inner.steps.find((s) => s.pos === 'opening')!.from;
    expect(Math.abs(DC.pressure.insideDp - chamberDp(p.airlock, innerOpen))).toBeLessThanOrEqual(DC.pressure.leafOpenMaxDp);
    expect(leafPermissive(al, al.outer, st, outerOpen)).toBe('cycle');
  });
  it('interlock: with the inner leaf open, the outer leaf is refused', () => {
    const inner = doorDef(al.inner)!;
    const st: DoorsState = { ...DOORS_EMPTY, doors: { [al.inner]: { steps: planOpen(inner, 0), cmd: 'open', by: 'lifesupport', override: null } } };
    expect(leafPermissive(al, al.outer, st, 60_000)).toBe('interlock');
  });
  it('idle chamber is at inside pressure: the outer leaf has no permissive, the inner does', () => {
    expect(leafPermissive(al, al.outer, DOORS_EMPTY, 0)).toBe('dp');
    expect(leafPermissive(al, al.inner, DOORS_EMPTY, 0)).toBeNull();
  });
});

describe('seal drill', () => {
  const drill = (phase: DrillState['phase'], endedAt: number | null = null): DrillState => ({
    id: 'SD-08-0519-01',
    orderedAt: 0,
    by: 'deputy',
    phase,
    sites: { 'GAMMA-08': { ordered: 0, acknowledged: 1000, sealed: null, status: 'sealing' } },
    endedAt,
  });
  it('closes every open drill door at the site, at drill time, and is idempotent', () => {
    const r = applyDrill(DOORS_EMPTY, drill('propagating'), 2000)!;
    const bd = doorDef('G08-BD1')!;
    const v = doorView(bd, r.next.doors['G08-BD1'], 1000 + (bd.cycleSec * 1000) / canon.sealDrill.timeScale + 1);
    expect(v.pos).toBe('closed-locked');
    expect(r.lines).toHaveLength(1);
    expect(applyDrill(r.next, drill('propagating'), 3000)).toBeNull();
  });
  it('stand-down reopens normally open doors', () => {
    const r = applyDrill(DOORS_EMPTY, drill('propagating'), 2000)!;
    const s = applyDrill(r.next, drill('stand-down', 100_000), 100_000)!;
    const bd = doorDef('G08-BD1')!;
    expect(doorView(bd, s.next.doors['G08-BD1'], 200_000).pos).toBe('open');
    expect(s.next.doors['G08-PD1']).toBeUndefined();
  });
});

describe('alarms, authority, log', () => {
  it('a normally closed door left open raises held-open after the canon time', () => {
    const pd = doorDef('G08-PD1')!;
    const st: DoorsState = { ...DOORS_EMPTY, doors: { 'G08-PD1': { steps: planOpen(pd, 0), cmd: 'open', by: 'lifesupport', override: null } } };
    const openAt = pd.cycleSec * 1000;
    expect(heldOpen('GAMMA-08', st, openAt + 1000)).toEqual([]);
    expect(heldOpen('GAMMA-08', st, openAt + DC.motion.heldOpenSec.portal * 1000 + 1)).toEqual(['G08-PD1']);
  });
  it('per-account rules', () => {
    expect(rulesFor(acct('lifesupport')).boards).toEqual(['GAMMA-08']);
    expect(authority(acct('lifesupport'), [], 'GAMMA-08', doorDef('G08-PD1')!).kind).toBe('operate');
    expect(authority(acct('auditor'), ['BRIAR'], 'ALPHA-01', doorDef('A01-PD1')!).kind).toBe('view');
    expect(authority(acct('deputy'), [], 'ALPHA-05', doorDef('A05-PD1')!).kind).toBe('view');
    expect(authority(acct('analyst'), ['LANTERN'], 'ALPHA-03', doorDef('A03-BD3')!).kind).toBe('operate');
    expect(authority(acct('analyst'), ['LANTERN'], 'ALPHA-03', doorDef('A03-PD1')!).kind).toBe('view');
  });
  it('the seeded log names a door that is on no board, on a level not in the index', () => {
    const rows = logRows(DOORS_EMPTY, ['ALPHA-05'], '2008-05-19T12:00:00Z');
    const odd = rows.filter((r) => !onBoard(r.door));
    expect(odd.length).toBeGreaterThan(0);
    for (const r of odd) expect(levelIndex('ALPHA-05').some((l) => l.n === r.level)).toBe(false);
    // nothing after "now" and nothing older than retention
    expect(logRows(DOORS_EMPTY, ['GAMMA-08'], '2008-05-19T04:03:00Z').every((r) => r.at <= Date.parse('2008-05-19T04:03:00Z'))).toBe(true);
  });
  it('watch changes and override references', () => {
    const t = Date.UTC(2008, 4, 19, 11, 59);
    expect(crossedShift(t, t + 2 * 60_000)).toBe(12);
    expect(crossedShift(t, t + 30_000)).toBeNull();
    expect(overrideRef('GAMMA-08', 3)).toBe('DOR-G08-0003');
  });
  it('airlock cycle arithmetic matches canon for every airlock', () => {
    for (const s of canon.doors)
      for (const a of s.airlocks) {
        const leaf = doorDef(a.outer)!.cycleSec;
        expect(4 * leaf + 2 * DC.airlock.dwellSec + 2 * DC.airlock.equalizeSec).toBe(a.cycleSec);
      }
  });
});
