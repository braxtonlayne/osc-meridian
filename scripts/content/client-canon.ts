/**
 * Restricted canon values (docs/CANON.md "Client canon"). The pipeline reads the full canon,
 * so every value that buildClientCanon withholds from the browser must also be withheld from
 * baseline pages: :c[] and ::canon-table compare each value with the client canon and emit a
 * redaction (same keys: T1 / T2 / compartment) when the client copy is a sentinel or null.
 */
import { buildClientCanon } from '../canon-merge.ts';
import type { Canon } from '../../src/core/canon-types';
import type { CanonData } from './canon.ts';
import { releaseKey } from './util.ts';

export interface Withheld {
  path: string;
  key: string;
  text: string;
  scrub: boolean;
}

export interface Restrictions {
  client: CanonData;
  withheld: Withheld[];
}

/** buildClientCanon over a possibly partial canon (test fixtures): missing collections are empty. */
export function deriveRestrictions(canon: CanonData | null): Restrictions | null {
  if (!canon) return null;
  const c = structuredClone(canon) as Record<string, unknown>;
  c.roster ??= [];
  c.facilities ??= [];
  c.threatDetail ??= [];
  if (!c.reserves || typeof c.reserves !== 'object') c.reserves = { items: [] };
  const r = c.reserves as { items?: unknown[] };
  r.items ??= [];
  const { client, withheld } = buildClientCanon(c as unknown as Canon);
  return { client: client as unknown as CanonData, withheld };
}

const SENTINEL_RE = /\[\[RX:([A-Z0-9+]+):(\d+)\]\]/g;

/** Combined (most restrictive) key for every sentinel in a client string, or null if none. */
export function sentinelKey(s: string): string | null {
  const keys = [...s.matchAll(SENTINEL_RE)].map((m) => m[1]!);
  if (!keys.length) return null;
  return combineKeys(keys);
}

export function combineKeys(keys: string[]): string {
  let tier: number | undefined;
  let compartment: string | undefined;
  for (const k of keys) {
    for (const part of k.split('+')) {
      const t = /^T(\d)$/.exec(part);
      if (t) tier = Math.min(tier ?? 9, Number(t[1]));
      else compartment ??= part;
    }
  }
  if (tier === 1) return 'T1';
  return releaseKey(tier, compartment);
}

/** Key for a value nulled in the client canon, from the nearest record that explains it. */
export function nullKey(records: unknown[]): string {
  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue;
    const o = rec as Record<string, unknown>;
    if (typeof o.tier === 'number' && o.tier <= 2) return `T${o.tier}`;
    // DELTA: every nulled number (position, depth, capacity, staff) is tier 1 (registry plan).
    if (o.class === 'DELTA') return 'T1';
    // Registry plan (canon-merge buildClientCanon): GAMMA depth is T2; ALPHA/BETA positions
    // and reactor identity at withheld sites are SEXTANT.
    if (o.class === 'GAMMA') return 'T2';
    if (o.class === 'ALPHA' || o.class === 'BETA') return 'SEXTANT';
    // Cover catalogue rows withheld by canon-merge (visibleSurfaceStaff is nulled).
    if (typeof o.facility === 'string' && 'coverAgency' in o) return 'SEXTANT';
    if (o.site === 'DETACHED / UNPOSTED') return 'HOLLOW';
  }
  return 'T1';
}

/**
 * Is this canon value restricted? Returns the release key or null.
 * `ancestors` are the enclosing full-canon records, innermost first.
 */
export function restrictedKey(fullVal: unknown, clientVal: unknown, ancestors: unknown[]): string | null {
  if (typeof clientVal === 'string') {
    const k = sentinelKey(clientVal);
    if (k) return k;
  }
  if (clientVal === null && fullVal !== null && fullVal !== undefined) return nullKey(ancestors);
  return null;
}

/** Redaction directive attributes for a key. */
export function rxAttributes(key: string, auth: string, ref: string): Record<string, string> {
  const a: Record<string, string> = { auth, ref };
  for (const part of key.split('+')) {
    const t = /^T(\d)$/.exec(part);
    if (t) a.tier = t[1]!;
    else a.compartment = part;
  }
  return a;
}
