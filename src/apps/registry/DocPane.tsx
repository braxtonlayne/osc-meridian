/** Facility Registry: the page's document (DocumentView) and the refusal panel. */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RouteEntry, Services } from '@core/contracts';
import { DocumentView, type DocumentSlots } from '@design/index';
import { MarkingStrip, Stamp } from '@graphics/banners';
import { ScanPage } from '@graphics/scan';
import { Seal } from '@graphics/seal';
import { ErrorState, RefusalState as GRefusal } from '@graphics/states';
import { canon } from './shared';

const slots: DocumentSlots = {
  ScanPage: ScanPage as never,
  MarkingStrip: MarkingStrip as never,
  Seal: Seal as never,
  Stamp: Stamp as never,
};

export type DocLoad = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed'; message: string };

/** Load a route's document, reloading when the session's clearance changes (releases apply). */
export function useDoc(services: Services, entry: RouteEntry | null | undefined): DocLoad {
  const [load, setLoad] = useState<DocLoad>({ state: 'loading' });
  const clr = `${services.session.tier.value}:${services.session.compartments.value.join(',')}`;
  useEffect(() => {
    if (!entry) {
      setLoad({ state: 'failed', message: 'No register document is filed for this view.' });
      return;
    }
    let live = true;
    setLoad((l) => (l.state === 'ready' && l.doc.id === entry.id ? l : { state: 'loading' }));
    services.docs.load(entry.id).then(
      (doc) => live && setLoad({ state: 'ready', doc }),
      (e: unknown) => live && setLoad({ state: 'failed', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [entry?.id, clr]);
  return load;
}

/** The document itself. Logs doc.read once each time a document comes into view. */
export function DocPane({ services, load, entry }: { services: Services; load: DocLoad; entry: RouteEntry | null | undefined }) {
  const logged = useRef<string | null>(null);
  const docNo = load.state === 'ready' ? load.doc.docNo : null;
  useEffect(() => {
    if (!docNo || logged.current === docNo || load.state !== 'ready') return;
    logged.current = docNo;
    services.audit.log('doc.read', docNo, `Operator ${services.session.operatorId.value} read ${docNo} in Facility Registry.`);
  }, [docNo]);

  if (load.state === 'loading') return <div class="reg-doc reg-doc--loading">Retrieving {entry?.docNo ?? 'document'} from the records server...</div>;
  if (load.state === 'failed') {
    return (
      <div class="reg-doc">
        <ErrorState
          code="RS-DOC-0217"
          title={`${entry?.docNo ?? 'Document'} not available`}
          body="The records server did not return this document to the workstation. The register views remain available. If the condition persists, report it to the Help Desk."
          detail={load.message}
        />
      </div>
    );
  }
  const doc = load.doc;
  return (
    <div class="reg-doc">
      <DocumentView
        doc={doc}
        markings={canon.markings}
        slots={slots}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={(i) =>
          services.audit.log('redaction.hover', doc.docNo, `Operator ${services.session.operatorId.value} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)
        }
      />
    </div>
  );
}

/** In-world refusal for a route the session is not cleared to open. Logs window.open. */
export function Refusal({ services, entry }: { services: Services; entry: RouteEntry }) {
  const comp = entry.access?.compartment;
  const briefing = comp ? canon.compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
  const reason = `Requires Tier ${entry.access?.tier ?? 3} access determination${comp ? ` and ${comp} compartment briefing` : ''}. Display of ${entry.docNo} to this operator is not authorised.`;
  useEffect(() => {
    services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.value} requested ${entry.docNo}. Request refused: ${reason}`);
    services.sound.play('error');
  }, [entry.id]);
  return h(GRefusal, {
    authority: 'Classification Control, Office of Internal Assurance',
    reference: briefing ?? 'OSC-DIR-0412',
    reason,
    requirement: comp ? `${comp} compartment briefing` : `Tier ${entry.access?.tier ?? 3}`,
    docNo: entry.docNo,
  });
}
