/**
 * Reactor Plant Panel (docs/SPEC-2.md §3, DECISIONS "Reactor panel").
 *
 * One panel, two sources: the training simulator (fully operable by every account; a toy
 * point-kinetics model, shared plant state key `plant`) and the live remote display (mirrors the
 * telemetry worker; every control refuses in-world because no account is a qualified operator).
 * Views: panel, trends, one-line, plant event log, trip history; document routes /plant/*.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import { DocumentView, MenuBar, MessageBox, Select, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer } from '@design/index';
import type { MenuBarMenu, MenuItem, RedactionHoverInfo, StatusPane } from '@design/index';
import { ScanPage } from '@graphics/scan';
import { MarkingStrip as GMarkingStrip, Stamp } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { EmptyState, ErrorState, RefusalState } from '@graphics/states';
import type { GuardState } from '@graphics/panel';
import type { AppProps, DocJson, DrillState, IsolationState } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { siteLocal, zulu } from '@core/session';
import { ANN_HORN, ANN_IDS } from './model';
import type { Action, SimEvent } from './model';
import { P, canon, defaultUnit, rulesFor, unitById } from './data';
import type { PlantEvent, UnitDef } from './data';
import { Panel } from './Panel';
import type { PanelHandlers } from './Panel';
import { EventLog, OneLineView, SiteCell, Trends, TripHistory } from './Views';
import { recordTrip, useSim } from './useSim';
import { useLive } from './useLive';
import { PLANT_SHARED_NONE } from './types';
import type { BankId, DieselSelect, PlantShared, SimMode, SimState } from './types';
import './plant.css';
import { isolatedAt } from '@apps/isolate/state';

type View = 'panel' | 'trends' | 'oneline' | 'log' | 'trips';

interface DialogState {
  title: string;
  body: string;
  reference?: string;
  kind: 'info' | 'error';
}

const TITLE = 'Reactor Plant Panel';
const ISOLATION_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };
const VIEW_LABEL: Record<View, string> = { panel: 'Panel', trends: 'Trends', oneline: 'One-line diagram', log: 'Plant event log', trips: 'Trip history' };
const markingLabel = (m: MarkingId) => canon.markings.find((x) => x.id === m)?.label ?? m;

function MarkingStrip({ marking }: { marking: MarkingId }) {
  const m = canon.markings.find((x) => x.id === marking);
  return m ? <GMarkingStrip marking={m} /> : null;
}

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const def = services.account.def.value;
  const me = def.id;
  const operator = def.operatorId;
  const rules = useMemo(() => rulesFor(def), [def.id, def.tier]);
  const reducedMotion = services.settings.reducedMotion.value;

  /* ---- route: home (panel) or a document */
  const docRoute = route && route.route !== '/plant' ? route : null;

  const [view, setView] = useState<View>('panel');
  const [live, setLive] = useState(false);
  const [unitId, setUnitId] = useState<string>(() => defaultUnit(rules.simUnits, def.site)?.id ?? rules.simUnits[0]!.id);
  const [guard, setGuard] = useState<GuardState>('closed');
  const [lampTest, setLampTest] = useState(false);
  const [icIndex, setIcIndex] = useState(P.initialConditions.length - 1);
  const [logFilter, setLogFilter] = useState('ALL');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [message, setMessage] = useState('Ready');
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const rodPress = useRef<{ bank: BankId; dir: 1 | -1; from: number } | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => setNarrow((es[0]?.contentRect.width ?? 1000) < 760));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const units = live ? rules.liveUnits : rules.simUnits;
  const unit: UnitDef = unitById(unitId) ?? rules.simUnits[0]!;

  /* ---- shared plant state read by this panel */
  const isoState = services.shared.get<IsolationState>('isolation', ISOLATION_NONE).value;
  const drillState = services.shared.get<DrillState | null>('drill', null).value;
  const plantShared = services.shared.get<PlantShared>('plant', PLANT_SHARED_NONE).value;
  const isolated = isolatedAt(isoState, Date.now());
  const circuitUp = !isolated || unit.site === def.site;
  const drillAtSite =
    !!drillState && !!unit.site && (drillState.phase === 'propagating' || drillState.phase === 'sealed') && ['sealing', 'sealed'].includes(drillState.sites[unit.site]?.status ?? '');

  /* ---- mail helpers (once per account) */
  const deliverOnce = (id: string, slots?: Record<string, string>) => {
    if (services.mail.delivered.peek().includes(id)) return;
    services.mail.deliver(id, slots ? { slots } : undefined);
  };
  const nowLabel = () => {
    const d = new Date();
    return `${zulu(d)} (${siteLocal(d)})`;
  };

  /* ---- simulator events (trips, limits) */
  const onSimEvents = (events: SimEvent[], s: SimState) => {
    for (const e of events) {
      if (e.type === 'trip') {
        const rec = recordTrip(services, s.unit, e);
        services.audit.log(
          'control',
          'plant:trip',
          `Training simulator ${s.unit} tripped at operator ${operator}'s station (${e.manual ? 'manual' : 'automatic'}, first-out ${e.cause}, ${e.powerPct.toFixed(1)}% rated). Simulator trip record ${rec.id}.`,
          { unit: s.unit, cause: e.cause, manual: String(e.manual), powerPct: e.powerPct.toFixed(1), record: rec.id, simulator: 'true' },
        );
        setMessage(`Reactor trip: ${e.cause}.`);
        const slots = { unit: s.unit, time: nowLabel(), cause: e.cause, power: `${e.powerPct.toFixed(1)}%`, record: rec.id };
        deliverOnce(def.tier === 4 ? P.mail.simTripTier4 : P.mail.simTrip, slots);
        const mine = services.shared.get<PlantShared>('plant', PLANT_SHARED_NONE).peek().trips.filter((t) => t.by === me).length;
        if (mine >= P.mail.repeatedTripsCount) deliverOnce(P.mail.repeatedTrips, { count: String(mine), unit: s.unit });
      } else if (e.type === 'limit') {
        services.audit.log(
          'control',
          'plant:limit',
          `Training simulator ${s.unit} was run outside its limits at operator ${operator}'s station: ${e.parameter} ${e.value} (limit ${e.limit}) for more than ${P.limits.holdS} seconds without a trip.`,
          { unit: s.unit, parameter: e.parameter, value: e.value, limit: e.limit, simulator: 'true' },
        );
        deliverOnce(P.mail.outsideLimits, { unit: s.unit, parameter: e.parameter, value: e.value, limit: e.limit, time: nowLabel() });
      }
    }
  };

  const sim = useSim({ unit, services, rootRef, active: !docRoute && !live, onEvents: onSimEvents });
  const liveH = useLive(live && !docRoute ? unit : null, live && !docRoute, circuitUp);
  const state: SimState | null = live ? liveH.state : sim.state;

  /* ---- horn: loops while any window is unacknowledged on a visible simulator panel */
  const hornWanted = !live && !docRoute && sim.visible && ANN_IDS.some((id) => ANN_HORN.has(id) && sim.state.ann[id].seq === 'unack');
  const hornOn = useRef(false);
  useEffect(() => {
    if (hornWanted && !hornOn.current) {
      hornOn.current = true;
      services.sound.play('alarm');
    } else if (!hornWanted && hornOn.current) {
      hornOn.current = false;
      services.sound.stop('alarm');
    }
  }, [hornWanted]);
  useEffect(
    () => () => {
      if (hornOn.current) services.sound.stop('alarm');
    },
    [],
  );

  /* ---- document routes */
  useEffect(() => {
    if (!docRoute) {
      setDoc(null);
      return;
    }
    let alive = true;
    setDoc(null);
    setDocErr(null);
    win.setBusy(true);
    services.docs
      .load(docRoute.id)
      .then((d) => {
        if (!alive) return;
        setDoc(d);
        services.audit.log('doc.read', d.docNo, `Displayed ${d.docNo} (${markingLabel(d.marking)}) to operator ${operator} in the Reactor Plant Panel.`);
      })
      .catch((e: unknown) => alive && setDocErr(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && win.setBusy(false));
    return () => {
      alive = false;
      win.setBusy(false);
    };
  }, [docRoute?.id]);

  /* ---- title, marking, status */
  const marking: MarkingId = docRoute ? docRoute.marking : unit.reactor ? 'UMBRA-C' : 'UMBRA-R';
  useEffect(() => {
    if (docRoute) win.setTitle(docRoute.title, docRoute.docNo);
    else win.setTitle(`${TITLE}: ${unit.id} ${live ? 'live display' : 'training simulator'}`, '');
    win.setMarking(marking);
    win.setStatus(docRoute ? docRoute.docNo : `${unit.id} ${live ? 'LIVE' : 'SIM'}`);
  }, [docRoute?.id, unit.id, live, marking]);

  /* ---- refusals */
  const refuse = (title: string, body: string, reference: string, subject: string) => {
    services.audit.log('window.open', subject, `Operator ${operator} requested ${subject} at the Reactor Plant Panel. Request refused: ${body}`);
    services.sound.play('error');
    setDialog({ title, body, reference, kind: 'error' });
  };

  const refuseLive = (control: string) => {
    const body = `${unit.id} is displayed from plant telemetry. Plant controls are operated only from the ${unit.id} power plant control room by a licensed operator on the current watch bill. Operator ${operator} holds no reactor operator qualification (${P.qualification.watchBillRef}). The request has been recorded.`;
    refuse('Live plant control', body, `Ref ${P.qualification.watchBillRef}`, `${unit.id} live control: ${control}`);
    setMessage(`${control}: refused. Live display is read only.`);
    deliverOnce(P.mail.liveAttempt, { unit: unit.id, control, time: nowLabel() });
    // The deputy commander of the host site is told when someone else tries to work its unit.
    if (unit.site === 'ALPHA-02' && me !== 'deputy') {
      const already = services.traces.all.peek().some((t) => t.from === me && t.msgId === P.mail.liveAttemptCommand);
      if (!already) services.traces.post({ to: 'deputy', kind: 'mail.deliver', msgId: P.mail.liveAttemptCommand, subject: `Attempted operation of ${unit.id} controls` });
    }
  };

  /* ---- simulator actions with sound and audit */
  const audit = (action: string, detail: string, data: Record<string, string>) =>
    services.audit.log('control', `plant:${action}`, `Operator ${operator} ${detail} on training simulator ${unit.id}.`, { unit: unit.id, simulator: 'true', ...data });

  const run = (a: Action, okMessage: string) => {
    const r = sim.act(a);
    if (r.refused) {
      services.sound.play('error');
      setMessage(r.refused);
      return false;
    }
    setMessage(okMessage);
    return true;
  };

  const simHandlers: PanelHandlers = {
    rod: (bank, dir) => {
      if (dir === 0) {
        const p = rodPress.current;
        rodPress.current = null;
        sim.act({ type: 'rod', bank, dir: 0 });
        if (p) {
          const to = Math.round(sim.state.rods[bank]);
          if (to !== p.from) audit('rod', `${p.dir > 0 ? 'withdrew' : 'inserted'} the ${bank === 'SD' ? 'shutdown' : 'control'} bank from ${p.from} to ${to} steps`, { bank, from: String(p.from), to: String(to) });
        }
        return;
      }
      services.sound.play('button');
      if (run({ type: 'rod', bank, dir }, `${bank} bank ${dir > 0 ? 'withdrawing' : 'inserting'}.`)) rodPress.current = { bank, dir, from: Math.round(sim.state.rods[bank]) };
    },
    mode: (m: SimMode) => {
      services.sound.play('switch');
      const from = sim.state.mode;
      run({ type: 'mode', mode: m }, `Mode selector to ${m}.`);
      audit('mode', `turned the reactor mode selector from ${from} to ${m}`, { from, to: m });
    },
    guard: (next) => {
      services.sound.play('guard');
      setGuard(next);
      if (next === 'lifted') audit('guard', 'lifted the manual scram cover', { control: 'HS-RPS-01' });
    },
    scram: () => {
      setGuard('actuated');
      services.sound.play('relay');
      audit('scram', 'actuated manual reactor scram HS-RPS-01', { powerPct: (sim.state.n * 100).toFixed(1) });
      run({ type: 'scram' }, 'Manual scram.');
    },
    scramReset: () => {
      services.sound.play('button');
      if (run({ type: 'scramReset' }, 'Reactor trip reset.')) audit('trip.reset', 'reset the reactor trip', {});
    },
    pump: (pp, on) => {
      services.sound.play('button');
      if (sim.state.pumps[pp].on === on) return;
      services.sound.play('relay');
      run({ type: 'pump', pump: pp, on }, `Coolant pump ${pp} ${on ? 'start' : 'stop'}.`);
      audit('pump', `${on ? 'started' : 'stopped'} primary coolant pump ${pp}`, { pump: pp, on: String(on) });
    },
    turbineTrip: () => {
      services.sound.play('button');
      if (!sim.state.turbineLatched) return;
      services.sound.play('relay');
      run({ type: 'turbineTrip' }, 'Turbine tripped.');
      audit('turbine.trip', 'tripped the turbine', {});
    },
    turbineReset: () => {
      services.sound.play('button');
      if (sim.state.turbineLatched) return;
      if (run({ type: 'turbineReset' }, 'Turbine latched.')) audit('turbine.reset', 'latched the turbine', {});
    },
    genClose: () => {
      services.sound.play('button');
      if (sim.state.gen) return;
      if (run({ type: 'genClose' }, 'Generator breaker 52-G1 closed; station load transferring.')) {
        services.sound.play('relay');
        audit('gen.close', 'synchronised and closed generator breaker 52-G1', {});
      }
    },
    genOpen: () => {
      services.sound.play('button');
      if (!sim.state.gen) return;
      services.sound.play('relay');
      run({ type: 'genOpen' }, 'Generator breaker 52-G1 opened.');
      audit('gen.open', 'opened generator breaker 52-G1', {});
    },
    diesel: (d: DieselSelect) => {
      services.sound.play('switch');
      const from = sim.state.diesel;
      run({ type: 'diesel', select: d }, `Diesel selector to ${d}.`);
      audit('diesel', `turned the diesel set selector from ${from} to ${d}`, { from, to: d });
    },
    ack: () => {
      services.sound.play('button');
      const n = ANN_IDS.filter((id) => sim.state.ann[id].seq === 'unack').length;
      run({ type: 'ack' }, n ? `${n} alarm windows acknowledged.` : 'No unacknowledged windows.');
      if (n) {
        services.sound.stop('alarm');
        hornOn.current = false;
        services.sound.play('ack');
        audit('ack', `acknowledged ${n} annunciator windows`, { windows: String(n) });
      }
    },
    reset: () => {
      services.sound.play('button');
      const n = ANN_IDS.filter((id) => sim.state.ann[id].seq === 'ringback').length;
      run({ type: 'reset' }, n ? `${n} cleared windows reset.` : 'No windows to reset.');
      if (n) audit('reset', `reset ${n} cleared annunciator windows`, { windows: String(n) });
    },
    lampTest: (on) => {
      if (on) services.sound.play('button');
      setLampTest(on);
    },
    icSelect: (i) => {
      services.sound.play('switch');
      setIcIndex(i);
    },
    icLoad: () => {
      services.sound.play('button');
      const ic = P.initialConditions[icIndex]!;
      sim.loadIc(ic.id);
      setGuard('closed');
      setMessage(`Initial condition ${ic.id} ${ic.label} loaded.`);
      audit('ic', `loaded initial condition ${ic.id} (${ic.label})`, { ic: ic.id });
    },
    freeze: (on) => {
      services.sound.play('button');
      sim.setFrozen(on);
      setMessage(on ? 'Simulator frozen.' : 'Simulator running.');
      audit(on ? 'freeze' : 'run', on ? 'froze the simulator' : 'released the simulator from freeze', {});
    },
    link: (i) => {
      services.sound.play('switch');
      if (i === 1) goLive(true);
    },
  };

  const liveHandlers: PanelHandlers = {
    rod: (bank, dir) => dir !== 0 && refuseLive(`${bank} bank ${dir > 0 ? 'withdraw' : 'insert'}`),
    mode: (m) => refuseLive(`mode selector to ${m}`),
    guard: (next) => {
      if (next === 'lifted') refuseLive('manual scram cover');
    },
    scram: () => refuseLive('manual scram'),
    scramReset: () => refuseLive('trip reset'),
    pump: (pp, on) => refuseLive(`coolant pump ${pp} ${on ? 'start' : 'stop'}`),
    turbineTrip: () => refuseLive('turbine trip'),
    turbineReset: () => refuseLive('turbine reset'),
    genClose: () => refuseLive('generator breaker 52-G1 close'),
    genOpen: () => refuseLive('generator breaker 52-G1 open'),
    diesel: (d) => refuseLive(`diesel selector to ${d}`),
    ack: () => refuseLive('annunciator acknowledge'),
    reset: () => refuseLive('annunciator reset'),
    lampTest: (on) => {
      if (on) services.sound.play('button');
      setLampTest(on);
    },
    icSelect: () => refuseLive('initial condition selector'),
    icLoad: () => refuseLive('load initial condition'),
    freeze: () => refuseLive('simulator freeze'),
    link: (i) => {
      services.sound.play('switch');
      if (i === 0) goLive(false);
    },
  };

  /* ---- navigation */
  const goLive = (on: boolean) => {
    if (on && !rules.liveUnits.length) {
      refuse(
        'Live plant display',
        `No reactor plant is installed at ${def.site}. Remote plant displays are issued to stations at sites with a reactor installation. The part-task trainer remains available.`,
        'Ref DIR-0301',
        'Live plant display',
      );
      return;
    }
    if (on && !unit.reactor) setUnitId(defaultUnit(rules.liveUnits, def.site)?.id ?? rules.liveUnits[0]!.id);
    setGuard('closed');
    setLive(on);
    setMessage(on ? 'Plant link to LIVE. Remote display, read only.' : 'Plant link to SIM. Training simulator.');
  };

  const goView = (v: View) => {
    if (docRoute) win.navigate('/plant');
    if ((v === 'log' || v === 'oneline') && !rules.seesInstallations) {
      refuse(VIEW_LABEL[v], `No reactor installation is held at ${def.site}. Unit logs and station drawings are issued to sites with a plant.`, 'Ref DIR-0301', VIEW_LABEL[v]);
      return;
    }
    setView(v);
  };

  const chooseUnit = (id: string) => {
    if (id === unitId) return;
    setUnitId(id);
    setGuard('closed');
    setMessage(`${id} selected.`);
  };

  const onRef = (e: PlantEvent) => {
    const r = e.ref;
    if (/^RX-SP-/.test(r)) {
      refuse('Surveillance procedure', `Surveillance procedure ${r} is a controlled copy held in the ${e.unit} power plant control room. It is not issued to MERIDIAN workstations.`, 'Ref DIR-0301', r);
    } else if (/^(FE|LR)-\d{2}-\d{4}$/.test(r)) {
      refuse(
        'Work order or report',
        `${r} is held in the ${r.startsWith('FE') ? 'Facilities Engineering' : 'Logistics & Reserves'} maintenance system with its own distribution. This workstation is not on the distribution of ${r}. Citations of a work order can be looked up from the terminal (KB-0031).`,
        'Ref KB-0031',
        r,
      );
    } else {
      refuse('Booking record', `${r} is held by Network Control, Transit Operations. Bookings are not displayed outside Transit Control.`, 'Ref DIR-0301', r);
    }
  };

  const onRxHover = (i: RedactionHoverInfo) =>
    services.audit.log('redaction.hover', docRoute?.docNo ?? 'Reactor Plant Panel', `Operator ${operator} examined withheld material in the Reactor Plant Panel (${i.auth} ${i.ref}). No release was made.`);

  const printProcedure = () => {
    const d = services.docs.byDocNo(docRoute?.docNo ?? (def.tier === 4 ? P.panel.cardDocNo : P.panel.procedureDocNo));
    if (d) {
      services.print(d.id);
      setMessage(`${d.docNo} sent to the print queue.`);
    }
  };

  /* ---- keyboard */
  const toggleFreeze = () => (live ? refuseLive('simulator freeze') : simHandlers.freeze(!sim.frozen));
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'F6') {
      e.preventDefault();
      toggleFreeze();
    } else if (e.key === 'F7') {
      e.preventDefault();
      (live ? liveHandlers : simHandlers).ack([]);
    } else if (e.key === 'F8') {
      e.preventDefault();
      (live ? liveHandlers : simHandlers).reset([]);
    } else if (e.ctrlKey && !e.altKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      printProcedure();
    } else if (e.altKey && /^[1-5]$/.test(e.key)) {
      e.preventDefault();
      goView((['panel', 'trends', 'oneline', 'log', 'trips'] as View[])[Number(e.key) - 1]!);
    }
  };

  /* ---- menus */
  const isView = (v: View) => !docRoute && view === v;
  const unitItems: MenuItem[] = units.map((u) => ({ label: `${u.id}  ${u.designation}`, checked: u.id === unit.id, radio: true, onSelect: () => chooseUnit(u.id) }));
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: `&Print ${def.tier === 4 ? P.panel.cardDocNo : P.panel.procedureDocNo}...`, shortcut: 'Ctrl+P', onSelect: printProcedure },
        {
          label: 'Print panel &display...',
          onSelect: () => refuse('Print', 'Panel displays are not printed. Trend data and unit logs are released on request by the Reactor Operations Section.', 'Ref OSC-DIR-0319', 'Panel print'),
        },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Panel', shortcut: 'Alt+1', checked: isView('panel'), radio: true, onSelect: () => goView('panel') },
        { label: '&Trends', shortcut: 'Alt+2', checked: isView('trends'), radio: true, onSelect: () => goView('trends') },
        { label: '&One-line diagram', shortcut: 'Alt+3', checked: isView('oneline'), radio: true, onSelect: () => goView('oneline') },
        { label: 'Plant &event log', shortcut: 'Alt+4', checked: isView('log'), radio: true, onSelect: () => goView('log') },
        { label: 'Trip &history', shortcut: 'Alt+5', checked: isView('trips'), radio: true, onSelect: () => goView('trips') },
        { separator: true },
        { label: 'Training &simulator', checked: !live, radio: true, onSelect: () => goLive(false) },
        { label: '&Live plant display', checked: live, radio: true, onSelect: () => goLive(true) },
      ],
    },
    { label: '&Unit', items: unitItems },
    {
      label: '&Simulator',
      items: [
        { label: sim.frozen ? '&Run' : '&Freeze', shortcut: 'F6', onSelect: toggleFreeze },
        { separator: true },
        ...P.initialConditions.map((ic, i) => ({
          label: `Load ${ic.id} ${ic.label}`,
          onSelect: () => {
            if (live) {
              refuseLive('load initial condition');
              return;
            }
            setIcIndex(i);
            const s = P.initialConditions[i]!;
            sim.loadIc(s.id);
            setGuard('closed');
            setMessage(`Initial condition ${s.id} ${s.label} loaded.`);
            audit('ic', `loaded initial condition ${s.id} (${s.label})`, { ic: s.id });
          },
        })),
        { separator: true },
        { label: '&Acknowledge alarms', shortcut: 'F7', onSelect: () => (live ? liveHandlers : simHandlers).ack([]) },
        { label: 'Re&set cleared windows', shortcut: 'F8', onSelect: () => (live ? liveHandlers : simHandlers).reset([]) },
        { label: '&Lamp test', checked: lampTest, onSelect: () => setLampTest(!lampTest) },
        { separator: true },
        {
          label: 'Manual s&cram...',
          onSelect: () =>
            setDialog({
              title: 'Manual scram',
              kind: 'info',
              body: 'Manual scram is initiated only from the guarded switch HS-RPS-01 on the panel: lift the cover, then press and hold the switch. Escape closes the cover.',
              reference: `Ref ${P.panel.procedureDocNo}`,
            }),
        },
      ],
    },
    {
      label: '&Help',
      items: [
        ...(rules.seesInstallations ? [{ label: `Simulator operating &procedure (${P.panel.procedureDocNo})`, onSelect: () => services.openRoute('/plant/sim-procedure') }] : []),
        { label: `Simulator &quick reference (${P.panel.cardDocNo})`, onSelect: () => services.openRoute('/plant/sim-card') },
        ...(unit.reactor ? [{ label: `&Unit status page (OSC-RSV-${unit.id})`, onSelect: () => services.openRoute(`/reserves/reactor/${unit.id.toLowerCase()}`) }] : []),
        { separator: true },
        {
          label: '&About Reactor Plant Panel',
          onSelect: () =>
            setDialog({
              title: 'About Reactor Plant Panel',
              kind: 'info',
              body: `Reactor Plant Panel, ${canon.meta.environment} release ${canon.meta.release}. Part-task trainer software release ${P.panel.simulatorRelease}, panel ${P.panel.panelNo} revision ${P.panel.panelRev}. Simplified point-kinetics training model; not for engineering use. Live displays from plant telemetry, read only. Training authority: ${P.qualification.authority}.`,
            }),
        },
      ],
    },
  ];

  /* ---- status bar */
  const unackCount = state ? ANN_IDS.filter((id) => state.ann[id].seq === 'unack').length : 0;
  const simWord = sim.remote ? 'ANOTHER STATION' : sim.frozen ? 'FROZEN' : sim.running ? 'RUNNING' : 'STANDING';
  const panes: StatusPane[] = [
    { id: 'msg', fill: true, content: docRoute ? (doc ? 'Document displayed.' : docErr ? 'Document not available.' : 'Retrieving document.') : message },
    { id: 'unit', width: 90, mono: true, label: 'Unit', content: unit.id },
    {
      id: 'src',
      width: 190,
      mono: true,
      label: 'Source',
      content: live ? `LIVE ${liveH.link}` : `SIM ${simWord}`,
    },
    { id: 'pow', width: 110, mono: true, label: 'Power', content: state ? `${(live ? (liveH.latest?.power.thermalPct ?? 0) : state.n * 100).toFixed(1)}% RTP` : 'NO DATA' },
    { id: 'ann', width: 96, mono: true, label: 'Annunciator', content: `${unackCount} UNACK` },
    { id: 'mk', width: 190, label: 'Marking', content: markingLabel(marking) },
  ];

  /* ---- body */
  const sameUnitLive = live && liveH.link === 'LIVE' && liveH.latest;
  const telemetry = sameUnitLive && liveH.latest ? { loadMW: liveH.latest.power.loadMW, hz: liveH.latest.power.hz, busKV: liveH.latest.power.busKV, thermalPct: liveH.latest.power.thermalPct } : null;

  const linkNote = live ? (
    liveH.link === 'CIRCUIT DOWN' ? (
      <p class="plt-banner">
        <span class="st-sq st-fault" aria-hidden="true" /> Plant link to {unit.id} down: hub circuits isolated. Only the home-site unit reports while the network is isolated.
      </p>
    ) : liveH.link === 'NO SIMULATOR' ? (
      <p class="plt-banner">
        <span class="st-sq st-fault" aria-hidden="true" /> Telemetry service not available at this workstation.
      </p>
    ) : (
      <p class="plt-banner">
        <span class={`st-sq ${liveH.link === 'LIVE' ? 'st-nominal' : 'st-degraded'}`} aria-hidden="true" /> {unit.id} {unit.designation}, live from plant telemetry, read only.{' '}
        {unit.reactor ? `Unit status ${unit.reactor.status}: ${unit.reactor.statusNote}` : ''} Site: <SiteCell u={unit} onRxHover={onRxHover} />
      </p>
    )
  ) : (
    <p class="plt-banner">
      <span class={`st-sq ${sim.running ? 'st-nominal' : 'st-offline'}`} aria-hidden="true" /> Training simulator, {unit.id} {unit.designation}.{' '}
      {sim.remote
        ? `Running at another station (last operator ${services.account.all().find((a) => a.id === sim.lastBy)?.operatorId ?? 'not recorded'}). Any control taken here moves the simulator to this station.`
        : sim.frozen
          ? 'Frozen at this station. Press FREEZE again or F6 to run.'
          : sim.running
            ? 'Running at this station. The simulator is not connected to any plant.'
            : 'Standing. It runs while this panel is on screen.'}
      {unit.params.fwBOos ? ' Unit model carries the current limiting condition (feedwater pump B out of service).' : ''}
    </p>
  );

  const body = (() => {
    if (docRoute) {
      if (docErr)
        return (
          <ErrorState code="RD-DOC-0404" title="Document not available" body={`${docRoute.docNo} could not be retrieved from the document store.`} detail={docErr} />
        );
      if (!doc) return <p class="plt-note">Retrieving {docRoute.docNo}.</p>;
      return (
        <div class="plt-doc">
          <DocumentView
            doc={doc}
            markings={canon.markings}
            onNavigate={(r) => (r === '/plant' ? win.navigate('/plant') : services.openRoute(r))}
            onRedactionHover={(i) =>
              services.audit.log('redaction.hover', doc.docNo, `Operator ${operator} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)
            }
            slots={{ ScanPage: ScanPage as never, MarkingStrip, Seal: Seal as never, Stamp: Stamp as never }}
          />
        </div>
      );
    }
    if (view === 'panel')
      return (
        <div class="plt-pad">
          {linkNote}
          <Panel
            unit={unit}
            live={live}
            state={live && liveH.link !== 'LIVE' ? null : state}
            guard={live ? 'closed' : guard}
            lampTest={lampTest}
            narrow={narrow}
            reducedMotion={reducedMotion}
            frozen={sim.frozen}
            icIndex={icIndex}
            simTime={sim.state.t}
            telemetry={telemetry}
            drill={drillAtSite}
            on={live ? liveHandlers : simHandlers}
          />
        </div>
      );
    if (view === 'trends')
      return (
        <div class="plt-pad">
          {linkNote}
          <Trends live={live} unit={unit} samples={sim.trend} series={liveH.series} narrow={narrow} />
        </div>
      );
    if (view === 'oneline')
      return (
        <div class="plt-pad">
          {linkNote}
          <OneLineView unit={unit} live={live} state={live ? null : sim.state} loadMW={telemetry?.loadMW ?? null} />
        </div>
      );
    if (view === 'log')
      return (
        <div class="plt-pad">
          <EventLog filter={logFilter} onFilter={setLogFilter} onRef={onRef} onOpenUnit={(id) => { chooseUnit(id); setView('panel'); }} onRxHover={onRxHover} narrow={narrow} />
        </div>
      );
    return (
      <div class="plt-pad">
        <TripHistory
          trips={plantShared.trips}
          accounts={services.account.all()}
          visibleUnits={rules.simUnits.map((u) => u.id)}
          showLive={rules.seesInstallations}
          me={me}
        />
      </div>
    );
  })();

  const t4Refusal = docRoute && def.tier === 4 && !docRoute.t4 ? (
    <RefusalState authority="Classification Control, Office of Internal Assurance" reference="DIR-0301" reason="Requires Tier 3 access determination." />
  ) : null;

  return (
    <div class="plt" ref={rootRef} onKeyDown={onKeyDown} data-motion={reducedMotion ? 'reduced' : undefined}>
      <MenuBar menus={menus} label="Reactor Plant Panel menu" />
      <Toolbar label="Reactor Plant Panel toolbar">
        <ToolbarButton label="Panel" pressed={isView('panel')} onClick={() => goView('panel')} />
        <ToolbarButton label="Trends" pressed={isView('trends')} onClick={() => goView('trends')} />
        <ToolbarButton label="One-line" pressed={isView('oneline')} onClick={() => goView('oneline')} />
        <ToolbarButton label="Event log" pressed={isView('log')} onClick={() => goView('log')} />
        <ToolbarButton label="Trips" pressed={isView('trips')} onClick={() => goView('trips')} />
        <ToolbarSeparator />
        <ToolbarButton label="Simulator" pressed={!live} onClick={() => goLive(false)} />
        <ToolbarButton label="Live" pressed={live} onClick={() => goLive(true)} />
        <ToolbarSpacer />
        <div class="plt-unitsel">
          <Select label="Unit" layout="inline" value={unit.id} options={units.map((u) => ({ value: u.id, label: narrow ? u.id : `${u.id}  ${u.designation}` }))} onChange={chooseUnit} />
        </div>
      </Toolbar>
      <main class="plt-main" aria-label={docRoute ? docRoute.title : `${unit.id} ${VIEW_LABEL[view]}`}>
        {t4Refusal ?? body ?? <EmptyState title="Nothing displayed" body="Choose a view from the View menu." />}
      </main>
      <StatusBar panes={narrow ? panes.filter((p) => p.id !== 'mk' && p.id !== 'ann') : panes} />
      {dialog ? (
        <MessageBox open title={dialog.title} kind={dialog.kind} reference={dialog.reference} onClose={() => setDialog(null)}>
          {dialog.body}
        </MessageBox>
      ) : null}
    </div>
  );
}

