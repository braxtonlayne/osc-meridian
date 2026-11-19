/**
 * Dispatcher Workstation (Transit Control desk, ALPHA-02).
 *
 * Set a route over rail segments or tram links (click platforms on the line diagram in order,
 * or choose origin and destination), choose a consist from the spare stock where it stands,
 * clear signals and dispatch. The train is written to shared plant state (`dispatch`) and runs
 * in the transit simulation alongside the timetable, visible in Transit Control and on video.
 * The interlocking enforces conflicts, possessions, network isolation and seal drills.
 *
 * Desk modes per account (canon fragment `modes`): the deputy commander works the live desk;
 * the analyst and the auditor have the training simulator (and the auditor the dispatch log);
 * the Tier 4 technician sees the tram platform indicator for their own site only.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import canonJson from '@canon';
import type { Canon, MarkingId } from '@core/canon-types';
import type { AccountId, AppProps, DocJson, DrillState, IsolationState, RouteEntry } from '@core/contracts';
import { formatInWorldDate, IN_WORLD_DATE_ISO } from '@core/session';
import { useServices } from '@core/services';
import { DocumentView, MenuBar, MessageBox, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, type MenuBarMenu, type MenuItem } from '@design/index';
import { Icon } from '@graphics/icons';
import { annunciatorStep, ANN_NORMAL, type AnnPoint } from '@graphics/panel';
import { RefusalState } from '@graphics/states';
import { hhmmLocal, hhmmssZ, hhmmZ, zoneForState } from '@sim/time';
import { movementsAround, NO_PLANT, runState, type RunState } from '@sim/transit-model';
import { allPossessions, deskBoard, platformTimetable, useDeskData, useNow } from './data';
import {
  autoRoute,
  cancel,
  cancelCheck,
  checkRoute,
  conflictText,
  crossesSeg04,
  DSP,
  KEY_INSTR,
  KEY_NORMAL,
  manualHold,
  modeFor,
  newRecord,
  nextRef,
  plantOf,
  release,
  releaseCheck,
  SEG04,
  settle,
  stepRoute,
  stockPositions,
  systemOf,
} from './logic';
import { DeskPanel, type AnnInputs, ANN_TILES } from './panel';
import { DeskBoard, LogView, PlatformView, Register } from './views';
import type { DispatchRecord } from './types';
import './dispatch.css';

const canon = canonJson as unknown as Canon;
const NC_ZONE = zoneForState('VA');
const DOC_IDS = { procedure: 'dispatch-procedure', reference: 'dispatch-reference', platform: 'dispatch-platform-notice' } as const;

type View = 'desk' | 'log' | 'platform' | 'document';
export type RouteState = 'none' | 'pending' | 'setting' | 'set';
export type SignalState = 'stop' | 'clearing' | 'release' | 'clear';

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
  const me = services.account.id.value;
  const acct = services.account.def.value;
  const op = services.session.operatorId.value;
  const mode = modeFor(me);
  const isHome = !route || route.route === '/dispatch';
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const [view, setView] = useState<View>(isHome ? (mode === 'platform' ? 'platform' : mode === 'review' ? 'log' : 'desk') : 'document');
  const [training, setTrainingMode] = useState(mode !== 'live');
  const [notice, setNotice] = useState<Notice | null>(null);

  /* plant state */
  const liveRecs = services.shared.get<DispatchRecord[]>('dispatch', []).value ?? [];
  const isolation = services.shared.get<IsolationState | null>('isolation', null).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const livePlant = useMemo(() => plantOf(isolation, drill), [isolation, drill]);
  const [trainRecs, setTrainRecs] = useState<DispatchRecord[]>([]);
  const recs = training ? trainRecs : liveRecs;
  const plant = training ? NO_PLANT : livePlant;
  const scale = training ? DSP.training.timeScale : 1;

  const data = useDeskData(services);
  const { model } = data;
  const now = useNow();
  const possessions = useMemo(() => allPossessions(model, now), [model, Math.floor(now / 60_000)]);
  const moves = useMemo(() => (training ? [] : movementsAround(model, data.timetable, now, possessions, DSP.working.lookaheadDays)), [model, data.timetable, training, Math.floor(now / 60_000), possessions]);
  const board = useMemo(() => deskBoard(now, data, recs, plant, !training), [now, data, recs, plant, training]);

  /* desk state */
  const [routeNodes, setRouteNodes] = useState<string[]>([]);
  const [routeState, setRouteState] = useState<RouteState>('none');
  const [signal, setSignal] = useState<SignalState>('stop');
  const [consist, setConsist] = useState('');
  const [offset, setOffset] = useState(0);
  const [keyPos, setKeyPos] = useState(KEY_NORMAL);
  const [instruction, setInstruction] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<{ conflict: boolean; possession: boolean; seg04: boolean }>({ conflict: false, possession: false, seg04: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [network, setNetwork] = useState<'ALL' | 'RAIL' | 'EASTERN' | 'SOUTHERN' | 'MOUNTAIN_WESTERN' | 'CENTRAL'>('ALL');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const system = systemOf(model, routeNodes);
  const positions = useMemo(() => stockPositions(model, recs, plant, now), [model, recs, plant, now]);
  const opForAcct = (id: AccountId) => services.account.all().find((a) => a.id === id)?.operatorId ?? id;
  const deskName = training ? DSP.training.plate[0]! : DSP.desk.name;

  /* ---------------------------------------------------------------- audit and mail */

  const control = (action: string, detail: string, data: Record<string, string> = {}) =>
    services.audit.log('control', `dispatch:${action}`, `Operator ${op} ${detail} (Dispatcher Workstation, ${deskName}).`, { desk: training ? 'TRAINING' : DSP.desk.id, ...data });

  const refuse = (title: string, body: string, reference: string, action: string, kind: Notice['kind'] = 'warning') => {
    setNotice({ title, kind, body, reference });
    services.audit.log('window.open', `dispatch:${action}`, `Operator ${op} was refused at the Dispatcher Workstation: ${body}`);
  };

  const delivered = (msgId: string) => services.mail.delivered.peek().includes(msgId);
  const deliverTo = (to: AccountId, msgId: string, subject: string, slots?: Record<string, string>) => {
    if (to === me) services.mail.deliver(msgId, { slots: { date: formatInWorldDate(), ...slots }, repeat: delivered(msgId) });
    else services.traces.post({ to, kind: 'mail.deliver', msgId, subject });
  };

  /* ------------------------------------------------- housekeeping (latch, status, notices) */

  useEffect(() => {
    // Live records: any open desk keeps the shared record in step with the run model.
    const needs = liveRecs.some((r) => settle(model, r, livePlant, now) !== r);
    if (needs) services.shared.update<DispatchRecord[]>('dispatch', [], (prev) => (prev ?? []).map((r) => settle(model, r, livePlant, now)));
    // A train brought to a stand by network isolation: one notice per isolation to whoever entered it.
    for (const r of liveRecs) {
      const st = runState(model, r, livePlant, now);
      for (const h of st.heldBy) {
        if (h.kind !== 'isolation' || r.notified.includes(`iso:${h.ref}`)) continue;
        deliverTo(r.by, DSP.mail.isolationHold, 'Movement held: network isolation');
        services.shared.update<DispatchRecord[]>('dispatch', [], (prev) => (prev ?? []).map((x) => (x.ref === r.ref ? { ...x, notified: [...x.notified, `iso:${h.ref}`] } : x)));
        services.audit.log('control', 'dispatch:held', `Movement ${r.ref} brought to a stand by network isolation ${h.ref}; notice sent to the entering desk.`, { ref: r.ref, hold: h.ref, by: r.by });
      }
    }
    if (trainRecs.some((r) => settle(model, r, NO_PLANT, now) !== r)) setTrainRecs((prev) => prev.map((r) => settle(model, r, NO_PLANT, now)));
  }, [now]);

  /* ------------------------------------------------------------------ annunciator */

  const anyHeld = recs.some((r) => runState(model, r, plant, now).status === 'held');
  const inputs: AnnInputs = {
    conflict: lastCheck.conflict,
    possession: lastCheck.possession,
    seg04: lastCheck.seg04 || (crossesSeg04(model, routeNodes) && routeState !== 'none'),
    isolation: !training && board.holds.isolation !== null,
    drill: !training && board.holds.drill !== null,
    held: anyHeld,
    release: signal === 'release',
  };
  const [ann, setAnn] = useState<Record<string, AnnPoint>>(() => Object.fromEntries(ANN_TILES.map((t) => [t.id, ANN_NORMAL])));
  const inputKey = ANN_TILES.map((t) => (inputs[t.id] ? 1 : 0)).join('');
  useEffect(() => {
    let alarm = false;
    setAnn((prev) => {
      const next = { ...prev };
      for (const t of ANN_TILES) {
        const p = prev[t.id] ?? ANN_NORMAL;
        const q = annunciatorStep(p, inputs[t.id] ? 'abnormal' : 'normal');
        if (q.seq === 'unack' && p.seq !== 'unack' && t.priority !== 'status') alarm = true;
        next[t.id] = q;
      }
      return next;
    });
    if (alarm) services.sound.play('alarm');
  }, [inputKey]);
  useEffect(() => () => services.sound.stop('alarm'), []);
  const onAck = (ids: string[]) => {
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = annunciatorStep(next[id] ?? ANN_NORMAL, 'ack');
      return next;
    });
    services.sound.stop('alarm');
    services.sound.play('ack');
    control('ack', `acknowledged desk annunciator ${ids.join(', ')}`, { tiles: ids.join(',') });
  };
  const onReset = (ids: string[]) =>
    setAnn((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = annunciatorStep(next[id] ?? ANN_NORMAL, 'reset');
      return next;
    });

  /* ---------------------------------------------------------------- desk actions */

  const resetDesk = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setRouteNodes([]);
    setRouteState('none');
    setSignal('stop');
    setInstruction(null);
    setLastCheck({ conflict: false, possession: false, seg04: false });
  };

  const liveRefusal = (): boolean => {
    if (mode === 'platform') {
      refuse('Dispatcher Workstation', 'The desk is not available at this workstation. Requires Tier 3 access determination.', 'Ref DIR-0301', 'desk');
      return true;
    }
    return false;
  };

  const routeLocked = () => {
    if (routeState === 'setting' || routeState === 'set') {
      setNotice({ title: 'Route set', kind: 'info', body: 'A route is set from this desk. Cancel it (Esc) before building another.', reference: `Ref ${DSP.desk.procedureDocNo}` });
      return true;
    }
    return false;
  };

  const applyStep = (r: ReturnType<typeof stepRoute>, how: string) => {
    if (!r.ok) {
      if (r.code === 'seg04' || r.code === 'seg04-engrg') {
        setLastCheck((c) => ({ ...c, seg04: true }));
        services.sound.play('relay');
      }
      refuse('Route not set', r.text, r.code.startsWith('seg04') ? 'Ref OSC-TRN-SEG-04' : `Ref ${DSP.desk.referenceDocNo}`, 'route-refused');
      control('route-refused', `was refused a route by the interlocking (${r.code})`, { code: r.code, route: routeNodes.join('>'), how });
      return;
    }
    setRouteNodes(r.route);
    setRouteState(r.route.length >= 2 ? 'pending' : 'none');
    setLastCheck({ conflict: false, possession: false, seg04: false });
    if (r.route.length >= 2 && !positions.some((p) => p.stock.id === consist && p.at === r.route[0])) setConsist('');
  };

  const onNode = (id: string) => {
    if (view !== 'desk' || liveRefusal() || routeLocked()) return;
    services.sound.play('switch');
    if (!routeNodes.length) return applyStep({ ok: true, route: [id], system: 'RAIL' }, 'origin');
    if (routeNodes.length === 1 && routeNodes[0] === id) return applyStep({ ok: true, route: [], system: 'RAIL' }, 'clear');
    const last = routeNodes[routeNodes.length - 1]!;
    const adjacent = model.links.some((l) => (l.a === last && l.b === id) || (l.b === last && l.a === id));
    applyStep(adjacent ? stepRoute(model, routeNodes, id, training ? KEY_NORMAL : keyPos) : autoRoute(model, routeNodes[0]!, id, training ? KEY_NORMAL : keyPos), adjacent ? 'step' : 'origin-destination');
  };

  const onLink = (key: string) => {
    if (view !== 'desk' || liveRefusal() || routeLocked()) return;
    const l = model.byKey[key];
    if (!l) return;
    const last = routeNodes[routeNodes.length - 1];
    if (!last) return applyStep({ ok: true, route: [l.a], system: l.kind }, 'link');
    if (last === l.a || last === l.b) {
      services.sound.play('switch');
      applyStep(stepRoute(model, routeNodes, last === l.a ? l.b : l.a, training ? KEY_NORMAL : keyPos), 'link');
    }
  };

  const setOrigin = (id: string) => {
    if (routeLocked()) return;
    applyStep({ ok: true, route: id ? [id] : [], system: 'RAIL' }, 'origin');
  };
  const setDestination = (id: string) => {
    if (routeLocked() || !routeNodes[0] || !id) return;
    applyStep(autoRoute(model, routeNodes[0], id, training ? KEY_NORMAL : keyPos), 'origin-destination');
  };

  const departAt = () => now + (DSP.working.departOffsetsMin[offset] ?? 0) * 60_000;

  const interlockHolds = (): boolean => {
    if (training) return false;
    if (board.holds.isolation) {
      refuse('Network isolated', `Route setting and signal clearance are suspended while the network is isolated (${board.holds.isolation}). Hub circuits down.`, `Ref ${DSP.desk.procedureDocNo}`, 'isolated', 'error');
      return true;
    }
    if (board.holds.drill) {
      refuse('Seal drill in progress', `Portal seal doors are closed under seal drill ${board.holds.drill}. No route is set and no signal cleared until the drill stands down.`, `Ref ${DSP.desk.procedureDocNo}`, 'drill', 'error');
      return true;
    }
    return false;
  };

  const setRoute = () => {
    if (liveRefusal()) return;
    if (routeNodes.length < 2) {
      setNotice({ title: 'Set route', kind: 'info', body: 'Choose an origin and a destination, or click platforms on the diagram in order.', reference: `Ref ${DSP.desk.procedureDocNo}` });
      return;
    }
    if (routeState !== 'pending') return;
    if (interlockHolds()) return;
    const chk = checkRoute(model, routeNodes, departAt(), moves, recs, possessions, plant, now, scale);
    services.sound.play('button');
    if (chk.conflicts.length) {
      const poss = chk.conflicts.some((c) => c.kind === 'possession');
      setLastCheck({ conflict: chk.conflicts.some((c) => c.kind !== 'possession'), possession: poss, seg04: false });
      const lines = [...new Set(chk.conflicts.map(conflictText))];
      refuse('Route not set', `Interlocking refused the route. ${lines.join(' ')}`, `Ref ${DSP.desk.referenceDocNo}`, 'route-conflict', 'error');
      control('route-conflict', `was refused route ${routeNodes.join(' to ')} for conflict`, { route: routeNodes.join('>'), conflicts: lines.join(' | '), depart: hhmmZ(departAt()) });
      if (!training && !delivered(DSP.mail.conflict))
        deliverTo(me, DSP.mail.conflict, 'Route refused: conflicting movement', { route: routeNodes.join(' to '), conflict: lines[0] ?? '', time: `${hhmmZ(now)} (${hhmmLocal(now, NC_ZONE)})` });
      return;
    }
    setRouteState('setting');
    later(DSP.working.routeSetMs, () => {
      setRouteState('set');
      services.sound.play('relay');
    });
    control('route-set', `set route ${routeNodes.join(' to ')}`, { route: routeNodes.join('>'), system: system ?? '', seg04: crossesSeg04(model, routeNodes) ? 'yes' : 'no' });
  };

  const cancelRoute = () => {
    if (routeState === 'none' && !routeNodes.length) return;
    const was = routeNodes.join('>');
    resetDesk();
    services.sound.play('relay');
    if (routeState === 'set' || routeState === 'setting') control('route-cancel', `cancelled route ${was}${signal === 'clear' ? '; signals replaced to danger' : ''}`, { route: was });
  };

  const clearSignals = () => {
    if (liveRefusal()) return;
    if (routeState !== 'set') {
      setNotice({ title: 'Clear signals', kind: 'info', body: 'Signals are cleared only over a set route.', reference: `Ref ${DSP.desk.procedureDocNo}` });
      return;
    }
    if (signal !== 'stop') return;
    const pos = positions.find((p) => p.stock.id === consist);
    if (!pos) {
      setNotice({ title: 'Clear signals', kind: 'info', body: 'Select a consist standing at the origin platform before clearing the starting signal.', reference: `Ref ${DSP.desk.procedureDocNo}` });
      return;
    }
    if (pos.stock.system !== system) {
      refuse('Signal not cleared', `${pos.stock.id} is ${pos.stock.system === 'RAIL' ? 'a rail' : 'a tram'} consist. The route is set over ${system === 'RAIL' ? 'rail segments' : 'tram links'}.`, `Ref ${DSP.desk.referenceDocNo}`, 'consist');
      return;
    }
    if (!pos.stock.available || pos.at !== routeNodes[0]) {
      refuse('Signal not cleared', !pos.stock.available ? `${pos.stock.id}: ${pos.stock.remark}` : `${pos.stock.id} is not at ${routeNodes[0]}. ${pos.at ? `It stands at ${pos.at}.` : 'It is out on a run.'}`, 'Ref OSC-TRN-RS', 'consist');
      return;
    }
    if (interlockHolds()) return;
    services.sound.play('button');
    if (!training && crossesSeg04(model, routeNodes)) {
      setSignal('release');
      control('release-request', `requested release from ${SEG04.releaseDesk} for a route over segment ${SEG04.segment} with key ${SEG04.keyNo} at position ${SEG04.positions[keyPos]}`, { route: routeNodes.join('>'), key: SEG04.positions[keyPos] ?? '' });
      later(SEG04.releaseDelayMs, () => {
        setInstruction(SEG04.instructionNo);
        setSignal('clear');
        services.sound.play('relay');
        setNotice({
          title: `Release from ${SEG04.releaseDesk}`,
          kind: 'info',
          body: `Release given. Movement to run under instruction ${SEG04.instructionNo}. Consist identity to be suppressed on the board. No entry to be made in the working timetable.`,
          reference: `Instruction ${SEG04.instructionNo}`,
        });
        control('release-given', `received release from ${SEG04.releaseDesk} under instruction ${SEG04.instructionNo}`, { instruction: SEG04.instructionNo });
      });
      return;
    }
    setSignal('clearing');
    later(DSP.working.signalClearMs, () => {
      setSignal('clear');
      services.sound.play('relay');
    });
    control('signals-clear', `cleared signals over route ${routeNodes.join(' to ')} for consist ${consist}`, { route: routeNodes.join('>'), consist });
  };

  const dispatchTrain = () => {
    if (liveRefusal()) return;
    if (signal !== 'clear') {
      setNotice({ title: 'Dispatch', kind: 'info', body: 'The starting signal is at danger. Set the route and clear signals first.', reference: `Ref ${DSP.desk.procedureDocNo}` });
      return;
    }
    if (interlockHolds()) {
      setSignal('stop');
      return;
    }
    const dep = departAt();
    const chk = checkRoute(model, routeNodes, dep, moves, recs, possessions, plant, now, scale);
    if (chk.conflicts.length) {
      setSignal('stop');
      setLastCheck({ conflict: true, possession: chk.conflicts.some((c) => c.kind === 'possession'), seg04: false });
      refuse('Dispatch refused', `Signals replaced to danger. ${[...new Set(chk.conflicts.map(conflictText))].join(' ')}`, `Ref ${DSP.desk.referenceDocNo}`, 'route-conflict', 'error');
      return;
    }
    const allRefs = [...liveRecs, ...trainRecs];
    const ref = nextRef(training ? DSP.training.refPrefix : DSP.desk.refPrefix, IN_WORLD_DATE_ISO, allRefs);
    const rec = newRecord({ ref, by: me, consist, model, route: routeNodes, departAt: dep, instruction: instruction ?? undefined, timeScale: training ? scale : undefined, desk: training ? 'TRAINING' : DSP.desk.id });
    services.sound.play('button');
    if (training) setTrainRecs((p) => [...p, rec]);
    else services.shared.update<DispatchRecord[]>('dispatch', [], (prev) => [...(prev ?? []), rec]);
    control('dispatch', `dispatched ${rec.instruction ? `a movement under instruction ${rec.instruction}` : `consist ${consist}`} as ${ref}, ${routeNodes.join(' to ')}, departing ${hhmmZ(dep)}`, {
      ref,
      consist: rec.instruction ? SEG04.suppressedLabel : consist,
      route: routeNodes.join('>'),
      depart: String(dep),
      ...(rec.instruction ? { instruction: rec.instruction } : {}),
    });
    if (!training) {
      const slots = { ref, consist, route: routeNodes.join(' to '), time: `${hhmmZ(dep)} (${hhmmLocal(dep, NC_ZONE)})` };
      if (rec.instruction) deliverTo(me, DSP.mail.instruction, 'Movement under instruction', { time: slots.time, instruction: rec.instruction });
      else if (!delivered(DSP.mail.logQuery)) deliverTo(me, DSP.mail.logQuery, 'Dispatch log query', slots);
    }
    setSelected(ref);
    setConsist('');
    resetDesk();
  };

  /* -------------------------------------------------------------- train actions */

  const selRec = recs.find((r) => r.ref === selected) ?? null;
  const selState: RunState | null = selRec ? runState(model, selRec, plant, now) : null;
  const write = (fn: (r: DispatchRecord) => DispatchRecord, ref: string) => {
    if (training) setTrainRecs((p) => p.map((r) => (r.ref === ref ? fn(r) : r)));
    else services.shared.update<DispatchRecord[]>('dispatch', [], (prev) => (prev ?? []).map((r) => (r.ref === ref ? fn(r) : r)));
  };
  const canAct = training || mode === 'live';
  const noAuthority = () => refuse('No authority', 'Movements are controlled from the desk that entered them or from Network Control. This workstation holds no dispatcher authority.', `Ref ${DSP.desk.procedureDocNo}`, 'train-action');

  const holdTrain = () => {
    if (!selRec || !selState) return;
    if (!canAct) return noAuthority();
    if (selState.status !== 'running' && selState.status !== 'scheduled') {
      setNotice({ title: 'Hold', kind: 'info', body: `${selRec.ref} is ${selState.status}. A hold is placed on a train that is running or booked to run.` });
      return;
    }
    write((r) => manualHold(r, now), selRec.ref);
    services.sound.play('button');
    control('hold', `held movement ${selRec.ref} at the next platform`, { ref: selRec.ref });
  };

  const releaseTrain = () => {
    if (!selRec || !selState) return;
    if (!canAct) return noAuthority();
    if (selState.status !== 'held' && !selState.pending.some((h) => h.kind === 'manual')) {
      setNotice({ title: 'Release', kind: 'info', body: `${selRec.ref} is not held.` });
      return;
    }
    const chk = releaseCheck(selState);
    if (!chk.ok) {
      const h = chk.standing[0]!;
      refuse('Release refused', h.kind === 'isolation' ? `Held under network isolation ${h.ref}. A train is not released until hub circuits are restored.` : `Held under seal drill ${h.ref}. Portal seal doors are closed; release after the drill stands down.`, `Ref ${DSP.desk.procedureDocNo}`, 'release', 'error');
      return;
    }
    write((r) => release(r, runState(model, r, plant, now), chk.refs, now), selRec.ref);
    services.sound.play('relay');
    control('release', `released movement ${selRec.ref} (${chk.refs.join(', ')})`, { ref: selRec.ref, holds: chk.refs.join(',') });
  };

  const cancelTrain = () => {
    if (!selRec || !selState) return;
    if (!canAct) return noAuthority();
    if (!cancelCheck(selState)) {
      setNotice({ title: 'Cancel', kind: 'info', body: selState.onLink ? 'A train is cancelled only at a platform. Hold it to the next platform first.' : `${selRec.ref} is ${selState.status}.`, reference: `Ref ${DSP.desk.procedureDocNo}` });
      return;
    }
    write((r) => cancel(r, runState(model, r, plant, now)), selRec.ref);
    services.sound.play('button');
    control('cancel', `cancelled movement ${selRec.ref} at ${selState.atNode}`, { ref: selRec.ref, at: selState.atNode ?? '' });
  };

  /* ------------------------------------------------------------ keys and modes */

  const turnDeskKey = (i: number) => {
    const toTraining = i === 1;
    if (toTraining === training) return;
    services.sound.play('switch');
    resetDesk();
    setTrainingMode(toTraining);
    setSelected(null);
    control('desk-mode', `turned desk key to ${toTraining ? 'TRAINING' : 'LIVE'}`, { mode: toTraining ? 'training' : 'live' });
  };

  const deskKeyLocked = () => {
    refuse(
      'Live working',
      'Live working at this desk requires the desk key, issued to qualified dispatchers and to the facility command post. This workstation holds no dispatcher qualification. The training simulator remains available.',
      `Ref ${DSP.desk.procedureDocNo} para 2`,
      'live-refused',
    );
    if (me === 'analyst' && !delivered(DSP.mail.qualification)) deliverTo(me, DSP.mail.qualification, 'Dispatcher qualification');
  };

  const turnSegKey = (i: number) => {
    if (i === keyPos) return;
    services.sound.play('switch');
    if (routeState !== 'none' && crossesSeg04(model, routeNodes) && i !== KEY_INSTR) resetDesk();
    setKeyPos(i);
    control('key', `turned key switch ${SEG04.keyNo} (segment ${SEG04.segment} working) to position ${SEG04.positions[i]}`, { key: SEG04.keyNo, position: SEG04.positions[i] ?? String(i) });
  };

  const segKeyLocked = () =>
    refuse(
      `Key ${SEG04.keyNo}`,
      training ? `The training simulator has no segment ${SEG04.segment} working key.` : `Key ${SEG04.keyNo} is not in the lock. It is issued to the deputy commander, ALPHA-02, and is not kept at the desk.`,
      'Ref OSC-TRN-SEG-04',
      'key',
    );

  /* ------------------------------------------------------------------ documents */

  const docEntry = !isHome ? route : null;
  const key = docEntry ? accessKey(docEntry) : null;
  const refused = !!(key && !services.clearance.satisfies(key));
  useEffect(() => {
    if (refused && docEntry) services.audit.log('window.open', docEntry.docNo, `Operator ${op} was refused ${docEntry.docNo} at the Dispatcher Workstation. Requirement ${key} not held.`);
  }, [refused, docEntry?.docNo]);
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState(false);
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
  }, [docEntry?.id, refused]);
  const readLogged = useRef<string | null>(null);
  useEffect(() => {
    if (view === 'document' && doc && readLogged.current !== doc.docNo) {
      readLogged.current = doc.docNo;
      services.audit.log('doc.read', doc.docNo);
    }
  }, [view, doc]);
  useEffect(() => {
    setView(isHome ? (mode === 'platform' ? 'platform' : mode === 'review' ? 'log' : 'desk') : 'document');
  }, [route?.route]);

  const openDoc = (which: keyof typeof DOC_IDS) => {
    const r = services.docs.all().find((x) => x.id === DOC_IDS[which]);
    if (r) win.navigate(r.route);
    else setNotice({ title: 'Dispatcher Workstation', kind: 'info', body: 'The document is not held at this workstation.' });
  };

  /* --------------------------------------------------------------- chrome */

  const viewMarking: MarkingId = view === 'document' && docEntry ? docEntry.marking : view === 'platform' ? 'UMBRA-R' : 'UMBRA-C';
  useEffect(() => {
    if (view === 'document' && docEntry) win.setTitle(docEntry.title, docEntry.docNo);
    else win.setTitle(view === 'platform' ? `Tram Platform Indicator, ${mode === 'platform' ? acct.site : DSP.platformSite}` : `Dispatcher Workstation: ${training ? 'Training Simulator' : DSP.desk.name}`, view === 'platform' ? DSP.desk.platformDocNo : DSP.desk.procedureDocNo);
    win.setMarking(viewMarking);
  }, [view, docEntry?.id, training]);
  useEffect(() => {
    const n = recs.filter((r) => r.status !== 'cancelled' && r.status !== 'arrived').length;
    win.setStatus(`${training ? 'Training simulator' : 'Live desk'}; ${n === 1 ? 'one movement' : `${n} movements`} entered`);
  }, [training, recs.length]);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = width > 0 && width < 860;

  const goView = (v: View) => {
    if (mode === 'platform' && v !== 'platform') {
      refuse('Dispatcher Workstation', 'Requires Tier 3 access determination. This workstation shows the platform indicator for its own site only.', 'Ref DIR-0301', `view-${v}`);
      return;
    }
    if (!isHome && v !== 'document') win.navigate('/dispatch');
    setView(v);
  };

  const printIt = () => {
    if (view === 'document' && doc) services.print(doc.id);
    else setNotice({ title: 'Print', kind: 'warning', body: 'Desk displays are not released to the print queue. Print the operating procedure or the reference sheet from the Document view.', reference: 'Ref OSC-DIR-0319' });
  };

  const desk = mode !== 'platform';
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: printIt },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Desk', shortcut: 'Ctrl+1', checked: view === 'desk', radio: true, onSelect: () => goView('desk') },
        { label: 'Dispatch &log', shortcut: 'Ctrl+2', checked: view === 'log', radio: true, onSelect: () => goView('log') },
        { label: '&Platform indicator', shortcut: 'Ctrl+3', checked: view === 'platform', radio: true, onSelect: () => goView('platform') },
        { separator: true },
        ...(['ALL', 'RAIL', 'EASTERN', 'SOUTHERN', 'MOUNTAIN_WESTERN', 'CENTRAL'] as const).map(
          (n): MenuItem => ({ label: n === 'ALL' ? 'All networks' : n === 'RAIL' ? 'Rail only' : (canon.tramNetworks.find((t) => t.id === n)?.name ?? n), checked: network === n, radio: true, disabled: !desk, onSelect: () => setNetwork(n) }),
        ),
      ],
    },
    {
      label: '&Route',
      items: [
        { label: '&Set route', shortcut: 'F5', disabled: !desk, onSelect: () => (view === 'desk' ? setRoute() : goView('desk')) },
        { label: '&Clear signals', shortcut: 'F6', disabled: !desk, onSelect: clearSignals },
        { label: '&Dispatch', shortcut: 'F7', disabled: !desk, onSelect: dispatchTrain },
        { separator: true },
        { label: 'C&ancel route', shortcut: 'Esc', disabled: !desk, onSelect: cancelRoute },
      ],
    },
    {
      label: '&Train',
      items: [
        { label: '&Hold at next platform', shortcut: 'F8', disabled: !selRec, onSelect: holdTrain },
        { label: '&Release', shortcut: 'F9', disabled: !selRec, onSelect: releaseTrain },
        { label: '&Cancel at platform', disabled: !selRec, onSelect: cancelTrain },
      ],
    },
    {
      label: '&Desk',
      items: [
        { label: '&Live working', checked: !training, radio: true, disabled: !desk, onSelect: () => (mode === 'live' ? turnDeskKey(0) : deskKeyLocked()) },
        { label: '&Training simulator', checked: training, radio: true, disabled: !desk, onSelect: () => (mode === 'platform' ? liveRefusal() : turnDeskKey(1)) },
      ],
    },
    {
      label: '&Help',
      items: [
        ...(desk ? [{ label: `Operating &procedure (${DSP.desk.procedureDocNo})`, onSelect: () => openDoc('procedure') }, { label: `Route and signal &reference (${DSP.desk.referenceDocNo})`, onSelect: () => openDoc('reference') }] : []),
        { label: `Platform &notice (${DSP.desk.platformDocNo})`, onSelect: () => openDoc('platform') },
        { separator: true },
        {
          label: '&About Dispatcher Workstation',
          onSelect: () =>
            setNotice({
              title: 'About Dispatcher Workstation',
              kind: 'info',
              body: `Dispatcher Workstation, ${DSP.desk.name}, panel ${DSP.desk.panelNo}. Movements entered at the desk are passed to Network Control, ALPHA-01, and shown on the Network Control board. Every desk operation is recorded in the workstation audit trail.`,
              reference: 'MERIDIAN 4.1.7',
            }),
        },
      ],
    },
  ];

  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (e.ctrlKey && !e.altKey && /^[1-3]$/.test(e.key)) {
      e.preventDefault();
      goView((['desk', 'log', 'platform'] as const)[Number(e.key) - 1]!);
    } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      printIt();
    } else if (desk) {
      const fn = ({ F5: setRoute, F6: clearSignals, F7: dispatchTrain, F8: holdTrain, F9: releaseTrain } as Record<string, () => void>)[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      } else if (e.key === 'Escape' && view === 'desk' && !notice) cancelRoute();
    }
  };

  /* --------------------------------------------------------------- body */

  let body;
  if (view === 'document') {
    body = refused && docEntry ? (
      <RefusalState authority="Transit Operations" reference="DIR-0412" docNo={docEntry.docNo} reason={`${docEntry.docNo} is held under a requirement this operator does not hold.`} requirement={`${key}. Reference DIR-0412.`} />
    ) : docErr ? (
      <RefusalState authority="Records Division" reference="DIR-0412" reason="The document could not be retrieved from the records server. The request has been recorded." />
    ) : doc ? (
      <div class="dsp-doc">
        <DocumentView
          doc={doc}
          markings={canon.markings}
          onNavigate={(p) => (p.startsWith('/dispatch') ? win.navigate(p) : services.openRoute(p))}
          onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${op} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
        />
      </div>
    ) : (
      <p class="dsp-note dsp-pad">Retrieving document from the records server.</p>
    );
  } else if (view === 'platform') {
    body = <PlatformView model={model} board={board} moves={movementsAround(model, platformTimetable(model, data.timetable), now, possessions, DSP.working.lookaheadDays)} recs={liveRecs} plant={livePlant} now={now} site={mode === 'platform' ? acct.site : DSP.platformSite} tier4={mode === 'platform'} timetableMissing={data.timetableMissing} />;
  } else if (view === 'log') {
    body = <LogView model={model} recs={liveRecs} plant={livePlant} now={now} opFor={opForAcct} selected={selected} onSelect={setSelected} />;
  } else {
    body = (
      <div class={`dsp-desk ${compact ? 'is-stacked' : ''}`}>
        <div class="dsp-left">
          <DeskBoard board={board} model={model} network={network} route={routeNodes} onNode={onNode} onLink={onLink} training={training} />
          <Register model={model} recs={recs} plant={plant} now={now} selected={selected} onSelect={setSelected} onHold={holdTrain} onRelease={releaseTrain} onCancel={cancelTrain} canAct={canAct} training={training} />
        </div>
        <div class="dsp-right">
          <DeskPanel
            model={model}
            training={training}
            mode={mode}
            route={routeNodes}
            routeState={routeState}
            signal={signal}
            system={system}
            positions={positions}
            consist={consist}
            onConsist={(c) => (setConsist(c), services.sound.play('switch'))}
            offset={offset}
            onOffset={(i) => (setOffset(i), services.sound.play('switch'))}
            keyPos={keyPos}
            onSegKey={turnSegKey}
            onSegKeyLocked={segKeyLocked}
            segKeyPresent={!training && me === SEG04.keyHolder}
            onDeskKey={turnDeskKey}
            onDeskKeyLocked={deskKeyLocked}
            deskKeyPresent={mode === 'live'}
            onOrigin={setOrigin}
            onDestination={setDestination}
            onSetRoute={setRoute}
            onCancelRoute={cancelRoute}
            onClearSignals={clearSignals}
            onDispatch={dispatchTrain}
            ann={ann}
            onAck={onAck}
            onReset={onReset}
            instruction={instruction}
            reducedMotion={services.settings.reducedMotion.value}
            now={now}
            scale={scale}
          />
        </div>
      </div>
    );
  }

  const running = recs.filter((r) => {
    const s = runState(model, r, plant, now).status;
    return s === 'running' || s === 'held' || s === 'scheduled';
  }).length;
  const holdWord = board.holds.isolation && !training ? `Isolation ${board.holds.isolation}` : board.holds.drill && !training ? `Seal drill ${board.holds.drill}` : 'No network holds';

  return (
    <div class="dsp-root" ref={rootRef} onKeyDown={onKey}>
      <MenuBar menus={menus} label="Dispatcher Workstation menu" />
      <Toolbar label="Desk">
        <ToolbarButton label="Desk" icon={<Icon id="dispatch" size={16} />} pressed={view === 'desk'} disabled={!desk} onClick={() => goView('desk')} title="Desk (Ctrl+1)" />
        <ToolbarButton label="Dispatch log" pressed={view === 'log'} disabled={!desk} onClick={() => goView('log')} title="Dispatch log (Ctrl+2)" />
        <ToolbarButton label="Platform" pressed={view === 'platform'} onClick={() => goView('platform')} title="Platform indicator (Ctrl+3)" />
        <ToolbarSeparator />
        <ToolbarButton label="Set route" icon={<Icon id="route-set" size={16} />} disabled={!desk || view !== 'desk'} onClick={setRoute} title="Set route (F5)" />
        <ToolbarButton label="Clear signals" icon={<Icon id="signal-clear" size={16} />} disabled={!desk || view !== 'desk'} onClick={clearSignals} title="Clear signals (F6)" />
        <ToolbarButton label="Dispatch" icon={<Icon id="rail-train" size={16} />} disabled={!desk || view !== 'desk'} onClick={dispatchTrain} title="Dispatch (F7)" />
        <ToolbarButton label="Cancel route" icon={<Icon id="signal-stop" size={16} />} disabled={!desk || view !== 'desk'} onClick={cancelRoute} title="Cancel route (Esc)" />
        <ToolbarSpacer />
        <ToolbarButton label="Print" onClick={printIt} title="Print (Ctrl+P)" />
      </Toolbar>
      <div class="dsp-body">{body}</div>
      <StatusBar
        panes={[
          { id: 'mode', content: mode === 'platform' ? `Platform indicator ${acct.site}` : training ? 'TRAINING SIMULATOR' : `LIVE ${DSP.desk.id}`, label: 'Desk mode' },
          { id: 'route', content: routeNodes.length ? `Route ${routeNodes.join(' > ')}: ${routeState === 'set' ? 'SET' : routeState === 'setting' ? 'SETTING' : 'NOT SET'}` : 'No route', fill: true },
          { id: 'sig', content: `Signal ${signal === 'clear' ? 'PROCEED' : signal === 'stop' ? 'DANGER' : signal === 'release' ? 'AWAITING RELEASE' : 'CLEARING'}`, mono: true },
          { id: 'trains', content: `Movements ${running}`, mono: true },
          { id: 'holds', content: holdWord, label: 'Network holds' },
          { id: 'clock', content: `${hhmmssZ(now)} (${hhmmLocal(now, NC_ZONE)})`, mono: true, label: 'Network Control time' },
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
