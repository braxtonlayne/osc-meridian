/**
 * Record copy of a System Tools page: loads the DocJson, logs doc.read once per document per
 * window, and renders it with DocumentView (or plainly, for the colophon).
 */
import type { TargetedMouseEvent } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RouteEntry } from '@core/contracts';
import type { Marking } from '@core/canon-types';
import canon from '@canon';
import { DocumentView, ProgressBar } from '@design/index';
import { ErrorState } from '@graphics/states';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, Seal } from '@shell/adapters';
import { useSys } from './ctx';

const MARKINGS = (canon as unknown as { markings: Marking[] }).markings;

const SLOTS = {
  ScanPage: ScanPage as never,
  MarkingStrip,
  Seal,
  Stamp: Stamp as never,
};

type Load = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed' };

export function useDoc(entry: RouteEntry | null | undefined): Load | null {
  const { services } = useSys();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const logged = useRef(new Set<string>());
  // Reload when the access determination changes so newly released text appears.
  const tier = services.session.tier.value;
  const comps = services.session.compartments.value.join(',');
  useEffect(() => {
    if (!entry) return;
    let live = true;
    setLoad((l) => (l.state === 'ready' && l.doc.id === entry.id ? l : { state: 'loading' }));
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setLoad({ state: 'ready', doc });
        if (!logged.current.has(doc.docNo)) {
          logged.current.add(doc.docNo);
          services.audit.log('doc.read', doc.docNo);
        }
      })
      .catch(() => live && setLoad({ state: 'failed' }));
    return () => {
      live = false;
    };
  }, [entry?.id, tier, comps]);
  return entry ? load : null;
}

export function DocPane({ entry, plain = false }: { entry: RouteEntry; plain?: boolean }) {
  const { services } = useSys();
  const load = useDoc(entry);
  if (!load || load.state === 'loading') {
    return (
      <div class="sys-loading" role="status">
        <p>
          Retrieving <span class="mono">{entry.docNo}</span> from the document store.
        </p>
        <ProgressBar label={`Retrieving ${entry.docNo}`} />
      </div>
    );
  }
  if (load.state === 'failed') {
    return (
      <ErrorState
        code="DS-ERR-0410"
        title="Record copy not available"
        body={`The record copy of ${entry.docNo} could not be retrieved from the document store on this workstation. The page itself is registered. Reopen it later; if the condition persists, report it to the Help Desk quoting the code below.`}
      />
    );
  }
  const doc = load.doc;
  if (plain) return <PlainDoc doc={doc} />;
  return (
    <div class="sys-doc">
      <DocumentView
        doc={doc}
        markings={MARKINGS}
        slots={SLOTS}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={() => services.audit.log('redaction.hover', doc.docNo)}
      />
    </div>
  );
}

/** The colophon steps outside the frame: plain type, no control strip, no marking furniture. */
function PlainDoc({ doc }: { doc: DocJson }) {
  const { services } = useSys();
  const onClick = (e: TargetedMouseEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest?.('a[data-xref]') as HTMLAnchorElement | null;
    if (!a || e.ctrlKey || e.shiftKey || e.metaKey || e.button !== 0) return;
    e.preventDefault();
    services.openRoute(a.dataset.xref ?? '');
  };
  return (
    <article class="sys-plain" aria-label={doc.title} onClick={onClick}>
      <h1>{doc.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: doc.html }} />
    </article>
  );
}
