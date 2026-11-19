/**
 * @graphics/org: organisation chart and tier pyramid.
 *
 *   OrgChart({ root?, sessionTier, onSelectPerson?, onSelectUnit?, width?, height? })
 *   TierPyramid({ width, height, highlightTier? })
 *
 * The chart is laid out with d3-hierarchy (tidy tree, see layout.ts) and drawn
 * as plain boxes over one SVG of hairline elbow connectors. All names, numbers
 * and counts come from canon (model.ts).
 */
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BOX_H, BOX_W, SEAT_DROP, SEAT_H, SEAT_W, computeLayout, seatX } from './layout';
import type { Layout, Placed } from './layout';
import { UNPOSTED_REFUSAL, buildModel, canon, nameWithheld } from './model';
import type { OrgNode, OrgRoot } from './model';
import './org.css';

export { TierPyramid } from './TierPyramid';
export type { TierPyramidProps } from './TierPyramid';
export type { OrgNode, OrgNodeKind, OrgRoot } from './model';

export interface OrgChartProps {
  /** 'COUNCIL' (default), a division id ("RD") or a facility id ("ALPHA-03"). */
  root?: OrgRoot;
  /** The session's tier (1 highest). Names of people with tier < sessionTier are withheld. */
  sessionTier: number;
  /** Personnel number of the box (or unit head line) activated. */
  onSelectPerson?: (pn: string) => void;
  /** Division id, facility id, class id, or COUNCIL / DIVISIONS / FACILITIES / ACCOUNTING / POSTED. */
  onSelectUnit?: (unitId: string) => void;
  /** Fixed size in px. Omitted: the chart fills its container. */
  width?: number;
  height?: number;
}

interface View {
  k: number;
  tx: number;
  ty: number;
}

const K_MIN = 0.25;
const K_MAX = 2;
const PAD = 20;
const BAR_H = 30;
const PAN_STEP = 48;
const ZOOM_STEP = 1.2;

const clampK = (k: number): number => Math.min(K_MAX, Math.max(K_MIN, k));

function fitView(l: Layout, vw: number, vh: number): View {
  const bw = l.bounds.x1 - l.bounds.x0;
  const bh = l.bounds.y1 - l.bounds.y0;
  const availW = Math.max(1, vw - PAD * 2);
  const availH = Math.max(1, vh - BAR_H - PAD * 2);
  const k = clampK(Math.min(availW / bw, availH / bh, 1));
  return {
    k,
    tx: Math.round((vw - bw * k) / 2 - l.bounds.x0 * k),
    ty: Math.round(BAR_H + PAD - l.bounds.y0 * k),
  };
}

/** A black bar the length of the withheld name. The name itself is not rendered. */
function WithheldName({ length }: { length: number }): JSX.Element {
  return (
    <span class="org-rx" style={{ width: `${Math.min(26, Math.max(4, length)) * 0.53}em` }} role="img" aria-label="Name withheld" />
  );
}

export function OrgChart(props: OrgChartProps): JSX.Element {
  const { root, sessionTier, onSelectPerson, onSelectUnit, width, height } = props;
  const model = useMemo(() => buildModel(root), [root]);
  // Expansion state belongs to one chart; a new root starts from that chart's defaults.
  const [exp, setExp] = useState<{ model: typeof model; open: ReadonlySet<string> }>(() => ({ model, open: new Set(model.open) }));
  const open = useMemo(() => (exp.model === model ? exp.open : new Set(model.open)), [exp, model]);
  const setOpen = (next: ReadonlySet<string>): void => setExp({ model, open: next });
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: width ?? 0, h: height ?? 0 });
  const [refusal, setRefusal] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const seats = model.seats ? canon.council.seats : [];

  const layout = useMemo(() => computeLayout(model.root, open, seats.length), [model, open, seats.length]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => setRefusal(false), [model]);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = (): void => setSize({ w: width ?? el.clientWidth, h: height ?? el.clientHeight });
    measure();
    if ((width != null && height != null) || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height]);

  const fit = (): void => {
    if (size.w > 0 && size.h > 0) setView(fitView(layoutRef.current, size.w, size.h));
  };
  // Fit when the chart or the viewport changes; expanding a node does not refit.
  useLayoutEffect(fit, [model, size.w, size.h]);

  const zoomAt = (factor: number, cx: number, cy: number): void =>
    setView((v) => {
      const k = clampK(v.k * factor);
      const r = k / v.k;
      return { k, tx: Math.round(cx - (cx - v.tx) * r), ty: Math.round(cy - (cy - v.ty) * r) };
    });
  const zoom = (factor: number): void => zoomAt(factor, size.w / 2, size.h / 2);
  const pan = (dx: number, dy: number): void => setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toggle = (id: string): void => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Keep the toggled box where it is on screen.
    const before = layout.byId.get(id);
    const after = computeLayout(model.root, next, seats.length).byId.get(id);
    if (before && after) {
      setView((v) => ({ ...v, tx: Math.round(v.tx + (before.x - after.x) * v.k), ty: Math.round(v.ty + (before.y - after.y) * v.k) }));
    }
    setRefusal(false);
    setOpen(next);
  };

  const activate = (n: OrgNode): void => {
    if (n.kind === 'unposted') {
      setRefusal((r) => !r);
      return;
    }
    setRefusal(false);
    if (n.kind === 'person' && n.person) onSelectPerson?.(n.person.pn);
    else if (n.unitId) onSelectUnit?.(n.unitId);
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let used = true;
    switch (e.key) {
      case 'ArrowLeft': pan(PAN_STEP, 0); break;
      case 'ArrowRight': pan(-PAN_STEP, 0); break;
      case 'ArrowUp': pan(0, PAN_STEP); break;
      case 'ArrowDown': pan(0, -PAN_STEP); break;
      case '+': case '=': zoom(ZOOM_STEP); break;
      case '-': case '_': zoom(1 / ZOOM_STEP); break;
      case '0': case 'f': case 'F': fit(); break;
      case 'Escape': if (refusal) setRefusal(false); else used = false; break;
      default: used = false;
    }
    if (used) e.preventDefault();
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest('.org-bar')) return;
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
  };
  const onPointerMove = (e: PointerEvent): void => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;
      d.moved = true;
      host.current?.setPointerCapture(e.pointerId);
    }
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onPointerUp = (): void => {
    if (drag.current?.moved) swallowClick.current = true;
    drag.current = null;
  };
  const onClickCapture = (e: MouseEvent): void => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  const box = (p: Placed): JSX.Element => {
    const n = p.n;
    const unit = n.kind !== 'person';
    const withheld = n.person ? nameWithheld(n.person, sessionTier) : false;
    const headPn = unit && n.person ? n.person.pn : null;
    return (
      <div
        key={n.id}
        class={`org-box org-box--${n.kind}${unit ? ' is-unit' : ''}${p.hung ? ' is-hung' : ''}`}
        style={{ left: `${p.x}px`, top: `${p.y}px`, width: `${BOX_W}px`, height: `${BOX_H}px` }}
        data-node={n.id}
      >
        <button type="button" class="org-box__main" onClick={() => activate(n)} title={n.title.replace(/\s+/g, ' ')}>
          <span class="org-box__title">{n.title}</span>
          <span class="org-box__name">
            {n.person ? (
              withheld ? (
                <WithheldName length={n.person.name.length} />
              ) : (
                <>
                  {n.person.rank ? <span class="org-box__rank">{n.person.rank} </span> : null}
                  {n.person.name}
                </>
              )
            ) : (
              n.nameText
            )}
          </span>
          <span class="org-box__pn">
            <span class="org-mono">{n.mono}</span>
            <span class="org-box__meta">{n.meta}</span>
          </span>
        </button>
        {headPn && onSelectPerson ? (
          <button type="button" class="org-box__head" onClick={() => onSelectPerson(headPn)} aria-label={`Open personnel record ${headPn}`} />
        ) : null}
        {p.expandable ? (
          <button
            type="button"
            class="org-box__tg"
            aria-expanded={p.open}
            aria-label={`${p.open ? 'Collapse' : 'Expand'} ${n.title.replace(/\s+/g, ' ')}`}
            onClick={() => toggle(n.id)}
          >
            <span class={p.open ? 'org-tg-minus' : 'org-tg-plus'} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  };

  const unposted = refusal ? layout.byId.get('acct:unposted') : undefined;

  return (
    <div
      ref={host}
      class="org"
      style={{ width: width != null ? `${width}px` : '100%', height: height != null ? `${height}px` : '100%' }}
      tabIndex={0}
      role="group"
      aria-label="Organisation chart. Arrow keys pan, plus and minus zoom, F fits the chart to the window."
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <div class="org-layer" style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})` }}>
        <svg class="org-links" width="1" height="1" aria-hidden="true" focusable="false">
          <path d={layout.links} />
        </svg>
        {seats.map((s, i) => (
          <div
            key={`seat-${s.seat}`}
            class="org-seat"
            style={{
              left: `${seatX(i, seats.length, layout.rootX)}px`,
              top: `${-(SEAT_DROP + SEAT_H)}px`,
              width: `${SEAT_W}px`,
              height: `${SEAT_H}px`,
            }}
          >
            <span class="org-seat__no org-mono">SEAT {String(s.seat).padStart(2, '0')}</span>
            <span class="org-seat__cat">{s.category}</span>
          </div>
        ))}
        {layout.boxes.map(box)}
        {unposted ? (
          <div class="org-refusal" role="status" style={{ left: `${unposted.x}px`, top: `${unposted.y + BOX_H + 4}px`, width: `${BOX_W + 40}px` }}>
            {UNPOSTED_REFUSAL}
          </div>
        ) : null}
      </div>
      <div class="org-bar" role="toolbar" aria-label="Chart view">
        <button type="button" class="org-btn org-btn--sq" onClick={() => zoom(ZOOM_STEP)} aria-label="Zoom in" title="Zoom in (+)">
          <span class="org-tg-plus" aria-hidden="true" />
        </button>
        <button type="button" class="org-btn org-btn--sq" onClick={() => zoom(1 / ZOOM_STEP)} aria-label="Zoom out" title="Zoom out (-)">
          <span class="org-tg-minus" aria-hidden="true" />
        </button>
        <button type="button" class="org-btn" onClick={fit} title="Fit chart to window (F)">
          Fit
        </button>
        <span class="org-bar__zoom org-mono" aria-live="off">
          {Math.round(view.k * 100)}%
        </span>
      </div>
    </div>
  );
}
