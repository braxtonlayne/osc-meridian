/**
 * Records Library: pure helpers (no DOM, no services) so they can be unit-tested.
 * Series classification from the canon numbering scheme, folder and facet logic,
 * and search-result snippets built from baseline-redacted document HTML.
 */
import type { RouteEntry } from '@core/contracts';

/* ------------------------------------------------------------- access */

/** Requirement key for a route's access block ("T2", "QUARRY", "QUARRY+T3"), or null if open. */
export function accessKeyOf(access: RouteEntry['access'] | undefined | null): string | null {
  if (!access) return null;
  const { tier, compartment } = access;
  if (compartment && tier) return `${compartment}+T${tier}`;
  if (compartment) return compartment;
  if (tier) return `T${tier}`;
  return null;
}

/** Short wording of a route's access requirement for list columns. */
export function accessWords(access: RouteEntry['access'] | undefined | null): string {
  if (!access) return 'Open';
  return access.compartment ? `Tier ${access.tier} + ${access.compartment}` : `Tier ${access.tier}`;
}

/* ------------------------------------------------------------- series */

export interface NumberingRule {
  family: string;
  pattern: string;
}

export interface SeriesMatcher {
  family: string;
  re: RegExp;
}

/**
 * Turn a canon numbering pattern into an anchored regex.
 * `NNNN` / `YY` / `YYYY` are digit runs, `<...>` is any id, `[...]` is optional,
 * and `QN` is a quarter.
 */
export function patternToRegex(pattern: string): RegExp {
  // Split off optional groups first so their contents get the same treatment.
  const conv = (s: string): string => {
    let out = '';
    let i = 0;
    while (i < s.length) {
      const ch = s[i]!;
      if (ch === '<') {
        const end = s.indexOf('>', i);
        out += '[A-Z0-9]+(?:-[A-Z0-9]+)*';
        i = end < 0 ? s.length : end + 1;
        continue;
      }
      if (ch === '[') {
        const end = s.indexOf(']', i);
        out += `(?:${conv(s.slice(i + 1, end < 0 ? s.length : end))})?`;
        i = end < 0 ? s.length : end + 1;
        continue;
      }
      // A run of N or Y counts as digits only when it is a whole token (not inside a word like CNL).
      const run = /^(N+|Y+)/.exec(s.slice(i));
      const prev = i > 0 ? s[i - 1]! : '';
      if (run && !/[A-Z]/.test(prev)) {
        const after = s[i + run[1]!.length] ?? '';
        if (!/[A-Z]/.test(after)) {
          out += `\\d{${run[1]!.length}}`;
          i += run[1]!.length;
          continue;
        }
      }
      if (s.startsWith('QN', i) && !/[A-Z]/.test(prev)) {
        out += 'Q\\d';
        i += 2;
        continue;
      }
      out += /[A-Za-z0-9]/.test(ch) ? ch : `\\${ch}`;
      i++;
    }
    return out;
  };
  return new RegExp(`^${conv(pattern)}$`);
}

export function seriesMatchers(rules: readonly NumberingRule[]): SeriesMatcher[] {
  return rules.map((r) => ({
    family: r.family,
    re: patternToRegex(r.pattern),
  }));
}

/** Numbering family of a document number ("Memorandum"), or null when it fits no scheme. */
export function seriesOf(docNo: string, matchers: readonly SeriesMatcher[]): string | null {
  const d = docNo.toUpperCase();
  for (const m of matchers) if (m.re.test(d)) return m.family;
  return null;
}

/* --------------------------------------------------- originators etc. */

/** "PV/ALPHA-01" -> "PV". */
export function divisionOf(originator: string): string {
  return (originator.split('/')[0] ?? originator).trim();
}

/** "PV/ALPHA-01" -> "ALPHA-01" (or "" when no site part). */
export function siteOf(originator: string): string {
  return (originator.split('/')[1] ?? '').trim();
}

export function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

/** Highest-ranked marking id among `ids`, using canon ranks. */
export function highestMarking<M extends string>(ids: readonly M[], rank: (id: M) => number, fallback: M): M {
  let best: M | null = null;
  for (const id of ids) if (best === null || rank(id) > rank(best)) best = id;
  return best ?? fallback;
}

/* ------------------------------------------------------------- facets */

export type FacetId = 'family' | 'division' | 'marking' | 'year';
export const FACET_IDS: FacetId[] = ['family', 'division', 'marking', 'year'];

export function facetValue(r: RouteEntry, f: FacetId): string {
  switch (f) {
    case 'family':
      return r.family;
    case 'division':
      return divisionOf(r.originator);
    case 'marking':
      return r.marking;
    case 'year':
      return yearOf(r.date);
  }
}

export type FacetSelection = Partial<Record<FacetId, string[]>>;

/** True when `r` passes every facet with a selection (OR within a facet, AND across facets). */
export function passesFacets(r: RouteEntry, sel: FacetSelection, skip?: FacetId): boolean {
  for (const f of FACET_IDS) {
    if (f === skip) continue;
    const vals = sel[f];
    if (vals && vals.length && !vals.includes(facetValue(r, f))) return false;
  }
  return true;
}

/**
 * Value counts for one facet, computed over the items that pass every *other* facet,
 * so choosing a value never hides its siblings.
 */
export function facetCounts(items: readonly RouteEntry[], f: FacetId, sel: FacetSelection): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of items) {
    if (!passesFacets(r, sel, f)) continue;
    const v = facetValue(r, f);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  for (const v of sel[f] ?? []) if (!counts.has(v)) counts.set(v, 0);
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

export function toggleFacet(sel: FacetSelection, f: FacetId, value: string): FacetSelection {
  const cur = sel[f] ?? [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  const out: FacetSelection = { ...sel };
  if (next.length) out[f] = next;
  else delete out[f];
  return out;
}

export function facetSummary(sel: FacetSelection): string {
  return FACET_IDS.filter((f) => sel[f]?.length)
    .map((f) => `${f}=${sel[f]!.join('|')}`)
    .join('; ');
}

/* ------------------------------------------------------------ folders */

export interface FolderDef {
  id: string;
  label: string;
  test: (r: RouteEntry) => boolean;
}

export interface FolderGroup {
  id: string;
  label: string;
  folders: FolderDef[];
}

export function buildFolderGroups(
  routes: readonly RouteEntry[],
  divisions: readonly { id: string; name: string }[],
  markings: readonly { id: string; label: string; rank: number }[],
  matchers: readonly SeriesMatcher[],
): FolderGroup[] {
  const divIds = new Set(divisions.map((d) => d.id));
  const byDivision: FolderDef[] = divisions
    .map((d) => ({
      id: `div:${d.id}`,
      label: `${d.id}  ${d.name}`,
      test: (r: RouteEntry) => divisionOf(r.originator) === d.id,
    }))
    .filter((f) => routes.some(f.test));
  if (routes.some((r) => !divIds.has(divisionOf(r.originator)))) {
    byDivision.push({
      id: 'div:*',
      label: 'Other originators',
      test: (r) => !divIds.has(divisionOf(r.originator)),
    });
  }

  const seriesSeen = new Map<string, number>();
  for (const r of routes) {
    const s = seriesOf(r.docNo, matchers) ?? '';
    seriesSeen.set(s, (seriesSeen.get(s) ?? 0) + 1);
  }
  const bySeries: FolderDef[] = matchers
    .filter((m) => seriesSeen.has(m.family))
    .map((m) => ({
      id: `ser:${m.family}`,
      label: m.family,
      test: (r: RouteEntry) => seriesOf(r.docNo, matchers) === m.family,
    }));
  if (seriesSeen.has(''))
    bySeries.push({
      id: 'ser:*',
      label: 'Unclassified series',
      test: (r) => seriesOf(r.docNo, matchers) === null,
    });

  const byMarking: FolderDef[] = [...markings]
    .sort((a, b) => a.rank - b.rank)
    .map((m) => ({
      id: `mk:${m.id}`,
      label: m.label,
      test: (r: RouteEntry) => r.marking === m.id,
    }))
    .filter((f) => routes.some(f.test));

  const years = [...new Set(routes.map((r) => yearOf(r.date)))].sort().reverse();
  const byYear: FolderDef[] = years.map((y) => ({
    id: `yr:${y}`,
    label: y,
    test: (r: RouteEntry) => yearOf(r.date) === y,
  }));

  return [
    { id: 'g:div', label: 'By originating division', folders: byDivision },
    { id: 'g:ser', label: 'By series', folders: bySeries },
    { id: 'g:mk', label: 'By marking', folders: byMarking },
    { id: 'g:yr', label: 'By year of issue', folders: byYear },
  ];
}

/* ----------------------------------------------------------- snippets */

export interface RxSeg {
  rx: { id: string; len: number; auth: string; ref: string };
}
export interface TextSeg {
  text: string;
  hl?: boolean;
}
export type Seg = TextSeg | RxSeg;

export const isRxSeg = (s: Seg): s is RxSeg => 'rx' in s;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  sect: '§',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[e.toLowerCase()] ?? whole;
  });
}

const BLOCK_TAGS = /^(p|div|li|ul|ol|tr|td|th|table|thead|tbody|h[1-6]|br|hr|section|aside|blockquote|pre|header|footer|dt|dd|dl|figure|figcaption|caption)$/i;
const RX_EL = /<(span|div)\s+class="rx( rx-block)?"\s+data-rx="([^"]*)"([^>]*)>\s*<\/\1>/gy;
const ATTR = /\s(data-(?:len|auth|ref))="([^"]*)"/g;

/**
 * Flatten baseline document HTML into plain text and redaction bars, in reading order.
 * Released text (`.rx-released`) is ordinary text; withheld text was never in the HTML.
 */
export function htmlToSegs(html: string): Seg[] {
  const out: Seg[] = [];
  let buf = '';
  const flush = () => {
    const t = decodeEntities(buf).replace(/\s+/g, ' ');
    if (t.trim() || (t && out.length)) out.push({ text: t });
    buf = '';
  };
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      buf += html.slice(i);
      break;
    }
    buf += html.slice(i, lt);
    RX_EL.lastIndex = lt;
    const rx = RX_EL.exec(html);
    if (rx) {
      flush();
      const attrs: Record<string, string> = {};
      for (const m of rx[4]!.matchAll(ATTR)) attrs[m[1]!] = decodeEntities(m[2]!);
      out.push({
        rx: {
          id: rx[3]!,
          len: Number(attrs['data-len'] ?? 8) || 8,
          auth: attrs['data-auth'] ?? '',
          ref: attrs['data-ref'] ?? '',
        },
      });
      i = RX_EL.lastIndex;
      continue;
    }
    const gt = html.indexOf('>', lt);
    if (gt < 0) break;
    const tag = /^<\/?([a-zA-Z0-9]+)/.exec(html.slice(lt, gt + 1))?.[1] ?? '';
    if (/^(script|style)$/i.test(tag) && html[lt + 1] !== '/') {
      const close = html.toLowerCase().indexOf(`</${tag.toLowerCase()}`, gt);
      i = close < 0 ? html.length : html.indexOf('>', close) + 1;
      continue;
    }
    if (BLOCK_TAGS.test(tag)) buf += ' ';
    i = gt + 1;
  }
  flush();
  // Merge adjacent text and collapse spaces at boundaries.
  const merged: Seg[] = [];
  for (const s of out) {
    const last = merged[merged.length - 1];
    if (!isRxSeg(s) && last && !isRxSeg(last)) last.text = (last.text + s.text).replace(/\s+/g, ' ');
    else merged.push(s);
  }
  if (merged[0] && !isRxSeg(merged[0])) merged[0].text = merged[0].text.trimStart();
  const tail = merged[merged.length - 1];
  if (tail && !isRxSeg(tail)) tail.text = tail.text.trimEnd();
  return merged.filter((s) => isRxSeg(s) || s.text.length > 0);
}

/** Terms to look for: the whole query first, then its words and sub-tokens (2+ chars). */
export function queryTerms(q: string): string[] {
  const whole = q.trim().replace(/^"|"$/g, '');
  const set = new Set<string>();
  if (whole) set.add(whole.toLowerCase());
  for (const w of whole.split(/[\s"]+/)) {
    if (w.length >= 2) set.add(w.toLowerCase());
    for (const sub of w.split(/[^\p{L}\p{N}]+/u)) if (sub.length >= 2) set.add(sub.toLowerCase());
  }
  return [...set].sort((a, b) => b.length - a.length);
}

export interface Snippet {
  segs: Seg[];
  lead: boolean;
  trail: boolean;
  /** True when a query term was found in the document text. */
  matched: boolean;
}

const WORDCH = /[\p{L}\p{N}]/u;

/** Occurrences of `t` in `lower` that stand as whole words (no letter or digit either side). */
export function wordHits(lower: string, t: string): number[] {
  const out: number[] = [];
  let from = 0;
  for (let at = lower.indexOf(t, from); at >= 0; at = lower.indexOf(t, from)) {
    const before = at > 0 ? lower[at - 1]! : ' ';
    const after = lower[at + t.length] ?? ' ';
    if (!WORDCH.test(before) && !WORDCH.test(after)) out.push(at);
    from = at + 1;
  }
  return out;
}

/** Split text into highlighted / plain pieces for every whole-word occurrence of any term. */
export function highlight(text: string, terms: readonly string[]): TextSeg[] {
  if (!terms.length || !text) return [{ text }];
  const lower = text.toLowerCase();
  const marks: [number, number][] = [];
  for (const t of terms) {
    for (const at of wordHits(lower, t)) {
      const end = at + t.length;
      if (!marks.some(([a, b]) => at < b && end > a)) marks.push([at, end]);
    }
  }
  marks.sort((a, b) => a[0] - b[0]);
  const out: TextSeg[] = [];
  let pos = 0;
  for (const [a, b] of marks) {
    if (a > pos) out.push({ text: text.slice(pos, a) });
    out.push({ text: text.slice(a, b), hl: true });
    pos = b;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

/**
 * Extract a window of about `width` characters around the first occurrence of a query term,
 * keeping redaction bars where they fall (a bar counts for at most 12 characters of width).
 */
export function makeSnippet(segs: readonly Seg[], q: string, width = 220): Snippet | null {
  if (!segs.length) return null;
  const terms = queryTerms(q);
  // Linear positions.
  const spans: { seg: Seg; start: number; end: number }[] = [];
  let pos = 0;
  for (const s of segs) {
    const w = isRxSeg(s) ? Math.min(12, Math.max(1, s.rx.len)) : s.text.length;
    spans.push({ seg: s, start: pos, end: pos + w });
    pos += w;
  }
  const total = pos;
  // The whole query anywhere wins; otherwise the earliest whole-word hit of any term.
  let hit = -1;
  for (const group of [terms.slice(0, 1), terms]) {
    for (const sp of spans) {
      if (isRxSeg(sp.seg)) continue;
      const lower = sp.seg.text.toLowerCase();
      for (const t of group) {
        const at = wordHits(lower, t)[0];
        if (at !== undefined && (hit < 0 || sp.start + at < hit)) hit = sp.start + at;
      }
      if (hit >= 0) break;
    }
    if (hit >= 0) break;
  }
  const matched = hit >= 0;
  let start = matched ? Math.max(0, hit - Math.floor(width / 3)) : 0;
  let end = Math.min(total, start + width);
  if (end - start < width) start = Math.max(0, end - width);

  // When the whole query occurs in the window, mark only that; otherwise mark its parts.
  const windowText = spans
    .filter((sp) => !isRxSeg(sp.seg) && sp.end > start && sp.start < end)
    .map((sp) => (sp.seg as TextSeg).text)
    .join('')
    .toLowerCase();
  const whole = terms[0];
  const marks = !matched ? [] : whole && wordHits(windowText, whole).length ? [whole] : terms.filter((t) => t.length >= 3);
  const out: Seg[] = [];
  for (const sp of spans) {
    if (sp.end <= start || sp.start >= end) continue;
    if (isRxSeg(sp.seg)) {
      out.push(sp.seg);
      continue;
    }
    let a = Math.max(0, start - sp.start);
    let b = Math.min(sp.seg.text.length, end - sp.start);
    const text = sp.seg.text;
    // Snap to word boundaries.
    if (a > 0) {
      const sp2 = text.indexOf(' ', a);
      a = sp2 >= 0 && sp2 < b ? sp2 + 1 : a;
    }
    if (b < text.length) {
      const sp2 = text.lastIndexOf(' ', b);
      b = sp2 > a ? sp2 : b;
    }
    const piece = text.slice(a, b);
    if (piece) out.push(...highlight(piece, marks));
  }
  if (!out.length) return null;
  end = Math.min(end, total);
  return { segs: out, lead: start > 0, trail: end < total, matched };
}

/* ------------------------------------------------------- saved queries */

export interface SavedQuery {
  id: string;
  name: string;
  query: string;
  facets: FacetSelection;
  savedAt: string;
}

export function normaliseSaved(v: unknown): SavedQuery[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (x): x is SavedQuery =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as SavedQuery).id === 'string' &&
        typeof (x as SavedQuery).query === 'string' &&
        typeof (x as SavedQuery).name === 'string',
    )
    .map((x) => ({
      ...x,
      facets: x.facets && typeof x.facets === 'object' ? x.facets : {},
    }));
}

/** Resolve a typed document number: exact, with OSC- prefix, or case-insensitive. */
export function resolveDocNo(input: string, byDocNo: (d: string) => RouteEntry | undefined): RouteEntry | undefined {
  const raw = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return undefined;
  return byDocNo(raw) ?? (raw.startsWith('OSC-') ? undefined : byDocNo(`OSC-${raw}`));
}
