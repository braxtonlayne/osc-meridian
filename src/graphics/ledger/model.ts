/**
 * @graphics/ledger model: every figure the ledger charts draw, derived from canon.
 *
 * Nothing in this file (or in index.tsx) types a budget figure by hand. Totals,
 * shares and per-year amounts are read from `canon.budget` or summed from its
 * 127 line items. Pure functions, no DOM: unit-tested in ledger.test.ts.
 */
import canonJson from '@canon';
import type { BudgetCategory, Canon, FundingSource, LineItem } from '@core/canon-types';
import { sankey, sankeyJustify, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyLink, SankeyNode } from 'd3-sankey';

export type Budget = Canon['budget'];
export const budget: Budget = (canonJson as unknown as Canon).budget;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const GROUPED = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Billions with fixed decimals: fmtB(142, 1) = "$142.0B", fmtB(117.67, 2) = "$117.67B". */
export function fmtB(amountB: number, digits = 1): string {
  return `$${amountB.toFixed(digits)}B`;
}
/** Millions, grouped, no decimals: fmtM(412) = "$412M", fmtM(4023) = "$4,023M". */
export function fmtM(amountM: number): string {
  return `$${GROUPED.format(Math.round(amountM))}M`;
}
/** Millions expressed as billions: fmtMasB(161523) = "$161.52B". */
export function fmtMasB(amountM: number, digits = 2): string {
  return fmtB(amountM / 1000, digits);
}
export function fmtPct(pct: number, digits = 1): string {
  return `${pct.toFixed(digits)}%`;
}

/* ------------------------------------------------------------------ */
/* Lookups and aggregates                                              */
/* ------------------------------------------------------------------ */

export type GroupMode = 'department' | 'item' | 'none';
export type NodeKind = 'source' | 'department' | 'item' | 'category';
export interface NodeRef {
  kind: NodeKind;
  id: string;
}

export const nodeKey = (kind: NodeKind, id: string): string => `${kind}:${id}`;

export function categoryIndex(id: string, b: Budget = budget): number {
  return b.categories.findIndex((c) => c.id === id);
}
export function sourceIndex(id: string, b: Budget = budget): number {
  return b.sources.findIndex((s) => s.id === id);
}
export function findLineItem(no: string, b: Budget = budget): LineItem | undefined {
  return b.lineItems.find((l) => l.no === no);
}

function sumBy<T>(rows: readonly T[], key: (row: T) => string, value: (row: T) => number): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) out.set(key(row), (out.get(key(row)) ?? 0) + value(row));
  return out;
}

export interface DepartmentTotal {
  id: string;
  amountM: number;
  count: number;
}
/** Line-item totals per cover department, in canon department order. */
export function departmentTotals(b: Budget = budget): DepartmentTotal[] {
  return b.departments.map((id) => {
    const items = b.lineItems.filter((l) => l.department === id);
    return { id, amountM: items.reduce((a, l) => a + l.amountM, 0), count: items.length };
  });
}

export interface FiscalYearRow {
  fy: string;
  /** Canon stated total for the year, millions. */
  totalM: number;
  /** Sum of line-item fy entries for the year, millions (equals totalM; asserted in the unit test). */
  sumM: number;
  /** categoryId -> millions, summed from line-item fy maps. */
  byCategory: Record<string, number>;
}
export function fiscalYearRows(b: Budget = budget): FiscalYearRow[] {
  return b.fiscalYears.map(({ fy, totalM }) => {
    const byCategory: Record<string, number> = {};
    for (const c of b.categories) byCategory[c.id] = 0;
    let sumM = 0;
    for (const l of b.lineItems) {
      const v = l.fy[fy] ?? 0;
      byCategory[l.categoryId] = (byCategory[l.categoryId] ?? 0) + v;
      sumM += v;
    }
    return { fy, totalM, sumM, byCategory };
  });
}

/** One line item's obligations across every canon fiscal year (0 where the item has no entry). */
export function lineItemSeries(no: string, b: Budget = budget): { fy: string; amountM: number }[] | null {
  const item = findLineItem(no, b);
  if (!item) return null;
  return b.fiscalYears.map(({ fy }) => ({ fy, amountM: item.fy[fy] ?? 0 }));
}

/* ------------------------------------------------------------------ */
/* Sankey graph                                                        */
/* ------------------------------------------------------------------ */

export interface LedgerNode {
  key: string;
  kind: NodeKind;
  id: string;
  label: string;
  /** Millions. Sum of the flows through the node. */
  valueM: number;
  /** Cover department (department and item nodes). */
  department?: string;
  /** Number of line items carried by the node. */
  count: number;
  /** Palette slot (canon category order) for item and category nodes. */
  categoryIdx?: number;
}
export interface LedgerLink {
  source: string;
  target: string;
  valueM: number;
  sourceId: string;
  categoryId: string;
  /** Empty when the middle column is omitted (mode 'none'). */
  department: string;
  /** Line-item numbers carried by this flow. */
  items: string[];
  side: 'in' | 'out' | 'direct';
}
export interface LedgerGraph {
  nodes: LedgerNode[];
  links: LedgerLink[];
}

/**
 * Sources -> cover line items -> programme categories.
 * Each flow is one (source, middle node, category) triple, so a selection on
 * any column can be traced exactly through the other two.
 *   mode 'department': one middle node per department, except departments in
 *                      `expanded`, which are shown as their line items;
 *   mode 'item':       all line items;
 *   mode 'none':       no middle column, sources flow straight to categories.
 */
export function buildSankeyGraph(
  mode: GroupMode = 'department',
  expanded: ReadonlySet<string> = new Set(),
  b: Budget = budget,
): LedgerGraph {
  const catIdx = new Map(b.categories.map((c, i) => [c.id, i]));
  const srcIdx = new Map(b.sources.map((s, i) => [s.id, i]));
  const ci = (id: string) => catIdx.get(id) ?? 0;
  const si = (id: string) => srcIdx.get(id) ?? 0;

  const bySource = sumBy(b.lineItems, (l) => l.sourceId, (l) => l.amountM);
  const byCategory = sumBy(b.lineItems, (l) => l.categoryId, (l) => l.amountM);
  const countBy = (pred: (l: LineItem) => boolean) => b.lineItems.filter(pred).length;

  const nodes: LedgerNode[] = [];
  for (const s of b.sources) {
    nodes.push({
      key: nodeKey('source', s.id),
      kind: 'source',
      id: s.id,
      label: s.name,
      valueM: bySource.get(s.id) ?? 0,
      count: countBy((l) => l.sourceId === s.id),
    });
  }

  const middleOf = new Map<string, string>(); // line-item no -> middle node key
  if (mode !== 'none') {
    for (const dep of departmentTotals(b)) {
      const items = b.lineItems
        .filter((l) => l.department === dep.id)
        .sort(
          (x, y) =>
            ci(x.categoryId) - ci(y.categoryId) ||
            si(x.sourceId) - si(y.sourceId) ||
            y.amountM - x.amountM ||
            x.no.localeCompare(y.no),
        );
      if (mode === 'item' || expanded.has(dep.id)) {
        for (const l of items) {
          const key = nodeKey('item', l.no);
          middleOf.set(l.no, key);
          nodes.push({
            key,
            kind: 'item',
            id: l.no,
            label: l.title,
            valueM: l.amountM,
            department: l.department,
            count: 1,
            categoryIdx: ci(l.categoryId),
          });
        }
      } else {
        const key = nodeKey('department', dep.id);
        for (const l of items) middleOf.set(l.no, key);
        nodes.push({
          key,
          kind: 'department',
          id: dep.id,
          label: dep.id,
          valueM: dep.amountM,
          department: dep.id,
          count: dep.count,
        });
      }
    }
  }

  for (const c of b.categories) {
    nodes.push({
      key: nodeKey('category', c.id),
      kind: 'category',
      id: c.id,
      label: c.name,
      valueM: byCategory.get(c.id) ?? 0,
      count: countBy((l) => l.categoryId === c.id),
      categoryIdx: ci(c.id),
    });
  }

  interface Triple {
    middle: string;
    sourceId: string;
    categoryId: string;
    department: string;
    valueM: number;
    items: string[];
  }
  const triples = new Map<string, Triple>();
  for (const l of b.lineItems) {
    const middle = middleOf.get(l.no) ?? '';
    const k = `${l.sourceId}|${middle}|${l.categoryId}`;
    let t = triples.get(k);
    if (!t) {
      t = {
        middle,
        sourceId: l.sourceId,
        categoryId: l.categoryId,
        department: mode === 'none' ? '' : l.department,
        valueM: 0,
        items: [],
      };
      triples.set(k, t);
    }
    t.valueM += l.amountM;
    t.items.push(l.no);
  }

  const links: LedgerLink[] = [];
  for (const t of triples.values()) {
    const base = {
      valueM: t.valueM,
      sourceId: t.sourceId,
      categoryId: t.categoryId,
      department: t.department,
      items: t.items,
    };
    const s = nodeKey('source', t.sourceId);
    const c = nodeKey('category', t.categoryId);
    if (t.middle === '') {
      links.push({ ...base, source: s, target: c, side: 'direct' });
    } else {
      links.push({ ...base, source: s, target: t.middle, side: 'in' });
      links.push({ ...base, source: t.middle, target: c, side: 'out' });
    }
  }
  return { nodes, links };
}

/** Sum of flow values entering and leaving each node, keyed by node key. */
export function nodeFlowTotals(graph: LedgerGraph): Map<string, { inM: number; outM: number }> {
  const out = new Map<string, { inM: number; outM: number }>();
  for (const n of graph.nodes) out.set(n.key, { inM: 0, outM: 0 });
  for (const l of graph.links) {
    const s = out.get(l.source);
    const t = out.get(l.target);
    if (s) s.outM += l.valueM;
    if (t) t.inM += l.valueM;
  }
  return out;
}

/** True when a flow belongs to the trace of `ref` (source, department, item or category). */
export function linkMatches(link: LedgerLink, ref: NodeRef): boolean {
  switch (ref.kind) {
    case 'source':
      return link.sourceId === ref.id;
    case 'category':
      return link.categoryId === ref.id;
    case 'department':
      return link.department === ref.id;
    case 'item':
      return link.items.includes(ref.id);
  }
}

/* ------------------------------------------------------------------ */
/* Sankey layout (d3-sankey, fixed canon order)                        */
/* ------------------------------------------------------------------ */

export interface LaidNode extends LedgerNode {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  /** Value as accumulated by the layout from the flows (millions). */
  layoutValueM: number;
}
export interface LaidLink extends LedgerLink {
  /** Centre-line path; stroke it at `width`. */
  path: string;
  width: number;
  /** Midpoint, for anchoring a tooltip. */
  mx: number;
  my: number;
}
export interface SankeyLayout {
  nodes: LaidNode[];
  links: LaidLink[];
}
export interface Extent {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Link datum handed to d3-sankey: endpoints by node key, plus the sort slots. */
interface FlowDatum {
  ci: number;
  si: number;
}
type DNode = SankeyNode<LedgerNode, FlowDatum>;
type DLink = SankeyLink<LedgerNode, FlowDatum>;

export function layoutSankey(
  graph: LedgerGraph,
  extent: Extent,
  opts: { nodeWidth?: number; nodePadding?: number; maxGap?: number } = {},
  b: Budget = budget,
): SankeyLayout {
  const nodes: DNode[] = graph.nodes.map((n) => ({ ...n }));
  const links: DLink[] = graph.links.map((l) => ({
    source: l.source,
    target: l.target,
    value: l.valueM,
    ci: categoryIndex(l.categoryId, b),
    si: sourceIndex(l.sourceId, b),
  }));
  const idx = (end: DLink['source']): number => (typeof end === 'object' ? (end.index ?? 0) : 0);

  const generator = sankey<LedgerNode, FlowDatum>()
    .nodeId((d) => d.key)
    .nodeAlign(sankeyJustify)
    .nodeSort(null)
    .iterations(0)
    .linkSort(
      (x, y) =>
        idx(x.source) - idx(y.source) ||
        idx(x.target) - idx(y.target) ||
        x.ci - y.ci ||
        x.si - y.si,
    )
    .nodeWidth(opts.nodeWidth ?? 10)
    .nodePadding(opts.nodePadding ?? 8)
    .extent([
      [extent.x0, extent.y0],
      [extent.x1, extent.y1],
    ]);
  const laid = generator({ nodes, links });

  // d3-sankey has fixed the common value scale and stacked each column from the
  // top in canon order. Space every column evenly over the available height
  // (gap capped, column centred), then let d3 re-thread the flows.
  const maxGap = opts.maxGap ?? 28;
  const columns = new Map<number, DNode[]>();
  for (const n of laid.nodes) {
    const col = columns.get(n.x0 ?? 0) ?? [];
    col.push(n);
    columns.set(n.x0 ?? 0, col);
  }
  for (const col of columns.values()) {
    const heights = col.map((n) => (n.y1 ?? 0) - (n.y0 ?? 0));
    const used = heights.reduce((a, v) => a + v, 0);
    const free = Math.max(0, extent.y1 - extent.y0 - used);
    const gap = col.length > 1 ? Math.min(maxGap, free / (col.length - 1)) : 0;
    let y = extent.y0 + (free - gap * (col.length - 1)) / 2;
    col.forEach((n, i) => {
      n.y0 = y;
      n.y1 = y + (heights[i] as number);
      y = n.y1 + gap;
    });
  }
  generator.update(laid);
  const pathOf = sankeyLinkHorizontal<LedgerNode, FlowDatum>();

  return {
    nodes: laid.nodes.map((n, i) => ({
      ...(graph.nodes[i] as LedgerNode),
      x0: n.x0 ?? 0,
      x1: n.x1 ?? 0,
      y0: n.y0 ?? 0,
      y1: n.y1 ?? 0,
      layoutValueM: n.value ?? 0,
    })),
    links: laid.links.map((l, i) => {
      const s = l.source as DNode;
      const t = l.target as DNode;
      return {
        ...(graph.links[i] as LedgerLink),
        path: pathOf(l) ?? '',
        width: l.width ?? 0,
        mx: ((s.x1 ?? 0) + (t.x0 ?? 0)) / 2,
        my: ((l.y0 ?? 0) + (l.y1 ?? 0)) / 2,
      };
    }),
  };
}

export type { BudgetCategory, FundingSource, LineItem };
