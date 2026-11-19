/**
 * Library search over the prebuilt MiniSearch index (public/data/search.json, built by
 * scripts/build-content.ts from baseline-redacted text only).
 *
 * Shell wiring:
 *   const search = createSearch({ satisfies: (k) => clearance.satisfies(k), byRoute: docs.byRoute });
 *   services.search = search;            // (q) => Promise<{ route, score, snippet }[]>
 * Results whose access requirement the session does not satisfy are dropped.
 *
 * Accounts (pass two): add `account: () => services.account.id.value` and `all: docs.all`. An account
 * with at least one variant searches data/search@<account>.json (the base index with its variants
 * substituted); every other account, or a failed fetch, uses data/search.json. Hits always carry
 * the base RouteEntry (same route/docNo); the snippet is the variant's summary. Pass
 * `visible: readableByTier4` (from docs.ts) for the Tier 4 account.
 */
import MiniSearch, { type Options, type SearchResult } from 'minisearch';
import type { AccountId, RouteEntry } from './contracts';
import { asset } from './base';

export interface SearchDoc {
  id: string;
  route: string;
  title: string;
  docNo: string;
  /** Other docNos this page answers for, space-separated (indexed, not stored). */
  aliases?: string;
  summary: string;
  text: string;
  marking: string;
  app: string;
  tier?: number;
  compartment?: string;
}

/** Shared by the index builder and the client loader; must stay identical on both sides. */
export const SEARCH_OPTIONS: Options<SearchDoc> = {
  idField: 'id',
  fields: ['title', 'docNo', 'aliases', 'summary', 'text'],
  storeFields: ['route', 'title', 'docNo', 'marking', 'app', 'summary', 'tier', 'compartment'],
  searchOptions: {
    boost: { docNo: 4, aliases: 4, title: 3, summary: 2 },
    prefix: true,
    fuzzy: 0.2,
  },
};

/** Requirement key for a route's access block ("T2", "KESTREL", "KESTREL+T2"), or null if open. */
export function accessKey(access: { tier?: number; compartment?: string } | undefined | null): string | null {
  if (!access) return null;
  const { tier, compartment } = access;
  if (compartment && tier) return `${compartment}+T${tier}`;
  if (compartment) return compartment;
  if (tier) return `T${tier}`;
  return null;
}

/** Route family of mailbox messages: they exist for the operator only once delivered. */
export const MESSAGE_FAMILY = 'mail';

/** True for a message document (route family `mail`). */
export function isMessageEntry(r: Pick<RouteEntry, 'family'>): boolean {
  return r.family === MESSAGE_FAMILY;
}

/**
 * Whether the operator holds a document: everything that is not a message, and messages
 * whose id is in the delivered list. An undelivered message is not held anywhere the
 * operator can reach (search, records, terminal, direct route).
 */
export function isHeldEntry(r: Pick<RouteEntry, 'family' | 'id'>, delivered: ReadonlySet<string> | readonly string[]): boolean {
  if (!isMessageEntry(r)) return true;
  return Array.isArray(delivered) ? delivered.includes(r.id) : (delivered as ReadonlySet<string>).has(r.id);
}

/** Drops hits for messages not yet delivered. Not counted as withheld: their existence is not disclosed. */
export function heldHits<T extends { route: Pick<RouteEntry, 'family' | 'id'> }>(hits: readonly T[], delivered: readonly string[]): T[] {
  const set = new Set(delivered);
  return hits.filter((h) => isHeldEntry(h.route, set));
}

export interface SearchHit {
  route: RouteEntry;
  score: number;
  snippet: string;
}

export interface SearchDeps {
  satisfies: (key: string) => boolean;
  byRoute: (route: string) => RouteEntry | undefined;
  /**
   * Override for tests; defaults to fetching data/search.json, or data/search@<account>.json
   * for an account that has its own index. `account` is null for the base index.
   */
  loadIndex?: (account: AccountId | null) => Promise<string>;
  limit?: number;
  /** Active account (pass two). Read once, on the first search (switching accounts reloads the page). */
  account?: () => AccountId | null | undefined;
  /**
   * Route table, used to tell whether the active account has its own index (any route listing
   * it in `variants`). Without it the account index is tried and the base index is the fallback.
   */
  all?: () => RouteEntry[];
  /** Extra visibility rule per hit (e.g. the Tier 4 rule `readableByTier4` from docs.ts). */
  visible?: (route: RouteEntry) => boolean;
}

/** Index file for an account (search@<account>.json) or the base index (search.json). */
export function searchIndexPath(account: AccountId | null | undefined): string {
  return account ? `data/search@${account}.json` : 'data/search.json';
}

async function fetchIndex(account: AccountId | null): Promise<string> {
  const r = await fetch(asset(searchIndexPath(account)));
  if (!r.ok) throw new Error(`search index unavailable (${r.status})`);
  return r.text();
}

export function createSearch(deps: SearchDeps): (q: string) => Promise<SearchHit[]> {
  let index: Promise<MiniSearch<SearchDoc>> | null = null;
  const loadText = async (): Promise<string> => {
    const get = deps.loadIndex ?? fetchIndex;
    const account = deps.account?.() ?? null;
    const own = account && (deps.all ? deps.all().some((r) => r.variants?.includes(account)) : true);
    if (!own) return get(null);
    try {
      return await get(account);
    } catch {
      return get(null);
    }
  };
  const load = () =>
    (index ??= loadText()
      .then((json) => MiniSearch.loadJSON<SearchDoc>(json, SEARCH_OPTIONS))
      .catch((e: unknown) => {
        index = null;
        throw e;
      }));

  return async (q: string) => {
    const query = q.trim();
    if (!query) return [];
    const ms = await load();
    let raw: SearchResult[] = ms.search(query, { combineWith: 'AND' });
    if (!raw.length) raw = ms.search(query, { combineWith: 'OR' });
    const hits: SearchHit[] = [];
    for (const r of raw) {
      const key = accessKey({ tier: r.tier as number | undefined, compartment: r.compartment as string | undefined });
      if (key && !deps.satisfies(key)) continue;
      const route = deps.byRoute(r.route as string);
      if (!route) continue;
      if (deps.visible && !deps.visible(route)) continue;
      hits.push({ route, score: r.score, snippet: String(r.summary ?? '') });
      if (hits.length >= (deps.limit ?? 50)) break;
    }
    return hits;
  };
}
