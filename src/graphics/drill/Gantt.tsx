/**
 * Seal drill timeline: one row per site, drill minutes across. Each row fills from the left as
 * the drill runs: receipt tick, waiting for acknowledgement (outline), door cycle (grey),
 * checks to the seal report (dark), sealed mark. Nothing is drawn ahead of the drill clock.
 * The class seal time is a short dashed stop on each row so a late report reads at a glance.
 */
import { useMemo } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import './drill-graphics.css';

export type GanttStatus = 'pending' | 'acknowledged' | 'sealing' | 'sealed' | 'no-report';

export interface GanttRow {
  id: string;
  label: string;
  /** Short qualifier drawn after the label (class letter or relay). */
  sub?: string;
  receipt: number;
  ack: number | null;
  doorsDone: number | null;
  sealed: number | null;
  deadline: number;
  /** receipt + class seal time. */
  sealBy: number;
  status: GanttStatus;
  /** Order never passed (circuits down). */
  cut?: boolean;
}

export interface GanttProps {
  rows: readonly GanttRow[];
  width: number;
  /** Drill minute of the clock (rows fill up to here). Null before any drill. */
  now: number | null;
  /** Last minute on the axis. */
  span: number;
  selected?: string | null;
  onSelect?: (id: string) => void;
  /** Accessible summary. */
  label: string;
  /** Status words per status (the app's vocabulary). */
  words: Record<GanttStatus, string>;
}

const ROW = 16;
const HEAD = 22;
const LABEL_W = 92;
const STATUS_W = 104;

export function Gantt({ rows, width, now, span, selected, onSelect, label, words }: GanttProps) {
  const plotW = Math.max(120, width - LABEL_W - STATUS_W - 22);
  const x = (m: number) => LABEL_W + Math.round((Math.max(-0.5, Math.min(span, m)) / span) * plotW);
  const height = HEAD + rows.length * ROW + 6;
  const ticks = useMemo(() => {
    const out: { m: number; major: boolean }[] = [];
    for (let m = 0; m <= span; m++) out.push({ m, major: m % 5 === 0 });
    return out;
  }, [span]);
  const t = now ?? -1;

  const onKey = (e: TargetedKeyboardEvent<SVGSVGElement>) => {
    if (!rows.length || !onSelect) return;
    const i = rows.findIndex((r) => r.id === selected);
    let n: number;
    if (e.key === 'ArrowDown') n = i < 0 ? 0 : Math.min(rows.length - 1, i + 1);
    else if (e.key === 'ArrowUp') n = i < 0 ? 0 : Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = rows.length - 1;
    else return;
    e.preventDefault();
    onSelect(rows[n]!.id);
  };

  return (
    <svg
      class="dg-gantt"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="listbox"
      aria-label={label}
      aria-activedescendant={selected ? `dg-row-${selected}` : undefined}
      tabIndex={0}
      onKeyDown={onKey}
    >
      <g class="dg-axis" aria-hidden="true">
        {ticks.map((k) => (
          <g key={k.m}>
            <line x1={x(k.m) + 0.5} x2={x(k.m) + 0.5} y1={k.major ? HEAD - 8 : HEAD - 4} y2={height - 4} class={k.major ? 'dg-grid-major' : 'dg-grid'} />
            {k.major && (
              <text x={x(k.m)} y={HEAD - 11} class="dg-axis-text" text-anchor="middle">
                {`T+${k.m}`}
              </text>
            )}
          </g>
        ))}
        <text x={4} y={HEAD - 11} class="dg-axis-text">
          SITE
        </text>
        <text x={width - STATUS_W + 4} y={HEAD - 11} class="dg-axis-text">
          STATUS
        </text>
      </g>
      {rows.map((r, i) => {
        const y = HEAD + i * ROW;
        const mid = y + ROW / 2;
        const reached = t >= r.receipt;
        const sel = r.id === selected;
        const seg = (a: number | null, b: number | null, cls: string) => {
          if (a === null || t < a) return null;
          const end = Math.min(t, b ?? t);
          if (end <= a) return null;
          return <rect x={x(a)} y={mid - 4} width={Math.max(1, x(end) - x(a))} height={8} class={cls} />;
        };
        const ackShown = r.ack !== null && t >= r.ack;
        return (
          <g
            key={r.id}
            id={`dg-row-${r.id}`}
            role="option"
            aria-selected={sel}
            aria-label={`${r.label}: ${words[r.status]}`}
            class={sel ? 'dg-row is-sel' : 'dg-row'}
            onClick={() => onSelect?.(r.id)}
          >
            <rect x={0} y={y} width={width} height={ROW} class="dg-row-bg" />
            <text x={4} y={mid + 3.5} class="dg-label">
              {r.label}
            </text>
            {r.sub && (
              <text x={LABEL_W - 6} y={mid + 3.5} class="dg-sub" text-anchor="end">
                {r.sub}
              </text>
            )}
            <line x1={x(r.sealBy) + 0.5} x2={x(r.sealBy) + 0.5} y1={mid - 6} y2={mid + 6} class="dg-sealby" />
            {/* waiting for acknowledgement */}
            {reached && !r.cut && seg(r.receipt, r.ack ?? r.deadline, 'dg-wait')}
            {/* door cycle and checks (an acknowledgement can precede the receipt) */}
            {ackShown && seg(r.ack, r.doorsDone ?? r.deadline, r.doorsDone === null ? 'dg-held' : 'dg-doors')}
            {ackShown && r.doorsDone !== null && seg(r.doorsDone, r.sealed ?? r.deadline, 'dg-checks')}
            {t >= r.receipt && <line x1={x(r.receipt) + 0.5} x2={x(r.receipt) + 0.5} y1={mid - 7} y2={mid + 7} class={r.cut ? 'dg-receipt is-cut' : 'dg-receipt'} />}
            {ackShown && <path d={`M${x(r.ack!)} ${mid - 7}l3 3h-6z`} class="dg-ackmark" />}
            {r.sealed !== null && t >= r.sealed && <rect x={x(r.sealed) - 3} y={mid - 3} width={7} height={7} class="dg-sealmark" />}
            {r.status === 'no-report' && (
              <path d={`M${x(r.deadline) - 3} ${mid - 3}l7 7m0 -7l-7 7`} class="dg-nomark" />
            )}
            <rect x={width - STATUS_W + 4} y={mid - 4} width={9} height={9} class={`dg-sq dg-sq--${r.status}`} />
            <text x={width - STATUS_W + 17} y={mid + 3.5} class="dg-status">
              {words[r.status]}
            </text>
          </g>
        );
      })}
      {now !== null && now >= 0 && (
        <g aria-hidden="true">
          <line x1={x(now) + 0.5} x2={x(now) + 0.5} y1={HEAD - 4} y2={height - 2} class="dg-now" />
        </g>
      )}
    </svg>
  );
}

/** Height the Gantt needs for `n` rows. */
export const ganttHeight = (n: number) => HEAD + n * ROW + 6;
