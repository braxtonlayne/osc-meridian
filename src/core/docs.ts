/**
 * Document service (implements Services['docs']).
 *
 * Shell wiring:
 *   const docs = createDocs({ satisfies: (k) => clearance.satisfies(k) });
 *   services.docs = docs;
 * `satisfies` is called on every load(), so compartments granted mid-session take effect on the
 * next load of a document. Release files (data/releases/<KEY>.json) are fetched at most once
 * each, and only for keys the session satisfies. Tier-1 keys are never requested (none ship).
 *
 * Released text replaces the baseline bar:
 *   inline  <span class="rx-released" data-rx="<id>" data-key data-auth data-ref>…</span>
 *   block   <div class="rx-released rx-block" data-rx="<id>" data-key data-auth data-ref>…</div>
 */
import type { DocJson, ReleaseKey, RouteEntry, Services } from './contracts';
import { asset } from './base';

const generated = import.meta.glob<RouteEntry[]>('../../.generated/routes.json', { eager: true, import: 'default' });
const GENERATED_ROUTES: RouteEntry[] = Object.values(generated)[0] ?? [];

export interface DocsDeps {
  satisfies: (key: ReleaseKey) => boolean;
  /** Defaults to .generated/routes.json bundled at build time. */
  routes?: RouteEntry[];
  /** Defaults to fetch(url).then(r => r.json()). */
  fetchJson?: (url: string) => Promise<unknown>;
}

export type DocsService = Services['docs'] & {
  /** Drop cached DocJson/release files (tests, or after a content hot reload). */
  clearCache(): void;
};

export function isTier1Key(key: string): boolean {
  return /(^|\+)T1$/.test(key);
}

const BASELINE_RE = /<(span|div) class="rx( rx-block)?" data-rx="([^"]+)"([^>]*)><\/\1>/g;
const KEEP_ATTR_RE = /\s(data-(?:key|auth|ref))="([^"]*)"/g;

/** Swap baseline redaction bars for released HTML. Repeats so nested releases open too. */
export function applyReleases(html: string, released: Record<string, string>): string {
  let out = html;
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    out = out.replace(BASELINE_RE, (whole, tag: string, block: string | undefined, id: string, attrs: string) => {
      const body = released[id];
      if (body === undefined) return whole;
      changed = true;
      const kept = [...attrs.matchAll(KEEP_ATTR_RE)].map((m) => ` ${m[1]}="${m[2]}"`).join('');
      const cls = block ? 'rx-released rx-block' : 'rx-released';
      return `<${tag} class="${cls}" data-rx="${id}"${kept}>${body}</${tag}>`;
    });
    if (!changed) break;
  }
  return out;
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

export function createDocs(deps: DocsDeps): DocsService {
  const routes = [...(deps.routes ?? GENERATED_ROUTES)];
  const byRouteMap = new Map(routes.map((r) => [r.route, r]));
  // routes.json entries may carry `aliases` (other docNos the page answers for); primary docNo wins.
  const byDocNoMap = new Map<string, RouteEntry>();
  for (const r of routes) for (const a of (r as RouteEntry & { aliases?: string[] }).aliases ?? []) byDocNoMap.set(a, r);
  for (const r of routes) byDocNoMap.set(r.docNo, r);
  const fetchJson = deps.fetchJson ?? defaultFetchJson;
  const docCache = new Map<string, Promise<DocJson>>();
  const releaseCache = new Map<string, Promise<Record<string, string>>>();

  const getDoc = (id: string) => {
    let p = docCache.get(id);
    if (!p) {
      p = fetchJson(asset(`data/docs/${encodeURIComponent(id)}.json`)) as Promise<DocJson>;
      p.catch(() => docCache.delete(id));
      docCache.set(id, p);
    }
    return p;
  };

  const getRelease = (key: string) => {
    let p = releaseCache.get(key);
    if (!p) {
      // '+' is kept literal: release files are named exactly <KEY>.json on disk.
      p = (fetchJson(asset(`data/releases/${key}.json`)) as Promise<Record<string, string>>).catch(() => {
        releaseCache.delete(key);
        return {};
      });
      releaseCache.set(key, p);
    }
    return p;
  };

  return {
    async load(id: string): Promise<DocJson> {
      const doc = await getDoc(id);
      const keys = [...new Set(doc.redactions.map((r) => r.key))].filter((k) => !isTier1Key(k) && deps.satisfies(k));
      if (!keys.length) return { ...doc };
      const files = await Promise.all(keys.map(getRelease));
      const mine = new Set(doc.redactions.map((r) => r.id));
      const released: Record<string, string> = {};
      for (const f of files) for (const [rid, h] of Object.entries(f)) if (mine.has(rid)) released[rid] = h;
      return { ...doc, html: applyReleases(doc.html, released) };
    },
    byRoute: (route: string) => byRouteMap.get(route),
    byDocNo: (docNo: string) => byDocNoMap.get(docNo),
    all: () => routes.slice(),
    clearCache() {
      docCache.clear();
      releaseCache.clear();
    },
  };
}
