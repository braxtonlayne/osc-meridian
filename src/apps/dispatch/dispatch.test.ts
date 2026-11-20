import { describe, expect, it } from 'vitest';
import type { DrillState, IsolationState } from '@core/contracts';
import { canonModel, createSim, deskPossessions } from '@sim/transit-sim';
import { NO_PLANT, routeConflicts, runLegs, runState, type Occupation, type PlantInput } from '@sim/transit-model';
import { autoRoute, cancel, cancelCheck, DSP, KEY_ENGRG, KEY_INSTR, KEY_NORMAL, manualHold, newRecord, nextRef, release, releaseCheck, RULES, SEG04, settle, stepRoute, stockPositions } from './logic';
import type { DispatchRecord } from './types';

const model = canonModel();
const T0 = Date.UTC(2026, 10, 19, 12, 0, 0);
const MIN = 60_000;
const H = 60 * MIN;

function rec(route: string[], departAt = T0, extra: Partial<DispatchRecord> = {}): DispatchRecord {
  return { ...newRecord({ ref: 'DSP-A02-0519-001', by: 'deputy', consist: 'R02-101', model, route, departAt, desk: 'TC/A02' }), ...extra };
}

function isoAt(ms: number, active = true): IsolationState {
  const d = new Date(ms);
  return { level: 1, initiations: [{ at: `2008-05-19T${d.toISOString().slice(11)}`, by: 'analyst', ref: 'NI-08-0001' }], active, clearsAt: null };
}

function drillAt(ms: number, phase: DrillState['phase'] = 'propagating'): DrillState {
  return { id: 'SD-08-0519-01', orderedAt: ms, by: 'deputy', phase, sites: {}, endedAt: null };
}

describe('dispatch run model', () => {
  it('times legs at canon line speed with platform dwell between them', () => {
    const legs = runLegs(model, ['ALPHA-02', 'ALPHA-01', 'ALPHA-03'], DSP.working.dwellMin.rail * MIN)!;
    expect(legs).toHaveLength(2);
    expect(legs[0]!.link).toBe('02');
    expect(legs[0]!.end).toBeCloseTo((model.byKey['02']!.miles / model.railSpeed) * H, 0);
    expect(legs[1]!.start - legs[0]!.end).toBe(DSP.working.dwellMin.rail * MIN);
    expect(runLegs(model, ['ALPHA-02', 'GAMMA-08'], 0)).toBeNull();
  });

  it('runs, dwells and arrives', () => {
    const r = rec(['ALPHA-02', 'ALPHA-01', 'ALPHA-03']);
    expect(runState(model, r, NO_PLANT, T0 - MIN).status).toBe('scheduled');
    const mid = runState(model, r, NO_PLANT, T0 + H);
    expect(mid.status).toBe('running');
    expect(mid.onLink?.link).toBe('02');
    const legs = mid.legs;
    const dwell = runState(model, r, NO_PLANT, T0 + legs[0]!.end + MIN);
    expect(dwell.atNode).toBe('ALPHA-01');
    expect(runState(model, r, NO_PLANT, T0 + legs[1]!.end + MIN).status).toBe('arrived');
  });

  it('isolation holds a train where it stands; release resumes it from there', () => {
    const r = rec(['ALPHA-02', 'ALPHA-01']);
    const plant: PlantInput = { isolation: isoAt(T0 + H), drill: null };
    const st = runState(model, r, plant, T0 + 2 * H);
    expect(st.status).toBe('held');
    expect(st.elapsed).toBeCloseTo(H, -3);
    expect(st.onLink?.link).toBe('02');
    expect(releaseCheck(st).ok).toBe(false);
    // isolation over: still held until the desk releases it (latched)
    const latched = settle(model, r, plant, T0 + 2 * H);
    expect(latched.holds.map((h) => h.ref)).toEqual(['NI-08-0001']);
    const after: PlantInput = { isolation: isoAt(T0 + H, false), drill: null };
    const st2 = runState(model, latched, after, T0 + 3 * H);
    expect(st2.status).toBe('held');
    const ok = releaseCheck(st2);
    expect(ok.ok).toBe(true);
    const rel = release(latched, st2, ok.ok ? ok.refs : [], T0 + 3 * H);
    const st3 = runState(model, rel, after, T0 + 3 * H + 10 * MIN);
    expect(st3.status).toBe('running');
    expect(st3.elapsed).toBeCloseTo(H + 10 * MIN, -3);
  });

  it('a seal drill brings a running train to the next platform and holds it there', () => {
    const r = rec(['ALPHA-02', 'ALPHA-01', 'ALPHA-03']);
    const plant: PlantInput = { isolation: null, drill: drillAt(T0 + H) };
    const legs = runState(model, r, NO_PLANT, T0).legs;
    const before = runState(model, r, plant, T0 + 2 * H);
    expect(before.status).toBe('running');
    expect(before.pending[0]?.kind).toBe('drill');
    const st = runState(model, r, plant, T0 + legs[0]!.end + 2 * H);
    expect(st.status).toBe('held');
    expect(st.atNode).toBe('ALPHA-01');
    expect(cancelCheck(st)).toBe(true);
    expect(cancel(r, st).endNode).toBe('ALPHA-01');
  });

  it('a desk hold stops the train at the next platform and may be released at once', () => {
    const r = manualHold(rec(['ALPHA-02', 'ALPHA-01']), T0 + H);
    const legs = runState(model, r, NO_PLANT, T0).legs;
    const st = runState(model, r, NO_PLANT, T0 + legs[0]!.end + MIN);
    expect(st.status).toBe('arrived');
    const r2 = manualHold(rec(['ALPHA-02', 'ALPHA-01', 'ALPHA-03']), T0 + H);
    const st2 = runState(model, r2, NO_PLANT, T0 + legs[0]!.end + MIN);
    expect(st2.status).toBe('held');
    expect(releaseCheck(st2).ok).toBe(true);
  });
});

describe('interlocking', () => {
  it('refuses segment 04 except in key position 3; the shortest route never uses it', () => {
    expect(stepRoute(model, ['ALPHA-02'], 'ALPHA-05', KEY_NORMAL)).toMatchObject({ ok: false, code: 'seg04' });
    expect(stepRoute(model, ['ALPHA-02'], 'ALPHA-05', KEY_ENGRG)).toMatchObject({ ok: false, code: 'seg04-engrg' });
    expect(stepRoute(model, ['ALPHA-02'], 'ALPHA-05', KEY_INSTR)).toMatchObject({ ok: true, route: ['ALPHA-02', 'ALPHA-05'], system: 'RAIL' });
    expect(autoRoute(model, 'ALPHA-02', 'ALPHA-05')).toMatchObject({ ok: false, code: 'seg04' });
    expect(autoRoute(model, 'ALPHA-02', 'ALPHA-05', KEY_INSTR)).toMatchObject({ ok: true, route: ['ALPHA-02', 'ALPHA-05'] });
    const via = autoRoute(model, 'ALPHA-04', 'ALPHA-05');
    expect(via.ok && via.route).not.toContain('04');
    expect(via.ok && via.route.join('>')).not.toBe('ALPHA-04>ALPHA-02>ALPHA-05');
  });

  it('refuses mixed systems and unjoined steps', () => {
    expect(stepRoute(model, ['ALPHA-05', 'ALPHA-03'], 'BETA-09', KEY_NORMAL)).toMatchObject({ ok: false, code: 'mixed' });
    expect(stepRoute(model, ['ALPHA-05'], 'BETA-09', KEY_NORMAL)).toMatchObject({ ok: false, code: 'no-link' });
    expect(autoRoute(model, 'ALPHA-05', 'GAMMA-08')).toMatchObject({ ok: true, system: 'TRAM', route: ['ALPHA-05', 'GAMMA-08'] });
  });

  it('finds opposing movements on single-line tram links, headway, and possessions', () => {
    const legs = runLegs(model, ['ALPHA-05', 'GAMMA-08'], 0)!;
    const run = legs[0]!.end;
    const opp: Occupation = { link: 'ALPHA-05>GAMMA-08', from: 'GAMMA-08' as never, start: T0 + run / 4, end: T0 + run / 4 + run, label: 'S7U02 (TSO-030)', source: 'timetable' };
    const c = routeConflicts(model, legs, T0, [opp], [], RULES);
    expect(c.map((x) => x.kind)).toContain('opposing');
    const same: Occupation = { ...opp, from: 'ALPHA-05' as never, start: T0 + MIN };
    expect(routeConflicts(model, legs, T0, [same], [], RULES).map((x) => x.kind)).toEqual(['headway']);
    // rail is double guideway: opposing is no conflict
    const r = runLegs(model, ['ALPHA-01', 'ALPHA-03'], 0)!;
    expect(routeConflicts(model, r, T0, [{ ...opp, link: '01', from: 'ALPHA-03' as never }], [], RULES)).toEqual([]);
    const poss = deskPossessions(model, T0);
    expect(poss[0]!.link).toBe(DSP.possessions[0]!.link);
    const pl = runLegs(model, ['BETA-07', 'GAMMA-13'], 0)!;
    expect(routeConflicts(model, pl, T0, [], poss, RULES).map((x) => x.kind)).toEqual(['possession']);
  });

  it('places consists: stabled, out on a run, at the end of the run', () => {
    const r = rec(['ALPHA-02', 'ALPHA-01']);
    const out = stockPositions(model, [r], NO_PLANT, T0 + H).find((s) => s.stock.id === 'R02-101')!;
    expect(out.at).toBeNull();
    const back = stockPositions(model, [r], NO_PLANT, T0 + 20 * H).find((s) => s.stock.id === 'R02-101')!;
    expect(back.at).toBe('ALPHA-01');
    expect(stockPositions(model, [], NO_PLANT, T0).find((s) => s.stock.id === 'R04-001')!.stock.available).toBe(false);
  });

  it('numbers the log per in-world day', () => {
    expect(nextRef('DSP-A02', '2008-05-19', [])).toBe('DSP-A02-0519-001');
    expect(nextRef('DSP-A02', '2008-05-19', [{ ref: 'DSP-A02-0519-007' }])).toBe('DSP-A02-0519-008');
  });

  it('withdraws an instruction movement after arrival and draws it suppressed meanwhile', () => {
    const r: DispatchRecord = { ...rec(['ALPHA-02', 'ALPHA-05']), instruction: SEG04.instructionNo };
    const sim = createSim();
    const cfg = { timetable: null, seg04: null, logBase: null, places: [], sheets: {}, dispatch: [r], plant: NO_PLANT };
    const b = sim.state(T0 + H, cfg);
    const t = b.trains.find((x) => x.dispatched)!;
    expect(t.link).toBe('04');
    expect(t.suppressed).toBe(true);
    expect(t.label).toBe(SEG04.suppressedLabel);
    const total = runState(model, r, NO_PLANT, T0).total;
    expect(settle(model, r, NO_PLANT, T0 + total + SEG04.withdrawAfterMs + MIN).withdrawn).toBe(true);
  });

  it('board holds booked trains under isolation', () => {
    const sim = createSim();
    const plant: PlantInput = { isolation: isoAt(T0), drill: null };
    const r = rec(['ALPHA-02', 'ALPHA-01'], T0 - H);
    const b = sim.state(T0 + H, { timetable: null, seg04: null, logBase: null, places: [], sheets: {}, dispatch: [r], plant });
    expect(b.holds.isolation).toBe('NI-08-0001');
    expect(b.trains.find((x) => x.dispatched)?.held).toBe(true);
  });
});
