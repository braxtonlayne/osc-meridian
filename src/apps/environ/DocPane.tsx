/** Record copy of an environ document route: loads the DocJson, logs doc.read once, renders it. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RouteEntry } from '@core/contracts';
import type { Marking } from '@core/canon-types';
import canon from '@canon';
import { useServices } from '@core/services';
import { DocumentView, ProgressBar } from '@design/index';
import { ErrorState, RefusalState } from '@graphics/states';

const MARKINGS = (canon as unknown as { markings: Marking[] }).markings;

type Load = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed' };

export function DocPane({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const logged = useRef(new Set<string>());
  const key = entry.access ? (entry.access.compartment ? `${entry.access.compartment}+T${entry.access.tier}` : `T${entry.access.tier}`) : null;
  const refused = !!key && !services.clearance.satisfies(key);
  const tier = services.session.tier.value;

  useEffect(() => {
    if (refused) {
      services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo} in Environmental Control. Refused: access determination not satisfied.`);
      return;
    }
    let live = true;
    setLoad({ state: 'loading' });
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
  }, [entry.id, refused, tier]);

  if (refused) {
    return (
      <RefusalState
        authority="Classification Control, Office of Internal Assurance"
        reference={entry.docNo}
        docNo={entry.docNo}
        reason={`Display of ${entry.docNo} to this operator is not authorised by the current access determination.`}
        requirement={`Tier ${entry.access!.tier}`}
      />
    );
  }
  if (load.state === 'loading') {
    return (
      <div class="env-scroll" role="status">
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
        body={`The record copy of ${entry.docNo} could not be retrieved from the document store on this workstation. Reopen it later; if the condition persists, report it to the Help Desk quoting the code below.`}
      />
    );
  }
  const doc = load.doc;
  return (
    <div class="env-doc">
      <DocumentView doc={doc} markings={MARKINGS} onNavigate={(r) => services.openRoute(r)} onRedactionHover={() => services.audit.log('redaction.hover', doc.docNo)} />
    </div>
  );
}
