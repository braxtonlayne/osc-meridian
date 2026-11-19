/**
 * Workspace: watermark, desktop icons, windows, snap preview and notices.
 */
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { APPS } from '@apps/index';
import { dismissToast, handheldActive, services, toasts } from '@core/services';
import { DesktopWatermark, Icon } from './adapters';
import { WindowFrame } from './Window';
import { activeId, cascade, minimizeAll, setWorkArea, snapPreview, tile, windows } from './wm';
import { openMenu, SEP } from './Menu';
import { runOpen, searchOpen } from './state';

const selectedIcon = signal(0);
const iconOrder = signal<'default' | 'name'>('default');

function orderedApps() {
  return iconOrder.value === 'name' ? [...APPS].sort((a, b) => a.title.localeCompare(b.title)) : APPS;
}

function DesktopIcons() {
  const ref = useRef<HTMLDivElement>(null);
  const apps = orderedApps();
  const sel = selectedIcon.value;

  const onKey = (e: KeyboardEvent) => {
    const el = ref.current;
    if (!el) return;
    const icons = [...el.querySelectorAll<HTMLElement>('.desk-icon')];
    if (!icons.length) return;
    // Column-major layout: work out rows per column from geometry.
    const firstLeft = icons[0]!.offsetLeft;
    const perCol = Math.max(1, icons.filter((i) => i.offsetLeft === firstLeft).length);
    let next: number;
    if (e.key === 'ArrowDown') next = Math.min(icons.length - 1, sel + 1);
    else if (e.key === 'ArrowUp') next = Math.max(0, sel - 1);
    else if (e.key === 'ArrowRight') next = Math.min(icons.length - 1, sel + perCol);
    else if (e.key === 'ArrowLeft') next = Math.max(0, sel - perCol);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = icons.length - 1;
    else if (e.key === 'Enter') {
      const a = apps[sel];
      if (a) services.openApp(a.id);
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    selectedIcon.value = next;
    icons[next]?.focus();
  };

  return (
    <div class="desk-icons" ref={ref} role="listbox" aria-label="Desktop" aria-orientation="vertical" onKeyDown={onKey}>
      {apps.map((a, i) => (
        <div
          key={a.id}
          role="option"
          aria-selected={sel === i}
          tabIndex={sel === i ? 0 : -1}
          class={`desk-icon${sel === i ? ' is-sel' : ''}`}
          onClick={() => (selectedIcon.value = i)}
          onDblClick={() => services.openApp(a.id)}
          onFocus={() => (selectedIcon.value = i)}
          title={`${a.title} (${a.homeRoute})`}
        >
          <Icon id={a.icon} size={32} />
          <span class="desk-icon-label">{a.title}</span>
        </div>
      ))}
    </div>
  );
}

function Toasts() {
  const list = toasts.value;
  if (!list.length) return null;
  return (
    <div class="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} class="toast">
          <div class="toast-h">
            <span>{t.from ?? 'MERIDIAN'}</span>
            <button type="button" class="toast-x" aria-label="Dismiss notice" onClick={() => dismissToast(t.id)}>
              <span class="glyph" />
            </button>
          </div>
          <div class="toast-b">{t.text}</div>
        </div>
      ))}
    </div>
  );
}

function SnapPreview() {
  const r = snapPreview.value;
  if (!r) return null;
  return <div class="snap-preview" style={{ transform: `translate(${r.x}px, ${r.y}px)`, width: r.w, height: r.h }} aria-hidden="true" />;
}

export function desktopMenu(x: number, y: number): void {
  const n = windows.peek().length;
  openMenu({
    x,
    y,
    label: 'Desktop menu',
    items: [
      { label: 'Arrange icons by name', checked: iconOrder.peek() === 'name', action: () => (iconOrder.value = iconOrder.peek() === 'name' ? 'default' : 'name') },
      SEP,
      { label: 'Cascade windows', disabled: !n, action: cascade },
      { label: 'Tile windows', disabled: !n, action: tile },
      { label: 'Minimize all windows', disabled: !n, action: minimizeAll },
      SEP,
      { label: 'Search...', shortcut: 'Ctrl+K', action: () => (searchOpen.value = true) },
      { label: 'Run...', shortcut: 'Alt+R', action: () => (runOpen.value = true) },
      SEP,
      { label: 'Display settings', action: () => services.openRoute(services.docs.byRoute('/system/settings') ? '/system/settings' : '/system') },
    ],
  });
}

export function Desktop() {
  const ref = useRef<HTMLDivElement>(null);
  const list = windows.value;
  const handheld = handheldActive.value;
  const hasActive = handheld && list.some((w) => w.id === activeId.value && w.mode.value !== 'min');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWorkArea(el.clientWidth, el.clientHeight));
    ro.observe(el);
    setWorkArea(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      class={`workspace${handheld ? ' is-handheld' : ''}`}
      ref={ref}
      onContextMenu={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('.win') || t.closest('input, textarea')) return;
        e.preventDefault();
        desktopMenu(e.clientX, e.clientY);
      }}
    >
      <div class="workspace-mark">
        <DesktopWatermark />
      </div>
      {!hasActive && <DesktopIcons />}
      {list.map((w) => (
        <WindowFrame key={w.id} win={w} />
      ))}
      <SnapPreview />
      <Toasts />
    </div>
  );
}
