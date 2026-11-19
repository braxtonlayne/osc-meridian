/** Shared pieces for the public address views: withheld text, level names, the document pane. */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RedactionInfo, RouteEntry, Services } from '@core/contracts';
import { useServices } from '@core/services';
import { splitRx } from '@core/rx';
import { loadCanonT2 } from '@core/canon-release';
import { DocumentView, Redaction } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, RefusalState, Seal } from '@shell/adapters';
import { canon, pa, type Zone } from './model';

/** Audit a hovered or focused withheld element. */
export function logRx(services: Services, subject: string, info: { auth: string; ref: string }): void {
  services.audit.log(
    'redaction.hover',
    subject,
    `Operator ${services.session.operatorId.peek()} examined withheld material in ${subject} (${info.auth} ${info.ref}). No release was made.`,
  );
}

const RX_AUTH: Record<string, { auth: string; ref: string }> = {
  T1: { auth: 'COUNCIL', ref: 'CC-ART-IV' },
  T2: { auth: 'OIA', ref: 'OIA-PROT-04' },
};

/** Text that may carry canon redaction sentinels. */
export function RxText({ text, subject }: { text: string; subject: string }) {
  const services = useServices();
  const parts = splitRx(text);
  return (
    <>
      {parts.map((p, i) => {
        if ('text' in p) return <span key={i}>{p.text}</span>;
        const a = RX_AUTH[p.rx.key] ?? RX_AUTH.T2!;
        return <Redaction key={i} len={p.rx.len} auth={a.auth} reference={a.ref} onHover={() => logRx(services, subject, a)} />;
      })}
    </>
  );
}

/** Bar for the withheld library message (title or text). */
export function WithheldBar({ len, subject }: { len: number; subject: string }) {
  const services = useServices();
  const a = { auth: pa.withheld.auth, ref: pa.withheld.ref };
  return <Redaction len={len} auth={a.auth} reference={a.ref} onHover={() => logRx(services, subject, a)} />;
}

/**
 * Tier 2 level names (CANON-T2 release) for a session that satisfies T2; empty otherwise.
 * Keys: `facilities.<id>.levels.<n>.name`.
 */
export function useT2Names(): Record<string, string> {
  const services = useServices();
  const t2 = services.clearance.satisfies('T2');
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!t2) return;
    let live = true;
    loadCanonT2()
      .then((r) => live && setNames(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [t2]);
  return t2 ? names : {};
}

/** Designation of a zone for display, with a T2 release applied when held. */
export function zoneName(z: Zone, t2: Record<string, string>): string {
  if (z.kind === 'unassigned') return '';
  if (z.kind === 'level' && z.level != null) return t2[`facilities.${z.site}.levels.${z.level}.name`] ?? z.name;
  return z.name;
}

export function ZoneName({ zone, t2, subject }: { zone: Zone; t2: Record<string, string>; subject: string }) {
  if (zone.kind === 'unassigned') return <span class="pa-muted">Not assigned to a level</span>;
  return <RxText text={zoneName(zone, t2)} subject={subject} />;
}

/* ---------------------------------------------------------------- documents */

const SLOTS = { ScanPage: ScanPage as never, MarkingStrip, Seal, Stamp: Stamp as never };

export type DocState = { status: 'loading' } | { status: 'ready'; doc: DocJson } | { status: 'failed' };

/** Load a document and record doc.read once per mount. */
export function useDoc(entry: RouteEntry | null): DocState {
  const services = useServices();
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const logged = useRef(new Set<string>());
  useEffect(() => {
    if (!entry) return;
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
  }, [entry?.id]);
  return state;
}

export function DocBody({ state, entry }: { state: DocState; entry: RouteEntry }) {
  const services = useServices();
  if (state.status === 'loading') return <div class="pa-loading">Retrieving {entry.docNo} from the records server...</div>;
  if (state.status === 'failed') {
    return (
      <RefusalState
        authority="Communications Security, ALPHA-02"
        reference={entry.docNo}
        reason={`${entry.docNo} could not be retrieved from the records server for this workstation. Reopen the item; if the condition persists, report it to the Help Desk quoting the document number.`}
      />
    );
  }
  const doc = state.doc;
  return (
    <DocumentView
      doc={doc}
      markings={canon.markings}
      slots={SLOTS}
      onNavigate={(r) => services.openRoute(r)}
      onRedactionHover={(i: RedactionInfo) => logRx(services, doc.docNo, i)}
    />
  );
}

/** Refusal for a route this account may not read. Logs window.open once. */
export function RouteRefusal({ entry, reason, reference }: { entry: RouteEntry; reason: string; reference: string }) {
  const services = useServices();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === entry.id) return;
    done.current = entry.id;
    services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo}. Request refused: ${reason}`);
    services.sound.play('error');
  }, [entry.id]);
  return (
    <div class="pa-refusal">
      <RefusalState authority="Classification Control, Office of Internal Assurance" reference={reference} reason={reason} docNo={entry.docNo} />
    </div>
  );
}
