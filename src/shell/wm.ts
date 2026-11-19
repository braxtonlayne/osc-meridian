/**
 * Window manager state. Windows are plain objects holding per-window signals so
 * that a drag commit or a title change re-renders only that window. During a
 * drag/resize the Window component writes transforms straight to the DOM in a
 * rAF and commits to `rect` once on pointerup (see Window.tsx).
 */
import { batch, computed, signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import type { AppDefinition, AppId, RouteEntry, WindowHandle } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { load, save } from '@core/persist';
import { canonNow } from './adapters';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Mode = 'normal' | 'min' | 'max';
export type SnapZone = 'left' | 'right' | 'top' | 'tl' | 'tr' | 'bl' | 'br';

export interface Refusal {
  title: string;
  docNo?: string;
  authority: string;
  ref: string;
  reason: string;
  /** Unknown path: rendered with PathNotFound instead of RefusalState. */
  notFound?: boolean;
}

export interface Win {
  id: string;
  kind: 'app' | 'refusal';
  appId: AppId | null;
  def: AppDefinition | null;
  path: Signal<string>;
  route: Signal<RouteEntry | null>;
  title: Signal<string>;
  docNo: Signal<string>;
  marking: Signal<MarkingId>;
  status: Signal<string>;
  busy: Signal<boolean>;
  rect: Signal<Rect>;
  mode: Signal<Mode>;
  snap: Signal<SnapZone | null>;
  z: Signal<number>;
  restoreRect: Rect | null;
  refusal: Refusal | null;
  handle: WindowHandle;
  /** Origin for the open outline-zoom (screen coords relative to workspace). */
  openFrom: Rect | null;
}

export const windows = signal<Win[]>([]);
export const activeId = signal<string | null>(null);
export const workArea = signal<{ w: number; h: number }>({ w: 1280, h: 720 });
/** Shown while dragging toward a screen edge. */
export const snapPreview = signal<Rect | null>(null);
/** Keyboard move/size mode (Alt+F7 / Alt+F8). */
export const kbMode = signal<{ id: string; kind: 'move' | 'size'; orig: Rect } | null>(null);

let zCounter = 10;
let idCounter = 0;
const remembered = new Map<string, Rect>();

export const activeWin = computed(() => windows.value.find((w) => w.id === activeId.value) ?? null);

/** Highest-ranked marking among open windows (minimised included); lowest marking when none. */
export const bannerMarking = computed<MarkingId>(() => {
  const ms = canonNow().markings;
  const rank = (id: MarkingId) => ms.find((m) => m.id === id)?.rank ?? 0;
  const lowest = [...ms].sort((a, b) => a.rank - b.rank)[0]?.id ?? 'UMBRA-U';
  let best: MarkingId = lowest;
  for (const w of windows.value) {
    const m = w.marking.value;
    if (rank(m) > rank(best)) best = m;
  }
  return best;
});

export function lowestMarking(): MarkingId {
  return [...canonNow().markings].sort((a, b) => a.rank - b.rank)[0]?.id ?? 'UMBRA-U';
}

export async function initWm(): Promise<void> {
  const stored = await load<Record<string, Rect>>('wm:pos', {});
  for (const [k, v] of Object.entries(stored)) remembered.set(k, v);
}

function rememberRect(w: Win): void {
  if (!w.appId || w.mode.peek() !== 'normal' || w.snap.peek()) return;
  remembered.set(w.appId, w.rect.peek());
  save('wm:pos', Object.fromEntries(remembered));
}

export function minSizeOf(w: Win): { w: number; h: number } {
  const area = workArea.peek();
  const base = w.def?.minSize ?? { w: 380, h: 240 };
  return { w: Math.min(base.w, area.w), h: Math.min(base.h, area.h) };
}

/** Keep at least the title bar reachable. */
export function clampRect(r: Rect, min: { w: number; h: number }): Rect {
  const area = workArea.peek();
  const w = Math.max(min.w, Math.min(r.w, area.w));
  const h = Math.max(min.h, Math.min(r.h, area.h));
  const x = Math.min(Math.max(r.x, 80 - w), area.w - 80);
  const y = Math.min(Math.max(r.y, 0), area.h - 28);
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
}

export function zoneRect(zone: SnapZone): Rect {
  const { w, h } = workArea.peek();
  const hw = Math.floor(w / 2);
  const hh = Math.floor(h / 2);
  switch (zone) {
    case 'left':
      return { x: 0, y: 0, w: hw, h };
    case 'right':
      return { x: hw, y: 0, w: w - hw, h };
    case 'top':
      return { x: 0, y: 0, w, h };
    case 'tl':
      return { x: 0, y: 0, w: hw, h: hh };
    case 'tr':
      return { x: hw, y: 0, w: w - hw, h: hh };
    case 'bl':
      return { x: 0, y: hh, w: hw, h: h - hh };
    case 'br':
      return { x: hw, y: hh, w: w - hw, h: h - hh };
  }
}

/** Rect actually displayed for a window (max/snap resolved against the work area). */
export function displayRect(w: Win): Rect {
  if (w.mode.value === 'max') {
    const a = workArea.value;
    return { x: 0, y: 0, w: a.w, h: a.h };
  }
  const s = w.snap.value;
  if (s) {
    void workArea.value;
    return zoneRect(s);
  }
  return w.rect.value;
}

function initialRect(def: AppDefinition | null, appId: AppId | null): Rect {
  const area = workArea.peek();
  const size = def?.defaultSize ?? { w: 520, h: 320 };
  const mem = appId ? remembered.get(appId) : undefined;
  const sameApp = windows.peek().filter((w) => w.appId === appId && w.mode.peek() !== 'min').length;
  if (mem && !sameApp) return clampRect(mem, def?.minSize ?? { w: 380, h: 240 });
  const n = windows.peek().length;
  const offset = (n % 8) * 24;
  const w = Math.min(size.w, area.w - 16);
  const h = Math.min(size.h, area.h - 16);
  const x = Math.max(0, Math.round((area.w - w) / 2) - 96 + offset);
  const y = Math.max(0, Math.round((area.h - h) / 2) - 72 + offset);
  return clampRect({ x, y, w, h }, def?.minSize ?? { w: 380, h: 240 });
}

export interface OpenOptions {
  kind: 'app' | 'refusal';
  def: AppDefinition | null;
  route: RouteEntry | null;
  path: string;
  title: string;
  docNo?: string;
  marking?: MarkingId;
  refusal?: Refusal;
  openFrom?: Rect | null;
  /** Hooks supplied by services (routing, audit) */
  onNavigate: (w: Win, route: string) => void;
  onClose: (w: Win) => void;
  onFocus: (w: Win) => void;
}

export function openWindow(o: OpenOptions): Win {
  const id = `w${++idCounter}`;
  const appId = o.def?.id ?? null;
  const win: Win = {
    id,
    kind: o.kind,
    appId,
    def: o.def,
    path: signal(o.path),
    route: signal(o.route),
    title: signal(o.title),
    docNo: signal(o.docNo ?? o.route?.docNo ?? ''),
    marking: signal<MarkingId>(o.marking ?? o.route?.marking ?? lowestMarking()),
    status: signal(''),
    busy: signal(false),
    rect: signal(initialRect(o.def, appId)),
    mode: signal<Mode>('normal'),
    snap: signal<SnapZone | null>(null),
    z: signal(++zCounter),
    restoreRect: null,
    refusal: o.refusal ?? null,
    openFrom: o.openFrom ?? null,
    handle: null as unknown as WindowHandle,
  };
  win.handle = {
    id,
    setTitle: (title, docNo) =>
      batch(() => {
        win.title.value = title;
        if (docNo !== undefined) win.docNo.value = docNo;
      }),
    setMarking: (m) => (win.marking.value = m),
    setStatus: (t) => (win.status.value = t),
    setBusy: (b) => (win.busy.value = b),
    close: () => o.onClose(win),
    focus: () => focusWindow(win.id),
    navigate: (route) => o.onNavigate(win, route),
  };
  focusHooks.set(id, o.onFocus);
  batch(() => {
    windows.value = [...windows.peek(), win];
    activeId.value = id;
  });
  return win;
}

const focusHooks = new Map<string, (w: Win) => void>();

export function getWin(id: string | null | undefined): Win | undefined {
  return id ? windows.peek().find((w) => w.id === id) : undefined;
}

export function focusWindow(id: string): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    if (w.mode.peek() === 'min') w.mode.value = wasMax.has(id) ? 'max' : 'normal';
    wasMax.delete(id);
    if (activeId.peek() !== id || w.z.peek() !== zCounter) w.z.value = ++zCounter;
    activeId.value = id;
  });
  focusHooks.get(id)?.(w);
}

const wasMax = new Set<string>();

export function removeWindow(id: string): void {
  const w = getWin(id);
  if (!w) return;
  rememberRect(w);
  focusHooks.delete(id);
  batch(() => {
    windows.value = windows.peek().filter((x) => x.id !== id);
    if (activeId.peek() === id) {
      const next = topmostVisible();
      activeId.value = next?.id ?? null;
    }
  });
  const next = getWin(activeId.peek());
  if (next) focusHooks.get(next.id)?.(next);
}

export function topmostVisible(): Win | undefined {
  return [...windows.peek()].filter((w) => w.mode.peek() !== 'min').sort((a, b) => b.z.peek() - a.z.peek())[0];
}

export function minimize(id: string): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    if (w.mode.peek() === 'max') wasMax.add(id);
    w.mode.value = 'min';
    if (activeId.peek() === id) activeId.value = topmostVisible()?.id ?? null;
  });
  const next = getWin(activeId.peek());
  if (next) focusHooks.get(next.id)?.(next);
}

export function toggleMax(id: string): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    if (w.mode.peek() === 'max') {
      w.mode.value = 'normal';
    } else {
      w.snap.value = null;
      w.mode.value = 'max';
    }
  });
  focusWindow(id);
}

export function restore(id: string): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    w.mode.value = 'normal';
    w.snap.value = null;
  });
  focusWindow(id);
}

export function snapTo(id: string, zone: SnapZone | null): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    if (zone === 'top') {
      w.snap.value = null;
      w.mode.value = 'max';
    } else {
      w.mode.value = 'normal';
      w.snap.value = zone;
    }
  });
  focusWindow(id);
}

/** Commit a free rect (ends any snap/max). */
export function setRect(id: string, r: Rect): void {
  const w = getWin(id);
  if (!w) return;
  batch(() => {
    w.snap.value = null;
    if (w.mode.peek() === 'max') w.mode.value = 'normal';
    w.rect.value = clampRect(r, minSizeOf(w));
  });
  rememberRect(w);
}

/** Win+Arrow semantics. */
export function snapKey(id: string, dir: 'left' | 'right' | 'up' | 'down'): void {
  const w = getWin(id);
  if (!w) return;
  const s = w.snap.peek();
  const max = w.mode.peek() === 'max';
  if (dir === 'left') snapTo(id, s === 'tr' ? 'tl' : s === 'br' ? 'bl' : s === 'right' ? null : 'left');
  else if (dir === 'right') snapTo(id, s === 'tl' ? 'tr' : s === 'bl' ? 'br' : s === 'left' ? null : 'right');
  else if (dir === 'up') {
    if (s === 'left') snapTo(id, 'tl');
    else if (s === 'right') snapTo(id, 'tr');
    else if (s === 'bl') snapTo(id, 'left');
    else if (s === 'br') snapTo(id, 'right');
    else if (!max) toggleMax(id);
  } else {
    if (max) restore(id);
    else if (s === 'left') snapTo(id, 'bl');
    else if (s === 'right') snapTo(id, 'br');
    else if (s === 'tl') snapTo(id, 'left');
    else if (s === 'tr') snapTo(id, 'right');
    else minimize(id);
  }
}

function visibleByZ(): Win[] {
  return windows.peek().filter((w) => w.mode.peek() !== 'min').sort((a, b) => a.z.peek() - b.z.peek());
}

export function cascade(): void {
  const list = visibleByZ();
  const area = workArea.peek();
  batch(() => {
    list.forEach((w, i) => {
      const size = w.def?.defaultSize ?? { w: 520, h: 320 };
      const ww = Math.min(size.w, area.w - 24 * list.length - 8);
      const hh = Math.min(size.h, area.h - 24 * list.length - 8);
      w.mode.value = 'normal';
      w.snap.value = null;
      w.rect.value = clampRect({ x: 8 + i * 24, y: 8 + i * 24, w: ww, h: hh }, minSizeOf(w));
      w.z.value = ++zCounter;
    });
    const top = list[list.length - 1];
    if (top) activeId.value = top.id;
  });
}

export function tile(): void {
  const list = visibleByZ();
  if (!list.length) return;
  const area = workArea.peek();
  const cols = Math.ceil(Math.sqrt(list.length));
  const rows = Math.ceil(list.length / cols);
  const cw = Math.floor(area.w / cols);
  const rh = Math.floor(area.h / rows);
  batch(() => {
    list.forEach((w, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      w.mode.value = 'normal';
      w.snap.value = null;
      // Tiles may fall below an app's minimum; tiling is an explicit request.
      w.rect.value = { x: c * cw, y: r * rh, w: cw, h: rh };
    });
  });
}

export function minimizeAll(): void {
  batch(() => {
    for (const w of windows.peek()) {
      if (w.mode.peek() === 'max') wasMax.add(w.id);
      w.mode.value = 'min';
    }
    activeId.value = null;
  });
}

/** Cycle focus through windows in z-order (Alt+` / Alt+F6). */
export function cycle(dir: 1 | -1): void {
  const all = [...windows.peek()].sort((a, b) => b.z.peek() - a.z.peek());
  if (!all.length) return;
  if (dir === 1) {
    // bring the bottom-most to the front
    const target = all.length > 1 ? all[all.length - 1]! : all[0]!;
    focusWindow(target.id);
  } else {
    const cur = all[0]!;
    cur.z.value = 0;
    // push current to back by renumbering
    const rest = all.slice(1).reverse();
    rest.forEach((w) => (w.z.value = ++zCounter));
    const next = all[1] ?? cur;
    focusWindow(next.id);
  }
}

/** Keyboard move/size step. */
export function kbStep(dx: number, dy: number): void {
  const k = kbMode.peek();
  const w = getWin(k?.id);
  if (!k || !w) return;
  const r = displayRect(w);
  batch(() => {
    w.snap.value = null;
    if (w.mode.peek() === 'max') w.mode.value = 'normal';
    w.rect.value =
      k.kind === 'move'
        ? clampRect({ ...r, x: r.x + dx, y: r.y + dy }, minSizeOf(w))
        : clampRect({ ...r, w: r.w + dx, h: r.h + dy }, minSizeOf(w));
  });
}

export function kbEnd(commit: boolean): void {
  const k = kbMode.peek();
  const w = getWin(k?.id);
  if (k && w) {
    if (!commit) w.rect.value = k.orig;
    rememberRect(w);
  }
  kbMode.value = null;
}

export function kbStart(id: string, kind: 'move' | 'size'): void {
  const w = getWin(id);
  if (!w) return;
  if (w.mode.peek() === 'min') focusWindow(id);
  kbMode.value = { id, kind, orig: displayRect(w) };
  focusWindow(id);
}

/** Called when the workspace resizes. */
export function setWorkArea(w: number, h: number): void {
  workArea.value = { w: Math.max(200, Math.floor(w)), h: Math.max(160, Math.floor(h)) };
}
