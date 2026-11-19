/**
 * Org chart layout: d3-hierarchy tidy tree over a derived "layout tree".
 *
 * Children that are not themselves expanded hang beneath their parent in columns
 * (a spine on the left, one tick per box), the way HR chart exports list staff.
 * A column is fed to d3 as a chain (each box the only child of the one above),
 * so the tidy tree reserves the column's full depth and nothing is laid under it.
 */
import { hierarchy, tree } from 'd3-hierarchy';
import type { OrgNode } from './model';

export const BOX_W = 184;
export const BOX_H = 50;
export const LEVEL = 70; // row pitch
export const GAP_X = 14;
export const INDENT = 14; // hanging boxes sit this far right of their spine
export const SEAT_W = 102;
export const SEAT_H = 36;
export const SEAT_GAP = 6;
export const SEAT_DROP = 26; // seat row bottom to council box top

interface LNode {
  n: OrgNode;
  hung: boolean;
  kids: LNode[];
}

export interface Placed {
  n: OrgNode;
  x: number; // left
  y: number; // top
  hung: boolean;
  open: boolean;
  expandable: boolean;
}

export interface Layout {
  boxes: Placed[];
  byId: Map<string, Placed>;
  /** SVG path data for all connectors. */
  links: string;
  /** Centre x of the root box. */
  rootX: number;
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

const isOpen = (n: OrgNode, open: ReadonlySet<string>): boolean => n.children.length > 0 && open.has(n.id);

function derive(n: OrgNode, open: ReadonlySet<string>, hung: boolean): LNode {
  const l: LNode = { n, hung, kids: [] };
  if (!isOpen(n, open)) return l;
  if (n.stackRows <= 0) {
    l.kids = n.children.map((c) => derive(c, open, false));
    return l;
  }
  const flat = n.children.filter((c) => !isOpen(c, open));
  const wide = n.children.filter((c) => isOpen(c, open));
  if (flat.length > 0) {
    const cols = Math.ceil(flat.length / n.stackRows);
    const per = Math.ceil(flat.length / cols);
    for (let i = 0; i < flat.length; i += per) {
      let tail: LNode | null = null;
      for (const c of flat.slice(i, i + per)) {
        const link: LNode = { n: c, hung: true, kids: [] };
        if (tail) tail.kids.push(link);
        else l.kids.push(link);
        tail = link;
      }
    }
  }
  for (const c of wide) l.kids.push(derive(c, open, false));
  return l;
}

const px = (v: number): number => Math.round(v) + 0.5;

export function computeLayout(root: OrgNode, open: ReadonlySet<string>, seats: number): Layout {
  const h = hierarchy<LNode>(derive(root, open, false), (d) => d.kids);
  const widthOf = (d: LNode): number => (d.hung ? BOX_W + INDENT : BOX_W);
  tree<LNode>()
    .nodeSize([1, LEVEL])
    .separation((a, b) => (widthOf(a.data) + widthOf(b.data)) / 2 + (a.parent === b.parent ? GAP_X : GAP_X * 2))(h);

  const boxes: Placed[] = [];
  const byId = new Map<string, Placed>();
  const d: string[] = [];
  const bounds = { x0: Infinity, y0: 0, x1: -Infinity, y1: 0 };
  const colW = BOX_W + INDENT;

  h.each((nd) => {
    const cx = Math.round(nd.x ?? 0);
    const y = nd.y ?? 0;
    const l = nd.data;
    const x = l.hung ? cx - colW / 2 + INDENT : cx - BOX_W / 2;
    const p: Placed = { n: l.n, x, y, hung: l.hung, open: isOpen(l.n, open), expandable: l.n.children.length > 0 };
    boxes.push(p);
    byId.set(l.n.id, p);
    bounds.x0 = Math.min(bounds.x0, l.hung ? cx - colW / 2 : x);
    bounds.x1 = Math.max(bounds.x1, x + BOX_W);
    bounds.y1 = Math.max(bounds.y1, y + BOX_H);

    if (l.hung || !nd.children) return;
    const busY = px(y + BOX_H + (LEVEL - BOX_H) / 2);
    for (const c of nd.children) {
      const ccx = Math.round(c.x ?? 0);
      if (!c.data.hung) {
        d.push(`M${px(cx)} ${y + BOX_H}V${busY}H${px(ccx)}V${c.y ?? 0}`);
        continue;
      }
      // hanging column: spine down the left, one tick per box
      const sx = px(ccx - colW / 2 + 3);
      const left = ccx - colW / 2 + INDENT;
      let last = c;
      const ticks: string[] = [];
      for (let e: typeof c | undefined = c; e; e = e.children?.[0]) {
        last = e;
        ticks.push(`M${sx} ${px((e.y ?? 0) + BOX_H / 2)}H${left}`);
      }
      d.push(`M${px(cx)} ${y + BOX_H}V${busY}H${sx}V${px((last.y ?? 0) + BOX_H / 2)}`, ...ticks);
    }
  });

  const rootX = Math.round(h.x ?? 0);
  if (seats > 0) {
    const total = seats * SEAT_W + (seats - 1) * SEAT_GAP;
    const sx0 = rootX - total / 2;
    const top = -(SEAT_DROP + SEAT_H);
    const busY = px(-SEAT_DROP / 2);
    for (let i = 0; i < seats; i++) {
      const c = px(sx0 + i * (SEAT_W + SEAT_GAP) + SEAT_W / 2);
      d.push(`M${c} ${-SEAT_DROP}V${busY}`);
    }
    d.push(`M${px(sx0 + SEAT_W / 2)} ${busY}H${px(sx0 + total - SEAT_W / 2)}`, `M${px(rootX)} ${busY}V0`);
    bounds.x0 = Math.min(bounds.x0, sx0);
    bounds.x1 = Math.max(bounds.x1, sx0 + total);
    bounds.y0 = top;
  }
  return { boxes, byId, links: d.join(''), rootX, bounds };
}

/** Left edge of seat `i` (0-based) for a row of `seats` centred on rootX. */
export function seatX(i: number, seats: number, rootX: number): number {
  const total = seats * SEAT_W + (seats - 1) * SEAT_GAP;
  return rootX - total / 2 + i * (SEAT_W + SEAT_GAP);
}
