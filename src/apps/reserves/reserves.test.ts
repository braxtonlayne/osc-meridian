import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import {
  DAYS_PER_YEAR,
  describeDays,
  facilityWindow,
  mealsDays,
  networkSustainment,
  parseWhole,
  scaledDays,
  toMonths,
} from './sustain';
import {
  BROWSE_PER_DAY,
  GENE_PREFIX,
  GENE_TIMELINE,
  PAGE_SIZE,
  SEED_PREFIX,
  SEED_TIMELINE,
  browseClock,
  canonValueInHtml,
  findAccession,
  findTable,
  geneRecord,
  geneRelease,
  linearClock,
  pageCount,
  pageIndices,
  parseCodeList,
  seedRecord,
} from './catalogue';
import { buildRegister, htmlToParts, sentences, workOrderPattern } from './workorders';

const canon = canonJson as unknown as Canon;
const item = (id: string) => canon.reserves.items.find((i) => i.id === id)!;

describe('sustainment calculator', () => {
  it('meals: canon stock at sustained capacity, three a day', () => {
    const meals = item('FOOD-MRE').value!;
    const pop = canon.headline.capacitySustained;
    const d = mealsDays(meals, pop, 3);
    expect(d).toBeCloseTo(meals / (pop * 3), 9);
    // The calculator reports the arithmetic as it falls (670 days at the defaults).
    expect(Math.round(d)).toBe(Math.round(meals / pop / 3));
  });

  it('pharmaceuticals scale inversely from the stated years at capacity', () => {
    const years = item('MED-PHARMA').value!;
    const cap = canon.headline.capacitySustained;
    expect(scaledDays(years * DAYS_PER_YEAR, cap, cap) / DAYS_PER_YEAR).toBeCloseTo(years, 9);
    expect(scaledDays(years * DAYS_PER_YEAR, cap, cap / 2) / DAYS_PER_YEAR).toBeCloseTo(years * 2, 9);
  });

  it('network lines use canon values only and omit withheld items', () => {
    const lines = networkSustainment(canon, canon.headline.staffTotal, 3);
    const ids = lines.map((l) => l.id);
    expect(ids).toEqual(['FOOD-MRE', 'MED-PHARMA', 'WATER-PURIFICATION', 'MED-BLOOD', 'ENERGY-DIESEL']);
    const diesel = lines.find((l) => l.id === 'ENERGY-DIESEL')!;
    expect(diesel.days).toBe(item('ENERGY-DIESEL').value);
    expect(diesel.scales).toBe(false);
    const water = lines.find((l) => l.id === 'WATER-PURIFICATION')!;
    expect(water.perHead!.value).toBeCloseTo(item('WATER-PURIFICATION').value! / canon.headline.staffTotal, 9);
    for (const l of lines) expect(l.stock).toBe(item(l.id).text);
  });

  it('facility windows follow the class rules', () => {
    const cls = (id: string) => canon.classes.find((c) => c.id === id);
    const a = canon.facilities.find((f) => f.class === 'ALPHA')!;
    const wa = facilityWindow(a, cls('ALPHA'), a.capacity);
    expect(toMonths(wa.minDays!)).toBeCloseTo(a.sustainedMonths!, 9);
    const wHalf = facilityWindow(a, cls('ALPHA'), a.capacity / 2);
    expect(toMonths(wHalf.minDays!)).toBeCloseTo(a.sustainedMonths! * 2, 9);

    const g = canon.facilities.find((f) => f.class === 'GAMMA')!;
    const wg = facilityWindow(g, cls('GAMMA'), g.capacity);
    expect(wg.minDays).toBe(cls('GAMMA')!.sustainDaysMin);
    expect(wg.maxDays).toBe(cls('GAMMA')!.sustainDaysMax);

    const d = canon.facilities.find((f) => f.class === 'DELTA')!;
    const wd = facilityWindow(d, cls('DELTA'), 1);
    expect(wd.scaled).toBe(false);
    expect(wd.maxDays).toBe(cls('DELTA')!.sustainDaysMax);

    const b = canon.facilities.find((f) => f.class === 'BETA')!;
    const wb = facilityWindow(b, cls('BETA'), b.capacity);
    expect(wb.minDays).toBeNull();
    expect(wb.stated).toBe(cls('BETA')!.sustainabilityText);
  });

  it('input validation rejects in house form', () => {
    expect(parseWhole('23,400', '1', 'Population', 1, 34700, 'surge berthing')).toEqual({ ok: true, value: 23400 });
    const r = parseWhole('12.5', '1', 'Population', 1, 34700, 'surge berthing');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^REJECTED Block 1:/);
    expect(parseWhole('99999', '1', 'Population', 1, 34700, 'surge berthing').ok).toBe(false);
    expect(parseWhole('', '2', 'Meals per day', 1, 6, 'x').ok).toBe(false);
    expect(parseWhole('0', '2', 'Meals per day', 1, 6, 'x').ok).toBe(false);
  });

  it('describes durations without rounding upstream', () => {
    expect(describeDays(null)).toEqual({ days: '', months: '', years: '' });
    const d = describeDays(DAYS_PER_YEAR);
    expect(d.years).toBe('1.00');
    expect(d.months).toBe('12.0');
  });
});

describe('vault catalogues', () => {
  const seedTotal = item('FOOD-SEED').value!;
  const sc = linearClock(seedTotal, SEED_TIMELINE);
  const gc = linearClock(5000, GENE_TIMELINE);

  it('entries are deterministic, numbered by year of receipt and dated within the catalogue', () => {
    expect(seedRecord(1234, sc)).toEqual(seedRecord(1234, sc));
    expect(geneRecord(99, gc)).toEqual(geneRecord(99, gc));
    expect(seedRecord(0, sc).accession).toBe('SC-04-000001');
    const last = seedRecord(seedTotal - 1, sc);
    expect(last.accession.startsWith('SC-08-')).toBe(true);
    expect(last.received).toBe('09 MAY 2008');
    for (let i = 0; i < seedTotal; i += 9973) {
      const r = seedRecord(i, sc);
      expect(Number(r.viability.slice(7, 11))).toBeLessThanOrEqual(2008);
      expect(r.accession).toMatch(/^SC-0[4-8]-\d{6}$/);
      expect(r.location).toMatch(/^[12]\/[A-H]-\d{2,3}\/[1-6]\/\d{3}$/);
    }
  });

  it('accession lookup inverts the numbering, including across year boundaries', () => {
    for (const i of [0, 1, 24, 25, 99999, 400000, seedTotal - 1]) {
      const acc = seedRecord(i, sc).accession;
      expect(findAccession(acc, SEED_PREFIX, sc)).toBe(i);
    }
    expect(findAccession('sc 04 1', SEED_PREFIX, sc)).toBe(0);
    expect(findAccession('SC-04-999999', SEED_PREFIX, sc)).toBeNull();
    expect(findAccession('RD-ACC-08-00412', SEED_PREFIX, sc)).toBeNull();
    expect(findAccession('BSC-09-000001', GENE_PREFIX, browseClock(BROWSE_PER_DAY, GENE_TIMELINE))).toBeNull();
    const bc = browseClock(BROWSE_PER_DAY, GENE_TIMELINE);
    expect(bc.size).toBe(Infinity);
    expect(findAccession(geneRecord(123456, bc).accession, GENE_PREFIX, bc)).toBe(123456);
    expect(findAccession(geneRecord(777, gc).accession, GENE_PREFIX, gc)).toBe(777);
  });

  it('pages cover the canon total exactly', () => {
    const pages = pageCount(seedTotal);
    expect(pages).toBe(Math.ceil(seedTotal / PAGE_SIZE));
    const last = pageIndices(pages, seedTotal);
    expect(last[last.length - 1]).toBe(seedTotal - 1);
    expect(pageIndices(1, seedTotal)).toHaveLength(PAGE_SIZE);
  });

  it('lays the printed first page over generated entries', () => {
    const html =
      '<table><thead><tr><th>Accession</th><th>Taxon</th><th>Origin</th><th>Received</th><th>Viability test</th><th>Location</th></tr></thead>' +
      "<tbody><tr><td>SC-04-000001</td><td><em>Zea mays</em> 'Leaming'</td><td>Ohio, US</td><td>23 SEP 2004</td><td>21 MAR 2008, 88%</td><td>1/A-01/1/001</td></tr></tbody></table>";
    const t = findTable(html, ['Accession', 'Taxon']);
    expect(t?.rows).toHaveLength(1);
    expect(seedRecord(0, sc, t).taxon).toBe("Zea mays 'Leaming'");
    expect(seedRecord(1, sc, t).accession).toBe('SC-04-000002');
    // Generated entries are never dated before the last printed entry.
    const late = t!.rows[0]!.slice();
    late[3] = '29 SEP 2004';
    const t2 = { headers: t!.headers, rows: [late] };
    expect(seedRecord(1, sc, t2).received).toBe('29 SEP 2004');
  });

  it('keeps donor fields withheld until the record releases the code list', () => {
    const withheldHtml =
      '<table><tr><th>Accession</th><th>Sample type</th><th>Aliquots</th><th>Received</th><th>Storage</th><th>Donor category</th><th>Selection basis</th></tr>' +
      '<tr><td>BSC-04-000001</td><td>Whole blood, EDTA</td><td>6</td><td>18 OCT 2004</td><td>D-01/03/A/01</td><td><span class="rx" data-len="2"></span></td><td><span class="rx" data-len="19"></span></td></tr></table>';
    const r0 = geneRelease(withheldHtml);
    expect(r0.codes).toEqual([]);
    const overlay = findTable(withheldHtml, ['Accession', 'Sample type']);
    const g = geneRecord(5, gc, overlay, r0);
    expect(g.donor).toBeNull();
    expect(g.basis).toBeNull();
    const first = geneRecord(0, gc, overlay, r0);
    expect(first.accession).toBe('BSC-04-000001');
    expect(first.donor).toBeNull();

    const released =
      withheldHtml.replace('<span class="rx" data-len="2"></span>', 'K1').replace('<span class="rx" data-len="19"></span>', 'Roster 2004/1') +
      '<table><tr><th>Code</th><th>Category</th></tr><tr><td>K1</td><td>Kitchen staff</td></tr></table>';
    const r1 = geneRelease(released);
    expect(r1.codes).toEqual([{ code: 'K1', label: 'Kitchen staff' }]);
    expect(r1.bases).toEqual({ K1: ['Roster 2004/1'] });
    const g1 = geneRecord(5, gc, null, r1);
    expect(g1.donor).toBe('K1');
    expect(g1.basis).toBe('Roster 2004/1');
  });

  it('reads printed canon values and code lists from document HTML', () => {
    const html = '<p>Holdings <span class="cv" data-canon="reserves.items.MED-GENETIC.value">1,500</span> samples.</p>';
    expect(canonValueInHtml(html, 'reserves.items.MED-GENETIC.value')).toBe(1500);
    expect(canonValueInHtml(html, 'reserves.items.FOOD-SEED.value')).toBeNull();
    expect(parseCodeList('<table><tr><th>Item</th></tr><tr><td>a</td><td>b</td></tr></table>')).toEqual([]);
  });
});

describe('work order citations', () => {
  const divs = canon.divisions.map((d) => d.id);

  it('pattern takes division prefixes only', () => {
    const re = workOrderPattern(divs);
    expect('see FE-08-0417 and RD-ACC-08-00412 and XX-08-0001'.match(re)).toEqual(['FE-08-0417']);
  });

  it('extracts the citing sentence and keeps withheld spans withheld', () => {
    const html =
      '<p>Cold room 2 is on the essential bus. Plant constraints: see work order FE-08-0417 ' +
      '(<span class="rx" data-rx="a" data-len="11" data-auth="FE" data-ref="OSC-CB-014"></span>).</p>' +
      '<p>Compressor maintenance\n on 20 MAY 2008.</p>';
    const parts = htmlToParts(html);
    expect(parts.some((p) => 'rx' in p && p.rx.len === 11 && p.rx.auth === 'FE')).toBe(true);
    expect(sentences(parts).length).toBeGreaterThanOrEqual(3);
    const reg = buildRegister([{ source: 'OSC-RSV-SEED', title: 'Seed', route: '/reserves/seed-vault', parts }], divs);
    expect(reg).toHaveLength(1);
    const wo = reg[0]!;
    expect(wo.no).toBe('FE-08-0417');
    expect(wo.division).toBe('FE');
    const ex = wo.citations[0]!.excerpt;
    const text = ex.map((p) => ('text' in p ? p.text : '#')).join('');
    expect(text).toContain('work order FE-08-0417');
    expect(text).not.toContain('Cold room 2');
    expect(ex.some((p) => 'rx' in p)).toBe(true);
  });

  it('reads canon reactor status notes', () => {
    const sources = canon.reactors.map((r) => ({ source: r.id, title: r.designation, route: null, parts: [{ text: r.statusNote }] }));
    const reg = buildRegister(sources, divs);
    for (const wo of reg) {
      for (const c of wo.citations) expect(canon.reactors.find((r) => r.id === c.source)!.statusNote).toContain(wo.no);
    }
  });
});
