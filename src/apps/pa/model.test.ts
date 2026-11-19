import { describe, expect, it } from 'vitest';
import type { AccountDef, DrillState, IsolationState } from '@core/contracts';
import {
  airtimeMs,
  answerBack,
  appendRequests,
  authorise,
  autoBroadcasts,
  canon,
  dedupe,
  historyRows,
  inTestWindow,
  keysFor,
  keysOverlap,
  makeRequest,
  messageByNo,
  pa,
  rowVisible,
  simulate,
  siteZones,
  wallFromInWorld,
  zonesShown,
  type CallContext,
} from './model';
import { PA_EMPTY, type PaState } from './types';

const acct = (id: string) => canon.accounts.find((a) => a.id === id) as AccountDef;
const msg = (no: string) => messageByNo(no)!;

function ctx(over: Partial<CallContext> & { account: AccountDef }): CallContext {
  return {
    site: over.account.site,
    zones: [],
    message: msg('16'),
    isolated: false,
    drillSites: new Set(),
    kind: 'broadcast',
    ...over,
  };
}

describe('zones', () => {
  it('numbers level zones from 01 and adds the unassigned zone 00 at ALPHA-02', () => {
    const z = siteZones('ALPHA-02')!;
    const levels = canon.facilities.find((f) => f.id === 'ALPHA-02')!.levels!;
    const lz = z.zones.filter((x) => x.kind === 'level');
    expect(lz.length).toBe(levels.length);
    expect(lz[0]!.id).toBe('A02-Z01');
    const z00 = z.zones.find((x) => x.id === 'A02-Z00')!;
    expect(z00.kind).toBe('unassigned');
    expect(z00.level).toBeNull();
    expect(z.allCall.length).toBe(levels.length + 1);
  });

  it('GAMMA sites use the template levels and their muster areas', () => {
    const z = siteZones('GAMMA-08')!;
    expect(z.zones.filter((x) => x.kind === 'level').length).toBe(canon.templateLevels.GAMMA.length);
    expect(z.zones.some((x) => x.id === 'G08-MP1' && x.kind === 'area')).toBe(true);
    expect(siteZones('DELTA-01')).toBeNull();
  });

  it('division zone covers its levels; area shares its level channel', () => {
    expect(keysFor(['A03-RD'])).toEqual(['A03-Z06', 'A03-Z07', 'A03-Z08']);
    expect(keysOverlap(keysFor(['A02-MP1']), keysFor(['A02-Z05']))).toBe(true);
    expect(keysOverlap(['A02-*'], ['A02-Z05'])).toBe(true);
    expect(keysOverlap(['A02-*'], ['A03-Z05'])).toBe(false);
    expect(keysOverlap(['*'], ['G08-Z01'])).toBe(true);
    expect(answerBack(['A03-RD'])).toBe(3);
  });
});

describe('airtime and test window', () => {
  it('adds tones and repeats', () => {
    const m = msg('01');
    const evac = pa.tones.find((t) => t.id === 'EVAC')!.steps.reduce((s, x) => s + x.ms, 0);
    expect(airtimeMs(m)).toBe(evac + m.durationSec * 1000 * m.repeat);
  });
  it('test window is the published Zulu window on the in-world weekday', () => {
    const [sh, sm] = [Number(pa.testWindow.startZ.slice(0, 2)), Number(pa.testWindow.startZ.slice(2))];
    const inside = new Date(Date.UTC(2026, 0, 1, sh, sm + 1));
    const outside = new Date(Date.UTC(2026, 0, 1, (sh + 3) % 24, 0));
    expect(inTestWindow(inside, canon.meta.inWorldDate)).toBe(new Date(`${canon.meta.inWorldDate}T00:00:00Z`).getUTCDay() === pa.testWindow.weekday);
    expect(inTestWindow(outside, canon.meta.inWorldDate)).toBe(false);
  });
});

describe('authorise', () => {
  it('auditor never originates', () => {
    const v = authorise(ctx({ account: acct('auditor'), zones: ['A01-OIA'] }));
    expect(v.ok).toBe(false);
  });
  it('analyst: own division zone with a routine message only', () => {
    const a = acct('analyst');
    expect(authorise(ctx({ account: a, zones: ['A03-RD'] })).ok).toBe(true);
    const other = authorise(ctx({ account: a, zones: ['A03-Z02'] }));
    expect(other.ok).toBe(false);
    expect(!other.ok && other.mail).toBe('zone');
    expect(authorise(ctx({ account: a, zones: ['A03-RD'], message: msg('03') })).ok).toBe(false);
    expect(authorise(ctx({ account: a, zones: ['A03-RD'], kind: 'test', message: msg('90') })).ok).toBe(false);
  });
  it('deputy: own site, restricted levels noted, other sites refused with mail, zone 00 refused', () => {
    const d = acct('deputy');
    expect(authorise(ctx({ account: d, zones: ['A02-ALL'], message: msg('01') }))).toEqual({ ok: true, note: null });
    const restrictedZone = siteZones('ALPHA-02')!.zones.find((z) => z.kind === 'level' && z.tier === 2)!;
    expect(authorise(ctx({ account: d, zones: [restrictedZone.id] }))).toEqual({ ok: true, note: 'restricted' });
    const far = authorise(ctx({ account: d, site: 'ALPHA-05', zones: ['A05-Z01'] }));
    expect(!far.ok && far.mail).toBe('zone');
    expect(authorise(ctx({ account: d, zones: ['A02-Z00'] })).ok).toBe(false);
    expect(authorise(ctx({ account: d, zones: ['NET-ALL'] })).ok).toBe(false);
  });
  it('isolation refuses remote sites without a zone mail', () => {
    const v = authorise(ctx({ account: acct('deputy'), site: 'ALPHA-05', zones: ['A05-Z01'], isolated: true }));
    expect(!v.ok && v.mail).toBe(null);
  });
  it('tier 4: no life safety calls; drill suspends routine calls', () => {
    const t = acct('lifesupport');
    const ls = authorise(ctx({ account: t, zones: ['G08-ALL'], message: msg('01') }));
    expect(!ls.ok && ls.mail).toBe('lifesafety');
    expect(authorise(ctx({ account: t, zones: ['G08-Z02'], message: msg('03') })).ok).toBe(true);
    expect(authorise(ctx({ account: t, zones: ['G08-Z02'], drillSites: new Set(['GAMMA-08']) })).ok).toBe(false);
  });
  it('withheld and automatic messages cannot be selected', () => {
    expect(authorise(ctx({ account: acct('deputy'), zones: ['A02-Z03'], message: msg(pa.withheld.no) })).ok).toBe(false);
    expect(authorise(ctx({ account: acct('deputy'), zones: ['A02-Z03'], message: msg('31') })).ok).toBe(false);
  });
});

describe('simulate', () => {
  const base = 1_000_000;
  const req = (at: number, no: string, zones: string[]) => makeRequest({ at, by: 'deputy', origin: 'ALPHA-02', source: 'operator', message: msg(no), zones });
  const build = (...rs: ReturnType<typeof req>[]): PaState => appendRequests(PA_EMPTY, rs, '2008-05-19');

  it('runs a call to completion', () => {
    const s = build(req(base, '16', ['A02-Z05']));
    const id = s.requests[0]!.id;
    expect(simulate(s, base + 1).get(id)!.status).toBe('ON AIR');
    expect(simulate(s, base + s.requests[0]!.durationMs + 1).get(id)!.status).toBe('COMPLETE');
  });

  it('queues an equal priority call on the same channel and starts it after', () => {
    const s = build(req(base, '16', ['A02-Z05']), req(base + 100, '12', ['A02-MP1']));
    const [a, b] = s.requests;
    const o = simulate(s, base + a!.durationMs + 10);
    expect(o.get(a!.id)!.status).toBe('COMPLETE');
    expect(o.get(b!.id)!.status).toBe('ON AIR');
    expect(o.get(b!.id)!.start).toBe(base + a!.durationMs);
  });

  it('a higher priority call pre-empts and the pre-empted call is not resumed', () => {
    const s = build(req(base, '16', ['A02-Z05']), req(base + 100, '01', ['A02-ALL']));
    const [a, b] = s.requests;
    const o = simulate(s, base + 200);
    expect(o.get(a!.id)).toMatchObject({ status: 'PRE-EMPTED', end: base + 100, preemptedBy: b!.id });
    expect(o.get(b!.id)!.status).toBe('ON AIR');
  });

  it('calls on separate channels run together; queued routine calls lapse', () => {
    const s = build(req(base, '01', ['A02-ALL']), req(base + 10, '16', ['A02-Z03']), req(base + 20, '16', ['A03-RD']));
    const [, b, c] = s.requests;
    const o = simulate(s, base + 30);
    expect(o.get(c!.id)!.status).toBe('ON AIR');
    expect(o.get(b!.id)!.status).toBe('QUEUED');
    const later = simulate({ ...s, requests: s.requests.slice(0, 2) }, base + 10 + 2000 * 1000, 30);
    expect(later.get(b!.id)!.status).toBe('LAPSED');
  });

  it('cancel ends an airing call and frees the channel', () => {
    let s = build(req(base, '16', ['A02-Z05']), req(base + 10, '12', ['A02-Z05']));
    const [a, b] = s.requests;
    s = { ...s, cancels: [{ id: a!.id, at: base + 50, by: 'deputy' }] };
    const o = simulate(s, base + 60);
    expect(o.get(a!.id)!.status).toBe('CANCELLED');
    expect(o.get(b!.id)).toMatchObject({ status: 'ON AIR', start: base + 50 });
  });
});

describe('automatic broadcasts', () => {
  const now = 5_000_000;
  const drill: DrillState = {
    id: 'SD-08-0519-01',
    orderedAt: now - 60_000,
    by: 'deputy',
    phase: 'stand-down',
    sites: {
      'ALPHA-01': { ordered: now - 60_000, acknowledged: now - 50_000, sealed: now - 40_000, status: 'sealed' },
      'GAMMA-08': { ordered: now - 55_000, acknowledged: null, sealed: null, status: 'pending' },
      'DELTA-01': { ordered: now - 55_000, acknowledged: null, sealed: null, status: 'pending' },
    },
    endedAt: now - 1000,
  };
  it('derives order, sealed and stand-down calls once each', () => {
    const add = autoBroadcasts(drill, null, now);
    expect(add.map((r) => `${r.msg}:${r.zones.join(',')}`)).toEqual(['31:A01-ALL', '31:G08-ALL', '32:A01-ALL', '33:NET-ALL']);
    const s1 = appendRequests(PA_EMPTY, add, '2008-05-19');
    const s2 = appendRequests(s1, autoBroadcasts(drill, null, now), '2008-05-19');
    expect(s2).toBe(s1);
  });
  it('isolation initiation and automatic clear', () => {
    const iso: IsolationState = { level: 1, initiations: [{ at: '2008-05-19T01:00:00.000Z', by: 'analyst', ref: 'NI-08-001' }], active: true, clearsAt: now - 10 };
    const t = Date.UTC(2026, 10, 19, 2, 0, 0);
    const add = autoBroadcasts(null, { ...iso, clearsAt: t - 10 }, t);
    expect(add.map((r) => r.msg)).toEqual(['35', '36']);
    expect(add[0]!.at).toBe(Date.UTC(2026, 10, 19, 1, 0, 0));
  });
  it('maps an in-world time to the last wall-clock occurrence', () => {
    const t = Date.UTC(2026, 10, 19, 0, 30);
    expect(wallFromInWorld('2008-05-19T01:00:00Z', t)).toBe(Date.UTC(2026, 10, 18, 1, 0));
  });
  it('dedupes autoKeys written by two tabs', () => {
    const r = autoBroadcasts(drill, null, now)[0]!;
    expect(dedupe([{ ...r, id: 'A' }, { ...r, id: 'B' }]).length).toBe(1);
  });
});

describe('log visibility', () => {
  it('tier 4 sees its own site and network calls only, shown as its own site', () => {
    const t = acct('lifesupport');
    const rows = historyRows().filter((r) => rowVisible(r, t));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.zones.some((z) => z.startsWith('G08-')))).toBe(true);
    expect(zonesShown(['NET-ALL'], t)).toEqual(['G08-ALL']);
  });
  it('history carries the withheld message with its duration', () => {
    const w = historyRows().filter((r) => r.msg === pa.withheld.no);
    expect(w.length).toBeGreaterThan(0);
    expect(w.every((r) => r.durationMs > 0)).toBe(true);
    expect(msg(pa.withheld.no).text).toBeNull();
  });
});
