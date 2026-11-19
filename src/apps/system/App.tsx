/**
 * System Tools (app id "system"): Help Desk knowledge base, glossary, facility calendar,
 * system monitor, workstation settings, About This Terminal and the colophon.
 */
import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, RouteEntry } from '@core/contracts';
import type { Marking } from '@core/canon-types';
import canon from '@canon';
import { useServices } from '@core/services';
import * as session from '@core/session';
import {
  Dialog,
  MenuBar,
  RadioGroup,
  StatusBar,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  Tree,
  type MenuBarMenu,
  type TreeNode,
} from '@design/index';
import { RefusalState } from '@shell/adapters';
import { Ctx, type SysCtx } from './ctx';
import { HOME, PAGES, highestMarking, kbArticles, viewFor, visibleTo, type ResetScope, type ViewId } from './logic';
import { reinitialise } from './reset';
import { Credentials } from './views/Credentials';
import { HelpDesk } from './views/HelpDesk';
import { KbArticle } from './views/KbArticle';
import { Glossary } from './views/Glossary';
import { Settings } from './views/Settings';
import { Monitor } from './views/Monitor';
import { Calendar } from './views/Calendar';
import { DocPane } from './DocPane';
import './system.css';

const MARKINGS = (canon as unknown as { markings: Marking[] }).markings;
const markingLabel = (id: string) => MARKINGS.find((m) => m.id === id)?.label ?? id;

const VIEW_TITLES: Record<ViewId, string> = {
  home: 'Help Desk',
  kb: 'Help Desk article',
  glossary: 'Glossary of Terms',
  settings: 'Workstation Settings',
  monitor: 'System Monitor',
  calendar: 'Facility Calendar',
  about: 'About This Terminal',
  colophon: 'Colophon',
  credentials: 'Issued Credentials',
};

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  return r.access.compartment ? `${r.access.compartment}+T${r.access.tier}` : `T${r.access.tier}`;
}

interface PrintRefusal {
  title: string;
  text: string;
  reference: string;
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  /** A System Tools page whose record copy is not registered is shown in place, without a route. */
  const [local, setLocal] = useState<string | null>(null);
  const [nav, setNav] = useState(true);
  const [msg, setMsg] = useState('Ready');
  const [refusal, setRefusal] = useState<PrintRefusal | null>(null);
  const back = useRef<string[]>([]);
  const fwd = useRef<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  /** Window narrower than the status bar's fixed panes: keep the message and the clock only. */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => e && setNarrow(e.contentRect.width < 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = services.docs.all();
  const account = services.account.def.value;
  const visible = (r: RouteEntry) => visibleTo(r, account);
  const articles = useMemo(() => kbArticles(all).filter(visible), [all.length, account.id]);
  const [reset, setReset] = useState<ResetScope | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const doReset = (scope: ResetScope) => {
    const op = services.session.operatorId.peek();
    const what = scope === 'profile' ? `the local profile of operator ${op}` : 'every local profile on this workstation and the shared plant record';
    services.audit.log('control', 'system:reset', `Operator ${op} reinitialised ${what} at workstation A03-5-114 (System Tools).`, { scope, account: account.id });
    const carry = services.audit.entries.peek().at(-1);
    setResetBusy(true);
    win.setBusy(true);
    setMsg('Reinitialising local profile. The workstation restarts when it is done.');
    void reinitialise(scope, account.id, scope === 'profile' ? carry : undefined).finally(() => location.reload());
  };
  const entry: RouteEntry | null = local ? null : route;
  const path = local ?? route?.route ?? HOME;
  const view = viewFor(path);
  const key = entry ? accessKey(entry) : null;
  const refused = !!(entry && key && !services.clearance.satisfies(key));

  useEffect(() => setLocal(null), [route?.route]);

  const entryFor = (p: string) => services.docs.byRoute(p);
  /** System pages this account may open (Tier 4: only record copies released to it, plus pages with no record copy). */
  const pages = PAGES.filter((p) => {
    const e = entryFor(p.path);
    return !e || visible(e);
  });

  const go = (p: string, record = true) => {
    if (p === path) return;
    if (record) {
      back.current.push(path);
      fwd.current = [];
    }
    setMsg('Ready');
    if (p === HOME || entryFor(p)) {
      setLocal(null);
      win.navigate(p);
    } else {
      setLocal(p);
    }
    force((n) => n + 1);
  };

  const goBack = () => {
    const p = back.current.pop();
    if (!p) return setMsg('There is no earlier page in this window.');
    fwd.current.push(path);
    go(p, false);
  };
  const goForward = () => {
    const p = fwd.current.pop();
    if (!p) return setMsg('There is no later page in this window.');
    back.current.push(path);
    go(p, false);
  };

  /* --------------------------------------------- title, marking, audit */

  const homeMarking = highestMarking(
    articles.map((a) => a.marking),
    MARKINGS,
  );
  const marking = entry ? entry.marking : view === 'home' ? homeMarking : highestMarking([], MARKINGS);
  const title = entry ? entry.title : VIEW_TITLES[view];

  useEffect(() => {
    win.setTitle(title, entry?.docNo ?? '');
    win.setMarking(marking);
    win.setStatus(entry ? `${entry.docNo} rev ${entry.revision}` : `System Tools: ${VIEW_TITLES[view]}`);
  }, [title, entry?.docNo, marking, view]);

  useEffect(() => {
    if (refused && entry) {
      services.audit.log(
        'window.open',
        entry.docNo,
        `Operator ${services.session.operatorId.peek()} requested ${entry.docNo} in System Tools. Request refused: access determination not satisfied.`,
      );
    }
  }, [refused, entry?.docNo]);

  /* ---------------------------------------------------------- commands */

  const print = () => {
    if (entry && !refused) {
      services.print(entry.id);
      setMsg(`${entry.docNo} sent to the print queue. Collect it at the device with your token.`);
      return;
    }
    if (view === 'home') {
      setRefusal({
        title: 'Print',
        text: 'The Help Desk list is not a record and cannot be printed. Open an article and print its record copy.',
        reference: 'KB-0019',
      });
      return;
    }
    setRefusal({
      title: 'Print',
      text: `No record copy of ${VIEW_TITLES[view]} is registered on this workstation, so no cover sheet can be produced. Printing is refused.`,
      reference: 'OSC-DIR-0319',
    });
  };

  const find = () => {
    const el = rootRef.current?.querySelector<HTMLElement>('[data-sys-find] input, input[data-sys-find]');
    if (el) {
      el.focus();
      return;
    }
    go(HOME);
    setTimeout(() => rootRef.current?.querySelector<HTMLElement>('[data-sys-find] input, input[data-sys-find]')?.focus(), 50);
  };

  const copyDocNo = () => {
    const text = entry ? entry.docNo : path;
    void navigator.clipboard
      ?.writeText(text)
      .then(() => setMsg(`${text} copied to the clipboard.`))
      .catch(() => setMsg('The clipboard is not available to this application.'));
  };

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.altKey && k === 'p') {
      e.preventDefault();
      print();
    } else if (e.ctrlKey && !e.altKey && k === 'f') {
      e.preventDefault();
      find();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    } else if (e.altKey && e.key === 'Home') {
      e.preventDefault();
      go(HOME);
    }
  };

  const pageItem = (p: (typeof PAGES)[number], shortcut?: string) => ({
    label: p.label,
    shortcut,
    checked: view === p.view,
    radio: true,
    onSelect: () => go(p.path),
  });

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Help Desk', shortcut: 'Alt+Home', onSelect: () => go(HOME) },
        { separator: true },
        { label: '&Print record copy', shortcut: 'Ctrl+P', onSelect: print },
        { separator: true },
        { label: 'Issued &credentials', onSelect: () => go('/system/credentials') },
        { label: '&Reinitialise local profile...', onSelect: () => setReset('profile') },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+W', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Copy document number', onSelect: copyDocNo },
        { label: '&Find in help', shortcut: 'Ctrl+F', onSelect: find },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Navigation pane', checked: nav, onSelect: () => setNav(!nav) },
        { separator: true },
        { label: 'Help &Desk', checked: view === 'home' || view === 'kb', radio: true, onSelect: () => go(HOME) },
        ...pages.slice(0, 4).map((p) => pageItem(p)),
      ],
    },
    {
      label: '&Go',
      items: [
        { label: '&Back', shortcut: 'Alt+Left', disabled: !back.current.length, onSelect: goBack },
        { label: '&Forward', shortcut: 'Alt+Right', disabled: !fwd.current.length, onSelect: goForward },
        { separator: true },
        ...articles.map((a) => ({ label: `${a.docNo}  ${a.title}`, checked: path === a.route, radio: true, onSelect: () => go(a.route) })),
      ],
    },
    {
      label: '&Help',
      items: [
        ...(articles[0] ? [{ label: `&Getting started (${articles[0].docNo})`, onSelect: () => go(articles[0]!.route) }] : []),
        { label: '&Glossary of terms', onSelect: () => go('/system/glossary') },
        { separator: true },
        { label: '&About This Terminal', onSelect: () => go('/system/about') },
        { label: 'C&olophon', onSelect: () => go('/system/colophon') },
      ],
    },
  ];

  /* --------------------------------------------------------- navigation */

  const navNodes: TreeNode[] = [
    {
      id: HOME,
      label: 'Help Desk',
      meta: `(${articles.length})`,
      children: articles.map((a) => ({ id: a.route, label: `${a.docNo} ${a.title}` })),
    },
    ...pages.map((p) => ({ id: p.path, label: entryFor(p.path)?.title ?? p.label })),
  ];

  const ctx: SysCtx = { services, navTo: (p) => go(p), say: setMsg, entryFor, narrow, visible };

  const panes = [
    { id: 'msg', content: msg, fill: true, label: 'Message' },
    { id: 'doc', content: entry ? `${entry.docNo} rev ${entry.revision}` : VIEW_TITLES[view], width: 150, mono: !!entry, label: 'Page' },
    { id: 'mark', content: markingLabel(marking), width: 170, label: 'Marking on screen' },
    { id: 'acc', content: `Tier ${services.session.tier.value}${services.session.compartments.value.length ? ` + ${services.session.compartments.value.join(', ')}` : ''}`, width: 150, label: 'Access determination' },
    { id: 'clock', content: `${session.zulu(new Date(session.tick.value))} ${session.formatInWorldDate(new Date(session.tick.value))}`, width: 130, mono: true, label: 'Time' },
  ].filter((p) => !narrow || p.id === 'msg' || p.id === 'clock');

  /* -------------------------------------------------------------- body */

  let body;
  if (refused && entry) {
    body = (
      <RefusalState
        authority="Classification Control, Office of Internal Assurance"
        reference={entry.docNo}
        docNo={entry.docNo}
        reason={`Display of ${entry.docNo} to this operator is not authorised by the current access determination.`}
        requirement={`Tier ${entry.access!.tier}${entry.access!.compartment ? ` and ${entry.access!.compartment} compartment briefing` : ''}`}
      />
    );
  } else if (view === 'home') body = <HelpDesk articles={articles} />;
  else if (view === 'kb') body = entry ? <KbArticle entry={entry} articles={articles} /> : <HelpDesk articles={articles} />;
  else if (view === 'glossary') body = <Glossary entry={entry} />;
  else if (view === 'settings') body = <Settings entry={entry} />;
  else if (view === 'monitor') body = <Monitor entry={entry} />;
  else if (view === 'calendar') body = <Calendar entry={entry} />;
  else if (view === 'credentials') body = <Credentials onReset={() => setReset('profile')} />;
  else if (entry) body = <DocPane entry={entry} plain={view === 'colophon'} />;
  else body = <NotHeld view={view} />;

  return (
    <Ctx.Provider value={ctx}>
      <div class="sys-app" ref={rootRef} onKeyDown={onKeyDown}>
        <MenuBar menus={menus} label="System Tools menu" />
        <Toolbar label="Navigation">
          <ToolbarButton label="Back" title="Back (Alt+Left)" disabled={!back.current.length} onClick={goBack} />
          <ToolbarButton label="Forward" title="Forward (Alt+Right)" disabled={!fwd.current.length} onClick={goForward} />
          <ToolbarButton label="Help Desk" title="Help Desk (Alt+Home)" pressed={view === 'home'} onClick={() => go(HOME)} />
          <ToolbarSeparator />
          <ToolbarButton label="Print" title="Print record copy (Ctrl+P)" onClick={print} />
          <ToolbarSeparator />
          <span class="sys-tb-pages">
            {pages.slice(0, 4).map((p) => (
              <ToolbarButton key={p.path} label={p.short} title={p.label} pressed={view === p.view} onClick={() => go(p.path)} />
            ))}
          </span>
        </Toolbar>
        <div class={`sys-main${nav ? '' : ' sys-main--nonav'}`}>
          {nav && (
            <nav class="sys-nav" aria-label="System Tools pages">
              <Tree
                nodes={navNodes}
                label="System Tools pages"
                selectedId={view === 'kb' && !entry ? HOME : path}
                defaultExpanded={[HOME]}
                onSelect={(n) => go(n.id)}
              />
            </nav>
          )}
          {/* Focusable so the scrolling page can be read with the keyboard (axe scrollable-region-focusable). */}
          <main class="sys-body" aria-label={title} tabIndex={0}>
            {body}
          </main>
        </div>
        <StatusBar panes={panes} />
        <Dialog
          open={!!refusal}
          title={refusal?.title ?? ''}
          kind="info"
          reference={refusal?.reference}
          onOpen={() => services.sound.play('error')}
          onClose={() => setRefusal(null)}
          buttons={[{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }]}
        >
          <p>{refusal?.text}</p>
        </Dialog>
        <Dialog
          open={reset !== null}
          title="Reinitialise local profile"
          kind="warning"
          reference="KB-0019"
          onClose={(v) => {
            const scope = reset;
            setReset(null);
            if (v === 'yes' && scope && !resetBusy) doReset(scope);
          }}
          buttons={[
            { label: '&Reinitialise', value: 'yes' },
            { label: 'Cancel', value: 'no', isDefault: true, isCancel: true },
          ]}
        >
          <p>
            Reinitialising clears the local profile held at this workstation: message traffic, receipts and drafts, window layout, access determinations recorded since issue
            and the audit trail. Workstation settings are kept. The workstation restarts at the lock screen.
          </p>
          <RadioGroup
            legend="Profiles to reinitialise"
            name="sys-reset-scope"
            value={reset ?? 'profile'}
            options={[
              { value: 'profile', label: `This profile only (${services.session.operatorId.value})` },
              { value: 'all', label: 'Every profile on this workstation, and the shared plant record' },
            ]}
            onChange={(v) => setReset(v as ResetScope)}
          />
        </Dialog>
      </div>
    </Ctx.Provider>
  );
}

function NotHeld({ view }: { view: ViewId }) {
  return (
    <RefusalState
      authority="MERIDIAN Directory Service"
      reference="DS-ERR-0404"
      reason={`The record copy of ${VIEW_TITLES[view]} is not registered on this workstation.`}
    />
  );
}
