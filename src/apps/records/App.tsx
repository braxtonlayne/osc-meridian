/**
 * Records Library (app id `records`). Library index with folder tree, full-text search with facets,
 * snippets and saved queries, a document viewer with a properties panel, and print.
 * Audit: doc.read (here), window.open on refusals (here), search and print (logged by the
 * shell inside services.search / services.print, so they are not logged twice).
 */
import './records.css';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { AppProps, DocJson, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { WORKSTATION_ID } from '@core/audit';
import { load as loadStore, save as saveStore } from '@core/persist';
import {
  Button,
  Dialog,
  MenuBar,
  ProgressBar,
  StatusBar,
  TextField,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  formatOscDate,
  type DialogKind,
  type MenuItem,
  type RedactionHoverInfo,
} from '@design/index';
import { ErrorState, RefusalState } from '@graphics/states';
import {
  accessKeyOf,
  accessWords,
  highestMarking,
  htmlToSegs,
  normaliseSaved,
  resolveDocNo,
  seriesOf,
  type FacetSelection,
  type SavedQuery,
  type Seg,
} from './lib';
import { LibraryView, useFolders } from './LibraryView';
import { EMPTY_SEARCH, PAGE_SIZE, SearchView, filteredHits, type Hit, type SearchState } from './SearchView';
import { DocView, withheldCount } from './DocView';
import { ticketTerms, withOwnAccess } from '../shared/access-log';
import { APP_NAME, MATCHERS, canon, markingLabel, markingRank } from './shared';

const HOME = '/records';
const SAVED_KEY = 'records.savedQueries';
const LOWEST: MarkingId = ([...canon.markings].sort((a, b) => a.rank - b.rank)[0]?.id ?? 'TSSCI-OSC') as MarkingId;
const TOP: MarkingId | undefined = [...canon.markings].sort((a, b) => b.rank - a.rank)[0]?.id as MarkingId | undefined;

type View = 'library' | 'search';
type DocState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; doc: DocJson } | { status: 'failed' };
type DialogState =
  | null
  | { kind: 'open'; value: string; error: string | null }
  | { kind: 'save'; value: string; error: string | null }
  | { kind: 'manage' }
  | { kind: 'about' }
  | {
      kind: 'notice';
      title: string;
      body: string;
      reference?: string;
      level: DialogKind;
    };

const segCache = new Map<string, Promise<Seg[]>>();

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  // Session (signal reads subscribe this component).
  const tier = services.session.tier.value;
  const comps = services.session.compartments.value;
  const acting = services.session.actingTier2.value;
  const clearanceSig = `${tier}|${comps.join(',')}|${acting ? 'A' : ''}`;
  const auditEntries = services.audit.entries.value;
  const satisfies = (k: string) => services.clearance.satisfies(k);

  // Undelivered messages are not in this operator's holdings (services.mail.isHeld).
  const delivered = services.mail.delivered.value;
  const heldByDocNo = (d: string): RouteEntry | undefined => {
    const r = services.docs.byDocNo(d);
    return r && services.mail.isHeld(r.route) ? r : undefined;
  };
  const routes = useMemo(() => services.docs.all().filter((r) => services.mail.isHeld(r.route)), [delivered]);
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: RouteEntry[] = [];
    for (let i = auditEntries.length - 1; i >= 0 && out.length < 25; i--) {
      const e = auditEntries[i]!;
      if (e.kind !== 'doc.read' || seen.has(e.subject)) continue;
      seen.add(e.subject);
      const r = services.docs.byDocNo(e.subject);
      if (r) out.push(r);
    }
    return out;
  }, [auditEntries]);

  const [view, setView] = useState<View>('library');
  const [folderId, setFolderId] = useState('held');
  const [selected, setSelected] = useState<string | null>(null);
  const [showFolders, setShowFolders] = useState(true);
  const [showProps, setShowProps] = useState(true);
  const [docTab, setDocTab] = useState<'doc' | 'props'>('doc');
  const [search, setSearchState] = useState<SearchState>(EMPTY_SEARCH);
  const [saved, setSaved] = useState<SavedQuery[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [docState, setDocState] = useState<DocState>({ status: 'idle' });
  const [flash, setFlash] = useState<string | null>(null);
  const [width, setWidth] = useState(1000);
  const [reload, setReload] = useState(0);
  const narrow = width < 860;

  const setSearch = (fn: (s: SearchState) => SearchState) => setSearchState((s) => fn(s));
  const say = (text: string) => setFlash(text);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  /* ---------------------------------------------------------- layout */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* --------------------------------------------------- saved queries */
  useEffect(() => {
    let live = true;
    void loadStore<unknown>(SAVED_KEY, []).then((v) => live && setSaved(normaliseSaved(v)));
    return () => {
      live = false;
    };
  }, []);
  const storeSaved = (list: SavedQuery[]) => {
    setSaved(list);
    saveStore(SAVED_KEY, list);
  };

  /* --------------------------------------------------------- history */
  const hist = useRef<{ stack: string[]; idx: number; moving: boolean }>({
    stack: [],
    idx: -1,
    moving: false,
  });
  const path = route?.route ?? HOME;
  useEffect(() => {
    const h = hist.current;
    if (h.moving) {
      h.moving = false;
      return;
    }
    if (h.stack[h.idx] === path) return;
    h.stack = [...h.stack.slice(0, h.idx + 1), path].slice(-50);
    h.idx = h.stack.length - 1;
  }, [path]);
  const canBack = hist.current.idx > 0;
  const canFwd = hist.current.idx < hist.current.stack.length - 1;
  const go = (delta: number) => {
    const h = hist.current;
    const next = h.idx + delta;
    if (next < 0 || next >= h.stack.length) {
      say(delta < 0 ? "No earlier entry in this window's history." : "No later entry in this window's history.");
      return;
    }
    h.idx = next;
    h.moving = true;
    win.navigate(h.stack[next]!);
  };

  /* ---------------------------------------------- route: doc / refusal */
  const routeKey = route ? accessKeyOf(route.access) : null;
  const refused = !!route && !!routeKey && !satisfies(routeKey);
  const lastRead = useRef<string | null>(null);
  const lastRefused = useRef<string | null>(null);

  useEffect(() => {
    if (!route) {
      setDocState({ status: 'idle' });
      lastRead.current = null;
      lastRefused.current = null;
      return;
    }
    if (refused) {
      setDocState({ status: 'idle' });
      if (lastRefused.current !== route.route) {
        lastRefused.current = route.route;
        services.audit.log(
          'window.open',
          route.docNo,
          `Operator ${services.session.operatorId.peek()} requested ${route.docNo} (${markingLabel(route.marking)}) in ${APP_NAME}. Request refused: ${accessWords(route.access)} required.`,
        );
      }
      return;
    }
    lastRefused.current = null;
    let live = true;
    win.setBusy(true);
    setDocState((s) => (s.status === 'ready' && s.doc.id === route.id ? s : { status: 'loading' }));
    services.docs
      .load(route.id)
      .then((doc) => {
        if (!live) return;
        setDocState({ status: 'ready', doc });
        if (lastRead.current !== route.route) {
          lastRead.current = route.route;
          services.audit.log(
            'doc.read',
            doc.docNo,
            `Operator ${services.session.operatorId.peek()} displayed ${doc.docNo} (${markingLabel(doc.marking)}) in ${APP_NAME}. Display recorded against the operator's access determination.`,
          );
        }
      })
      .catch(() => {
        if (live) setDocState({ status: 'failed' });
      })
      .finally(() => win.setBusy(false));
    return () => {
      live = false;
    };
  }, [route?.id, refused, clearanceSig, reload]);

  /* ----------------------------------------------------- what's shown */
  const { resolve } = useFolders(routes, recent);
  const folder = resolve(folderId);
  const visibleHits = filteredHits(search);
  const pageHits = visibleHits.slice((Math.max(1, search.page) - 1) * PAGE_SIZE, Math.max(1, search.page) * PAGE_SIZE);
  const doc = docState.status === 'ready' ? docState.doc : null;
  // An incident ticket's access log carries this workstation's own recorded access, as in Assurance.
  const shownDoc = useMemo(() => {
    if (!doc) return null;
    const terms = ticketTerms(doc, doc, services.docs.byDocNo, TOP);
    const operator = `${services.session.operatorId.value} (${canon.operator.pn})`;
    return withOwnAccess(doc, { entries: auditEntries, terms, workstation: WORKSTATION_ID, operator });
  }, [doc, auditEntries]);

  const screenMarking: MarkingId = route
    ? route.marking
    : view === 'library'
      ? highestMarking(
          folder.items.map((r) => r.marking),
          markingRank,
          LOWEST,
        )
      : highestMarking(
          pageHits.map((h) => h.route.marking),
          markingRank,
          LOWEST,
        );

  const statusText = (() => {
    if (flash) return flash;
    if (route) {
      if (refused) return `${route.docNo}: display refused. ${accessWords(route.access)} required.`;
      if (docState.status === 'loading') return `Retrieving ${route.docNo}...`;
      if (docState.status === 'failed') return `${route.docNo} could not be retrieved.`;
      if (doc) return `${doc.docNo} Rev ${doc.revision}, ${formatOscDate(doc.date)}. ${withheldCount(doc)} passage(s) withheld.`;
      return route.docNo;
    }
    if (view === 'search') {
      if (search.running) return `Querying the index for "${search.q}"...`;
      if (search.hits) return `${visibleHits.length} document(s) for "${search.q}".`;
      return 'Ready. Enter a query.';
    }
    return `${folder.label}: ${folder.items.length} document(s).`;
  })();

  useEffect(() => {
    if (route) win.setTitle(route.title, route.docNo);
    else win.setTitle(view === 'search' ? 'Search' : APP_NAME, '');
  }, [route?.route, view]);
  useEffect(() => win.setMarking(screenMarking), [screenMarking]);
  useEffect(() => win.setStatus(route ? route.docNo : view === 'search' ? 'Search' : 'Library'), [route?.docNo, view]);
  // Keep keyboard focus inside the window when the view under it is replaced.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const t = setTimeout(() => {
      const a = document.activeElement;
      if (!a || a === document.body || !a.isConnected) root.focus({ preventScroll: true });
    }, 0);
    return () => clearTimeout(t);
  }, [route?.route, view, docState.status]);

  /* --------------------------------------------------------- actions */
  const notice = (title: string, body: string, reference?: string, level: DialogKind = 'info') => setDialog({ kind: 'notice', title, body, reference, level });

  const openEntry = (r: RouteEntry) => {
    if (r.app === 'records') win.navigate(r.route);
    else services.openRoute(r.route);
  };
  const goHome = (v?: View) => {
    if (v) setView(v);
    if (route) win.navigate(HOME);
  };
  const focusSearch = () => {
    goHome('search');
    setTimeout(() => searchInputRef.current?.querySelector('input')?.focus(), 30);
  };

  const run = (q: string, facets?: FacetSelection) => {
    const query = q;
    if (!query.trim()) {
      setView('search');
      say('Enter a document number, reference or words to search for.');
      return;
    }
    goHome('search');
    setSearch((s) => ({
      ...s,
      input: query,
      q: query,
      running: true,
      failed: false,
      page: 1,
      facets: facets ?? s.facets,
    }));
    services
      .search(query)
      .then((res) => {
        let hits: Hit[] = res.map((h) => ({
          route: h.route,
          score: h.score,
          snippet: h.snippet,
        }));
        const exact = resolveDocNo(query, heldByDocNo);
        if (exact && !hits.some((h) => h.route.route === exact.route)) {
          const k = accessKeyOf(exact.access);
          if (!k || satisfies(k))
            hits = [
              {
                route: exact,
                score: Number.MAX_SAFE_INTEGER,
                snippet: exact.summary,
              },
              ...hits,
            ];
        }
        setSearch((s) => (s.q === query ? { ...s, hits, running: false } : s));
      })
      .catch(() => setSearch((s) => (s.q === query ? { ...s, hits: null, running: false, failed: true } : s)));
  };

  const loadSegs = (r: RouteEntry): Promise<Seg[]> => {
    const key = `${r.id}|${clearanceSig}`;
    let p = segCache.get(key);
    if (!p) {
      p = services.docs.load(r.id).then((d) => htmlToSegs(d.html));
      p.catch(() => segCache.delete(key));
      segCache.set(key, p);
    }
    return p;
  };

  const hover = (docNo: string, info: RedactionHoverInfo) =>
    services.audit.log(
      'redaction.hover',
      docNo,
      `Operator ${services.session.operatorId.peek()} examined withheld material in ${docNo} (${info.auth} ${info.ref}). No release was made.`,
    );

  const current: RouteEntry | null = route ?? (view === 'library' && selected ? (routes.find((r) => r.route === selected) ?? null) : null);

  const print = () => {
    const r = current;
    if (!r) {
      notice('Print', 'No document is selected. Select a document in the list, or open one, before printing.', 'KB-0019');
      return;
    }
    const k = accessKeyOf(r.access);
    if (k && !satisfies(k)) {
      notice(
        'Print refused',
        `${r.docNo} cannot be printed at this workstation. ${accessWords(r.access)} is required to display or reproduce it.`,
        'DIR-0412',
        'warning',
      );
      return;
    }
    services.print(r.id);
    say(`${r.docNo} sent to the print queue with cover sheet.`);
  };

  const exportDoc = () =>
    notice(
      'Export not permitted',
      'Records may not be written to file or removable media from a MERIDIAN workstation. A controlled reproduction may be requested on the document reproduction request form.',
      'DIR-0319',
      'warning',
    );

  const copy = (text: string, what: string) => {
    const done = () => say(`${what} copied to the clipboard.`);
    if (navigator.clipboard?.writeText)
      navigator.clipboard
        .writeText(text)
        .then(done, () => notice('Copy', `${what} could not be placed on the clipboard. Clipboard access is restricted on this workstation.`, 'KB-0001'));
    else notice('Copy', `${what} could not be placed on the clipboard. Clipboard access is restricted on this workstation.`, 'KB-0001');
  };
  const copyNo = () => (current ? copy(current.docNo, `Document number ${current.docNo}`) : notice('Copy', 'No document is selected.', undefined));
  const copyCitation = () =>
    current
      ? copy(
          `${current.docNo}, ${current.title}, Rev ${current.revision}, ${formatOscDate(current.date)} (${current.originator}), ${markingLabel(current.marking)}`,
          'Citation',
        )
      : notice('Copy', 'No document is selected.', undefined);

  const toggleProps = () => {
    if (!route) {
      notice('Properties', 'Properties are shown below the list for the selected document. Open a document to see its full properties panel.');
      return;
    }
    if (narrow) setDocTab((t) => (t === 'props' ? 'doc' : 'props'));
    else setShowProps((v) => !v);
  };

  const refresh = () => {
    if (route) {
      setReload((n) => n + 1);
      say(`${route.docNo} retrieved again from the library server.`);
    } else if (view === 'search' && search.q) run(search.q);
    else say('Library index is current.');
  };

  const openSaveDialog = () => {
    if (!search.q.trim() || search.hits === null) {
      notice('Save query', 'Run a search first. The query and its filters are saved together.', undefined);
      return;
    }
    setDialog({
      kind: 'save',
      value: search.q.trim().slice(0, 60),
      error: null,
    });
  };

  const helpItem = (docNo: string): MenuItem => {
    const r = services.docs.byDocNo(docNo);
    return {
      label: r ? `${docNo}  ${r.title}` : docNo,
      onSelect: () => (r ? services.openRoute(r.route) : notice('Help', `Knowledge base article ${docNo} is not held on this workstation.`, docNo)),
    };
  };

  /* ----------------------------------------------------------- menus */
  const recentItems: MenuItem[] = recent.slice(0, 6).map((r, i) => ({
    label: `&${i + 1} ${r.docNo}`,
    onSelect: () => openEntry(r),
  }));
  const savedItems: MenuItem[] = saved.slice(0, 8).map((q) => ({
    label: q.name.replace(/&/g, '&&'),
    onSelect: () => run(q.query, q.facets),
  }));
  const menus = [
    {
      label: '&File',
      items: [
        {
          label: '&Open by Number...',
          shortcut: 'Ctrl+O',
          onSelect: () => setDialog({ kind: 'open', value: '', error: null }),
        },
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: print },
        { label: '&Export...', onSelect: exportDoc },
        { separator: true as const },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        {
          label: '&Copy Document Number',
          shortcut: 'Ctrl+Shift+C',
          onSelect: copyNo,
        },
        { label: 'Copy C&itation', onSelect: copyCitation },
        { separator: true as const },
        {
          label: '&Find in Library...',
          shortcut: 'Ctrl+F',
          onSelect: focusSearch,
        },
      ],
    },
    {
      label: '&View',
      items: [
        {
          label: '&Library',
          radio: true,
          checked: !route && view === 'library',
          onSelect: () => goHome('library'),
        },
        {
          label: '&Search',
          radio: true,
          checked: !route && view === 'search',
          onSelect: () => goHome('search'),
        },
        { separator: true as const },
        {
          label: '&Folder Pane',
          checked: showFolders,
          onSelect: () => setShowFolders((v) => !v),
        },
        {
          label: '&Properties Pane',
          shortcut: 'Alt+Enter',
          checked: narrow ? docTab === 'props' : showProps,
          onSelect: toggleProps,
        },
        { separator: true as const },
        { label: '&Refresh', shortcut: 'F5', onSelect: refresh },
      ],
    },
    {
      label: '&Go',
      items: [
        { label: '&Back', shortcut: 'Alt+Left', onSelect: () => go(-1) },
        { label: '&Forward', shortcut: 'Alt+Right', onSelect: () => go(1) },
        {
          label: 'Library &Home',
          shortcut: 'Alt+Home',
          onSelect: () => goHome('library'),
        },
        { separator: true as const },
        {
          label: 'Recently &Displayed...',
          onSelect: () => {
            setFolderId('recent');
            goHome('library');
          },
        },
        ...recentItems,
      ],
    },
    {
      label: '&Search',
      items: [
        {
          label: '&New Search',
          shortcut: 'Ctrl+Shift+F',
          onSelect: () => {
            setSearch(() => EMPTY_SEARCH);
            focusSearch();
          },
        },
        {
          label: '&Run Again',
          onSelect: () => (search.q ? run(search.q) : notice('Run again', 'No query has been run in this window.')),
        },
        {
          label: '&Save Query...',
          shortcut: 'Ctrl+S',
          onSelect: openSaveDialog,
        },
        {
          label: '&Manage Saved Queries...',
          onSelect: () => setDialog({ kind: 'manage' }),
        },
        {
          label: '&Clear Filters',
          onSelect: () => setSearch((s) => ({ ...s, facets: {}, page: 1 })),
        },
        ...(savedItems.length ? [{ separator: true as const }, ...savedItems] : []),
      ],
    },
    {
      label: '&Help',
      items: [
        helpItem('KB-0001'),
        helpItem('KB-0012'),
        helpItem('KB-0019'),
        { separator: true as const },
        {
          label: '&About Records Library',
          onSelect: () => setDialog({ kind: 'about' }),
        },
      ],
    },
  ];

  /* -------------------------------------------------------- keyboard */
  const onKeyDown = (e: KeyboardEvent) => {
    if (dialog) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    let handled = true;
    if (ctrl && !e.shiftKey && (k === 'o' || k === 'O')) setDialog({ kind: 'open', value: '', error: null });
    else if (ctrl && !e.shiftKey && (k === 'p' || k === 'P')) print();
    else if (ctrl && !e.shiftKey && (k === 'f' || k === 'F')) focusSearch();
    else if (ctrl && e.shiftKey && (k === 'f' || k === 'F')) {
      setSearch(() => EMPTY_SEARCH);
      focusSearch();
    } else if (ctrl && !e.shiftKey && (k === 's' || k === 'S')) openSaveDialog();
    else if (ctrl && e.shiftKey && (k === 'c' || k === 'C')) copyNo();
    else if (e.altKey && k === 'ArrowLeft') go(-1);
    else if (e.altKey && k === 'ArrowRight') go(1);
    else if (e.altKey && k === 'Home') goHome('library');
    else if (e.altKey && k === 'Enter') toggleProps();
    else if (k === 'F5') refresh();
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /* ------------------------------------------------------------ body */
  let body;
  if (route) {
    if (refused) {
      const comp = route.access?.compartment;
      const briefing = comp ? canon.compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
      body = (
        <div class="rec__scroll">
          <RefusalState
            reference={briefing ?? 'DIR-0412'}
            authority="Classification Control, Office of Internal Assurance"
            reason={`Display of ${route.docNo} to this operator is not authorised. Access is determined under DIR-0412.`}
            requirement={accessWords(route.access) + (comp ? ' compartment briefing' : ' access determination')}
            docNo={route.docNo}
          />
        </div>
      );
    } else if (docState.status === 'failed') {
      body = (
        <div class="rec__scroll">
          <ErrorState
            code="RD-VIEW-0412"
            title={`${route.docNo} could not be retrieved`}
            body="The library server did not return the controlled copy. Choose Refresh to try again. If the condition persists, report it to the Help Desk quoting the code."
          />
        </div>
      );
    } else if (!doc || doc.id !== route.id) {
      body = (
        <div class="rec-note">
          <ProgressBar label={`Retrieving ${route.docNo}`} showValue={false} />
        </div>
      );
    } else {
      body = (
        <DocView
          doc={shownDoc ?? doc}
          showProps={showProps}
          narrow={narrow}
          width={width}
          onNavigate={(r) => services.openRoute(r)}
          onRedactionHover={(info) => hover(doc.docNo, info)}
          byDocNo={services.docs.byDocNo}
          tab={docTab}
          onTab={setDocTab}
        />
      );
    }
  } else if (view === 'search') {
    body = (
      <SearchView
        state={search}
        setState={setSearch}
        run={run}
        saved={saved}
        onSave={openSaveDialog}
        onOpen={openEntry}
        loadSegs={loadSegs}
        onRedactionHover={hover}
        narrow={narrow}
        inputRef={searchInputRef}
      />
    );
  } else {
    body = (
      <LibraryView
        routes={routes}
        recent={recent}
        folderId={folderId}
        onFolder={(id) => {
          setFolderId(id);
          setSelected(null);
        }}
        selected={selected}
        onSelect={setSelected}
        onOpen={openEntry}
        showFolders={showFolders}
        narrow={narrow}
        satisfies={satisfies}
      />
    );
  }

  const where = route ? route.docNo : view === 'search' ? 'Search' : 'Library';
  const series = route ? seriesOf(route.docNo, MATCHERS) : null;

  return (
    <div class="rec" ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown as unknown as (e: Event) => void}>
      <MenuBar menus={menus} label="Records Library menu" />
      <Toolbar label="Records Library toolbar">
        <ToolbarButton label="Back" onClick={() => go(-1)} disabled={!canBack} title="Back (Alt+Left)" />
        <ToolbarButton label="Forward" onClick={() => go(1)} disabled={!canFwd} title="Forward (Alt+Right)" />
        <ToolbarSeparator />
        <ToolbarButton label="Library" pressed={!route && view === 'library'} onClick={() => goHome('library')} />
        <ToolbarButton label="Search" pressed={!route && view === 'search'} onClick={focusSearch} />
        <ToolbarSeparator />
        <ToolbarButton label="Open No." onClick={() => setDialog({ kind: 'open', value: '', error: null })} title="Open by document number (Ctrl+O)" />
        {!narrow ? <ToolbarButton label="Properties" pressed={!!route && showProps} onClick={toggleProps} title="Properties pane (Alt+Enter)" /> : null}
        <ToolbarButton label="Print" onClick={print} title="Print with cover sheet (Ctrl+P)" />
        <ToolbarSpacer />
      </Toolbar>
      <div class="rec__main">{body}</div>
      <StatusBar
        panes={[
          { id: 'msg', content: statusText, fill: true, label: 'Status' },
          {
            id: 'where',
            content: series ? `${where} (${series})` : where,
            label: 'Location',
            mono: !!route,
          },
          {
            id: 'clr',
            content: `Tier ${tier}${acting ? ' (acting)' : ''}${comps.length ? ` + ${comps.join(' ')}` : ''}`,
            label: 'Access held',
          },
          {
            id: 'mk',
            content: markingLabel(screenMarking),
            label: 'Highest marking displayed',
          },
        ]}
      />
      <Dialogs
        dialog={dialog}
        setDialog={setDialog}
        saved={saved}
        onOpenNumber={(value) => {
          const r = resolveDocNo(value, heldByDocNo);
          if (!r && resolveDocNo(value, services.docs.byDocNo)) {
            setDialog({ kind: 'open', value, error: 'No such message held.' });
            return;
          }
          if (!r) {
            const v = value.trim().toUpperCase();
            const s = seriesOf(v, MATCHERS);
            const why = !v
              ? 'Enter a document number, for example OSC-DIR-0412.'
              : s === 'Records accession'
                ? `${v} is an accession number, not a document number. Search the index for documents that cite it.`
                : `No document numbered ${v} is held in this library.`;
            setDialog({ kind: 'open', value, error: why });
            return;
          }
          setDialog(null);
          openEntry(r);
        }}
        onSave={(name) => {
          const n = name.trim();
          if (!n) {
            setDialog({
              kind: 'save',
              value: name,
              error: 'Block 1. A name is required.',
            });
            return;
          }
          const existing = saved.find((q) => q.name.toLowerCase() === n.toLowerCase());
          const entry: SavedQuery = {
            id: existing?.id ?? `q${Date.now().toString(36)}`,
            name: n,
            query: search.q,
            facets: search.facets,
            savedAt: new Date().toISOString(),
          };
          storeSaved(existing ? saved.map((q) => (q.id === existing.id ? entry : q)) : [...saved, entry]);
          setDialog(null);
          say(`Query "${n}" saved${existing ? ' (replaced the earlier query of that name)' : ''}.`);
        }}
        onDelete={(id) => storeSaved(saved.filter((q) => q.id !== id))}
        onRun={(q) => {
          setDialog(null);
          run(q.query, q.facets);
        }}
        onSound={() => services.sound.play('error')}
      />
    </div>
  );
}

function Dialogs(p: {
  dialog: DialogState;
  setDialog: (d: DialogState) => void;
  saved: SavedQuery[];
  onOpenNumber: (v: string) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onRun: (q: SavedQuery) => void;
  onSound: () => void;
}) {
  const d = p.dialog;
  if (!d) return null;
  const close = () => p.setDialog(null);
  if (d.kind === 'open') {
    return (
      <Dialog
        open
        title="Open by Number"
        kind="question"
        buttons={[
          { label: '&Open', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'ok' ? p.onOpenNumber(d.value) : close())}
      >
        <FocusFirst>
          <TextField
            label="Document No"
            value={d.value}
            onInput={(v) => p.setDialog({ ...d, value: v, error: null })}
            mono
            upper
            error={d.error}
            hint="For example OSC-DIR-0412 or MEM-08-0187."
          />
        </FocusFirst>
      </Dialog>
    );
  }
  if (d.kind === 'save') {
    return (
      <Dialog
        open
        title="Save Query"
        kind="question"
        buttons={[
          { label: '&Save', value: 'ok', isDefault: true },
          { label: 'Cancel', value: 'cancel', isCancel: true },
        ]}
        onClose={(v) => (v === 'ok' ? p.onSave(d.value) : close())}
      >
        <FocusFirst>
          <TextField
            label="Name"
            block="1"
            value={d.value}
            onInput={(v) => p.setDialog({ ...d, value: v, error: null })}
            maxLength={60}
            error={d.error}
            hint="Saved queries are kept for this operator at this workstation."
          />
        </FocusFirst>
      </Dialog>
    );
  }
  if (d.kind === 'manage') {
    return (
      <Dialog open title="Saved Queries" buttons={[{ label: '&Close', value: 'ok', isDefault: true, isCancel: true }]} onClose={close}>
        {p.saved.length ? (
          <ul class="rec-dlg-list">
            {p.saved.map((q) => (
              <li key={q.id}>
                <span>
                  {q.name} <span class="rec-saved__q">{q.query}</span>
                </span>
                <Button size="small" label="Run" onClick={() => p.onRun(q)} />
                <Button size="small" label="Delete" onClick={() => p.onDelete(q.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <div>No queries are saved for this operator.</div>
        )}
      </Dialog>
    );
  }
  if (d.kind === 'about') {
    return (
      <Dialog open title="About Records Library" onClose={close} reference={`${canon.meta.environment}, release ${canon.meta.release}`}>
        <div>
          Records Library client for the {canon.meta.agency}. Index, retrieval and controlled printing of records held by Records Division, ALPHA-03. Display is
          limited to material released to the operator's access determination; every display, query and print is recorded.
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog
      open
      title={d.title}
      kind={d.level}
      reference={d.reference ? `Reference ${d.reference}` : undefined}
      onClose={close}
      onOpen={(k) => (k === 'warning' || k === 'error' ? p.onSound() : undefined)}
    >
      {d.body}
    </Dialog>
  );
}

/** Puts the caret in the first text field once the dialog has set its own focus. */
function FocusFirst({ children }: { children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.querySelector<HTMLInputElement>('input')?.focus(), 0);
    return () => clearTimeout(t);
  }, []);
  return <div ref={ref}>{children}</div>;
}
