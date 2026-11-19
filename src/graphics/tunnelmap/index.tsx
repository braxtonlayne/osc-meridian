/*
 * @graphics/tunnelmap: geographic tunnel map with certified and engineering layers
 * (asset family 5). An engineering GIS export of 2008: flat, pale, exact.
 *
 *   <TunnelMap width={1400} height={860} layer="engineering" />
 *
 * See README.md. Every figure is read from canon.
 */
import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import './tunnelmap.css';
import {
  allLinkGeometry,
  buildBase,
  overlaps,
  placeLabels,
  projectFacility,
  type Box,
  type LinkGeometry,
  type Pt,
  type Rect,
} from './geometry';
import {
  canon,
  facility,
  formatMiles,
  linkedFacilityIds,
  tunnelLinks,
  type LinkId,
  type TunnelLink,
} from './links';
import { CERTIFIED, CERTIFIED_ROUTE_MILEAGE, certifiedLinks, certifiedRationale, isCertified } from './certified';

export type TunnelLayer = 'certified' | 'engineering' | 'both';

export interface TunnelMapProps {
  width: number;
  height: number;
  layer: TunnelLayer;
  /** A link id (`RAIL-04`, `TRAM-BETA-02:GAMMA-03`) or a facility id (all its links). */
  highlight?: string | null;
  /** Called with the link clicked (or activated from the keyboard); null for the sheet. */
  onSelect?: (id: LinkId | null) => void;
}

export { tunnelLinks, linkOf, straightLineMiles, EARTH_RADIUS_MI } from './links';
export type { LinkId, TunnelLink } from './links';
export { CERTIFIED, certifiedLinks, certifiedSumMi, isCertified, CERTIFIED_ROUTE_MILEAGE } from './certified';
export type { CertifiedEntry } from './certified';
export { tunnelProjection } from './geometry';

// ---- Drawing register: one sheet per layer ---------------------------------------------

interface Sheet {
  title: string;
  division: string; // canon division id
  drawingNo: string;
  revision: string;
  drawn: string;
  checked: string;
  date: string;
  source: string;
}

const SHEETS: Record<TunnelLayer, Sheet> = {
  engineering: {
    title: 'TUNNEL NETWORK: ENGINEERING ROUTES',
    division: 'FE',
    drawingNo: 'OSC-TRN-MAP-ENG',
    revision: 'D',
    drawn: 'OG',
    checked: 'IL',
    date: '06 MAY 2008',
    source: 'OSC-TRN-ENG',
  },
  certified: {
    title: 'TUNNEL NETWORK: CERTIFIED ROUTES',
    division: 'TO',
    drawingNo: 'OSC-TRN-MAP-CRT',
    revision: 'A',
    drawn: 'CA',
    checked: 'DH',
    date: '02 MAY 2008',
    source: 'MILEAGE RETURN',
  },
  both: {
    title: 'TUNNEL NETWORK: CERTIFIED AND ENGINEERING',
    division: 'CMP',
    drawingNo: 'OSC-TRN-MAP-REC',
    revision: 'P1',
    drawn: 'PR',
    checked: '',
    date: '21 MAY 2008',
    source: 'OSC-MEM-07-0944',
  },
};

const railMi = canon.headline.railEngineeringMi;
const tramMi = canon.headline.tramEngineeringMi;
const engineeringMi = railMi + tramMi;
const railCount = canon.railSegments.length;
const tramCount = tunnelLinks.length - railCount;

function divisionName(id: string): string {
  const d = canon.divisions.find((x) => x.id === id);
  return d ? `${d.name.toUpperCase()} (${d.id})` : id;
}

// ---- Layout ----------------------------------------------------------------------------

const BAND = 16; // frame band carrying the graticule ticks
const OUTER = 6;
const TB_W = 320;
const TB_H = 134;
const LG_W = 304;

interface Layout {
  frame: Box;
  mapBox: Box;
  unit: number;
  tb: Rect;
}

function layoutFor(width: number, height: number): Layout {
  const inset = OUTER + BAND;
  const frame: Box = { x0: inset, y0: inset, x1: width - inset, y1: height - inset };
  const unit = Math.max(0.55, Math.min(1, width / 1100));
  const tbW = TB_W * unit;
  const tbH = TB_H * unit;
  const mapBox: Box = {
    x0: frame.x0 + 14,
    y0: frame.y0 + 12,
    x1: frame.x1 - 14 - tbW * 0.6,
    y1: frame.y1 - 12,
  };
  return { frame, mapBox, unit, tb: { x: frame.x1 - tbW, y: frame.y1 - tbH, w: tbW, h: tbH } };
}

// ---- Legend ----------------------------------------------------------------------------

type SampleKind = 'rail' | 'rail-nrs' | 'tram' | 'cert' | 'alpha' | 'beta' | 'gamma' | 'unlinked';

interface LegendSpec {
  samples: { kind: SampleKind; text: string }[];
  rows: { key: string; value: string; total?: boolean }[];
  notes: string[];
}

function legendFor(layer: TunnelLayer, compact: boolean): LegendSpec {
  const full = legendSpec(layer);
  // Below 1100 px wide the key alone is kept; the mileage stays in the title block.
  return compact ? { samples: full.samples, rows: [], notes: [] } : full;
}

function legendSpec(layer: TunnelLayer): LegendSpec {
  const eng: LegendSpec['samples'] = [
    { kind: 'rail', text: 'Inter-hub rail segment, in revenue service' },
    { kind: 'rail-nrs', text: 'Inter-hub rail segment, not in revenue service' },
    { kind: 'tram', text: 'Tram link' },
  ];
  const cert: LegendSpec['samples'] = [{ kind: 'cert', text: 'Certified route (figure = stated miles)' }];
  const sites: LegendSpec['samples'] = [
    { kind: 'alpha', text: 'ALPHA site' },
    { kind: 'beta', text: 'BETA site' },
    { kind: 'gamma', text: 'GAMMA site' },
  ];
  const projection = 'Albers equal-area conic, standard parallels 29.5N and 45.5N. Graticule 5 degrees.';
  const positions = 'Site positions computed from anchor distance and bearing. Not for survey.';
  if (layer === 'certified') {
    return {
      samples: [...cert, ...sites],
      rows: [
        ...certifiedLinks().map((l) => ({ key: `${l.a} to ${l.b}`, value: formatMiles(l.miles) })),
        { key: 'CERTIFIED ROUTE MILEAGE', value: formatMiles(CERTIFIED_ROUTE_MILEAGE), total: true },
      ],
      notes: ['Routes as carried on the certified mileage return.', projection, positions],
    };
  }
  const engRows: LegendSpec['rows'] = [
    { key: `INTER-HUB RAIL (${railCount} SEGMENTS)`, value: `${formatMiles(railMi)} MI` },
    { key: `TRAM (${tramCount} LINKS)`, value: `${formatMiles(tramMi)} MI` },
    { key: 'ENGINEERING TOTAL', value: `${formatMiles(engineeringMi)} MI`, total: true },
  ];
  if (layer === 'engineering') {
    return {
      samples: [...eng, ...sites, { kind: 'unlinked', text: 'GAMMA site, no link listed' }],
      rows: engRows,
      notes: ['Mileage as stated in the segment and network tables.', projection, positions],
    };
  }
  return {
    samples: [...cert, ...eng, ...sites, { kind: 'unlinked', text: 'GAMMA site, no link listed' }],
    rows: [
      { key: `CERTIFIED (${CERTIFIED.length} LINKS)`, value: `${formatMiles(CERTIFIED_ROUTE_MILEAGE)} MI`, total: true },
      ...engRows,
    ],
    notes: [
      'Certified mileage is not derived from, and not reconciled with,',
      'engineering mileage.',
      projection,
      positions,
    ],
  };
}

const LG_ROW = 14;
const LG_PAD = 8;

function legendHeight(spec: LegendSpec): number {
  const key = 20 + spec.samples.length * LG_ROW + 4;
  if (spec.rows.length === 0 && spec.notes.length === 0) return key;
  return key + 4 + spec.rows.length * 12 + 8 + spec.notes.length * 10 + 4;
}

function Sample({ kind, y }: { kind: SampleKind; y: number }): JSX.Element {
  const x0 = LG_PAD;
  const x1 = LG_PAD + 34;
  const cx = (x0 + x1) / 2;
  switch (kind) {
    case 'rail':
      return <line class="tm-rail" x1={x0} y1={y} x2={x1} y2={y} />;
    case 'rail-nrs':
      return <line class="tm-rail tm-rail--nrs" x1={x0} y1={y} x2={x1} y2={y} />;
    case 'tram':
      return <line class="tm-tram" x1={x0} y1={y} x2={x1} y2={y} />;
    case 'cert':
      return <line class="tm-cert" x1={x0} y1={y} x2={x1} y2={y} />;
    case 'alpha':
      return <rect class="tm-site-alpha" x={cx - 4.5} y={y - 4.5} width={9} height={9} />;
    case 'beta':
      return <circle class="tm-site-beta" cx={cx} cy={y} r={3.6} />;
    case 'gamma':
      return <circle class="tm-site-gamma" cx={cx} cy={y} r={3} />;
    case 'unlinked':
      return <circle class="tm-site-unlinked" cx={cx} cy={y} r={3} />;
  }
}

function Legend({ spec, x, y, unit }: { spec: LegendSpec; x: number; y: number; unit: number }): JSX.Element {
  const h = legendHeight(spec);
  let cy = 20;
  const samples = spec.samples.map((s) => {
    cy += LG_ROW;
    const yy = cy - LG_ROW / 2;
    return (
      <g key={s.kind}>
        <Sample kind={s.kind} y={yy} />
        <text class="tm-legend-text" x={LG_PAD + 44} y={yy + 3.5}>
          {s.text}
        </text>
      </g>
    );
  });
  const ruleY = cy + 4;
  cy += 8;
  const rows = spec.rows.map((r) => {
    cy += 12;
    return (
      <g key={r.key}>
        {r.total && spec.rows.length > 1 && spec.rows.indexOf(r) > 0 ? (
          <line class="tm-rule tm-rule--light" x1={LG_PAD} y1={cy - 10.5} x2={LG_W - LG_PAD} y2={cy - 10.5} />
        ) : null}
        <text class={`tm-legend-key${r.total ? ' tm-legend-total' : ''}`} x={LG_PAD} y={cy - 2}>
          {r.key}
        </text>
        <text class={`tm-legend-val${r.total ? ' tm-legend-total' : ''}`} x={LG_W - LG_PAD} y={cy - 2}>
          {r.value}
        </text>
      </g>
    );
  });
  const rule2Y = cy + 4;
  cy += 8;
  const notes = spec.notes.map((n, i) => {
    cy += 10;
    return (
      <text key={i} class="tm-note" x={LG_PAD} y={cy - 2}>
        {n}
      </text>
    );
  });
  return (
    <g transform={`translate(${x},${y - h * unit}) scale(${unit})`}>
      <rect class="tm-panel" x={0} y={0} width={LG_W} height={h} />
      <text class="tm-cap" x={LG_PAD} y={13}>
        LEGEND
      </text>
      <line class="tm-rule" x1={0} y1={20} x2={LG_W} y2={20} />
      {samples}
      {rows.length > 0 ? <line class="tm-rule tm-rule--light" x1={LG_PAD} y1={ruleY} x2={LG_W - LG_PAD} y2={ruleY} /> : null}
      {rows}
      {notes.length > 0 ? <line class="tm-rule tm-rule--light" x1={LG_PAD} y1={rule2Y} x2={LG_W - LG_PAD} y2={rule2Y} /> : null}
      {notes}
    </g>
  );
}

// ---- Title block -----------------------------------------------------------------------

function Cell(props: { x: number; y: number; w: number; label: string; value: string; last?: boolean }): JSX.Element {
  return (
    <g>
      <text class="tm-tb-label" x={props.x + 4} y={props.y + 8}>
        {props.label}
      </text>
      <text class="tm-tb-value" x={props.x + 4} y={props.y + 20}>
        {props.value}
      </text>
      {props.last ? null : <line class="tm-rule" x1={props.x + props.w} y1={props.y} x2={props.x + props.w} y2={props.y + 25} />}
    </g>
  );
}

function TitleBlock({ layer, rect, unit }: { layer: TunnelLayer; rect: Rect; unit: number }): JSX.Element {
  const s = SHEETS[layer];
  const cert = `CERTIFIED ROUTE MILEAGE: ${formatMiles(CERTIFIED_ROUTE_MILEAGE)}`;
  const eng = `ENGINEERING ROUTE MILEAGE: ${formatMiles(engineeringMi)}`;
  return (
    <g transform={`translate(${rect.x},${rect.y}) scale(${unit})`} class="tm-titleblock">
      <rect class="tm-panel" x={0} y={0} width={TB_W} height={TB_H} />
      {/* agency / originating division */}
      <text class="tm-tb-head" x={6} y={12.5}>
        {canon.meta.agency.toUpperCase()}
      </text>
      <text class="tm-tb-head" x={TB_W - 6} y={12.5} text-anchor="end">
        {divisionName(s.division)}
      </text>
      <line class="tm-rule" x1={0} y1={18} x2={TB_W} y2={18} />
      {/* title */}
      <text class="tm-tb-label" x={6} y={27}>
        TITLE
      </text>
      <text class="tm-tb-title" x={6} y={40}>
        {s.title}
      </text>
      <text class="tm-tb-sub" x={6} y={50.5}>
        CONTERMINOUS UNITED STATES. GEOGRAPHIC LAYOUT.
      </text>
      <line class="tm-rule" x1={0} y1={56} x2={TB_W} y2={56} />
      {/* mileage statement */}
      {layer === 'both' ? (
        <g>
          <text class="tm-tb-mileage tm-tb-mileage--small" x={6} y={68}>
            {cert}
          </text>
          <text class="tm-tb-mileage tm-tb-mileage--small" x={6} y={80}>
            {eng}
          </text>
        </g>
      ) : (
        <text class="tm-tb-mileage" x={6} y={74.5}>
          {layer === 'certified' ? cert : eng}
        </text>
      )}
      <line class="tm-rule" x1={0} y1={84} x2={TB_W} y2={84} />
      {/* register rows */}
      <Cell x={0} y={84} w={136} label="DRAWING NO." value={s.drawingNo} />
      <Cell x={136} y={84} w={40} label="REV" value={s.revision} />
      <Cell x={176} y={84} w={64} label="SHEET" value="1 OF 1" />
      <Cell x={240} y={84} w={80} label="SCALE" value="NTS" last />
      <line class="tm-rule" x1={0} y1={109} x2={TB_W} y2={109} />
      <Cell x={0} y={109} w={52} label="DRAWN" value={s.drawn} />
      <Cell x={52} y={109} w={56} label="CHECKED" value={s.checked} />
      <Cell x={108} y={109} w={92} label="DATE" value={s.date} />
      <Cell x={200} y={109} w={120} label="SOURCE" value={s.source} last />
    </g>
  );
}

// ---- Hover label -----------------------------------------------------------------------

function tipLines(l: TunnelLink, layer: TunnelLayer): string[] {
  const ratio = l.straightMi > 0 ? (l.miles / l.straightMi).toFixed(2) : '';
  const lines = [
    `${l.kind === 'RAIL' ? 'RAIL ' : 'TRAM '}${l.designation}  ${l.a} to ${l.b}`,
    `STATED ${formatMiles(l.miles)} MI    STRAIGHT-LINE ${formatMiles(l.straightMi)} MI    RATIO ${ratio}`,
  ];
  if (!l.inRevenueService) lines.push('NOT IN REVENUE SERVICE');
  const why = layer === 'engineering' ? null : certifiedRationale(l.id);
  if (why) lines.push(`CERTIFIED. ${why}`);
  else if (layer === 'both') lines.push('NOT ON THE CERTIFIED MILEAGE RETURN');
  return lines;
}

function Tip({ g, layer, frame }: { g: LinkGeometry; layer: TunnelLayer; frame: Box }): JSX.Element {
  const lines = tipLines(g.link, layer);
  const cw = 6.02;
  const w = Math.max(...lines.map((s) => s.length)) * cw + 14;
  const h = lines.length * 13 + 9;
  let x = g.mid.x + 12;
  let y = g.mid.y - h - 10;
  if (x + w > frame.x1 - 4) x = g.mid.x - w - 12;
  if (x < frame.x0 + 4) x = frame.x0 + 4;
  if (y < frame.y0 + 4) y = g.mid.y + 12;
  return (
    <g class="tm-tip" transform={`translate(${Math.round(x)},${Math.round(y)})`}>
      <rect class="tm-tip-box" x={0.5} y={0.5} width={Math.ceil(w)} height={h} />
      {lines.map((s, i) => (
        <text key={i} class={`tm-tip-text${i === 0 ? ' tm-tip-text--head' : ''}`} x={7} y={15 + i * 13} style="white-space:pre">
          {s}
        </text>
      ))}
    </g>
  );
}

// ---- Component -------------------------------------------------------------------------

function linkClass(l: TunnelLink): string {
  if (l.kind === 'TRAM') return 'tm-tram';
  return l.inRevenueService ? 'tm-rail' : 'tm-rail tm-rail--nrs';
}

function matchesHighlight(l: TunnelLink, highlight: string | null | undefined): boolean {
  if (!highlight) return false;
  return l.id === highlight || l.a === highlight || l.b === highlight;
}

function ariaFor(l: TunnelLink): string {
  return `${l.kind === 'RAIL' ? 'Rail' : 'Tram'} ${l.designation.toLowerCase()}, ${l.a} to ${l.b}: stated ${l.miles} miles, straight-line ${l.straightMi} miles${l.inRevenueService ? '' : ', not in revenue service'}`;
}

export function TunnelMap({ width, height, layer, highlight, onSelect }: TunnelMapProps): JSX.Element {
  const [hover, setHover] = useState<LinkId | null>(null);

  const scene = useMemo(() => {
    const layout = layoutFor(width, height);
    const base = buildBase(layout.mapBox, layout.frame);
    const links = allLinkGeometry(base.projection);
    return { layout, base, links };
  }, [width, height]);

  const { layout, base } = scene;
  const { frame, unit, tb } = layout;
  const showEng = layer !== 'certified';
  const showCert = layer !== 'engineering';

  const view = useMemo(() => {
    const visible = scene.links.filter((g) => showEng || isCertified(g.link.id));
    const certified = showCert ? scene.links.filter((g) => isCertified(g.link.id)) : [];
    const spec = legendFor(layer, unit < 1);
    const lgRect: Rect = { x: frame.x0, y: frame.y1 - legendHeight(spec) * unit, w: LG_W * unit, h: legendHeight(spec) * unit };

    // Mileage flags sit on the outer side of each certified link's bend.
    // Each flag tries the outer then the inner side at five stations along the link and
    // takes the position that best clears the sites, the other certified links and the
    // flags already placed.
    const siteBoxes: Rect[] = [];
    for (const g of visible) {
      for (const p of [g.a, g.b]) siteBoxes.push({ x: p.x - 6, y: p.y - 6, w: 12, h: 12 });
    }
    const flags: { id: LinkId; text: string; rect: Rect }[] = [];
    for (const g of certified) {
      const text = formatMiles(g.link.miles);
      const w = text.length * 5.5 + 8;
      const dirx = g.mid.x - (g.a.x + g.b.x) / 2;
      const diry = g.mid.y - (g.a.y + g.b.y) / 2;
      const outer = dirx * g.normal.x + diry * g.normal.y >= 0 ? 1 : -1;
      const others = certified.filter((o) => o !== g).flatMap((o) => o.pts);
      let best: Rect | null = null;
      let bestCost = Infinity;
      let n = 0;
      for (const t of [0.5, 0.36, 0.64, 0.24, 0.76]) {
        const at = g.pts[Math.round(t * (g.pts.length - 1))] ?? g.mid;
        for (const sgn of [outer, -outer]) {
          const off = 9 + Math.abs(g.normal.x) * w * 0.5 + Math.abs(g.normal.y) * 2;
          const cx = at.x + g.normal.x * sgn * off;
          const cy = at.y + g.normal.y * sgn * off;
          const rect: Rect = { x: Math.round(cx - w / 2) + 0.5, y: Math.round(cy - 6.5) + 0.5, w, h: 13 };
          const pad: Rect = { x: rect.x - 2, y: rect.y - 2, w: rect.w + 4, h: rect.h + 4 };
          let cost = n++ * 0.01;
          for (const sb of siteBoxes) if (overlaps(pad, sb)) cost += 5;
          for (const f of flags) if (overlaps(pad, f.rect)) cost += 8;
          for (const p of others) if (p.x > pad.x && p.x < pad.x + pad.w && p.y > pad.y && p.y < pad.y + pad.h) cost += 1;
          if (cost < bestCost) {
            bestCost = cost;
            best = rect;
          }
        }
      }
      if (best) flags.push({ id: g.link.id, text, rect: best });
    }

    const siteIds = new Set<string>();
    for (const g of visible) {
      siteIds.add(g.link.a);
      siteIds.add(g.link.b);
    }
    if (showEng) {
      for (const f of canon.facilities) if (f.class === 'GAMMA' && !linkedFacilityIds.has(f.id)) siteIds.add(f.id);
    }
    const sites: { id: string; at: Pt; cls: string; linked: boolean }[] = [];
    for (const id of siteIds) {
      const at = projectFacility(base.projection, id);
      const f = facility(id);
      if (at && f) sites.push({ id, at, cls: f.class, linked: linkedFacilityIds.has(id) });
    }
    const rank: Record<string, number> = { ALPHA: 0, BETA: 1, GAMMA: 2, DELTA: 3 };
    sites.sort((p, q) => (rank[p.cls] ?? 9) - (rank[q.cls] ?? 9) || (p.id < q.id ? -1 : 1));
    const labels = placeLabels(
      sites.map((s) => ({ id: s.id, at: s.at, text: s.id, priority: rank[s.cls] ?? 9 })),
      5.2,
      10,
      [lgRect, tb, ...flags.map((f) => f.rect)],
      visible.flatMap((g) => g.pts),
    );
    return { visible, certified, spec, flags, sites, labels: new Map(labels.map((l) => [l.id, l])) };
  }, [scene, layer, showEng, showCert, frame, unit, tb, base.projection]);

  const hovered = hover ? view.visible.find((g) => g.link.id === hover) : undefined;
  const emphasised = (l: TunnelLink): boolean => l.id === hover || matchesHighlight(l, highlight);
  const hlSites = new Set<string>();
  for (const g of view.visible) {
    if (emphasised(g.link)) {
      hlSites.add(g.link.a);
      hlSites.add(g.link.b);
    }
  }
  const clipId = `tm-clip-${layer}-${Math.round(width)}x${Math.round(height)}`;
  const s = SHEETS[layer];

  return (
    <svg
      class={`tm tm--${layer}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label={`${s.title}. Drawing ${s.drawingNo} revision ${s.revision}.`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={frame.x0} y={frame.y0} width={frame.x1 - frame.x0} height={frame.y1 - frame.y0} />
        </clipPath>
      </defs>
      <rect class="tm-sheet" x={0} y={0} width={width} height={height} onClick={onSelect ? () => onSelect(null) : undefined} />

      <g clip-path={`url(#${clipId})`} pointer-events="none">
        <path class="tm-land" d={base.statesD} />
        <path class="tm-coast" d={base.outlineD} />
        <path class="tm-grat" d={base.graticuleD} />
      </g>

      {/* frame and graticule ticks */}
      <rect class="tm-frame tm-frame--outer" x={OUTER + 0.5} y={OUTER + 0.5} width={width - 2 * OUTER - 1} height={height - 2 * OUTER - 1} />
      <rect class="tm-frame" x={frame.x0 + 0.5} y={frame.y0 + 0.5} width={frame.x1 - frame.x0 - 1} height={frame.y1 - frame.y0 - 1} />
      <g pointer-events="none">
        {base.ticks.map((t, i) => {
          const p = Math.round(t.pos) + 0.5;
          if (t.side === 'top')
            return (
              <g key={i}>
                <line class="tm-tick" x1={p} y1={frame.y0 - 4} x2={p} y2={frame.y0} />
                <text class="tm-tick-label" x={p + 2} y={frame.y0 - 5}>{t.label}</text>
              </g>
            );
          if (t.side === 'bottom')
            return (
              <g key={i}>
                <line class="tm-tick" x1={p} y1={frame.y1} x2={p} y2={frame.y1 + 4} />
                <text class="tm-tick-label" x={p + 2} y={frame.y1 + 11}>{t.label}</text>
              </g>
            );
          if (t.side === 'left')
            return (
              <g key={i}>
                <line class="tm-tick" x1={frame.x0 - 4} y1={p} x2={frame.x0} y2={p} />
                <text class="tm-tick-label" transform={`translate(${frame.x0 - 5},${p - 2}) rotate(-90)`}>{t.label}</text>
              </g>
            );
          return (
            <g key={i}>
              <line class="tm-tick" x1={frame.x1} y1={p} x2={frame.x1 + 4} y2={p} />
              <text class="tm-tick-label" transform={`translate(${frame.x1 + 11},${p - 2}) rotate(-90)`}>{t.label}</text>
            </g>
          );
        })}
      </g>

      {/* links */}
      <g pointer-events="none">
        {view.visible.filter((g) => emphasised(g.link)).map((g) => (
          <path key={`c-${g.link.id}`} class="tm-casing" d={g.d} />
        ))}
        {showEng
          ? [...view.visible]
              .sort((p, q) => (p.link.kind === q.link.kind ? 0 : p.link.kind === 'TRAM' ? -1 : 1))
              .map((g) => (
                <g key={g.link.id}>
                  {g.link.kind === 'RAIL' ? <path class="tm-under" d={g.d} stroke-width={5} /> : null}
                  <path class={linkClass(g.link)} d={g.d} data-link={g.link.id} />
                </g>
              ))
          : null}
        {view.certified.map((g) => (
          <g key={`k-${g.link.id}`}>
            <path class="tm-under" d={g.d} stroke-width={6} />
            <path class="tm-cert" d={g.d} data-certified={g.link.id} />
          </g>
        ))}
      </g>

      {/* sites */}
      <g pointer-events="none">
        {view.sites.map((st) => {
          const { x, y } = st.at;
          if (st.cls === 'ALPHA') return <rect key={st.id} class="tm-site-alpha" x={Math.round(x) - 4.5} y={Math.round(y) - 4.5} width={9} height={9} />;
          if (st.cls === 'BETA') return <circle key={st.id} class="tm-site-beta" cx={x} cy={y} r={3.6} />;
          return <circle key={st.id} class={st.linked ? 'tm-site-gamma' : 'tm-site-unlinked'} cx={x} cy={y} r={3} />;
        })}
        {view.sites.map((st) => {
          const lb = view.labels.get(st.id);
          if (!lb) return null;
          const cls = `tm-site-label${st.cls === 'ALPHA' ? ' tm-site-label--alpha' : ''}${st.linked ? '' : ' tm-site-label--unlinked'}${hlSites.has(st.id) || highlight === st.id ? ' tm-site-label--hl' : ''}`;
          return (
            <text key={`l-${st.id}`} class={cls} x={lb.x} y={lb.y} text-anchor={lb.anchor}>
              {st.id}
            </text>
          );
        })}
      </g>

      {/* mileage flags on certified links */}
      <g pointer-events="none">
        {view.flags.map((f) => (
          <g key={`f-${f.id}`}>
            <rect class="tm-flag-box" x={f.rect.x} y={f.rect.y} width={f.rect.w} height={f.rect.h} />
            <text class="tm-flag-text" x={f.rect.x + f.rect.w / 2} y={f.rect.y + 9.5}>
              {f.text}
            </text>
          </g>
        ))}
      </g>

      {/* hit areas: tram first so rail and certified stay on top where they cross */}
      <g>
        {[...view.visible]
          .sort((p, q) => (p.link.kind === q.link.kind ? 0 : p.link.kind === 'TRAM' ? -1 : 1))
          .map((g) => {
            const id = g.link.id;
            return (
              <path
                key={`h-${id}`}
                class={`tm-hit${onSelect ? ' tm-hit--select' : ''}`}
                d={g.d}
                data-hit={id}
                tabIndex={0}
                role={onSelect ? 'button' : 'img'}
                aria-label={ariaFor(g.link)}
                onPointerEnter={() => setHover(id)}
                onPointerLeave={() => setHover((h) => (h === id ? null : h))}
                onFocus={() => setHover(id)}
                onBlur={() => setHover((h) => (h === id ? null : h))}
                onClick={onSelect ? () => onSelect(id) : undefined}
                onKeyDown={
                  onSelect
                    ? (e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(id);
                        }
                      }
                    : undefined
                }
              />
            );
          })}
      </g>

      <Legend spec={view.spec} x={frame.x0} y={frame.y1} unit={unit} />
      <TitleBlock layer={layer} rect={tb} unit={unit} />

      {hovered ? <Tip g={hovered} layer={layer} frame={frame} /> : null}
    </svg>
  );
}

export default TunnelMap;
