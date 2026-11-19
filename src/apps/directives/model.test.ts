import { describe, expect, it } from 'vitest';
import type { AuditEntry, DocJson, RouteEntry } from '@core/contracts';
import {
  ackDetail,
  ackReceipt,
  ackStateFor,
  allLineages,
  buildGraph,
  isoFromOsc,
  issuesOf,
  predecessorFromText,
  priorRevisionOf,
  supersedesText,
  lineage,
  matches,
  normalizeDirNo,
  numberBlocks,
  paraHash,
  parseAcks,
  parsePara,
  refsOf,
  rowFromEntry,
  shortNo,
  statusOf,
  zuluLocal,
} from './model';

const entry = (n: string, extra: Partial<RouteEntry> = {}): RouteEntry => ({
  id: `dir-${n}`,
  route: `/directives/dir-${n}`,
  app: 'directives',
  family: 'directives',
  template: 'directive',
  docNo: `OSC-DIR-${n}`,
  title: `Directive ${n}`,
  marking: 'TSSCI-OSC',
  originator: 'PV/ALPHA-01',
  revision: 2,
  date: '2008-01-14',
  summary: 'summary line',
  ...extra,
});

const doc = (e: RouteEntry, fm: Record<string, unknown>, supersedes?: string): DocJson => ({
  ...e,
  html: '',
  redactions: [],
  xrefs: [],
  headings: [],
  frontmatter: fm,
  ...(supersedes ? { supersedes } : {}),
});

describe('numbers', () => {
  it('short forms and normalises', () => {
    expect(shortNo('OSC-DIR-0412')).toBe('DIR-0412');
    expect(normalizeDirNo('412')).toBe('OSC-DIR-0412');
    expect(normalizeDirNo('dir-0412')).toBe('OSC-DIR-0412');
    expect(normalizeDirNo('OSC-DIR-0412')).toBe('OSC-DIR-0412');
    expect(normalizeDirNo('F-114')).toBeNull();
  });
});

describe('frontmatter', () => {
  it('reads the directive block over top-level keys', () => {
    const e = entry('0233');
    const r = rowFromEntry(e, doc(e, { directive: { opr: 'PV/ALPHA-01', effective: '2008-02-01', status: 'current', category: 'Personnel' } }));
    expect(r.opr).toBe('PV');
    expect(r.effective).toBe('2008-02-01');
    expect(r.declaredStatus).toBe('CURRENT');
    expect(r.category).toBe('Personnel');
    expect(r.loaded).toBe(true);
  });
  it('falls back to the route entry before the document loads', () => {
    const r = rowFromEntry(entry('0107', { originator: 'CMD/ALPHA-01', date: '2007-07-02' }));
    expect(r.opr).toBe('CMD');
    expect(r.effective).toBe('2007-07-02');
    expect(r.loaded).toBe(false);
  });
  it('accepts supersession refs in several shapes', () => {
    expect(refsOf('OSC-DIR-0398')).toEqual([{ docNo: 'OSC-DIR-0398' }]);
    expect(refsOf('None')).toEqual([]);
    expect(refsOf(['OSC-DIR-0001', { docNo: 'osc-dir-0002', title: 'Old', effective: '2001-01-01' }]).map((x) => x.docNo)).toEqual([
      'OSC-DIR-0001',
      'OSC-DIR-0002',
    ]);
  });
});

describe('supersession graph', () => {
  const a = entry('0412');
  const b = entry('0378');
  const c = entry('0115');
  const rows = [
    rowFromEntry(a, doc(a, { directive: {} }, 'OSC-DIR-0378')),
    rowFromEntry(b, doc(b, { directive: { supersedes: [{ docNo: 'OSC-DIR-0091', title: 'Handling of Compartmented Records', effective: '2003-06-01' }] } })),
    rowFromEntry(c, doc(c, {})),
  ];
  const g = buildGraph(rows);

  it('derives status from successors', () => {
    expect(statusOf('OSC-DIR-0412', g)).toBe('CURRENT');
    expect(statusOf('OSC-DIR-0378', g)).toBe('SUPERSEDED');
    expect(statusOf('OSC-DIR-0091', g)).toBe('SUPERSEDED');
    expect(statusOf('OSC-DIR-0115', g)).toBe('CURRENT');
  });
  it('builds a lineage newest first from any member', () => {
    expect(lineage('OSC-DIR-0378', g)).toEqual(['OSC-DIR-0412', 'OSC-DIR-0378', 'OSC-DIR-0091']);
    expect(lineage('OSC-DIR-0091', g)).toEqual(['OSC-DIR-0412', 'OSC-DIR-0378', 'OSC-DIR-0091']);
    expect(lineage('OSC-DIR-0115', g)).toEqual(['OSC-DIR-0115']);
  });
  it('keeps predecessor details for issues not held', () => {
    const n = g.get('OSC-DIR-0091')!;
    expect(n.held).toBe(false);
    expect(n.ref?.title).toBe('Handling of Compartmented Records');
  });
  it('lists only lineages with more than one issue', () => {
    expect(allLineages(g)).toEqual([['OSC-DIR-0412', 'OSC-DIR-0378', 'OSC-DIR-0091']]);
  });
  it('survives a cycle', () => {
    const x = entry('0001');
    const y = entry('0002');
    const g2 = buildGraph([rowFromEntry(x, doc(x, {}, 'OSC-DIR-0002')), rowFromEntry(y, doc(y, {}, 'OSC-DIR-0001'))]);
    expect(lineage('OSC-DIR-0001', g2).length).toBe(2);
  });
});

describe('paragraphs', () => {
  it('parses paragraph references', () => {
    expect(parsePara('#para-6')).toEqual({ sec: 6 });
    expect(parsePara('para-6.2')).toEqual({ sec: 6, sub: 2 });
    expect(parsePara('4(c)')).toEqual({ sec: 4, sub: 3, letter: true });
    expect(paraHash({ sec: 4, sub: 3, letter: true })).toBe('#para-4c');
    expect(parsePara('#para-4c')).toEqual({ sec: 4, sub: 3, letter: true });
    expect(parsePara('para 7')).toEqual({ sec: 7 });
    expect(parsePara('x')).toBeNull();
    expect(parsePara('0')).toBeNull();
    expect(paraHash({ sec: 6, sub: 2 })).toBe('#para-6.2');
  });
  it('numbers blocks like the directive stylesheet', () => {
    expect(numberBlocks(['P', 'H2', 'P', 'UL', 'P', 'H2', 'P'])).toEqual([null, '1', '1.1', null, '1.2', '2', '2.1']);
  });
});

describe('acknowledgements', () => {
  const at = '2008-05-19T14:30:05.000Z';
  const mk = (seq: number, detail: string, kind: AuditEntry['kind'] = 'form.submit'): AuditEntry => ({ seq, at, kind, subject: 'OSC-DIR-0412', detail });
  it('round-trips through the audit detail', () => {
    const receipt = ackReceipt('OSC-DIR-0412', 3, '08', 7);
    expect(receipt).toBe('ACK/DIR-0412/R3/08-00007');
    const acks = parseAcks([mk(1, ackDetail('3-1147', 'OSC-DIR-0412', 3, receipt, 'Title')), mk(2, 'other'), mk(3, 'x', 'doc.read')]);
    expect(acks).toEqual([{ docNo: 'OSC-DIR-0412', revision: 3, receipt, at, seq: 1 }]);
    expect(ackStateFor('OSC-DIR-0412', 3, acks).kind).toBe('current');
    expect(ackStateFor('OSC-DIR-0412', 4, acks).kind).toBe('earlier');
    expect(ackStateFor('OSC-DIR-0115', 1, acks).kind).toBe('none');
  });
  it('formats zulu with local', () => {
    expect(zuluLocal(at)).toBe('1430Z (1030 EDT)');
    expect(zuluLocal('2008-05-19T02:05:00Z')).toBe('0205Z (2205 EDT)');
  });
});

describe('filter', () => {
  it('matches text, OPR and status', () => {
    const r = rowFromEntry(entry('0233', { title: 'Personnel Strength Accounting' }));
    expect(matches(r, 'CURRENT', { text: 'strength', opr: '', status: '' })).toBe(true);
    expect(matches(r, 'CURRENT', { text: 'dir-0233', opr: 'PV', status: 'CURRENT' })).toBe(true);
    expect(matches(r, 'CURRENT', { text: '', opr: 'OIA', status: '' })).toBe(false);
    expect(matches(r, 'CURRENT', { text: '', opr: '', status: 'SUPERSEDED' })).toBe(false);
  });
});

describe('published supersession lines', () => {
  const line = 'OSC-DIR-0412 Revision 2, 03 SEP 2007. Revision 1 cancelled OSC-DIR-0398.';
  it('extracts every directive number named', () => {
    expect(refsOf(line).map((r) => r.docNo)).toEqual(['OSC-DIR-0412', 'OSC-DIR-0398']);
  });
  it('reads the prior revision of the same number', () => {
    expect(priorRevisionOf(line, 'OSC-DIR-0412')).toEqual({ rev: 2, date: '2007-09-03' });
    expect(priorRevisionOf('OSC-DIR-0262 Revision 2, 15 JAN 2007', 'OSC-DIR-0262')).toEqual({ rev: 2, date: '2007-01-15' });
    expect(priorRevisionOf('OSC-DIR-0024', 'OSC-DIR-0107')).toBeNull();
    expect(isoFromOsc('03 SEP 2007')).toBe('2007-09-03');
  });
  it('reads a cancelled predecessor title from the body', () => {
    const html = '<p>This directive supersedes OSC-DIR-0024, Surface Parking at Command Facilities, which is cancelled.</p>';
    expect(predecessorFromText(html, 'OSC-DIR-0024')).toEqual({ title: 'Surface Parking at Command Facilities', note: 'cancelled' });
    expect(predecessorFromText('<p>Absorbs and cancels OSC-DIR-0398.</p>', 'OSC-DIR-0398')).toEqual({ note: 'cancelled' });
  });
  it('builds rows, issues and register text from a directive', () => {
    const e = entry('0412', { revision: 3 });
    const d = doc(
      e,
      {
        opr: 'OIA/ALPHA-01',
        revisions: [
          { rev: 1, date: '2006-10-02', change: 'First issue.' },
          { rev: 2, date: '2007-09-03', change: 'Para 4(e) added.' },
          { rev: 3, date: '2008-04-22', change: 'Para 8 added.' },
        ],
        directive: { opr: 'OIA/ALPHA-01 (Policy and Compliance Section)', effective: '2008-05-01', supersedes: line },
      },
      'OSC-DIR-0398',
    );
    d.html = '<p>Revision 1 absorbs and cancels OSC-DIR-0398.</p>';
    const r = rowFromEntry(e, d);
    expect(r.oprFull).toBe('OIA/ALPHA-01');
    expect(r.oprDetail).toBe('OIA/ALPHA-01 (Policy and Compliance Section)');
    expect(r.supersedes.map((p) => p.docNo)).toEqual(['OSC-DIR-0398']);
    expect(r.supersedes[0]!.note).toBe('cancelled');
    expect(r.supersessionLine).toBe(line);
    expect(issuesOf(r).map((x) => [x.rev, x.current])).toEqual([
      [3, true],
      [2, false],
      [1, false],
    ]);
    expect(supersedesText(r)).toBe('Rev 2; DIR-0398 (cancelled)');
    const g = buildGraph([r]);
    expect(statusOf('OSC-DIR-0398', g)).toBe('CANCELLED');
    expect(lineage('OSC-DIR-0412', g)).toEqual(['OSC-DIR-0412', 'OSC-DIR-0398']);
  });
  it('treats None as an original issue', () => {
    const e = entry('0163', { revision: 1 });
    const r = rowFromEntry(e, doc(e, { directive: { supersedes: 'None' } }));
    expect(r.supersedes).toEqual([]);
    expect(r.supersessionLine).toBeUndefined();
    expect(supersedesText(r)).toBe('None (original issue)');
  });
});
