/**
 * Unit check for @graphics/ledger. Run from the repo root:
 *   npx vitest run --config src/graphics/ledger/check/vitest.config.ts
 * Asserts that every total the Sankey and the charts draw equals the canon figure.
 */
import { describe, expect, it } from 'vitest';
import {
  budget,
  buildSankeyGraph,
  departmentTotals,
  fiscalYearRows,
  fmtB,
  fmtM,
  fmtMasB,
  layoutSankey,
  lineItemSeries,
  nodeFlowTotals,
  nodeKey,
} from './model';
import type { GroupMode, LedgerGraph } from './model';

const TOTAL_M = budget.totalB * 1000;
const cases: [string, GroupMode, string[]][] = [
  ['department', 'department', []],
  ['department, DOD and FEMA expanded', 'department', ['DOD', 'FEMA']],
  ['item', 'item', []],
  ['none', 'none', []],
];

function check(graph: LedgerGraph, mode: GroupMode) {
  const flows = nodeFlowTotals(graph);
  const node = (key: string) => {
    const n = graph.nodes.find((x) => x.key === key);
    const f = flows.get(key);
    if (!n || !f) throw new Error(`missing node ${key}`);
    return { n, f };
  };
  for (const s of budget.sources) {
    const { n, f } = node(nodeKey('source', s.id));
    expect(f.outM, `source ${s.id} outflow`).toBeCloseTo(s.amountB * 1000, 6);
    expect(n.valueM).toBeCloseTo(s.amountB * 1000, 6);
    expect(f.inM).toBe(0);
  }
  for (const c of budget.categories) {
    const { n, f } = node(nodeKey('category', c.id));
    expect(f.inM, `category ${c.id} inflow`).toBeCloseTo(c.amountB * 1000, 6);
    expect(n.valueM).toBeCloseTo(c.amountB * 1000, 6);
    expect(f.outM).toBe(0);
  }
  const middle = graph.nodes.filter((n) => n.kind === 'department' || n.kind === 'item');
  if (mode === 'none') expect(middle).toHaveLength(0);
  for (const n of middle) {
    const f = flows.get(n.key);
    expect(f?.inM, `${n.key} inflow`).toBeCloseTo(n.valueM, 6);
    expect(f?.outM, `${n.key} outflow`).toBeCloseTo(n.valueM, 6);
  }
  for (const n of middle.filter((x) => x.kind === 'item')) {
    expect(n.valueM).toBe(budget.lineItems.find((l) => l.no === n.id)?.amountM);
  }
  for (const n of middle.filter((x) => x.kind === 'department')) {
    expect(n.valueM).toBe(departmentTotals().find((d) => d.id === n.id)?.amountM);
  }
  if (mode !== 'none') {
    expect(middle.reduce((a, n) => a + n.valueM, 0)).toBeCloseTo(TOTAL_M, 6);
    expect(middle.reduce((a, n) => a + n.count, 0)).toBe(budget.lineItemCount);
  }
}

describe('Sankey totals equal canon', () => {
  for (const [name, mode, expanded] of cases) {
    it(`graph: ${name}`, () => check(buildSankeyGraph(mode, new Set(expanded)), mode));

    it(`layout: ${name}`, () => {
      const laid = layoutSankey(buildSankeyGraph(mode, new Set(expanded)), { x0: 200, y0: 20, x1: 1200, y1: 780 });
      for (const s of budget.sources) {
        expect(laid.nodes.find((n) => n.key === nodeKey('source', s.id))?.layoutValueM).toBeCloseTo(s.amountB * 1000, 6);
      }
      for (const c of budget.categories) {
        expect(laid.nodes.find((n) => n.key === nodeKey('category', c.id))?.layoutValueM).toBeCloseTo(c.amountB * 1000, 6);
      }
      // Band thickness is proportional to value on one common scale.
      const k = laid.nodes.map((n) => (n.y1 - n.y0) / n.valueM);
      expect(Math.max(...k) - Math.min(...k)).toBeLessThan(1e-9);
      // Canon order is preserved top to bottom in the outer columns.
      const ys = (kind: string) => laid.nodes.filter((n) => n.kind === kind).map((n) => n.y0);
      for (const kind of ['source', 'category']) {
        const y = ys(kind);
        expect([...y].sort((a, b) => a - b)).toEqual(y);
      }
      for (const n of laid.nodes) {
        expect(n.y0).toBeGreaterThanOrEqual(20 - 1e-6);
        expect(n.y1).toBeLessThanOrEqual(780 + 1e-6);
      }
    });
  }

  it('item mode carries all line items, one flow pair each', () => {
    const g = buildSankeyGraph('item');
    expect(g.nodes.filter((n) => n.kind === 'item')).toHaveLength(budget.lineItemCount);
    expect(g.links).toHaveLength(budget.lineItemCount * 2);
  });
  it('grand total', () => {
    expect(budget.sources.reduce((a, s) => a + s.amountB, 0)).toBeCloseTo(budget.totalB, 6);
    expect(budget.categories.reduce((a, c) => a + c.amountB, 0)).toBeCloseTo(budget.totalB, 6);
    expect(budget.lineItems.reduce((a, l) => a + l.amountM, 0)).toBeCloseTo(TOTAL_M, 6);
  });
});

describe('fiscal years', () => {
  const rows = fiscalYearRows();
  it('per-year line-item sums equal the canon year totals', () => {
    expect(rows.map((r) => r.fy)).toEqual(budget.fiscalYears.map((f) => f.fy));
    for (const r of rows) {
      expect(r.sumM, r.fy).toBeCloseTo(r.totalM, 6);
      expect(Object.values(r.byCategory).reduce((a, v) => a + v, 0)).toBeCloseTo(r.totalM, 6);
    }
  });
  it('per-category sums across years equal the canon category totals', () => {
    for (const c of budget.categories) {
      expect(rows.reduce((a, r) => a + (r.byCategory[c.id] ?? 0), 0), c.id).toBeCloseTo(c.amountB * 1000, 6);
    }
  });
  it('sparkline series sums to the line-item amount', () => {
    for (const l of budget.lineItems) {
      const s = lineItemSeries(l.no);
      expect(s).toHaveLength(budget.fiscalYears.length);
      expect(s?.reduce((a, p) => a + p.amountM, 0)).toBeCloseTo(l.amountM, 6);
    }
    expect(lineItemSeries('LI-999')).toBeNull();
  });
});

describe('formats', () => {
  it('matches the ledger conventions', () => {
    expect(fmtB(142, 1)).toBe('$142.0B');
    expect(fmtB(117.67, 2)).toBe('$117.67B');
    expect(fmtM(412)).toBe('$412M');
    expect(fmtM(4023)).toBe('$4,023M');
    expect(fmtMasB(161523)).toBe('$161.52B');
  });
});
