/**
 * Terminal: an xterm.js session to the ALPHA-03 records host (A03RD1).
 * The host itself is the pure interpreter in ./host.ts; this file is the
 * window chrome, the console and the effects the host asks for.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { AppProps } from '@core/contracts';
import type { Canon, MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { PROBATION_LENGTH_DAYS } from '@core/session';
import { appById } from '@apps/index';
import { MenuBar, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, ToolbarLabel } from '@design/index';
import type { MenuBarMenu } from '@design/index';
import { RefusalState } from '@graphics/states';
import { COMPARTMENT_MARKING, complete, formatConsist, formatFind, run, stamp, zulu } from './host';
import type { Effect, HostContext } from './host';
import { HOST, HOST_TITLE, PROMPT, WORKSTATION } from './records';
import { mountConsole } from './console';
import type { ConsoleHandle, ConsoleMode } from './console';
import './terminal.css';

const canon = canonJson as unknown as Canon;
const BASE_MARKING: MarkingId = 'TSSCI-OSC';
const LAST_KEY = 'meridian:terminal:last';
const PREFS_KEY = 'meridian:terminal:prefs';
const RS_ROUTE = '/transit/rolling-stock';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: preference is kept for this window only */
  }
}

function rank(m: MarkingId): number {
  return canon.markings.find((x) => x.id === m)?.rank ?? 0;
}

/** Tables of a document body as text cells, header row first. */
function tablesOf(html: string): string[][][] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('table')).map((t) =>
    Array.from(t.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('th,td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())),
  );
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const hostRef = useRef<HTMLDivElement>(null);
  const con = useRef<ConsoleHandle | null>(null);
  const history = useRef<string[]>([]);
  const markingRef = useRef<MarkingId>(BASE_MARKING);
  const prefs = useMemo(() => readLocal(PREFS_KEY, { large: false, pager: true }), []);
  const [mode, setMode] = useState<ConsoleMode | 'loading'>('loading');
  const [connected, setConnected] = useState(false);
  const [large, setLarge] = useState<boolean>(prefs.large);
  const [pager, setPager] = useState<boolean>(prefs.pager);
  const [size, setSize] = useState('');
  const [count, setCount] = useState(0);
  const [marking, setMarkingState] = useState<MarkingId>(BASE_MARKING);
  const [note, setNote] = useState('');
  const [now, setNow] = useState(() => new Date());

  const refusal = route?.access && !services.clearance.satisfies(route.access.compartment ? `${route.access.compartment}+T${route.access.tier}` : `T${route.access.tier}`) ? route : null;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    win.setTitle(`Terminal: ${HOST}`, route?.docNo);
    win.setMarking(refusal ? route!.marking : marking);
  }, [win, route, marking, refusal]);

  useEffect(() => {
    if (refusal) services.audit.log('window.open', refusal.docNo, `Operator ${services.session.operatorId.peek()} requested ${refusal.docNo} at the terminal. Request refused.`);
  }, [refusal]);

  const statusText =
    mode === 'loading'
      ? `Connecting to ${HOST}`
      : mode === 'more'
        ? 'More output: Space next page, Enter next line, Q quit'
        : mode === 'busy'
          ? `Waiting for ${HOST}`
          : mode === 'disconnected'
            ? `Disconnected from ${HOST}. Press Enter or choose Session > Connect`
            : note || `Connected to ${HOST}`;

  useEffect(() => {
    win.setStatus(mode === 'disconnected' ? `${HOST} disconnected` : mode === 'loading' ? `Connecting to ${HOST}` : `${HOST} session`);
    win.setBusy(mode === 'busy' || mode === 'loading');
  }, [statusText, mode, win]);

  const raiseMarking = (m: MarkingId) => {
    if (rank(m) > rank(markingRef.current)) {
      markingRef.current = m;
      setMarkingState(m);
    }
  };
  const resetMarking = () => {
    markingRef.current = BASE_MARKING;
    setMarkingState(BASE_MARKING);
  };

  const context = (c: ConsoleHandle): HostContext => ({
    canon,
    now: new Date(),
    cols: c.cols,
    operatorId: services.session.operatorId.peek(),
    tier: services.session.tier.peek(),
    acting: services.session.actingTier2.peek(),
    compartments: services.session.compartments.peek(),
    flags: services.session.flags.peek(),
    probationDay: services.session.probationDay.peek(),
    probationLength: PROBATION_LENGTH_DAYS,
    history: history.current.slice(),
    audit: services.audit.entries.peek(),
    unread: services.mail.unread.peek(),
    routes: services.docs.all(),
    satisfies: services.clearance.satisfies,
    appTitle: (id) => appById(id)?.title ?? id,
  });

  const banner = (): string[] => {
    const d = new Date();
    const last = readLocal<string | null>(LAST_KEY, null);
    writeLocal(LAST_KEY, stamp(d));
    const div = canon.divisions.find((x) => x.id === canon.operator.divisionId);
    return [
      `${HOST_TITLE} ${HOST}    ${canon.meta.environment} ${canon.meta.release}`,
      `${canon.meta.agency}, ${canon.operator.site} ${div ? div.name : ''}`.trimEnd(),
      'Use of this host is recorded. Reference OSC-DIR-0301.',
      '',
      last ? `Last session ${last} from WS ${WORKSTATION}.` : `No previous session for this operator on ${HOST}.`,
      `${services.session.operatorId.peek()} connected from WS ${WORKSTATION} at ${stamp(d)}.`,
      'Type HELP for commands.',
      '',
    ];
  };

  const connect = (c: ConsoleHandle) => {
    c.setConnected(true);
    setConnected(true);
    c.write(banner(), () => c.prompt());
  };

  /**
   * Carry out what the host asked for, after its lines are printed. Returns true when
   * more output follows (the prompt is then shown by that output).
   */
  const apply = (c: ConsoleHandle, effects: Effect[]): boolean => {
    let pending = false;
    for (const e of effects) {
      switch (e.kind) {
        case 'open':
          services.openRoute(e.route);
          break;
        case 'openApp':
          services.openApp(e.app);
          break;
        case 'clear':
          c.clear();
          resetMarking();
          break;
        case 'logout':
          pending = true;
          c.setConnected(false);
          setConnected(false);
          c.write([`Press Enter to reconnect to ${HOST}.`]);
          break;
        case 'search': {
          pending = true;
          c.setBusy(true);
          void services
            .search(e.q)
            .then((hits) => formatFind(e.q, hits, c.cols))
            .catch(() => [`FIND: the MERIDIAN index is not available to ${HOST} at present.`])
            .then((lines) => {
              c.setBusy(false);
              c.write(lines, () => c.prompt());
            });
          break;
        }
        case 'consist': {
          pending = true;
          c.setBusy(true);
          const entry = services.docs.byRoute(RS_ROUTE);
          const load = entry ? services.docs.load(entry.id).then((d) => tablesOf(d.html)) : Promise.resolve(null);
          void load
            .catch(() => null)
            .then((tables) => {
              const lines = formatConsist(e.id, tables, c.cols);
              if (tables && !lines[0]!.endsWith('NO RECORD.')) raiseMarking(COMPARTMENT_MARKING);
              c.setBusy(false);
              c.write(lines, () => c.prompt());
            });
          break;
        }
      }
    }
    return pending;
  };

  const onLine = (line: string) => {
    const c = con.current;
    if (!c) return;
    const raw = line.trim();
    if (!raw) {
      c.prompt();
      return;
    }
    // Snapshot the operator's state first: the narrative engine reacts to the audit entry
    // synchronously, and the host prints what was true when the command was entered.
    const ctx = context(c);
    history.current.push(raw);
    setCount(history.current.length);
    setNote(`Last command ${zulu(new Date())}: ${raw.length > 40 ? raw.slice(0, 39) + '~' : raw}`);
    services.audit.log('terminal.cmd', raw, `Command "${raw}" entered at host ${HOST}. Command line retained with the audit trail.`);
    const res = run(raw, ctx);
    if (res.marking) raiseMarking(res.marking);
    c.write(res.lines, () => {
      if (!apply(c, res.effects)) c.prompt();
    });
  };

  // Mount the console once.
  useEffect(() => {
    if (refusal) return;
    const el = hostRef.current;
    if (!el) return;
    let disposed = false;
    let handle: ConsoleHandle | null = null;
    void mountConsole(
      el,
      PROMPT,
      {
        onLine: (l) => onLineRef.current(l),
        onComplete: (l) => complete(l, { routes: services.docs.all(), canon }),
        onReconnect: () => handle && connect(handle),
        onMode: (m) => setMode(m),
        onResize: (cols, rows) => setSize(`${cols}x${rows}`),
      },
      { fontSize: prefs.large ? 14 : 12, pager: prefs.pager },
    ).then((h) => {
      if (disposed) {
        h.dispose();
        return;
      }
      handle = h;
      con.current = h;
      setSize(`${h.cols}x${h.rows}`);
      setMode('input');
      connect(h);
      h.focus();
    });
    return () => {
      disposed = true;
      handle?.dispose();
      con.current = null;
    };
  }, [refusal]);

  // Keep the latest onLine for the console callbacks (state setters are stable; services is a singleton).
  const onLineRef = useRef(onLine);
  onLineRef.current = onLine;

  const refocus = () => setTimeout(() => con.current?.focus(), 0);
  const typed = (cmd: string) => () => {
    const c = con.current;
    if (!c) return;
    if (!connected) {
      services.notify(`${HOST} session is not connected. Choose Session > Connect.`, { from: 'Terminal' });
      return;
    }
    if (mode !== 'input') {
      services.notify(`${HOST} is busy. Finish or quit the current output first (Q).`, { from: 'Terminal' });
      return;
    }
    c.submit(cmd);
    refocus();
  };
  const doCopy = () => {
    const sel = con.current?.selection() ?? '';
    if (!sel) {
      services.notify('Nothing is selected. Select text in the session window first.', { from: 'Terminal' });
      return;
    }
    void navigator.clipboard?.writeText(sel).then(
      () => setNote('Selection copied to the clipboard.'),
      () => services.notify('The clipboard is not available to this workstation.', { from: 'Terminal' }),
    );
    refocus();
  };
  const doPaste = () => {
    if (!navigator.clipboard?.readText) {
      services.notify('Paste from the menu is not available here. Use Ctrl+V in the session window.', { from: 'Terminal' });
      return;
    }
    void navigator.clipboard.readText().then(
      (t) => {
        con.current?.paste(t);
        refocus();
      },
      () => services.notify('Clipboard read was refused by the workstation. Use Ctrl+V in the session window.', { from: 'Terminal' }),
    );
  };
  const doTranscript = () => {
    const t = con.current?.transcript() ?? '';
    void navigator.clipboard?.writeText(t).then(
      () => setNote('Session transcript copied to the clipboard.'),
      () => services.notify('The clipboard is not available to this workstation.', { from: 'Terminal' }),
    );
    refocus();
  };
  const doClear = () => {
    con.current?.clear();
    resetMarking();
    if (mode === 'input') con.current?.prompt();
    refocus();
  };
  const toggleLarge = (on: boolean) => {
    setLarge(on);
    con.current?.setFontSize(on ? 14 : 12);
    writeLocal(PREFS_KEY, { large: on, pager });
    refocus();
  };
  const togglePager = () => {
    const on = !pager;
    setPager(on);
    con.current?.setPager(on);
    writeLocal(PREFS_KEY, { large, pager: on });
    refocus();
  };
  const disconnect = typed('logout');
  const reconnect = () => {
    if (con.current && !connected) {
      connect(con.current);
      refocus();
    }
  };

  const menus: MenuBarMenu[] = [
    {
      label: '&Session',
      items: [
        { label: '&Connect', onSelect: reconnect, disabled: connected },
        { label: '&Disconnect', onSelect: disconnect, disabled: !connected },
        { separator: true },
        { label: 'Copy &transcript', onSelect: doTranscript },
        { separator: true },
        { label: 'C&lose', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Copy', shortcut: 'Ctrl+C', onSelect: doCopy },
        { label: '&Paste', shortcut: 'Ctrl+V', onSelect: doPaste },
        { label: 'Select &all', onSelect: () => (con.current?.selectAll(), refocus()) },
        { separator: true },
        { label: 'Clear &screen', shortcut: 'Ctrl+L', onSelect: doClear },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Standard type', radio: true, checked: !large, onSelect: () => toggleLarge(false) },
        { label: '&Large type', radio: true, checked: large, onSelect: () => toggleLarge(true) },
        { separator: true },
        { label: '&Page long output', checked: pager, onSelect: togglePager },
      ],
    },
    {
      label: '&Commands',
      items: [
        { label: '&Help', onSelect: typed('help') },
        { label: '&Who am I', onSelect: typed('whoami') },
        { label: '&Sites', onSelect: typed('sites') },
        { label: 'Site &ALPHA-03', onSelect: typed('site ALPHA-03') },
        { label: '&Rail status', onSelect: typed('rail status') },
        { label: '&Mail', onSelect: typed('mail') },
        { label: 'Au&dit tail', onSelect: typed('audit tail') },
        { label: 'C&learance', onSelect: typed('clearance') },
        { label: 'Hi&story', onSelect: typed('history') },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Terminal &commands (KB-0026)', onSelect: () => services.openRoute('/system/kb/kb-0026') },
        { label: '&Workstation use (OSC-DIR-0301)', onSelect: () => services.openRoute('/directives/dir-0301') },
        { separator: true },
        { label: '&About this terminal', onSelect: () => services.openRoute('/system/about') },
      ],
    },
  ];

  if (refusal) {
    return (
      <div class="term-app">
        <RefusalState
          authority="Classification Control, Office of Internal Assurance"
          ref={'DIR-0412' as never}
          reason={`Display of ${refusal.docNo} at ${HOST} to this operator is not authorised.`}
          requirement={`Tier ${refusal.access!.tier}${refusal.access!.compartment ? ` and ${refusal.access!.compartment} compartment briefing` : ''}`}
          docNo={refusal.docNo}
        />
      </div>
    );
  }

  const narrow = Number(size.split('x')[0]) > 0 && Number(size.split('x')[0]) < 80;
  const tierLabel =`Tier ${services.session.tier.value}${services.session.actingTier2.value ? ' (acting)' : ''}`;

  return (
    <div class="term-app">
      <MenuBar menus={menus} label="Terminal menu" />
      <Toolbar label="Session">
        <ToolbarButton label={connected ? 'Disconnect' : 'Connect'} title={connected ? `End the ${HOST} session` : `Connect to ${HOST}`} onClick={connected ? disconnect : reconnect} />
        <ToolbarSeparator />
        <ToolbarButton label="Copy" title="Copy selection (Ctrl+C)" onClick={doCopy} />
        <ToolbarButton label="Paste" title="Paste (Ctrl+V)" onClick={doPaste} />
        <ToolbarButton label="Clear" title="Clear screen (Ctrl+L)" onClick={doClear} />
        <ToolbarSeparator />
        <ToolbarButton label="Help" title="List commands" onClick={typed('help')} />
        <ToolbarSpacer />
        <ToolbarLabel>{`${HOST_TITLE} ${HOST}`}</ToolbarLabel>
      </Toolbar>
      <div class="term-well">
        <div ref={hostRef} class="term-host" aria-label={`Session with ${HOST}`} />
        {mode === 'loading' && <div class="term-loading">Connecting to {HOST}...</div>}
      </div>
      <StatusBar
        panes={[
          { id: 'msg', content: statusText, fill: true },
          ...(narrow
            ? []
            : [
                { id: 'op', content: `${services.session.operatorId.value}  ${tierLabel}`, mono: true, width: 190, label: 'Operator' },
                { id: 'ws', content: `WS ${WORKSTATION}`, mono: true, width: 96, label: 'Workstation' },
                { id: 'size', content: size || '--', mono: true, width: 60, label: 'Columns by rows' },
              ]),
          { id: 'cmd', content: `CMD ${count}`, mono: true, width: 64, label: 'Commands entered' },
          { id: 'clock', content: zulu(now), mono: true, width: 52, label: 'Zulu time' },
        ]}
      />
    </div>
  );
}
