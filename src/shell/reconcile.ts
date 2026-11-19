/**
 * Shell-level plant reconciler: keeps shared plant state moving with no app window open.
 *
 * After sign-in the registry (./reconcilers.ts, a lazy chunk) is loaded and each app's pure
 * `reconcile(services, now)` runs on a change of any shared key it names (debounced) and on a
 * modest interval, only while signed in. One tab per account runs it at a time (a short lease in
 * localStorage); reconcilers are idempotent, so an overlap at lease hand-over is harmless. An
 * app whose window is open in this (visible) tab does its own housekeeping, so its reconciler is
 * skipped here. A reconciler that throws is logged and skipped; it never stops the others.
 */
import { effect } from '@preact/signals';
import { services } from '@core/services';
import * as session from '@core/session';
import { windows } from './wm';

export const INTERVAL_MS = 2000;
const LEASE_MS = 6000;
const DEBOUNCE_MS = 50;

const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);

function leaseKey(): string {
  return `meridian:reconcile:lease:${services.account.id.peek()}`;
}

/** Take or renew this account's lease; false while another live tab holds it. */
export function holdLease(now: number = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(leaseKey());
    const cur = raw ? (JSON.parse(raw) as { tab?: unknown; until?: unknown }) : null;
    if (cur && cur.tab !== tabId && typeof cur.until === 'number' && cur.until > now) return false;
    localStorage.setItem(leaseKey(), JSON.stringify({ tab: tabId, until: now + LEASE_MS }));
    return true;
  } catch {
    return true; // storage unavailable: this tab is the only one that can run
  }
}

let started = false;

/** Call once at boot; the registry chunk loads at the first sign-in. */
export function startReconcile(): void {
  if (started) return;
  started = true;
  const stop = effect(() => {
    if (!session.signedIn.value) return;
    queueMicrotask(() => stop());
    load();
  });
}

function load(): void {
  void import('./reconcilers')
    .then(({ RECONCILERS }) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      const pass = () => {
        timer = null;
        if (!session.signedIn.peek()) return;
        const now = Date.now();
        if (!holdLease(now)) return;
        const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
        const open = visible ? new Set(windows.peek().map((w) => w.appId)) : new Set();
        for (const r of RECONCILERS) {
          if (open.has(r.app)) continue;
          try {
            r.reconcile(services, now);
          } catch (err) {
            console.error(`MERIDIAN reconcile ${r.app}`, err);
          }
        }
      };
      const soon = () => {
        if (timer == null) timer = setTimeout(pass, DEBOUNCE_MS);
      };
      // One signal per key is shared by every reader, created with the first reader's fallback,
      // so subscribe with the owner's fallback (never a generic null).
      const keys = new Map<string, unknown>();
      for (const r of RECONCILERS) for (const [k, fb] of Object.entries(r.keys)) if (!keys.has(k)) keys.set(k, fb);
      const sigs = [...keys].map(([k, fb]) => services.shared.get<unknown>(k, fb));
      effect(() => {
        for (const s of sigs) void s.value;
        void session.signedIn.value;
        soon();
      });
      setInterval(pass, INTERVAL_MS);
      window.addEventListener('pagehide', () => {
        try {
          const raw = localStorage.getItem(leaseKey());
          if (raw && (JSON.parse(raw) as { tab?: unknown }).tab === tabId) localStorage.removeItem(leaseKey());
        } catch {
          /* ignore */
        }
      });
    })
    .catch((err: unknown) => console.error('MERIDIAN reconcile load', err));
}
