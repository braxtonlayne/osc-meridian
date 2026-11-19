import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.client.json';
import type { Canon } from '@core/canon-types';
import type { DrillCanon } from '@core/canon-apps/drill';
import { buildPlan, calendarInSession, createDrill, endDrill, evaluate, localSites, logLines, manualAck, manualSealed, minuteAt, monthsSince, nextDrillId, siteStatusAt, summarize, wallAt } from './model';

const canon = canonJson as unknown as Canon;
const frag = canon.apps.drill as DrillCanon;
const DAY = canon.meta.inWorldDate;
/** 0600Z: outside the BETA-05 cover course session (1300Z to 2200Z). */
const T0600 = Date.UTC(2026, 10, 19, 6, 0, 0);
/** 1500Z: inside it. */
const T1500 = Date.UTC(2026, 10, 19, 15, 0, 0);
const hold = { holdMin: frag.holdMin };
const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);

function drill(now = T0600, isolated = false) {
  return createDrill({ canon, frag, inWorldIso: DAY, orderedAt: now, isolated, id: 'SD-08-0519-01', now, by: 'deputy', secondOfficer: frag.orderPosition.secondOfficers[0]! });
}

describe('seal drill plan', () => {
  it('covers the 35 canon sequence sites in receipt order, origin first, no DELTA', () => {
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T0600, isolated: false });
    expect(plan.map((p) => p.facility)).toEqual(canon.sealDrill.sequence.map((s) => s.facility));
    expect(plan).toHaveLength(35);
    expect(plan[0]!.facility).toBe(canon.sealDrill.origin);
    expect(plan.some((p) => p.facility.startsWith('DELTA'))).toBe(false);
  });

  it('times an ordinary site from its class timings', () => {
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T0600, isolated: false });
    const g08 = plan.find((p) => p.facility === 'GAMMA-08')!;
    const k = canon.sealDrill.classes.find((c) => c.classId === 'GAMMA')!;
    expect(g08.receipt).toBe(2);
    expect(g08.ack).toBe(2 + k.ackMin);
    expect(g08.doorsDone).toBe(2 + k.ackMin + k.doorCycleMin);
    expect(g08.sealed).toBe(2 + k.sealMin);
    expect(g08.deadline).toBe(2 + 2 * k.sealMin);
    expect(g08.causes).toEqual([]);
    expect(g08.circuit).toBe('TRAM A05>G08');
  });

  it('applies the canon-fact rules: one duty officer, completion, acceptance, drilled exemption', () => {
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T0600, isolated: false });
    const by = (f: string) => plan.find((p) => p.facility === f)!;
    expect(monthsSince('2008-04', DAY)).toBe(1);
    expect(by('GAMMA-14').causes).toEqual(['single-duty-officer', 'acceptance']);
    expect(by('GAMMA-14').sealed).toBeNull();
    expect(by('GAMMA-14').doorsDone).not.toBeNull();
    expect(by('GAMMA-17').causes).toContain('unpracticed');
    expect(by('GAMMA-13').causes).not.toContain('unpracticed');
    expect(by('BETA-05').causes).not.toContain('calendar');
  });

  it('defers BETA-05 only while its calendar entry is in session', () => {
    const ev = canon.calendar.find((e) => e.id === 'CAL-0805-22');
    expect(calendarInSession(ev, '2008-05-23', DAY, T1500)).toBe(true);
    expect(calendarInSession(ev, '2008-05-23', DAY, T0600)).toBe(false);
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T1500, isolated: false });
    const b05 = plan.find((p) => p.facility === 'BETA-05')!;
    expect(b05.causes).toContain('calendar');
    expect(b05.doorsDone).toBeNull();
    expect(siteStatusAt(b05, b05.ack! + 0.1)).toBe('acknowledged');
    expect(siteStatusAt(b05, b05.deadline)).toBe('no-report');
  });

  it('carries the ALPHA-05 acknowledgement on the order wire, before its receipt', () => {
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T0600, isolated: false });
    const a05 = plan.find((p) => p.facility === 'ALPHA-05')!;
    expect(a05.ack!).toBeLessThan(a05.receipt);
    expect(a05.ackCircuit).not.toBe(a05.circuit);
    expect(a05.sealed).toBe(a05.receipt + a05.sealMin);
  });

  it('cuts every site beyond the hub circuits when isolated', () => {
    const local = localSites(canon);
    expect([...local].sort()).toEqual(['ALPHA-01', 'BETA-01', 'BETA-02', 'BETA-10', 'GAMMA-03', 'GAMMA-04', 'GAMMA-07']);
    const plan = buildPlan({ canon, frag, inWorldIso: DAY, orderedAt: T0600, isolated: true });
    for (const p of plan) expect(p.causes.includes('cut')).toBe(!local.has(p.facility));
  });
});

describe('seal drill state', () => {
  it('propagates, holds sealed, then stands down after the hold', () => {
    let s = drill();
    expect(s.phase).toBe('propagating');
    expect(s.sites['ALPHA-01']!.status).toBe('pending');
    const last = Math.max(...Object.values(s.plan).map((p) => p.sealed ?? p.deadline));
    s = evaluate(s, wallAt(s, last) + 1, false, canon, hold);
    expect(s.phase).toBe('sealed');
    const sum = summarize(s);
    expect(sum.sealed + sum.noReport.length).toBe(35);
    expect(sum.noReport).toEqual(['GAMMA-14']);
    expect(sum.late).toEqual(expect.arrayContaining(['GAMMA-17', 'GAMMA-06', 'BETA-12']));
    expect(sum.outOfSequence).toEqual(['ALPHA-05']);
    s = evaluate(s, s.sealedAt! + frag.holdMin * s.msPerMin + 1, false, canon, hold);
    expect(s.phase).toBe('stand-down');
    expect(s.endedBy).toBe('network-control');
  });

  it('returns the same object when only the clock moved', () => {
    const s = drill();
    expect(evaluate(s, s.orderedAt + 10, false, canon, hold)).toBe(s);
  });

  it('freezes statuses at an abort', () => {
    const s0 = drill();
    const at = wallAt(s0, 3);
    const s = endDrill(evaluate(s0, at, false, canon, hold), at, 'aborted', 'deputy', canon);
    const later = evaluate(s, at + 600_000, false, canon, hold);
    expect(later.phase).toBe('aborted');
    expect(later.sites['GAMMA-18']!.status).toBe('pending');
  });

  it('cuts unreached sites when isolation starts mid-drill', () => {
    const s0 = drill();
    const s = evaluate(s0, wallAt(s0, 1.5), true, canon, hold);
    expect(s.plan['ALPHA-04']!.causes).toContain('cut');
    expect(s.plan['ALPHA-02']!.causes).not.toContain('cut');
    expect(s.plan['GAMMA-04']!.causes).not.toContain('cut');
  });

  it('lets the site operator acknowledge and report sealed early, within the rules', () => {
    let s = drill();
    const p = s.plan['GAMMA-08']!;
    expect(manualAck(s, 'GAMMA-08', wallAt(s, p.receipt - 0.5))).toBeNull();
    s = manualAck(s, 'GAMMA-08', wallAt(s, p.receipt + 1))!;
    expect(s.plan['GAMMA-08']!.ack).toBeCloseTo(p.receipt + 1);
    const q = s.plan['GAMMA-08']!;
    expect(manualSealed(s, 'GAMMA-08', wallAt(s, q.doorsDone! - 0.1))).toBeNull();
    s = manualSealed(s, 'GAMMA-08', wallAt(s, q.doorsDone! + 0.1))!;
    expect(minuteAt(s, wallAt(s, s.plan['GAMMA-08']!.sealed!))).toBeLessThan(p.sealed!);
  });

  it('writes the log in order with the ALPHA-05 acknowledgement ahead of its relay', () => {
    const s0 = drill();
    const s = evaluate(s0, wallAt(s0, 30), false, canon, hold);
    const lines = logLines(s, wallAt(s, 30), hhmm);
    for (let i = 1; i < lines.length; i++) expect(lines[i]!.t).toBeGreaterThanOrEqual(lines[i - 1]!.t);
    const ack = lines.findIndex((l) => l.kind === 'ack' && l.facility === 'ALPHA-05');
    const relay = lines.findIndex((l) => l.kind === 'relay' && l.facility === 'ALPHA-05');
    expect(ack).toBeGreaterThan(0);
    expect(ack).toBeLessThan(relay);
    expect(lines.some((l) => l.kind === 'no-report' && l.facility === 'GAMMA-14')).toBe(true);
  });

  it('numbers drills per in-world day', () => {
    expect(nextDrillId('SD', DAY, [])).toBe('SD-08-0519-01');
    expect(nextDrillId('SD', DAY, ['SD-08-0519-01', 'SD-08-0519-02', 'SD-07-1015-01'])).toBe('SD-08-0519-03');
  });
});
