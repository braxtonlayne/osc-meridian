import { describe, expect, it } from 'vitest';
import canonJson from '../../../content/canon/canon.client.json';
import type { Canon } from '../../core/canon-types';
import {
  allocate,
  computeEstablishment,
  fillForHeadcount,
  formatRatio,
  headcountForFill,
  isCommandFunction,
  parseFill,
  parseHeadcount,
  supportRatio,
} from './ratio';

const canon = canonJson as unknown as Canon;
const rows = canon.ratioModel.rows;
const fac = (id: string) => canon.facilities.find((f) => f.id === id)!;

describe('allocate', () => {
  it('always sums to the total', () => {
    for (const total of [0, 1, 7, 9, 18, 99, 198, 1234, 4500]) {
      const out = allocate(total, rows.map((r) => r.pct));
      expect(out.reduce((a, b) => a + b, 0)).toBe(total);
      expect(out.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    }
  });
  it('gives remainders to the largest fractions, earlier line on a tie', () => {
    expect(allocate(3, [1, 1, 1])).toEqual([1, 1, 1]);
    expect(allocate(1, [1, 1])).toEqual([1, 0]);
    expect(allocate(10, [15, 85])).toEqual([2, 8]);
  });
  it('handles shares that do not sum to 100 and empty input', () => {
    expect(allocate(10, [1, 3])).toEqual([3, 7]);
    expect(allocate(10, [0, 0])).toEqual([0, 0]);
    expect(allocate(-5, [1])).toEqual([0]);
  });
});

describe('computeEstablishment', () => {
  it('reproduces the canon model counts at the model basis', () => {
    const r = computeEstablishment(rows, canon.ratioModel.capacity, canon.ratioModel.capacity);
    expect(r.lines.map((l) => l.posts)).toEqual(rows.map((x) => x.count));
    expect(r.establishment).toBe(canon.ratioModel.capacity);
    expect(r.fillPct).toBe(100);
  });
  it('defaults to the posted strength of a site and sums exactly', () => {
    const f = fac('ALPHA-03');
    const [cap, staff] = [f.capacity!, f.staff!];
    const r = computeEstablishment(rows, cap, staff);
    expect(r.establishment).toBe(staff);
    expect(r.lines.reduce((a, l) => a + l.posts, 0)).toBe(staff);
    expect(r.fillPct).toBeCloseTo((staff / cap) * 100, 10);
  });
  it('clamps the establishment to berthing and to zero', () => {
    const cap = fac('GAMMA-06').capacity!;
    expect(computeEstablishment(rows, cap, cap * 10).establishment).toBe(cap);
    const z = computeEstablishment(rows, cap, -3);
    expect(z.establishment).toBe(0);
    expect(z.supportToCommand).toBeNull();
  });
  it('has no basis at a site whose berthing the client canon withholds', () => {
    // DELTA berthing and staff are Tier 1 and arrive as null; the calculator does not offer them.
    for (const f of canon.facilities.filter((x) => x.class === 'DELTA')) {
      expect(f.capacity).toBeNull();
      expect(f.staff).toBeNull();
    }
    for (const f of canon.facilities.filter((x) => x.class !== 'DELTA')) expect(typeof f.capacity).toBe('number');
  });
  it('reports the support-to-command ratio from the command line', () => {
    const r = computeEstablishment(rows, canon.ratioModel.capacity, canon.ratioModel.capacity);
    const cmd = rows.filter((x) => isCommandFunction(x.function)).reduce((a, x) => a + x.count, 0);
    expect(r.commandPosts).toBe(cmd);
    expect(r.supportToCommand).toBeCloseTo((canon.ratioModel.capacity - cmd) / cmd, 10);
  });
});

describe('fill and headcount', () => {
  it('converts both ways', () => {
    expect(headcountForFill(2800, 50)).toBe(1400);
    expect(headcountForFill(2800, 0.01)).toBe(0);
    expect(headcountForFill(2800, 100)).toBe(2800);
    expect(headcountForFill(2800, 150)).toBe(2800);
    expect(headcountForFill(0, 50)).toBe(0);
    expect(fillForHeadcount(4500, 4500)).toBe(100);
    expect(fillForHeadcount(0, 1)).toBe(0);
  });
  it('rounds half up', () => {
    expect(headcountForFill(10, 25)).toBe(3);
    expect(headcountForFill(10, 24.9)).toBe(2);
  });
});

describe('parsers', () => {
  it('accepts percentages with an optional sign', () => {
    expect(parseFill('7.07')).toEqual({ ok: true, value: 7.07 });
    expect(parseFill(' 40 % ')).toEqual({ ok: true, value: 40 });
    expect(parseFill('100')).toEqual({ ok: true, value: 100 });
  });
  it('rejects bad fills with a message naming the block', () => {
    for (const bad of ['', 'abc', '101', '-1', '7.123']) {
      const r = parseFill(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/^Block 2:/);
    }
  });
  it('parses headcounts up to berthing', () => {
    expect(parseHeadcount('1,400', 2800)).toEqual({ ok: true, value: 1400 });
    expect(parseHeadcount('2801', 2800).ok).toBe(false);
    expect(parseHeadcount('12.5', 2800).ok).toBe(false);
  });
});

describe('ratios', () => {
  it('formats', () => {
    expect(supportRatio(10, 0)).toBeNull();
    expect(formatRatio(supportRatio(16, 2))).toBe('7.0:1');
    expect(formatRatio(null)).toBe('—');
  });
});
