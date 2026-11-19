/**
 * Personnel System: shared UI pieces (context, redaction cells, document pane, refusal).
 */
import { createContext, h, type ComponentChildren } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import type { DocJson, RouteEntry, Services, WindowHandle } from '@core/contracts';
import { splitRx } from '@core/rx';
import type { MarkingId } from '@core/canon-types';
import { DocumentView, Redaction, type DocumentSlots, type RedactionHoverInfo } from '@design/index';
import { RefusalState as GRefusal, EmptyState, ErrorState } from '@graphics/states';
import { ScanPage } from '@graphics/scan';
import { MarkingStrip, Stamp } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { PERSONNEL_AUTHORITY, canon, fmt, withholdingRef } from './model';
import type { Cell } from './directory';

export interface RefusalSpec {
  title: string;
  message: string;
  reference: string;
  authority?: string;
}

export interface PerCtx {
  services: Services;
  win: WindowHandle;
  /** Document number that audit entries for the current view are filed against. */
  subject: string;
  go(path: string): void;
  refuse(r: RefusalSpec): void;
  setMessage(text: string): void;
}

export const Ctx = createContext<PerCtx | null>(null);

export function usePer(): PerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('Personnel context missing');
  return c;
}

/** Redaction bar for a canon sentinel or app-withheld value, audited on hover. */
export function Bar({ k, len }: { k: string; len: number }) {
  const { services, subject } = usePer();
  const ref = withholdingRef(k);
  return (
    <Redaction
      len={len}
      block={len > 32}
      auth={PERSONNEL_AUTHORITY}
      reference={ref}
      onHover={(i: RedactionHoverInfo) =>
        services.audit.log('redaction.hover', subject, `Operator ${services.session.operatorId.peek()} examined withheld material in ${subject} (${i.auth} ${i.ref}). No release was made.`)
      }
    />
  );
}

/**
 * A canon figure. Null is a figure the client canon withholds (DELTA berthing and staff,
 * Tier 1): it is drawn as a bar, never as zero.
 */
export function Figure({ n, digits = 0, k = 'T1' }: { n: number | null; digits?: number; k?: string }) {
  return n === null ? <Bar k={k} len={4} /> : <>{fmt(n, digits)}</>;
}

/** A directory cell. */
export function CellView({ c }: { c: Cell }) {
  return 'text' in c ? <RxText s={c.text} /> : <Bar k={c.rx.key} len={c.rx.len} />;
}

/** Text that may carry embedded sentinels (scrubbed names in canon notes). */
export function RxText({ s }: { s: string | null | undefined }) {
  if (!s) return null;
  const parts = splitRx(s);
  if (parts.length === 1 && 'text' in parts[0]!) return <>{s}</>;
  return (
    <>
      {parts.map((p, i) => ('text' in p ? <span key={i}>{p.text}</span> : <Bar key={i} k={p.rx.key} len={p.rx.len} />))}
    </>
  );
}

/** @graphics/states RefusalState with the app's prop shape. */
export function Refusal(p: { authority: string; reference: string; reason: string; requirement?: string; docNo?: string }) {
  return h(GRefusal, p);
}

/* ------------------------------------------------------------ documents */

/** DocumentView hands the slot a marking id; the banner component takes the canon Marking. */
function MarkingStripById({ marking }: { marking: MarkingId }) {
  const m = canon.markings.find((x) => x.id === marking);
  return m ? <MarkingStrip marking={m} /> : null;
}

const slots: DocumentSlots = {
  ScanPage: ScanPage as DocumentSlots['ScanPage'],
  MarkingStrip: MarkingStripById,
  Seal: Seal as DocumentSlots['Seal'],
  Stamp: Stamp as DocumentSlots['Stamp'],
};

/**
 * Loads and renders the document registered for a route, and audits the read
 * once per mount. Release files the session satisfies are applied by the loader.
 */
export function DocPane({ entry, reloadKey }: { entry: RouteEntry | null; reloadKey: number }) {
  const { services, setMessage } = usePer();
  const [state, setState] = useState<{ doc: DocJson | null; err: string | null; id: string | null }>({ doc: null, err: null, id: null });
  const logged = useRef<string | null>(null);
  const satisfiedCount = services.session.compartments.value.length + (services.session.actingTier2.value ? 1 : 0);

  useEffect(() => {
    if (!entry) return;
    let live = true;
    setState((s) => ({ doc: s.id === entry.id ? s.doc : null, err: null, id: entry.id }));
    setMessage(`Retrieving ${entry.docNo}...`);
    services.docs
      .load(entry.id)
      .then((doc) => {
        if (!live) return;
        setState({ doc, err: null, id: entry.id });
        setMessage(`${doc.docNo} Rev ${doc.revision} retrieved.`);
        if (logged.current !== doc.docNo) {
          logged.current = doc.docNo;
          services.audit.log('doc.read', doc.docNo, `Operator ${services.session.operatorId.peek()} read ${doc.docNo} Rev ${doc.revision} in Personnel System.`);
        }
      })
      .catch(() => {
        if (!live) return;
        setState({ doc: null, err: entry.docNo, id: entry.id });
        setMessage(`${entry.docNo} could not be retrieved.`);
      });
    return () => {
      live = false;
    };
  }, [entry?.id, reloadKey, satisfiedCount]);

  if (!entry) {
    return <EmptyState icon="folder" title="No document is registered for this view." body="The interactive view is the record of reference for this page." />;
  }
  if (state.err) {
    return (
      <ErrorState
        code="PER-DOC-0412"
        title={`${state.err} could not be retrieved`}
        body="The record service did not return the document. Use Refresh on the View menu to try again; if the condition persists, report it to the Help Desk quoting the code."
      />
    );
  }
  if (!state.doc) return <div class="per-loading">Retrieving {entry.docNo}...</div>;
  const doc = state.doc;
  return (
    <div class="per-doc">
      <DocumentView
        doc={doc}
        markings={canon.markings}
        slots={slots}
        onNavigate={(r) => services.openRoute(r)}
        onRedactionHover={(i) =>
          services.audit.log('redaction.hover', doc.docNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)
        }
      />
    </div>
  );
}

/** Section heading inside a view. */
export function Section({ title, children, id }: { title: string; children: ComponentChildren; id?: string }) {
  return (
    <section class="per-section" id={id} aria-label={title}>
      <h3 class="per-h">{title}</h3>
      {children}
    </section>
  );
}

/** Link-styled button that opens a route through the shell (another window or this one). */
export function RouteLink({ docNo, children }: { docNo: string; children?: ComponentChildren }) {
  const { services } = usePer();
  const entry = services.docs.byDocNo(docNo);
  if (!entry) return <span class="per-mono">{children ?? docNo}</span>;
  return (
    <a
      href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}${entry.route}`}
      class="per-link"
      onClick={(e) => {
        if (e.ctrlKey || e.shiftKey || e.metaKey || e.button !== 0) return;
        e.preventDefault();
        services.openRoute(entry.route);
      }}
    >
      {children ?? docNo}
    </a>
  );
}

/** Width of an element, followed with a ResizeObserver. */
export function useWidth<T extends HTMLElement>(): [{ current: T | null }, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
