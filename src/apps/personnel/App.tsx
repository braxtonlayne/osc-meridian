/**
 * Personnel System (app id `personnel`).
 *
 * Routes: /personnel (strength summary), /personnel/tier/<1-4>, /personnel/ratio,
 * /personnel/directory, /personnel/phase/<1-5>, /personnel/vetting,
 * /personnel/transfer, /personnel/org, /personnel/branch/<ops|sec|tec|sup>.
 * Each route shows its interactive view and, on the Document tab, the
 * registered document. Audit: doc.read, search (directory queries),
 * window.open (refusals), redaction.hover.
 */
import './personnel.css';
import { T4Home, t4Refused } from './acct';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import {
  Dialog,
  MenuBar,
  Select,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  Tree,
  type MenuBarMenu,
  type MenuItem,
  type TreeNode,
} from '@design/index';
import { canon, fmt, HOME, markingLabel, navEntries, parsePath, pathOf, UNPOSTED, viewTitle, type View } from './model';
import { Ctx, DocPane, Refusal, type PerCtx, type RefusalSpec, useWidth } from './ui';
import { Overview } from './views/Overview';
import { TierView } from './views/Tier';
import { RatioView } from './views/Ratio';
import { DirectoryView, type DirectoryHandle } from './views/Directory';
import { PhaseView } from './views/Phase';
import { BranchPanel, TransferPanel, VettingPanel } from './views/Procedures';
import { OrgView } from './views/Org';

type TabId = 'view' | 'doc';

/** Marking of the interactive view when no document is registered for the path. */
const VIEW_MARKING: Record<View['kind'], MarkingId> = {
  overview: 'UMBRA-C',
  tier: 'TSSCI-OSC',
  ratio: 'TSSCI-OSC',
  directory: 'UMBRA-C',
  phase: 'TSSCI-OSC',
  vetting: 'UMBRA-C',
  transfer: 'TSSCI-OSC',
  org: 'UMBRA-C',
  branch: 'TSSCI-OSC',
};

const VIEW_TAB: Record<View['kind'], string> = {
  overview: '&Strength summary',
  tier: '&Tier record',
  ratio: '&Calculator',
  directory: 'Di&rectory',
  phase: '&Phase record',
  vetting: '&Vetting summary',
  transfer: '&Probation',
  org: '&Chart',
  branch: '&Establishment',
};

/** Views whose document is the record of reference and opens first. */
const DOC_FIRST: View['kind'][] = ['vetting', 'transfer'];

function routeKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  const t = `T${r.access.tier}`;
  return r.access.compartment ? `${r.access.compartment}+${t}` : t;
}

function navTree(): TreeNode[] {
  const out: TreeNode[] = [];
  const groups = new Map<string, TreeNode>();
  for (const e of navEntries()) {
    const node: TreeNode = { id: e.path, label: e.label };
    if (!e.group) {
      out.push(node);
      continue;
    }
    let g = groups.get(e.group);
    if (!g) {
      g = { id: `group:${e.group}`, label: e.group, children: [] };
      groups.set(e.group, g);
      out.push(g);
    }
    g.children!.push(node);
  }
  return out;
}

export default function App(props: AppProps) {
  const services = useServices();
  const view: View = parsePath(props.route?.route ?? HOME) ?? { kind: 'overview' };
  const entry = props.route ?? services.docs.byRoute(pathOf(view)) ?? null;
  if (t4Refused(services, entry)) return <T4Home win={props.win} services={services} title="Personnel System" docNo={entry?.docNo ?? 'OSC-PER-IDX'} />;
  return <PersonnelApp {...props} />;
}

function PersonnelApp({ win, route }: AppProps) {
  const services = useServices();
  const path = route?.route ?? HOME;
  const view: View = parsePath(path) ?? { kind: 'overview' };
  const entry: RouteEntry | null = route ?? services.docs.byRoute(pathOf(view)) ?? null;
  const subject = entry?.docNo ?? viewTitle(view);

  // The tab belongs to the path: a new route starts on its default tab.
  const defaultTab: TabId = DOC_FIRST.includes(view.kind) ? 'doc' : 'view';
  const [tabState, setTabState] = useState<{ path: string; tab: TabId }>({ path, tab: defaultTab });
  const tab: TabId = tabState.path === path ? tabState.tab : defaultTab;
  const setTab = (t: TabId) => setTabState({ path, tab: t });
  const [navShown, setNavShown] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [message, setMessage] = useState('Ready');
  const [refusal, setRefusal] = useState<RefusalSpec | null>(null);
  const [rootRef, width] = useWidth<HTMLDivElement>();
  const narrow = width > 0 && width < 900;
  const dirHandle = useRef<DirectoryHandle | null>(null);
  const pendingFocus = useRef(false);

  const key = entry ? routeKey(entry) : null;
  const allowed = key ? services.clearance.satisfies(key) : true;
  const marking: MarkingId = entry?.marking ?? VIEW_MARKING[view.kind];

  useEffect(() => {
    win.setTitle(entry?.title ?? `Personnel System: ${viewTitle(view)}`, entry?.docNo);
    win.setMarking(marking);
    win.setStatus(entry ? `${entry.docNo} Rev ${entry.revision}` : 'Personnel System');
  }, [win, path, entry?.id, marking]);

  // A newly shown page starts at its top (tables scroll their cursor row into view on mount).
  useEffect(() => {
    setMessage('Ready');
  }, [path]);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const panel = rootRef.current?.querySelector<HTMLElement>('.per-main .tabs__panel');
      if (panel) panel.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [path, tab]);

  // Refused routes are audited once per path.
  const refusedLogged = useRef<string | null>(null);
  useEffect(() => {
    if (allowed || !entry || refusedLogged.current === path) return;
    refusedLogged.current = path;
    services.sound.play('error');
    services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo} in Personnel System. Request refused: access requirement ${key} not satisfied.`);
  }, [allowed, path]);

  const go = (p: string) => {
    if (p === path) return;
    win.navigate(p);
  };

  const refuse = (r: RefusalSpec) => {
    setRefusal(r);
    services.audit.log('window.open', r.reference, `Operator ${services.session.operatorId.peek()} requested ${r.title} in Personnel System. Request refused: ${r.message}`);
  };

  const ctx: PerCtx = { services, win, subject, go, refuse, setMessage };

  const copy = (text: string, what: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => setMessage(`${what} ${text} copied to the clipboard.`),
      () => setMessage('The clipboard is not available to this workstation.'),
    );
  };

  const findInDirectory = () => {
    if (view.kind === 'directory') {
      setTab('view');
      setTimeout(() => dirHandle.current?.focusSearch(), 0);
    } else {
      pendingFocus.current = true;
      go('/personnel/directory');
    }
  };

  const print = () => {
    if (!entry) {
      refuse({ title: 'Print', message: 'This view has no registered document to print. Print is available from the Document tab of a registered record.', reference: 'OSC-DIR-0319', authority: 'Records Division' });
      return;
    }
    services.print(entry.id);
    setMessage(`${entry.docNo} sent to the print queue.`);
  };

  const exportRoster = () =>
    refuse({
      title: 'Export to file',
      message: 'Personnel records may not be written to removable media or file from this workstation. Reproduction is by print release only.',
      reference: 'OSC-DIR-0319',
      authority: 'Personnel & Vetting',
    });

  const unpostedReport = () =>
    refuse({
      title: 'Strength report by category',
      message: `No breakdown is held below the category total for ${UNPOSTED} (${fmt(canon.headline.staffUnposted)}). The report is not available for this category.`,
      reference: 'OSC-DIR-0233',
      authority: 'Personnel & Vetting',
    });

  const scrollTo = (id: string) => {
    go(HOME);
    setTab('view');
    setTimeout(() => rootRef.current?.querySelector(`#${id}`)?.scrollIntoView({ block: 'start' }), 60);
  };

  const helpEntry = useMemo(() => services.docs.all().find((e) => e.app === 'system' && e.template === 'help' && /personnel/i.test(e.title)), []);
  const [about, setAbout] = useState(false);

  const goItems: MenuItem[] = navEntries().map((e) => ({ label: e.group ? `${e.group}: ${e.label}` : e.label, checked: e.path === pathOf(view), radio: true, onSelect: () => go(e.path) }));

  // Tier 4 closed world (SPEC-2 §1): only the notice issued to Tier 4 opens here, as a document with no
  // network summary, directory, calculator, org chart or section tree.
  const t4 = services.session.tier.value === 4;
  const t4Menus: MenuBarMenu[] = [
    { label: '&File', items: [{ label: '&Print...', shortcut: 'Ctrl+P', onSelect: print }, { separator: true }, { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() }] },
  ];
  const menus: MenuBarMenu[] = t4 ? t4Menus : [
    {
      label: '&File',
      items: [
        { label: '&Print document...', shortcut: 'Ctrl+P', onSelect: print },
        { label: '&Export to file...', onSelect: exportRoster },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Find in directory...', shortcut: 'Ctrl+F', onSelect: findInDirectory },
        {
          label: 'Copy &personnel number',
          disabled: view.kind !== 'directory',
          onSelect: () => {
            const pn = dirHandle.current?.selectedPn();
            if (pn) copy(pn, 'Personnel number');
            else setMessage('Select a directory entry first.');
          },
        },
        { label: 'Copy &document number', disabled: !entry, onSelect: () => entry && copy(entry.docNo, 'Document number') },
      ],
    },
    {
      label: '&View',
      items: [
        { label: VIEW_TAB[view.kind].replace('&', ''), radio: true, checked: tab === 'view', onSelect: () => setTab('view') },
        { label: 'Document', radio: true, checked: tab === 'doc', onSelect: () => setTab('doc') },
        { separator: true },
        { label: '&Navigation pane', checked: navShown && !narrow, disabled: narrow, onSelect: () => setNavShown((v) => !v) },
        { label: '&Refresh', shortcut: 'F5', onSelect: () => setReloadKey((k) => k + 1) },
      ],
    },
    { label: '&Go', items: goItems },
    {
      label: '&Reports',
      items: [
        { label: 'Strength by &tier', onSelect: () => scrollTo('per-r-tier') },
        { label: 'Strength by &class', onSelect: () => scrollTo('per-r-class') },
        { label: 'Personnel &accounting', onSelect: () => scrollTo('per-r-acct') },
        { label: 'Strength by &facility', onSelect: () => scrollTo('per-r-fac') },
        { separator: true },
        { label: `Strength by category: ${UNPOSTED}...`, onSelect: unpostedReport },
      ],
    },
    {
      label: '&Help',
      items: [
        {
          label: 'Personnel System &help',
          onSelect: () => {
            if (helpEntry) services.openRoute(helpEntry.route);
            else setAbout(true);
          },
        },
        { label: '&About Personnel System', onSelect: () => setAbout(true) },
      ],
    },
  ];

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && !e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      print();
    } else if (e.ctrlKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      findInDirectory();
    } else if (e.key === 'F5') {
      e.preventDefault();
      setReloadKey((k) => k + 1);
    }
  };

  const tier = services.session.tier.value;
  const comps = services.session.compartments.value;
  const acting = services.session.actingTier2.value;

  let body;
  if (!allowed && entry) {
    const comp = entry.access?.compartment;
    const briefing = comp ? canon.compartments.find((c) => c.id === comp)?.briefingDocNo : undefined;
    body = (
      <div class="per-pad">
        <Refusal
          authority="Classification Control, Office of Internal Assurance"
          reference={briefing ?? entry.docNo}
          docNo={entry.docNo}
          requirement={`Tier ${entry.access!.tier}${comp ? ` and ${comp} compartment briefing` : ''}`}
          reason={`Display of ${entry.docNo} to this operator is not authorised.`}
        />
      </div>
    );
  } else if (t4) {
    body = <DocPane entry={entry} reloadKey={reloadKey} />;
  } else {
    let inner;
    if (tab === 'doc') inner = <DocPane entry={entry} reloadKey={reloadKey} />;
    else {
      switch (view.kind) {
        case 'overview':
          inner = <Overview />;
          break;
        case 'tier':
          inner = <TierView tier={view.tier} />;
          break;
        case 'ratio':
          inner = <RatioView />;
          break;
        case 'directory':
          inner = (
            <DirectoryView
              onReady={(h) => {
                dirHandle.current = h;
                if (pendingFocus.current) {
                  pendingFocus.current = false;
                  h.focusSearch();
                }
              }}
            />
          );
          break;
        case 'phase':
          inner = <PhaseView n={view.n} />;
          break;
        case 'vetting':
          inner = <VettingPanel />;
          break;
        case 'transfer':
          inner = <TransferPanel />;
          break;
        case 'org':
          inner = <OrgView />;
          break;
        case 'branch':
          inner = <BranchPanel branch={view.branch} />;
          break;
      }
    }
    body = (
      <Tabs
        label="Page"
        panel="surface"
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: 'view', label: VIEW_TAB[view.kind] },
          { id: 'doc', label: entry ? `&Document ${entry.docNo}` : '&Document' },
        ]}
      >
        <div key={`${path}:${tab}`} class={tab === 'view' && view.kind === 'org' ? 'per-tabfill' : undefined}>
          {inner}
        </div>
      </Tabs>
    );
  }

  const showNav = navShown && !narrow && !t4;

  return (
    <Ctx.Provider value={ctx}>
      <div class="per-app" ref={rootRef} onKeyDown={onKeyDown}>
        <MenuBar menus={menus} label="Personnel System menu" />
        {t4 ? null : (
        <Toolbar label="Personnel System">
          <ToolbarButton label="&Summary" pressed={view.kind === 'overview'} onClick={() => go(HOME)} />
          <ToolbarButton label="Directory" pressed={view.kind === 'directory'} onClick={() => go('/personnel/directory')} />
          <ToolbarButton label="Calculator" pressed={view.kind === 'ratio'} onClick={() => go('/personnel/ratio')} />
          <ToolbarButton label="Org chart" pressed={view.kind === 'org'} onClick={() => go('/personnel/org')} />
          <ToolbarSeparator />
          <ToolbarButton label="Document" pressed={tab === 'doc'} onClick={() => setTab(tab === 'doc' ? 'view' : 'doc')} title="Show the registered document for this page" />
          <ToolbarButton label="Print" onClick={print} title="Print document (Ctrl+P)" />
          <ToolbarSpacer />
        </Toolbar>
        )}
        {narrow && !t4 ? (
          <div class="per-navsel">
            <Select
              label="Section"
              layout="inline"
              value={pathOf(view)}
              options={navEntries().map((e) => ({ value: e.path, label: e.group ? `${e.group}: ${e.label}` : e.label }))}
              onChange={go}
            />
          </div>
        ) : null}
        <div class="per-body">
          {showNav ? (
            <nav class="per-nav" aria-label="Personnel System sections">
              <Tree
                nodes={navTree()}
                label="Personnel System sections"
                selectedId={pathOf(view)}
                defaultExpanded={['group:Tiers', 'group:Recruitment phases', 'group:Functional branches']}
                onSelect={(n) => {
                  if (n.id.startsWith('/')) go(n.id);
                }}
              />
            </nav>
          ) : null}
          <main class="per-main">{body}</main>
        </div>
        <StatusBar
          panes={[
            { id: 'msg', content: message, fill: true, label: 'Message' },
            { id: 'doc', content: entry ? `${entry.docNo} Rev ${entry.revision}` : 'No document', width: 150, mono: true, label: 'Document' },
            { id: 'mark', content: markingLabel(marking), width: 190, label: 'Marking' },
            {
              id: 'sess',
              content: `Tier ${tier}${acting ? ' (acting)' : ''} · ${comps.length ? comps.join(' ') : 'no compartments'}`,
              width: 170,
              label: 'Session clearance',
            },
          ]}
        />
        <Dialog
          open={refusal !== null}
          kind="error"
          title={refusal?.title ?? ''}
          reference={refusal ? `Ref ${refusal.reference}${refusal.authority ? ` · ${refusal.authority}` : ''}` : undefined}
          onOpen={() => services.sound.play('error')}
          onClose={() => setRefusal(null)}
        >
          <p>{refusal?.message}</p>
        </Dialog>
        <Dialog open={about} kind="info" title="About Personnel System" onClose={() => setAbout(false)} reference={`Release ${canon.meta.release}`}>
          <p>
            Personnel System, {canon.meta.environment}, release {canon.meta.release}. Strength figures are read from the personnel accounting returns held by {' '}
            {canon.divisions.find((d) => d.id === 'PV')?.name}. Directory fields are released according to the reader's tier and compartments.
          </p>
          <p>Keyboard: F10 or Alt+letter opens the menus; Ctrl+F finds in the directory; Ctrl+P prints the document; F5 refreshes.</p>
        </Dialog>
      </div>
    </Ctx.Provider>
  );
}
