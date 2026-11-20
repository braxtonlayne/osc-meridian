import type { ComponentChildren, TargetedKeyboardEvent } from 'preact';
import { useRef } from 'preact/hooks';
import './primitives.css';
import { cx } from '../util';
import { Mnemonic } from './Button';

/* ---------------- Toolbar ---------------- */

export interface ToolbarProps {
  /** Accessible name, e.g. "Document". */
  label: string;
  children: ComponentChildren;
}

/** Horizontal toolbar. Arrow keys move focus between its buttons (roving focus). */
export function Toolbar({ label, children }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('.toolbar__btn:not(:disabled), .toolbar__focusable') ?? []);
    if (!items.length) return;
    const cur = items.indexOf(document.activeElement as HTMLElement);
    if (cur < 0) return;
    e.preventDefault();
    let next: number;
    if (e.key === 'ArrowRight') next = (cur + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (cur - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else next = items.length - 1;
    items[next]?.focus();
  };
  return (
    <div ref={ref} class="toolbar" role="toolbar" aria-label={label} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

export interface ToolbarButtonProps {
  /** Visible text ("&" mnemonic allowed). Toolbar buttons always carry a word. */
  label: string;
  /** Optional 16px icon (from @graphics/icons) shown before the word. */
  icon?: ComponentChildren;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  /** Tooltip / accessible description, e.g. "Print (Ctrl+P)". */
  title?: string;
}

export function ToolbarButton({ label, icon, onClick, disabled, pressed, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      class="toolbar__btn"
      disabled={disabled}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={title}
      onClick={onClick}
    >
      {icon}
      <span>
        <Mnemonic label={label} />
      </span>
    </button>
  );
}

export function ToolbarSeparator() {
  return <span class="toolbar__sep" role="separator" aria-orientation="vertical" />;
}

export function ToolbarSpacer() {
  return <span class="toolbar__spacer" aria-hidden="true" />;
}

export function ToolbarLabel({ children }: { children: ComponentChildren }) {
  return <span class="toolbar__label">{children}</span>;
}

/* ---------------- Status bar ---------------- */

export interface StatusPane {
  /** Stable key. */
  id: string;
  content: ComponentChildren;
  /** Fixed width in px (or any CSS length); omit with fill=true for the stretchy pane. */
  width?: number | string;
  fill?: boolean;
  mono?: boolean;
  /** Accessible label for screen readers, e.g. "Records shown". */
  label?: string;
}

export interface StatusBarProps {
  panes: StatusPane[];
  /** Announce changes politely (role=status). Default true. */
  live?: boolean;
}

/** Segmented status bar: sunken panes, first pane usually the fill pane with the message. */
export function StatusBar({ panes, live = true }: StatusBarProps) {
  return (
    <div class="statusbar" role={live ? 'status' : undefined}>
      {panes.map((p) => (
        <div
          key={p.id}
          class={cx('statusbar__pane', p.fill && 'statusbar__pane--fill', p.mono && 'statusbar__pane--mono')}
          style={p.width !== undefined ? { width: typeof p.width === 'number' ? `${p.width}px` : p.width, flex: 'none' } : undefined}
        >
          {/* A plain div may not carry aria-label (axe aria-prohibited-attr): the pane's name is read as text. */}
          {p.label ? <span class="sr-only">{p.label}: </span> : null}
          {p.content}
        </div>
      ))}
    </div>
  );
}
