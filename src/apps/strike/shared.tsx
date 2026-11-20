/** Strike app: canon handles, formatting, sizing hook, document pane. */
import canonJson from '@canon';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Canon, Facility, MarkingId } from '@core/canon-types';
import type { StrikeCanon } from '@core/canon-apps/strike';
import type { DocJson, RouteEntry, Services } from '@core/contracts';
import { IN_WORLD_DATE_ISO, siteLocal, zulu } from '@core/session';
import { DocumentView, type DocumentSlots, type OperStatus } from '@design/index';
import { MarkingStrip, Stamp } from '@graphics/banners';
import { ScanPage } from '@graphics/scan';
import { Seal } from '@graphics/seal';
import { ErrorState } from '@graphics/states';
import type { Overpressure } from './model';

export const canon = canonJson as unknown as Canon;
export const frag = canon.apps.strike as StrikeCanon;
export const S = canon.survivability;
export const MODEL_MARKING = S.model.marking as MarkingId;
export const REGISTER_HOST = S.model.originator.split('/')[1] ?? S.model.originator;

export const facilityById = new Map<string, Facility>(canon.facilities.map((f) => [f.id, f]));
export const hClassOf = new Map(S.facilities.map((x) => [x.facility as string, x.hardeningClass]));
export const classDef = (h: string) => S.classes.find((c) => c.id === h);
export const depthBand = (f: Facility): string => canon.classes.find((c) => c.id === f.class)?.depthText ?? '';

/** Condition word as a status square + word (colour never carries meaning on its own). */
export function conditionStatus(id: string): OperStatus {
  switch (id) {
    case 'OPERATIONAL':
      return 'NOMINAL';
    case 'DEGRADED':
      return 'DEGRADED';
    default:
      return 'FAULT';
  }
}

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('en-US');
export const fmtMi = (n: number): string => (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : fmtInt(n));
export const fmtKt = (kt: number): string => `${kt.toLocaleString('en-US')} kt`;
export const fmtRatio = (r: number | null): string => (r === null ? '' : r < 0.01 ? '0.00' : r.toFixed(2));

/** Overpressure as the table shows it. */
export function fmtPsi(op: Overpressure): string {
  const outer = S.contours[0]!.psi;
  if (op.band === 'below') return `< ${outer}`;
  if (op.band === 'above') return `> ${op.psi.toLocaleString('en-US')}`;
  return op.psi >= 100 ? fmtInt(op.psi) : op.psi.toFixed(1);
}

/** "1430Z (1030 EDT) 19 MAY 2008" for an in-world ISO time. */
export function whenText(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${zulu(d)} (${siteLocal(d)})`;
}

/** Register number for a serial: "PM3-08-0007". */
export function registerId(seq: number): string {
  return `${frag.registerPrefix}-${IN_WORLD_DATE_ISO.slice(2, 4)}-${String(seq).padStart(4, '0')}`;
}

/** Replace `{name}` tokens in a fragment string. */
export function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
}

/** Track an element's content box. */
export function useSize<T extends HTMLElement>(): [{ current: T | null }, { w: number; h: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = (): void => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    read();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/* ------------------------------------------------------------ documents */

const slots: DocumentSlots = {
  ScanPage: ScanPage as never,
  MarkingStrip: MarkingStrip as never,
  Seal: Seal as never,
  Stamp: Stamp as never,
};

export type DocLoad = { state: 'loading' } | { state: 'ready'; doc: DocJson } | { state: 'failed'; message: string };

export function useDoc(services: Services, entry: RouteEntry | null | undefined): DocLoad {
  const [load, setLoad] = useState<DocLoad>({ state: 'loading' });
  const clr = `${services.session.tier.value}:${services.session.compartments.value.join(',')}`;
  useEffect(() => {
    if (!entry) {
      setLoad({ state: 'failed', message: 'No document is filed for this view.' });
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
    services.audit.log('doc.read', docNo, `Operator ${services.session.operatorId.value} read ${docNo} in the Survivability Estimator.`);
  }, [docNo]);

  if (load.state === 'loading') return <div class="stk-doc stk-doc--loading">Retrieving {entry?.docNo ?? 'document'} from the records server...</div>;
  if (load.state === 'failed') {
    return (
      <div class="stk-doc">
        <ErrorState
          code="RS-DOC-0217"
          title={`${entry?.docNo ?? 'Document'} not available`}
          body="The records server did not return this document to the workstation. The estimator remains available."
          detail={load.message}
        />
      </div>
    );
  }
  const doc = load.doc;
  return (
    <div class="stk-doc">
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
