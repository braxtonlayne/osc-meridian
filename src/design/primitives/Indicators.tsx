import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import './primitives.css';
import { clamp, cx } from '../util';

/* ---------------- StatusLight ---------------- */

export type OperStatus = 'NOMINAL' | 'DEGRADED' | 'FAULT' | 'OFFLINE';

export interface StatusLightProps {
  status: OperStatus;
  /** Override the word (still uppercase), e.g. "LINK UP". Defaults to the status itself. */
  word?: string;
  /** Short qualifier after the word, e.g. "since 0412Z". */
  note?: ComponentChildren;
}

/** 10px square + WORD. The colour never carries meaning on its own. */
export function StatusLight({ status, word, note }: StatusLightProps) {
  return (
    <span class={cx('status-light', `status-light--${status}`)}>
      <span class="status-light__sq" aria-hidden="true" />
      <span>{(word ?? status).toUpperCase()}</span>
      {note ? <span class="status-light__note">{note}</span> : null}
    </span>
  );
}

/* ---------------- ProgressBar ---------------- */

export interface ProgressBarProps {
  /** 0..max. Omit for an indeterminate "operation in progress" bar. */
  value?: number;
  max?: number;
  /** Accessible name and visible caption, e.g. "Compiling distribution list". */
  label: string;
  /** Show "n of max" / percentage text at the right of the caption. */
  showValue?: 'percent' | 'count' | false;
  /** Number of blocks. Default 24. */
  segments?: number;
}

/** Segmented-block progress bar. Fills a block at a time; never animates smoothly. */
export function ProgressBar({ value, max = 100, label, showValue = 'percent', segments = 24 }: ProgressBarProps) {
  const indeterminate = value === undefined;
  const frac = indeterminate ? 0 : clamp(value / (max || 1), 0, 1);
  const on = Math.floor(frac * segments);
  const trackRef = useRef<HTMLDivElement>(null);
  const [runW, setRunW] = useState(240);
  useEffect(() => {
    if (indeterminate && trackRef.current) setRunW(trackRef.current.clientWidth);
  }, [indeterminate]);
  const valueText = indeterminate
    ? 'In progress'
    : showValue === 'count'
      ? `${Math.round(value)} of ${max}`
      : `${Math.round(frac * 100)}%`;
  return (
    <div class="progress">
      <div class="progress__label">
        <span>{label}</span>
        {showValue !== false ? <span class="u-mono">{valueText}</span> : null}
      </div>
      <div
        ref={trackRef}
        class="progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuetext={valueText}
      >
        {indeterminate ? (
          <div class="progress__run" style={{ ['--run-w' as string]: `${runW}px` }}>
            <span class="progress__seg" />
            <span class="progress__seg" />
            <span class="progress__seg" />
          </div>
        ) : (
          Array.from({ length: segments }, (_, i) => <span key={i} class="progress__seg" data-on={i < on ? 'true' : 'false'} />)
        )}
      </div>
    </div>
  );
}

/* ---------------- PropertyGrid ---------------- */

export interface PropertyRow {
  label: string;
  value: ComponentChildren;
  mono?: boolean;
}

export interface PropertyGridProps {
  rows: PropertyRow[];
  /** Two key/value pairs per line for wide identity blocks. */
  columns?: 1 | 2;
  /** Optional caption bar across the top ("IDENTITY"). */
  caption?: string;
}

/** Key/value identity block: grey key column, white value column, ruled rows. */
export function PropertyGrid({ rows, columns = 1, caption }: PropertyGridProps) {
  return (
    <dl class={cx('pgrid', columns === 2 && 'pgrid--cols-2')}>
      {caption ? <div class="pgrid__caption">{caption}</div> : null}
      {rows.map((r, i) => (
        <div key={`${i}-${r.label}`} style={{ display: 'contents' }}>
          <dt class="pgrid__k">{r.label}</dt>
          <dd class={cx('pgrid__v', r.mono && 'is-mono')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- GroupBox ---------------- */

export interface GroupBoxProps {
  title: string;
  children: ComponentChildren;
  /** Background the title sits on: chrome (default), surface (white) or paper. */
  on?: 'chrome' | 'surface' | 'paper';
}

/** Etched frame with a caption, for grouping non-form content. */
export function GroupBox({ title, children, on = 'chrome' }: GroupBoxProps) {
  return (
    <section class={cx('groupbox', on === 'surface' && 'groupbox--surface', on === 'paper' && 'groupbox--paper')} aria-label={title}>
      <h3 class="groupbox__title">{title}</h3>
      {children}
    </section>
  );
}
