import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import type { AuditEntry, RouteEntry } from '@core/contracts';
import { COMPARTMENT_MARKING, auditLine, complete, findDoc, formatConsist, formatFind, normalizeFacility, parse, run, tokenize, wrap } from './host';
import type { HostContext } from './host';

const canon = canonJson as unknown as Canon;

const routes: RouteEntry[] = [
  { id: 'dir-0412', route: '/directives/dir-0412', app: 'directives', family: 'directives', template: 'directive', docNo: 'OSC-DIR-0412', title: 'Handling of Compartmented Records in Shared Workspaces', marking: 'UMBRA-C', originator: 'RD/ALPHA-03', revision: 3, date: '2008-04-22', summary: '' },
  { id: 'dir-0413', route: '/directives/dir-0413', app: 'directives', family: 'directives', template: 'directive', docNo: 'OSC-DIR-0413', title: 'Other', marking: 'UMBRA-U', originator: 'RD/ALPHA-03', revision: 1, date: '2008-04-22', summary: '' },
  { id: 'transit-rolling-stock', route: '/transit/rolling-stock', app: 'transit', family: 'transit', template: 'record', docNo: 'OSC-TRN-RS', title: 'Rolling Stock Register', marking: 'UMBRA-C', originator: 'TO/ALPHA-01', revision: 2, date: '2008-05-01', access: { tier: 3, compartment: 'KESTREL' }, summary: '' },
];

function satisfiesFor(tier: number, comps: readonly string[]) {
  return (key: string) =>
    key.split('+').every((part) => {
      const m = /^T([1-4])$/.exec(part);
      if (m) return Number(m[1]) !== 1 && tier <= Number(m[1]);
      return comps.includes(part);
    });
}

function ctx(over: Partial<HostContext> = {}): HostContext {
  const compartments = over.compartments ?? ['LANTERN'];
  const tier = over.tier ?? 3;
  return {
    canon,
    now: new Date(Date.UTC(2026, 10, 19, 14, 32)),
    cols: 100,
    operatorId: canon.operator.operatorId,
    tier,
    acting: false,
    compartments,
    flags: {},
    probationDay: 36,
    probationLength: 90,
    history: [],
    audit: [],
    unread: 2,
    routes,
    satisfies: satisfiesFor(tier, compartments),
    appTitle: (id) => ({ directives: 'Directives', transit: 'Transit Control', mail: 'Message Traffic' })[id as string] ?? id,
    ...over,
  };
}

const text = (lines: string[]) => lines.join('\n');

describe('parsing', () => {
  it('tokenizes with quotes', () => {
    expect(tokenize('find "segment 04" now')).toEqual(['find', 'segment 04', 'now']);
    expect(parse('  WO  FE-08-0417 ')).toMatchObject({ cmd: 'wo', args: ['FE-08-0417'], raw: 'WO  FE-08-0417' });
    expect(parse('find "copy 07"').rest).toBe('copy 07');
  });
  it('normalizes facility ids', () => {
    expect(normalizeFacility('alpha-03', canon)).toBe('ALPHA-03');
    expect(normalizeFacility('A3', canon)).toBe('ALPHA-03');
    expect(normalizeFacility('gamma 18', canon)).toBe('GAMMA-18');
    expect(normalizeFacility('ALPHA-09', canon)).toBeNull();
  });
  it('finds documents with or without the OSC- prefix', () => {
    expect(findDoc(routes, 'dir-0412')?.id).toBe('dir-0412');
    expect(findDoc(routes, 'OSC-DIR-0412')?.id).toBe('dir-0412');
    expect(findDoc(routes, '/directives/dir-0412')?.id).toBe('dir-0412');
  });
  it('wraps long text', () => {
    for (const l of wrap('word '.repeat(40), 20)) expect(l.length).toBeLessThanOrEqual(20);
  });
});

describe('documented commands', () => {
  it('help lists the documented commands but not the division utilities', () => {
    const t = text(run('help', ctx()).lines);
    for (const c of ['whoami', 'sites', 'rail status', 'find', 'open', 'audit tail', 'clearance', 'man', 'logout', 'history', 'clear', 'lookup']) expect(t).toContain(c);
    for (const c of ['wo ', 'trace', 'strength', 'consist', 'copies']) expect(t).not.toContain(c);
  });
  it('whoami prints operator, workstation and probation', () => {
    const t = text(run('whoami', ctx()).lines);
    expect(t).toContain(canon.operator.operatorId);
    expect(t).toContain('A03-5-114');
    expect(t).toContain('Day 36 of 90');
  });
  it('sites lists every facility from canon', () => {
    const r = run('sites', ctx());
    expect(r.lines.length).toBe(canon.facilities.length + 2);
    expect(text(r.lines)).toContain(canon.headline.staffPosted.toLocaleString('en-US'));
  });
  it('site shows the home site and withholds non-adjacent geography without SEXTANT', () => {
    expect(text(run('site alpha-03', ctx()).lines)).toContain('Lexington');
    const far = text(run('site ALPHA-04', ctx()).lines);
    expect(far).toContain('(SEXTANT)');
    expect(far).not.toContain(canon.facilities.find((f) => f.id === 'ALPHA-04')!.anchor.city);
    const sx = text(run('site ALPHA-04', ctx({ compartments: ['LANTERN', 'SEXTANT'] })).lines);
    expect(sx).toContain(canon.facilities.find((f) => f.id === 'ALPHA-04')!.anchor.city);
  });
  it('rail status reports segment 04 not in revenue service', () => {
    const t = text(run('rail status', ctx()).lines);
    expect(t).toMatch(/04\s+ALPHA-02\s+ALPHA-05.*NOT IN REVENUE SERVICE/);
    expect(run('rail', ctx()).lines[0]).toContain('usage');
  });
  it('find hands the query to the shell search', () => {
    expect(run('find "segment 04"', ctx()).effects).toEqual([{ kind: 'search', q: 'segment 04' }]);
    expect(text(formatFind('x', [{ route: routes[0]! }], 100))).toContain('OSC-DIR-0412');
    expect(formatFind('x', [], 100)[0]).toContain('no entries');
  });
  it('open resolves docNos and reports refusals', () => {
    expect(run('open dir-0412', ctx()).effects).toEqual([{ kind: 'open', route: '/directives/dir-0412' }]);
    const r = run('open OSC-TRN-RS', ctx());
    expect(r.lines[0]).toContain('display refused');
    expect(r.lines[0]).toContain('KESTREL');
    expect(run('open OSC-NOPE-1', ctx()).effects).toEqual([]);
  });
  it('lookup prints the register entry and access state', () => {
    const t = text(run('lookup osc-trn-rs', ctx()).lines);
    expect(t).toContain('UMBRA//OSC COMPARTMENTED');
    expect(t).toContain('not satisfied');
  });
  it('mail reports unread count and opens the client', () => {
    expect(run('mail', ctx()).lines[0]).toContain('2 unread messages');
    expect(run('mail open', ctx()).effects).toEqual([{ kind: 'openApp', app: 'mail' }]);
  });
  it('audit tail formats entries in the security office line format', () => {
    const e: AuditEntry = { seq: 4417, at: '2008-05-20T14:32:00.000Z', kind: 'doc.read', subject: 'OSC-2008-Q2', detail: 'Opened OSC-2008-Q2.' };
    expect(auditLine(e, 'OPR-A03-1147')).toBe('AUD-080520-004417 1432Z (1032 EDT) DOC.READ OPR-A03-1147 WS A03-5-114 Opened OSC-2008-Q2.');
    const many = Array.from({ length: 30 }, (_, i) => ({ ...e, seq: i + 1 }));
    expect(run('audit tail', ctx({ audit: many })).lines.length).toBe(10);
    expect(run('audit tail 3', ctx({ audit: many })).lines.length).toBe(3);
  });
  it('history, clear, man, logout, unknown', () => {
    expect(run('history', ctx({ history: ['help', 'whoami'] })).lines).toEqual(['   1  help', '   2  whoami']);
    expect(run('clear', ctx()).effects).toEqual([{ kind: 'clear' }]);
    expect(run('man site', ctx()).lines[0]).toBe('SITE <id>');
    expect(run('man wo', ctx()).lines[0]).toContain('documented by the owning division');
    expect(run('logout', ctx()).effects).toEqual([{ kind: 'logout' }]);
    expect(run('ls -la', ctx()).lines[0]).toContain('not recognised');
    expect(run('   ', ctx()).lines).toEqual([]);
  });
});

describe('division utilities (docs/NARRATIVE.md §5)', () => {
  it('wo FE-08-0417 reads the workstation into TALLOW once oriented', () => {
    const before = run('wo FE-08-0417', ctx());
    expect(text(before.lines)).toContain('no orientation record');
    expect(text(before.lines)).not.toContain('(added');
    expect(before.marking).toBeUndefined();
    const r = run('wo fe-08-0417', ctx({ flags: { oriented: true } }));
    expect(r.effects).toEqual([]);
    expect(text(r.lines).replace(/\s+/g, ' ')).toContain('WS A03-5-114 (added 1432Z');
    expect(text(r.lines)).toContain('read into TALLOW');
    expect(r.marking).toBe(COMPARTMENT_MARKING);
    expect(text(r.lines)).toContain('Main feedwater pump B');
    expect(text(r.lines)).toContain(canon.reactors.find((x) => x.id === 'RX-A03')!.status);
    const held = run('wo FE-08-0417', ctx({ flags: { oriented: true }, compartments: ['LANTERN', 'TALLOW'] }));
    expect(text(held.lines)).not.toContain('(added');
    expect(text(held.lines)).toContain('WS A03-5-114');
  });
  it('wo returns dull closed jobs and refusals for unknown numbers', () => {
    expect(text(run('wo FE-07-0233', ctx()).lines)).toContain('CLOSED');
    expect(text(run('wo LR-08-0102', ctx()).lines)).toContain('CLOSED');
    expect(run('wo FE-99-0001', ctx()).lines[0]).toContain('no record');
    expect(run('wo banana', ctx()).lines[0]).toContain('Format');
  });
  it('trace 00412 is held and notifies OIA; neighbours are mundane', () => {
    const r = run('trace RD-ACC-08-00412', ctx());
    expect(text(r.lines)).toContain('24 MAR 2008');
    expect(text(r.lines)).toContain('HELD (OIA-08-031)');
    expect(text(r.lines)).toContain('Withheld (SEXTANT/BRIAR)');
    expect(r.effects).toEqual([]);
    const n = run('trace 00405', ctx());
    expect(text(n.lines)).toContain('Queued for review');
    expect(run('trace 00500', ctx()).lines[0]).toContain('no custody record');
  });
  it('strength unposted prints the category total, with the breakdown only under HOLLOW', () => {
    const total = canon.headline.staffUnposted.toLocaleString('en-US');
    const base = run('strength unposted', ctx());
    expect(text(base.lines)).toContain(total);
    expect(text(base.lines)).toContain('without breakdown');
    expect(text(base.lines)).not.toContain('P-4-07-0219');
    expect(base.marking).toBeUndefined();

    const h = run('strength unposted', ctx({ compartments: ['LANTERN', 'HOLLOW'] }));
    const t = text(h.lines);
    for (const pn of ['P-3-06-0977', 'P-4-07-0219', 'P-3-05-0142']) expect(t).toContain(pn);
    expect(t).toContain('DIMMICK, C. A.');
    expect(t).toContain(`${(canon.headline.staffUnposted - 3).toLocaleString('en-US')} further entries  [NOT RELEASED]`);
    expect(t).toContain('Category change effective 31 MAY 2008: count withheld.');
    expect(h.marking).toBe(COMPARTMENT_MARKING);
  });
  it('strength by site, class and all comes from canon', () => {
    const a03 = canon.facilities.find((f) => f.id === 'ALPHA-03')!;
    expect(text(run('strength alpha-03', ctx()).lines)).toMatch(new RegExp(`Posted\\s+${a03.staff}`));
    expect(text(run('strength all', ctx()).lines)).toContain(canon.headline.staffTotal.toLocaleString('en-US'));
    expect(run('strength beta', ctx()).lines.length).toBe(canon.facilities.filter((f) => f.class === 'BETA').length + 2);
  });
  it('consist R04 suppressed IDs return NO RECORD; others need KESTREL', () => {
    expect(run('consist R04-***', ctx({ compartments: ['KESTREL'] })).lines).toEqual(['CONSIST R04-***: NO RECORD.']);
    expect(run('consist r04-917', ctx()).lines).toEqual(['CONSIST R04-917: NO RECORD.']);
    expect(text(run('consist R01-214', ctx()).lines)).toContain('held under KESTREL');
    expect(run('consist R01-214', ctx({ compartments: ['KESTREL'] })).effects).toEqual([{ kind: 'consist', id: 'R01-214' }]);
    const tables = [[['Consist', 'Built', 'Allocation'], ['R01-214', 'JUN 2004', 'Segment 01']]];
    expect(text(formatConsist('R01-214', tables, 80))).toContain('Segment 01');
    expect(formatConsist('R01-999', tables, 80)).toEqual(['CONSIST R01-999: NO RECORD.']);
    expect(formatConsist('R01-214', null, 80)[0]).toContain('not available');
  });
  it('copies needs QUARRY and shows seat 07 destruction to follow', () => {
    expect(run('copies OSC-2008-Q2', ctx()).lines[0]).toContain('QUARRY');
    const t = run('copies OSC-2008-Q2', ctx({ compartments: ['QUARRY'] })).lines;
    expect(t.find((l) => l.startsWith('07'))).toContain('TO FOLLOW (Secretariat)');
    expect(t.filter((l) => /^\d\d /.test(l)).length).toBe(canon.council.seats.length);
    expect(run('copies OSC-DIR-0412', ctx({ compartments: ['QUARRY'] })).lines[0]).toContain('no Council copy register');
  });
  it('clearance request acting is refused until the interim review, then grants ACTING-T2', () => {
    expect(run('clearance request acting', ctx()).lines[0]).toContain('not eligible: probationary (DIR-0247)');
    const r = run('clearance request acting', ctx({ flags: { interimReview: true } }));
    expect(text(r.lines)).toContain('ACTING TIER 2');
    expect(text(r.lines)).toContain(canon.operator.supervisorPn);
    expect(run('clearance request acting', ctx({ acting: true, tier: 2 })).lines[0]).toContain('already recorded');
    expect(run('clearance request KESTREL', ctx()).lines[0]).toContain('OSC-F-126');
    expect(text(run('clearance', ctx()).lines)).toContain('LANTERN');
  });
});

describe('completion', () => {
  const c = { routes, canon };
  it('completes documented command words only', () => {
    expect(complete('wh', c).line).toBe('whoami ');
    expect(complete('w', c).line).toBe('whoami ');
    expect(complete('cl', c).line).toBe('clear');
    expect(complete('clear', c).options).toEqual(['clear', 'clearance']);
    expect(complete('tr', c).options).toEqual([]);
  });
  it('completes arguments', () => {
    expect(complete('rail s', c).line).toBe('rail status ');
    expect(complete('open OSC-DIR-041', c).options).toEqual(['OSC-DIR-0412', 'OSC-DIR-0413']);
    expect(complete('site alpha-0', c).line).toBe('site ALPHA-0');
    expect(complete('site ALPHA-03', c).line).toBe('site ALPHA-03 ');
  });
});
