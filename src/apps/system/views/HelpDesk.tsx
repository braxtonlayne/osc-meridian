/** Help Desk home: knowledge base list, search within help, and the system pages. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import { Button, DataTable, GroupBox, formatOscDate, type Column } from '@design/index';
import { EmptySearchResults, EmptyState } from '@graphics/states';
import { useSys } from '../ctx';
import { PAGES, matchHelp } from '../logic';
import { RouteLink } from './RouteLink';

interface IndexHit {
  route: RouteEntry;
  snippet: string;
}

export function HelpDesk({ articles }: { articles: RouteEntry[] }) {
  const { services, navTo, say, entryFor, visible } = useSys();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [hits, setHits] = useState<IndexHit[] | null>(null);
  const [searched, setSearched] = useState('');
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => matchHelp(articles, q), [articles, q]);
  const selected = articles.find((a) => a.route === sel[0]) ?? shown[0] ?? null;

  useEffect(() => {
    say(q.trim() ? `${shown.length} of ${articles.length} articles match "${q.trim()}".` : `${articles.length} articles in the Help Desk knowledge base.`);
  }, [shown.length, articles.length, q]);

  const runSearch = () => {
    const query = q.trim();
    if (!query) {
      setHits(null);
      say('Enter one or more words to search the help pages.');
      return;
    }
    setBusy(true);
    void services
      .search(query)
      .then((res) => {
        const mine = res.filter((h) => h.route.app === 'system' && visible(h.route)).map((h) => ({ route: h.route, snippet: h.snippet }));
        setHits(mine);
        setSearched(query);
        say(`${mine.length} help ${mine.length === 1 ? 'page' : 'pages'} in the index match "${query}".`);
      })
      .catch(() => {
        setHits([]);
        setSearched(query);
        say('The index service did not answer. The article list above is filtered locally.');
      })
      .finally(() => setBusy(false));
  };

  const cols: Column<RouteEntry>[] = [
    { key: 'docNo', header: 'Article', width: 80, mono: true, sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'revision', header: 'Rev', width: 44, align: 'right', mono: true, sortable: true },
    { key: 'date', header: 'Reviewed', width: 96, mono: true, sortable: true, render: (r) => formatOscDate(r.date) },
  ];

  const systemPages = PAGES.map((p) => ({ p, e: entryFor(p.path) })).filter(({ e }) => !e || visible(e));

  return (
    <div class="sys-home">
      <div class="sys-search" data-sys-find>
        <label for="sys-help-q">Search help</label>
        <input
          id="sys-help-q"
          class="sys-input"
          type="search"
          value={q}
          autoComplete="off"
          onInput={(e) => {
            setQ((e.target as HTMLInputElement).value);
            setHits(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <Button label="&Search index" onClick={runSearch} disabled={busy} />
      </div>

      <div class="sys-home__grid">
        <section class="sys-home__list" aria-label="Knowledge base articles">
          <DataTable<RouteEntry>
            label="Knowledge base articles"
            columns={cols}
            rows={shown}
            rowKey={(r) => r.route}
            selection="single"
            selected={selected ? [selected.route] : []}
            onSelectionChange={setSel}
            onActivate={(r) => navTo(r.route)}
            defaultSort={{ key: 'docNo', dir: 'asc' }}
            dense
            empty={
              articles.length ? (
                <EmptySearchResults query={q.trim()} />
              ) : (
                services.account.def.value.tier === 4 ? (
                  <EmptyState title="No Help Desk articles are released to this operator." body="Help Desk articles are released at Tier 3 (DIR-0301). Refer questions to the site superintendent." />
                ) : (
                  <EmptyState title="No Help Desk articles are registered on this workstation." body="Articles are distributed with the workstation image." />
                )
              )
            }
          />
        </section>

        <aside class="sys-home__side">
          <GroupBox title="Selected article" on="chrome">
            {selected ? (
              <div class="sys-preview">
                <p class="sys-preview__no mono">{selected.docNo}</p>
                <p class="sys-preview__title">{selected.title}</p>
                <p>{selected.summary}</p>
                <p class="sys-dim">
                  {selected.originator}, revision {selected.revision}, reviewed {formatOscDate(selected.date)}
                </p>
                <Button label="&Open article" variant="primary" onClick={() => navTo(selected.route)} />
              </div>
            ) : (
              <p class="sys-dim">Select an article in the list.</p>
            )}
          </GroupBox>
          <GroupBox title="System pages" on="chrome">
            <ul class="sys-links">
              {systemPages.map(({ p, e }) => (
                <li key={p.path}>
                  <RouteLink path={p.path} go={navTo}>
                    {e?.title ?? p.label}
                  </RouteLink>
                  {e ? <span class="sys-dim"> {e.summary}</span> : null}
                </li>
              ))}
            </ul>
          </GroupBox>
        </aside>
      </div>

      {hits && (
        <section class="sys-hits" aria-label="Index results">
          <h2 class="sys-h">Index results for "{searched}"</h2>
          {hits.length ? (
            <ol>
              {hits.map((h) => (
                <li key={h.route.route}>
                  <RouteLink path={h.route.route} go={navTo}>
                    <span class="mono">{h.route.docNo}</span> {h.route.title}
                  </RouteLink>
                  <div class="sys-dim">{h.snippet}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p class="sys-dim">No help pages in the index match. Search covers pages releasable at your current tier.</p>
          )}
        </section>
      )}
    </div>
  );
}
