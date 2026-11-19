/**
 * Facility Registry (SPEC §8.1): the hub. Register of the 47 installations with the national
 * map, class pages, and per-facility dossiers with map inset, depth cross-section, reactor
 * instruments and live telemetry from the telemetry worker.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ClassId, FacilityId } from '@core/canon-types';
import type { AppProps, RouteEntry } from '@core/contracts';
import { useServices } from '@core/services';
import {
  MenuBar,
  MessageBox,
  Dialog,
  Select,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarLabel,
  type MenuBarMenu,
  type MenuItem,
  type SortState,
} from '@design/index';
import { OrgChart } from '@graphics/org';
import { DocPane, Refusal, useDoc } from './DocPane';
import { DossierView, dossierTabs, type DossierTab } from './DossierView';
import { NationalMap, useSize } from './MapView';
import { FilterBar, RegisterTable, SelectionSummary } from './RegisterView';
import { CLASS_IDS, buildRows, cell, classFromRoute, classRoute, dossierRoute, facilityFromRoute, filterRows, isOpen, type RowFilter } from './model';
import { HOME_SITE, canon, className, facilityById, fmt, useRxAudit, useViewer } from './shared';
import { seedFor, useTelemetry } from './telemetry';
import './registry.css';
import { T4Home, t4Refused, useCanonT2 } from './acct';

type HomeTab = 'register' | 'map' | 'document' | 'organisation';
type Notice = { title: string; body: string; reference?: string; kind?: 'info' | 'warning' | 'error' };

const INDEX_ROUTE = '/registry';

/** Release key a route's access block requires, or null when the baseline session holds it. */
function accessKey(e: RouteEntry): string | null {
  const a = e.access;
  if (!a) return null;
  if (a.compartment) return a.tier <= 2 ? `${a.compartment}+T${a.tier}` : a.compartment;
  return a.tier <= 2 ? `T${a.tier}` : null;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export default function App(props: AppProps) {
  const services = useServices();
  const entry = props.route ?? services.docs.byRoute(INDEX_ROUTE) ?? null;
  if (t4Refused(services, entry)) return <T4Home win={props.win} services={services} title="Facility Registry" docNo={entry?.docNo ?? 'OSC-FAC-IDX'} />;
  return <RegistryApp {...props} />;
}

function RegistryApp({ win, route }: AppProps) {
  const services = useServices();
  const viewer = useViewer(services);
  const path = route?.route ?? INDEX_ROUTE;
  const entry: RouteEntry | null = route ?? services.docs.byRoute(INDEX_ROUTE) ?? null;
  const facId = facilityFromRoute(path);
  const fac = facId ? facilityById.get(facId) ?? null : null;
  const pageClass = classFromRoute(path);
  const kind: 'dossier' | 'class' | 'index' = fac ? 'dossier' : pageClass ? 'class' : 'index';
  const subject = entry?.docNo ?? 'OSC-FAC-IDX';
  const audit = useRxAudit(services, subject);
  const blocked = entry ? accessKey(entry) : null;
  const refused = !!(entry && blocked && !services.clearance.satisfies(blocked));

  /* ---------------------------------------------------------- state */
  const [filter, setFilter] = useState<RowFilter>({ classes: new Set(CLASS_IDS), text: '', reactorOnly: false });
  const [sort, setSort] = useState<SortState | null>({ key: 'id', dir: 'asc' });
  const [selected, setSelected] = useState<string | null>(HOME_SITE);
  const [homeTab, setHomeTab] = useState<HomeTab>(kind === 'class' ? 'document' : 'register');
  const [dossierTab, setDossierTab] = useState<DossierTab>('dossier');
  const [labels, setLabels] = useState<'alpha' | 'all' | 'none'>('alpha');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [gotoOpen, setGotoOpen] = useState(false);
  const [gotoId, setGotoId] = useState<string>(HOME_SITE);
  const history = useRef<string[]>([]);
  const lastPath = useRef(path);
  const findRef = useRef<HTMLInputElement | null>(null);
  const [rootRef, rootSize] = useSize<HTMLDivElement>();
  const compact = rootSize.w > 0 && rootSize.w < 640;

  // Route changes inside this window: reset per-page state, remember where we were.
  useEffect(() => {
    if (lastPath.current !== path) {
      history.current = [...history.current, lastPath.current].slice(-30);
      lastPath.current = path;
    }
    if (fac) setSelected(fac.id);
    setDossierTab('dossier');
    setHomeTab(kind === 'class' ? 'document' : 'register');
  }, [path]);

  const load = useDoc(services, refused ? null : entry);
  const seed = useMemo(() => (fac && !refused ? seedFor(fac) : null), [fac?.id, refused]);
  const telemetry = useTelemetry(seed);

  /* ----------------------------------------------------- window chrome */
  useEffect(() => {
    if (entry) {
      win.setTitle(entry.title, entry.docNo);
      win.setMarking(entry.marking);
    } else win.setTitle('Facility Registry');
  }, [entry?.id]);

  /* --------------------------------------------------------- the rows */
  const t2 = useCanonT2(services);
  const allRows = useMemo(() => buildRows(canon, viewer, t2), [viewer, t2]);
  const scoped = pageClass ? allRows.filter((r) => r.cls === pageClass) : allRows;
  const rows = filterRows(scoped, pageClass ? { ...filter, classes: new Set([pageClass]) } : filter);
  const allShown = !pageClass && rows.length === allRows.length;
  const selRow = allRows.find((r) => r.id === selected) ?? null;
  const plotted = rows.filter((r) => r.cls !== 'DELTA' && isOpen(cell(r.f, 'position', 1, viewer)) && typeof r.f.lat === 'number').map((r) => r.f);
  const posWithheld = rows.filter((r) => r.cls !== 'DELTA').length - plotted.length;
  const deltaRows = rows.filter((r) => r.cls === 'DELTA').length;

  /* ------------------------------------------------------- navigation */
  const go = (to: string): void => win.navigate(to);
  const openDossier = (id: string): void => {
    if (!facilityById.has(id)) {
      setNotice({ title: 'Open dossier', body: `No installation ${id} is registered.`, reference: 'OSC-FAC-IDX', kind: 'warning' });
      return;
    }
    go(dossierRoute(id));
  };
  const back = (): void => {
    const prev = history.current.pop();
    if (!prev) {
      setNotice({ title: 'Back', body: 'No earlier view is held for this window.', kind: 'info' });
      return;
    }
    lastPath.current = prev;
    go(prev);
  };
  const step = (dir: 1 | -1): void => {
    const order = canon.facilities.map((f) => f.id);
    const cur = fac?.id ?? selected ?? HOME_SITE;
    const i = order.indexOf(cur as FacilityId);
    const next = order[(i + dir + order.length) % order.length]!;
    if (kind === 'dossier') openDossier(next);
    else setSelected(next);
  };
  const needSelection = (what: string): boolean => {
    if (selected) return false;
    setNotice({ title: what, body: 'No installation is selected. Select a row in the register or a marker on the map first.', kind: 'info' });
    return true;
  };
  const printDoc = (): void => {
    if (!entry || load.state !== 'ready') {
      setNotice({ title: 'Print', body: 'The document for this view has not been retrieved; there is nothing to send to the print queue.', reference: 'KB-0019', kind: 'warning' });
      return;
    }
    services.print(entry.id);
  };
  const exportRegister = (): void => {
    setNotice({
      title: 'Export register',
      body: 'Export of the facility register to file or removable media is not permitted from a workstation. Copies of register extracts are issued by Facilities Engineering on request through the Records Division counter.',
      reference: 'OSC-DIR-0319',
      kind: 'error',
    });
  };
  const sexRequest = (): void => services.openRoute('/forms/f-126');
  const openTransit = (): void => {
    const f = fac ?? (selected ? facilityById.get(selected) : undefined);
    if (!f) return void needSelection('Show in Transit Control');
    const net = cell(f, 'network', f.network, viewer);
    if (!isOpen(net) || !net.v) {
      setNotice({ title: 'Show in Transit Control', body: `The network assignment of ${f.id} is not released to this operator. SEXTANT compartment briefing required.`, reference: canon.compartments.find((c) => c.id === 'SEXTANT')?.briefingDocNo ?? 'OSC-DIR-0412', kind: 'error' });
      return;
    }
    const code: Record<string, string> = { EASTERN: 'eas', SOUTHERN: 'sou', MOUNTAIN_WESTERN: 'mtw', CENTRAL: 'cen' };
    services.openRoute(`/transit/network/${code[net.v] ?? 'cen'}`);
  };
  const openReactorPage = (): void => {
    const f = fac ?? (selected ? facilityById.get(selected) : undefined);
    if (!f) return void needSelection('Reactor status page');
    const rx = canon.reactors.find((r) => r.site === f.id);
    if (!rx || !isOpen(cell(f, 'reactor', true, viewer))) {
      setNotice({ title: 'Reactor status page', body: `No reactor installation is registered to ${f.id} in the records released to this operator.`, reference: 'OSC-RSV-IDX', kind: 'info' });
      return;
    }
    services.openRoute(`/reserves/reactor/${rx.id.toLowerCase()}`);
  };

  /* -------------------------------------------------------- keyboard */
  const onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (k === 'o') {
        e.preventDefault();
        setGotoId(selected ?? HOME_SITE);
        setGotoOpen(true);
      } else if (k === 'p') {
        e.preventDefault();
        printDoc();
      } else if (k === 'f' && kind !== 'dossier') {
        e.preventDefault();
        setHomeTab((t) => (t === 'register' || t === 'map' ? t : 'register'));
        setTimeout(() => (findRef.current ?? rootRef.current?.querySelector<HTMLInputElement>('.reg-filters input[type="search"]'))?.focus(), 0);
      }
    } else if (e.key === 'Backspace' && !e.altKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
      e.preventDefault();
      back();
    } else if (e.altKey && !e.ctrlKey) {
      if (e.key === 'PageDown') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        step(-1);
      }
    }
  };

  /* ------------------------------------------------------------ menus */
  const homeTabs: { id: HomeTab; label: string }[] = [
    { id: 'register', label: 'Register' },
    { id: 'map', label: 'Map' },
    { id: 'document', label: 'Document' },
    { id: 'organisation', label: 'Organisation' },
  ];
  const viewItems: MenuItem[] =
    kind === 'dossier' && fac
      ? dossierTabs(fac, viewer).map((t, i) => ({ label: `${i < 9 ? `&${i + 1} ` : ''}${t.label}`, radio: true, checked: dossierTab === t.id, onSelect: () => setDossierTab(t.id as DossierTab) }))
      : homeTabs.map((t, i) => ({ label: `&${i + 1} ${t.label}`, radio: true, checked: homeTab === t.id, onSelect: () => setHomeTab(t.id) }));
  const classToggle = (c: ClassId): MenuItem => ({
    label: `Show class &${c}`,
    checked: filter.classes.has(c),
    onSelect: () => {
      if (pageClass) {
        setNotice({ title: 'Class filter', body: `This page is the ${pageClass} class standard; the register here lists ${pageClass} only. Use the registry index for all classes.`, reference: 'OSC-FAC-IDX', kind: 'info' });
        return;
      }
      const next = new Set(filter.classes);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      setFilter({ ...filter, classes: next });
    },
  });
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Open dossier...', shortcut: 'Ctrl+O', onSelect: () => (setGotoId(selected ?? HOME_SITE), setGotoOpen(true)) },
        { label: 'Open &selected dossier', onSelect: () => !needSelection('Open selected dossier') && openDossier(selected!) },
        { separator: true },
        { label: '&Print document...', shortcut: 'Ctrl+P', onSelect: printDoc },
        { label: '&Export register...', onSelect: exportRegister },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        ...viewItems,
        { separator: true },
        { label: 'Map labels: &ALPHA only', radio: true, checked: labels === 'alpha', onSelect: () => setLabels('alpha') },
        { label: 'Map labels: a&ll sites', radio: true, checked: labels === 'all', onSelect: () => setLabels('all') },
        { label: 'Map labels: &none', radio: true, checked: labels === 'none', onSelect: () => setLabels('none') },
        { separator: true },
        ...CLASS_IDS.map(classToggle),
        { label: '&Reactor sites only', checked: filter.reactorOnly, onSelect: () => setFilter({ ...filter, reactorOnly: !filter.reactorOnly }) },
        { label: '&Clear filter', onSelect: () => setFilter({ classes: new Set(CLASS_IDS), text: '', reactorOnly: false }) },
      ],
    },
    {
      label: '&Go',
      items: [
        { label: '&Back', shortcut: 'Backspace', onSelect: back },
        { label: 'Registry &index', onSelect: () => go(INDEX_ROUTE) },
        { separator: true },
        ...CLASS_IDS.map((c): MenuItem => ({ label: `Class &${c}: ${className(c)}`, checked: pageClass === c, radio: true, onSelect: () => go(classRoute(c)) })),
        { separator: true },
        { label: `&Own site (${HOME_SITE})`, onSelect: () => openDossier(HOME_SITE) },
        { label: '&Next installation', shortcut: 'Alt+PgDn', onSelect: () => step(1) },
        { label: '&Previous installation', shortcut: 'Alt+PgUp', onSelect: () => step(-1) },
      ],
    },
    {
      label: 'F&acility',
      items: [
        { label: 'Show in &Transit Control', onSelect: openTransit },
        { label: '&Reactor status page (Reserves)', onSelect: openReactorPage },
        { label: '&Personnel directory', onSelect: () => services.openRoute('/personnel/directory') },
        { label: '&Organisation chart (Personnel)', onSelect: () => services.openRoute('/personnel/org') },
        { separator: true },
        { label: 'Request &compartment access (OSC-F-126)...', onSelect: sexRequest },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Getting started (KB-0001)', onSelect: () => services.openRoute('/system/kb/kb-0001') },
        { label: '&Redaction marks (KB-0012)', onSelect: () => services.openRoute('/system/kb/kb-0012') },
        { label: 'G&lossary', onSelect: () => services.openRoute('/system/glossary') },
        { separator: true },
        {
          label: '&About Facility Registry',
          onSelect: () =>
            setNotice({
              title: 'About Facility Registry',
              body: `Facility Registry, ${canon.meta.environment} release ${canon.meta.release}. Register data: ${canon.meta.sourceDocNo} revision ${canon.meta.sourceRevision}, maintained by ${canon.divisions.find((d) => d.id === 'FE')?.name ?? 'Facilities Engineering'}. Telemetry from site data concentrators at 2-second scan.`,
              kind: 'info',
            }),
        },
      ],
    },
  ];

  /* ------------------------------------------------------------ status */
  const statusText =
    refused
      ? `${entry?.docNo ?? ''} refused`
      : kind === 'dossier' && fac
        ? `${fac.id} ${className(fac.class)}. ${entry?.docNo ?? ''} rev ${entry?.revision ?? ''}.`
        : homeTab === 'map'
          ? `Plotted ${plotted.length} of ${rows.length - deltaRows}${posWithheld > 0 ? `. ${posWithheld} positions withheld (SEXTANT)` : ''}${deltaRows ? '. DELTA not plotted' : ''}.`
          : `${rows.length} of ${scoped.length} installations shown.`;
  const teleText =
    kind !== 'dossier' || !seed
      ? 'Telemetry idle'
      : telemetry.link === 'LIVE' && telemetry.at
        ? `${compact ? 'Live' : 'Telemetry live'} ${pad2(new Date(telemetry.at).getUTCHours())}${pad2(new Date(telemetry.at).getUTCMinutes())}:${pad2(new Date(telemetry.at).getUTCSeconds())}Z`
        : telemetry.link === 'NO SIMULATOR'
          ? 'Telemetry not available'
          : 'Telemetry connecting';
  const clearanceText = `Tier ${services.session.tier.value}${services.session.compartments.value.length ? ` + ${services.session.compartments.value.join(', ')}` : ''}`;

  /* -------------------------------------------------------------- body */
  let body;
  if (refused && entry) {
    body = <Refusal services={services} entry={entry} />;
  } else if (kind === 'dossier' && fac && entry) {
    body = (
      <DossierView
        services={services}
        f={fac}
        entry={entry}
        load={load}
        viewer={viewer}
        audit={audit}
        tab={dossierTab}
        onTab={setDossierTab}
        telemetry={telemetry}
        onOpenFacility={openDossier}
        narrow={false}
      />
    );
  } else {
    const filterBar = <FilterBar filter={filter} onFilter={setFilter} fixedClass={pageClass} count={rows.length} filterRef={findRef} />;
    const summary = <SelectionSummary row={selRow} onOpen={openDossier} audit={audit} />;
    let panel;
    if (homeTab === 'map') {
      panel = (
        <div class="reg-col">
          {filterBar}
          <NationalMap
            plotted={plotted}
            selected={(selected as FacilityId) ?? null}
            onSelect={(id) => setSelected(id)}
            labels={labels}
            side={summary}
            note={
              <>
                Plotted {plotted.length} of {rows.length - deltaRows} listed installations.
                {posWithheld > 0 ? ` Positions of ${posWithheld} are withheld under SEXTANT (${canon.compartments.find((c) => c.id === 'SEXTANT')?.briefingDocNo}).` : ''}
                {deltaRows ? ` DELTA locations are not plotted.` : ''}
              </>
            }
          />
        </div>
      );
    } else if (homeTab === 'document') {
      panel = (
        <div class="reg-scroll">
          <DocPane services={services} load={load} entry={entry} />
        </div>
      );
    } else if (homeTab === 'organisation') {
      panel = (
        <div class="reg-org">
          <OrgChart
            root="COUNCIL"
            sessionTier={services.session.tier.value}
            onSelectUnit={(u) => {
              if (facilityById.has(u)) openDossier(u);
              else if ((CLASS_IDS as readonly string[]).includes(u)) go(classRoute(u as ClassId));
            }}
            onSelectPerson={() => services.openRoute('/personnel/directory')}
          />
        </div>
      );
    } else {
      panel = (
        <div class="reg-col">
          {filterBar}
          <div class="reg-tablewrap">
            <RegisterTable rows={rows} selected={selected} onSelect={setSelected} onOpen={openDossier} sort={sort} onSort={setSort} audit={audit} allShown={allShown} />
          </div>
          {summary}
        </div>
      );
    }
    body = (
      <Tabs tabs={homeTabs} active={homeTab} onChange={(id) => setHomeTab(id as HomeTab)} label={entry?.title ?? 'Facility Registry'} panel="flush">
        <div class="reg-tabbody">{panel}</div>
      </Tabs>
    );
  }

  return (
    <div class="reg-app" ref={rootRef} onKeyDown={onKeyDown}>
      <MenuBar menus={menus} label="Facility Registry menu" />
      <Toolbar label="Registry toolbar">
        <ToolbarButton label="Back" onClick={back} title="Previous view in this window (Backspace)" />
        <ToolbarButton label="Index" pressed={kind === 'index'} onClick={() => go(INDEX_ROUTE)} title="Registry index" />
        <ToolbarSeparator />
        {CLASS_IDS.map((c) => (
          <ToolbarButton key={c} label={c} pressed={pageClass === c || fac?.class === c} onClick={() => go(classRoute(c))} title={`Class standard: ${className(c)}`} />
        ))}
        <ToolbarSeparator />
        <ToolbarButton label="Open..." onClick={() => (setGotoId(selected ?? HOME_SITE), setGotoOpen(true))} title="Open a dossier by designation (Ctrl+O)" />
        <ToolbarButton label="Own site" onClick={() => openDossier(HOME_SITE)} title={`Dossier ${HOME_SITE}`} />
        <ToolbarButton label="Print" onClick={printDoc} title="Print this document (Ctrl+P)" />
        <ToolbarSpacer />
        <ToolbarLabel>{kind === 'dossier' && fac ? fac.id : pageClass ? `Class ${pageClass}` : 'All classes'}</ToolbarLabel>
      </Toolbar>
      <div class="reg-body">{body}</div>
      <StatusBar
        panes={
          compact
            ? [
                { id: 'msg', content: statusText, fill: true },
                { id: 'tele', content: teleText, width: 150, mono: true },
              ]
            : [
                { id: 'msg', content: statusText, fill: true },
                { id: 'sel', content: selected ? `Selected ${selected}` : 'No selection', width: 120, mono: true },
                { id: 'tele', content: teleText, width: 190, mono: true },
                { id: 'clr', content: clearanceText, width: 170 },
                { id: 'tot', content: `${fmt(canon.headline.facilities)} registered`, width: 100 },
              ]
        }
      />
      <Dialog
        open={gotoOpen}
        title="Open dossier"
        kind="question"
        buttons={[
          { label: '&Open', value: 'open', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => {
          setGotoOpen(false);
          if (v === 'open') openDossier(gotoId);
        }}
      >
        <Select
          label="Installation"
          value={gotoId}
          onChange={setGotoId}
          options={canon.facilities.map((f) => ({ value: f.id, label: `${f.id}${f.class !== 'DELTA' && f.codename ? `  ${f.codename}` : ''}` }))}
        />
      </Dialog>
      <MessageBox
        open={!!notice}
        title={notice?.title ?? ''}
        kind={notice?.kind ?? 'info'}
        reference={notice?.reference ? `Ref ${notice.reference}` : undefined}
        onClose={() => setNotice(null)}
        onOpen={(k) => k === 'error' && services.sound.play('error')}
      >
        {notice?.body ?? ''}
      </MessageBox>
    </div>
  );
}
