import { describe, expect, it } from 'vitest';
import type { AccountDef, AccountId, Trace } from '@core/contracts';
import { inboundMailTraces, outgoingTraces, traceMessage, traceMsgNo } from './traces';
import { accountEntries, buildDirectory, releaseRoster, ROSTER_DIR } from './directory';
import type { Outgoing } from './model';
import canon from '@canon';

const ACCTS = (canon as unknown as { accounts: AccountDef[] }).accounts;
const acct = (id: AccountId) => ACCTS.find((a) => a.id === id)!;
const byEmail = (e: string) => ACCTS.find((a) => a.email.toLowerCase() === e.trim().toLowerCase());
const ctx = (me: AccountId) => ({ me: acct(me), accountById: (id: AccountId) => acct(id), isMarking: (m: string) => m === 'TSSCI-OSC', lowest: 'TSSCI-OSC' as const });

const tr = (p: Partial<Trace>): Trace => ({ id: 'TR-0007', at: '2008-05-19T14:32:00.000Z', from: 'auditor', to: 'analyst', kind: 'mail', subject: 's', ...p });

const out = (to: string[], cc: string[] = []): Outgoing => ({
  to,
  cc,
  subject: '  Query on  receipt ',
  precedence: 'ROUTINE',
  marking: 'TSSCI-OSC',
  receiptRequested: false,
  attachments: [],
  inReplyTo: null,
  text: 'Line one\r\nLine two',
});

describe('trace messages', () => {
  it('numbers a trace in the 8xxxx series of its year', () => {
    expect(traceMsgNo({ id: 'TR-0007', at: '2008-05-19T10:00:00Z' })).toBe('MSG-08-80007');
  });

  it('keeps only message kinds addressed here and not posted by this account', () => {
    const list = [
      tr({ id: 'TR-0001' }),
      tr({ id: 'TR-0002', kind: 'form.routed' }),
      tr({ id: 'TR-0003', to: 'all', kind: 'notice', from: 'analyst' }),
      tr({ id: 'TR-0004', to: 'all', kind: 'notice', from: 'deputy' }),
      tr({ id: 'TR-0005', to: 'deputy' }),
    ];
    expect(inboundMailTraces(list, 'analyst').map((t) => t.id)).toEqual(['TR-0001', 'TR-0004']);
  });

  it('renders mail with the sender mailbox and the body', () => {
    const m = traceMessage(tr({ data: { subject: 'Hello', body: 'Text', to: acct('analyst').email, fromAddress: acct('auditor').email, precedence: 'PRIORITY' } }), ctx('analyst'));
    expect(m.from).toBe(acct('auditor').email);
    expect(m.to).toEqual([acct('analyst').email]);
    expect(m.subject).toBe('Hello');
    expect(m.precedence).toBe('PRIORITY');
    expect(m.sent).toBe('191432Z MAY 08');
    expect(m.text).toBe('Text');
  });

  it('renders a finding as an Internal Assurance notice against this operator', () => {
    const m = traceMessage(tr({ kind: 'finding', subject: 'Repeated refusals', data: { ref: 'OIA-F-08-0012', text: 'Five refused requests.' } }), ctx('analyst'));
    expect(m.subject).toBe('Internal Assurance finding OIA-F-08-0012: Repeated refusals');
    expect(m.text).toContain(acct('analyst').operatorId);
    expect(m.text).toContain('Five refused requests.');
  });

  it('renders a decision with the decision line', () => {
    const m = traceMessage(
      tr({ kind: 'form.decided', from: 'deputy', subject: 'OSC-F-126/08-00321', data: { receipt: 'OSC-F-126/08-00321', decision: 'approved', note: 'Agreed.', form: 'OSC-F-126', _title: 'Compartment Access Request', grant: 'KESTREL', _decidedRole: 'Deputy Commander, ALPHA-02' } }),
      ctx('analyst'),
    );
    expect(m.subject).toBe('Decision on OSC-F-126/08-00321');
    expect(m.from).toBe(acct('deputy').email);
    expect(m.text).toMatch(/Approved by Deputy Commander, ALPHA-02/);
    expect(m.text).toMatch(/KESTREL/);
  });
});

describe('outgoing traffic to issued accounts', () => {
  it('posts one trace per other account, deduped, never to itself', () => {
    const me = acct('analyst');
    const t = outgoingTraces(out([acct('deputy').email, 'someone@a01.oia.mer', me.email], [acct('deputy').email.toUpperCase(), acct('auditor').email]), me, byEmail);
    expect(t.map((x) => x.to)).toEqual(['deputy', 'auditor']);
    expect(t[0]!.kind).toBe('mail');
    expect(t[0]!.subject).toBe('Query on receipt');
    expect(t[0]!.data!.body).toBe('Line one\nLine two');
    expect(t[0]!.data!.fromAddress).toBe(me.email);
  });
  it('posts nothing for ordinary addresses', () => {
    expect(outgoingTraces(out(['records.registry@a03.rd.mer']), acct('analyst'), byEmail)).toEqual([]);
  });
});

describe('directory', () => {
  it('lists the four account mailboxes; the deputy by role until Tier 2 is released', () => {
    const d = buildDirectory([], { accounts: ACCTS });
    for (const a of ACCTS) expect(d.some((e) => e.address === a.email)).toBe(true);
    const dep = d.find((e) => e.address === acct('deputy').email)!;
    expect(dep.name).toBe(acct('deputy').displayName);
    expect(dep.role).toBe(acct('deputy').roleTitle);
  });
  it('uses the released name when a T2 release is supplied', () => {
    const e = accountEntries(ACCTS, ROSTER_DIR, { 'accounts.deputy.name': 'RELEASED NAME' });
    expect(e.find((x) => x.account === 'deputy')!.name).toBe('RELEASED NAME');
  });
  it('replaces Tier 2 roster sentinels from the release by pn', () => {
    const rx = ROSTER_DIR.find((d) => d.pn && /^\[\[RX:T2:/.test(d.name))!;
    const r = releaseRoster(ROSTER_DIR, { [`roster.${rx.pn}.name`]: 'N. NAME', [`roster.${rx.pn}.email`]: 'n.name@a02.cmd.mer' });
    const hit = r.find((d) => d.pn === rx.pn)!;
    expect(hit.name).toBe('N. NAME');
    expect(hit.address).toBe('n.name@a02.cmd.mer');
  });
  it('restricts a Tier 4 directory to its own site and mailboxes met in its traffic', () => {
    const me = acct('lifesupport');
    const d = buildDirectory([acct('auditor').email], { accounts: ACCTS, restrictToSite: me.site, self: me.email });
    expect(d.every((e) => e.site === me.site || e.address === acct('auditor').email)).toBe(true);
    expect(d.some((e) => e.address === acct('deputy').email)).toBe(false);
    expect(d.some((e) => e.address === me.email)).toBe(true);
  });
});
