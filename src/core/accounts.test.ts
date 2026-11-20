import { beforeEach, describe, expect, it } from 'vitest';
import {
  POINTER_KEY,
  accountByEmail,
  accountById,
  activeDef,
  activeId,
  allAccounts,
  cardNo,
  initActive,
  operatorShort,
  readPointer,
  takeSwitchNote,
  writePointer,
  writeSwitchNote,
} from './accounts';
import { t4Blocked } from './services';
import type { RouteEntry } from './contracts';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('accounts', () => {
  it('has the analyst card, typed, with pass-one credentials', () => {
    const a = accountById('analyst')!;
    expect(a.operatorId).toBe('OPR-A03-1147');
    expect(a.tier).toBe(3);
    expect(a.compartments).toContain('LANTERN');
    expect(allAccounts()[0]!.id).toBe('analyst');
    expect(new Set(allAccounts().map((x) => x.id)).size).toBe(allAccounts().length);
  });

  it('issues four cards from canon: Tier 4 technician, Tier 2 deputy, OIA auditor', () => {
    expect(allAccounts().map((x) => x.id)).toEqual(['analyst', 'lifesupport', 'deputy', 'auditor']);
    expect(accountById('lifesupport')!.tier).toBe(4);
    expect(accountById('deputy')!.tier).toBe(2);
    expect(accountById('auditor')!.auditReader).toBe(true);
    expect(allAccounts().filter((x) => x.auditReader).map((x) => x.id)).toEqual(['auditor']);
    for (const a of allAccounts()) expect(a.desktop.length).toBeGreaterThan(0);
  });

  it('pointer defaults to analyst and ignores unknown ids', () => {
    expect(readPointer()).toBe('analyst');
    localStorage.setItem(POINTER_KEY, 'root');
    expect(readPointer()).toBe('analyst');
    for (const a of allAccounts()) {
      writePointer(a.id);
      expect(readPointer()).toBe(a.id);
    }
  });

  it('switch note is one-shot and must match the pointer', () => {
    writeSwitchNote({ to: 'analyst', autologin: true });
    expect(takeSwitchNote('analyst')).toEqual({ to: 'analyst', autologin: true });
    expect(takeSwitchNote('analyst')).toBeNull();
    writeSwitchNote({ to: 'deputy', autologin: false });
    expect(takeSwitchNote('analyst')).toBeNull();
  });

  it('issues each card on its own site workstation, with that group print queue', () => {
    const ws = Object.fromEntries(allAccounts().map((a) => [a.id, `${a.workstation} ${a.printQueue} ${a.site}`]));
    expect(ws).toEqual({
      analyst: 'A03-5-114 PRN-A03-5 ALPHA-03',
      lifesupport: 'G08-3-002 PRN-G08-3 GAMMA-08',
      deputy: 'A02-7-002 PRN-A02-7 ALPHA-02',
      auditor: 'A01-4-022 PRN-A01-4 ALPHA-01',
    });
  });
  it('initActive fixes id and def for the page', () => {
    const d = initActive('analyst');
    expect(activeId.value).toBe('analyst');
    expect(activeDef.value).toBe(d);
  });

  it('resolves .mer addresses case-insensitively', () => {
    const a = accountById('analyst')!;
    expect(accountByEmail(a.email.toUpperCase())?.id).toBe('analyst');
    expect(accountByEmail('nobody@x.mer')).toBeUndefined();
  });

  it('formats card and short operator numbers', () => {
    const a = accountById('analyst')!;
    expect(cardNo(a)).toBe('TAC-A03-1147');
    expect(operatorShort(a)).toBe('3-1147');
  });
});

describe('tier 4 rule', () => {
  const r = (over: Partial<RouteEntry>): RouteEntry => ({
    id: 'dir-0128',
    route: '/directives/dir-0128',
    app: 'directives',
    family: 'directives',
    template: 'directive',
    docNo: 'OSC-DIR-0128',
    title: 'Air Handling',
    marking: 'UMBRA-R',
    originator: 'FE',
    revision: 1,
    date: '2008-04-01',
    summary: '',
    ...over,
  });
  it('blocks unmarked documents for Tier 4 only', () => {
    expect(t4Blocked(r({}), 4, 'lifesupport')).toBe(true);
    expect(t4Blocked(r({}), 3, 'analyst')).toBe(false);
    expect(t4Blocked(r({}), 2, 'deputy')).toBe(false);
  });
  it('opens t4 documents, own variants and application homes', () => {
    expect(t4Blocked(r({ t4: true }), 4, 'lifesupport')).toBe(false);
    expect(t4Blocked(r({ variants: ['lifesupport'] }), 4, 'lifesupport')).toBe(false);
    expect(t4Blocked(r({ variants: ['deputy'] }), 4, 'lifesupport')).toBe(true);
    expect(t4Blocked(r({ route: '/environ', app: 'environ' }), 4, 'lifesupport')).toBe(false);
  });
});
