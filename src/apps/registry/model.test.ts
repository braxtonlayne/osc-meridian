import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon, ClassId } from '@core/canon-types';
import {
  CLASS_IDS,
  adjacentTo,
  buildRows,
  classFromRoute,
  facilityFromRoute,
  filterRows,
  isOpen,
  locationLabel,
  requirementFor,
  sortKey,
  staffingBars,
  sustainmentText,
  totals,
  type Viewer,
} from './model';

const canon = canonJson as unknown as Canon;
const home = canon.operator.site as 'ALPHA-03';
const adjacent = adjacentTo(canon, home);
const baseline: Viewer = { adjacent, satisfies: (k) => k === 'LANTERN' || k === 'T3' || k === 'T4' };
const sextant: Viewer = { adjacent, satisfies: (k) => ['LANTERN', 'SEXTANT', 'T3', 'T4'].includes(k) };
const all = new Set<ClassId>(CLASS_IDS);

describe('registry model', () => {
  it('derives the home site adjacency from canon: rail in revenue service and tram links', () => {
    expect([...adjacent].sort()).toEqual(['ALPHA-01', 'ALPHA-03', 'ALPHA-05', 'BETA-09']);
  });

  it('builds one row per canon facility', () => {
    const rows = buildRows(canon, baseline);
    expect(rows).toHaveLength(canon.headline.facilities);
    for (const c of CLASS_IDS) expect(rows.filter((r) => r.cls === c)).toHaveLength(canon.classes.find((k) => k.id === c)!.count);
  });

  it('releases location and connections for the home site and its connections only', () => {
    const rows = buildRows(canon, baseline);
    const by = (id: string) => rows.find((r) => r.id === id)!;
    for (const id of adjacent) {
      expect(isOpen(by(id).location)).toBe(true);
    }
    expect(isOpen(by('ALPHA-02').location)).toBe(false);
    expect(isOpen(by('BETA-04').location)).toBe(false);
    // Cover identity, function and network are carried openly in every non-DELTA dossier.
    expect(isOpen(by('BETA-04').cover)).toBe(true);
    expect(isOpen(by('BETA-04').fn)).toBe(true);
    // GAMMA metro areas are on the class page; their depths are Tier 2.
    expect(isOpen(by('GAMMA-04').location)).toBe(true);
    expect(isOpen(by('GAMMA-04').depth)).toBe(false);
  });

  it('SEXTANT releases network geography but never DELTA', () => {
    const rows = buildRows(canon, sextant);
    expect(rows.filter((r) => r.cls !== 'DELTA').every((r) => isOpen(r.location))).toBe(true);
    expect(rows.filter((r) => r.cls === 'DELTA').some((r) => isOpen(r.location) || isOpen(r.capacity) || isOpen(r.codename))).toBe(false);
  });

  it('DELTA rows show designation and class only', () => {
    const f = canon.facilities.find((x) => x.class === 'DELTA')!;
    expect(requirementFor(f, 'location', adjacent)).toBe('T1');
    expect(requirementFor(f, 'capacity', adjacent)).toBe('T1');
    expect(requirementFor(f, 'staff', adjacent)).toBe('T2');
  });

  it('withheld bars carry the length of the withheld text', () => {
    const rows = buildRows(canon, baseline);
    const r = rows.find((x) => x.id === 'BETA-04')!;
    expect(isOpen(r.location)).toBe(false);
    if (!isOpen(r.location)) {
      expect(r.location.rx.key).toBe('SEXTANT');
      expect(r.location.rx.len).toBe(locationLabel(r.f).length);
    }
  });

  it('footer totals over every row match the canon headline when nothing is withheld', () => {
    const rows = buildRows(canon, { adjacent, satisfies: () => true });
    const t = totals(rows);
    expect(t.capacity).toBe(canon.headline.capacitySurge);
    expect(t.staff).toBe(canon.headline.staffPosted);
  });

  it('text filter searches released values only', () => {
    const rows = buildRows(canon, baseline);
    const beta04 = canon.facilities.find((f) => f.id === 'BETA-04')!;
    const city = beta04.anchor.city;
    const hits = filterRows(rows, { classes: all, text: city, reactorOnly: false });
    expect(hits.some((r) => r.id === 'BETA-04')).toBe(false);
    expect(filterRows(rows, { classes: all, text: 'lexington', reactorOnly: false }).map((r) => r.id)).toContain('ALPHA-03');
  });

  it('reactor filter lists released reactor sites', () => {
    const rows = buildRows(canon, baseline);
    const ids = filterRows(rows, { classes: all, text: '', reactorOnly: true }).map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['ALPHA-01', 'ALPHA-02', 'ALPHA-03', 'ALPHA-04', 'ALPHA-05', 'BETA-09']));
    expect(ids).not.toContain('BETA-08');
  });

  it('withheld values sort after released ones', () => {
    expect(sortKey({ rx: { key: 'T1', len: 4 } })).toBeNull();
    expect(sortKey({ v: 12 })).toBe(12);
  });

  it('parses registry routes', () => {
    expect(facilityFromRoute('/registry/facility/alpha-03')).toBe('ALPHA-03');
    expect(facilityFromRoute('/registry')).toBeNull();
    expect(classFromRoute('/registry/class/gamma')).toBe('GAMMA');
  });

  it('staffing bars sum to the posted figure and sustainment comes from canon', () => {
    const f = canon.facilities.find((x) => x.id === 'ALPHA-03')!;
    const bars = staffingBars(f);
    expect(bars.reduce((s, b) => s + b.count, 0)).toBe(f.staff);
    expect(sustainmentText(canon, f)).toContain(String(f.sustainedMonths));
    const g = canon.facilities.find((x) => x.class === 'GAMMA')!;
    const cls = canon.classes.find((c) => c.id === 'GAMMA')!;
    expect(sustainmentText(canon, g)).toContain(`${cls.sustainDaysMin} to ${cls.sustainDaysMax}`);
  });
});
