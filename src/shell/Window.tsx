/**
 * A MERIDIAN window: title bar (docNo + title), marking strip, app body,
 * status line, eight resize handles. Dragging and resizing write transforms
 * directly to the element inside requestAnimationFrame and commit once on
 * pointerup, so a drag never re-renders Preact (60 fps with 12 windows open).
 */
import { Component } from 'preact';
import type { ComponentChildren, ComponentType } from 'preact';
import { useLayoutEffect, useRef, useState, useEffect } from 'preact/hooks';
import type { AppProps } from '@core/contracts';
import { handheldActive, motionReduced, services } from '@core/services';
import { Icon, MarkingStrip, PathNotFound, RefusalState, markingById } from './adapters';
import { searchOpen } from './state';
import type { Win, Rect, SnapZone } from './wm';
import {
  activeId,
  clampRect,
  displayRect,
  focusWindow,
  kbMode,
  kbStart,
  minSizeOf,
  minimize,
  restore,
  setRect,
  snapPreview,
  snapTo,
  toggleMax,
  workArea,
  zoneRect,
} from './wm';
import { openMenu, SEP } from './Menu';
import type { MenuItem } from './Menu';

/* ------------------------------------------------------------ app host */

class ErrorBoundary extends Component<{ children: ComponentChildren; appTitle: string }, { error: string | null }> {
  override state = { error: null as string | null };
  override componentDidCatch(err: unknown) {
    console.error(err);
    this.setState({ error: err instanceof Error ? err.message : String(err) });
  }
  override render() {
    if (this.state.error) {
      return (
        <div class="win-pad">
          <RefusalState
            authority="MERIDIAN Application Services"
            reference="AS-FAULT-0117"
            reason={`${this.props.appTitle} stopped responding and was closed by the workstation. Reopen the application. If the fault recurs, report it to the Help Desk quoting the reference.`}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

/** Never re-rendered by the frame; AppRoute subscribes to the route signal itself. */
class AppHost extends Component<{ win: Win }> {
  override shouldComponentUpdate() {
    return false;
  }
  override render() {
    return (
      <ErrorBoundary appTitle={this.props.win.def?.title ?? 'Application'}>
        <AppRoute win={this.props.win} />
      </ErrorBoundary>
    );
  }
}

const loaded = new Map<string, ComponentType<AppProps>>();

function AppRoute({ win }: { win: Win }) {
  const def = win.def!;
  const [Comp, setComp] = useState<ComponentType<AppProps> | null>(() => loaded.get(def.id) ?? null);
  const [err, setErr] = useState<string | null>(null);
  const route = win.route.value;

  useEffect(() => {
    if (Comp) return;
    let live = true;
    win.busy.value = true;
    def
      .load()
      .then((m) => {
        loaded.set(def.id, m.default);
        if (live) setComp(() => m.default);
      })
      .catch((e: unknown) => live && setErr(e instanceof Error ? e.message : String(e)))
      .finally(() => (win.busy.value = false));
    return () => {
      live = false;
    };
  }, []);

  if (err) {
    return (
      <div class="win-pad">
        <RefusalState
          authority="MERIDIAN Application Services"
          reference="AS-LOAD-0031"
          reason={`The ${def.title} module could not be loaded from the workstation image. Reopen the application; if the condition persists, report it to the Help Desk.`}
        />
      </div>
    );
  }
  if (!Comp) return <div class="win-loading">Loading {def.title}...</div>;
  return <Comp win={win.handle} route={route} />;
}

/* -------------------------------------------------------------- frame */

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function detectZone(px: number, py: number, w: number, h: number): SnapZone | null {
  const corner = 32;
  if (px <= 6) return py <= corner ? 'tl' : py >= h - corner ? 'bl' : 'left';
  if (px >= w - 7) return py <= corner ? 'tr' : py >= h - corner ? 'br' : 'right';
  if (py <= 2) return 'top';
  return null;
}

export function windowMenuItems(win: Win): MenuItem[] {
  const mode = win.mode.peek();
  const free = mode === 'normal' && !win.snap.peek();
  const route = win.route.peek();
  return [
    { label: 'Restore', key: 'R', disabled: free, action: () => restore(win.id) },
    { label: 'Move', key: 'M', shortcut: 'Alt+F7', disabled: mode === 'max', action: () => kbStart(win.id, 'move') },
    { label: 'Size', key: 'S', shortcut: 'Alt+F8', disabled: mode === 'max', action: () => kbStart(win.id, 'size') },
    { label: 'Minimize', key: 'n', shortcut: 'Alt+F9', disabled: mode === 'min', action: () => minimize(win.id) },
    { label: 'Maximize', key: 'x', shortcut: 'Alt+F10', disabled: mode === 'max', action: () => toggleMax(win.id) },
    SEP,
    { label: 'Snap left half', key: 'l', action: () => snapTo(win.id, 'left') },
    { label: 'Snap right half', key: 'g', action: () => snapTo(win.id, 'right') },
    { label: 'Snap top-left quarter', action: () => snapTo(win.id, 'tl') },
    { label: 'Snap top-right quarter', action: () => snapTo(win.id, 'tr') },
    { label: 'Snap bottom-left quarter', action: () => snapTo(win.id, 'bl') },
    { label: 'Snap bottom-right quarter', action: () => snapTo(win.id, 'br') },
    SEP,
    { label: 'Print document', key: 'P', disabled: !route, action: () => route && services.print(route.id) },
    { label: 'Copy route', key: 'o', action: () => void navigator.clipboard?.writeText(win.path.peek()).catch(() => undefined) },
    SEP,
    { label: 'Close', key: 'C', shortcut: 'Alt+W', action: () => win.handle.close() },
  ];
}

export function WindowFrame({ win }: { win: Win }) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = displayRect(win);
  const mode = win.mode.value;
  const snap = win.snap.value;
  const active = activeId.value === win.id;
  const handheld = handheldActive.value;
  const busy = win.busy.value;
  const title = win.title.value;
  const docNo = win.docNo.value;
  const marking = win.marking.value;
  const status = win.status.value;
  const kb = kbMode.value?.id === win.id ? kbMode.value.kind : null;
  const appTitle = win.def?.title ?? 'MERIDIAN';
  const hidden = mode === 'min' || (handheld && !active);

  /* open outline-zoom (90 ms) */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || motionReduced.peek() || handheldActive.peek() || !el.animate) return;
    const parent = el.parentElement;
    if (!parent) return;
    // The outline lives in a fixed layer on <body>, outside Preact's tree, so a
    // re-render of the workspace can never detach it mid-animation.
    const ws = parent.getBoundingClientRect();
    const to = displayRect(win);
    const from: Rect = win.openFrom ?? { x: to.x + to.w * 0.35, y: to.y + to.h * 0.35, w: to.w * 0.3, h: to.h * 0.3 };
    const outline = document.createElement('div');
    outline.className = 'wm-zoom';
    outline.style.width = `${to.w}px`;
    outline.style.height = `${to.h}px`;
    document.body.appendChild(outline);
    el.style.visibility = 'hidden';
    const sx = from.w / to.w;
    const sy = from.h / to.h;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      outline.remove();
      el.style.visibility = '';
    };
    const guard = setTimeout(done, 200);
    const anim = outline.animate(
      [
        { transform: `translate(${ws.left + from.x}px, ${ws.top + from.y}px) scale(${sx}, ${sy})` },
        { transform: `translate(${ws.left + to.x}px, ${ws.top + to.y}px) scale(1, 1)` },
      ],
      { duration: 90, easing: 'steps(3, end)', fill: 'forwards' },
    );
    anim.onfinish = done;
    anim.oncancel = done;
    return () => done();
  }, []);

  /* --------------------------------------------------------------- drag */
  const onTitleDown = (e: PointerEvent) => {
    if (e.button !== 0 || handheldActive.peek()) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const el = ref.current!;
    const ws = el.parentElement!.getBoundingClientRect();
    const start = displayRect(win);
    const detached = win.mode.peek() === 'max' || win.snap.peek() !== null;
    const sx = e.clientX;
    const sy = e.clientY;
    let base = start;
    let x = start.x;
    let y = start.y;
    let moved = false;
    let zone: SnapZone | null = null;
    let frame = 0;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const prev = snapPreview.peek();
      const next = zone ? zoneRect(zone) : null;
      if ((prev === null) !== (next === null) || (prev && next && (prev.x !== next.x || prev.y !== next.y || prev.w !== next.w || prev.h !== next.h))) {
        snapPreview.value = next;
      }
    };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved) {
        if (Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        el.classList.add('is-dragging');
        if (detached) {
          const free = win.rect.peek();
          const fx = (sx - ws.left - start.x) / Math.max(1, start.w);
          base = { x: sx - ws.left - free.w * fx, y: start.y, w: free.w, h: free.h };
          el.style.width = `${free.w}px`;
          el.style.height = `${free.h}px`;
        }
      }
      x = Math.round(base.x + dx);
      y = Math.round(Math.min(Math.max(base.y + dy, 0), ws.height - 28));
      zone = detectZone(ev.clientX - ws.left, ev.clientY - ws.top, ws.width, ws.height);
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      if (frame) cancelAnimationFrame(frame);
      el.classList.remove('is-dragging');
      snapPreview.value = null;
      if (!moved) return;
      if (zone) {
        if (detached) win.rect.value = clampRect({ x, y, w: base.w, h: base.h }, minSizeOf(win));
        snapTo(win.id, zone);
      } else {
        setRect(win.id, { x, y, w: base.w, h: base.h });
      }
      // Clear direct writes; the committed vnode style is authoritative again.
      const r = displayRect(win);
      el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  /* ------------------------------------------------------------- resize */
  const onEdgeDown = (edge: Edge) => (e: PointerEvent) => {
    if (e.button !== 0 || handheldActive.peek()) return;
    e.stopPropagation();
    focusWindow(win.id);
    const el = ref.current!;
    const start = displayRect(win);
    const min = minSizeOf(win);
    const area = workArea.peek();
    const sx = e.clientX;
    const sy = e.clientY;
    let r = start;
    let frame = 0;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    el.classList.add('is-resizing');
    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
    };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y, w, h } = start;
      if (edge.includes('e')) w = Math.min(Math.max(min.w, start.w + dx), area.w - start.x + 400);
      if (edge.includes('s')) h = Math.max(min.h, start.h + dy);
      if (edge.includes('w')) {
        w = Math.max(min.w, start.w - dx);
        x = start.x + start.w - w;
      }
      if (edge.includes('n')) {
        const ny = Math.max(0, start.y + dy);
        h = Math.max(min.h, start.y + start.h - ny);
        y = start.y + start.h - h;
      }
      r = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      if (frame) cancelAnimationFrame(frame);
      el.classList.remove('is-resizing');
      setRect(win.id, r);
      const c = displayRect(win);
      el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0)`;
      el.style.width = `${c.w}px`;
      el.style.height = `${c.h}px`;
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  };

  const openWinMenu = (e: MouseEvent | KeyboardEvent, at?: { x: number; y: number }) => {
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openMenu({ x: at?.x ?? b.left, y: at?.y ?? b.bottom, items: windowMenuItems(win), label: `${title} window menu` });
  };

  const m = markingById(marking);
  const style = handheld
    ? { zIndex: win.z.value }
    : {
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
        zIndex: win.z.value,
      };

  return (
    <section
      ref={ref}
      class={[
        'win',
        active ? 'is-active' : 'is-inactive',
        mode === 'max' ? 'is-max' : '',
        snap ? `is-snap is-snap-${snap}` : '',
        busy ? 'is-busy' : '',
        kb ? `is-kb-${kb}` : '',
        win.kind === 'refusal' ? 'is-refusal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      hidden={hidden}
      data-win-id={win.id}
      data-app={win.appId ?? 'shell'}
      data-marking={marking}
      role="dialog"
      aria-label={`${docNo ? docNo + ' ' : ''}${title}`}
      aria-busy={busy}
      data-busy={busy ? 'true' : undefined}
      onPointerDownCapture={() => {
        if (activeId.peek() !== win.id) focusWindow(win.id);
      }}
      onFocusCapture={() => {
        if (activeId.peek() !== win.id) focusWindow(win.id);
      }}
    >
      <header
        class="win-title"
        onPointerDown={onTitleDown}
        onDblClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (!handheldActive.peek()) toggleMax(win.id);
        }}
        onContextMenu={(e) => openWinMenu(e, { x: e.clientX, y: e.clientY })}
      >
        <button
          type="button"
          class="win-ctl"
          aria-label="Window menu"
          aria-haspopup="menu"
          title="Window menu (Alt+-)"
          onClick={(e) => openWinMenu(e)}
          onDblClick={(e) => {
            e.stopPropagation();
            win.handle.close();
          }}
        >
          {win.def ? (
            <Icon id={win.def.icon} size={16} />
          ) : win.kind === 'refusal' ? (
            <Icon id={win.refusal?.notFound ? 'question' : 'folder-locked'} size={16} />
          ) : (
            <span class="win-ctl-plain" />
          )}
        </button>
        <div class="win-title-text">
          {docNo && <span class="win-docno">{docNo}</span>}
          <span class="win-title-main">{title}</span>
          {win.def && title !== appTitle && <span class="win-title-app"> - {appTitle}</span>}
        </div>
        <div class="win-buttons">
          <button type="button" class="win-btn win-btn-min" aria-label="Minimize" title="Minimize" onClick={() => minimize(win.id)}>
            <span class="glyph" />
          </button>
          <button
            type="button"
            class={`win-btn ${mode === 'max' || snap ? 'win-btn-restore' : 'win-btn-max'}`}
            aria-label={mode === 'max' || snap ? 'Restore' : 'Maximize'}
            title={mode === 'max' || snap ? 'Restore' : 'Maximize'}
            onClick={() => (mode === 'max' || snap ? restore(win.id) : toggleMax(win.id))}
          >
            <span class="glyph" />
          </button>
          <button type="button" class="win-btn win-btn-close" aria-label="Close" title="Close" onClick={() => win.handle.close()}>
            <span class="glyph" />
          </button>
        </div>
      </header>
      <div class="win-marking" title={m.label}>
        <MarkingStrip marking={marking} />
      </div>
      <div class="win-body">
        {win.kind === 'refusal' && win.refusal ? (
          <div class="win-pad">
            {win.refusal.notFound ? (
              <PathNotFound path={win.path.peek()} onSearch={() => (searchOpen.value = true)} onHome={() => win.handle.close()} />
            ) : (
              <RefusalState authority={win.refusal.authority} reference={win.refusal.ref} reason={win.refusal.reason} docNo={win.refusal.docNo} />
            )}
          </div>
        ) : (
          <AppHost win={win} />
        )}
      </div>
      <footer class="win-status">
        <span class="win-status-text">{kb ? (kb === 'move' ? 'Move: arrow keys, Enter to place, Esc to cancel' : 'Size: arrow keys, Enter to set, Esc to cancel') : status || ' '}</span>
        <span class="win-status-mark">{m.label}</span>
      </footer>
      {!handheld && mode !== 'max' && EDGES.map((ed) => <div key={ed} class={`win-edge win-edge-${ed}`} onPointerDown={onEdgeDown(ed)} aria-hidden="true" />)}
    </section>
  );
}
