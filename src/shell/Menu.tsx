/**
 * Popup menus: right-click context menus, the window control menu, and the
 * shared keyboard behaviour (arrows, Home/End, Enter, Escape, type-ahead).
 */
import { signal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

export interface MenuItem {
  label: string;
  /** Underlined access key letter is the first char matching this. */
  key?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
  action?: () => void;
}

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
  label: string;
  /** Element to return focus to when the menu closes. */
  returnFocus?: HTMLElement | null;
}

export const menu = signal<MenuState | null>(null);

export function openMenu(m: MenuState): void {
  menu.value = { ...m, returnFocus: m.returnFocus ?? (document.activeElement as HTMLElement | null) };
}

export function closeMenu(): void {
  const m = menu.peek();
  menu.value = null;
  m?.returnFocus?.focus?.();
}

export const SEP: MenuItem = { label: '', separator: true };

export function MenuList({ items, onDone, label, autoFocus = true }: { items: MenuItem[]; onDone: () => void; label: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const first = ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    first?.focus();
  }, [items, autoFocus]);

  const onKey = (e: KeyboardEvent) => {
    const els = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      els[(i + 1) % els.length]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      els[(i - 1 + els.length) % els.length]?.focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      els[0]?.focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      els[els.length - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onDone();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const ch = e.key.toLowerCase();
      const hit = els.find((el) => (el.dataset.key ?? el.textContent ?? '').trim().toLowerCase().startsWith(ch));
      hit?.click();
    }
  };

  return (
    <ul class="sh-menu" role="menu" aria-label={label} ref={ref} onKeyDown={onKey}>
      {items.map((it, i) =>
        it.separator ? (
          <li key={i} class="sh-menu-sep" role="separator" />
        ) : (
          <li
            key={i}
            role={it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={it.checked !== undefined ? it.checked : undefined}
            class={`sh-menu-item${it.disabled ? ' is-disabled' : ''}`}
            tabIndex={-1}
            aria-disabled={it.disabled ? 'true' : undefined}
            data-key={it.key ?? it.label}
            onClick={(e) => {
              e.stopPropagation();
              if (it.disabled) return;
              onDone();
              it.action?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                (e.currentTarget as HTMLElement).click();
              }
            }}
          >
            <span class="sh-menu-check" aria-hidden="true">{it.checked ? <span class="sh-menu-tick" /> : null}</span>
            <span class="sh-menu-label">{it.label}</span>
            {it.shortcut && <span class="sh-menu-shortcut">{it.shortcut}</span>}
          </li>
        ),
      )}
    </ul>
  );
}

/** Floating context menu host (one at a time). */
export function ContextMenuHost() {
  const m = menu.value;
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !m) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(m.x, innerWidth - r.width - 2);
    const y = Math.min(m.y, innerHeight - r.height - 2);
    el.style.left = `${Math.max(0, x)}px`;
    el.style.top = `${Math.max(0, y)}px`;
  }, [m]);

  useEffect(() => {
    if (!m) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeMenu();
    };
    const blur = () => closeMenu();
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('blur', blur);
    };
  }, [m]);

  if (!m) return null;
  return (
    <div class="ctx-menu" ref={ref} style={{ left: m.x, top: m.y }}>
      <MenuList items={m.items} label={m.label} onDone={closeMenu} />
    </div>
  );
}
