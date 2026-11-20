/**
 * Tier 4 closed world (docs/SPEC-2.md §1): nothing a Tier 4 session sees names another facility.
 *
 * Documents issued to Tier 4 are written for it, but their register metadata (originator,
 * revision history, routing offices, approval blocks) still carries the issuing office's site, e.g.
 * "CMS/ALPHA-02". For a Tier 4 session the docs layer passes route entries and loaded documents
 * through these helpers: an office code keeps its division ("CMS"), a trailing ", ALPHA-01" after
 * an office name is dropped, and any other facility id reads "another site". The operator's own site is left as written.
 */
import type { DocJson, RouteEntry } from './contracts';

const OFFICE_RE = /\b([A-Z]{2,4})\/((?:ALPHA|BETA|GAMMA|DELTA)-\d{2})\b/g;
const SITE_RE = /\b(?:ALPHA|BETA|GAMMA|DELTA)-\d{2}\b/g;
const TRAILING_RE = /,\s*((?:ALPHA|BETA|GAMMA|DELTA)-\d{2})\b/g;

/** Text with every facility other than `home` removed (office codes keep their division). */
export function closeWorldText(s: string, home: string): string {
  if (!s) return s;
  return s
    .replace(OFFICE_RE, (m: string, div: string, site: string) => (site === home ? m : div))
    .replace(TRAILING_RE, (m: string, site: string) => (site === home ? m : ''))
    .replace(SITE_RE, (m) => (m === home ? m : 'another site'));
}

/** Deep copy of a JSON-like value with closeWorldText applied to every string. */
export function closeWorldDeep<T>(v: T, home: string): T {
  if (typeof v === 'string') return closeWorldText(v, home) as T;
  if (Array.isArray(v)) return v.map((x: unknown) => closeWorldDeep(x, home)) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = closeWorldDeep(x, home);
    return out as T;
  }
  return v;
}

/** Route entry as a Tier 4 session sees it: originator without another site. Title and docNo are unchanged. */
export function closeRoute(r: RouteEntry, home: string): RouteEntry {
  const originator = closeWorldText(r.originator, home);
  return originator === r.originator ? r : { ...r, originator };
}

/** Loaded document as a Tier 4 session sees it: metadata, frontmatter, distribution and cross-reference titles. */
export function closeDoc(d: DocJson, home: string): DocJson {
  return {
    ...d,
    originator: closeWorldText(d.originator, home),
    summary: closeWorldText(d.summary, home),
    distribution: d.distribution ? d.distribution.map((x) => closeWorldText(x, home)) : d.distribution,
    xrefs: d.xrefs.map((x) => ({ ...x, title: closeWorldText(x.title, home) })),
    frontmatter: closeWorldDeep(d.frontmatter, home),
  };
}
