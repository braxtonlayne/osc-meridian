/**
 * Shared plant state (pass two, docs/SPEC-2.md §2): one global key/value store for
 * every account, not namespaced. Values are JSON, persisted in localStorage under
 * `meridian:shared:<key>` (memory if storage is blocked), exposed as signals, and
 * synced live to other open tabs over BroadcastChannel('meridian-shared'), with the
 * `storage` event as a fallback (it fires in other tabs on every localStorage write).
 *
 * Only a key's owner writes it (docs/CONTRACTS.md "Shared plant state").
 */
import { signal } from '@preact/signals';
import type { ReadonlySignal, Signal } from '@preact/signals';
import type { SharedStore } from './contracts';

export const SHARED_PREFIX = 'meridian:shared:';
export const SHARED_CHANNEL = 'meridian-shared';

interface Msg {
  key: string;
  raw: string;
}

export interface SharedStoreHandle extends SharedStore {
  /** Close the channel and listeners (tests). */
  close(): void;
}

export interface SharedStoreOptions {
  storage?: Storage | null;
  channelName?: string;
  /** Listen for `storage` events on this target (default: window when present). */
  eventTarget?: EventTarget | null;
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function createSharedStore(opts: SharedStoreOptions = {}): SharedStoreHandle {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const sigs = new Map<string, Signal<unknown>>();
  /** Last serialised value seen per key (dedupes channel + storage event). */
  const raws = new Map<string, string | null>();
  const memory = new Map<string, string>();

  const readRaw = (key: string): string | null => {
    try {
      const v = storage?.getItem(SHARED_PREFIX + key);
      if (v != null) return v;
    } catch {
      /* storage unavailable */
    }
    return memory.get(key) ?? null;
  };

  const parse = (raw: string | null): { ok: boolean; value: unknown } => {
    if (raw == null) return { ok: false, value: undefined };
    try {
      return { ok: true, value: JSON.parse(raw) as unknown };
    } catch {
      return { ok: false, value: undefined };
    }
  };

  const fallbacks = new Map<string, unknown>();

  /** Apply a serialised value that arrived from elsewhere (other tab) or storage. */
  const apply = (key: string, raw: string | null): void => {
    if (raws.get(key) === raw) return;
    raws.set(key, raw);
    const s = sigs.get(key);
    if (!s) return;
    const p = parse(raw);
    s.value = p.ok ? p.value : fallbacks.get(key);
  };

  let chan: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      chan = new BroadcastChannel(opts.channelName ?? SHARED_CHANNEL);
      chan.onmessage = (e: MessageEvent<Msg>) => {
        const m = e.data;
        if (m && typeof m.key === 'string') {
          if (typeof m.raw === 'string') memory.set(m.key, m.raw);
          apply(m.key, m.raw ?? null);
        }
      };
    }
  } catch {
    chan = null;
  }

  const target = opts.eventTarget === undefined ? (typeof window !== 'undefined' ? window : null) : opts.eventTarget;
  const onStorage = (ev: Event) => {
    const e = ev as StorageEvent;
    if (!e.key || !e.key.startsWith(SHARED_PREFIX)) return;
    if (storage && e.storageArea && e.storageArea !== storage) return;
    apply(e.key.slice(SHARED_PREFIX.length), e.newValue);
  };
  target?.addEventListener('storage', onStorage);

  function get<T>(key: string, fallback: T): ReadonlySignal<T> {
    let s = sigs.get(key);
    if (!s) {
      fallbacks.set(key, fallback);
      const raw = readRaw(key);
      raws.set(key, raw);
      const p = parse(raw);
      s = signal<unknown>(p.ok ? p.value : fallback);
      sigs.set(key, s);
    }
    return s as ReadonlySignal<T>;
  }

  function set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    try {
      storage?.setItem(SHARED_PREFIX + key, raw);
    } catch {
      /* quota or blocked: memory + channel only */
    }
    raws.set(key, raw);
    const s = sigs.get(key);
    if (s) s.value = JSON.parse(raw) as unknown;
    else get(key, value);
    try {
      chan?.postMessage({ key, raw } satisfies Msg);
    } catch {
      /* channel closed */
    }
  }

  function update<T>(key: string, fallback: T, fn: (prev: T) => T): void {
    // Read storage, not the signal: another tab may have written since our last event.
    const p = parse(readRaw(key));
    const prev = (p.ok ? p.value : (sigs.get(key)?.peek() ?? fallback)) as T;
    set(key, fn(prev));
  }

  return {
    get,
    set,
    update,
    close() {
      target?.removeEventListener('storage', onStorage);
      chan?.close();
      chan = null;
    },
  };
}

let page: SharedStoreHandle | null = null;
const pageStore = (): SharedStoreHandle => (page ??= createSharedStore());

/** The page-wide shared store (services.shared); its channel opens on first use. */
export const shared: SharedStore = {
  get: (key, fallback) => pageStore().get(key, fallback),
  set: (key, value) => pageStore().set(key, value),
  update: (key, fallback, fn) => pageStore().update(key, fallback, fn),
};
