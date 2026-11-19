import type { ComponentChildren, HTMLAttributes, TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import './primitives.css';
import { clamp, cx, formatNumber } from '../util';
import { Button } from './Button';

/* ---------------- Pager (record browser) ---------------- */

export interface PagerProps {
  /** 1-based current record or page. */
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  /** Noun shown in the status, e.g. "Record", "Page", "Accession". */
  noun?: string;
  /** Optional total item count shown at the right ("1,204 items"). */
  total?: number;
  totalNoun?: string;
  /** Accessible name for the control group. */
  label?: string;
}

function PagerGlyph({ kind }: { kind: 'first' | 'prev' | 'next' | 'last' }) {
  return (
    <span class="pager-glyph" aria-hidden="true">
      {kind === 'first' ? <span class="pager-glyph__bar" /> : null}
      {kind === 'first' || kind === 'prev' ? <span class="pager-glyph__tri pager-glyph__tri--l" /> : null}
      {kind === 'next' || kind === 'last' ? <span class="pager-glyph__tri pager-glyph__tri--r" /> : null}
      {kind === 'last' ? <span class="pager-glyph__bar" /> : null}
    </span>
  );
}

/** First / Previous / [n] of N / Next / Last, plus a typed go-to. */
export function Pager({ page, pageCount, onPage, noun = 'Record', total, totalNoun = 'items', label }: PagerProps) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);
  const go = (p: number) => onPage(clamp(Math.round(p), 1, Math.max(1, pageCount)));
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const commit = () => {
    const n = Number(draft.replace(/[^\d]/g, ''));
    if (Number.isFinite(n) && n >= 1) go(n);
    else setDraft(String(page));
  };
  return (
    <div class="pager" role="group" aria-label={label ?? `${noun} navigation`}>
      <Button size="icon" aria-label={`First ${noun.toLowerCase()}`} title="First" disabled={atStart} onClick={() => go(1)}>
        <PagerGlyph kind="first" />
      </Button>
      <Button size="icon" aria-label={`Previous ${noun.toLowerCase()}`} title="Previous" disabled={atStart} onClick={() => go(page - 1)}>
        <PagerGlyph kind="prev" />
      </Button>
      <span class="pager__status">
        <label>
          {noun}{' '}
          <input
            class="f-input f-input--mono pager__input"
            value={draft}
            inputMode="numeric"
            aria-label={`${noun} number`}
            onInput={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
            }}
            onBlur={commit}
          />
        </label>{' '}
        of <span class="u-mono">{formatNumber(pageCount)}</span>
      </span>
      <Button size="icon" aria-label={`Next ${noun.toLowerCase()}`} title="Next" disabled={atEnd} onClick={() => go(page + 1)}>
        <PagerGlyph kind="next" />
      </Button>
      <Button size="icon" aria-label={`Last ${noun.toLowerCase()}`} title="Last" disabled={atEnd} onClick={() => go(pageCount)}>
        <PagerGlyph kind="last" />
      </Button>
      {total !== undefined ? (
        <span class="pager__count">
          <span class="u-mono">{formatNumber(total)}</span> {totalNoun}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------- Redaction ---------------- */

export interface RedactionHoverInfo {
  id?: string;
  len: number;
  auth: string;
  ref: string;
}

export interface RedactionProps {
  /** Number of withheld characters; the bar is that many character-widths of the current font. */
  len: number;
  /** Withholding authority, e.g. "OIA". */
  auth: string;
  /** Reference number, e.g. "OIA-08-114". (Named `reference` because `ref` is reserved by Preact.) */
  reference: string;
  id?: string;
  /** Block redaction (whole paragraph). Bar lines are derived from len at ~80 chars per line. */
  block?: boolean;
  /** Fires on pointer hover and on keyboard focus, once per entry. The shell writes it to the audit log. */
  onHover?: (info: RedactionHoverInfo) => void;
}

/** The text a withheld element is allowed to disclose. Nothing else is shown or exposed. */
export function redactionNotice(auth: string, ref: string): string {
  return `Withheld: ${auth} · Ref ${ref}`;
}

/**
 * Black bar standing in for withheld text. Hidden text is never in the DOM; hover or focus
 * shows only the withholding authority and reference.
 */
export function Redaction({ len, auth, reference: refNo, id, block, onHover }: RedactionProps) {
  const [shown, setShown] = useState(false);
  const notice = redactionNotice(auth, refNo);
  const enter = () => {
    setShown(true);
    onHover?.({ id, len, auth, ref: refNo });
  };
  const style = block
    ? { ['--rx-lines' as string]: String(Math.max(1, Math.ceil(len / 80))) }
    : { ['--rx-len' as string]: String(Math.max(1, len)) };
  return (
    <span class="tip-host" style={block ? { display: 'block' } : undefined}>
      <span
        class={cx('redaction', block && 'redaction--block')}
        style={style}
        tabIndex={0}
        role="img"
        aria-label={`Withheld. Authority ${auth}. Reference ${refNo}.`}
        data-rx={id}
        onPointerEnter={enter}
        onPointerLeave={() => setShown(false)}
        onFocus={enter}
        onBlur={() => setShown(false)}
      />
      {shown ? (
        <span class="tip" role="tooltip">
          {notice}
        </span>
      ) : null}
    </span>
  );
}

/* ---------------- Splitter ---------------- */

export interface SplitterProps {
  /** 'horizontal' = side-by-side panes with a vertical bar; 'vertical' = stacked panes. */
  direction?: 'horizontal' | 'vertical';
  /** Initial size of the first pane in px. */
  initial: number;
  min?: number;
  max?: number;
  /** Controlled size (px) of the first pane. */
  size?: number;
  onResize?: (px: number) => void;
  /** Accessible name of the divider, e.g. "Folder pane width". */
  label: string;
  children: [ComponentChildren, ComponentChildren];
}

/** Two panes with a draggable divider. Keyboard: arrows move 8px (Shift = 32px), Home/End to limits. */
export function Splitter({ direction = 'horizontal', initial, min = 80, max = 2000, size, onResize, label, children }: SplitterProps) {
  const [inner, setInner] = useState(initial);
  const px = size ?? inner;
  const [dragging, setDragging] = useState(false);
  const start = useRef({ pos: 0, px: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const horiz = direction === 'horizontal';

  const set = (v: number) => {
    const total = rootRef.current ? (horiz ? rootRef.current.clientWidth : rootRef.current.clientHeight) : Infinity;
    const next = Math.round(clamp(v, min, Math.min(max, total - min)));
    if (size === undefined) setInner(next);
    onResize?.(next);
  };

  const onPointerDown = (e: TargetedPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { pos: horiz ? e.clientX : e.clientY, px };
    setDragging(true);
  };
  const onPointerMove = (e: TargetedPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const d = (horiz ? e.clientX : e.clientY) - start.current.pos;
    set(start.current.px + d);
  };
  const onPointerUp = (e: TargetedPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 32 : 8;
    const dec = horiz ? 'ArrowLeft' : 'ArrowUp';
    const inc = horiz ? 'ArrowRight' : 'ArrowDown';
    if (e.key === dec) set(px - step);
    else if (e.key === inc) set(px + step);
    else if (e.key === 'Home') set(min);
    else if (e.key === 'End') set(max);
    else return;
    e.preventDefault();
  };

  const firstStyle = horiz ? { width: `${px}px` } : { height: `${px}px` };
  return (
    <div ref={rootRef} class={cx('split', !horiz && 'split--vertical')}>
      <div class="split__pane split__pane--first" style={firstStyle}>
        {children[0]}
      </div>
      <div
        class="split__bar"
        role="separator"
        tabIndex={0}
        aria-label={label}
        aria-orientation={horiz ? 'vertical' : 'horizontal'}
        aria-valuenow={px}
        aria-valuemin={min}
        aria-valuemax={max}
        data-dragging={dragging ? 'true' : 'false'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      />
      <div class="split__pane split__pane--second">{children[1]}</div>
    </div>
  );
}
