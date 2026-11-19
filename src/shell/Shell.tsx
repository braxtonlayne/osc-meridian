/**
 * MERIDIAN shell root: boot -> lock -> desktop. Owns global keyboard shortcuts,
 * history (popstate), the idle lock and root presentation attributes.
 */
import { useEffect } from 'preact/hooks';
import { effect } from '@preact/signals';
import { handheldActive, motionReduced, restorePath, services } from '@core/services';
import * as session from '@core/session';
import { onPop } from '@core/router';
import { ClassificationBanner } from './adapters';
import { Boot } from './Boot';
import { Lock } from './Lock';
import { Desktop, desktopMenu } from './Desktop';
import { Taskbar, directoryOpen } from './Taskbar';
import { ContextMenuHost, closeMenu, menu, openMenu } from './Menu';
import { RunDialog, SearchPalette } from './Dialogs';
import { windowMenuItems } from './Window';
import {
  activeWin,
  bannerMarking,
  cascade,
  cycle,
  kbEnd,
  kbMode,
  kbStart,
  kbStep,
  minimize,
  snapKey,
  tile,
  toggleMax,
} from './wm';
import { doLock, doLogin, doTimeout, runOpen, searchOpen } from './state';
import { f10ToMenuBar } from './focus';

let ready: Promise<void> = Promise.resolve();
export function setReady(p: Promise<void>): void {
  ready = p;
}

/* Root attributes follow settings. */
effect(() => {
  const root = document.documentElement;
  root.dataset.density = services.settings.density.value;
  if (motionReduced.value) root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
  root.classList.toggle('is-handheld', handheldActive.value);
});

function editable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest?.('.xterm');
}

function onGlobalKey(e: KeyboardEvent): void {
  if (session.phase.peek() !== 'active') return;
  const k = kbMode.peek();
  if (k) {
    const step = e.shiftKey ? 1 : 10;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[e.key];
    if (d) kbStep(d[0], d[1]);
    else if (e.key === 'Enter') kbEnd(true);
    else if (e.key === 'Escape') kbEnd(false);
    else return;
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const w = activeWin.peek();
  const key = e.key;
  const code = e.code;
  let handled = true;

  if ((e.ctrlKey || e.metaKey) && !e.altKey && key.toLowerCase() === 'k' && !(e.target as HTMLElement | null)?.closest?.('.xterm')) {
    searchOpen.value = true;
  } else if ((e.altKey || e.metaKey) && !e.ctrlKey && code === 'KeyR') {
    runOpen.value = true;
  } else if (e.altKey && key === 'Home') {
    directoryOpen.value = !directoryOpen.peek();
  } else if (e.altKey && !e.shiftKey && code === 'KeyL') {
    doLock();
  } else if ((e.metaKey || (e.altKey && e.shiftKey)) && key.startsWith('Arrow') && w) {
    snapKey(w.id, key.slice(5).toLowerCase() as 'left' | 'right' | 'up' | 'down');
  } else if (e.altKey && e.shiftKey && code === 'KeyC') {
    cascade();
  } else if (e.altKey && e.shiftKey && code === 'KeyT') {
    tile();
  } else if (e.altKey && key === 'F7' && w) {
    kbStart(w.id, 'move');
  } else if (e.altKey && key === 'F8' && w) {
    kbStart(w.id, 'size');
  } else if (e.altKey && key === 'F9' && w) {
    minimize(w.id);
  } else if (e.altKey && key === 'F10' && w) {
    toggleMax(w.id);
  } else if (key === 'F10' && !e.shiftKey && !e.ctrlKey && !e.metaKey && w && !(e.target as HTMLElement | null)?.closest?.('.xterm')) {
    // F10 reaches the active window's menu bar from anywhere (the MenuBar itself only
    // listens inside its own host element).
    handled = f10ToMenuBar(w.id);
  } else if (e.altKey && !e.shiftKey && code === 'KeyW' && w) {
    w.handle.close();
  } else if (e.altKey && (code === 'Minus' || code === 'NumpadSubtract') && w) {
    const el = document.querySelector<HTMLElement>(`[data-win-id="${w.id}"] .win-ctl`);
    const r = el?.getBoundingClientRect();
    openMenu({ x: r?.left ?? 40, y: r?.bottom ?? 40, items: windowMenuItems(w), label: `${w.title.peek()} window menu`, returnFocus: el });
  } else if (e.altKey && (code === 'Backquote' || key === 'F6')) {
    cycle(e.shiftKey ? -1 : 1);
  } else if (key === 'Escape' && menu.peek()) {
    closeMenu();
  } else if (key === 'Escape' && directoryOpen.peek()) {
    directoryOpen.value = false;
  } else if ((key === 'ContextMenu' || (e.shiftKey && key === 'F10')) && !editable(e.target)) {
    const t = e.target as HTMLElement;
    if (t.closest('.desk-icons') || t === document.body || t.closest('.workspace') === t) {
      const r = t.getBoundingClientRect();
      desktopMenu(r.left + 8, r.top + 8);
    } else handled = false;
  } else {
    handled = false;
  }
  if (handled) {
    e.preventDefault();
    e.stopPropagation();
  }
}

export function Shell() {
  const phase = session.phase.value;
  const marking = bannerMarking.value;

  useEffect(() => {
    window.addEventListener('keydown', onGlobalKey, true);
    const unpop = onPop((p) => {
      if (session.phase.peek() === 'active') restorePath(p);
    });
    session.startIdleWatch(doTimeout);
    return () => {
      window.removeEventListener('keydown', onGlobalKey, true);
      unpop();
    };
  }, []);

  if (phase === 'boot') {
    return <Boot reduced={motionReduced.value} onDone={() => void ready.then(() => (session.phase.value = 'locked'))} />;
  }

  const locked = phase === 'locked';
  return (
    <div class="shell">
      <div class="desk-root" inert={locked} aria-hidden={locked ? 'true' : undefined}>
        <ClassificationBanner marking={marking} position="top" />
        <Desktop />
        <Taskbar />
        <ClassificationBanner marking={marking} position="bottom" />
      </div>
      {locked && <Lock onLogin={doLogin} />}
      {!locked && runOpen.value && <RunDialog />}
      {!locked && searchOpen.value && <SearchPalette />}
      {!locked && menu.value && <ContextMenuHost />}
    </div>
  );
}
