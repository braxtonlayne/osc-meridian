import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.client.json';
import type { Canon, CompartmentId, Person } from '../../core/canon-types';
import { rxInfo } from '../../core/rx';
import { buildRow, cellText, filterRows, parseHolds, searchText, sortKey, stripHolds, UNPOSTED_SITE, type DirContext } from './directory';

const canon = canonJson as unknown as Canon;
const ids = canon.compartments.map((c) => c.id);
const ctx = (held: CompartmentId[]): DirContext => ({
  holds: (c) => held.includes(c),
  sponsorable: ['KESTREL', 'SEXTANT'],
  compartmentIds: ids,
  divisionName: (id) => canon.divisions.find((d) => d.id === id)?.name ?? id,
});
const person = (pn: string): Person => canon.roster.find((p) => p.pn === pn)!;

describe('holds parsing', () => {
  it('reads one or two compartments and strips the sentence', () => {
    expect(parseHolds('Holds KESTREL. Watch 2 runs.', ids)).toEqual(['KESTREL']);
    expect(parseHolds('Holds KESTREL and TALLOW. Signs sheets.', ids)).toEqual(['KESTREL', 'TALLOW']);
    expect(parseHolds('Reviews the audit trail.', ids)).toEqual([]);
    expect(stripHolds('Holds KESTREL. Watch 2 runs.')).toBe('Watch 2 runs.');
    expect(stripHolds('Signs notices. Holds BRIAR. Weekly review.')).toBe('Signs notices. Weekly review.');
    expect(stripHolds('Signs notices. Holds BRIAR.')).toBe('Signs notices.');
  });
});

describe('field withholding', () => {
  it('turns client-canon sentinels into bars and never into text', () => {
    const tier2 = canon.roster.filter((p) => p.tier === 2);
    expect(tier2.length).toBeGreaterThan(0);
    for (const p of tier2) {
      const r = buildRow(p, ctx(['LANTERN']));
      expect('rx' in r.name).toBe(true);
      expect(searchText(r)).not.toMatch(/\[\[rx/);
    }
  });
  it('withholds every field but PN and site of unposted entries without HOLLOW', () => {
    const unposted = canon.roster.filter((p) => p.site === UNPOSTED_SITE);
    expect(unposted.length).toBeGreaterThan(0);
    for (const p of unposted) {
      const r = buildRow(p, ctx(['LANTERN']));
      expect(r.pn).toBe(p.pn);
      expect(r.site).toBe(UNPOSTED_SITE);
      for (const c of [r.name, r.role, r.tier, r.email, r.notes]) expect('rx' in c).toBe(true);
      expect(r.tierNo).toBeNull();
      const hay = searchText(r);
      expect(hay).not.toContain(p.name.toLowerCase());
      expect(hay).not.toContain(p.email.toLowerCase());
    }
  });
  it('releases the tier of unposted entries to a HOLLOW holder; the client canon still withholds the name', () => {
    const p = canon.roster.find((x) => x.site === UNPOSTED_SITE)!;
    const r = buildRow(p, ctx(['LANTERN', 'HOLLOW']));
    expect(r.tierNo).toBe(p.tier);
    expect(cellText(r.tier)).not.toBe('');
    // Names, posts and addresses of unposted entries never reach the browser: HOLLOW bars of
    // the withheld length stand in their place, and the sentinel itself is not searchable.
    for (const [c, v] of [[r.name, p.name], [r.role, p.role], [r.email, p.email]] as const) {
      expect('rx' in c).toBe(true);
      if ('rx' in c) expect(c.rx).toEqual(rxInfo(v));
    }
    expect(rxInfo(p.name)!.key).toBe('HOLLOW');
    expect(searchText(r)).not.toMatch(/\[\[rx/);
  });
  it('shows held and sponsorable compartments, bars the rest', () => {
    const lockhart = canon.roster.find((p) => /Holds KESTREL and TALLOW/.test(p.notes))!;
    const r = buildRow(lockhart, ctx(['LANTERN']));
    expect(r.holds.map((c) => ('text' in c ? c.text : `rx:${c.rx.key}`))).toEqual(['KESTREL', 'rx:TALLOW']);
    const r2 = buildRow(lockhart, ctx(['LANTERN', 'TALLOW']));
    expect(r2.holds.map(cellText)).toEqual(['KESTREL', 'TALLOW']);
    expect(cellText(r.notes)).not.toMatch(/Holds/);
  });
});

describe('filtering and sorting', () => {
  const rows = canon.roster.map((p) => buildRow(p, ctx(['LANTERN'])));
  it('filters by tier, site and division', () => {
    expect(filterRows(rows, { query: '', tier: 3, site: null, divisionId: null }).every((r) => r.tierNo === 3)).toBe(true);
    expect(filterRows(rows, { query: '', tier: null, site: 'ALPHA-03', divisionId: null }).every((r) => r.site === 'ALPHA-03')).toBe(true);
    expect(filterRows(rows, { query: '', tier: null, site: null, divisionId: 'RD' }).every((r) => r.divisionId === 'RD')).toBe(true);
    expect(filterRows(rows, { query: '', tier: null, site: null, divisionId: null })).toHaveLength(rows.length);
  });
  it('matches visible text only, all terms', () => {
    const p = person('P-3-07-1021');
    const hit = filterRows(rows, { query: p.name.split(' ')[1]!, tier: null, site: null, divisionId: null });
    expect(hit.map((r) => r.pn)).toContain(p.pn);
    const unposted = canon.roster.find((x) => x.site === UNPOSTED_SITE)!;
    const surname = unposted.name.split(' ').pop()!;
    expect(filterRows(rows, { query: surname, tier: null, site: null, divisionId: null }).map((r) => r.pn)).not.toContain(unposted.pn);
    expect(filterRows(rows, { query: 'ALPHA-03 records', tier: null, site: null, divisionId: null }).every((r) => r.site === 'ALPHA-03')).toBe(true);
  });
  it('sorts withheld cells last', () => {
    expect(sortKey({ text: 'Zed' }) < sortKey({ rx: { key: 'T2', len: 4 } })).toBe(true);
  });
  it('does not list the operator', () => {
    expect(rows.map((r) => r.pn)).not.toContain(canon.operator.pn);
  });
});

describe('values released by the directory document', () => {
  it('shows the released name, post, mail and remarks of unposted entries under HOLLOW, never without', () => {
    const p = canon.roster.find((x) => x.site === UNPOSTED_SITE)!;
    const released = new Map([[p.pn, [p.pn, 'Released Name', 'Released post', UNPOSTED_SITE, null, 'released@a03.rd.mer', 'Last posted ALPHA-02.']]]);
    const h = buildRow(p, { ...ctx(['LANTERN', 'HOLLOW']), released });
    expect(cellText(h.name)).toBe('Released Name');
    expect(cellText(h.role)).toBe('Released post');
    expect(cellText(h.email)).toBe('released@a03.rd.mer');
    const n = buildRow(p, { ...ctx(['LANTERN']), released });
    for (const c of [n.name, n.role, n.email]) expect('rx' in c).toBe(true);
  });
  it('keeps the bar where the document cell is still withheld', () => {
    const p = canon.roster.find((x) => x.site === UNPOSTED_SITE)!;
    const released = new Map([[p.pn, [p.pn, null, null, null, null, null, null]]]);
    const h = buildRow(p, { ...ctx(['LANTERN', 'HOLLOW']), released });
    if (rxInfo(p.name)) expect('rx' in h.name).toBe(true);
  });
});
