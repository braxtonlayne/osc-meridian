/** Records Library: full-text search over the MERIDIAN index with facets, snippets and saved queries. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import { Button, Checkbox, GroupBox, Pager, ProgressBar, Redaction, Splitter, TextField, formatOscDate, type RedactionHoverInfo } from '@design/index';
import { EmptySearchResults, EmptyState } from '@graphics/states';
import {
  FACET_IDS,
  facetCounts,
  htmlToSegs,
  isRxSeg,
  makeSnippet,
  passesFacets,
  type FacetId,
  type FacetSelection,
  type SavedQuery,
  type Seg,
  type Snippet,
} from './lib';
import { MarkingTag, divisionName, familyLabel, markingLabel, markingRank } from './shared';

export interface Hit {
  route: RouteEntry;
  score: number;
  snippet: string;
}

export interface SearchState {
  input: string;
  /** Query last run, exactly as submitted. */
  q: string;
  hits: Hit[] | null;
  facets: FacetSelection;
  page: number;
  running: boolean;
  failed: boolean;
}

export const EMPTY_SEARCH: SearchState = {
  input: '',
  q: '',
  hits: null,
  facets: {},
  page: 1,
  running: false,
  failed: false,
};
export const PAGE_SIZE = 15;

const FACET_TITLES: Record<FacetId, string> = {
  family: 'File',
  division: 'Originating division',
  marking: 'Marking',
  year: 'Year of issue',
};

function facetLabel(f: FacetId, v: string): string {
  if (f === 'family') return familyLabel(v);
  if (f === 'division') return divisionName(v) ? `${v} ${divisionName(v)}` : v;
  if (f === 'marking') return markingLabel(v);
  return v;
}

export function filteredHits(s: SearchState): Hit[] {
  return (s.hits ?? []).filter((h) => passesFacets(h.route, s.facets));
}

export interface SearchProps {
  state: SearchState;
  setState: (fn: (s: SearchState) => SearchState) => void;
  run: (q: string, facets?: FacetSelection) => void;
  saved: SavedQuery[];
  onSave: () => void;
  onOpen: (r: RouteEntry) => void;
  loadSegs: (r: RouteEntry) => Promise<Seg[]>;
  onRedactionHover: (docNo: string, info: RedactionHoverInfo) => void;
  narrow: boolean;
  inputRef: { current: HTMLDivElement | null };
}

export function SearchView(p: SearchProps) {
  const { state: s } = p;
  const [showSide, setShowSide] = useState(false);
  const visible = useMemo(() => filteredHits(s), [s.hits, s.facets]);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const page = Math.min(s.page, pageCount);
  const pageHits = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const submit = (e?: Event) => {
    e?.preventDefault();
    p.run(s.input);
  };

  const form = (
    <form class="rec-search__form" onSubmit={submit} role="search" aria-label="Search the records index">
      <div class="rec-search__q" ref={p.inputRef}>
        <TextField label="Search for" value={s.input} onInput={(v) => p.setState((x) => ({ ...x, input: v }))} type="search" mono layout="stacked" />
      </div>
      <Button label="&Search" variant="primary" type="submit" />
      <Button label="Sa&ve query..." onClick={p.onSave} />
    </form>
  );

  const side = (
    <div class="rec-search__side">
      <GroupBox title="Saved queries">
        {p.saved.length ? (
          <ul class="rec-saved">
            {p.saved.map((q) => (
              <li key={q.id}>
                <Button
                  size="small"
                  label={q.name.replace(/&/g, '&&')}
                  onClick={() => {
                    setShowSide(false);
                    p.run(q.query, q.facets);
                  }}
                />
                <span class="rec-saved__q" title={q.query}>
                  {q.query}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div class="rec__muted">None saved. Run a search, then choose Save query.</div>
        )}
      </GroupBox>
      {s.hits && s.hits.length
        ? FACET_IDS.map((f) => {
            const counts = facetCounts(
              s.hits!.map((h) => h.route),
              f,
              s.facets,
            ).sort((a, b) =>
              f === 'year'
                ? b.value.localeCompare(a.value)
                : f === 'marking'
                  ? markingRank(a.value) - markingRank(b.value)
                  : b.count - a.count || a.value.localeCompare(b.value),
            );
            return (
              <GroupBox key={f} title={FACET_TITLES[f]}>
                <ul class="rec-facet">
                  {counts.map((c) => (
                    <li key={c.value}>
                      <Checkbox
                        label={facetLabel(f, c.value)}
                        checked={!!s.facets[f]?.includes(c.value)}
                        onChange={() =>
                          p.setState((x) => {
                            const cur = x.facets[f] ?? [];
                            const next = cur.includes(c.value) ? cur.filter((v) => v !== c.value) : [...cur, c.value];
                            const facets = { ...x.facets };
                            if (next.length) facets[f] = next;
                            else delete facets[f];
                            return { ...x, facets, page: 1 };
                          })
                        }
                      />
                      <span class="rec-facet__n">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </GroupBox>
            );
          })
        : null}
    </div>
  );

  let body;
  if (s.running) {
    body = (
      <div class="rec-note">
        <ProgressBar label={`Querying the index for "${s.q}"`} showValue={false} />
      </div>
    );
  } else if (s.failed) {
    body = (
      <EmptyState
        title="Index not available"
        body="The records index could not be read from the library server. Run the query again. Reference RD-IDX-0503."
        icon="search"
      />
    );
  } else if (s.hits === null) {
    body = (
      <EmptyState
        title="Records index"
        icon="search"
        body="Enter a document number, reference or words from the text. Results show only material released to this operator; withheld passages appear as bars. Queries are retained with the audit trail."
      />
    );
  } else if (!visible.length) {
    body = <EmptySearchResults query={s.q} />;
  } else {
    body = (
      <ol class="rec-results" start={(page - 1) * PAGE_SIZE + 1}>
        {pageHits.map((h) => (
          <HitRow key={h.route.route} h={h} q={s.q} onOpen={p.onOpen} loadSegs={p.loadSegs} onRedactionHover={p.onRedactionHover} />
        ))}
      </ol>
    );
  }

  const results = (
    <div class="rec__pane">
      <div class="rec__head">
        <span class="rec__head-title">Results</span>
        <span class="rec__head-meta">
          {s.hits === null
            ? 'No query run'
            : `${visible.length} document${visible.length === 1 ? '' : 's'} for "${s.q}"${visible.length !== s.hits.length ? ` (${s.hits.length} before filters)` : ''}`}
        </span>
        {Object.keys(s.facets).length ? (
          <Button size="small" label="&Clear filters" onClick={() => p.setState((x) => ({ ...x, facets: {}, page: 1 }))} />
        ) : null}
      </div>
      <div class="rec__scroll rec__well">{body}</div>
      {visible.length > PAGE_SIZE && !s.running ? (
        <div class="rec-search__pager">
          <Pager
            page={page}
            pageCount={pageCount}
            onPage={(n) => p.setState((x) => ({ ...x, page: n }))}
            noun="Page"
            total={visible.length}
            totalNoun="documents"
            label="Result pages"
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <div class="rec__pane">
      {form}
      <div class="rec__main">
        {p.narrow ? (
          <div class="rec__pane">
            <div class="rec__head">
              <Button
                size="small"
                pressed={showSide}
                label={showSide ? '&Results' : `&Filters and saved queries${Object.keys(s.facets).length ? ` (${Object.keys(s.facets).length} set)` : ''}`}
                onClick={() => setShowSide((v) => !v)}
              />
            </div>
            <div class="rec__main">{showSide ? side : results}</div>
          </div>
        ) : (
          <Splitter initial={250} min={170} max={420} label="Filter pane width">
            {side}
            {results}
          </Splitter>
        )}
      </div>
    </div>
  );
}

function HitRow({
  h,
  q,
  onOpen,
  loadSegs,
  onRedactionHover,
}: {
  h: Hit;
  q: string;
  onOpen: (r: RouteEntry) => void;
  loadSegs: (r: RouteEntry) => Promise<Seg[]>;
  onRedactionHover: SearchProps['onRedactionHover'];
}) {
  const r = h.route;
  const [snip, setSnip] = useState<Snippet | null | 'loading'>('loading');
  useEffect(() => {
    let live = true;
    setSnip('loading');
    loadSegs(r)
      .then((segs) => live && setSnip(makeSnippet(segs, q)))
      .catch(() => live && setSnip(null));
    return () => {
      live = false;
    };
  }, [r.id, q]);

  const open = (e: MouseEvent) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    onOpen(r);
  };

  return (
    <li class="rec-hit">
      <div class="rec-hit__top">
        <span class="rec-hit__no">{r.docNo}</span>
        <a class="rec-link rec-hit__title" href={r.route} onClick={open as unknown as (e: Event) => void}>
          {r.title}
        </a>
      </div>
      <div class="rec-hit__meta">
        <MarkingTag id={r.marking} />
        <span>Rev {r.revision}</span>
        <span class="rec__mono">{r.originator}</span>
        <span class="rec__mono">{formatOscDate(r.date)}</span>
        <span>{familyLabel(r.family)}</span>
      </div>
      <div class="rec-hit__snip">
        {snip === 'loading' ? (
          <span class="rec__muted">{h.snippet}</span>
        ) : snip ? (
          <SnippetText s={snip} docNo={r.docNo} onRedactionHover={onRedactionHover} />
        ) : (
          <span class="rec__muted">{h.snippet}</span>
        )}
      </div>
    </li>
  );
}

function SnippetText({ s, docNo, onRedactionHover }: { s: Snippet; docNo: string; onRedactionHover: SearchProps['onRedactionHover'] }) {
  return (
    <>
      {s.lead ? '... ' : null}
      {s.segs.map((g, i) =>
        isRxSeg(g) ? (
          <Redaction
            key={i}
            len={Math.min(g.rx.len, 60)}
            auth={g.rx.auth}
            reference={g.rx.ref}
            id={g.rx.id}
            onHover={(info) => onRedactionHover(docNo, info)}
          />
        ) : g.hl ? (
          <b key={i}>{g.text}</b>
        ) : (
          <span key={i}>{g.text}</span>
        ),
      )}
      {s.trail ? ' ...' : null}
    </>
  );
}

export { htmlToSegs };
