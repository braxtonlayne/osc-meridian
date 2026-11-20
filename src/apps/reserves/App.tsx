/**
 * Reserves (SPEC 8.7): stock position by category and facility, sustainment calculator,
 * ALPHA-03 vault catalogues, reactor consoles for the eight installations, and a work order
 * citation lookup. Every figure is read from canon or from document content.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import {
  DocumentView,
  MenuBar,
  MessageBox,
  Select,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  Tree,
} from '@design/index';
import type { MenuBarMenu, RedactionHoverInfo, StatusPane, TreeNode } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { MarkingStrip as GMarkingStrip, Stamp } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { EmptyState, ErrorState } from '@graphics/states';
import type { AppProps, DocJson, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { GENE_HEADERS, SEED_HEADERS, canonValueInHtml, findTable, geneRelease } from './catalogue';
import type { GeneRelease } from './catalogue';
import { GeneBrowser, SeedBrowser, initialBrowser as initialBrowserState } from './VaultBrowser';
import type { BrowserState } from './VaultBrowser';
import {
  VIEWS,
  accessKey,
  canon,
  compartment,
  division,
  highestMarking,
  reactorOf,
  viewDef,
  viewForPath,
} from './data';
import type { ViewId } from './data';
import { Ctx, Refusal } from './parts';
import type { RsvCtx } from './parts';
import { ReactorConsole } from './Reactor';
import { Calculator, FacilityTable, FleetTable, PositionSummary, PositionTable, initialCalc } from './views';
import type { CalcState } from './views';
import { WorkOrderLookup, initialWo } from './WorkOrderView';
import type { WoState } from './WorkOrderView';
import { buildRegister, htmlToParts } from './workorders';
import type { WorkOrder } from './workorders';
import './reserves.css';
import { T4Home, t4Refused } from './acct';

type Mode = 'page' | 'wo';

interface DialogState {
  title: string;
  body: string;
  reference?: string;
  kind: 'info' | 'error';
}

const TABS: Partial<Record<ViewId, { id: string; label: string }[]>> = {
  overview: [
    { id: 'position', label: 'Position' },
    { id: 'facility', label: 'By facility' },
    { id: 'sustain', label: 'Sustainment calculator' },
  ],
  food: [
    { id: 'position', label: 'Stocks' },
    { id: 'sustain', label: 'Sustainment calculator' },
  ],
  medical: [
    { id: 'position', label: 'Stocks' },
    { id: 'sustain', label: 'Sustainment calculator' },
  ],
  energy: [
    { id: 'position', label: 'Stocks' },
    { id: 'fleet', label: 'Reactor fleet' },
  ],
};

const EMPTY_RELEASE: GeneRelease = { codes: [], bases: {} };
const markingLabel = (m: MarkingId) => canon.markings.find((x) => x.id === m)?.label ?? m;
const lowestMarking = (): MarkingId => [...canon.markings].sort((a, b) => a.rank - b.rank)[0]!.id;

function MarkingStrip({ marking }: { marking: MarkingId }) {
  const m = canon.markings.find((x) => x.id === marking);
  return m ? <GMarkingStrip marking={m} /> : null;
}

export default function App(props: AppProps) {
  const services = useServices();
  const entry = props.route ?? services.docs.byRoute('/reserves') ?? null;
  if (t4Refused(services, entry)) return <T4Home win={props.win} services={services} title="Reserves" docNo={entry?.docNo ?? 'OSC-RSV-IDX'} />;
  return <ReservesApp {...props} />;
}

function ReservesApp({ win, route }: AppProps) {
  const services = useServices();
  const operator = services.session.operatorId.value;
  // Reading these subscribes the window to clearance changes (briefings, acting tier).
  const clearanceSig = `${services.session.tier.value}|${services.session.compartments.value.join(',')}`;
  const satisfies = (k: string) => services.clearance.satisfies(k);

  const def = viewForPath(route?.route ?? '/reserves');
  const view = def.view;
  const entry: RouteEntry | undefined = route ?? services.docs.byRoute(def.path);
  const key = accessKey(entry);
  const allowed = !key || satisfies(key);
  const reactor = reactorOf(view);

  const [mode, setMode] = useState<Mode>('page');
  const [tab, setTab] = useState<string>(TABS[view]?.[0]?.id ?? 'main');
  const pendingTab = useRef<string | null>(null);
  const [navPane, setNavPane] = useState(true);
  const [calc, setCalc] = useState<CalcState>(initialCalc);
  const [seed, setSeed] = useState<BrowserState>(initialBrowserState);
  const [gene, setGene] = useState<BrowserState>(initialBrowserState);
  const [wo, setWo] = useState<WoState>(() => initialWo());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [register, setRegister] = useState<{ list: WorkOrder[]; scanned: string[]; markings: MarkingId[]; sig: string } | null>(null);
  const [woLoading, setWoLoading] = useState(false);
  const [message, setMessage] = useState('Ready');
  const docAnchor = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => setNarrow((es[0]?.contentRect.width ?? 1000) < 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const treeSel = useRef<string | null>(null);

  /* ---- route change: reset per-page state */
  useEffect(() => {
    setTab(pendingTab.current ?? TABS[view]?.[0]?.id ?? 'main');
    pendingTab.current = null;
  }, [def.path]);

  /* ---- refusal audit */
  useEffect(() => {
    if (entry && !allowed) {
      services.audit.log(
        'window.open',
        entry.docNo,
        `Operator ${operator} requested ${entry.docNo} in Reserves. Request refused: requires Tier ${entry.access!.tier} access determination.`,
      );
      services.sound.play('error');
    }
  }, [entry?.id, allowed]);

  /* ---- document load */
  useEffect(() => {
    if (!entry || !allowed) {
      setDoc(null);
      return;
    }
    let live = true;
    setDoc(null);
    setDocErr(null);
    win.setBusy(true);
    services.docs
      .load(entry.id)
      .then((d) => live && setDoc(d))
      .catch((e: unknown) => live && setDocErr(e instanceof Error ? e.message : String(e)))
      .finally(() => live && win.setBusy(false));
    return () => {
      live = false;
      win.setBusy(false);
    };
  }, [entry?.id, allowed, clearanceSig, reloadSeq]);

  /* ---- doc.read when a document is on screen */
  useEffect(() => {
    if (doc && mode === 'page') {
      services.audit.log('doc.read', doc.docNo, `Displayed ${doc.docNo} (${markingLabel(doc.marking)}) to operator ${operator} in Reserves.`);
    }
  }, [doc, mode]);

  /* ---- work order register (loaded on first use, rebuilt on clearance change) */
  useEffect(() => {
    if (mode !== 'wo' || (register && register.sig === clearanceSig)) return;
    let live = true;
    setWoLoading(true);
    win.setBusy(true);
    const routes = services.docs
      .all()
      .filter((r) => (r.app === 'reserves' || r.family === 'reserves') && (!accessKey(r) || satisfies(accessKey(r)!)));
    void Promise.allSettled(routes.map((r) => services.docs.load(r.id))).then((res) => {
      if (!live) return;
      const docs = res.flatMap((x) => (x.status === 'fulfilled' ? [x.value] : []));
      const sources = [
        ...canon.reactors.map((r) => ({ source: r.id, title: `${r.designation}, status report`, route: VIEWS.find((v) => v.view === `rx:${r.id}`)?.path ?? null, parts: [{ text: r.statusNote }] })),
        ...docs.map((d) => ({ source: d.docNo, title: d.title, route: d.route, parts: htmlToParts(d.html) })),
      ];
      const list = buildRegister(sources, canon.divisions.map((d) => d.id));
      const citing = new Set(list.flatMap((w) => w.citations.map((c) => c.source)));
      const markings = docs.filter((d) => citing.has(d.docNo)).map((d) => d.marking);
      setRegister({ list, scanned: docs.map((d) => d.docNo), markings, sig: clearanceSig });
      setWoLoading(false);
      win.setBusy(false);
    });
    return () => {
      live = false;
      win.setBusy(false);
    };
  }, [mode, clearanceSig]);

  /* ---- title, marking, status */
  const marking: MarkingId = useMemo(() => {
    if (mode === 'wo') return highestMarking([...(register?.markings ?? []), entry?.marking]) ?? lowestMarking();
    if (!allowed) return lowestMarking();
    return entry?.marking ?? lowestMarking();
  }, [mode, register, entry?.marking, allowed]);

  useEffect(() => {
    if (mode === 'wo') win.setTitle('Work Order Lookup', '');
    else if (entry) win.setTitle(entry.title, entry.docNo);
    else win.setTitle('Reserves', '');
    win.setMarking(marking);
    win.setStatus(mode === 'wo' ? 'Work order lookup' : (entry?.docNo ?? 'Reserves'));
  }, [mode, entry?.id, marking]);

  /* ---- actions */
  const go = (v: ViewId, wantTab?: string) => {
    setMode('page');
    const target = viewDef(v);
    if (target.path === def.path) {
      if (wantTab) setTab(wantTab);
      return;
    }
    pendingTab.current = wantTab ?? null;
    win.navigate(target.path);
  };

  const openWo = (no: string | null) => {
    setWo(no ? { selected: no, query: no, message: null } : { ...wo, message: null });
    setMode('wo');
  };

  const refuse = (title: string, body: string, reference: string, subject: string) => {
    services.audit.log('window.open', subject, `Operator ${operator} requested ${subject} in Reserves. Request refused: ${body}`);
    setDialog({ title, body, reference, kind: 'error' });
  };

  const print = () => {
    if (mode === 'page' && entry && allowed && doc) {
      services.print(entry.id);
      setMessage(`${entry.docNo} sent to the print queue.`);
    } else if (mode === 'wo') {
      setDialog({
        title: 'Print',
        kind: 'info',
        body: 'The work order lookup is a display and is not printed. Open the citing record and print it from its window.',
        reference: 'Ref OSC-DIR-0319',
      });
    } else {
      setDialog({ title: 'Print', kind: 'info', body: 'No record is displayed in this window.', reference: 'Ref OSC-DIR-0319' });
    }
  };

  const exportPositions = () =>
    refuse(
      'Export',
      'Export of reserves positions to file or removable media is not permitted from a MERIDIAN workstation. Positions may be printed under the reproduction rules.',
      'Ref OSC-DIR-0319',
      'Reserves export',
    );

  const switching = () => {
    const r = reactor;
    const fe = division('FE');
    refuse(
      'Switching order',
      `Switching orders${r ? ` for ${r.id}` : ''} are issued from the plant control room by the shift supervisor, ${fe ? fe.name : 'Facilities Engineering'}. This workstation has display access to plant status only.`,
      'Ref OSC-DIR-0301',
      r ? `${r.id} switching order` : 'Switching order',
    );
  };

  const woRecord = (no: string) => {
    const d = division(no.split('-')[0] ?? '');
    refuse(
      'Work order record',
      `Work order ${no} is held in the ${d ? d.name : 'originating division'} maintenance system. Reserves lists the records that cite a work order; it does not display work order records.`,
      'Ref OSC-DIR-0301',
      no,
    );
  };

  const openSource = (path: string) => {
    if (VIEWS.some((v) => v.path === path)) go(viewForPath(path).view);
    else services.openRoute(path);
  };

  const search = (q: string, where: string) => services.audit.log('search', q, `Operator ${operator} queried "${q}" in ${where} (Reserves).`);

  const onRxHover = (i: RedactionHoverInfo) =>
    services.audit.log('redaction.hover', entry?.docNo ?? 'Reserves', `Operator ${operator} examined withheld material in ${entry?.docNo ?? 'Reserves'} (${i.auth} ${i.ref}). No release was made.`);

  const ctx: RsvCtx = { subject: entry?.docNo ?? 'Reserves', onRxHover, satisfies, narrow };

  /* ---- document-derived catalogue data */
  const vaultData = useMemo(() => {
    if (!doc) return null;
    if (view === 'seed') return { overlay: findTable(doc.html, SEED_HEADERS.slice(0, 2)), total: null, release: null };
    if (view === 'gene') {
      const release: GeneRelease = geneRelease(doc.html);
      return { overlay: findTable(doc.html, GENE_HEADERS.slice(0, 2)), total: canonValueInHtml(doc.html, 'reserves.items.MED-GENETIC.value'), release };
    }
    return null;
  }, [doc, view]);

  /* ---- menus */
  const isView = (v: ViewId) => mode === 'page' && view === v;
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print record...', shortcut: 'Ctrl+P', onSelect: print },
        { label: '&Export positions...', onSelect: exportPositions },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: 'Reserves &position', checked: isView('overview'), radio: true, onSelect: () => go('overview') },
        { label: '&Food and water', checked: isView('food'), radio: true, onSelect: () => go('food') },
        { label: '&Medical', checked: isView('medical'), radio: true, onSelect: () => go('medical') },
        { label: '&Energy', checked: isView('energy'), radio: true, onSelect: () => go('energy') },
        { label: '&Armaments', checked: isView('arms'), radio: true, onSelect: () => go('arms') },
        { separator: true },
        { label: 'Positions by &facility', onSelect: () => go('overview', 'facility') },
        { label: '&Record (document)', onSelect: () => docAnchor.current?.scrollIntoView({ block: 'start' }) },
        { separator: true },
        { label: '&Navigation pane', checked: navPane, onSelect: () => setNavPane(!navPane) },
        { label: 'Re&fresh', shortcut: 'F5', onSelect: () => setReloadSeq(reloadSeq + 1) },
      ],
    },
    {
      label: 'Va&ults',
      items: [
        { label: '&Seed collection', checked: isView('seed'), radio: true, onSelect: () => go('seed') },
        { label: '&Biological sample collection', checked: isView('gene'), radio: true, onSelect: () => go('gene') },
      ],
    },
    {
      label: '&Reactors',
      items: [
        { label: 'Reactor &fleet', onSelect: () => go('energy', 'fleet') },
        { separator: true },
        ...canon.reactors.map((r) => ({
          label: `${r.id}  ${r.designation}`,
          checked: isView(`rx:${r.id}`),
          radio: true,
          onSelect: () => go(`rx:${r.id}`),
        })),
        { separator: true },
        { label: 'Issue &switching order...', onSelect: switching },
      ],
    },
    {
      label: '&Tools',
      items: [
        { label: '&Sustainment calculator', onSelect: () => go('overview', 'sustain') },
        { label: '&Reset calculator', onSelect: () => setCalc(initialCalc()) },
        { separator: true },
        { label: '&Work order lookup...', shortcut: 'Ctrl+L', onSelect: () => openWo(null) },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Looking up &work orders (KB-0031)', onSelect: () => services.openRoute('/system/kb/kb-0031') },
        { label: '&Basis of reserve figures (OSC-MEM-07-0612)', onSelect: () => services.openRoute('/reserves/memo/mem-07-0612') },
        { label: '&Compartmented records (OSC-DIR-0412)', onSelect: () => services.openRoute('/directives/dir-0412') },
        { separator: true },
        {
          label: '&About Reserves',
          onSelect: () => {
            const lr = division('LR');
            setDialog({
              title: 'About Reserves',
              kind: 'info',
              body: `Reserves, ${canon.meta.environment} release ${canon.meta.release}. Data owner: ${lr ? `${lr.name} (${lr.id}), ${lr.site}` : 'Logistics & Reserves'}. ${canon.reserves.basisNote}`,
            });
          },
        },
      ],
    },
  ];

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey && !e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      print();
    } else if (e.ctrlKey && !e.altKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      openWo(null);
    } else if (e.key === 'F5') {
      e.preventDefault();
      setReloadSeq(reloadSeq + 1);
    }
  };

  /* ---- navigation tree */
  const nodes: TreeNode[] = [
    {
      id: 'overview',
      label: 'Reserves position',
      children: [
        { id: 'food', label: 'Food and water' },
        { id: 'medical', label: 'Medical' },
        { id: 'energy', label: 'Energy' },
        { id: 'arms', label: 'Armaments', meta: satisfies('T2') ? undefined : '(T2)' },
      ],
    },
    {
      id: 'vaults',
      label: 'ALPHA-03 vaults',
      children: [
        { id: 'seed', label: 'Seed collection' },
        { id: 'gene', label: 'Biological samples' },
      ],
    },
    {
      id: 'reactors',
      label: 'Reactor installations',
      meta: `(${canon.reactors.length})`,
      children: canon.reactors.map((r) => ({ id: `rx:${r.id}`, label: r.id, meta: r.status })),
    },
    {
      id: 'tools',
      label: 'Tools',
      children: [
        { id: 'calc', label: 'Sustainment calculator' },
        { id: 'wo', label: 'Work order lookup' },
      ],
    },
  ];
  const activateNode = (id: string) => {
    if (id === 'wo') openWo(null);
    else if (id === 'calc') go('overview', 'sustain');
    else if (id === 'vaults') go('seed');
    else if (id === 'reactors') go('energy', 'fleet');
    else if (id === 'tools') go('overview', 'sustain');
    else go(id as ViewId);
  };
  const treeSelected = mode === 'wo' ? 'wo' : view;

  /* ---- status bar */
  const tallow = satisfies('TALLOW');
  const panes: StatusPane[] = [
    {
      id: 'msg',
      fill: true,
      content:
        mode === 'wo'
          ? woLoading
            ? 'Searching records for work order citations.'
            : `${register?.list.length ?? 0} work orders cited in the records searched.`
          : !allowed
            ? 'Display refused.'
            : doc
              ? message === 'Ready'
                ? 'Record displayed.'
                : message
              : docErr
                ? 'Record not available.'
                : entry
                  ? 'Retrieving record.'
                  : message,
    },
    { id: 'doc', width: 150, mono: true, label: 'Record', content: mode === 'wo' ? 'WORK ORDERS' : (entry?.docNo ?? 'RESERVES') },
    {
      id: 'pos',
      width: 170,
      mono: true,
      label: 'Position',
      content:
        mode === 'wo'
          ? `${register?.list.length ?? 0} cited, ${register?.scanned.length ?? 0} records`
          : view === 'seed'
            ? `PAGE ${seed.page.toLocaleString('en-US')}`
            : view === 'gene'
              ? `PAGE ${gene.page.toLocaleString('en-US')}`
              : reactor
                ? `${reactor.id} ${reactor.status}`
                : `${canon.reserves.items.length} LINES`,
    },
    { id: 'tallow', width: 128, label: 'TALLOW', content: `TALLOW: ${tallow ? 'HELD' : 'NOT HELD'}` },
    { id: 'mk', width: 190, label: 'Marking', content: markingLabel(marking) },
  ];

  /* ---- page body */
  const tabs = TABS[view];
  const interactive = (() => {
    if (!allowed) return null;
    if (reactor) return <ReactorConsole reactor={reactor} onOrder={(n) => openWo(n)} report={entry ? { docNo: entry.docNo, date: entry.date } : undefined} />;
    if (view === 'seed' || view === 'gene') {
      if (!doc) return <p class="rsv-note">{docErr ? 'The catalogue cannot be browsed while its record is unavailable.' : `Opening the catalogue (${entry?.docNo ?? ''}).`}</p>;
      if (view === 'seed') return <SeedBrowser state={seed} onChange={setSeed} onSearch={(q: string) => search(q, 'the seed catalogue')} overlay={vaultData?.overlay ?? null} />;
      return (
        <GeneBrowser
          state={gene}
          onChange={setGene}
          onSearch={(q: string) => search(q, 'the biological sample catalogue')}
          releasedTotal={vaultData?.total ?? null}
          overlay={vaultData?.overlay ?? null}
          release={vaultData?.release ?? EMPTY_RELEASE}
        />
      );
    }
    if (view === 'arms') return <PositionTable categories={def.categories} />;
    const body =
      tab === 'facility' ? (
        <FacilityTable
          onOpen={(f) => {
            const rx = canon.reactors.find((r) => r.site === f.id);
            if (rx && (!f.id.startsWith('BETA-') || satisfies('SEXTANT') || satisfies('TALLOW'))) go(`rx:${rx.id}`);
            else services.openRoute(`/registry/facility/${f.id.toLowerCase()}`);
          }}
        />
      ) : tab === 'sustain' ? (
        <Calculator state={calc} onChange={setCalc} />
      ) : tab === 'fleet' ? (
        <FleetTable onOpen={(r) => go(`rx:${r.id}`)} />
      ) : (
        <div class="rsv-stack">
          {view === 'overview' ? <PositionSummary /> : null}
          <PositionTable categories={def.categories} onOpenSite={(it) =>
              it.id === 'FOOD-SEED' ? go('seed') : it.id === 'MED-GENETIC' ? go('gene') : services.openRoute(`/registry/facility/${(it.site ?? '').toLowerCase()}`)
            }
          />
        </div>
      );
    return tabs ? (
      <Tabs tabs={tabs} active={tab} onChange={setTab} label={`${def.label} views`} panel="surface">
        {body}
      </Tabs>
    ) : (
      body
    );
  })();

  const docSection = (() => {
    if (!entry || !allowed) return null;
    if (docErr) {
      return (
        <ErrorState
          code="RD-DOC-0404"
          title="Record not available"
          body={`${entry.docNo} could not be retrieved from the document store. The record may not yet be issued to this workstation. Use Refresh to retry.`}
          detail={docErr}
        />
      );
    }
    if (!doc) return <p class="rsv-note">Retrieving {entry.docNo}.</p>;
    return (
      <DocumentView
        doc={doc}
        markings={canon.markings}
        onNavigate={(r) => openSource(r)}
        onRedactionHover={(i) =>
          services.audit.log('redaction.hover', doc.docNo, `Operator ${operator} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)
        }
        slots={{ ScanPage: ScanPage as never, MarkingStrip, Seal: Seal as never, Stamp: Stamp as never }}
      />
    );
  })();

  const refusal = entry && !allowed ? (
    <Refusal
      authority="Classification Control, Office of Internal Assurance"
      reference={entry.access?.compartment ? (compartment(entry.access.compartment)?.briefingDocNo ?? 'OSC-DIR-0412') : 'OSC-DIR-0412'}
      reason={`Requires Tier ${entry.access!.tier} access determination. Display of ${entry.docNo} to this operator is not authorised.`}
      requirement={`Tier ${entry.access!.tier}${entry.access?.compartment ? ` and ${entry.access.compartment} briefing` : ''}`}
      docNo={entry.docNo}
    />
  ) : null;

  return (
    <Ctx.Provider value={ctx}>
      <div class="rsv" ref={rootRef} onKeyDown={onKeyDown} data-clearance={clearanceSig}>
        <MenuBar menus={menus} label="Reserves menu" />
        <Toolbar label="Reserves toolbar">
          <ToolbarButton label="Position" pressed={isView('overview')} onClick={() => go('overview')} />
          <ToolbarButton label="Calculator" pressed={isView('overview') && tab === 'sustain'} onClick={() => go('overview', 'sustain')} />
          <ToolbarButton label="Reactors" pressed={isView('energy') && tab === 'fleet'} onClick={() => go('energy', 'fleet')} />
          <ToolbarButton label="Seed" pressed={isView('seed')} onClick={() => go('seed')} />
          <ToolbarButton label="Samples" pressed={isView('gene')} onClick={() => go('gene')} />
          <ToolbarButton label="Work orders" pressed={mode === 'wo'} onClick={() => openWo(null)} />
          <ToolbarSeparator />
          <ToolbarButton label="Print" onClick={print} />
          <ToolbarSpacer />
          <ToolbarButton label="Pane" pressed={navPane} title="Show or hide the navigation pane" onClick={() => setNavPane(!navPane)} />
        </Toolbar>
        <div class="rsv-goto">
          <Select
            label="Go to"
            value={treeSelected}
            layout="inline"
            options={[
              ...VIEWS.map((v) => ({ value: v.view, label: v.view.startsWith('rx:') ? `Reactor ${v.label}` : v.label })),
              { value: 'wo', label: 'Work order lookup' },
            ]}
            onChange={(v) => activateNode(v)}
          />
        </div>
        <div class={`rsv-body${navPane ? '' : ' rsv-body--nonav'}`}>
          {navPane ? (
            <nav
              class="rsv-nav"
              aria-label="Reserves navigation"
              onClick={() => {
                if (treeSel.current && treeSel.current !== treeSelected) activateNode(treeSel.current);
              }}
            >
              <Tree
                nodes={nodes}
                label="Reserves"
                selectedId={treeSelected}
                defaultExpanded={['overview', 'vaults', 'reactors', 'tools']}
                onSelect={(n) => (treeSel.current = n.id)}
                onActivate={(n) => activateNode(n.id)}
              />
            </nav>
          ) : null}
          <main class="rsv-main" aria-label={mode === 'wo' ? 'Work order lookup' : (entry?.title ?? 'Reserves')}>
            {mode === 'wo' ? (
              <div class="rsv-pad">
                <WorkOrderLookup
                  register={register?.list ?? []}
                  scanned={register?.scanned ?? []}
                  loading={woLoading}
                  state={wo}
                  onChange={setWo}
                  onOpenSource={openSource}
                  onRecord={woRecord}
                  onSearch={(q) => search(q, 'the work order lookup')}
                />
              </div>
            ) : refusal ? (
              refusal
            ) : (
              <div class="rsv-pad">
                {interactive}
                <div ref={docAnchor} class="rsv-doc">
                  {docSection ?? (!entry ? <EmptyState title="No record" body="This view has no record of its own." /> : null)}
                </div>
              </div>
            )}
          </main>
        </div>
        <StatusBar panes={panes} />
        {dialog ? (
          <MessageBox
            open
            title={dialog.title}
            kind={dialog.kind}
            reference={dialog.reference}
            onOpen={(k) => k === 'error' && services.sound.play('error')}
            onClose={() => setDialog(null)}
          >
            {dialog.body}
          </MessageBox>
        ) : null}
      </div>
    </Ctx.Provider>
  );
}
