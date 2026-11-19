/**
 * Jack field of a voice-frequency / data patch bay, front elevation, in the panel kit's register
 * (flat fills, 1px bevels, engraved capitals, tokens only). Each circuit is a column: designation
 * strip, busy lamp, LINE jack over EQPT jack, with the normal-through mark between them when no
 * cord breaks the normal. Columns wrap into strips of `perStrip`. A utility strip (test set,
 * operator position, monitor, loop plug) sits below. Cords hang between jacks as sagging curves.
 *
 * Controlled: the app owns selection and cords. Pointer: click a jack to select it, click a second
 * jack to patch (the app decides), or drag from one jack to another. Click a cord to select it.
 * Keyboard: one tab stop; arrows move between jacks, Enter or Space selects, Delete removes the
 * cord at the focused jack, Escape clears the selection.
 */
import type { TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useId, useMemo, useRef, useState } from 'preact/hooks';
import './patch.css';

export type JackLamp = 'busy' | 'idle' | 'dark' | 'test';
export type CordKind = 'repatch' | 'test' | 'call' | 'monitor' | 'loop';

export interface JackColumn {
  /** Circuit id, the column key. */
  id: string;
  /** Jack ids, line side then equipment side. */
  jacks: readonly [string, string];
  /** Two short lines on the designation strip (circuit id, far end). */
  lines: readonly [string, string];
  /** Designation not released to this reader: the strip is masked. */
  withheld?: boolean;
  /** Pencilled note on the strip. */
  pencil?: string | null;
  lamp: JackLamp;
  /** Normal-through (no cord in either jack). */
  normal: boolean;
}

export interface JackUtility {
  id: string;
  legend: string;
}

export interface JackCord {
  id: string;
  a: string;
  b: string;
  kind: CordKind;
  /** Drawn with a tag: a repatch made without an order. */
  flagged?: boolean;
  tag?: string;
}

export interface JackFieldProps {
  /** Engraved bay title, e.g. "HCP-A03  HUB CIRCUIT PATCH BAY". */
  title: string;
  perStrip: number;
  columns: readonly JackColumn[];
  utilities: readonly JackUtility[];
  cords: readonly JackCord[];
  selectedJack: string | null;
  selectedCord: string | null;
  /** Jacks drawn dimmed and not selectable (withheld circuits). */
  inert?: ReadonlySet<string>;
  label: string;
  onJack(id: string): void;
  onDrop(a: string, b: string): void;
  onCord(id: string): void;
  onDelete?(jackId: string): void;
  onEscape?(): void;
}

const LEFT = 44;
const COL = 40;
const PAD = 10;
const STRIP_H = 30;
const LAMP_Y = 40;
const L_Y = 62;
const E_Y = 92;
const BLOCK_H = 118;
const UTIL_H = 64;
const JACK = 20;

interface Pos {
  x: number;
  y: number;
}

export function JackField(props: JackFieldProps) {
  const { columns, utilities, cords, perStrip, selectedJack, selectedCord, inert } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId();
  const [focusIdx, setFocusIdx] = useState(0);
  const [drag, setDrag] = useState<{ from: string; at: Pos; moved: boolean } | null>(null);

  const strips = Math.max(1, Math.ceil(columns.length / perStrip));
  const width = LEFT + perStrip * COL + PAD;
  const utilTop = 34 + strips * BLOCK_H + 8;
  const height = utilTop + UTIL_H;
  const utilW = Math.min(90, Math.floor((width - LEFT - PAD) / Math.max(1, utilities.length)));

  /** Jack positions and keyboard order (row-major within each strip, then utilities). */
  const layout = useMemo(() => {
    const pos = new Map<string, Pos>();
    const order: { id: string; row: number; col: number }[] = [];
    columns.forEach((c, i) => {
      const s = Math.floor(i / perStrip);
      const k = i % perStrip;
      const x = LEFT + k * COL + COL / 2;
      const top = 34 + s * BLOCK_H;
      pos.set(c.jacks[0], { x, y: top + L_Y });
      pos.set(c.jacks[1], { x, y: top + E_Y });
    });
    for (let s = 0; s < strips; s++) {
      for (const side of [0, 1] as const) {
        for (let k = 0; k < perStrip; k++) {
          const c = columns[s * perStrip + k];
          if (c) order.push({ id: c.jacks[side], row: s * 2 + side, col: k });
        }
      }
    }
    utilities.forEach((u, i) => {
      const x = LEFT + i * utilW + utilW / 2;
      pos.set(u.id, { x, y: utilTop + 30 });
      order.push({ id: u.id, row: strips * 2, col: Math.round((i * utilW) / COL) });
    });
    return { pos, order };
  }, [columns, utilities, perStrip, strips, utilW, utilTop]);

  const occupied = new Map<string, JackCord>();
  for (const c of cords) {
    occupied.set(c.a, c);
    occupied.set(c.b, c);
  }

  const focusId = layout.order[Math.min(focusIdx, layout.order.length - 1)]?.id;

  const toSvg = (e: PointerEvent): Pos | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  };

  const jackAt = (e: PointerEvent): string | null => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null;
    return el?.closest('[data-jack]')?.getAttribute('data-jack') ?? null;
  };

  const onPointerDown = (id: string) => (e: TargetedPointerEvent<SVGGElement>) => {
    if (e.button !== 0 || inert?.has(id)) return;
    const at = toSvg(e as unknown as PointerEvent);
    svgRef.current?.setPointerCapture?.(e.pointerId);
    // An SVG child does not take focus on click: move it to the field so the keyboard follows the pointer.
    svgRef.current?.focus({ preventScroll: true });
    setFocusIdx(Math.max(0, layout.order.findIndex((o) => o.id === id)));
    setDrag({ from: id, at: at ?? layout.pos.get(id)!, moved: false });
  };

  const onPointerMove = (e: TargetedPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const at = toSvg(e as unknown as PointerEvent);
    if (!at) return;
    const start = layout.pos.get(drag.from)!;
    const moved = drag.moved || Math.hypot(at.x - start.x, at.y - start.y) > 8;
    setDrag({ ...drag, at, moved });
  };

  const onPointerUp = (e: TargetedPointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const target = jackAt(e as unknown as PointerEvent);
    const from = drag.from;
    const moved = drag.moved;
    setDrag(null);
    if (!moved) {
      props.onJack(from);
      return;
    }
    if (target && target !== from && !inert?.has(target)) props.onDrop(from, target);
  };

  const onKeyDown = (e: TargetedKeyboardEvent<SVGSVGElement>) => {
    const cur = layout.order[focusIdx];
    if (!cur) return;
    const move = (dr: number, dc: number) => {
      const rows = layout.order.filter((o) => o.row === cur.row + dr);
      if (dr === 0) {
        const i = focusIdx + dc;
        if (i >= 0 && i < layout.order.length) setFocusIdx(i);
        return;
      }
      if (!rows.length) return;
      const best = rows.reduce((a, b) => (Math.abs(b.col - cur.col) < Math.abs(a.col - cur.col) ? b : a));
      setFocusIdx(layout.order.indexOf(best));
    };
    switch (e.key) {
      case 'ArrowRight':
        move(0, 1);
        break;
      case 'ArrowLeft':
        move(0, -1);
        break;
      case 'ArrowDown':
        move(1, 0);
        break;
      case 'ArrowUp':
        move(-1, 0);
        break;
      case 'Home':
        setFocusIdx(0);
        break;
      case 'End':
        setFocusIdx(layout.order.length - 1);
        break;
      case 'Enter':
      case ' ':
        if (!inert?.has(cur.id)) props.onJack(cur.id);
        break;
      case 'Delete':
      case 'Backspace':
        props.onDelete?.(cur.id);
        break;
      case 'Escape':
        props.onEscape?.();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const cordPath = (a: Pos, b: Pos): string => {
    const sag = 26 + Math.min(70, Math.abs(a.x - b.x) * 0.18 + Math.abs(a.y - b.y) * 0.1);
    const low = Math.max(a.y, b.y) + sag;
    return `M${a.x} ${a.y} C${a.x} ${low} ${b.x} ${low} ${b.x} ${b.y}`;
  };

  const jackName = (id: string, base: string): string => {
    const c = occupied.get(id);
    if (!c) return `${base}, no cord`;
    const other = c.a === id ? c.b : c.a;
    return `${base}, cord to ${nameOf(other)}${c.flagged ? ', made without order' : ''}`;
  };
  const nameOf = (id: string): string => {
    const u = utilities.find((x) => x.id === id);
    if (u) return u.legend;
    const col = columns.find((c) => c.jacks.includes(id));
    if (!col) return id;
    return `${col.withheld ? 'withheld circuit' : col.id} ${col.jacks[0] === id ? 'line' : 'equipment'}`;
  };

  const renderJack = (id: string, p: Pos, base: string, dim: boolean) => {
    const sel = selectedJack === id;
    const plug = occupied.get(id);
    const focused = focusId === id;
    return (
      <g
        key={id}
        data-jack={id}
        class={`pt-jack${sel ? ' is-selected' : ''}${dim ? ' is-inert' : ''}${focused ? ' is-focus' : ''}`}
        role="button"
        aria-label={jackName(id, base)}
        aria-pressed={sel}
        aria-disabled={dim || undefined}
        onPointerDown={onPointerDown(id)}
      >
        <rect x={p.x - JACK / 2} y={p.y - JACK / 2} width={JACK} height={JACK} class="pk-f-face" />
        <path d={`M${p.x - JACK / 2 + 0.5} ${p.y + JACK / 2 - 0.5} V${p.y - JACK / 2 + 0.5} H${p.x + JACK / 2 - 0.5}`} class="pk-s-hi pk-nofill" />
        <path d={`M${p.x - JACK / 2 + 0.5} ${p.y + JACK / 2 - 0.5} H${p.x + JACK / 2 - 0.5} V${p.y - JACK / 2 + 0.5}`} class="pk-s-sh pk-nofill" />
        <circle cx={p.x} cy={p.y} r={6} class="pt-jack__ring" />
        <circle cx={p.x} cy={p.y} r={3.5} class="pt-jack__hole" />
        {plug ? <rect x={p.x - 5} y={p.y - 5} width={10} height={10} class={`pt-plug pt-plug--${plug.kind}`} /> : null}
        {sel ? <rect x={p.x - JACK / 2 - 3} y={p.y - JACK / 2 - 3} width={JACK + 6} height={JACK + 6} class="pt-jack__sel" /> : null}
        {focused ? <rect x={p.x - JACK / 2 - 2} y={p.y - JACK / 2 - 2} width={JACK + 4} height={JACK + 4} class="pt-jack__focus" /> : null}
      </g>
    );
  };

  const stripRows = [];
  for (let s = 0; s < strips; s++) {
    const top = 34 + s * BLOCK_H;
    const cols = columns.slice(s * perStrip, (s + 1) * perStrip);
    stripRows.push(
      <g key={`s${s}`}>
        <rect x={4} y={top - 2} width={width - 8} height={BLOCK_H - 8} class="pt-strip-bg" />
        <text x={LEFT - 6} y={top + 13} class="pt-engr" text-anchor="end">DESIG</text>
        <text x={LEFT - 6} y={top + LAMP_Y + 3} class="pt-engr" text-anchor="end">BUSY</text>
        <text x={LEFT - 6} y={top + L_Y + 3} class="pt-engr" text-anchor="end">LINE</text>
        <text x={LEFT - 6} y={top + E_Y + 3} class="pt-engr" text-anchor="end">EQPT</text>
        {cols.map((c, k) => {
          const x = LEFT + k * COL;
          const cxm = x + COL / 2;
          const dim = !!inert?.has(c.jacks[0]);
          return (
            <g key={c.id}>
              <rect x={x + 2} y={top} width={COL - 4} height={STRIP_H} class="pt-desig" />
              {c.withheld ? (
                <rect x={x + 6} y={top + 9} width={COL - 12} height={12} class="pt-desig__rx" />
              ) : (
                <>
                  <text x={cxm} y={top + 12} class="pt-desig__t" text-anchor="middle">{c.lines[0]}</text>
                  <text x={cxm} y={top + 23} class="pt-desig__t2" text-anchor="middle">{c.lines[1]}</text>
                </>
              )}
              {c.pencil ? (
                <text x={cxm} y={top + 31} class="pt-pencil" text-anchor="middle" transform={`rotate(-4 ${cxm} ${top + 31})`}>
                  {c.pencil}
                </text>
              ) : null}
              <circle cx={cxm} cy={top + LAMP_Y} r={4.5} class={`pt-lamp pt-lamp--${c.lamp}`} role="img" aria-label={`${c.withheld ? 'Withheld circuit' : c.id} lamp ${c.lamp === 'busy' ? 'busy' : c.lamp === 'test' ? 'test' : c.lamp === 'dark' ? 'dark' : 'idle'}`} />
              {c.normal ? <line x1={cxm} y1={top + L_Y + JACK / 2 + 1} x2={cxm} y2={top + E_Y - JACK / 2 - 1} class="pt-normal" /> : null}
              {renderJack(c.jacks[0], { x: cxm, y: top + L_Y }, `${c.withheld ? 'Withheld circuit' : c.id} line jack`, dim)}
              {renderJack(c.jacks[1], { x: cxm, y: top + E_Y }, `${c.withheld ? 'Withheld circuit' : c.id} equipment jack`, dim)}
            </g>
          );
        })}
      </g>,
    );
  }

  const dragFrom = drag?.moved ? layout.pos.get(drag.from) : undefined;

  // Cords hang over the jacks, but a click on a jack must reach the jack: the cords' hit layer is
  // clipped with a hole over every jack (even-odd rule).
  const clipId = `pt-hit-${uid}`;
  const half = JACK / 2 + 2;
  const holes = [...layout.pos.values()].map((p) => `M${p.x - half} ${p.y - half}h${half * 2}v${half * 2}h${-half * 2}z`).join('');
  const hitClip = `M0 0H${width}V${height}H0z${holes}`;

  return (
    <svg
      ref={svgRef}
      class="pt-field"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="group"
      aria-label={props.label}
      tabindex={0}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <rect x={0.5} y={0.5} width={width - 1} height={height - 1} class="pt-bay" />
      <text x={10} y={20} class="pt-title">{props.title}</text>
      {stripRows}
      <g>
        <rect x={4} y={utilTop - 2} width={width - 8} height={UTIL_H - 6} class="pt-strip-bg" />
        {utilities.map((u, i) => {
          const p = layout.pos.get(u.id)!;
          return (
            <g key={u.id}>
              <rect x={p.x - utilW / 2 + 4} y={utilTop + 2} width={utilW - 8} height={12} class="pt-desig" />
              <text x={p.x} y={utilTop + 11} class="pt-desig__t2" text-anchor="middle">{u.legend}</text>
              {renderJack(u.id, p, `${u.legend} jack`, false)}
              <text x={p.x} y={utilTop + 54} class="pt-engr" text-anchor="middle">{`U${i + 1}`}</text>
            </g>
          );
        })}
      </g>
      <defs>
        <clipPath id={clipId}>
          <path d={hitClip} clip-rule="evenodd" />
        </clipPath>
      </defs>
      <g class="pt-cords">
        {cords.map((c) => {
          const a = layout.pos.get(c.a);
          const b = layout.pos.get(c.b);
          if (!a || !b) return null;
          const d = cordPath(a, b);
          const sel = selectedCord === c.id;
          const mid = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 20 + Math.min(52, Math.abs(a.x - b.x) * 0.135 + Math.abs(a.y - b.y) * 0.075) };
          return (
            <g key={c.id} class={`pt-cord pt-cord--${c.kind}${sel ? ' is-selected' : ''}`}>
              <path d={d} class="pt-cord__hit" clip-path={`url(#${clipId})`}onClick={() => props.onCord(c.id)} />
              <path d={d} class="pt-cord__line" />
              {c.flagged || c.tag ? (
                <g>
                  <rect x={mid.x - 26} y={mid.y - 7} width={52} height={12} class="pt-cord__tag" />
                  <text x={mid.x} y={mid.y + 2} class="pt-cord__tagt" text-anchor="middle">{c.tag ?? 'NO ORDER'}</text>
                </g>
              ) : null}
            </g>
          );
        })}
        {dragFrom && drag ? <path d={cordPath(dragFrom, drag.at)} class="pt-cord__drag" /> : null}
      </g>
    </svg>
  );
}
