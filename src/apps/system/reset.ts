/**
 * Reinitialise local profile (System Tools): clears one account's namespace, or every
 * account plus the shared plant state, from localStorage and the workstation's IndexedDB
 * store (idb-keyval 'meridian' / 'kv', as src/core/persist.ts uses). Key selection is the
 * pure `resetKeys` in logic.ts. Settings and the active-account pointer are kept.
 */
import { createStore, delMany, keys as idbKeys } from 'idb-keyval';
import type { AccountId, AuditEntry } from '@core/contracts';
import { flush } from '@core/persist';
import { ACCOUNT_PREFIX, resetKeys, type ResetScope } from './logic';

function localKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) out.push(k);
    }
  } catch {
    /* storage unavailable */
  }
  return out;
}

/**
 * Clear the selected keys. `carry` (the audit line recording the reset) is written back as the
 * first entry of the reinitialised profile's trail, so the reset itself stays on record.
 * Returns the number of keys cleared.
 */
export async function reinitialise(scope: ResetScope, account: AccountId, carry?: AuditEntry): Promise<number> {
  // Pending coalesced writes first, so none lands after the clear.
  await flush();
  let n = 0;
  const ls = resetKeys(localKeys(), scope, account);
  for (const k of ls) {
    try {
      localStorage.removeItem(k);
      n++;
    } catch {
      /* storage unavailable */
    }
  }
  if (typeof indexedDB !== 'undefined') {
    try {
      const store = createStore('meridian', 'kv');
      const all = (await idbKeys(store)).map(String);
      const del = resetKeys(all, scope, account);
      if (del.length) await delMany(del, store);
      n += del.length;
    } catch {
      /* IndexedDB unavailable: localStorage cleared only */
    }
  }
  if (carry) {
    try {
      localStorage.setItem(`${ACCOUNT_PREFIX}${account}:audit`, JSON.stringify([{ ...carry, seq: 1 }]));
    } catch {
      /* storage unavailable */
    }
  }
  return n;
}
