/** Records Library: document viewer and document properties panel. */
import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { DocJson, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { DocumentView, GroupBox, PropertyGrid, Splitter, Tabs, formatOscDate, type RedactionHoverInfo } from '@design/index';
import { ScanPage, enhanceScans } from '@graphics/scan';
import { MarkingStrip as BannerStrip, Stamp, enhanceStamps } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { accessWords, divisionOf, seriesOf, siteOf } from './lib';
import { MARKINGS, MATCHERS, MarkingTag, divisionName, familyLabel, marking } from './shared';

function StripSlot({ marking: id }: { marking: MarkingId }) {
  const m = marking(id);
  return m ? <BannerStrip marking={m} /> : null;
}
function StampSlot({ kind, date }: { kind: string; date?: string }) {
  return <Stamp kind={kind} date={date} />;
}

const SLOTS = {
  ScanPage: ScanPage as never,
  MarkingStrip: StripSlot,
  Seal,
  Stamp: StampSlot,
};

const TEMPLATE_WORDS: Record<string, string> = {
  memo: 'Memorandum',
  directive: 'Directive',
  cable: 'Cable',
  minutes: 'Minutes',
  dossier: 'Dossier',
  ledger: 'Ledger',
  form: 'Form',
  message: 'Message',
  help: 'Knowledge base article',
  record: 'Record',
  charter: 'Charter article',
  scan: 'Scanned image',
  index: 'Index',
};

/** Withheld passages still shown as bars (released ones are no longer baseline spans). */
export function withheldCount(doc: DocJson): number {
  return (doc.html.match(/class="rx( rx-block)?" data-rx=/g) ?? []).length;
}

export interface DocViewProps {
  doc: DocJson;
  showProps: boolean;
  narrow: boolean;
  width: number;
  onNavigate: (route: string) => void;
  onRedactionHover: (info: RedactionHoverInfo & { key?: string }) => void;
  byDocNo: (d: string) => RouteEntry | undefined;
  tab: 'doc' | 'props';
  onTab: (t: 'doc' | 'props') => void;
}

export function DocView(p: DocViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { doc } = p;

  // Upgrade scanned pages (margin notes, routing initials, pen marks) and stamps after render.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dispose: (() => void) | undefined;
    const raf = requestAnimationFrame(() => {
      dispose = enhanceScans(el);
      enhanceStamps(el, MARKINGS);
    });
    return () => {
      cancelAnimationFrame(raf);
      dispose?.();
    };
  }, [doc.id, doc.html, p.tab]);

  const view = (
    <div class="rec-doc__scroll" ref={ref} tabIndex={0} aria-label={`${doc.docNo} text`}>
      <DocumentView doc={doc} markings={MARKINGS} onNavigate={p.onNavigate} onRedactionHover={p.onRedactionHover} slots={SLOTS} />
    </div>
  );
  const props = <Properties doc={doc} onNavigate={p.onNavigate} byDocNo={p.byDocNo} />;

  if (p.narrow) {
    return (
      <Tabs
        label="Document"
        active={p.tab}
        onChange={(t) => p.onTab(t as 'doc' | 'props')}
        panel="flush"
        tabs={[
          { id: 'doc', label: 'Document' },
          { id: 'props', label: 'Properties' },
        ]}
      >
        <div class="rec__pane">{p.tab === 'doc' ? view : <div class="rec__well rec-fill">{props}</div>}</div>
      </Tabs>
    );
  }
  if (!p.showProps) return <div class="rec__pane">{view}</div>;
  return (
    <Splitter initial={Math.max(320, p.width - 320)} min={280} label="Properties pane width">
      <div class="rec__pane">{view}</div>
      <div class="rec__well rec-fill">{props}</div>
    </Splitter>
  );
}

function Link({ route, onNavigate, children }: { route: string; onNavigate: (r: string) => void; children: ComponentChildren }) {
  return (
    <a
      class="rec-link"
      href={route}
      onClick={(e) => {
        if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        onNavigate(route);
      }}
    >
      {children}
    </a>
  );
}

function recs(v: unknown): Record<string, string>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === 'object').map((x) => Object.fromEntries(Object.entries(x as object).map(([k, val]) => [k, String(val ?? '')])));
}

export function Properties({ doc, onNavigate, byDocNo }: { doc: DocJson; onNavigate: (r: string) => void; byDocNo: (d: string) => RouteEntry | undefined }) {
  const fm = doc.frontmatter ?? {};
  const div = divisionOf(doc.originator);
  const site = siteOf(doc.originator);
  const sup = doc.supersedes ? byDocNo(doc.supersedes) : undefined;
  const routing = recs(fm.routing);
  const revisions = recs(fm.revisions);
  const dist = doc.distribution ?? [];
  const withheld = withheldCount(doc);
  const released = (doc.html.match(/class="rx-released/g) ?? []).length;

  return (
    <div class="rec-props" aria-label="Document properties">
      <GroupBox title="Identification" on="surface">
        <PropertyGrid
          rows={[
            { label: 'Document No', value: doc.docNo, mono: true },
            {
              label: 'Series',
              value: seriesOf(doc.docNo, MATCHERS) ?? 'Not in numbering scheme',
            },
            {
              label: 'Type',
              value: TEMPLATE_WORDS[doc.template] ?? doc.template,
            },
            { label: 'File', value: familyLabel(doc.family) },
            { label: 'Revision', value: String(doc.revision), mono: true },
            { label: 'Date', value: formatOscDate(doc.date), mono: true },
            { label: 'Originator', value: doc.originator, mono: true },
            { label: 'Division', value: divisionName(div) ?? div },
            ...(site ? [{ label: 'Site', value: site, mono: true }] : []),
            ...(doc.facility ? [{ label: 'Facility', value: doc.facility, mono: true }] : []),
            { label: 'Marking', value: <MarkingTag id={doc.marking} /> },
            { label: 'Access', value: accessWords(doc.access) },
            {
              label: 'Withheld passages',
              value: `${withheld}${released ? ` (${released} released to this operator)` : ''}`,
              mono: true,
            },
          ]}
        />
      </GroupBox>
      <GroupBox title="Supersession" on="surface">
        {doc.supersedes ? (
          <div>
            Supersedes{' '}
            {sup ? (
              <Link route={sup.route} onNavigate={onNavigate}>
                {doc.supersedes}
              </Link>
            ) : (
              <span class="rec__mono">{doc.supersedes}</span>
            )}
            {sup ? null : <span class="rec__muted"> (not held in this library)</span>}
          </div>
        ) : (
          <div class="rec__muted">This document supersedes no earlier issue.</div>
        )}
        {revisions.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Rev</th>
                <th scope="col">Date</th>
                <th scope="col">Change</th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r, i) => (
                <tr key={i}>
                  <td class="rec__mono">{r.rev}</td>
                  <td class="rec__mono">{r.date ? formatOscDate(r.date) : ''}</td>
                  <td>{r.change}</td>
                  <td>{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </GroupBox>
      <GroupBox title="Routing" on="surface">
        {routing.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Office</th>
                <th scope="col">Action</th>
                <th scope="col">Initials</th>
                <th scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {routing.map((r, i) => (
                <tr key={i}>
                  <td>{r.office ?? r.to}</td>
                  <td>{r.action}</td>
                  <td class="rec__mono">{r.initials}</td>
                  <td class="rec__mono">{r.date ? formatOscDate(r.date) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div class="rec__muted">No routing slip is filed with this copy.</div>
        )}
      </GroupBox>
      <GroupBox title={`Distribution (${dist.length})`} on="surface">
        {dist.length ? (
          <ol>
            {dist.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ol>
        ) : (
          <div class="rec__muted">No distribution list is recorded for this document.</div>
        )}
      </GroupBox>
      <GroupBox title={`Cross-references (${doc.xrefs.length})`} on="surface">
        {doc.xrefs.length ? (
          <ul>
            {doc.xrefs.map((x) => (
              <li key={x.docNo}>
                <Link route={x.route} onNavigate={onNavigate}>
                  {x.docNo}
                </Link>{' '}
                {x.title}
              </li>
            ))}
          </ul>
        ) : (
          <div class="rec__muted">This document cites no other record.</div>
        )}
      </GroupBox>
    </div>
  );
}
