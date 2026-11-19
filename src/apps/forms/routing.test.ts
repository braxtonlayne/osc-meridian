import { describe, expect, it } from 'vitest';
import type { AccountDef, Trace } from '@core/contracts';
import { actionQueue, approversFor, decidedTrace, decisionLine, decisionOnReceipt, grantFor, routedEntries, routedFields, routedTrace, serialOffset, unflatten } from './routing';

const acct = (id: AccountDef['id'], approves: string[] = []): AccountDef => ({
  id,
  operatorId: `OPR-${id}`,
  passphrase: '',
  pn: `P-${id}`,
  displayName: id.toUpperCase(),
  roleTitle: `Role ${id}`,
  tier: 3,
  site: 'ALPHA-03',
  divisionId: 'RD',
  compartments: [],
  probationStart: null,
  email: `${id}@x.mer`,
  supervisorPn: null,
  approves,
  auditReader: false,
  desktop: [],
});
const ACCTS = [acct('analyst'), acct('lifesupport'), acct('deputy', ['OSC-F-126', 'OSC-F-122']), acct('auditor')];

const stored = (t: Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'>, id: string, from: AccountDef['id']): Trace => ({ ...t, id, at: '2008-05-19T14:00:00Z', from });

const filed = (compartment: string) =>
  routedTrace(
    {
      formNo: 'OSC-F-126',
      title: 'Compartment Access Request',
      route: '/forms/f-126',
      receiptNo: 'OSC-F-126/08-00321',
      enteredAt: '19 MAY 2008 1400Z (1000 EDT)',
      fields: { compartment, sponsorPn: 'P-2-02-0091', interests: 'A; B' },
      entries: [['2a', 'Compartment', compartment]],
      filer: { operatorId: 'OPR-A03-1147', roleTitle: 'Analyst', pn: 'P-3-06-1147' },
    },
    'deputy',
  );

describe('forms routing', () => {
  it('routes only to other accounts holding approval authority', () => {
    expect(approversFor('osc-f-126', 'analyst', ACCTS).map((a) => a.id)).toEqual(['deputy']);
    expect(approversFor('OSC-F-126', 'deputy', ACCTS)).toEqual([]);
    expect(approversFor('OSC-F-160', 'analyst', ACCTS)).toEqual([]);
  });

  it('carries the filed values and meta separately', () => {
    const t = stored(filed('KESTREL'), 'TR-0001', 'analyst');
    expect(t.subject).toBe('OSC-F-126/08-00321');
    expect(routedFields(t)).toEqual({ compartment: 'KESTREL', sponsorPn: 'P-2-02-0091', interests: 'A; B' });
    expect(routedEntries(t)).toEqual([['2a', 'Compartment', 'KESTREL']]);
    expect(unflatten(routedFields(t), new Set(['interests'])).interests).toEqual(['A', 'B']);
  });

  it('grants only compartments approvable on request, and only on approval', () => {
    expect(grantFor(stored(filed('KESTREL'), 'TR-1', 'analyst'), 'approved')).toBe('KESTREL');
    expect(grantFor(stored(filed('sextant'), 'TR-1', 'analyst'), 'approved')).toBe('SEXTANT');
    expect(grantFor(stored(filed('KESTREL'), 'TR-1', 'analyst'), 'denied')).toBeNull();
    for (const c of ['HOLLOW', 'TALLOW', 'BRIAR', 'QUARRY', 'LANTERN', 'ACTING-T2', 'T1']) expect(grantFor(stored(filed(c), 'TR-1', 'analyst'), 'approved')).toBeNull();
  });

  it('returns the decision to the filer and tracks queue state', () => {
    const routed = stored(filed('KESTREL'), 'TR-0001', 'analyst');
    const other = stored(filed('SEXTANT'), 'TR-0002', 'analyst');
    expect(actionQueue('deputy', [routed, other]).map((q) => q.state)).toEqual(['pending', 'pending']);
    const d = decidedTrace({ routed, decision: 'approved', note: ' Sponsor confirmed. ', approver: { operatorId: 'OPR-A02-0139', roleTitle: 'Deputy Commander, ALPHA-02' } });
    expect(d.to).toBe('analyst');
    expect(d.data).toMatchObject({ receipt: 'OSC-F-126/08-00321', decision: 'approved', note: 'Sponsor confirmed.', routed: 'TR-0001', grant: 'KESTREL' });
    const back = stored(d, 'TR-0003', 'deputy');
    const q = actionQueue('deputy', [routed, other, back]);
    expect(q.map((x) => [x.routed.id, x.state])).toEqual([
      ['TR-0002', 'pending'],
      ['TR-0001', 'approved'],
    ]);
    expect(decisionOnReceipt('OSC-F-126/08-00321', 'analyst', [routed, back])?.id).toBe('TR-0003');
    expect(decisionOnReceipt('OSC-F-126/08-00321', 'auditor', [routed, back])).toBeUndefined();
    expect(decisionLine(back)).toMatch(/^Approved by Deputy Commander, ALPHA-02\. Remarks: Sponsor confirmed\. Read-in to KESTREL/);
  });

  it('keeps receipt serials apart per account, analyst unchanged', () => {
    expect(serialOffset('analyst')).toBe(0);
    expect(new Set(['analyst', 'lifesupport', 'deputy', 'auditor'].map((a) => serialOffset(a as AccountDef['id']))).size).toBe(4);
  });
});
