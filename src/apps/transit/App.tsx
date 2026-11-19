/**
 * Transit Control: the Network Control board (line diagram, geographic and 3D views),
 * working timetable, movements, incident log, possession register, tunnel environment,
 * and the transit documents (segment and network sheets, engineering summary, rolling
 * stock register, filed incident and possession records).
 *
 * Train movement comes from src/sim/transit.worker.ts. The segment 04 movement is decided
 * by the narrative engine (@narrative/engine `seg04`); this app only draws it and records
 * whether the board was on screen while it ran (transit.watch).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon, MarkingId, NetworkId } from '@core/canon-types';
import type { AppProps, DocJson, RouteEntry } from '@core/contracts';
import { routes, useServices } from '@core/services';
import { DocumentView, MenuBar, MessageBox, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu, type MenuItem } from '@design/index';
import { LineDiagram, type DiagramNetwork } from '@graphics/schematic';
import { RefusalState } from '@graphics/states';
import type { TunnelLayer } from '@graphics/tunnelmap';
import { hhmmLocal, hhmmssZ, zoneForState } from '@sim/time';
import { diagramBlockCounts } from '@sim/transit-model';
import { logBaseFrom, TIMETABLE_DOCNO, useBoard, useSeg04Watch, useSheets, useTimetable, watchAt } from './board';
import { GeoView } from './geo';
import { Tunnel3DView } from './tunnel3d';
import { Detail, DiagramView, EnvironmentView, LogView, MovementTable, MovementsView, PossessionView, TimetableView, useSize, type Snapshot } from './views';
import './transit.css';

const canon = canonJson as unknown as Canon;

type View = 'diagram' | 'geo' | '3d' | 'timetable' | 'movements' | 'log' | 'possessions' | 'environment' | 'document';

const VIEWS: { id: View; label: string; menu: string; watch: string }[] = [
  { id: 'diagram', label: 'Line diagram', menu: '&Line diagram', watch: 'schematic view' },
  { id: 'geo', label: 'Geographic', menu: '&Geographic', watch: 'geographic view' },
  { id: '3d', label: 'Tunnel 3D', menu: 'Tunnel &3D', watch: 'tunnel 3D view' },
  { id: 'timetable', label: 'Timetable', menu: '&Timetable', watch: 'timetable' },
  { id: 'movements', label: 'Movements', menu: '&Movements', watch: 'movements' },
  { id: 'log', label: 'Incident log', menu: '&Incident log', watch: 'incident log' },
  { id: 'possessions', label: 'Possessions', menu: '&Possessions', watch: 'possession register' },
  { id: 'environment', label: 'Environment', menu: '&Environment', watch: 'tunnel environment' },
  { id: 'document', label: 'Document', menu: '&Document', watch: 'document' },
];

const NETWORKS: { id: DiagramNetwork; label: string }[] = [
  { id: 'ALL', label: 'All networks' },
  { id: 'RAIL', label: 'Rail only' },
  ...canon.tramNetworks.map((n) => ({ id: n.id as DiagramNetwork, label: n.name })),
];

const NET_SLUG: Record<string, NetworkId> = { eas: 'EASTERN', sou: 'SOUTHERN', mtw: 'MOUNTAIN_WESTERN', cen: 'CENTRAL' } as Record<string, NetworkId>;
const NC_ZONE = zoneForState('VA');

interface Notice {
  title: string;
  kind: 'info' | 'warning' | 'error';
  body: string;
  reference?: string;
}

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  return r.access.compartment ? `${r.access.compartment}+T${r.access.tier}` : `T${r.access.tier}`;
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState(0);
  const isHome = !route || route.route === '/transit';
  const homeDoc = services.docs.byDocNo(TIMETABLE_DOCNO);
  const docEntry: RouteEntry | null = route ?? homeDoc ?? null;

  const [view, setView] = useState<View>(isHome ? 'diagram' : 'document');
  const [network, setNetwork] = useState<DiagramNetwork>('ALL');
  const [layer, setLayer] = useState<TunnelLayer>('engineering');
  const [selected, setSelected] = useState<string | null>(null);
  const [envSeg, setEnvSeg] = useState('04');
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setView(isHome ? 'diagram' : 'document');
    const seg = route ? /^\/transit\/segment\/(\d{2})$/.exec(route.route)?.[1] : undefined;
    setSelected(seg ?? null);
    if (seg) setEnvSeg(seg);
  }, [route?.route]);

  const tt = useTimetable(services);
  const { sheets, model } = useSheets(services);
  const nRoutes = routes.value.length;
  const logBase = useMemo(() => logBaseFrom(services), [services, nRoutes]);
  const cfg = useMemo(() => ({ timetable: tt?.timetable ?? null, logBase, places: [] as string[], sheets }), [tt, logBase, sheets]);
  const state = useBoard(cfg);

  const viewDef = VIEWS.find((v) => v.id === view)!;
  useSeg04Watch(services, rootRef, view === 'document' && docEntry ? `document ${docEntry.docNo}` : viewDef.watch);

  /* access */
  const key = route ? accessKey(route) : null;
  const refused = !!(key && !services.clearance.satisfies(key));
  useEffect(() => {
    if (refused && route) services.audit.log('window.open', route.docNo, `Operator ${services.session.operatorId.peek()} was refused ${route.docNo} in Transit Control. Requirement ${key} not held.`);
  }, [refused, route?.docNo]);

  /* document */
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState(false);
  const comps = services.session.compartments.value.join(',');
  useEffect(() => {
    setDoc(null);
    setDocErr(false);
    if (!docEntry || refused) return;
    let live = true;
    services.docs
      .load(docEntry.id)
      .then((d) => live && setDoc(d))
      .catch(() => live && setDocErr(true));
    return () => {
      live = false;
    };
  }, [docEntry?.id, refused, comps]);
  const readLogged = useRef<string | null>(null);
  useEffect(() => {
    if (view === 'document' && doc && readLogged.current !== doc.docNo) {
      readLogged.current = doc.docNo;
      services.audit.log('doc.read', doc.docNo);
    }
  }, [view, doc]);

  /* window chrome */
  useEffect(() => {
    if (route && !isHome) win.setTitle(route.title, route.docNo);
    else win.setTitle('Network Control Board', homeDoc?.docNo);
    win.setMarking((route?.marking ?? homeDoc?.marking ?? 'UMBRA-C') as MarkingId);
  }, [route?.route, homeDoc?.docNo]);
  useEffect(() => {
    win.setStatus(`${viewDef.label}${state ? `; ${state.trains.length} consists on the line` : ''}`);
  }, [view, state?.trains.length]);
  useEffect(() => win.setBusy(!state), [!state]);

  /* size (handheld / narrow windows) */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setRootSize(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = rootSize > 0 && rootSize < 760;

  const openRoute = (path: string) => (path.startsWith('/transit') ? win.navigate(path) : services.openRoute(path));
  const openDocNo = (docNo: string, missing: string) => {
    const r = services.docs.byDocNo(docNo);
    if (r) openRoute(r.route);
    else setNotice({ title: 'Transit Control', kind: 'info', body: missing, reference: docNo });
  };

  const printDoc = () => {
    if (view === 'document' && doc) services.print(doc.id);
    else
      setNotice({
        title: 'Print',
        kind: 'warning',
        body: 'Board displays are not released to the print queue. Print the working timetable or a segment sheet from the Document view.',
        reference: 'Ref OSC-DIR-0319',
      });
  };

  const transitDocs = services.docs
    .all()
    .filter((r) => r.app === 'transit')
    .sort((a, b) => a.docNo.localeCompare(b.docNo));

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: printDoc },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        ...VIEWS.map((v, i): MenuItem => ({ label: v.menu, shortcut: `Ctrl+${i + 1}`, checked: view === v.id, radio: true, onSelect: () => setView(v.id) })),
        { separator: true },
        ...NETWORKS.map((n): MenuItem => ({ label: n.label, checked: network === n.id, radio: true, onSelect: () => (setNetwork(n.id), setView('diagram')) })),
      ],
    },
    {
      label: '&Go',
      items: [
        { label: '&Board (home)', onSelect: () => win.navigate('/transit') },
        { separator: true },
        ...transitDocs.filter((r) => r.route !== '/transit').map((r): MenuItem => ({ label: `${r.docNo}  ${r.title.length > 52 ? r.title.slice(0, 50) + '...' : r.title}`, onSelect: () => win.navigate(r.route) })),
      ],
    },
    {
      label: '&Board',
      items: [
        {
          label: '&Book path...',
          onSelect: () =>
            setNotice({ title: 'Book path', kind: 'warning', body: 'Paths are booked by Network Control (TO/ALPHA-01). Passenger bookings against published paths are made on OSC-F-109.', reference: 'Ref OSC-DIR-0262' }),
        },
        {
          label: '&Request possession...',
          onSelect: () => setNotice({ title: 'Request possession', kind: 'warning', body: 'Possessions are requested by Facilities Engineering and granted by Transit Control. This workstation is not a Transit Control desk.', reference: 'Ref OSC-DIR-0412' }),
        },
        { label: 'Report an &irregular indication (OSC-F-114)...', onSelect: () => openDocNo('OSC-F-114', 'OSC-F-114 is not available from this workstation.') },
        { separator: true },
        { label: '&Clear selection', shortcut: 'Esc', onSelect: () => setSelected(null) },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Board &conventions (KB-0042)', onSelect: () => openDocNo('KB-0042', 'The help article is not on this workstation.') },
        { label: '&Glossary', onSelect: () => openDocNo('OSC-SYS-GLO', 'The glossary is not on this workstation.') },
        { separator: true },
        {
          label: '&About Transit Control',
          onSelect: () =>
            setNotice({
              title: 'About Transit Control',
              kind: 'info',
              body: 'Transit Control, Network Control board client. Board data relayed from Network Control, ALPHA-01. Display of the board is recorded in the workstation audit trail.',
              reference: 'MERIDIAN 4.1.7',
            }),
        },
      ],
    },
  ];

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey && /^[1-9]$/.test(e.key)) {
      const v = VIEWS[Number(e.key) - 1];
      if (v) {
        e.preventDefault();
        setView(v.id);
      }
    } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      printDoc();
    } else if (e.key === 'Escape' && selected) setSelected(null);
  };

  const now = state?.now ?? Date.now();
  const watch = tt ? watchAt(tt.roster, now) : null;
  const notClear = state ? Object.keys(state.blocks).length : 0;

  let body;
  if (refused && route) {
    body = (
      <RefusalState
        authority="Transit Operations"
        reference="DIR-0412"
        docNo={route.docNo}
        reason={`${route.docNo} is held under a compartment this operator has not been briefed into.`}
        requirement={`${route.access?.compartment ?? `Tier ${route.access?.tier}`} compartment briefing. Reference DIR-0412.`}
      />
    );
  } else {
    body = (
      <MainView
        view={view}
        services={services}
        model={model}
        state={state}
        tt={tt}
        network={network}
        layer={layer}
        selected={selected}
        onSelect={setSelected}
        compact={compact}
        envSeg={envSeg}
        onEnvSeg={setEnvSeg}
        doc={doc}
        docErr={docErr}
        route={route}
        openRoute={openRoute}
      />
    );
  }

  return (
    <div class="tr-root" ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Transit Control menu" />
      <Toolbar label="Board views">
        {VIEWS.map((v) => (
          <ToolbarButton key={v.id} label={v.label} pressed={view === v.id} onClick={() => setView(v.id)} title={`${v.label} (Ctrl+${VIEWS.indexOf(v) + 1})`} />
        ))}
        <ToolbarSeparator />
        {view === 'diagram' && (
          <select class="f-select tr-tbsel" aria-label="Network shown" value={network} onChange={(e) => setNetwork((e.target as HTMLSelectElement).value as DiagramNetwork)}>
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        )}
        {view === 'geo' && (
          <select class="f-select tr-tbsel" aria-label="Drawing layer" value={layer} onChange={(e) => setLayer((e.target as HTMLSelectElement).value as TunnelLayer)}>
            <option value="engineering">Engineering layer</option>
            <option value="certified">Certified layer</option>
            <option value="both">Reconciliation (both)</option>
          </select>
        )}
        <ToolbarSpacer />
        <ToolbarButton label="Print" onClick={printDoc} title="Print (Ctrl+P)" />
      </Toolbar>
      <div class="tr-body">{body}</div>
      <StatusBar
        panes={[
          { id: 'view', content: route && !isHome ? `${viewDef.label}: ${route.docNo}` : viewDef.label, fill: true },
          { id: 'clock', content: `${hhmmssZ(now)} (${hhmmLocal(now, NC_ZONE)})`, mono: true, label: 'Network Control time' },
          { id: 'watch', content: watch ? `${watch.watch}: ${watch.dispatcher}` : 'Watch not recorded', label: 'Dispatcher on watch' },
          { id: 'consists', content: `Consists ${state?.trains.length ?? 0}`, mono: true },
          { id: 'blocks', content: `Blocks not clear ${notClear}`, mono: true },
          { id: 'tt', content: tt ? `${tt.timetable.source} rev ${tt.revision}` : 'No timetable', mono: true },
        ]}
      />
      {notice && (
        <MessageBox open title={notice.title} kind={notice.kind} reference={notice.reference} onClose={() => setNotice(null)} onOpen={(k) => k !== 'info' && services.sound.play('error')}>
          {notice.body}
        </MessageBox>
      )}
    </div>
  );
}

interface MainProps {
  view: View;
  services: ReturnType<typeof useServices>;
  model: ReturnType<typeof useSheets>['model'];
  state: Snapshot | null;
  tt: ReturnType<typeof useTimetable>;
  network: DiagramNetwork;
  layer: TunnelLayer;
  selected: string | null;
  onSelect: (k: string | null) => void;
  compact: boolean;
  envSeg: string;
  onEnvSeg: (s: string) => void;
  doc: DocJson | null;
  docErr: boolean;
  route: RouteEntry | null;
  openRoute: (path: string) => void;
}

function MainView(p: MainProps) {
  switch (p.view) {
    case 'diagram':
      return <DiagramView model={p.model} state={p.state} network={p.network} selected={p.selected} onSelect={p.onSelect} services={p.services} tt={p.tt} compact={p.compact} />;
    case 'geo':
      return <GeoView model={p.model} state={p.state} layer={p.layer} selected={p.selected} onSelect={p.onSelect} />;
    case '3d':
      return <Tunnel3DView state={p.state} selected={p.selected} onSelect={p.onSelect} reducedMotion={p.services.settings.reducedMotion.value} />;
    case 'timetable':
      return <TimetableView model={p.model} state={p.state} tt={p.tt}  />;
    case 'movements':
      return <MovementsView model={p.model} state={p.state} />;
    case 'log':
      return <LogView state={p.state} services={p.services} onOpen={p.openRoute} />;
    case 'possessions':
      return <PossessionView state={p.state} services={p.services} onOpen={p.openRoute} />;
    case 'environment':
      return <EnvironmentView model={p.model} state={p.state} services={p.services} segment={p.envSeg} onSegment={p.onEnvSeg} />;
    case 'document':
      return <DocumentPane {...p} />;
  }
}

function DocumentPane(p: MainProps) {
  const { doc, services } = p;
  const docView = p.docErr ? (
    <RefusalState authority="Records Division" reference="DIR-0412" reason="The document could not be retrieved from the records server. The request has been recorded." />
  ) : doc ? (
    <DocumentView
      doc={doc}
      markings={canon.markings}
      onNavigate={p.openRoute}
      onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${services.session.operatorId.peek()} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
    />
  ) : (
    <p class="tr-note tr-pad">Retrieving document from the records server.</p>
  );
  return (
    <div class={`tr-split tr-docsplit ${p.compact ? 'is-stacked' : ''}`}>
      <div class="tr-doc">{docView}</div>
      <div class="tr-side tr-live" aria-label="Live indications">
        <div class="tr-caption">Live indications</div>
        <LivePanel {...p} />
      </div>
    </div>
  );
}

/** The board data that belongs beside each document. */
function LivePanel(p: MainProps) {
  const id = p.route?.id ?? 'transit-overview';
  const seg = /^transit-seg-(\d{2})$/.exec(id)?.[1];
  if (seg) return <Detail model={p.model} state={p.state} selected={seg} services={p.services} tt={p.tt} />;
  const net = /^transit-net-([a-z]{3})$/.exec(id)?.[1];
  if (net) return <NetworkLive {...p} network={NET_SLUG[net]!} />;
  if (id.startsWith('transit-incident')) return <LogView state={p.state} services={p.services} onOpen={p.openRoute} />;
  if (id.startsWith('transit-possession')) return <PossessionView state={p.state} services={p.services} onOpen={p.openRoute} />;
  if (id === 'transit-engineering') return <EnvironmentView model={p.model} state={p.state} services={p.services} segment={p.envSeg} onSegment={p.onEnvSeg} />;
  if (id === 'transit-rolling-stock') return <MovementsView model={p.model} state={p.state} narrow />;
  return <TimetableView model={p.model} state={p.state} tt={p.tt} narrow />;
}

function NetworkLive(p: MainProps & { network: NetworkId }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const keys = new Set(p.model.links.filter((l) => l.network === p.network).map((l) => l.key));
  const trains = (p.state?.trains ?? []).filter((t) => keys.has(t.link));
  return (
    <div class="tr-pane">
      <div class="tr-mini" ref={ref}>
        {size.w > 0 && (
          <LineDiagram
            width={size.w}
            height={size.h}
            network={p.network}
            trains={trains.map((t) => ({ id: t.id, kind: t.kind, link: t.link, pos: t.pos, dir: t.dir, label: t.label, suppressed: t.suppressed }))}
            occupancy={p.state?.occupancy ?? {}}
            blockCounts={diagramBlockCounts(p.model)}
            selected={p.selected}
            onSelectLink={p.onSelect}
          />
        )}
      </div>
      <MovementTable model={p.model} trains={trains} narrow />
    </div>
  );
}
