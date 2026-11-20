/**
 * Local persistence for MERIDIAN. Nothing ever leaves the browser.
 *
 * - `load` / `save` use IndexedDB through idb-keyval, falling back to
 *   localStorage, then to memory (private windows, blocked storage).
 * - `loadSync` / `saveSync` use localStorage only; for small values that must be
 *   available before the first paint (settings).
 *
 * Namespacing (pass two, docs/SPEC-2.md §1): every key belongs to the active
 * account and is stored as `meridian:acct:<accountId>:<key>`, except the global
 * keys in GLOBAL_KEYS (`settings`, the active-account pointer). The shared plant
 * store (src/core/shared.ts) writes its own `meridian:shared:` keys and never
 * goes through here. Pass-one unprefixed keys are moved into `analyst` once by
 * `migrateLegacy()`.
 */
import { createStore, get, set, del, keys as idbKeys } from 'idb-keyval';
import type { UseStore } from 'idb-keyval';
import type { AccountId } from './contracts';

const NS = 'meridian:';
/** Keys that are not per account. */
export const GLOBAL_KEYS: ReadonlySet<string> = new Set(['settings', 'activeAccount']);
/** Prefixes owned by other stores (never namespaced, never migrated). */
const FOREIGN_PREFIXES = ['acct:', 'shared:'];
/** Marker written into the analyst namespace once migration has run. */
const MIGRATED_KEY = '_migrated';

let active: AccountId = 'analyst';
const memory = new Map<string, unknown>();
let store: UseStore | null = null;
let idbOk = typeof indexedDB !== 'undefined';

/** Set the account whose namespace load/save use. Call before any store initialises. */
export function setActiveAccount(id: AccountId): void {
  active = id;
}

export function activeAccount(): AccountId {
  return active;
}

/** Full storage key for `key` in `account`'s namespace (global keys are not prefixed). */
export function storageKey(key: string, account: AccountId = active): string {
  return GLOBAL_KEYS.has(key) ? NS + key : `${NS}acct:${account}:${key}`;
}

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

function lsGetRaw(full: string): unknown {
  try {
    const raw = localStorage.getItem(full);
    return raw == null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
}

function lsSetRaw(full: string, value: unknown): boolean {
  try {
    localStorage.setItem(full, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

async function loadFull<T>(full: string, fallback: T): Promise<T> {
  const s = idb();
  if (s) {
    try {
      const v = await get<T>(full, s);
      if (v !== undefined) return v;
    } catch {
      idbOk = false;
    }
  }
  const l = lsGetRaw(full);
  if (l !== undefined) return l as T;
  if (memory.has(full)) return memory.get(full) as T;
  return fallback;
}

export async function load<T>(key: string, fallback: T): Promise<T> {
  return loadFull(storageKey(key), fallback);
}

/**
 * Read-only load from another account's namespace (Assurance audit review).
 * Pending writes of the active account are not visible here unless flushed.
 */
export async function loadFrom<T>(account: AccountId, key: string, fallback: T): Promise<T> {
  return loadFull(storageKey(key, account), fallback);
}

const timers = new Map<string, { h: ReturnType<typeof setTimeout>; value: unknown }>();

/** Persist a value. Writes are coalesced per key (default 150 ms). */
export function save(key: string, value: unknown, delayMs = 150): void {
  const full = storageKey(key);
  memory.set(full, value);
  const prev = timers.get(full);
  if (prev) clearTimeout(prev.h);
  timers.set(full, {
    value,
    h: setTimeout(() => {
      timers.delete(full);
      void writeNow(full, value);
    }, delayMs),
  });
}

/** Write every pending coalesced value now (before an account-switch reload). */
export async function flush(): Promise<void> {
  const pending = [...timers.entries()];
  timers.clear();
  await Promise.all(
    pending.map(([full, t]) => {
      clearTimeout(t.h);
      return writeNow(full, t.value);
    }),
  );
}

async function writeNow(full: string, value: unknown): Promise<void> {
  const s = idb();
  if (s) {
    try {
      await set(full, value, s);
      return;
    } catch {
      idbOk = false;
    }
  }
  lsSetRaw(full, value);
}

export async function remove(key: string): Promise<void> {
  const full = storageKey(key);
  memory.delete(full);
  const s = idb();
  if (s) {
    try {
      await del(full, s);
    } catch {
      /* storage unavailable */
    }
  }
  try {
    localStorage.removeItem(full);
  } catch {
    /* storage unavailable */
  }
}

export function loadSync<T>(key: string, fallback: T): T {
  const full = storageKey(key);
  const v = lsGetRaw(full);
  if (v !== undefined) return v as T;
  if (memory.has(full)) return memory.get(full) as T;
  return fallback;
}

export function saveSync(key: string, value: unknown): void {
  const full = storageKey(key);
  memory.set(full, value);
  lsSetRaw(full, value);
}

/* ------------------------------------------------------------- migration */

/** A pass-one key: `meridian:<key>` that is neither global nor owned by another store. */
function legacyKey(full: string): string | null {
  if (!full.startsWith(NS)) return null;
  const k = full.slice(NS.length);
  if (!k || GLOBAL_KEYS.has(k) || FOREIGN_PREFIXES.some((p) => k.startsWith(p))) return null;
  return k;
}

/**
 * Move pass-one unprefixed keys (`meridian:audit`, `meridian:mail`, `meridian:wm:pos`, ...)
 * into the `analyst` namespace, once. A value already present in the namespace wins.
 * Returns the keys moved.
 */
export async function migrateLegacy(): Promise<string[]> {
  const marker = storageKey(MIGRATED_KEY, 'analyst');
  if (lsGetRaw(marker) === true) return [];
  const moved = new Set<string>();
  const s = idb();
  if (s) {
    try {
      const all = (await idbKeys(s)).map(String);
      for (const full of all) {
        const k = legacyKey(full);
        if (!k) continue;
        const target = storageKey(k, 'analyst');
        const v = await get<unknown>(full, s);
        if ((await get<unknown>(target, s)) === undefined && v !== undefined) await set(target, v, s);
        await del(full, s);
        moved.add(k);
      }
    } catch {
      idbOk = false;
    }
  }
  try {
    const lsKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (full) lsKeys.push(full);
    }
    for (const full of lsKeys) {
      const k = legacyKey(full);
      if (!k) continue;
      const target = storageKey(k, 'analyst');
      const raw = localStorage.getItem(full);
      if (raw != null && localStorage.getItem(target) == null) localStorage.setItem(target, raw);
      localStorage.removeItem(full);
      moved.add(k);
    }
  } catch {
    /* storage unavailable */
  }
  lsSetRaw(marker, true);
  return [...moved];
}

/** Tests only: forget memory, timers and the cached IndexedDB handle. */
export function _resetForTests(): void {
  for (const t of timers.values()) clearTimeout(t.h);
  timers.clear();
  memory.clear();
  active = 'analyst';
}
