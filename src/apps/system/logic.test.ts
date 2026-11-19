import { describe, expect, it } from 'vitest';
import canon from '@canon';
import type { AuditEntry, RouteEntry } from '@core/contracts';
import type { Canon, CalendarEvent } from '@core/canon-types';
import {
  eventReleased,
  eventState,
  filterGlossary,
  formatDuration,
  glossaryLetter,
  highestMarking,
  kbArticles,
  matchHelp,
  monthGrid,
  printJobs,
  referencedBy,
  sortEvents,
  viewFor,
  zuluOf,
} from './logic';

const c = canon as unknown as Canon;

const route = (over: Partial<RouteEntry>): RouteEntry => ({
  id: 'x',
  route: '/system/kb/kb-0001',
  app: 'system',
  family: 'system',
  template: 'help',
  docNo: 'KB-0001',
  title: 'Getting Started',
  marking: 'TSSCI-OSC',
  originator: 'CMS/ALPHA-02',
  revision: 1,
  date: '2008-01-01',
  summary: 'Signing in and the desktop.',
  ...over,
});

describe('views', () => {
  it('maps paths to views', () => {
    expect(viewFor('/system')).toBe('home');
    expect(viewFor('/system/')).toBe('home');
    expect(viewFor('/system/kb/kb-0042')).toBe('kb');
    expect(viewFor('/system/glossary')).toBe('glossary');
    expect(viewFor('/system/colophon')).toBe('colophon');
    expect(viewFor('/system/unknown')).toBe('home');
  });

  it('lists KB articles in number order and matches help text', () => {
    const list = kbArticles([
      route({ id: 'b', docNo: 'KB-0042', route: '/system/kb/kb-0042', title: 'Reading the Network Control Board', summary: 'Block occupancy.' }),
      route({ id: 'a' }),
      route({ id: 'g', docNo: 'OSC-SYS-GLO', route: '/system/glossary' }),
      route({ id: 'm', app: 'mail', route: '/mail/x' }),
    ]);
    expect(list.map((r) => r.docNo)).toEqual(['KB-0001', 'KB-0042']);
    expect(matchHelp(list, 'block occupancy').map((r) => r.docNo)).toEqual(['KB-0042']);
    expect(matchHelp(list, 'kb-0001').map((r) => r.docNo)).toEqual(['KB-0001']);
    expect(matchHelp(list, '  ')).toHaveLength(2);
  });
});

describe('markings', () => {
  it('picks the highest rank, or the lowest canon marking when nothing is shown', () => {
    const top = [...c.markings].sort((a, b) => b.rank - a.rank)[0]!.id;
    const low = [...c.markings].sort((a, b) => a.rank - b.rank)[0]!.id;
    expect(highestMarking([low, top], c.markings)).toBe(top);
    expect(highestMarking([], c.markings)).toBe(low);
  });
});

describe('glossary', () => {
  it('filters by letter and text, and finds reverse references', () => {
    expect(glossaryLetter('access roster')).toBe('A');
    const a = filterGlossary(c.glossary, '', 'A');
    expect(a.length).toBeGreaterThan(0);
    expect(a.every((t) => t.term.startsWith('A'))).toBe(true);
    expect(filterGlossary(c.glossary, 'surge berthing', null).some((t) => t.term === 'SURGE BERTHING')).toBe(true);
    const sustained = referencedBy(c.glossary, 'SUSTAINED CAPACITY');
    expect(sustained).toContain('SURGE BERTHING');
    expect(sustained).not.toContain('SUSTAINED CAPACITY');
  });

  it('every see-also in canon resolves to a term', () => {
    const names = new Set(c.glossary.map((t) => t.term));
    for (const t of c.glossary) for (const s of t.seeAlso) expect(names.has(s), `${t.term} -> ${s}`).toBe(true);
  });
});

describe('calendar', () => {
  it('lays out May 2008 from Sunday 27 APR to Saturday 31 MAY', () => {
    const g = monthGrid(2008, 5);
    expect(g).toHaveLength(5);
    expect(g[0]![0]).toEqual({ iso: '2008-04-27', day: 27, inMonth: false });
    expect(g[0]![4]).toEqual({ iso: '2008-05-01', day: 1, inMonth: true });
    expect(g[4]![6]).toEqual({ iso: '2008-05-31', day: 31, inMonth: true });
    expect(g.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it('releases events by tier', () => {
    expect(eventReleased({ tier: 4 }, 3)).toBe(true);
    expect(eventReleased({ tier: 3 }, 3)).toBe(true);
    expect(eventReleased({ tier: 2 }, 3)).toBe(false);
    expect(eventReleased({ tier: 2 }, 2)).toBe(true);
  });

  it('states events against the in-world date and time of day', () => {
    const ev = { date: '2008-05-28', startZ: '0800Z', endZ: '1200Z' };
    expect(eventState(ev, '2008-05-27', 600)).toBe('SCHEDULED');
    expect(eventState(ev, '2008-05-29', 600)).toBe('COMPLETE');
    expect(eventState(ev, '2008-05-28', 7 * 60)).toBe('SCHEDULED');
    expect(eventState(ev, '2008-05-28', 9 * 60)).toBe('IN PROGRESS');
    expect(eventState(ev, '2008-05-28', 12 * 60)).toBe('COMPLETE');
    expect(eventState({ date: '2008-05-13', startZ: null, endZ: null }, '2008-05-13', 0)).toBe('NO TIMES ENTERED');
  });

  it('sorts canon events by date and start time, and canon events stay in May 2008', () => {
    const s = sortEvents(c.calendar as CalendarEvent[]);
    for (let i = 1; i < s.length; i++) expect(s[i - 1]!.date <= s[i]!.date).toBe(true);
    for (const e of c.calendar) expect(e.date >= '2008-05-01' && e.date <= '2008-05-31').toBe(true);
  });
});

describe('print queue and time', () => {
  const entry = (seq: number, at: string, kind: AuditEntry['kind'] = 'print'): AuditEntry => ({ seq, at, kind, subject: `KB-00${seq}`, detail: '' });

  it('lists print jobs newest first and purges after four hours', () => {
    const jobs = printJobs(
      [entry(12, '2008-05-19T09:59:00.000Z'), entry(13, '2008-05-19T13:00:00.000Z'), entry(14, '2008-05-19T13:30:00.000Z', 'doc.read'), entry(318, '2008-05-19T13:59:00.000Z')],
      '2008-05-19T14:00:00.000Z',
      1,
    );
    expect(jobs.map((j) => j.job)).toEqual(['PQ-0318', 'PQ-0013']);
    expect(jobs.map((j) => j.state)).toEqual(['SPOOLING', 'SENT TO DEVICE']);
  });

  it('formats durations and Zulu times', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(3_725_000)).toBe('01:02:05');
    expect(formatDuration(90_000_000)).toBe('1d 01:00:00');
    expect(zuluOf('2008-05-19T14:30:00.000Z')).toBe('1430Z');
  });
});
