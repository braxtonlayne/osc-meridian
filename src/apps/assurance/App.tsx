/**
 * Assurance: the Office of Internal Assurance workbench. Incident queue and tickets, threat
 * register, personnel / communications / construction protocols, classification guide, cover
 * identity catalogue, contractor register with its compartment matrix, and the operator's own
 * record of activity read from services.audit.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { handheldActive, useServices } from '@core/services';
import { MenuBar, MessageBox, Select, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, Tree, type MenuBarMenu, type TreeNode } from '@design/index';
import { ActivityView, type ActivityScope } from './Activity';
import { AuditReview } from './Review';
import { RefusalState } from '@graphics/states';
import { ClassificationPanel, CommunicationsPanel, ContractorPanel, CoverPanel, PersonnelSecurityPanel } from './Guides';
import { IncidentQueue, TicketView, type QueueFilter } from './Incidents';
import { ThreatPanel, ThreatRegister } from './Threats';
import { highestMarking, incidentRoutes, ticketSubject, type ActivityFilter } from './logic';
import { CompactCtx, DocPane, RouteRefusal, canRead, canon, markingOf, useDoc } from './shared';
import './assurance.css';

type Internal = 'incidents' | 'ticket' | 'threats' | 'activity' | 'review';
type Kind = 'threat' | 'cg' | 'ctr' | 'cov' | 'psec' | 'comm' | 'doc';

const HOME = '/assurance';

function kindOf(r: RouteEntry): Kind {
  const p = r.route;
  if (p.startsWith(`${HOME}/threat/`)) return 'threat';
  if (p.endsWith('/classification-guide')) return 'cg';
  if (p.endsWith('/contractor-register')) return 'ctr';
  if (p.endsWith('/cover-catalogue')) return 'cov';
  if (p.endsWith('/personnel-security')) return 'psec';
  if (p.endsWith('/communications')) return 'comm';
  return 'doc';
}

const INTERNAL_TITLE: Record<Internal, string> = {
  incidents: 'Incident queue',
  ticket: 'Incident ticket',
  threats: 'Threat register',
  activity: 'Your session activity',
  review: 'Audit review',
};

interface Notice {
  title: string;
  body: string;
  reference?: string;
  kind?: 'info' | 'warning' | 'error';
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const all = services.docs.all();
  const own = useMemo(() => all.filter((r) => r.app === 'assurance'), [all]);
  const tickets = useMemo(() => incidentRoutes(all), [all]);
  const threats = useMemo(() => own.filter((r) => kindOf(r) === 'threat').sort((a, b) => a.docNo.localeCompare(b.docNo)), [own]);
  const byKind = (k: Kind) => own.find((r) => kindOf(r) === k);

  const auditor = services.account.def.value.auditReader;
  // Tier 4 holds no access determination for the office's registers (DIR-0301): own record only.
  const tier4 = services.session.tier.value === 4;
  const [internal, setInternal] = useState<Internal>(tier4 ? 'activity' : auditor ? 'review' : 'incidents');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [queueSel, setQueueSel] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('open');
  const [threatSel, setThreatSel] = useState<string | null>(canon.threatDetail[0]?.id ?? null);
  const [scope, setScope] = useState<ActivityScope>('session');
  const [actFilter, setActFilter] = useState<ActivityFilter>('all');
  const [showNav, setShowNav] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [narrow, setNarrow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ticket = tickets.find((t) => t.id === ticketId) ?? null;
  const view: Internal | null = route ? null : internal === 'ticket' && !ticket ? 'incidents' : internal;

  /* ---------------------------------------------------------- navigation */

  const nav = (path: string) => win.navigate(path);
  const goInternal = (v: Internal) => {
    setInternal(v);
    if (route) nav(HOME);
  };
  const openTicket = (id: string) => {
    setTicketId(id);
    setQueueSel(id);
    setInternal('ticket');
    if (route) nav(HOME);
  };
  const goKind = (k: Kind) => {
    const r = byKind(k);
    if (r) nav(r.route);
    else refuse({ title: 'Item not on the index', body: 'The requested Assurance record is not held on the MERIDIAN index at this workstation.', reference: 'OSC-DIR-0412' });
  };

  /* ------------------------------------------------------------- notices */

  const refuse = (n: Notice) => {
    services.sound.play('error');
    setNotice({ kind: 'warning', ...n });
  };

  const print = () => {
    if (route) return services.print(route.id);
    if (view === 'ticket' && ticket) return services.print(ticket.id);
    if (view === 'activity')
      return refuse({
        title: 'Reproduction not available',
        body: "Workstation audit trails are not reproduced at the operator's workstation. A copy of an operator's own record is requested from the Resident Assurance Officer.",
        reference: 'OSC-ASR-PSEC',
      });
    return refuse({
      title: 'Reproduction not available',
      body: 'Register and queue listings are not printed from the workstation. Open the individual entry and print it with its cover sheet.',
      reference: 'OSC-DIR-0319',
    });
  };

  const worklogRefusal = () =>
    refuse({
      title: 'Worklog closed to this operator',
      body: `Entries on ${ticket?.docNo ?? 'OIA tickets'} are made by the action officer. Information bearing on an open inquiry is reported under OSC-DIR-0378.`,
      reference: 'OIA · OSC-DIR-0378',
    });

  /* ------------------------------------------------- title, marking, status */

  const markingNow: MarkingId = route
    ? route.marking
    : view === 'ticket' && ticket
      ? ticket.marking
      : view === 'incidents'
        ? highestMarking(tickets.map((t) => t.marking), canon.markings)
        : view === 'threats'
          ? highestMarking(threats.map((t) => t.marking), canon.markings)
          : view === 'review' && auditor
            ? highestMarking(['UMBRA-C'], canon.markings)
            : highestMarking([], canon.markings);

  const title = route ? route.title : view === 'ticket' && ticket ? ticket.title : INTERNAL_TITLE[view ?? 'incidents'];
  const docNo = route ? route.docNo : view === 'ticket' && ticket ? ticket.docNo : undefined;

  const entries = services.audit.entries.value.length;
  const count = route
    ? kindOf(route) === 'ctr'
      ? `${canon.contractors.register.length} primes`
      : kindOf(route) === 'cov'
        ? `${canon.coverCatalogue.length} entries`
        : `Rev ${route.revision}`
    : view === 'incidents'
      ? `${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`
      : view === 'threats'
        ? `${canon.threatDetail.length} entries`
        : view === 'ticket' && ticket
          ? `Rev ${ticket.revision}`
          : `${entries} entries`;
  const message = route
    ? `${route.docNo} · ${route.originator} · ${markingOf(route.marking)?.label ?? route.marking}`
    : view === 'ticket' && ticket
      ? `${ticket.docNo}: ${ticketSubject(ticket)}`
      : view === 'incidents'
        ? 'Queue OIA. Enter opens the selected ticket.'
        : view === 'threats'
          ? 'Enter opens the selected register entry.'
          : view === 'review'
            ? auditor
              ? 'Audit trails of the issued operator accounts, read only.'
              : 'Audit review is open to Office of Internal Assurance auditors only.'
            : 'Record of workstation activity, newest first.';

  useEffect(() => {
    win.setTitle(title, docNo ?? '');
    win.setMarking(markingNow);
    win.setStatus(message);
  }, [title, docNo, markingNow, message]);

  /* ------------------------------------------------------- handheld width */

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setNarrow((e?.contentRect.width ?? 900) < 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = narrow || handheldActive.value;

  /* ------------------------------------------------------------ keyboard */

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'F5') {
      e.preventDefault();
      setNonce((n) => n + 1);
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      print();
    }
  };

  /* ------------------------------------------------------------- tree */

  const treeNodes: TreeNode[] = [
    {
      id: 'v:incidents',
      label: 'Incident queue',
      meta: `(${tickets.length})`,
      children: tickets.map((t) => ({ id: `k:${t.id}`, label: t.docNo })),
    },
    {
      id: 'v:threats',
      label: 'Threat register',
      meta: `(${threats.length})`,
      children: threats.map((t) => ({ id: `r:${t.id}`, label: `${t.docNo.slice(-2)} ${t.title.replace(/^Threat Register Entry \d+:\s*/, '')}` })),
    },
    {
      id: 'g:protocols',
      label: 'Security protocols',
      children: (['psec', 'comm', 'ctr'] as Kind[]).flatMap((k) => {
        const r = byKind(k);
        return r ? [{ id: `r:${r.id}`, label: k === 'ctr' ? 'Construction and contractors' : r.title.replace(/ Protocols$/, '') }] : [];
      }),
    },
    ...(['cg', 'cov'] as Kind[]).flatMap((k) => {
      const r = byKind(k);
      return r ? [{ id: `r:${r.id}`, label: k === 'cg' ? 'Classification guide' : 'Cover identity catalogue' }] : [];
    }),
    { id: 'v:activity', label: 'Your session activity' },
    { id: 'v:review', label: 'Audit review' },
  ];
  const selectedNode = route ? `r:${route.id}` : view === 'ticket' && ticket ? `k:${ticket.id}` : `v:${view}`;
  const pick = (id: string) => {
    if (id.startsWith('v:')) goInternal(id.slice(2) as Internal);
    else if (id.startsWith('k:')) openTicket(id.slice(2));
    else if (id.startsWith('r:')) {
      const r = own.find((x) => x.id === id.slice(2));
      if (r && r.id !== route?.id) nav(r.route);
    }
  };
  const flat = (ns: TreeNode[], depth = 0): { id: string; label: string }[] =>
    ns.flatMap((n) => [...(n.id.startsWith('g:') ? [] : [{ id: n.id, label: `${'  '.repeat(depth)}${n.label}` }]), ...flat(n.children ?? [], depth + 1)]);

  /* ------------------------------------------------------------- menus */

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: print },
        {
          label: 'Open in &Records Library',
          onSelect: () => {
            const target = route ?? (view === 'ticket' ? ticket : null);
            if (target && view === 'ticket') services.openRoute(target.route);
            else
              refuse({
                title: 'No record selected',
                body: 'Open an incident ticket first. Tickets are held in the Records Library under their OIA number; register entries are held by this office only.',
                reference: 'OSC-DIR-0412',
              });
          },
        },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Incident queue', radio: true, checked: view === 'incidents' || view === 'ticket', onSelect: () => goInternal('incidents') },
        { label: '&Threat register', radio: true, checked: view === 'threats' || (!!route && kindOf(route) === 'threat'), onSelect: () => goInternal('threats') },
        { label: 'C&lassification guide', radio: true, checked: !!route && kindOf(route) === 'cg', onSelect: () => goKind('cg') },
        { label: 'C&ontractor register', radio: true, checked: !!route && kindOf(route) === 'ctr', onSelect: () => goKind('ctr') },
        { label: 'Co&ver identity catalogue', radio: true, checked: !!route && kindOf(route) === 'cov', onSelect: () => goKind('cov') },
        { label: '&Personnel security', radio: true, checked: !!route && kindOf(route) === 'psec', onSelect: () => goKind('psec') },
        { label: 'Co&mmunications security', radio: true, checked: !!route && kindOf(route) === 'comm', onSelect: () => goKind('comm') },
        { label: '&Your session activity', radio: true, checked: view === 'activity', onSelect: () => goInternal('activity') },
        { label: '&Audit review', radio: true, checked: view === 'review', onSelect: () => goInternal('review') },
        { separator: true },
        { label: '&Navigation pane', checked: showNav, onSelect: () => setShowNav((s) => !s) },
        { label: '&Refresh', shortcut: 'F5', onSelect: () => setNonce((n) => n + 1) },
      ],
    },
    {
      label: '&Ticket',
      items: [
        {
          label: '&Open selected ticket',
          shortcut: 'Enter',
          onSelect: () => {
            const id = queueSel ?? tickets[0]?.id;
            if (id) openTicket(id);
            else refuse({ title: 'No ticket selected', body: 'There are no incident tickets in the queue visible to this operator.', reference: 'OIA' });
          },
        },
        { label: 'Add &worklog entry...', onSelect: worklogRefusal },
        {
          label: '&Reassign...',
          onSelect: () =>
            refuse({ title: 'Not available to this operator', body: 'Tickets are assigned and reassigned by the Office of Internal Assurance. Operators below Tier 2 cannot change the action officer.', reference: 'OIA' }),
        },
        {
          label: '&Close ticket...',
          onSelect: () =>
            refuse({ title: 'Not available to this operator', body: 'An incident ticket is closed by its action officer when the inquiry is complete. Closure is not made from an operator workstation.', reference: 'OIA' }),
        },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: '&Classification guide', onSelect: () => goKind('cg') },
        { label: 'MERIDIAN &Help Desk', onSelect: () => services.openApp('system') },
        { separator: true },
        {
          label: '&About Assurance',
          onSelect: () =>
            setNotice({
              kind: 'info',
              title: 'About Assurance',
              body: `Assurance, ${canon.meta.environment} release ${canon.meta.release}. Workbench of the Office of Internal Assurance: incident tickets, threat register, security protocols, classification guide, cover identity catalogue, contractor register and the operator's record of activity.`,
              reference: 'OIA/ALPHA-01',
            }),
        },
      ],
    },
  ];

  /* -------------------------------------------------------------- main */

  let main;
  if (tier4 && !route && view !== 'activity') {
    main = <Tier4Refusal what={INTERNAL_TITLE[view ?? 'incidents']} />;
  } else if (route) {
    main = canRead(services, route) ? <RouteView key={`${route.id}:${nonce}`} entry={route} threats={threats} nav={nav} onActivity={() => goInternal('activity')} /> : <RouteRefusal entry={route} />;
  } else if (view === 'ticket' && ticket) {
    main = <TicketView key={`${ticket.id}:${nonce}`} entry={ticket} onBack={() => goInternal('incidents')} onRefuseEdit={worklogRefusal} />;
  } else if (view === 'threats') {
    main = <ThreatRegister routes={threats} selected={threatSel} onSelect={setThreatSel} nav={nav} />;
  } else if (view === 'review') {
    main = <AuditReview key={nonce} />;
  } else if (view === 'activity') {
    main = <ActivityView key={nonce} scope={scope} onScope={setScope} filter={actFilter} onFilter={setActFilter} />;
  } else {
    main = <IncidentQueue key={nonce} tickets={tickets} selected={queueSel} onSelect={setQueueSel} onOpen={openTicket} filter={queueFilter} onFilter={setQueueFilter} />;
  }

  const tool = (label: string, active: boolean, fn: () => void, t: string) => <ToolbarButton label={label} pressed={active} onClick={fn} title={t} />;
  const k = route ? kindOf(route) : null;

  return (
    <div class={compact ? 'asr-app asr-app--compact' : 'asr-app'} ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Assurance menu" />
      <Toolbar label="Assurance views">
        {tool('Queue', view === 'incidents' || view === 'ticket', () => goInternal('incidents'), 'Incident queue')}
        {tool('Threats', view === 'threats' || k === 'threat', () => goInternal('threats'), 'Threat register')}
        {!compact && tool('Classification', k === 'cg', () => goKind('cg'), 'Classification guide')}
        {!compact && tool('Contractors', k === 'ctr', () => goKind('ctr'), 'Contractor register and compartment matrix')}
        {!compact && tool('Covers', k === 'cov', () => goKind('cov'), 'Cover identity catalogue')}
        {tool('Activity', view === 'activity', () => goInternal('activity'), 'Your session activity')}
        {auditor && tool('Review', view === 'review', () => goInternal('review'), 'Audit review of operator trails')}
        <ToolbarSeparator />
        <ToolbarButton label="Print" onClick={print} title="Print (Ctrl+P)" />
        {view === 'ticket' && ticket && <ToolbarButton label="Records Library" onClick={() => services.openRoute(ticket.route)} title={`Open ${ticket.docNo} in the Records Library`} />}
        <ToolbarSpacer />
      </Toolbar>
      {compact && (
        <div class="asr-handnav">
          <Select label="Go to" value={selectedNode} onChange={pick} options={flat(treeNodes).map((n) => ({ value: n.id, label: n.label }))} />
        </div>
      )}
      <div class="asr-body">
        {!compact && showNav && (
          <nav class="asr-nav" aria-label="Assurance navigation">
            <Tree
              nodes={treeNodes}
              label="Assurance contents"
              selectedId={selectedNode}
              onSelect={(n) => !n.id.startsWith('g:') && pick(n.id)}
              defaultExpanded={['v:incidents', 'v:threats', 'g:protocols']}
            />
          </nav>
        )}
        <main class="asr-main">
          <CompactCtx.Provider value={compact}>{main}</CompactCtx.Provider>
        </main>
      </div>
      <StatusBar
        panes={[
          { id: 'msg', content: message, fill: true },
          { id: 'count', content: count, width: 96, mono: true, label: 'Items' },
          { id: 'access', content: `T${services.session.tier.value} · ${services.session.compartments.value.join(' ') || 'NONE'}`, width: compact ? 90 : 170, mono: true, label: 'Access' },
          { id: 'audit', content: `AUD ${entries}`, width: 80, mono: true, label: 'Audit entries recorded' },
        ]}
      />
      <MessageBox
        open={!!notice}
        kind={notice?.kind ?? 'info'}
        title={notice?.title ?? ''}
        reference={notice?.reference ? `Ref ${notice.reference}` : undefined}
        onOpen={(kd) => kd !== 'info' && services.sound.play('error')}
        onClose={() => setNotice(null)}
      >
        {notice?.body}
      </MessageBox>
    </div>
  );
}

/** A route of this app: its interactive panel, then its document. */
function RouteView({ entry, threats, nav, onActivity }: { entry: RouteEntry; threats: RouteEntry[]; nav: (r: string) => void; onActivity: () => void }) {
  const state = useDoc(entry);
  const k = kindOf(entry);
  return (
    <div class="asr-view">
      {k === 'threat' && <ThreatPanel entry={entry} routes={threats} nav={nav} />}
      {k === 'cg' && <ClassificationPanel entry={entry} />}
      {k === 'ctr' && <ContractorPanel entry={entry} />}
      {k === 'cov' && <CoverPanel entry={entry} />}
      {k === 'psec' && <PersonnelSecurityPanel onActivity={onActivity} />}
      {k === 'comm' && <CommunicationsPanel />}
      <DocPane entry={entry} state={state} />
    </div>
  );
}

/** Tier 4: the office's registers are not open to this operator (DIR-0301). Logged once per view. */
function Tier4Refusal({ what }: { what: string }) {
  const services = useServices();
  useEffect(() => {
    services.audit.log('window.open', what, `Operator ${services.session.operatorId.peek()} requested Assurance ${what.toLowerCase()}. Request refused: requires Tier 3 access determination (OSC-DIR-0301).`);
    services.sound.play('error');
  }, [what]);
  return (
    <div class="asr-refusal">
      <RefusalState
        authority="Classification Control, Office of Internal Assurance"
        reference="OSC-DIR-0301"
        requirement="Tier 3 access determination"
        reason={`Requires Tier 3 access determination. The ${what.toLowerCase()} is not open to Tier 4 operators. Your own record of activity remains open under Your session activity.`}
      />
    </div>
  );
}
