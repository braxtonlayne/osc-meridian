/**
 * Rendered check for @graphics/ledger. Dev-only: not imported by the application.
 * Query string selects the view so check/render.mjs can snapshot each state:
 *   ?view=sankey&mode=department|item|none&expanded=DOE,DHS&hl=source:BLACK
 *   ?view=charts&cat=TRANSIT
 * The page fills the viewport; charts take their size from it.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '@design/fonts';
import '@design/base.css';
import '@design/tokens.css';
import { BudgetSankey, CategoryBars, FiscalYearChart, LineItemSparkline, SourceBars, budget, fmtM } from './index';
import type { GroupMode, NodeKind, NodeRef } from './index';
import './check/preview.css';

const q = new URLSearchParams(location.search);
const W = window.innerWidth;
const H = window.innerHeight;

function parseRef(text: string | null): NodeRef | null {
  if (!text) return null;
  const [kind, id] = text.split(':');
  return kind && id ? { kind: kind as NodeKind, id } : null;
}

function SankeyView() {
  const [hl, setHl] = useState<NodeRef | null>(parseRef(q.get('hl')));
  return (
    <div class="pv-sankey">
      <BudgetSankey
        width={W - 24}
        height={H - 24}
        groupLineItems={(q.get('mode') ?? 'department') as GroupMode}
        defaultExpanded={(q.get('expanded') ?? '').split(',').filter(Boolean)}
        highlight={hl}
        onSelect={(ref) => setHl((cur) => (cur && cur.kind === ref.kind && cur.id === ref.id ? null : ref))}
      />
    </div>
  );
}

function ChartsView() {
  const [cat, setCat] = useState<string | null>(q.get('cat'));
  const [src, setSrc] = useState<string | null>(null);
  const pad = 12;
  const gap = 24;
  const colW = Math.floor((W - pad * 2 - gap) / 2);
  const topH = 160;
  const fyH = H - 360;
  const sample = budget.lineItems.slice(0, Math.max(3, Math.floor((fyH - 22) / 23)));
  const wA = Math.floor(colW * 0.6);
  const wB = Math.floor(colW * 0.7);
  return (
    <div class="pv-charts" style={{ padding: `${pad}px` }}>
      <div class="pv-row" style={{ gap: `${gap}px`, height: `${topH}px` }}>
        <CategoryBars width={colW} highlight={cat} onSelect={(id) => setCat((c) => (c === id ? null : id))} />
        <SourceBars width={colW} highlight={src} onSelect={(id) => setSrc((c) => (c === id ? null : id))} />
      </div>
      <div class="pv-row" style={{ gap: `${gap}px` }}>
        <FiscalYearChart width={colW} height={fyH} highlight={cat} />
        <table class="pv-table" style={{ width: `${colW}px` }}>
          <thead>
            <tr>
              <th>No.</th>
              <th>Title</th>
              <th class="num">Amount</th>
              <th>
                {budget.fiscalYears[0]?.fy}&ndash;{budget.fiscalYears[budget.fiscalYears.length - 1]?.fy}
              </th>
            </tr>
          </thead>
          <tbody>
            {sample.map((l) => (
              <tr key={l.no}>
                <td class="mono">{l.no}</td>
                <td class="title">{l.title}</td>
                <td class="num">{fmtM(l.amountM)}</td>
                <td>
                  <LineItemSparkline no={l.no} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="pv-row" style={{ gap: `${gap}px`, marginTop: '10px' }}>
        <FiscalYearChart width={wA} height={120} legend={false} />
        <CategoryBars width={wB} height={120} />
        <SourceBars width={W - pad * 2 - gap * 2 - wA - wB} height={120} />
      </div>
    </div>
  );
}

const app = document.getElementById('app');
if (app) render(q.get('view') === 'charts' ? <ChartsView /> : <SankeyView />, app);
