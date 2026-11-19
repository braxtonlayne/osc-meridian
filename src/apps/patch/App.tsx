/**
 * Hub Circuit Patch Panel (app id "patch"): the voice and data patch bays at the ALPHA hubs
 * (and the GAMMA-08 terminal block for its technician). Jack field with cords, circuit list,
 * line quality history, bay log, test set, operator position and monitor. Plant state is the
 * shared key `patch` (see types.ts); isolation kills inter-site circuits, a seal drill occupies
 * the order-relay circuits.
 */
import type { TargetedKeyboardEvent } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, DrillState, IsolationState, RouteEntry } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { handheldActive, useServices } from '@core/services';
import * as session from '@core/session';
import { isolatedAt } from '@shell/isolation';
import { RefusalState } from '@shell/adapters';
import { seg04 } from '@narrative/engine';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { Dialog, MenuBar, Select, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu } from '@design/index';
import { HUBS, PC, baySites, circuit, circuitsAt, cordOn, cordsAt, jackLabel, parseJack, siteCode, type LampContext } from './model';
import { bayAccess } from './rules';
import { ISO_NONE, bayName, useOps, type Refusal } from './ops';
import { BayView } from './Bay';
import { CircuitsView, LogView, QualityView } from './Views';
import { DocPane } from './DocPane';
import type { PatchState, TestKind } from './types';
import './patch.css';

const canon = canonJson as unknown as Canon;
type View = 'bay' | 'circuits' | 'quality' | 'log' | 'doc';
const VIEW_LABEL: Record<Exclude<View, 'doc'>, string> = { bay: 'Bay', circuits: 'Circuits', quality: 'Line quality', log: 'Bay log' };

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  return r.access.compartment ? `${r.access.compartment}+T${r.access.tier}` : `T${r.access.tier}`;
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const who = services.account.def.value;
  const t4 = who.tier >= 4;
  const now = session.tick.value;
  const state = services.shared.get<PatchState | null>('patch', null).value;
  const iso = services.shared.get<IsolationState>('isolation', ISO_NONE).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const reducedMotion = services.settings.reducedMotion.value;
  const handheld = handheldActive.value;
  const isolated = isolatedAt(iso, now);
  const ev = seg04.value;
  const segActive = !!ev && now >= ev.start && now <= ev.end;

  const sites = useMemo(() => baySites(who.site).filter((s) => bayAccess(who, s, HUBS) !== 'hidden'), [who.id]);
  const [site, setSite] = useState<string>(sites.includes(who.site) ? who.site : (sites[0] ?? who.site));
  const [view, setView] = useState<View>(route ? 'doc' : 'bay');
  const [selJack, setSelJack] = useState<string | null>(null);
  const [selCord, setSelCord] = useState<string | null>(null);
  const [selCircuit, setSelCircuit] = useState<string | null>(null);
  const [msg, setMsg] = useState('Ready');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setView(route ? 'doc' : 'bay'), [route?.id]);

  const sextant = services.clearance.satisfies('SEXTANT') || services.session.tier.value <= 2;
  const withheld = useMemo(() => {
    const out = new Set<string>();
    if (site !== who.site && !sextant) for (const c of circuitsAt(site)) if (c.class === 'network') out.add(c.id);
    return out;
  }, [site, who.site, sextant]);

  const lampCtx: LampContext = {
    now,
    isolated,
    drillRelay: drill?.phase === 'propagating',
    drillOrigin: canon.sealDrill.origin,
    seg04: segActive,
    calling: new Set(),
  };

  const ops = useOps({ services, who, state, isolation: iso, lampCtx, say: setMsg, refuse: setRefusal });
  if (ops.call && !['cleared', 'intercept', 'no-reply', 'dead', 'no-dial-tone', 'busy'].includes(ops.call.phase)) lampCtx.calling = new Set([ops.call.circuit]);

  /* ------------------------------------------------------------- documents */

  const docEntry = (docNo: string) => services.docs.byDocNo(docNo);
  const entry = view === 'doc' ? route : null;
  const refused = !!(entry && accessKey(entry) && !services.clearance.satisfies(accessKey(entry)!));
  useEffect(() => {
    if (refused && entry) services.audit.log('window.open', entry.docNo, `Operator ${services.session.operatorId.peek()} requested ${entry.docNo} in the Hub Circuit Patch Panel. Request refused: access determination not satisfied.`);
  }, [refused, entry?.docNo]);

  const openDoc = (docNo: string) => {
    const e = docEntry(docNo);
    if (!e) return setMsg(`${docNo} is not registered on this workstation.`);
    if (e.app === 'patch') win.navigate(e.route);
    else services.openRoute(e.route);
  };

  /* ------------------------------------------------------------- title */

  const marking: MarkingId = entry ? entry.marking : t4 ? 'TSSCI-OSC' : 'UMBRA-C';
  const title = entry ? entry.title : `${PC.panel.title}: ${bayName(site)}`;
  useEffect(() => {
    win.setTitle(title, entry?.docNo ?? '');
    win.setMarking(marking);
    win.setStatus(entry ? `${entry.docNo} rev ${entry.revision}` : `${bayName(site)} ${VIEW_LABEL[view as Exclude<View, 'doc'>] ?? ''}`);
  }, [title, marking, entry?.docNo, view, site]);

  /* ------------------------------------------------------------- selection */

  const go = (v: Exclude<View, 'doc'>) => {
    if (route) win.navigate('/patch');
    setView(v);
  };

  const changeSite = (s: string) => {
    if (s === site) return;
    setSite(s);
    setSelJack(null);
    setSelCord(null);
    setSelCircuit(null);
    services.sound.play('switch');
    const access = bayAccess(who, s, HUBS);
    setMsg(`Bay ${bayName(s)} (${s}) shown. ${access === 'operate' ? 'Operated from this position.' : 'View only from this position; monitoring may be available.'}`);
  };

  const onJack = (id: string) => {
    const pj = parseJack(id);
    if (pj.circuit) setSelCircuit(pj.circuit.id);
    if (selJack) {
      if (selJack === id) {
        setSelJack(null);
        setMsg('Selection cleared.');
        return;
      }
      const a = selJack;
      setSelJack(null);
      setSelCord(null);
      ops.attempt(site, a, id);
      return;
    }
    const cord = cordOn(state, site, id);
    if (cord) {
      setSelCord(cord.id);
      setMsg(`Cord ${cord.id} selected: ${jackLabel(cord.a)} to ${jackLabel(cord.b)} (${cord.purpose}). Delete removes it.`);
      return;
    }
    setSelJack(id);
    setSelCord(null);
    setMsg(`${jackLabel(id)} selected. Select a second jack to patch, or Escape.`);
  };

  const onCord = (id: string) => {
    const c = cordsAt(state, site).find((k) => k.id === id);
    if (!c) return;
    setSelCord(id);
    setSelJack(null);
    setMsg(`Cord ${c.id} selected: ${jackLabel(c.a)} to ${jackLabel(c.b)} (${c.purpose}). Delete removes it.`);
  };

  const removeSelected = () => {
    const c = cordsAt(state, site).find((k) => k.id === selCord);
    if (!c) return setMsg('No cord selected. Select a cord or a jack with a cord in it.');
    setSelCord(null);
    ops.remove(c);
  };

  const onDeleteAt = (jack: string) => {
    const c = cordOn(state, site, jack);
    if (!c) return setMsg(`No cord in ${jackLabel(jack)}.`);
    setSelCord(null);
    ops.remove(c);
  };

  const escape = () => {
    setSelJack(null);
    setSelCord(null);
    setMsg('Selection cleared.');
  };

  /** Patch a utility (test set, operator position, monitor) to the selected circuit's LINE jack. */
  const utilityTo = (u: 'TST' | 'OPR' | 'MON') => {
    const c = selCircuit ? circuit(selCircuit) : undefined;
    if (!c || !(c.a === site || c.b === site) || withheld.has(c.id)) return setMsg('Select a circuit in this bay first.');
    if (view !== 'bay') go('bay');
    ops.attempt(site, `${siteCode(site)}/${u}`, `${c.id}/L`);
  };

  const testCmd = (kind: TestKind) => {
    const tst = `${siteCode(site)}/TST`;
    const cord = cordOn(state, site, tst);
    const target = cord ? parseJack(cord.a === tst ? cord.b : cord.a).circuit : undefined;
    if (!target) return setMsg('The test set is not patched. Patch TEST SET to a LINE jack (Test > Connect test set to selected circuit).');
    if (view !== 'bay') go('bay');
    ops.startTest(site, target, kind);
  };

  const printRegister = () => {
    const e = docEntry(PC.panel.registerDocNo);
    if (!e || t4) {
      setRefusal({ title: 'Print', text: 'No register copy is held for this position.', reference: PC.panel.maintenanceDocNo });
      return;
    }
    services.print(e.id);
    setMsg(`${e.docNo} sent to the print queue.`);
  };

  /* ------------------------------------------------------------- keyboard and menus */

  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase();
    const inField = (e.target as HTMLElement).closest?.('input, select, textarea');
    if (e.ctrlKey && !e.altKey && ['1', '2', '3', '4'].includes(k)) {
      e.preventDefault();
      go((['bay', 'circuits', 'quality', 'log'] as const)[Number(k) - 1]!);
    } else if (e.ctrlKey && !e.altKey && k === 'p') {
      e.preventDefault();
      printRegister();
    } else if (e.ctrlKey && !e.altKey && k === 't') {
      e.preventDefault();
      utilityTo('TST');
    } else if (e.ctrlKey && !e.altKey && k === 'o') {
      e.preventDefault();
      utilityTo('OPR');
    } else if (e.ctrlKey && !e.altKey && k === 'r') {
      e.preventDefault();
      ops.endCall('abandoned');
    } else if (!inField && e.key === 'Delete' && selCord) {
      e.preventDefault();
      removeSelected();
    } else if (!inField && e.key === 'Escape' && (selJack || selCord)) {
      e.preventDefault();
      escape();
    }
  };

  // Digits dial while the operator position has dial tone. Listened for on the document, because
  // focus can fall back to the page body when a cord goes in; keys aimed at another window or a
  // text field are left alone.
  const dialable = !!ops.call && (ops.call.phase === 'dial-tone' || ops.call.phase === 'dialling');
  const pressRef = useRef(ops.press);
  pressRef.current = ops.press;
  useEffect(() => {
    if (!dialable) return;
    const onDoc = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || !/^[0-9*#]$/.test(e.key)) return;
      const t = e.target as HTMLElement | null;
      const mine = !t || t === document.body || !!rootRef.current?.contains(t);
      if (!mine || t?.closest?.('input, select, textarea')) return;
      e.preventDefault();
      pressRef.current(e.key);
    };
    document.addEventListener('keydown', onDoc);
    return () => document.removeEventListener('keydown', onDoc);
  }, [dialable]);

  const proc = docEntry(PC.panel.procedureDocNo);
  const reg = docEntry(PC.panel.registerDocNo);
  const maint = docEntry(PC.panel.maintenanceDocNo);

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        ...sites.map((s) => ({ label: `${bayName(s)}  ${s}`, checked: s === site, radio: true, onSelect: () => changeSite(s) })),
        { separator: true },
        { label: '&Print circuit register', shortcut: 'Ctrl+P', onSelect: printRegister },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+W', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Remove selected cord', shortcut: 'Del', disabled: !selCord, onSelect: removeSelected },
        { label: '&Clear selection', shortcut: 'Esc', onSelect: escape },
        {
          label: 'Copy circuit &id',
          disabled: !selCircuit,
          onSelect: () =>
            void navigator.clipboard
              ?.writeText(selCircuit ?? '')
              .then(() => setMsg(`${selCircuit} copied to the clipboard.`))
              .catch(() => setMsg('The clipboard is not available to this application.')),
        },
      ],
    },
    {
      label: '&View',
      items: (['bay', 'circuits', 'quality', 'log'] as const).map((v, i) => ({ label: VIEW_LABEL[v], shortcut: `Ctrl+${i + 1}`, checked: view === v, radio: true, onSelect: () => go(v) })),
    },
    {
      label: '&Test',
      items: [
        { label: 'Connect &test set to selected circuit', shortcut: 'Ctrl+T', onSelect: () => utilityTo('TST') },
        ...(t4 ? [] : [{ label: 'Connect &monitor to selected circuit', onSelect: () => utilityTo('MON') }]),
        { separator: true },
        { label: `T&one (${PC.tests.toneHz} Hz)`, onSelect: () => testCmd('tone') },
        { label: '&Loopback', onSelect: () => testCmd('loopback') },
        { label: 'Line &quality run', onSelect: () => testCmd('quality') },
        { label: '&Stop test', disabled: !ops.test || !!ops.test.outcome, onSelect: () => ops.abortTest() },
      ],
    },
    {
      label: '&Call',
      items: [
        { label: `Connect ${t4 ? 'handset' : 'operator position'} to selected circuit`, shortcut: 'Ctrl+O', onSelect: () => utilityTo('OPR') },
        { label: '&Release call', shortcut: 'Ctrl+R', disabled: !ops.call, onSelect: () => ops.endCall('abandoned') },
      ],
    },
    {
      label: '&Help',
      items: [
        ...(!t4 && proc ? [{ label: `&Operating instructions (${proc.docNo})`, onSelect: () => openDoc(proc.docNo) }] : []),
        ...(!t4 && reg ? [{ label: `Circuit &register (${reg.docNo})`, onSelect: () => openDoc(reg.docNo) }] : []),
        ...(maint ? [{ label: `&Maintenance circuit (${maint.docNo})`, onSelect: () => openDoc(maint.docNo) }] : []),
      ],
    },
  ];

  /* ------------------------------------------------------------- body */

  const common = { site, state, isolated, withheld, t4, lampCtx, accounts: services.account.all() };
  let body;
  if (view === 'doc' && entry) {
    body = refused ? (
      <RefusalState
        authority="Classification Control, Office of Internal Assurance"
        reference={entry.docNo}
        docNo={entry.docNo}
        reason={`Display of ${entry.docNo} to this operator is not authorised by the current access determination.`}
        requirement={`Tier ${entry.access!.tier}${entry.access!.compartment ? ` and ${entry.access!.compartment} compartment briefing` : ''}`}
      />
    ) : (
      <DocPane entry={entry} services={services} />
    );
  } else if (view === 'circuits') {
    body = (
      <CircuitsView
        {...common}
        selected={selCircuit}
        onSelect={(id) => setSelCircuit(id)}
        onOpen={(id) => {
          setSelCircuit(id);
          setView('bay');
        }}
      />
    );
  } else if (view === 'quality') {
    body = <QualityView {...common} selected={selCircuit} now={now} onSelect={(id) => setSelCircuit(id)} />;
  } else if (view === 'log') {
    body = <LogView {...common} />;
  } else {
    body = (
      <BayView
        site={site}
        state={state}
        lampCtx={lampCtx}
        isolated={isolated}
        withheld={withheld}
        t4={t4}
        observer={who.id === 'auditor'}
        selectedJack={selJack}
        selectedCord={selCord}
        selectedCircuit={selCircuit}
        ops={ops}
        reducedMotion={reducedMotion}
        now={now}
        onJack={onJack}
        onDrop={(a, b) => {
          setSelJack(null);
          setSelCord(null);
          const pj = parseJack(a);
          if (pj.circuit) setSelCircuit(pj.circuit.id);
          ops.attempt(site, a, b);
        }}
        onCord={onCord}
        onDeleteAt={onDeleteAt}
        onEscape={escape}
      />
    );
  }

  const access = bayAccess(who, site, HUBS);
  const cordsHere = cordsAt(state, site);
  const noOrder = cordsHere.filter((k) => k.purpose === 'repatch' && !k.authorised).length;
  const panes = [
    { id: 'msg', content: msg, fill: true, label: 'Message' },
    { id: 'bay', content: `${bayName(site)} ${access === 'operate' ? 'OPERATE' : 'VIEW'}`, width: 120, mono: true, label: 'Bay' },
    { id: 'cords', content: `Cords ${cordsHere.length}${noOrder ? ` (${noOrder} no order)` : ''}`, width: 130, label: 'Cords standing' },
    { id: 'net', content: isolated ? 'NETWORK ISOLATED' : t4 ? 'Circuits normal' : 'Network normal', width: 130, label: 'Network' },
    { id: 'clock', content: `${session.zulu(new Date(now))} ${session.formatInWorldDate(new Date(now))}`, width: 130, mono: true, label: 'Time' },
  ].filter((p) => !handheld || p.id === 'msg' || p.id === 'bay');

  return (
    <div class={`pt-app${handheld ? ' pt-app--handheld' : ''}`} ref={rootRef} onKeyDown={onKeyDown} data-motion={reducedMotion ? 'reduced' : undefined}>
      <MenuBar menus={menus} label="Hub Circuit Patch Panel menu" />
      <Toolbar label="Patch panel">
        {(['bay', 'circuits', 'quality', 'log'] as const).map((v) => (
          <ToolbarButton key={v} label={VIEW_LABEL[v]} pressed={view === v} title={`${VIEW_LABEL[v]} (Ctrl+${['bay', 'circuits', 'quality', 'log'].indexOf(v) + 1})`} onClick={() => go(v)} />
        ))}
        <ToolbarSeparator />
        <ToolbarButton label="Test set" title="Connect test set to selected circuit (Ctrl+T)" onClick={() => utilityTo('TST')} />
        <ToolbarButton label={t4 ? 'Handset' : 'Operator'} title="Connect operator position to selected circuit (Ctrl+O)" onClick={() => utilityTo('OPR')} />
        <ToolbarButton label="Remove cord" title="Remove selected cord (Del)" disabled={!selCord} onClick={removeSelected} />
        <ToolbarSpacer />
        {sites.length > 1 ? (
          <span class="pt-bay-select">
            <Select label="Bay" value={site} options={sites.map((s) => ({ value: s, label: `${bayName(s)} ${s}` }))} onChange={changeSite} />
          </span>
        ) : null}
      </Toolbar>
      {isolated && !entry ? (
        <div class="pt-isonote" role="status">
          <span class="st-sq st-fault" aria-hidden="true" /> Network isolated. Inter-site circuits dead at every bay; local circuits and patches unaffected.
        </div>
      ) : null}
      <main class="pt-main" aria-label={title}>
        {view === 'doc' && entry ? (
          <div class="pt-docbar">
            <ToolbarButton label="Return to bay" onClick={() => go('bay')} />
          </div>
        ) : null}
        {body}
      </main>
      <StatusBar panes={panes} />
      <Dialog
        open={!!refusal}
        title={refusal?.title ?? ''}
        kind="info"
        reference={refusal ? `Ref ${refusal.reference}` : undefined}
        onClose={() => setRefusal(null)}
        buttons={[{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }]}
      >
        <p>{refusal?.text}</p>
      </Dialog>
      <Dialog
        open={!!ops.confirm}
        title="Repatch without circuit order"
        kind="warning"
        reference={`Ref ${PC.panel.procedureDocNo} para 5`}
        onClose={(v) => ops.confirmPending(v === 'yes')}
        buttons={[
          { label: '&Patch without order', value: 'yes' },
          { label: 'Cancel', value: 'no', isDefault: true, isCancel: true },
        ]}
      >
        <p>{ops.confirm?.text}</p>
      </Dialog>
    </div>
  );
}
