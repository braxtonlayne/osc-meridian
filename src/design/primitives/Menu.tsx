import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import './primitives.css';
import { cx, parseMnemonic } from '../util';
import { Mnemonic } from './Button';

export interface MenuCommand {
  /** "&Print..." — "&" marks the mnemonic. */
  label: string;
  /** Accelerator text shown right-aligned, e.g. "Ctrl+P". Display only: bind the key in the app. */
  shortcut?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Check-mark item (menuitemcheckbox). */
  checked?: boolean;
  /** Draw the check as a radio dot (menuitemradio). */
  radio?: boolean;
  separator?: false;
}
export interface MenuSeparator {
  separator: true;
}
export type MenuItem = MenuCommand | MenuSeparator;

export type MenuCloseReason = 'select' | 'escape' | 'outside' | 'left' | 'right' | 'tab';

export interface MenuProps {
  items: MenuItem[];
  /** Accessible name, e.g. "File". */
  label: string;
  onClose: (reason: MenuCloseReason) => void;
  /** Fixed viewport position for context menus. Omit to position under a MenuBar item. */
  position?: { x: number; y: number };
  /** Index to highlight on open (keyboard open = 0, mouse open = -1). */
  initialIndex?: number;
  id?: string;
}

function isCommand(i: MenuItem): i is MenuCommand {
  return !('separator' in i && i.separator);
}

/** Drop-down or context menu. Keyboard: arrows, Home/End, Enter/Space, Esc, mnemonic letters. */
export function Menu({ items, label, onClose, position, initialIndex = -1, id }: MenuProps) {
  const [active, setActive] = useState(initialIndex);
  const listRef = useRef<HTMLUListElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const commandIdx = items.map((it, i) => (isCommand(it) ? i : -1)).filter((i) => i >= 0);

  useEffect(() => {
    listRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      const root = listRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        // Let the menubar handle clicks on its own items.
        const bar = root.closest('.menubar');
        if (bar && bar.contains(e.target)) return;
        closeRef.current('outside');
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.focus();
  }, [active]);

  // Keep a fixed-position menu on screen.
  const [pos, setPos] = useState(position);
  useEffect(() => {
    if (!position || !listRef.current) return;
    const r = listRef.current.getBoundingClientRect();
    const x = Math.min(position.x, window.innerWidth - r.width - 2);
    const y = Math.min(position.y, window.innerHeight - r.height - 2);
    setPos({ x: Math.max(0, x), y: Math.max(0, y) });
  }, [position?.x, position?.y]);

  const activate = (i: number) => {
    const it = items[i];
    if (!it || !isCommand(it) || it.disabled) return;
    closeRef.current('select');
    it.onSelect?.();
  };

  const move = (dir: 1 | -1) => {
    if (!commandIdx.length) return;
    const cur = commandIdx.indexOf(active);
    const next = cur < 0 ? (dir === 1 ? 0 : commandIdx.length - 1) : (cur + dir + commandIdx.length) % commandIdx.length;
    setActive(commandIdx[next] ?? -1);
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLUListElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        return;
      case 'Home':
        e.preventDefault();
        setActive(commandIdx[0] ?? -1);
        return;
      case 'End':
        e.preventDefault();
        setActive(commandIdx[commandIdx.length - 1] ?? -1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        activate(active);
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeRef.current('escape');
        return;
      case 'ArrowLeft':
        e.preventDefault();
        closeRef.current('left');
        return;
      case 'ArrowRight':
        e.preventDefault();
        closeRef.current('right');
        return;
      case 'Tab':
        e.preventDefault();
        closeRef.current('tab');
        return;
      default: {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const k = e.key.toLowerCase();
          const hit = items.findIndex((it) => isCommand(it) && parseMnemonic(it.label).mnemonic === k);
          if (hit >= 0) {
            e.preventDefault();
            activate(hit);
          }
        }
      }
    }
  };

  const style = pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined;

  return (
    <ul
      ref={listRef}
      id={id}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      class={cx('menu', position && 'menu--fixed')}
      style={style}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) => {
        if (!isCommand(it)) return <li key={`sep-${i}`} role="separator" class="menu__sep" />;
        const role = it.checked === undefined ? 'menuitem' : it.radio ? 'menuitemradio' : 'menuitemcheckbox';
        return (
          <li
            key={`${i}-${it.label}`}
            role={role}
            data-index={i}
            tabIndex={-1}
            class="menu__item"
            data-active={i === active ? 'true' : undefined}
            aria-disabled={it.disabled ? 'true' : undefined}
            aria-checked={it.checked === undefined ? undefined : it.checked}
            aria-keyshortcuts={it.shortcut}
            onPointerEnter={() => setActive(i)}
            onClick={() => activate(i)}
          >
            <span aria-hidden="true">
              {it.checked ? <span class={it.radio ? 'menu__radio' : 'menu__check'} style={{ display: 'block' }} /> : null}
            </span>
            <span>
              <Mnemonic label={it.label} />
            </span>
            <span class="menu__shortcut">{it.shortcut ?? ''}</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface MenuBarMenu {
  /** "&File" */
  label: string;
  items: MenuItem[];
}

export interface MenuBarProps {
  menus: MenuBarMenu[];
  /** Accessible name; defaults to "Application menu". */
  label?: string;
}

/**
 * Classic menu bar. Mouse: click to open, hover to switch while open.
 * Keyboard: F10 or Alt+mnemonic (anywhere inside the bar's parent element) opens;
 * Left/Right move between menus; Down/Enter opens; Esc closes and returns focus.
 */
export function MenuBar({ menus, label = 'Application menu' }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [openIndex, setOpenIndex] = useState(-1);
  const [focusIdx, setFocusIdx] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const focusTop = (i: number) => {
    setFocusIdx(i);
    barRef.current?.querySelector<HTMLElement>(`[data-top="${i}"]`)?.focus();
  };

  const openMenu = (i: number, fromKeyboard: boolean) => {
    setOpen(i);
    setOpenIndex(fromKeyboard ? 0 : -1);
    setFocusIdx(i);
  };

  // Alt+mnemonic and F10 anywhere within the host (normally the window body).
  useEffect(() => {
    const host = barRef.current?.parentElement;
    if (!host) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F10' && !e.shiftKey) {
        e.preventDefault();
        focusTop(0);
        return;
      }
      if (e.altKey && !e.ctrlKey && e.key.length === 1) {
        const k = e.key.toLowerCase();
        const hit = menus.findIndex((m) => parseMnemonic(m.label).mnemonic === k);
        if (hit >= 0) {
          e.preventDefault();
          openMenu(hit, true);
        }
      }
    };
    host.addEventListener('keydown', onKey);
    return () => host.removeEventListener('keydown', onKey);
  }, [menus]);

  const onTopKey = (e: TargetedKeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = menus.length;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusTop((i + 1) % n);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusTop((i - 1 + n) % n);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu(i, true);
    } else if (e.key === 'Escape') {
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const onMenuClose = (reason: MenuCloseReason) => {
    const cur = open ?? 0;
    const n = menus.length;
    if (reason === 'left' || reason === 'right') {
      const next = reason === 'left' ? (cur - 1 + n) % n : (cur + 1) % n;
      openMenu(next, true);
      return;
    }
    setOpen(null);
    if (reason === 'escape') focusTop(cur);
  };

  return (
    <div ref={barRef} class="menubar" role="menubar" aria-label={label}>
      {menus.map((m, i) => {
        const menuId = `${baseId}-m${i}`;
        return (
          <div class="menubar__slot" key={m.label}>
            <button
              type="button"
              class="menubar__item"
              role="menuitem"
              data-top={i}
              tabIndex={i === focusIdx ? 0 : -1}
              aria-haspopup="menu"
              aria-expanded={open === i}
              aria-controls={open === i ? menuId : undefined}
              onClick={() => (open === i ? setOpen(null) : openMenu(i, false))}
              onPointerEnter={() => {
                if (open !== null && open !== i) openMenu(i, false);
              }}
              onKeyDown={(e) => onTopKey(e, i)}
            >
              <Mnemonic label={m.label} />
            </button>
            {open === i ? (
              <div style={{ position: 'absolute', left: 0, top: '100%' }}>
                <Menu
                  id={menuId}
                  items={m.items}
                  label={parseMnemonic(m.label).text}
                  initialIndex={openIndex}
                  onClose={onMenuClose}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
