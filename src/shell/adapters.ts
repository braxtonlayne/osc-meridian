/**
 * SHELL ADAPTER: the single seam between the shell and modules owned by other
 * agents (canon, pipeline, design system, graphics). Wired to the real modules.
 *
 * Budget notes (initial JS < 180 KB gz):
 *  - canon.json is loaded lazily (`import('@canon')`) during the self-test; it is
 *    a shared chunk with the apps that import it. `canonNow()` is a signal read.
 *  - @core/search (MiniSearch) and the print path (DocumentView, ScanPage, Stamp)
 *    are dynamic imports, loaded on first use.
 */
import { h } from 'preact';
import type { ComponentType } from 'preact';
import { signal } from '@preact/signals';
import type { Canon, CompartmentId, Marking, MarkingId } from '@core/canon-types';
import type { DocJson, RouteEntry } from '@core/contracts';
import { BASE as PIPELINE_BASE, asset as pipelineAsset } from '@core/base';
import { createDocs } from '@core/docs';
import type { DocsService } from '@core/docs';
import { Seal as GSeal } from '@graphics/seal';
import { Icon as GIcon } from '@graphics/icons';
import type { IconId } from '@graphics/icons';
import { ClassificationBanner as GBanner, MarkingStrip as GStrip } from '@graphics/banners';
import { AccessCard as GAccessCard, SmartToken as GSmartToken, DesktopWatermark as GWatermark } from '@graphics/lock';
import { RefusalState as GRefusal, PathNotFound as GPathNotFound } from '@graphics/states';

/* ------------------------------------------------------------------ base */

/** Public base path ("/" locally, "/osc-meridian/" on Pages). Always ends in "/". */
export const BASE: string = PIPELINE_BASE.endsWith('/') ? PIPELINE_BASE : PIPELINE_BASE + '/';
export const asset = pipelineAsset;

/* ----------------------------------------------------------------- canon */

/** Canon subset the shell depends on. */
export interface ShellCanon {
  meta: Canon['meta'];
  markings: Marking[];
  operator: Canon['operator'];
  facilities: { id: string; class: string; codename: string | null }[];
  compartments: { id: CompartmentId; name: string; briefingDocNo: string }[];
  roster: { pn: string; name: string; role: string; tier: number; site: string }[];
  divisions: { id: string; name: string }[];
  full: Canon | null;
}

/**
 * Before canon resolves (only during the self-test panel) the shell needs a
 * value to render against; these are structural defaults, never shown as facts.
 */
const EMPTY: ShellCanon = {
  meta: { environment: 'MERIDIAN Workstation Environment', release: '', agency: 'Office of Strategic Continuity', inWorldDate: '2008-05-31', sourceDocNo: '', sourceRevision: '' },
  markings: [],
  operator: {
    operatorId: '',
    passphrase: '',
    pn: '',
    displayName: '',
    tier: 3,
    site: 'ALPHA-03',
    divisionId: 'RD',
    compartments: [],
    probationStart: '2008-04-14',
    supervisorPn: '',
    email: '',
  },
  facilities: [],
  compartments: [],
  roster: [],
  divisions: [],
  full: null,
};

const canonSig = signal<ShellCanon>(EMPTY);

export async function loadCanon(): Promise<ShellCanon> {
  const c = (await import('@canon')).default as unknown as Canon;
  const sc: ShellCanon = {
    meta: c.meta,
    markings: c.markings,
    operator: c.operator,
    facilities: c.facilities,
    compartments: c.compartments,
    roster: c.roster,
    divisions: c.divisions,
    full: c,
  };
  canonSig.value = sc;
  return sc;
}

/** Canon after loadCanon() resolved. A signal read: computeds re-evaluate when it lands. */
export function canonNow(): ShellCanon {
  return canonSig.value;
}

const PLAIN_MARKING: Marking = { id: 'TSSCI-OSC', label: '', sourceLabel: '', rank: 0, bannerBg: 'transparent', bannerFg: 'inherit', usage: '' };

export function markingById(id: MarkingId | null | undefined): Marking {
  const ms = canonSig.value.markings;
  return ms.find((m) => m.id === id) ?? [...ms].sort((a, b) => a.rank - b.rank)[0] ?? PLAIN_MARKING;
}

/* ------------------------------------------------------------------ docs */

let docsSvc: DocsService | null = null;

/** Pipeline docs service (routes bundled from .generated/routes.json). */
export function docsService(satisfies: (key: string) => boolean): DocsService {
  docsSvc ??= createDocs({ satisfies });
  return docsSvc;
}

export function loadRoutes(): RouteEntry[] {
  return docsSvc ? docsSvc.all() : [];
}

export function loadDoc(id: string): Promise<DocJson> {
  if (!docsSvc) return Promise.reject(new Error('Document service not initialised.'));
  return docsSvc.load(id);
}

/* ---------------------------------------------------------------- search */

export interface SearchHit {
  route: RouteEntry;
  score: number;
  snippet: string;
}

let searchFn: Promise<((q: string) => Promise<SearchHit[]>) | null> | null = null;

/**
 * Pipeline MiniSearch (@core/search, own lazy chunk) with `satisfies: () => true`
 * so the shell can count what it withholds. Falls back to a manifest substring
 * match if the index cannot be fetched.
 */
export async function searchRoutes(q: string, routes: RouteEntry[]): Promise<SearchHit[]> {
  searchFn ??= import('@core/search')
    .then((m) => {
      const byRoute = new Map(routes.map((r) => [r.route, r]));
      return m.createSearch({ satisfies: () => true, byRoute: (r) => byRoute.get(r) });
    })
    .catch(() => null);
  const fn = await searchFn;
  if (fn) {
    try {
      return await fn(q);
    } catch {
      /* index unavailable: fall through */
    }
  }
  return substringSearch(q, routes);
}

function substringSearch(q: string, routes: RouteEntry[]): SearchHit[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];
  for (const r of routes) {
    const title = r.title.toLowerCase();
    const docNo = r.docNo.toLowerCase();
    const hay = `${title} ${docNo} ${r.summary.toLowerCase()} ${r.originator.toLowerCase()} ${(r.facility ?? '').toLowerCase()}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    const score = terms.reduce((s, t) => s + (docNo.includes(t) ? 6 : title.includes(t) ? 4 : 1), 0);
    hits.push({ route: r, score, snippet: r.summary });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 40);
}

/* -------------------------------------------------------------- graphics */

export const Seal = GSeal as ComponentType<{ size: number; variant: 'full' | 'mono' | 'tiny'; title?: string }>;

export function Icon({ id, size = 16 }: { id: string; size?: 16 | 32 }) {
  return h(GIcon, { id: id as IconId, size });
}

/** @graphics/banners takes a Marking object; the shell tracks MarkingIds. */
export function ClassificationBanner({ marking, position = 'top' }: { marking: MarkingId; position?: 'top' | 'bottom' }) {
  if (!canonSig.value.markings.length) return h('div', { class: 'cls-banner-pending' });
  return h(GBanner, { marking: markingById(marking), position });
}

export function MarkingStrip({ marking }: { marking: MarkingId }) {
  if (!canonSig.value.markings.length) return null;
  return h(GStrip, { marking: markingById(marking) });
}

export const AccessCard = GAccessCard;
export const SmartToken = GSmartToken;
export const DesktopWatermark = GWatermark;

/**
 * RefusalState's reference prop is named `ref` in the contract, which collides
 * with Preact's reserved `ref` in JSX typing. The shell passes `reference`; this
 * wrapper hands it on as `ref` (Preact 11 forwards `ref` to function components
 * as an ordinary prop). Proposed contract change: rename it `reference`.
 */
export function RefusalState(p: { authority: string; reference: string; reason: string; requirement?: string; docNo?: string }) {
  return h(GRefusal as unknown as ComponentType<Record<string, unknown>>, {
    authority: p.authority,
    ref: p.reference,
    reason: p.reason,
    requirement: p.requirement,
    docNo: p.docNo,
  });
}

export const PathNotFound = GPathNotFound;

/* ----------------------------------------------------------------- print */

/**
 * Print a document through the design system: mount DocumentView in a
 * `.print-root` directly under <body>, set body[data-print-doc], print, then
 * remove both. Loaded on demand so DocumentView stays out of the initial chunk.
 */
export async function printDocument(
  doc: DocJson,
  opts: { onNavigate: (route: string) => void; onRedactionHover: (info: { auth: string; ref: string; id: string }) => void; copyNo: string; printedBy: string; printedAt: string },
): Promise<void> {
  const [{ render }, design, scan, banners] = await Promise.all([import('preact'), import('@design/index'), import('@graphics/scan'), import('@graphics/banners')]);
  const root = document.createElement('div');
  root.className = 'print-root';
  document.body.appendChild(root);
  render(
    h(design.DocumentView, {
      doc,
      markings: canonSig.value.markings,
      onNavigate: opts.onNavigate,
      onRedactionHover: opts.onRedactionHover,
      slots: {
        ScanPage: scan.ScanPage as never,
        MarkingStrip,
        Seal,
        Stamp: banners.Stamp as never,
      },
      print: { copyNo: opts.copyNo, printedBy: opts.printedBy, printedAt: opts.printedAt },
    }),
    root,
  );
  document.body.dataset.printDoc = doc.docNo;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeEventListener('afterprint', cleanup);
    render(null, root);
    root.remove();
    delete document.body.dataset.printDoc;
  };
  addEventListener('afterprint', cleanup);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1500);
  }
}
