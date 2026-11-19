import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon, ClassId } from '@core/canon-types';
import { rxInfo } from '@core/rx';
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
  type Cell,
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

  it('SEXTANT lifts the plan, but geography the client canon withholds stays a SEXTANT bar; DELTA never opens', () => {
    const rows = buildRows(canon, sextant);
    for (const r of rows.filter((x) => x.cls !== 'DELTA')) {
      const inClient = !rxInfo(r.f.locationText);
      expect(isOpen(r.location), r.id).toBe(inClient);
      if (!isOpen(r.location)) expect(r.location.rx.key).toBe('SEXTANT');
    }
    // The home network and GAMMA metro areas are in the client canon.
    for (const id of adjacent) expect(isOpen(rows.find((r) => r.id === id)!.location)).toBe(true);
    expect(isOpen(rows.find((r) => r.id === 'GAMMA-04')!.location)).toBe(true);
    expect(rows.filter((r) => r.cls === 'DELTA').some((r) => isOpen(r.location) || isOpen(r.capacity) || isOpen(r.staff) || isOpen(r.codename))).toBe(false);
    // Even a session that satisfies every key gets no DELTA position or figure from the client canon.
    const everything = buildRows(canon, { adjacent, satisfies: () => true });
    expect(everything.filter((r) => r.cls === 'DELTA').some((r) => isOpen(r.location) || isOpen(r.capacity) || isOpen(r.staff))).toBe(false);
  });

  it('DELTA figures withheld by the client canon are T1 bars, never zero', () => {
    const rows = buildRows(canon, { adjacent, satisfies: () => true });
    for (const r of rows.filter((x) => x.cls === 'DELTA')) {
      for (const c of [r.capacity, r.staff, r.reactor] as Cell<unknown>[]) {
        expect(isOpen(c)).toBe(false);
        if (!isOpen(c)) expect(c.rx.key).toBe('T1');
      }
    }
    const b08 = rows.find((r) => r.id === 'BETA-08')!;
    expect(isOpen(b08.reactor)).toBe(false);
    if (!isOpen(b08.reactor)) expect(b08.reactor.rx.key).toBe('SEXTANT');
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
      // The client canon carries only the length of the withheld source text.
      expect(r.location.rx.len).toBe(rxInfo(locationLabel(r.f))!.len);
    }
  });

  it('footer totals count withheld rows instead of summing them as zero', () => {
    const rows = buildRows(canon, { adjacent, satisfies: () => true });
    const t = totals(rows);
    const delta = canon.classes.find((k) => k.id === 'DELTA')!;
    expect(t.capacityWithheld).toBe(delta.count);
    expect(t.staffWithheld).toBe(delta.count);
    // Released rows plus the DELTA class's stated totals give the canon headline.
    expect(t.capacity + delta.statedCapacity).toBe(canon.headline.capacitySurge);
    expect(t.staff + delta.statedStaff).toBe(canon.headline.staffPosted);
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
