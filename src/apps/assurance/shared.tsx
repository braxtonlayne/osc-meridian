/** Shared pieces for the Assurance views: canon access, redaction text, the document pane. */
import { createContext } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { DocJson, RedactionInfo, RouteEntry, Services } from '@core/contracts';
import type { Canon, Marking } from '@core/canon-types';
import { useServices } from '@core/services';
import { splitRx } from '@core/rx';
import { DocumentView, Redaction, type RedactionHoverInfo } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { Stamp } from '@graphics/banners';
import { MarkingStrip, RefusalState, Seal } from '@shell/adapters';

export const canon = canonJson as unknown as Canon;

export function markingOf(id: string): Marking | undefined {
  return canon.markings.find((m) => m.id === id);
}

/** Release key a route requires ("T2", "BRIAR+T3"), or null when it is open to all. */
export function routeKey(r: Pick<RouteEntry, 'access'>): string | null {
  if (!r.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

export function canRead(services: Services, r: Pick<RouteEntry, 'access'>): boolean {
  const k = routeKey(r);
  return !k || services.clearance.satisfies(k);
}

/** Audit a hovered/focused withheld element in the shell's wording. */
export function logRx(services: Services, docNo: string, info: { auth: string; ref: string }): void {
  services.audit.log(
    'redaction.hover',
    docNo,
    `Operator ${services.session.operatorId.peek()} examined withheld material in ${docNo} (${info.auth} ${info.ref}). No release was made.`,
  );
}

/** Withholding authority and reference for a canon sentinel key. */
export function rxAuthority(key: string): { auth: string; ref: string } {
  if (key === 'T1') return COUNCIL_RX;
  return OIA_RX;
}

/** Withholding authorities and references in the formats of OSC-ASR-CG section 7. */
export const COUNCIL_RX = { auth: 'COUNCIL', ref: 'CC-ART-IV' } as const;
export const OIA_RX = { auth: 'OIA', ref: 'OIA-PROT-04' } as const;
export const CVO_RX = { auth: 'CVO', ref: 'CVO-08-027' } as const;

/**
 * Text that may carry canon redaction sentinels (or the source's literal "[REDACTED]"):
 * plain parts as text, withheld parts as Redaction bars.
 */
export function RxText({ text, docNo, auth, reference }: { text: string | null | undefined; docNo: string; auth?: string; reference?: string }) {
  const services = useServices();
  if (text == null) return null;
  const parts = splitRx(text.replace(/\[REDACTED\]/g, '[[RX:T1:10]]'));
  return (
    <>
      {parts.map((p, i) => {
        if ('text' in p) return <span key={i}>{p.text}</span>;
        const a = rxAuthority(p.rx.key);
        const au = auth ?? a.auth;
        const rf = reference ?? a.ref;
        return <Redaction key={i} len={p.rx.len} auth={au} reference={rf} onHover={() => logRx(services, docNo, { auth: au, ref: rf })} />;
      })}
    </>
  );
}

/** A plain withheld bar for canon values the operator's access does not release. */
export function Withheld({ len, docNo, auth, reference }: { len: number; docNo: string; auth: string; reference: string }) {
  const services = useServices();
  return <Redaction len={Math.max(2, len)} auth={auth} reference={reference} onHover={(i: RedactionHoverInfo) => logRx(services, docNo, i)} />;
}

const SLOTS = {
  ScanPage: ScanPage as never,
  MarkingStrip,
  Seal,
  Stamp: Stamp as never,
};

export type DocState = { status: 'loading' } | { status: 'ready'; doc: DocJson } | { status: 'failed' };

/**
 * Load a document for display and record `doc.read` once per document per mount.
 * Returns the load state; the caller renders it with DocBody.
 */
export function useDoc(entry: RouteEntry | null | undefined, opts: { log?: boolean } = {}): DocState {
  const services = useServices();
  const [state, setState] = useState<DocState>({ status: 'loading' });
  const logged = useRef(new Set<string>());
  const log = opts.log !== false;
  const comps = services.session.compartments.value.join(',');
  const acting = services.session.actingTier2.value;
  useEffect(() => {
    if (!entry) return;
    let live = true;
    setState({ status: 'loading' });
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setState({ status: 'ready', doc });
        if (log && !logged.current.has(doc.id)) {
          logged.current.add(doc.id);
          services.audit.log('doc.read', doc.docNo);
        }
      })
      .catch(() => live && setState({ status: 'failed' }));
    return () => {
      live = false;
    };
    // Reload when access changes so newly satisfied releases are applied.
  }, [entry?.id, comps, acting]);
  return state;
}

export function DocBody({ state, entry, bare }: { state: DocState; entry: RouteEntry; bare?: boolean }) {
  const services = useServices();
  if (state.status === 'loading') return <div class="asr-loading">Retrieving {entry.docNo} from the records server...</div>;
  if (state.status === 'failed') {
    return (
      <div class="asr-refusal">
        <RefusalState
          authority="Records Division, ALPHA-03"
          reference={entry.docNo}
          reason={`${entry.docNo} could not be retrieved from the records server for this workstation. Reopen the item; if the condition persists, report it to the Help Desk quoting the document number.`}
        />
      </div>
    );
  }
  const doc = state.doc;
  return (
    <DocumentView
      doc={doc}
      bare={bare}
      markings={canon.markings}
      slots={SLOTS}
      onNavigate={(r) => services.openRoute(r)}
      onRedactionHover={(i: RedactionInfo) => logRx(services, doc.docNo, i)}
    />
  );
}

/** A route's document under the app's own panels. */
export function DocPane({ entry, state }: { entry: RouteEntry; state: DocState }) {
  return (
    <section class="asr-doc" aria-label={`${entry.docNo} document`}>
      <DocBody state={state} entry={entry} />
    </section>
  );
}

/** Refusal for a route this operator's access does not satisfy. Logs window.open once. */
export function RouteRefusal({ entry }: { entry: RouteEntry }) {
  const services = useServices();
  const done = useRef<string | null>(null);
  const comp = entry.access?.compartment;
  const briefing = comp ? canon.compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
  const reason = `Requires Tier ${entry.access?.tier ?? 3} access determination${comp ? ` and ${comp} compartment briefing` : ''}. Display of ${entry.docNo} to this operator is not authorised.`;
  useEffect(() => {
    if (done.current === entry.id) return;
    done.current = entry.id;
    services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo}. Request refused: ${reason}`);
    services.sound.play('error');
  }, [entry.id]);
  return (
    <div class="asr-refusal">
      <RefusalState authority="Classification Control, Office of Internal Assurance" reference={briefing ?? 'OSC-DIR-0412'} reason={reason} docNo={entry.docNo} />
    </div>
  );
}

/** Division name for a code ("OIA" -> "Office of Internal Assurance"). */
export function divisionName(code: string | null | undefined): string | undefined {
  return code ? canon.divisions.find((d) => d.id === code)?.name : undefined;
}

/** True when the app is laid out for a narrow window or handheld mode. */
export const CompactCtx = createContext(false);
/** PropertyGrid column count for the current width. */
export function useGridCols(): 1 | 2 {
  return useContext(CompactCtx) ? 1 : 2;
}
