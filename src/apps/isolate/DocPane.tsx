/** Document routes of the isolate app: load, audit doc.read once, render with DocumentView. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RedactionInfo, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { DocumentView } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, RefusalState, Seal } from '@shell/adapters';
import { canon } from './model';

const SLOTS = { ScanPage: ScanPage as never, MarkingStrip, Seal, Stamp: Stamp as never };

type DocState = { status: 'loading' } | { status: 'ready'; doc: DocJson } | { status: 'failed' };

export function DocPane({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const logged = useRef(new Set<string>());
  const comps = services.session.compartments.value.join(',');
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setState({ status: 'ready', doc });
        if (!logged.current.has(doc.id)) {
          logged.current.add(doc.id);
          services.audit.log('doc.read', doc.docNo);
        }
      })
      .catch(() => live && setState({ status: 'failed' }));
    return () => {
      live = false;
    };
  }, [entry.id, comps]);

  if (state.status === 'loading') return <div class="iso-loading">Retrieving {entry.docNo} from the records server...</div>;
  if (state.status === 'failed')
    return (
      <div class="iso-refusal">
        <RefusalState
          authority="Records Division, ALPHA-03"
          reference={entry.docNo}
          reason={`${entry.docNo} could not be retrieved from the records server for this workstation. Reopen the item; if the condition persists, report it to the Help Desk quoting the document number.`}
        />
      </div>
    );
  const doc = state.doc;
  return (
    <section class="iso-doc" aria-label={`${doc.docNo} document`}>
      <DocumentView
        doc={doc}
        markings={canon.markings}
        slots={SLOTS}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={(i: RedactionInfo) =>
          services.audit.log(
            'redaction.hover',
            doc.docNo,
            `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`,
          )
        }
      />
    </section>
  );
}

/** In-world refusal panel; logs window.open once per mount. */
export function Refused({ subject, reason, reference, authority }: { subject: string; reason: string; reference: string; authority: string }) {
  const services = useServices();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    services.audit.log('window.open', subject, `Operator ${services.session.operatorId.peek()} requested ${subject}. Request refused: ${reason}`);
    services.sound.play('error');
  }, []);
  return (
    <div class="iso-refusal">
      <RefusalState authority={authority} reference={reference} reason={reason} />
    </div>
  );
}
