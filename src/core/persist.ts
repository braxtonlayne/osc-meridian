/**
 * Local persistence for MERIDIAN. Nothing ever leaves the browser.
 *
 * - `load` / `save` use IndexedDB through idb-keyval, falling back to
 *   localStorage, then to memory (private windows, blocked storage).
 * - `loadSync` / `saveSync` use localStorage only; for small values that must be
 *   available before the first paint (settings).
 * All keys are namespaced `meridian:`.
 */
import { createStore, get, set, del } from 'idb-keyval';
import type { UseStore } from 'idb-keyval';

const NS = 'meridian:';
const memory = new Map<string, unknown>();
let store: UseStore | null = null;
let idbOk = typeof indexedDB !== 'undefined';

function idb(): UseStore | null {
  if (!idbOk) return null;
  if (!store) {
    try {
      store = createStore('meridian', 'kv');
    } catch {
      idbOk = false;
      return null;
    }
  }
  return store;
}

function lsGet(key: string): unknown {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function load<T>(key: string, fallback: T): Promise<T> {
  const s = idb();
  if (s) {
    try {
      const v = await get<T>(NS + key, s);
      if (v !== undefined) return v;
    } catch {
      idbOk = false;
    }
  }
  const l = lsGet(key);
  if (l !== undefined) return l as T;
  if (memory.has(key)) return memory.get(key) as T;
  return fallback;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Persist a value. Writes are coalesced per key (default 150 ms). */
export function save(key: string, value: unknown, delayMs = 150): void {
  memory.set(key, value);
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void writeNow(key, value);
    }, delayMs),
  );
}

async function writeNow(key: string, value: unknown): Promise<void> {
  const s = idb();
  if (s) {
    try {
      await set(NS + key, value, s);
      return;
    } catch {
      idbOk = false;
    }
  }
  lsSet(key, value);
}

export async function remove(key: string): Promise<void> {
  memory.delete(key);
  const s = idb();
  if (s) {
    try {
      await del(NS + key, s);
    } catch {
      /* storage unavailable */
    }
  }
  try {
    localStorage.removeItem(NS + key);
  } catch {
    /* storage unavailable */
  }
}

export function loadSync<T>(key: string, fallback: T): T {
  const v = lsGet(key);
  if (v !== undefined) return v as T;
  if (memory.has(key)) return memory.get(key) as T;
  return fallback;
}

export function saveSync(key: string, value: unknown): void {
  memory.set(key, value);
  lsSet(key, value);
}
