/**
 * @graphics/ledger: budget Sankey and ledger charts (asset family 8).
 *
 *   BudgetSankey       funding sources -> cover line items -> programme categories
 *   CategoryBars       programme categories, horizontal bars with amount and share
 *   SourceBars         funding sources, same layout
 *   FiscalYearChart    stacked columns by category for every canon fiscal year
 *   LineItemSparkline  one line item across the fiscal years
 *   CategoryLegend     the five-slot key used by the charts above
 *
 * The register is a 2008 financial-management report printed to PDF: flat
 * fills, hairline rules, small tabular figures. Every number drawn here is read
 * from canon or summed from canon line items in ./model (unit-tested); nothing
 * is typed by hand. Static inline SVG, no animation, colours from tokens only
 * (see ledger.css).
 */
import type { CSSProperties, JSX, SVGAttributes } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { scaleBand, scaleLinear } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import {
  budget,
  buildSankeyGraph,
  categoryIndex,
  departmentTotals,
  findLineItem,
  fiscalYearRows,
  fmtB,
  fmtM,
  fmtMasB,
  fmtPct,
  layoutSankey,
  lineItemSeries,
  linkMatches,
} from './model';
import type { GroupMode, LaidLink, LaidNode, NodeRef } from './model';
import './ledger.css';

export * from './model';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Mean advance of 11px IBM Plex Sans, used only to reserve label gutters. */
const CHAR_W = 5.9;
const LABEL_H = 27;

const px = (n: number): number => Math.round(n);
/** Centre of a 1px crisp line. */
const hair = (n: number): number => Math.round(n) + 0.5;

function clip(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}
function catClass(idx: number | undefined): string {
  return idx === undefined || idx < 0 ? 'lg-cs' : `lg-c${idx % 5}`;
}
function onKeyActivate(run: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      run();
    }
  };
}
/** Push label centres apart so stacked two-line labels never overlap, keeping them inside [lo, hi]. */
function spreadLabels(centres: number[], h: number, lo: number, hi: number): number[] {
  const ys = [...centres];
  for (let i = 0; i < ys.length; i++) {
    const min = i === 0 ? lo + h / 2 : (ys[i - 1] as number) + h;
    if ((ys[i] as number) < min) ys[i] = min;
  }
  for (let i = ys.length - 1; i >= 0; i--) {
    const max = i === ys.length - 1 ? hi - h / 2 : (ys[i + 1] as number) - h;
    if ((ys[i] as number) > max) ys[i] = max;
  }
  return ys;
}
const sameRef = (a: NodeRef | null | undefined, b: NodeRef | null | undefined): boolean =>
  !!a && !!b && a.kind === b.kind && a.id === b.id;

/* ------------------------------------------------------------------ */
/* BudgetSankey                                                        */
/* ------------------------------------------------------------------ */

export interface BudgetSankeyProps {
  width: number;
  height: number;
  /** 'department' (default): one band per cover department, each expandable to its line items. 'item': all line items. 'none': sources straight to categories. */
  groupLineItems?: GroupMode;
  /** Trace one source, department, line item or category through the diagram. */
  highlight?: NodeRef | null;
  onSelect?: (ref: NodeRef) => void;
  /** Departments shown expanded on first render ('department' mode). */
  defaultExpanded?: readonly string[];
}

type Tip = { ref: NodeRef } | { link: number } | null;

export function BudgetSankey({
  width,
  height,
  groupLineItems = 'department',
  highlight = null,
  onSelect,
  defaultExpanded,
}: BudgetSankeyProps): JSX.Element {
  const mode = groupLineItems;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded ?? []));
  const [tip, setTip] = useState<Tip>(null);

  const geo = useMemo(() => {
    const nameChars = (names: string[]) => Math.max(...names.map((n) => n.length));
    const mL = px(Math.min(nameChars(budget.sources.map((s) => s.name)) * CHAR_W + 12, width * 0.3));
    const mR = px(Math.min(Math.max(nameChars(budget.categories.map((c) => c.name)) * CHAR_W + 12, 96), width * 0.26));
    const top = 22;
    const bottom = 5;
    const graph = buildSankeyGraph(mode, expanded);
    const perColumn = Math.max(
      budget.sources.length,
      budget.categories.length,
      graph.nodes.filter((n) => n.kind === 'item' || n.kind === 'department').length,
    );
    const innerH = height - top - bottom;
    const nodePadding = Math.max(1, Math.min(14, Math.floor((innerH * 0.2) / Math.max(1, perColumn - 1))));
    const layout = layoutSankey(
      graph,
      { x0: mL, y0: top, x1: width - mR, y1: height - bottom },
      { nodeWidth: 10, nodePadding },
    );
    return { mL, mR, top, bottom, layout };
  }, [width, height, mode, expanded]);

  const { mL, mR, top, bottom, layout } = geo;
  const { nodes, links } = layout;

  const toggle = (dep: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dep)) next.delete(dep);
      else next.add(dep);
      return next;
    });
  const activate = (ref: NodeRef) => {
    if (ref.kind === 'department' && mode === 'department') {
      setTip(null);
      toggle(ref.id);
    }
    onSelect?.(ref);
  };

  /* ---- trace (hover takes precedence over the highlight prop) ---- */
  const hoverLink = tip && 'link' in tip ? links[tip.link] : undefined;
  const traceRef: NodeRef | null = tip && 'ref' in tip ? tip.ref : hoverLink ? null : highlight;
  const isOn = (l: LaidLink): boolean =>
    hoverLink ? l.items === hoverLink.items : traceRef ? linkMatches(l, traceRef) : false;
  const tracing = !!hoverLink || !!traceRef;
  const onKeys = new Set<string>();
  if (tracing) {
    for (const l of links) {
      if (isOn(l)) {
        onKeys.add(l.source);
        onKeys.add(l.target);
      }
    }
    if (traceRef) onKeys.add(`${traceRef.kind}:${traceRef.id}`);
  }

  /* ---- outer labels ---- */
  const sources = nodes.filter((n) => n.kind === 'source');
  const categories = nodes.filter((n) => n.kind === 'category');
  const mid = (n: LaidNode) => (n.y0 + n.y1) / 2;
  const srcY = spreadLabels(sources.map(mid), LABEL_H, top, height - bottom);
  const catY = spreadLabels(categories.map(mid), LABEL_H, top, height - bottom);
  const srcChars = Math.floor((mL - 10) / CHAR_W);
  const catChars = Math.floor((mR - 10) / CHAR_W);

  /* ---- middle column groups ---- */
  const groups = departmentTotals()
    .map((dep) => {
      const members = nodes.filter((n) => n.department === dep.id && (n.kind === 'item' || n.kind === 'department'));
      const first = members[0];
      const last = members[members.length - 1];
      if (!first || !last) return null;
      return { dep, y0: first.y0, y1: last.y1, x1: first.x1, open: first.kind === 'item' };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const nodeProps = (ref: NodeRef, label: string, extra: SVGAttributes<SVGGElement> = {}): SVGAttributes<SVGGElement> => ({
    role: 'button',
    tabindex: 0,
    'aria-label': label,
    onMouseEnter: () => setTip({ ref }),
    onFocus: () => setTip({ ref }),
    onBlur: () => setTip(null),
    onClick: () => activate(ref),
    onKeyDown: onKeyActivate(() => activate(ref)),
    ...extra,
  });

  const nodeRect = (n: LaidNode) => {
    const y = px(n.y0);
    const h = Math.max(1, px(n.y1) - y);
    return <rect class="lg-node-rect" x={px(n.x0)} y={y} width={px(n.x1) - px(n.x0)} height={h} />;
  };
  const nodeClass = (n: LaidNode, ref: NodeRef) =>
    `lg-node lg-click ${n.kind === 'item' || n.kind === 'category' ? catClass(n.categoryIdx) : 'lg-cs'}` +
    (onKeys.has(n.key) ? ' is-on' : '') +
    (sameRef(highlight, ref) ? ' is-selected' : '');

  /* ---- tooltip ---- */
  let tipBox: JSX.Element | null = null;
  if (tip) {
    let ax = 0;
    let ay = 0;
    let body: JSX.Element | null = null;
    const srcName = (id: string) => budget.sources.find((s) => s.id === id)?.name ?? id;
    const catName = (id: string) => budget.categories.find((c) => c.id === id)?.name ?? id;
    if ('link' in tip && hoverLink) {
      const l = hoverLink;
      ax = l.mx;
      ay = l.my;
      const item = l.items.length === 1 && l.department !== '' && mode !== 'none' ? findLineItem(l.items[0] as string) : undefined;
      const only = item && nodes.some((n) => n.kind === 'item' && n.id === item.no) ? item : undefined;
      body = only ? (
        <ItemTip no={only.no} />
      ) : (
        <>
          <div>
            <b>{fmtMasB(l.valueM)}</b> {'·'} {l.items.length} line item{l.items.length === 1 ? '' : 's'}
          </div>
          <div>
            {srcName(l.sourceId)}
            {l.department ? ` to ${l.department}` : ''} to {catName(l.categoryId)}
          </div>
        </>
      );
    } else if ('ref' in tip) {
      const n = nodes.find((x) => x.kind === tip.ref.kind && x.id === tip.ref.id);
      if (n) {
        ax = n.kind === 'category' ? n.x0 : n.x1;
        ay = mid(n);
        if (n.kind === 'item') body = <ItemTip no={n.id} />;
        else if (n.kind === 'source') {
          const s = budget.sources.find((x) => x.id === n.id);
          body = (
            <>
              <div>
                <b>{n.label}</b>
              </div>
              <div>
                {s ? `${fmtB(s.amountB, 2)} · ${fmtPct(s.pct, 0)} of programme · ` : ''}
                {n.count} line items
              </div>
            </>
          );
        } else if (n.kind === 'category') {
          const c = budget.categories.find((x) => x.id === n.id);
          body = (
            <>
              <div>
                <b>{n.label}</b>
              </div>
              <div>
                {c ? `${fmtB(c.amountB, 1)} · ${fmtPct(c.pct, 1)} of programme · ` : ''}
                {n.count} line items
              </div>
            </>
          );
        } else {
          body = (
            <>
              <div>
                <b>{n.label}</b> cover appropriations
              </div>
              <div>
                {fmtMasB(n.valueM)} {'·'} {n.count} line items
              </div>
            </>
          );
        }
      } else if (tip.ref.kind === 'department') {
        const g = groups.find((x) => x.dep.id === tip.ref.id);
        if (g) {
          ax = g.x1;
          ay = (g.y0 + g.y1) / 2;
          body = (
            <>
              <div>
                <b>{g.dep.id}</b> cover appropriations
              </div>
              <div>
                {fmtMasB(g.dep.amountM)} {'·'} {g.dep.count} line items
              </div>
            </>
          );
        }
      }
    }
    if (body) {
      const leftSide = ax > width * 0.56;
      const style: CSSProperties = {
        top: `${px(Math.max(0, Math.min(ay - 12, height - 64)))}px`,
        ...(leftSide ? { right: `${px(width - ax + 14)}px` } : { left: `${px(ax + 14)}px` }),
        maxWidth: `${px(Math.max(160, Math.min(320, leftSide ? ax - 20 : width - ax - 20)))}px`,
      };
      tipBox = (
        <div class="lg-tip" role="status" style={style}>
          {body}
        </div>
      );
    }
  }

  const midX = (mL + (width - mR)) / 2;
  const midHead =
    mode === 'none'
      ? null
      : mode === 'item'
        ? `COVER LINE ITEMS (${budget.lineItemCount})`
        : `COVER LINE ITEMS BY DEPARTMENT (${budget.lineItemCount})`;

  return (
    <div
      class={`lg lg-sankey${tracing ? ' is-tracing' : ''}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseLeave={() => setTip(null)}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`Programme funding, ${fmtB(budget.totalB, 1)}: ${budget.sources.length} funding sources through ${budget.lineItemCount} cover line items to ${budget.categories.length} programme categories`}
      >
        <text class="lg-head" x={mL + 10} y={11} text-anchor="end">
          FUNDING SOURCE
        </text>
        {midHead && width >= 620 ? (
          <text class="lg-head" x={midX} y={11} text-anchor="middle">
            {midHead}
          </text>
        ) : null}
        <text class="lg-head" x={width - mR - 10} y={11} text-anchor="start">
          PROGRAMME CATEGORY
        </text>
        <line class="lg-grid" x1={0} x2={width} y1={hair(15)} y2={hair(15)} />

        <g>
          {links.map((l, i) => (
            <path
              key={`${l.source}>${l.target}>${l.sourceId}>${l.categoryId}`}
              class={`lg-link ${catClass(categoryIndex(l.categoryId))}${tracing && isOn(l) ? ' is-on' : ''}`}
              d={l.path}
              stroke-width={Math.max(0.75, l.width)}
              onMouseEnter={() => setTip({ link: i })}
              onClick={() => {
                if (l.items.length === 1) onSelect?.({ kind: 'item', id: l.items[0] as string });
              }}
            />
          ))}
        </g>

        {sources.map((n, i) => {
          const ref: NodeRef = { kind: 'source', id: n.id };
          const s = budget.sources.find((x) => x.id === n.id);
          const amount = s ? `${fmtB(s.amountB, 2)}  ${fmtPct(s.pct, 0)}` : fmtMasB(n.valueM);
          const y = srcY[i] as number;
          return (
            <g key={n.key} class={nodeClass(n, ref)} {...nodeProps(ref, `${n.label}, ${amount}`)}>
              {nodeRect(n)}
              <text class="lg-medium" x={n.x0 - 6} y={px(y) - 2} text-anchor="end">
                {clip(n.label, srcChars)}
              </text>
              <text class="lg-t2" x={n.x0 - 6} y={px(y) + 11} text-anchor="end" style={{ whiteSpace: 'pre' }}>
                {amount}
              </text>
            </g>
          );
        })}

        {categories.map((n, i) => {
          const ref: NodeRef = { kind: 'category', id: n.id };
          const c = budget.categories.find((x) => x.id === n.id);
          const amount = c ? `${fmtB(c.amountB, 1)}  ${fmtPct(c.pct, 1)}` : fmtMasB(n.valueM);
          const y = catY[i] as number;
          return (
            <g key={n.key} class={nodeClass(n, ref)} {...nodeProps(ref, `${n.label}, ${amount}`)}>
              {nodeRect(n)}
              <text class="lg-medium" x={n.x1 + 6} y={px(y) - 2}>
                {clip(n.label, catChars)}
              </text>
              <text class="lg-t2" x={n.x1 + 6} y={px(y) + 11} style={{ whiteSpace: 'pre' }}>
                {amount}
              </text>
            </g>
          );
        })}

        {nodes
          .filter((n) => n.kind === 'item')
          .map((n) => {
            const ref: NodeRef = { kind: 'item', id: n.id };
            return (
              <g key={n.key} class={nodeClass(n, ref)} {...nodeProps(ref, `${n.id}, ${n.label}, ${fmtM(n.valueM)}`)}>
                {nodeRect(n)}
              </g>
            );
          })}

        {groups.map((g) => {
          const ref: NodeRef = { kind: 'department', id: g.dep.id };
          const node = nodes.find((n) => n.kind === 'department' && n.id === g.dep.id);
          const yc = px((g.y0 + g.y1) / 2);
          const canToggle = mode === 'department';
          const lx = px(g.x1) + (g.open ? 11 : 6);
          const tx = lx + (canToggle ? 14 : 0);
          const label = `${g.dep.id}, ${fmtMasB(g.dep.amountM)}, ${g.dep.count} line items`;
          const selected = sameRef(highlight, ref);
          return (
            <g
              key={`dept:${g.dep.id}`}
              class={
                `lg-node lg-click lg-cs` +
                (node && onKeys.has(node.key) ? ' is-on' : '') +
                (!node && traceRef && sameRef(traceRef, ref) ? ' is-on' : '') +
                (selected ? ' is-selected' : '')
              }
              {...nodeProps(ref, label, canToggle ? { 'aria-expanded': g.open } : {})}
            >
              {node ? nodeRect(node) : null}
              {g.open ? (
                <path
                  class="lg-bracket"
                  d={`M${px(g.x1) + 2.5},${hair(g.y0)}H${px(g.x1) + 5.5}V${hair(g.y1) - 1}H${px(g.x1) + 2.5}`}
                />
              ) : null}
              {canToggle ? (
                <g class="lg-expander">
                  <rect x={lx + 0.5} y={yc - 4.5} width={8} height={8} />
                  <path d={g.open ? `M${lx + 2},${yc - 0.5}h5` : `M${lx + 2},${yc - 0.5}h5M${lx + 4.5},${yc - 3}v5`} />
                </g>
              ) : null}
              <text class="lg-halo" x={tx} y={yc + 3.5}>
                <tspan class="lg-strong">
                  {g.dep.id}
                </tspan>
                <tspan dx={6}>{fmtMasB(g.dep.amountM)}</tspan>
                {width >= 700 ? (
                  <tspan dx={6} class="lg-t2">
                    {g.dep.count} items
                  </tspan>
                ) : null}
              </text>
            </g>
          );
        })}
      </svg>
      {tipBox}
    </div>
  );
}

function ItemTip({ no }: { no: string }): JSX.Element | null {
  const item = findLineItem(no);
  if (!item) return null;
  const src = budget.sources.find((s) => s.id === item.sourceId)?.name ?? item.sourceId;
  const cat = budget.categories.find((c) => c.id === item.categoryId)?.name ?? item.categoryId;
  return (
    <>
      <div class="lg-tip-id">
        {item.no} {'·'} {item.department} {'·'} ACCT {item.account}
      </div>
      <div>
        <b>{item.title}</b>
      </div>
      <div>
        {fmtM(item.amountM)} {'·'} {src} to {cat}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars (categories, sources)                               */
/* ------------------------------------------------------------------ */

export interface LedgerBarsProps {
  width: number;
  /** Omit for the natural height (20px rows). */
  height?: number;
  /** Id of the row to mark as selected. */
  highlight?: string | null;
  onSelect?: (id: string) => void;
}

interface BarRow {
  id: string;
  name: string;
  amountB: number;
  pct: number;
  cls: string;
}

function HBars({
  rows,
  heading,
  label,
  amountDigits,
  pctDigits,
  width,
  height,
  highlight,
  onSelect,
}: LedgerBarsProps & { rows: BarRow[]; heading: string; label: string; amountDigits: number; pctDigits: number }): JSX.Element {
  const headH = 18;
  const axisH = 15;
  const totalH = 20;
  const n = rows.length;
  const rowH = height ? Math.max(14, Math.floor((height - headH - axisH - totalH) / n)) : 20;
  const h = height ?? headH + n * rowH + axisH + totalH;
  const barH = Math.max(8, Math.min(14, rowH - 8));

  const amountW = 66;
  const pctW = 48;
  const labelW = px(Math.min(Math.max(...rows.map((r) => r.name.length)) * CHAR_W + 12, width * 0.4));
  const chars = Math.floor((labelW - 8) / CHAR_W);
  const bx0 = labelW;
  const bx1 = Math.max(bx0 + 24, width - amountW - pctW - 10);
  const maxB = Math.max(...rows.map((r) => r.amountB));
  const barW = bx1 - bx0;
  const tickCount = barW > 260 ? 6 : 3;
  const x = scaleLinear().domain([0, maxB]).nice(tickCount).range([bx0, bx1]);
  /* A narrow plot keeps only the two ends of the scale. */
  const ticks = barW > 130 ? x.ticks(tickCount) : x.domain();
  const lastTick = ticks[ticks.length - 1];
  const y0 = headH;
  const yEnd = y0 + n * rowH;
  const pctSum = rows.reduce((a, r) => a + r.pct, 0);

  return (
    <div class="lg lg-bars" style={{ width: `${width}px` }}>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="group" aria-label={`${label}: ${rows.map((r) => `${r.name} ${fmtB(r.amountB, amountDigits)}, ${fmtPct(r.pct, pctDigits)}`).join('; ')}`}>
        <text class="lg-head" x={0} y={11}>
          {heading}
        </text>
        <text class="lg-head" x={width - pctW} y={11} text-anchor="end">
          AMOUNT
        </text>
        <text class="lg-head" x={width} y={11} text-anchor="end">
          SHARE
        </text>
        <line class="lg-axis" x1={0} x2={width} y1={hair(headH - 3)} y2={hair(headH - 3)} />

        {ticks.map((t) => (
          <g key={t}>
            <line class={t === 0 ? 'lg-axis' : 'lg-grid'} x1={hair(x(t))} x2={hair(x(t))} y1={y0} y2={yEnd + 3} />
            {barW >= 76 ? (
              <text class="lg-tick" x={hair(x(t))} y={yEnd + 13} text-anchor={t === 0 ? 'start' : barW <= 130 && t === lastTick ? 'end' : 'middle'}>
                {fmtB(t, 0)}
              </text>
            ) : null}
          </g>
        ))}

        {rows.map((r, i) => {
          const y = y0 + i * rowH;
          const selected = highlight === r.id;
          const interactive: SVGAttributes<SVGGElement> = onSelect
            ? {
                role: 'button',
                tabindex: 0,
                class: 'lg-click',
                onClick: () => onSelect(r.id),
                onKeyDown: onKeyActivate(() => onSelect(r.id)),
              }
            : {};
          return (
            <g key={r.id} {...interactive} aria-label={`${r.name}, ${fmtB(r.amountB, amountDigits)}, ${fmtPct(r.pct, pctDigits)}`}>
              <title>{`${r.name}: ${fmtB(r.amountB, amountDigits)} (${fmtPct(r.pct, pctDigits)})`}</title>
              <rect class={`lg-rowbg${selected ? ' is-selected' : ''}`} x={0} y={y} width={width} height={rowH} />
              <rect class="lg-hit lg-focus" x={0.5} y={y + 0.5} width={width - 1} height={rowH - 1} />
              <text class={selected ? 'lg-strong' : undefined} x={0} y={y + rowH / 2 + 4}>
                {clip(r.name, chars)}
              </text>
              <rect
                class={`lg-fill lg-crisp ${r.cls}`}
                x={px(bx0) + 1}
                y={px(y + (rowH - barH) / 2)}
                width={Math.max(1, px(x(r.amountB)) - px(bx0) - 1)}
                height={barH}
              />
              <text class={selected ? 'lg-strong' : undefined} x={width - pctW} y={y + rowH / 2 + 4} text-anchor="end">
                {fmtB(r.amountB, amountDigits)}
              </text>
              <text class="lg-t2" x={width} y={y + rowH / 2 + 4} text-anchor="end">
                {fmtPct(r.pct, pctDigits)}
              </text>
            </g>
          );
        })}

        <line class="lg-rule-strong" x1={0} x2={width} y1={hair(yEnd + axisH)} y2={hair(yEnd + axisH)} />
        <text class="lg-strong" x={0} y={yEnd + axisH + 14}>
          Total programme
        </text>
        <text class="lg-strong" x={width - pctW} y={yEnd + axisH + 14} text-anchor="end">
          {fmtB(budget.totalB, amountDigits)}
        </text>
        <text class="lg-t2" x={width} y={yEnd + axisH + 14} text-anchor="end">
          {fmtPct(pctSum, pctDigits)}
        </text>
      </svg>
    </div>
  );
}

/** Programme categories: horizontal bars with amount ($B) and share of programme. */
export function CategoryBars(props: LedgerBarsProps): JSX.Element {
  const rows = budget.categories.map((c, i) => ({ id: c.id, name: c.name, amountB: c.amountB, pct: c.pct, cls: catClass(i) }));
  return <HBars {...props} rows={rows} heading="PROGRAMME CATEGORY" label="Programme cost by category" amountDigits={1} pctDigits={1} />;
}

/** Funding sources: horizontal bars with amount ($B) and share of programme. */
export function SourceBars(props: LedgerBarsProps): JSX.Element {
  const rows = budget.sources.map((s) => ({ id: s.id, name: s.name, amountB: s.amountB, pct: s.pct, cls: 'lg-cs' }));
  return <HBars {...props} rows={rows} heading="FUNDING SOURCE" label="Programme cost by funding source" amountDigits={2} pctDigits={0} />;
}

/* ------------------------------------------------------------------ */
/* Legend                                                              */
/* ------------------------------------------------------------------ */

/** Key for the five category fills. Wraps to as many rows as the width needs. */
export function CategoryLegend({ width, highlight = null }: { width: number; highlight?: string | null }): JSX.Element {
  const { rows, cellW, perRow } = legendGeometry(width);
  return (
    <div class="lg lg-legend" style={{ width: `${width}px` }}>
      <svg width={width} height={rows * 14} viewBox={`0 0 ${width} ${rows * 14}`} role="img" aria-label={`Key: ${budget.categories.map((c) => c.name).join(', ')}`}>
        <LegendItems x={0} y={0} cellW={cellW} perRow={perRow} highlight={highlight} />
      </svg>
    </div>
  );
}
function legendGeometry(width: number) {
  const cellW = px(Math.max(...budget.categories.map((c) => c.name.length)) * CHAR_W + 26);
  const perRow = Math.max(1, Math.min(budget.categories.length, Math.floor(width / cellW)));
  return { cellW, perRow, rows: Math.ceil(budget.categories.length / perRow) };
}
function LegendItems({ x, y, cellW, perRow, highlight }: { x: number; y: number; cellW: number; perRow: number; highlight: string | null }): JSX.Element {
  return (
    <g>
      {budget.categories.map((c, i) => {
        const cx = x + (i % perRow) * cellW;
        const cy = y + Math.floor(i / perRow) * 14;
        return (
          <g key={c.id}>
            <rect class={`lg-fill lg-key ${catClass(i)}`} x={cx} y={cy + 2} width={10} height={10} />
            <text class={highlight === c.id ? 'lg-strong' : 'lg-t2'} x={cx + 15} y={cy + 11}>
              {c.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* FiscalYearChart                                                     */
/* ------------------------------------------------------------------ */

export interface FiscalYearChartProps {
  width: number;
  height: number;
  /** Category id to emphasise; the other series are drawn at reduced strength. */
  highlight?: string | null;
  onSelect?: (fy: string) => void;
  /** Draw the category key above the plot (default true). */
  legend?: boolean;
}

/** Obligations by fiscal year, stacked by programme category (summed from line-item fy maps). Axis in $B. */
export function FiscalYearChart({ width, height, highlight = null, onSelect, legend = true }: FiscalYearChartProps): JSX.Element {
  const rows = useMemo(() => fiscalYearRows(), []);
  const mL = 40;
  const mR = 4;
  const lg = legendGeometry(width - mL - mR);
  const legendH = legend ? lg.rows * 14 + 8 : 0;
  const top = legendH + 16;
  const bottom = 20;
  const maxM = Math.max(...rows.map((r) => r.totalM));
  const y = scaleLinear()
    .domain([0, maxM / 1000])
    .nice(5)
    .range([height - bottom, top]);
  const ticks = y.ticks(height - top - bottom > 150 ? 6 : 3);
  const x = scaleBand<string>()
    .domain(rows.map((r) => r.fy))
    .range([mL, width - mR])
    .paddingInner(0.38)
    .paddingOuter(0.3);
  const bw = Math.max(2, px(x.bandwidth()));
  const step = x.step();
  const first = rows[0]?.fy ?? '';
  const last = rows[rows.length - 1]?.fy ?? '';

  return (
    <div class="lg lg-fy" style={{ width: `${width}px`, height: `${height}px` }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`Obligations by fiscal year, ${first} to ${last}, by programme category: ${rows.map((r) => `${r.fy} ${fmtMasB(r.totalM, 1)}`).join('; ')}`}
      >
        {legend ? <LegendItems x={mL} y={0} cellW={lg.cellW} perRow={lg.perRow} highlight={highlight} /> : null}
        {ticks.map((t) => (
          <g key={t}>
            <line class={t === 0 ? 'lg-axis' : 'lg-grid'} x1={mL} x2={width - mR} y1={hair(y(t))} y2={hair(y(t))} />
            <text class="lg-tick" x={mL - 6} y={hair(y(t)) + 3.5} text-anchor="end">
              {fmtB(t, 0)}
            </text>
          </g>
        ))}
        <line class="lg-axis" x1={hair(mL)} x2={hair(mL)} y1={top} y2={height - bottom} />

        {rows.map((r) => {
          const bx = px(x(r.fy) ?? 0);
          let accM = 0;
          const interactive: SVGAttributes<SVGGElement> = onSelect
            ? {
                role: 'button',
                tabindex: 0,
                class: 'lg-click',
                onClick: () => onSelect(r.fy),
                onKeyDown: onKeyActivate(() => onSelect(r.fy)),
              }
            : {};
          const topY = px(y(r.totalM / 1000));
          return (
            <g key={r.fy} {...interactive} aria-label={`${r.fy}, ${fmtMasB(r.totalM, 1)}`}>
              <rect class="lg-hit lg-focus" x={px(bx - (step - bw) / 2) + 0.5} y={top + 0.5} width={px(step) - 1} height={height - top - 1} />
              {budget.categories.map((c, i) => {
                const vM = r.byCategory[c.id] ?? 0;
                const yBot = px(y(accM / 1000));
                accM += vM;
                const yTop = px(y(accM / 1000));
                const hSeg = yBot - yTop;
                if (hSeg <= 0) return null;
                return (
                  <rect
                    key={c.id}
                    class={`lg-fill lg-crisp ${catClass(i)}${highlight && highlight !== c.id ? ' lg-dim' : ''}`}
                    x={bx}
                    y={yTop}
                    width={bw}
                    height={hSeg}
                  >
                    <title>{`${r.fy} · ${c.name}: ${fmtMasB(vM, 2)}`}</title>
                  </rect>
                );
              })}
              {step >= 40 ? (
                <text class="lg-tick" x={bx + bw / 2} y={topY - 4} text-anchor="middle">
                  {fmtMasB(r.totalM, 1)}
                </text>
              ) : null}
              <text class="lg-tick" x={bx + bw / 2} y={height - bottom + 13} text-anchor="middle">
                {step >= 46 ? r.fy : step >= 30 ? `FY${r.fy.slice(-2)}` : r.fy.slice(-2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LineItemSparkline                                                   */
/* ------------------------------------------------------------------ */

export interface LineItemSparklineProps {
  /** Line-item number, "LI-001" .. "LI-127". */
  no: string;
  width?: number;
  height?: number;
}

/** One line item's obligations across the canon fiscal years, for a register row. Renders nothing for an unknown number. */
export function LineItemSparkline({ no, width = 88, height = 18 }: LineItemSparklineProps): JSX.Element | null {
  const series = lineItemSeries(no);
  if (!series || series.length === 0) return null;
  const maxM = Math.max(...series.map((p) => p.amountM));
  const peak = series.reduce((a, p) => (p.amountM > a.amountM ? p : a), series[0] as (typeof series)[number]);
  const x = scaleLinear()
    .domain([0, Math.max(1, series.length - 1)])
    .range([2, width - 3]);
  const y = scaleLinear()
    .domain([0, maxM || 1])
    .range([height - 2.5, 3]);
  const path = d3line<(typeof series)[number]>()
    .x((_, i) => x(i))
    .y((p) => y(p.amountM))(series);
  const pi = series.indexOf(peak);
  const first = series[0]?.fy ?? '';
  const last = series[series.length - 1]?.fy ?? '';
  const label = `${no} ${first}–${last}: peak ${peak.fy} ${fmtM(peak.amountM)}`;
  return (
    <span class="lg lg-spark" style={{ width: `${width}px`, height: `${height}px` }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <title>{label}</title>
        <line class="lg-spark-base" x1={0} x2={width} y1={height - 1.5} y2={height - 1.5} />
        <path class="lg-spark-line" d={path ?? ''} />
        <rect class="lg-spark-peak" x={px(x(pi)) - 1} y={px(y(peak.amountM)) - 1} width={3} height={3} />
      </svg>
    </span>
  );
}
