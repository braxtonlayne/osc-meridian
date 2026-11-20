/** The Muster Board's document routes (content/muster/*.md): load, log doc.read, render. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RedactionInfo, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import { DocumentView } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, RefusalState, Seal } from '@shell/adapters';
import { canon } from './common';

const SLOTS = { ScanPage: ScanPage as never, MarkingStrip, Seal, Stamp: Stamp as never };

type DocState = { status: 'loading' } | { status: 'ready'; doc: DocJson } | { status: 'failed' };

export function routeKey(r: Pick<RouteEntry, 'access'>): string | null {
  if (!r.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

export function DocPane({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const logged = useRef<string | null>(null);
  const comps = services.session.compartments.value.join(',');
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setState({ status: 'ready', doc });
        if (logged.current !== doc.id) {
          logged.current = doc.id;
          services.audit.log('doc.read', doc.docNo);
        }
      })
      .catch(() => live && setState({ status: 'failed' }));
    return () => {
      live = false;
    };
  }, [entry.id, comps]);
  if (state.status === 'loading') return <div class="mus-empty">Retrieving {entry.docNo} from the records server...</div>;
  if (state.status === 'failed')
    return (
      <RefusalState
        authority="Records Division, ALPHA-03"
        reference={entry.docNo}
        reason={`${entry.docNo} could not be retrieved from the records server for this workstation. Reopen the item; if the condition persists, report it to the Help Desk quoting the document number.`}
      />
    );
  const doc = state.doc;
  return (
    <section class="mus-doc" aria-label={`${doc.docNo} document`}>
      <DocumentView
        doc={doc}
        markings={canon.markings}
        slots={SLOTS}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={(i: RedactionInfo) =>
          services.audit.log('redaction.hover', doc.docNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)
        }
      />
    </section>
  );
}

/** Refusal for a route this operator's access does not satisfy. Logs window.open once. */
export function RouteRefusal({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const done = useRef<string | null>(null);
  const reason = `Requires Tier ${entry.access?.tier ?? 3} access determination${entry.access?.compartment ? ` and ${entry.access.compartment} compartment briefing` : ''}. Display of ${entry.docNo} to this operator is not authorised.`;
  useEffect(() => {
    if (done.current === entry.id) return;
    done.current = entry.id;
    services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo}. Request refused: ${reason}`);
    services.sound.play('error');
  }, [entry.id]);
  return <RefusalState authority="Classification Control, Office of Internal Assurance" reference="OSC-DIR-0412" reason={reason} docNo={entry.docNo} />;
}
