/**
 * Reference documents of the patch panel (operating instructions, circuit register, maintenance
 * circuit notice): loads the DocJson, logs doc.read once per document per window, renders it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RouteEntry, Services } from '@core/contracts';
import type { Marking } from '@core/canon-types';
import canon from '@canon';
import { DocumentView, ProgressBar } from '@design/index';
import { ErrorState } from '@graphics/states';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, Seal } from '@shell/adapters';

const MARKINGS = (canon as unknown as { markings: Marking[] }).markings;
const SLOTS = { ScanPage: ScanPage as never, MarkingStrip, Seal, Stamp: Stamp as never };

type Load = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed' };

export function DocPane({ entry, services }: { entry: RouteEntry; services: Services }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const logged = useRef(new Set<string>());
  const tier = services.session.tier.value;
  const comps = services.session.compartments.value.join(',');
  useEffect(() => {
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
  }, [entry.id, tier, comps]);

  if (load.state === 'loading') {
    return (
      <div class="pt-pad" role="status">
        <p>
          Retrieving <span class="pk-mono">{entry.docNo}</span> from the document store.
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
        body={`The record copy of ${entry.docNo} could not be retrieved from the document store on this workstation. Reopen it later; if the condition persists, report it to the Service Desk quoting the code below.`}
      />
    );
  }
  const doc = load.doc;
  return (
    <div class="pt-doc">
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
