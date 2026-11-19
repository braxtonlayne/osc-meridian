/**
 * @graphics/schematic — asset family 4.
 * Dispatcher's line diagram of the maglev rail segments and the tram networks:
 * a mimic panel as a 2008 control-room HMI would draw it. Orthogonal and
 * 45 degree runs on a fixed board, no anti-aliased geometry, status in words.
 *
 * Rendering is split in two so that train movement is cheap:
 *   StaticLayer  track, nodes, tags, legend. Memoised; re-renders only when the
 *                size, network filter, occupancy values or selection change.
 *   TrainLayer   one <g transform> per train. A tick changes that attribute only.
 * Train positions come from precomputed polyline lengths (no DOM measurement).
 *
 * All colour comes from design tokens through schematic.css. See README.md.
 */
import type { CSSProperties, JSX } from 'preact';
import { memo } from 'preact/compat';
import { useId, useMemo, useRef } from 'preact/hooks';
import type { NetworkId } from '../../core/canon-types';
import {
  SCHEMATIC_LAYOUT,
  blockKey,
  makePoly,
  resolveLink,
  sampleAt,
  slicePoly,
  tagNormal,
  type Poly,
  type Pt,
  type Sample,
  type SchematicLink,
  type SchematicNode,
} from './layout';
import './schematic.css';

export {
  SCHEMATIC_LAYOUT,
  blockKey,
  isRailKey,
  linkKey,
  railKey,
  resolveLink,
  tramKey,
} from './layout';
export type { LabelSide, NodeClass, SchematicLink, SchematicNode } from './layout';

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type Occupancy = 'CLEAR' | 'OCCUPIED' | 'POSSESSION' | 'DARK';
export type DiagramNetwork = 'ALL' | NetworkId | 'RAIL';

export interface SchematicTrain {
  id: string;
  kind: 'RAIL' | 'TRAM';
  /** Rail segment number "01".."06", or a tram key "FROM>TO". */
  link: string;
  /** 0 at the link's A end (canon `a` / `from`), 1 at its B end. */
  pos: number;
  /** 1 = heading toward B, -1 = toward A. */
  dir: 1 | -1;
  label: string;
  /** Consist identity withheld: the label prints as a run of '#'. */
  suppressed?: boolean;
}

export interface LineDiagramProps {
  width: number;
  height: number;
  /** 'ALL' (default), 'RAIL' (no tram), or one tram network (rail stays as context). */
  network?: DiagramNetwork;
  trains?: SchematicTrain[];
  /** Keyed by link key ("02", "ALPHA-01>BETA-02") or by block ("02#3"); a block entry wins. */
  occupancy?: Record<string, Occupancy>;
  /** A link key or a facility id. */
  selected?: string | null;
  onSelectLink?: (key: string) => void;
  onSelectNode?: (id: string) => void;
  /**
   * Per-link block count override, keyed by link key ("01".."06" or "FROM>TO"),
   * e.g. the transit content's signalling blocks { '01': 6, '02': 22, ... }.
   * Links not named keep the drafting-convention count from SCHEMATIC_LAYOUT.
   */
  blockCounts?: Readonly<Record<string, number>>;
}

/* ------------------------------------------------------------------ */
/* Pixel geometry (memoised per size)                                  */
/* ------------------------------------------------------------------ */

interface Sizes {
  compact: boolean;
  s: number;
  railO: number;
  railI: number;
  tram: number;
  tramOcc: number;
  dark: number;
  ch: number; // advance of one mono character
  alphaW: number;
  alphaH: number;
  beta: number;
  gamma: number;
}

interface BlockGeom {
  key: string;
  no: string;
  d: string;
  mid: Sample;
}

interface LinkGeom {
  link: SchematicLink;
  poly: Poly;
  d: string;
  blocks: BlockGeom[];
  ticks: string;
  mid: Sample;
  tag: Sample;
  /** Unit normal toward the tag side at the tag point. */
  nx: number;
  ny: number;
}

interface NodeGeom {
  node: SchematicNode;
  x: number;
  y: number;
}

interface Geometry {
  width: number;
  height: number;
  sz: Sizes;
  links: LinkGeom[];
  byKey: Map<string, LinkGeom>;
  nodes: NodeGeom[];
  /** Board origin and scale, for the legend anchor. */
  ox: number;
  oy: number;
  /** Narrow diagram: the legend has its own band under the board instead of sitting on it. */
  legendBelow: boolean;
}

const HEAD_H = 16;
/** At or below this width the legend moves under the board (it would cover the track); transit passes 600 as its narrow minimum. */
const LEGEND_BELOW_W = 640;
/** Band reserved for the one-column legend: up to six rows of 13px plus its title. */
const LEGEND_BAND_H = 6 * 13 + 22 + 8;

const pathD = (pts: readonly Pt[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p[0] * 2) / 2} ${Math.round(p[1] * 2) / 2}`).join('');

function buildGeometry(width: number, height: number, blockCounts?: Readonly<Record<string, number>>): Geometry {
  const L = SCHEMATIC_LAYOUT;
  const legendBelow = width <= LEGEND_BELOW_W;
  const boardH = legendBelow ? Math.max(40, height - LEGEND_BAND_H) : height;
  const s = Math.max(0.2, Math.min(width / L.width, boardH / L.height));
  const ox = Math.round((width - L.width * s) / 2);
  const oy = Math.round((boardH - L.height * s) / 2);
  const compact = s < 0.8;
  const sz: Sizes = compact
    ? { compact, s, railO: 4, railI: 2, tram: 1, tramOcc: 3, dark: 1, ch: 4.8, alphaW: Math.max(42, 96 * s), alphaH: 17, beta: 9, gamma: 5 }
    : { compact, s, railO: 8, railI: 4, tram: 2, tramOcc: 4, dark: 2, ch: 5.4, alphaW: Math.round(96 * s), alphaH: Math.round(36 * s), beta: 11, gamma: 7 };
  const px = (p: Pt): Pt => [Math.round(ox + p[0] * s), Math.round(oy + p[1] * s)];

  const links = L.links.map((link): LinkGeom => {
    const poly = makePoly(link.pts.map(px));
    const override = blockCounts?.[link.key];
    const n = override && override > 0 ? Math.round(override) : link.blocks;
    const blocks: BlockGeom[] = [];
    let ticks = '';
    const tickHalf = link.kind === 'RAIL' ? sz.railO / 2 + 3 : 3;
    for (let i = 0; i < n; i++) {
      blocks.push({
        key: blockKey(link.key, i + 1),
        no: link.kind === 'RAIL' ? `${link.key}${String(i + 1).padStart(2, '0')}` : `${i + 1}`,
        d: pathD(slicePoly(poly, i / n, (i + 1) / n)),
        mid: sampleAt(poly, (i + 0.5) / n),
      });
      if (i > 0) {
        const t = sampleAt(poly, i / n);
        const x = Math.round(t.x);
        const y = Math.round(t.y);
        ticks += `M${x + -t.uy * tickHalf} ${y + t.ux * tickHalf}L${x + t.uy * tickHalf} ${y - t.ux * tickHalf}`;
      }
    }
    const tag = sampleAt(poly, link.tagAt);
    const [nx, ny] = tagNormal(tag.ux, tag.uy, link.flip);
    return { link, poly, d: pathD(poly.pts), blocks, ticks, mid: sampleAt(poly, 0.5), tag, nx, ny };
  });

  const nodes = L.nodes.map((node): NodeGeom => {
    const [x, y] = px([node.x, node.y]);
    return { node, x, y };
  });

  return { width, height, sz, links, byKey: new Map(links.map((g) => [g.link.key, g])), nodes, ox, oy, legendBelow };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const RANK: Record<Occupancy, number> = { CLEAR: 0, DARK: 1, OCCUPIED: 2, POSSESSION: 3 };
const WORD: Record<Occupancy, string> = { CLEAR: 'CLEAR', OCCUPIED: 'OCCUPIED', POSSESSION: 'POSSESSION', DARK: 'DARK' };
const miles = (n: number) => n.toLocaleString('en-US');

function linkVisible(link: SchematicLink, network: DiagramNetwork): boolean {
  if (link.kind === 'RAIL') return true;
  return network === 'ALL' || network === link.network;
}

function activate(fn: () => void) {
  return {
    onClick: fn,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    },
  };
}

function shallowEq(a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Track                                                               */
/* ------------------------------------------------------------------ */

function Block({ rail, state, nirs, d, hatch }: { rail: boolean; state: Occupancy; nirs: boolean; d: string; hatch: string }) {
  if (state === 'DARK') return <path class="sc-dark" d={d} />;
  if (rail) {
    if (state === 'OCCUPIED') return <path class="sc-ro" d={d} />;
    return (
      <>
        <path class={nirs ? 'sc-ro sc-nirs' : 'sc-ro'} d={d} />
        {state === 'POSSESSION' ? <path class="sc-ri sc-hatch" style={{ stroke: `url(#${hatch})` }} d={d} /> : <path class="sc-ri" d={d} />}
      </>
    );
  }
  if (state === 'OCCUPIED') return <path class="sc-tro" d={d} />;
  if (state === 'POSSESSION') {
    return (
      <>
        <path class="sc-tro sc-tpo" d={d} />
        <path class="sc-tro sc-tpi" style={{ stroke: `url(#${hatch})` }} d={d} />
      </>
    );
  }
  return <path class={nirs ? 'sc-tr sc-nirs' : 'sc-tr'} d={d} />;
}

function PBox({ x, y }: { x: number; y: number }) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  return (
    <g>
      <rect class="sc-box" x={cx - 5.5} y={cy - 5.5} width={11} height={11} />
      <text class="sc-mono-b" x={cx} y={cy + 3} text-anchor="middle">
        P
      </text>
    </g>
  );
}

interface LinkProps {
  g: LinkGeom;
  sz: Sizes;
  occ: Record<string, Occupancy> | undefined;
  selected: boolean;
  hatch: string;
  onSelect: (key: string) => void;
}

function LinkView({ g, sz, occ, selected, hatch, onSelect }: LinkProps) {
  const { link } = g;
  const rail = link.kind === 'RAIL';
  const base: Occupancy = occ?.[link.key] ?? 'CLEAR';
  const states = g.blocks.map((b) => occ?.[b.key] ?? base);
  let worst: Occupancy = 'CLEAR';
  for (const st of states) if (RANK[st] > RANK[worst]) worst = st;
  const allPoss = states.every((st) => st === 'POSSESSION');

  // ---- tag: [no] mileage [square] word ----
  const full = !sz.compact;
  const noW = rail ? 2 * sz.ch + 6 : 0;
  const mileText = rail ? `${miles(link.miles)}${full ? ' MI' : ''}` : full ? miles(link.miles) : '';
  const mch = rail ? sz.ch : 4.8;
  const mileW = mileText.length * mch;
  const showSq = rail || (full && worst !== 'CLEAR');
  const sq = rail ? 8 : 7;
  const word = rail && full ? WORD[worst] : '';
  const tagH = rail ? 12 : 9;
  const parts: number[] = [noW, mileW, showSq ? sq : 0, word.length * sz.ch].filter((w) => w > 0);
  const tagW = Math.ceil(parts.reduce((a, b) => a + b, 0) + Math.max(0, parts.length - 1) * 4);
  const hasTag = tagW > 0;
  const off = (rail ? sz.railO / 2 : 1) + (rail ? 5 : 4);
  const dist = off + (Math.abs(g.nx) * tagW) / 2 + (Math.abs(g.ny) * tagH) / 2;
  const tx = Math.round(g.tag.x + g.nx * dist - tagW / 2);
  const ty = Math.round(g.tag.y + g.ny * dist - tagH / 2);
  let cx = tx;
  const xNo = cx;
  if (noW) cx += noW + 4;
  const xMile = cx;
  if (mileW) cx += mileW + 4;
  const xSq = cx;
  if (showSq) cx += sq + 4;
  const xWord = cx;

  const label =
    (rail ? `Rail segment ${link.key}` : 'Tram link') +
    `, ${link.a} to ${link.b}, ${miles(link.miles)} miles, ${WORD[worst].toLowerCase()}` +
    (link.notInService ? ', not in revenue service' : '');

  const act = activate(() => onSelect(link.key));
  const fr = hasTag
    ? { x: tx - 2.5, y: ty - 2.5, w: tagW + 5, h: tagH + 5 + (link.notInService ? 11 : 0) }
    : { x: Math.round(g.mid.x) - 7.5, y: Math.round(g.mid.y) - 7.5, w: 15, h: 15 };

  return (
    <g
      class="sc-link"
      role="button"
      tabindex={0}
      aria-label={label}
      aria-pressed={selected}
      data-link={link.key}
      {...act}
    >
      <path class="sc-hit" d={g.d} />
      {selected && <path class="sc-sel" d={g.d} />}
      {g.blocks.map((b, i) => (
        <Block key={b.key} rail={rail} state={states[i]!} nirs={link.notInService} d={b.d} hatch={hatch} />
      ))}
      {g.ticks && <path class="sc-tick" d={g.ticks} />}
      {rail &&
        full &&
        g.blocks.map((b) => {
          const [nx, ny] = tagNormal(b.mid.ux, b.mid.uy, link.flip);
          const w = b.no.length * 4.8;
          const dd = sz.railO / 2 + 4 + (Math.abs(nx) * w) / 2 + Math.abs(ny) * 4;
          return (
            <text key={b.key} class="sc-blockno" x={Math.round(b.mid.x - nx * dd)} y={Math.round(b.mid.y - ny * dd) + 3} text-anchor="middle">
              {b.no}
            </text>
          );
        })}
      {allPoss ? (
        <PBox x={g.mid.x} y={g.mid.y} />
      ) : (
        g.blocks.map((b, i) => (states[i] === 'POSSESSION' ? <PBox key={b.key} x={b.mid.x} y={b.mid.y} /> : null))
      )}
      {hasTag && (
        <g class={selected ? 'sc-tag-sel' : undefined}>
          <rect class="sc-tagbg" x={tx - 2} y={ty - 1} width={tagW + 4} height={tagH + 2} />
          {noW > 0 && (
            <>
              <rect class="sc-box" x={xNo + 0.5} y={ty + 0.5} width={noW - 1} height={tagH - 1} />
              <text class="sc-mono-b" x={xNo + noW / 2} y={ty + tagH - 3} text-anchor="middle">
                {link.key}
              </text>
            </>
          )}
          {mileW > 0 && (
            <text class={rail ? 'sc-mono sc-tagtext' : 'sc-mono-s sc-tagtext'} x={xMile} y={ty + tagH - (rail ? 3 : 2)}>
              {mileText}
            </text>
          )}
          {showSq && <rect class={`sc-sq sc-sq-${worst}`} x={xSq + 0.5} y={ty + (tagH - sq) / 2 + 0.5} width={sq - 1} height={sq - 1} />}
          {word && (
            <text class="sc-mono sc-tagtext" x={xWord} y={ty + tagH - 3}>
              {word}
            </text>
          )}
        </g>
      )}
      {link.notInService && (
        <text class="sc-caps sc-halo" x={tx} y={ty + tagH + 10}>
          NOT IN REVENUE SERVICE
        </text>
      )}
      <rect class="sc-focus" x={fr.x} y={fr.y} width={fr.w} height={fr.h} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* ------------------------------------------------------------------ */

function NodeView({ n, sz, selected, onSelect }: { n: NodeGeom; sz: Sizes; selected: boolean; onSelect: (id: string) => void }) {
  const { node, x, y } = n;
  const full = !sz.compact;
  const act = activate(() => onSelect(node.id));
  const common = {
    class: selected ? 'sc-node sc-node-sel' : 'sc-node',
    role: 'button' as const,
    tabindex: 0,
    'aria-pressed': selected,
    'data-node': node.id,
  };

  if (node.cls === 'ALPHA') {
    const w = Math.round(sz.alphaW);
    const h = Math.round(sz.alphaH);
    const x0 = x - Math.round(w / 2);
    const y0 = y - Math.round(h / 2);
    const hub = node.hubOf.map((id) => (SCHEMATIC_LAYOUT.networkNames[id] ?? id).replace(/\s*network$/i, '').toUpperCase()).join(', ');
    return (
      <g {...common} {...act} aria-label={`${node.id}, rail hub${hub ? `, ${hub} tram network` : ''}`}>
        <rect class="sc-alpha" x={x0 + 0.5} y={y0 + 0.5} width={w - 1} height={h - 1} />
        {full && <rect class="sc-alpha-in" x={x0 + 2.5} y={y0 + 2.5} width={w - 5} height={h - 5} />}
        <text class="sc-mono-b sc-on-alpha" x={x} y={full && hub ? y - 2 : y + 3} text-anchor="middle" style={full ? { fontSize: '10px' } : undefined}>
          {full ? node.id : node.id.replace('ALPHA', 'A')}
        </text>
        {full && hub && (
          <text class="sc-ui sc-on-alpha" x={x} y={y + 10} text-anchor="middle" style={{ fontSize: '8px' }}>
            {hub}
          </text>
        )}
        <rect class="sc-focus" x={x0 - 2.5} y={y0 - 2.5} width={w + 5} height={h + 5} />
      </g>
    );
  }

  const beta = node.cls === 'BETA';
  const sym = beta ? sz.beta : sz.gamma;
  const half = sym / 2;
  const id = full ? node.id : node.id.replace('BETA', 'B').replace('GAMMA', 'G');
  const place = full ? node.place.replace(/[()]/g, '').toUpperCase() : '';
  const gap = half + 4;
  let lx = x;
  let ly1 = y;
  let ly2 = y;
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  switch (node.label) {
    case 'N':
      ly2 = y - gap - 1;
      ly1 = place ? ly2 - 10 : ly2;
      break;
    case 'S':
      ly1 = y + gap + 7;
      ly2 = ly1 + 10;
      break;
    case 'E':
      lx = x + gap + 1;
      anchor = 'start';
      ly1 = place ? y - 2 : y + 3;
      ly2 = y + 8;
      break;
    case 'W':
      lx = x - gap - 1;
      anchor = 'end';
      ly1 = place ? y - 2 : y + 3;
      ly2 = y + 8;
      break;
  }
  return (
    <g {...common} {...act} aria-label={`${node.id}${place ? `, ${place}` : ''}`}>
      <rect class="sc-nodehit" x={x - 10} y={y - 10} width={20} height={20} />
      {beta ? (
        <rect class="sc-beta" x={x - half + 0.5 - (sym % 2 ? 0.5 : 0)} y={y - half + 0.5 - (sym % 2 ? 0.5 : 0)} width={sym - 1} height={sym - 1} />
      ) : (
        <rect class="sc-gamma" x={Math.round(x - half)} y={Math.round(y - half)} width={sym} height={sym} />
      )}
      {selected && <rect class="sc-selring" x={x - half - 4} y={y - half - 4} width={sym + 8} height={sym + 8} />}
      <text class={beta ? 'sc-mono-b sc-halo' : 'sc-mono sc-halo'} x={lx} y={ly1} text-anchor={anchor}>
        {id}
      </text>
      {place && (
        <text class="sc-ui sc-halo" x={lx} y={ly2} text-anchor={anchor} style={{ fontSize: '8px' }}>
          {place}
        </text>
      )}
      <rect class="sc-focus" x={x - half - 3.5} y={y - half - 3.5} width={Math.ceil(sym) + 7} height={Math.ceil(sym) + 7} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Header and legend                                                   */
/* ------------------------------------------------------------------ */

function Header({ width, compact, network }: { width: number; compact: boolean; network: DiagramNetwork }) {
  const rail = SCHEMATIC_LAYOUT.links.filter((l) => l.kind === 'RAIL');
  const first = rail[0]?.key ?? '';
  const last = rail[rail.length - 1]?.key ?? '';
  const view =
    network === 'ALL' ? 'ALL NETWORKS' : network === 'RAIL' ? 'RAIL ONLY' : (SCHEMATIC_LAYOUT.networkNames[network] ?? network).toUpperCase();
  return (
    <g>
      <rect class="sc-head" x={0} y={0} width={width} height={HEAD_H} />
      <line class="sc-head-rule" x1={0} y1={HEAD_H + 0.5} x2={width} y2={HEAD_H + 0.5} />
      <text class="sc-head-t" x={6} y={12}>
        {compact ? 'LINE DIAGRAM: RAIL AND TRAM' : `LINE DIAGRAM: MAGLEV RAIL SEGMENTS ${first} TO ${last} AND TRAM NETWORKS`}
      </text>
      <text class="sc-head-t2" x={width - 6} y={12} text-anchor="end">
        {compact ? `VIEW: ${view}` : `SCHEMATIC. NOT TO SCALE.     VIEW: ${view}`}
      </text>
    </g>
  );
}

function Legend({ g, hatch, showTram }: { g: Geometry; hatch: string; showTram: boolean }) {
  const { sz } = g;
  const L = SCHEMATIC_LAYOUT;
  type Row = { text: string; draw: (y: number) => JSX.Element };
  const lane = 34;
  const line = (cls: string, y: number, extra?: JSX.Element) => (
    <>
      <path class={cls} d={`M0 ${y}H${lane}`} />
      {extra}
    </>
  );
  const rows: Row[] = [
    { text: 'RAIL BLOCK, CLEAR', draw: (y) => <>{line('sc-ro', y)}{line('sc-ri', y)}</> },
    { text: 'BLOCK OCCUPIED', draw: (y) => line('sc-ro', y) },
    {
      text: 'POSSESSION',
      draw: (y) => (
        <>
          {line('sc-ro', y)}
          <path class="sc-ri sc-hatch" style={{ stroke: `url(#${hatch})` }} d={`M0 ${y}H${lane}`} />
          <PBox x={lane / 2} y={y} />
        </>
      ),
    },
    { text: 'DARK, NO INDICATION', draw: (y) => line('sc-dark', y) },
    { text: 'NOT IN REVENUE SERVICE', draw: (y) => <>{line('sc-ro sc-nirs', y)}{line('sc-ri', y)}</> },
  ];
  if (showTram) rows.push({ text: 'TRAM LINK', draw: (y) => line('sc-tr', y) });
  if (!sz.compact) {
    rows.push({
      text: showTram ? 'ALPHA HUB / BETA / GAMMA' : 'ALPHA HUB',
      draw: (y) => (
        <>
          <rect class="sc-alpha" x={0.5} y={y - 4.5} width={15} height={9} />
          {showTram && <rect class="sc-beta" x={20.5} y={y - 4.5} width={9} height={9} />}
          {showTram && <rect class="sc-gamma" x={33} y={y - 3} width={6} height={6} />}
        </>
      ),
    });
    rows.push({
      text: 'CONSIST, HEADING, IDENTITY',
      draw: (y) => (
        <>
          <path class="sc-consist" d={`M1 ${y - 4}H13L16 ${y}L13 ${y + 4}H1Z`} />
          <rect class="sc-berth" x={19.5} y={y - 5.5} width={20} height={11} />
        </>
      ),
    });
  }
  const cols = sz.compact ? 1 : 2;
  const perCol = Math.ceil(rows.length / cols);
  const rowH = 13;
  const colW = sz.compact ? 172 : 196;
  const w = cols * colW + 8;
  const h = perCol * rowH + 22;
  const x0 = g.legendBelow ? 4 : Math.round(g.ox + 30 * sz.s);
  const y0 = g.legendBelow ? g.height - h - 4 : Math.round(g.oy + (L.height - 14) * sz.s) - h;
  return (
    <g transform={`translate(${x0} ${y0})`} aria-hidden="true">
      <rect class="sc-legend" x={0.5} y={0.5} width={w - 1} height={h - 1} />
      <text class="sc-caps" x={6} y={11}>
        LEGEND
      </text>
      <line class="sc-head-rule" x1={1} y1={15.5} x2={w - 1} y2={15.5} />
      {rows.map((r, i) => {
        const cx = 8 + Math.floor(i / perCol) * colW;
        const cy = 25 + (i % perCol) * rowH;
        return (
          <g key={r.text} transform={`translate(${cx} 0)`}>
            {r.draw(cy)}
            <text class="sc-ui" x={lane + 12} y={cy + 3}>
              {r.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Static layer                                                        */
/* ------------------------------------------------------------------ */

interface Handlers {
  link: (key: string) => void;
  node: (id: string) => void;
}

interface StaticProps {
  g: Geometry;
  network: DiagramNetwork;
  occupancy: Record<string, Occupancy> | undefined;
  selected: string | null;
  hatch: string;
  handlers: Handlers;
}

const StaticLayer = memo(
  function StaticLayer({ g, network, occupancy, selected, hatch, handlers }: StaticProps) {
    const visible = g.links.filter((l) => linkVisible(l.link, network));
    const touched = new Set<string>();
    for (const l of visible) {
      touched.add(l.link.a);
      touched.add(l.link.b);
    }
    // Tram under rail, links under nodes, so station boxes cover the line ends.
    const tram = visible.filter((l) => l.link.kind === 'TRAM');
    const rail = visible.filter((l) => l.link.kind === 'RAIL');
    const draw = (l: LinkGeom) => (
      <LinkView key={l.link.key} g={l} sz={g.sz} occ={occupancy} selected={selected === l.link.key} hatch={hatch} onSelect={handlers.link} />
    );
    return (
      <g>
        <defs>
          <pattern id={hatch} patternUnits="userSpaceOnUse" width={4} height={4}>
            <rect class="sc-pat-bg" width={4} height={4} />
            <path class="sc-pat-ln" d="M-1 1L1 -1M0 4L4 0M3 5L5 3" />
          </pattern>
        </defs>
        <rect class="sc-bg" x={0} y={0} width={g.width} height={g.height} />
        <Legend g={g} hatch={hatch} showTram={network !== 'RAIL'} />
        {tram.map(draw)}
        {rail.map(draw)}
        {g.nodes
          .filter((n) => n.node.cls === 'ALPHA' || touched.has(n.node.id))
          .map((n) => (
            <NodeView key={n.node.id} n={n} sz={g.sz} selected={selected === n.node.id} onSelect={handlers.node} />
          ))}
        <Header width={g.width} compact={g.sz.compact} network={network} />
      </g>
    );
  },
  (a, b) =>
    a.g === b.g &&
    a.network === b.network &&
    a.selected === b.selected &&
    a.hatch === b.hatch &&
    a.handlers === b.handlers &&
    shallowEq(a.occupancy, b.occupancy),
);

/* ------------------------------------------------------------------ */
/* Trains                                                              */
/* ------------------------------------------------------------------ */

interface TrainProps {
  x: number;
  y: number;
  angle: number;
  nx: number;
  ny: number;
  rail: boolean;
  compact: boolean;
  text: string;
}

const Train = memo(function Train({ x, y, angle, nx, ny, rail, compact, text }: TrainProps) {
  const len = rail ? (compact ? 12 : 16) : compact ? 9 : 11;
  const ht = rail ? (compact ? 6 : 8) : compact ? 5 : 6;
  const a = len / 2;
  const b = ht / 2;
  const nose = Math.min(3, b);
  const ch = compact ? 4.8 : 5.4;
  const w = Math.ceil(text.length * ch + 6);
  const h = 11;
  const gap = 5;
  const dist = b + gap + (Math.abs(nx) * w) / 2 + (Math.abs(ny) * h) / 2;
  const bx = Math.round(nx * dist - w / 2);
  const by = Math.round(ny * dist - h / 2);
  return (
    <g transform={`translate(${x} ${y})`}>
      <line class="sc-leader" x1={nx * b} y1={ny * b} x2={nx * (b + gap)} y2={ny * (b + gap)} />
      <path class="sc-consist" transform={`rotate(${angle})`} d={`M${-a} ${-b}H${a - nose}L${a} 0L${a - nose} ${b}H${-a}Z`} />
      <rect class="sc-berth" x={bx + 0.5} y={by + 0.5} width={w - 1} height={h - 1} />
      <text class="sc-berth-t" x={bx + w / 2} y={by + 8} text-anchor="middle">
        {text}
      </text>
    </g>
  );
});

function TrainLayer({ g, trains, network }: { g: Geometry; trains: SchematicTrain[]; network: DiagramNetwork }) {
  return (
    <g class="sc-trains" aria-hidden="true">
      {trains.map((t) => {
        const r = resolveLink(t.link);
        if (!r || !linkVisible(r.link, network)) return null;
        const lg = g.byKey.get(r.link.key);
        if (!lg) return null;
        const s = sampleAt(lg.poly, r.reversed ? 1 - t.pos : t.pos);
        const sign = (r.reversed ? -1 : 1) * t.dir;
        const [tnx, tny] = tagNormal(s.ux, s.uy, r.link.flip);
        return (
          <Train
            key={t.id}
            x={Math.round(s.x)}
            y={Math.round(s.y)}
            angle={Math.round((Math.atan2(s.uy * sign, s.ux * sign) * 180) / Math.PI)}
            nx={-tnx}
            ny={-tny}
            rail={t.kind === 'RAIL'}
            compact={g.sz.compact}
            text={t.suppressed ? '#'.repeat(Math.max(4, t.label.length)) : t.label}
          />
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* LineDiagram                                                         */
/* ------------------------------------------------------------------ */

const NO_TRAINS: SchematicTrain[] = [];

export function LineDiagram({ width, height, network = 'ALL', trains = NO_TRAINS, occupancy, selected = null, onSelectLink, onSelectNode, blockCounts }: LineDiagramProps) {
  // Keyed by value so an inline object literal does not rebuild the geometry each render.
  const countsKey = blockCounts ? JSON.stringify(blockCounts) : '';
  const g = useMemo(() => buildGeometry(width, height, blockCounts), [width, height, countsKey]);
  const uid = useId();
  const hatch = `sc-hatch-${uid.replace(/[^A-Za-z0-9_-]/g, '')}`;

  // Handlers are read through a ref so a new callback identity does not redraw the track.
  const cb = useRef({ onSelectLink, onSelectNode });
  cb.current = { onSelectLink, onSelectNode };
  const handlers = useMemo<Handlers>(
    () => ({
      link: (key) => cb.current.onSelectLink?.(key),
      node: (id) => cb.current.onSelectNode?.(id),
    }),
    [],
  );

  const { sz } = g;
  const vars = {
    '--sc-ro': `${sz.railO}px`,
    '--sc-ri': `${sz.railI}px`,
    '--sc-tr': `${sz.tram}px`,
    '--sc-tro': `${sz.tramOcc}px`,
    '--sc-dk': `${sz.dark}px`,
    '--sc-dash': sz.compact ? '6 4' : '10 6',
  } as CSSProperties;

  return (
    <svg
      class={sz.compact ? 'sc-root sc-compact' : 'sc-root'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Line diagram of maglev rail segments and tram networks. Schematic, not to scale."
      style={vars}
    >
      <StaticLayer g={g} network={network} occupancy={occupancy} selected={selected} hatch={hatch} handlers={handlers} />
      <TrainLayer g={g} trains={trains} network={network} />
    </svg>
  );
}

export default LineDiagram;
