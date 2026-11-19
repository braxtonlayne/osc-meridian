import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSharedStore } from './shared';
import type { SharedStoreHandle } from './shared';
import { arrivalDetail, createTraces, processArrivals, traceId } from './traces';
import type { AccountDef, AccountId, Trace } from './contracts';

const def = (id: AccountId, roleTitle: string, pn: string, tier: 2 | 3 | 4): AccountDef => ({
  id,
  operatorId: `OPR-${id}`,
  passphrase: 'x',
  pn,
  displayName: id.toUpperCase(),
  roleTitle,
  tier,
  site: 'ALPHA-02',
  divisionId: 'CS',
  compartments: [],
  probationStart: null,
  email: `${id}@x.mer`,
  supervisorPn: null,
  approves: [],
  auditReader: false,
  desktop: [],
});
const DEFS: Record<AccountId, AccountDef> = {
  analyst: def('analyst', 'Records Analyst, ALPHA-03', 'P-3-06-1147', 3),
  deputy: def('deputy', 'Deputy Commander, ALPHA-02', 'P-2-02-0412', 2),
  lifesupport: def('lifesupport', 'Life-support Technician', 'P-4-09-2231', 4),
  auditor: def('auditor', 'Auditor, Office of Internal Assurance', 'P-3-01-0777', 3),
};

let open: SharedStoreHandle[] = [];
let me: AccountId = 'analyst';
function api() {
  const s = createSharedStore({ channelName: 'traces-test', eventTarget: null });
  open.push(s);
  return createTraces(s, () => me, () => '2008-05-19T14:30:00.000Z');
}

beforeEach(() => {
  localStorage.clear();
  me = 'analyst';
});
afterEach(() => {
  for (const s of open) s.close();
  open = [];
});

describe('traces', () => {
  it('posts with id, time and sender filled in, append-only', () => {
    const t = api();
    const a = t.post({ to: 'deputy', kind: 'form.routed', subject: 'F-126-08-0031', data: { form: 'OSC-F-126' } });
    const b = t.post({ to: 'all', kind: 'notice', subject: 'isolation', data: { text: 'x' } });
    expect(a).toMatchObject({ id: 'TR-0001', from: 'analyst', at: '2008-05-19T14:30:00.000Z' });
    expect(b.id).toBe('TR-0002');
    expect(t.all.value.map((x) => x.id)).toEqual(['TR-0001', 'TR-0002']);
    expect(traceId(7)).toBe('TR-0007');
  });

  it('mine is addressed to this account or all; markSeen records the reader', () => {
    const t = api();
    t.post({ to: 'deputy', kind: 'form.routed', subject: 'R1' });
    t.post({ to: 'auditor', kind: 'finding', subject: 'R2' });
    t.post({ to: 'all', kind: 'notice', subject: 'R3' });
    me = 'deputy';
    const d = api();
    expect(d.mine.value.map((x) => x.subject)).toEqual(['R1', 'R3']);
    d.markSeen('TR-0001');
    expect(d.all.value[0]!.seenBy).toEqual(['deputy']);
    d.markSeen('TR-0001');
    expect(d.all.value[0]!.seenBy).toEqual(['deputy']);
  });

  it('arrival: logs a trace audit line once, delivers mail.deliver once', () => {
    const t = api();
    t.post({ to: 'deputy', kind: 'mail.deliver', subject: 'F-126 approval request', msgId: 'msg-08-05001' });
    t.post({ to: 'deputy', kind: 'form.routed', subject: 'F-126-08-0031' });
    t.post({ to: 'analyst', kind: 'notice', subject: 'not for deputy' });
    me = 'deputy';
    const d = api();
    const log = vi.fn();
    const deliver = vi.fn();
    const arrived = new Set<string>();
    const ctx = {
      me: 'deputy' as AccountId,
      arrived,
      accountById: (id: AccountId) => DEFS[id],
      opShort: (x: AccountDef) => `${x.tier}-${x.pn.slice(-4)}`,
      log,
      deliver,
      markSeen: (id: string) => d.markSeen(id),
      silent: true,
    };
    const fresh = processArrivals(d.mine.value, ctx);
    expect(fresh.map((x) => x.id)).toEqual(['TR-0001', 'TR-0002']);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith('msg-08-05001', { silent: true });
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0]![0]).toBe('trace');
    expect(log.mock.calls[0]![1]).toBe('TR-0001');
    expect(log.mock.calls[0]![2]).toMatch(/^Routed item TR-0001 received from operator 3-1147 \(Records Analyst, ALPHA-03\)\./);
    expect(d.all.value[0]!.seenBy).toEqual(['deputy']);
    // form.routed stays unseen for the consuming app
    expect(d.all.value[1]!.seenBy).toBeUndefined();
    // Second pass: nothing new.
    expect(processArrivals(d.mine.value, ctx)).toEqual([]);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it('a trace this account posted to all is not news to it', () => {
    const t = api();
    t.post({ to: 'all', kind: 'notice', subject: 'mine' });
    const log = vi.fn();
    const fresh = processArrivals(t.mine.value, {
      me: 'analyst',
      arrived: new Set(),
      accountById: (id) => DEFS[id],
      opShort: () => '',
      log,
      deliver: vi.fn(),
      markSeen: vi.fn(),
      silent: false,
    });
    expect(fresh).toEqual([]);
    expect(log).not.toHaveBeenCalled();
  });

  it('phrases arrivals like the security office', () => {
    const tr: Trace = { id: 'TR-0007', at: '', from: 'deputy', to: 'analyst', kind: 'form.decided', subject: 'F-126-08-0031', data: { receipt: 'F-126-08-0031', decision: 'approved', note: '' } };
    expect(arrivalDetail(tr, DEFS.deputy, '2-0412')).toBe(
      'Routed item TR-0007 received from operator 2-0412 (Deputy Commander, ALPHA-02). Decision on F-126-08-0031 returned to this operator.',
    );
  });
});
