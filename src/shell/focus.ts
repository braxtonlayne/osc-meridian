/**
 * Keyboard focus follows the window manager:
 *  - a window that opens or is activated (click, taskbar, Alt+F6 cycle) receives focus:
 *    its `[data-autofocus]` element, else the first focusable control in its content
 *    (outside the menu bar), else the content region itself;
 *  - when the active window closes or is minimised, focus goes to the next window, or to
 *    the taskbar's Directory button when none is left;
 *  - nothing moves when focus is already inside the target window (a click on a control,
 *    an app that focuses its own field on mount).
 * Apps load lazily, so the move waits (up to ~4 s) for the window's content to arrive.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

let job = 0;

function winEl(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-win-id="${CSS.escape(id)}"]`);
}

function visible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0 && !el.closest('[hidden], [aria-hidden="true"]');
}

/** The element a window gives focus to, or null while its content is still loading. */
export function focusTarget(win: HTMLElement): HTMLElement | null {
  const body = win.querySelector<HTMLElement>('.win-body');
  if (!body || body.querySelector('.win-loading')) return null;
  const auto = body.querySelector<HTMLElement>('[data-autofocus]');
  if (auto && visible(auto)) return auto;
  for (const el of body.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.closest('[role="menubar"], [role="menu"]')) continue;
    if (visible(el)) return el;
  }
  // No control yet (a document still fetching, a refusal panel): the content region.
  if (!body.hasAttribute('tabindex')) body.tabIndex = -1;
  return body;
}

/** Move focus into window `id` once its content is there (no-op if focus is already inside). */
export function focusInto(id: string): void {
  const my = ++job;
  const until = performance.now() + 4000;
  let settled = 0;
  let placed = false;
  const tick = () => {
    if (my !== job) return;
    const win = winEl(id);
    if (!win || win.hidden) return;
    const a = document.activeElement;
    const dropped = !a || a === document.body;
    // While the lock screen (or another modal) is up it keeps focus; try again afterwards.
    const blocked = !!document.querySelector('.lock, .modal-scrim');
    if (win.contains(a)) placed = true;
    else if (!blocked) {
      // Focus was placed and then moved elsewhere on purpose (the operator did it): stop.
      if (placed && !dropped) return;
      const t = focusTarget(win);
      // Give the app a few frames after its content mounts to take focus itself.
      if (t && (t !== win.querySelector('.win-body') || settled > 8)) {
        t.focus({ preventScroll: true });
        placed = true;
      }
    }
    settled++;
    // Keep watching until the deadline: a lazily loaded app can replace the element that
    // held focus (a loading line, a placeholder), which drops focus back to <body>.
    if (performance.now() < until) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Focus the taskbar's Directory button (no window left to hold focus). */
export function focusTaskbar(): void {
  ++job;
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.taskbar .dir-button')?.focus({ preventScroll: true }));
}

/**
 * F10 from anywhere in the active window (or from outside every window) reaches that
 * window's menu bar: the design MenuBar listens on its parent element, so hand the key to it.
 * Returns true when handled.
 */
export function f10ToMenuBar(id: string): boolean {
  const win = winEl(id);
  const bar = win?.querySelector<HTMLElement>('[role="menubar"]');
  const host = bar?.parentElement;
  if (!bar || !host) return false;
  if (host.contains(document.activeElement)) return false; // MenuBar handles it itself
  host.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', bubbles: false, cancelable: true }));
  if (!bar.contains(document.activeElement)) bar.querySelector<HTMLElement>('[data-top="0"]')?.focus();
  return true;
}
