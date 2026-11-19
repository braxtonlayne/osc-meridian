import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { AccountDef, AuditEntry, RouteEntry } from '@core/contracts';
import { complete, divisionLabel, formatAuditOther, heldRoutes, resolveAccount, run, takeOperatorOpt } from './host';
import type { HostContext } from './host';

const canon = canonJson as unknown as Canon;
const ACCTS = (canon as unknown as { accounts: AccountDef[] }).accounts;
const acct = (id: string) => ACCTS.find((a) => a.id === id)!;
const text = (lines: string[]) => lines.join('\n');

const base = { family: 'directives', template: 'directive', marking: 'UMBRA-U', originator: 'RD/ALPHA-03', revision: 1, date: '2008-04-22', summary: '' } as const;
const routes: RouteEntry[] = [
  { ...base, id: 'dir-0301', route: '/directives/dir-0301', app: 'directives', docNo: 'OSC-DIR-0301', title: 'Workstation use', t4: true },
  { ...base, id: 'dir-0412', route: '/directives/dir-0412', app: 'directives', docNo: 'OSC-DIR-0412', title: 'Compartmented records' },
  { ...base, id: 'env-sop', route: '/directives/env-sop', app: 'directives', docNo: 'OSC-DIR-0999', title: 'Variant only', variants: ['lifesupport'] },
  { ...base, id: 'msg-1', route: '/mail/msg-1', app: 'mail', family: 'mail', template: 'message', docNo: 'MSG-08-00001', title: 'Delivered' },
  { ...base, id: 'msg-2', route: '/mail/msg-2', app: 'mail', family: 'mail', template: 'message', docNo: 'MSG-08-00002', title: 'Other' },
];

function ctx(id: string, over: Partial<HostContext> = {}): HostContext {
  const a = acct(id);
  return {
    canon,
    now: new Date(Date.UTC(2026, 10, 19, 14, 32)),
    cols: 100,
    operatorId: a.operatorId,
    tier: a.tier,
    acting: false,
    compartments: a.compartments,
    flags: {},
    probationDay: a.probationStart ? 36 : 0,
    probationLength: 90,
    history: [],
    audit: [],
    unread: 0,
    routes,
    satisfies: () => false,
    appTitle: (x) => x,
    account: a,
    accounts: ACCTS,
    delivered: ['msg-1'],
    ...over,
  };
}

describe('accounts in the terminal', () => {
  it('whoami answers for the signed-in account', () => {
    const d = text(run('whoami', ctx('deputy')).lines);
    expect(d).toContain('OPR-A02-0139');
    expect(d).toContain('Deputy Commander, ALPHA-02');
    expect(d).toContain('Facility Command');
    expect(d).toContain('OSC-F-126');
    expect(d).not.toContain('PROBATION');
    const a = text(run('whoami', ctx('analyst')).lines);
    expect(a).toContain('PROBATION');
    expect(text(run('whoami', ctx('auditor')).lines)).toContain('AUDIT REVIEW');
  });

  it('divisionLabel maps CMD', () => {
    expect(divisionLabel(canon, 'CMD')).toBe('Facility Command');
    expect(divisionLabel(canon, 'OIA')).not.toBe('OIA');
  });

  it('accounts lists every credential and marks the active one, no Tier 2 name', () => {
    const t = run('accounts', ctx('auditor')).lines;
    expect(t.filter((l) => l.startsWith('* '))).toHaveLength(1);
    expect(t.find((l) => l.startsWith('* '))).toContain('OPR-A01-0948');
    for (const a of ACCTS) expect(text(t)).toContain(a.operatorId);
    expect(text(t)).not.toMatch(/Ashcombe/i);
  });

  it('su and login refuse and point at the lock screen', () => {
    for (const cmd of ['su deputy', 'login OPR-A02-0139', 'su']) {
      const t = text(run(cmd, ctx('analyst')).lines);
      expect(t).toMatch(/lock screen/);
      expect(run(cmd, ctx('analyst')).effects).toEqual([]);
    }
    expect(text(run('su deputy', ctx('analyst')).lines)).toContain('OPR-A02-0139');
  });

  it('resolves operator ids and account ids', () => {
    expect(resolveAccount('opr-a03-1147', ACCTS)?.id).toBe('analyst');
    expect(resolveAccount('A03-1147', ACCTS)?.id).toBe('analyst');
    expect(resolveAccount('deputy', ACCTS)?.id).toBe('deputy');
    expect(resolveAccount('OPR-X', ACCTS)).toBeUndefined();
    expect(takeOperatorOpt(['5', '--operator', 'deputy'])).toEqual({ rest: ['5'], operator: 'deputy', bad: false });
    expect(takeOperatorOpt(['--operator=analyst'])).toEqual({ rest: [], operator: 'analyst', bad: false });
    expect(takeOperatorOpt(['--operator']).bad).toBe(true);
  });

  it('audit tail --operator is for auditors only and asks the app to read the trail', () => {
    const refused = run('audit tail --operator analyst', ctx('deputy'));
    expect(refused.lines.join(" ")).toMatch(/Office of Internal Assurance/);
    expect(refused.effects).toEqual([]);
    const ok = run('audit tail 5 --operator OPR-A03-1147', ctx('auditor'));
    expect(ok.effects).toEqual([{ kind: 'auditOther', account: 'analyst', operatorId: 'OPR-A03-1147', n: 5 }]);
    expect(text(run('audit tail --operator nobody', ctx('auditor')).lines)).toMatch(/not a credential/);
    const e: AuditEntry = { seq: 7, at: '2008-05-19T14:30:00.000Z', kind: 'doc.read', subject: 'OSC-DIR-0412', detail: 'Read.' };
    const lines = formatAuditOther([e], 'OPR-A03-1147', 10, 100, new Date());
    expect(text(lines)).toContain('READ-ONLY COPY');
    expect(text(lines)).toContain('DOC.READ OPR-A03-1147');
    expect(text(formatAuditOther(null, 'OPR-A03-1147', 10, 100, new Date()))).toMatch(/could not be read/);
  });

  it('Tier 4 sees only its own small world', () => {
    const c = ctx('lifesupport');
    expect(heldRoutes(c).map((r) => r.id)).toEqual(['dir-0301', 'env-sop', 'msg-1']);
    expect(heldRoutes(ctx('analyst')).length).toBe(routes.length);
    expect(text(run('open OSC-DIR-0412', c).lines)).toMatch(/Requires Tier 3 access determination\. Reference DIR-0301/);
    expect(run('open OSC-DIR-0412', c).effects).toEqual([]);
    expect(run('open OSC-DIR-0301', c).effects).toEqual([{ kind: 'open', route: '/directives/dir-0301' }]);
    expect(text(run('lookup OSC-DIR-0412', c).lines)).toMatch(/not on the register/);
    expect(complete('open OSC-DIR-04', c).options).toEqual([]);
    expect(complete('site ', c).line).toBe('site GAMMA-08 ');
    const sites = text(run('sites', c).lines);
    expect(sites).toContain('GAMMA-08');
    expect(sites).not.toContain('ALPHA-');
    expect(text(run('site ALPHA-03', c).lines)).toMatch(/DIR-0301/);
    expect(text(run('site GAMMA-08', c).lines)).toContain('FACILITY STATUS  GAMMA-08');
    expect(text(run('rail status', c).lines)).toMatch(/DIR-0301/);
    expect(text(run('wo FE-07-0233', c).lines)).toMatch(/DIR-0301/);
  });
});
