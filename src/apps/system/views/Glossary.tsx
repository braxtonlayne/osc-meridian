/** Glossary browser over canon.glossary, with see-also and reverse references. */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import type { GlossaryTerm } from '@core/canon-types';
import canon from '@canon';
import { Button, DataTable, type Column } from '@design/index';
import { EmptySearchResults } from '@graphics/states';
import { useSys } from '../ctx';
import { filterGlossary, glossaryLetter, referencedBy } from '../logic';
import { RouteLink } from './RouteLink';
import { WithRecord } from './WithRecord';

const TERMS: GlossaryTerm[] = [...(canon as unknown as { glossary: GlossaryTerm[] }).glossary].sort((a, b) => a.term.localeCompare(b.term));
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const HAS_LETTER = new Set(TERMS.map((t) => glossaryLetter(t.term)));

interface Hit {
  route: RouteEntry;
}

export function Glossary({ entry }: { entry: RouteEntry | null }) {
  return (
    <WithRecord entry={entry} label="Glossary">
      <GlossaryBrowser />
    </WithRecord>
  );
}

function GlossaryBrowser() {
  const { services, say } = useSys();
  const [q, setQ] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [term, setTerm] = useState<string>(TERMS[0]?.term ?? '');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => filterGlossary(TERMS, q, letter), [q, letter]);
  const cur = TERMS.find((t) => t.term === term) ?? null;
  const refs = useMemo(() => (cur ? referencedBy(TERMS, cur.term) : []), [cur]);

  useEffect(() => {
    say(q || letter ? `${shown.length} of ${TERMS.length} terms shown.` : `${TERMS.length} terms in the glossary.`);
  }, [shown.length, q, letter]);

  useEffect(() => setHits(null), [term]);

  const pick = (t: string, focus = false) => {
    setTerm(t);
    if (!shown.some((s) => s.term === t)) {
      setQ('');
      setLetter(null);
    }
    if (focus) setTimeout(() => detailRef.current?.focus(), 0);
  };

  const findInDocs = () => {
    if (!cur) return;
    setBusy(true);
    void services
      .search(cur.term)
      .then((res) => {
        setHits(res.slice(0, 12).map((h) => ({ route: h.route })));
        say(`${res.length} ${res.length === 1 ? 'document uses' : 'documents use'} "${cur.term}" at your current tier.`);
      })
      .catch(() => {
        setHits([]);
        say('The index service did not answer.');
      })
      .finally(() => setBusy(false));
  };

  const cols: Column<GlossaryTerm>[] = [{ key: 'term', header: 'Term', sortable: true }];

  return (
    <div class="sys-gloss">
      <div class="sys-gloss__filter">
        <div class="sys-search" data-sys-find>
          <label for="sys-gloss-q">Find term</label>
          <input id="sys-gloss-q" class="sys-input" type="search" value={q} autoComplete="off" onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </div>
        <div class="sys-letters" role="group" aria-label="Initial letter">
          <button type="button" class="sys-letter" aria-pressed={letter === null} onClick={() => setLetter(null)}>
            All
          </button>
          {LETTERS.map((l) => (
            <button key={l} type="button" class="sys-letter" aria-pressed={letter === l} disabled={!HAS_LETTER.has(l)} onClick={() => setLetter(letter === l ? null : l)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div class="sys-gloss__body">
        <div class="sys-gloss__list">
          <DataTable<GlossaryTerm>
            label="Glossary terms"
            columns={cols}
            rows={shown}
            rowKey={(t) => t.term}
            selection="single"
            selected={cur ? [cur.term] : []}
            onSelectionChange={(k) => k[0] && setTerm(k[0])}
            onActivate={(t) => pick(t.term, true)}
            defaultSort={{ key: 'term', dir: 'asc' }}
            dense
            empty={<EmptySearchResults query={q.trim()} />}
          />
        </div>
        <div class="sys-gloss__def" ref={detailRef} tabIndex={-1} aria-live="polite">
          {cur ? (
            <>
              <h2 class="sys-term">{cur.term}</h2>
              <p class="sys-def">{cur.def}</p>
              {cur.seeAlso.length > 0 && (
                <p>
                  <span class="sys-label">See also: </span>
                  {cur.seeAlso.map((s, i) => (
                    <span key={s}>
                      {i ? '; ' : ''}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          pick(s);
                        }}
                      >
                        {s}
                      </a>
                    </span>
                  ))}
                </p>
              )}
              {refs.length > 0 && (
                <p>
                  <span class="sys-label">Referred to from: </span>
                  {refs.map((s, i) => (
                    <span key={s}>
                      {i ? '; ' : ''}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          pick(s);
                        }}
                      >
                        {s}
                      </a>
                    </span>
                  ))}
                </p>
              )}
              <div class="sys-row">
                <Button size="small" label="Find in &documents" disabled={busy} onClick={findInDocs} />
              </div>
              {hits && (
                <div class="sys-hits">
                  {hits.length ? (
                    <ol>
                      {hits.map((h) => (
                        <li key={h.route.route}>
                          <RouteLink path={h.route.route} go={(p) => services.openRoute(p)}>
                            <span class="mono">{h.route.docNo}</span> {h.route.title}
                          </RouteLink>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p class="sys-dim">No documents releasable at your current tier use this term.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p class="sys-dim">Select a term.</p>
          )}
        </div>
      </div>
    </div>
  );
}
