import { describe, expect, it } from 'vitest';
import type { RouteEntry } from '@core/contracts';
import canon from '../../../content/canon/canon.client.json';
import {
  accessKeyOf,
  buildFolderGroups,
  facetCounts,
  highestMarking,
  htmlToSegs,
  isRxSeg,
  makeSnippet,
  normaliseSaved,
  passesFacets,
  patternToRegex,
  queryTerms,
  resolveDocNo,
  seriesMatchers,
  seriesOf,
  toggleFacet,
} from './lib';

const matchers = seriesMatchers(canon.docNumbering);

const r = (p: Partial<RouteEntry>): RouteEntry => ({
  id: 'x',
  route: '/x',
  app: 'records',
  family: 'council',
  template: 'memo',
  docNo: 'OSC-MEM-08-0001',
  title: 't',
  marking: 'TSSCI-OSC',
  originator: 'RD/ALPHA-03',
  revision: 1,
  date: '2008-05-01',
  summary: '',
  ...p,
});

describe('series', () => {
  it('classifies document numbers by the canon numbering scheme', () => {
    expect(seriesOf('OSC-MEM-08-0187', matchers)).toBe('Memorandum');
    expect(seriesOf('OSC-DIR-0412', matchers)).toBe('Directive');
    expect(seriesOf('OSC-CNL-MIN-06-04', matchers)).toBe('Council minutes');
    expect(seriesOf('OSC-CNL-SEAT-07', matchers)).toBe('Council seat record');
    expect(seriesOf('OSC-CNL-CHR-III', matchers)).toBe('Charter article');
    expect(seriesOf('OIA-08-031', matchers)).toBe('Security incident');
    expect(seriesOf('OSC-2008-Q2', matchers)).toBe('Source inventory');
    expect(seriesOf('KB-0042', matchers)).toBe('Help Desk article');
    expect(seriesOf('MSG-08-04470', matchers)).toBe('Message');
    expect(seriesOf('OSC-FAC-ALPHA-03', matchers)).toBe('Facility dossier');
    expect(seriesOf('OSC-TRN-SEG-04', matchers)).toBe('Transit record');
    expect(seriesOf('RD-ACC-08-00412', matchers)).toBe('Records accession');
    expect(seriesOf('NOT A NUMBER', matchers)).toBeNull();
  });
  it('does not treat letters inside words as digit runs', () => {
    expect(patternToRegex('OSC-CNL-SEAT-NN').test('OSC-CNL-SEAT-07')).toBe(true);
    expect(patternToRegex('OSC-CNL-SEAT-NN').test('OSC-C00-SEAT-07')).toBe(false);
  });
});

describe('access and markings', () => {
  it('builds requirement keys', () => {
    expect(accessKeyOf(undefined)).toBeNull();
    expect(accessKeyOf({ tier: 3, compartment: 'QUARRY' })).toBe('QUARRY+T3');
    expect(accessKeyOf({ tier: 2 })).toBe('T2');
  });
  it('picks the highest marking by rank', () => {
    const rank = (id: string) => canon.markings.find((m) => m.id === id)?.rank ?? 0;
    expect(highestMarking(['TSSCI-OSC', 'UMBRA-C', 'UMBRA-R'], rank, 'TSSCI-OSC')).toBe('UMBRA-C');
    expect(highestMarking([], rank, 'TSSCI-OSC')).toBe('TSSCI-OSC');
  });
});

describe('facets', () => {
  const items = [
    r({
      id: 'a',
      family: 'council',
      marking: 'UMBRA-R',
      originator: 'CS/ALPHA-01',
      date: '2007-11-02',
    }),
    r({
      id: 'b',
      family: 'council',
      marking: 'UMBRA-C',
      originator: 'CS/ALPHA-01',
      date: '2008-01-24',
    }),
    r({
      id: 'c',
      family: 'personnel',
      marking: 'TSSCI-OSC',
      originator: 'PV/ALPHA-01',
      date: '2008-04-17',
    }),
  ];
  it('filters with OR inside a facet and AND across facets', () => {
    const sel = toggleFacet(toggleFacet({}, 'family', 'council'), 'year', '2008');
    expect(items.filter((x) => passesFacets(x, sel)).map((x) => x.id)).toEqual(['b']);
    const sel2 = toggleFacet(sel, 'family', 'personnel');
    expect(items.filter((x) => passesFacets(x, sel2)).map((x) => x.id)).toEqual(['b', 'c']);
    expect(toggleFacet(toggleFacet({}, 'marking', 'X'), 'marking', 'X')).toEqual({});
  });
  it('counts a facet ignoring its own selection', () => {
    const sel = toggleFacet({}, 'family', 'council');
    const fam = facetCounts(items, 'family', sel);
    expect(fam.find((f) => f.value === 'personnel')?.count).toBe(1);
    const yr = facetCounts(items, 'year', sel);
    expect(Object.fromEntries(yr.map((y) => [y.value, y.count]))).toEqual({
      '2007': 1,
      '2008': 1,
    });
  });
});

describe('folders', () => {
  it('groups by division, series, marking and year and drops empty folders', () => {
    const items = [r({ originator: 'CS/ALPHA-01', docNo: 'OSC-CNL-SEAT-07' }), r({ originator: 'ZZ/ALPHA-09', docNo: 'ODD-1', date: '2007-01-01' })];
    const g = buildFolderGroups(items, canon.divisions, canon.markings, matchers);
    const div = g.find((x) => x.id === 'g:div')!.folders.map((f) => f.id);
    expect(div).toEqual(['div:CS', 'div:*']);
    const ser = g.find((x) => x.id === 'g:ser')!.folders.map((f) => f.id);
    expect(ser).toEqual(['ser:Council seat record', 'ser:*']);
    expect(g.find((x) => x.id === 'g:yr')!.folders.map((f) => f.label)).toEqual(['2008', '2007']);
  });
});

describe('snippets', () => {
  const html =
    '<p>1. The accession <strong>RD-ACC-08-00412</strong> was received in Stacks C &amp; held.</p>' +
    '<p>2. Chain of custody: <span class="rx" data-rx="r3" data-len="31" data-auth="OIA" data-ref="OIA-08-031"></span> pending.</p>' +
    '<div class="rx rx-block" data-rx="r4" data-len="400" data-auth="CS" data-ref="DIR-0412"></div>' +
    '<p>3. Released: <span class="rx-released" data-rx="r5" data-key="BRIAR">copy 07</span>.</p>';

  it('flattens HTML into text and redaction bars without hidden text', () => {
    const segs = htmlToSegs(html);
    const bars = segs.filter(isRxSeg);
    expect(bars.map((b) => b.rx.id)).toEqual(['r3', 'r4']);
    expect(bars[0]!.rx).toEqual({
      id: 'r3',
      len: 31,
      auth: 'OIA',
      ref: 'OIA-08-031',
    });
    const text = segs
      .filter((s) => !isRxSeg(s))
      .map((s) => (s as { text: string }).text)
      .join('');
    expect(text).toContain('Stacks C & held.');
    expect(text).toContain('copy 07');
    expect(text).not.toMatch(/<|>/);
  });

  it('centres on the query and highlights it, keeping bars in place', () => {
    const snip = makeSnippet(htmlToSegs(html), 'RD-ACC-08-00412', 120)!;
    expect(snip.matched).toBe(true);
    const hl = snip.segs.filter((s) => !isRxSeg(s) && s.hl).map((s) => (s as { text: string }).text);
    expect(hl[0]).toBe('RD-ACC-08-00412');
    expect(snip.segs.some(isRxSeg)).toBe(true);
  });

  it('falls back to the opening text when the query is not in the body', () => {
    const snip = makeSnippet(htmlToSegs(html), 'zebra', 40)!;
    expect(snip.matched).toBe(false);
    expect(snip.lead).toBe(false);
    expect(snip.trail).toBe(true);
  });

  it('splits queries into whole and partial terms, longest first', () => {
    expect(queryTerms('RD-ACC-08-00412')).toEqual(['rd-acc-08-00412', '00412', 'acc', 'rd', '08']);
    expect(queryTerms('  ')).toEqual([]);
  });
});

describe('misc', () => {
  it('resolves typed document numbers', () => {
    const map = new Map([['OSC-DIR-0412', r({ docNo: 'OSC-DIR-0412' })]]);
    const by = (d: string) => map.get(d);
    expect(resolveDocNo(' dir-0412 ', by)?.docNo).toBe('OSC-DIR-0412');
    expect(resolveDocNo('osc-dir-0412', by)?.docNo).toBe('OSC-DIR-0412');
    expect(resolveDocNo('DIR-9999', by)).toBeUndefined();
  });
  it('drops malformed saved queries', () => {
    expect(normaliseSaved([{ id: '1', name: 'n', query: 'q' }, { id: 2 }, null])).toHaveLength(1);
    expect(normaliseSaved('x')).toEqual([]);
  });
});
